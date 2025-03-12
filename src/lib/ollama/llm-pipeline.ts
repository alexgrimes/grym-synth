import EventEmitter from 'events';
import { nanoid } from 'nanoid';
import { OllamaClient } from './client';

export interface LLMTask {
  id: string;
  model: string;
  prompt: string;
  priority: number;
  createdAt: Date;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  cancelToken: { cancelled: boolean };
  onProgress?: (update: ProgressUpdate) => void;
}

export interface ProgressUpdate {
  taskId: string;
  progress: number;
  stage: string;
  message: string;
  estimatedTimeRemaining?: number;
}

export class LLMPipeline extends EventEmitter {
  private queue: LLMTask[] = [];
  private processing: boolean = false;
  private currentTask: LLMTask | null = null;
  private ollamaClient: OllamaClient;
  private averageProcessingTime: Record<string, number> = {};

  constructor(ollamaClient: OllamaClient) {
    super();
    this.ollamaClient = ollamaClient;
  }

  async enqueueTask(options: {
    model: string;
    prompt: string;
    priority?: number;
    onProgress?: (update: ProgressUpdate) => void;
  }): Promise<{ result: Promise<any>; cancelToken: { cancelled: boolean }; taskId: string }> {
    const taskId = nanoid();
    const cancelToken = { cancelled: false };

    const taskPromise = new Promise<any>((resolve, reject) => {
      const task: LLMTask = {
        id: taskId,
        model: options.model,
        prompt: options.prompt,
        priority: options.priority || 0,
        createdAt: new Date(),
        resolve,
        reject,
        cancelToken,
        onProgress: options.onProgress
      };

      // Insert task in priority order
      const insertIndex = this.queue.findIndex(t => t.priority < task.priority);
      if (insertIndex === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(insertIndex, 0, task);
      }

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      } else {
        // Send initial progress update for queued task
        const queuePosition = this.queue.findIndex(t => t.id === taskId);
        const estimatedWaitTime = this.estimateWaitTime(queuePosition);
        this.updateTaskProgress(task, 0, 'queued', `Waiting in queue (position ${queuePosition + 1})`, estimatedWaitTime);
      }
    });

    return { result: taskPromise, cancelToken, taskId };
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    this.currentTask = this.queue[0];

    try {
      const startTime = Date.now();

      // Update task progress to starting
      this.updateTaskProgress(
        this.currentTask,
        0,
        'starting',
        'Initializing task processing',
        this.estimateProcessingTime(this.currentTask.model)
      );

      const response = await this.ollamaClient.runModel(
        this.currentTask.model,
        this.currentTask.prompt,
        {
          stream: true,
          onProgress: (modelResponse) => {
            if (this.currentTask?.cancelToken.cancelled) {
              throw new Error('Task cancelled');
            }

            // Calculate progress based on response
            const progress = modelResponse.done ? 100 : this.estimateProgress(modelResponse);
            this.updateTaskProgress(
              this.currentTask!,
              progress,
              'processing',
              'Processing model response',
              this.estimateRemainingTime(progress, startTime)
            );

            if (modelResponse.done) {
              // Update average processing time
              const processingTime = Date.now() - startTime;
              this.updateAverageProcessingTime(this.currentTask!.model, processingTime);
            }
          }
        }
      );

      if (this.currentTask.cancelToken.cancelled) {
        this.currentTask.reject(new Error('Task cancelled'));
      } else {
        this.currentTask.resolve(response);
      }
    } catch (error) {
      this.currentTask.reject(error as Error);
    } finally {
      // Remove the completed task from the queue
      this.queue.shift();
      this.currentTask = null;
      this.processing = false;

      // Process next task if available
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  private updateTaskProgress(
    task: LLMTask,
    progress: number,
    stage: string,
    message: string,
    estimatedTimeRemaining?: number
  ): void {
    const update: ProgressUpdate = {
      taskId: task.id,
      progress,
      stage,
      message,
      estimatedTimeRemaining
    };

    task.onProgress?.(update);
    this.emit('progress', update);
  }

  private estimateProgress(modelResponse: any): number {
    // Implement progress estimation logic based on model response
    // This is a simplified example
    return 50; // Default to 50% if we can't determine actual progress
  }

  private estimateWaitTime(queuePosition: number): number {
    let totalEstimatedTime = 0;

    // Sum up estimated processing times for all tasks ahead in queue
    for (let i = 0; i < queuePosition; i++) {
      const task = this.queue[i];
      totalEstimatedTime += this.estimateProcessingTime(task.model);
    }

    return totalEstimatedTime;
  }

  private estimateProcessingTime(model: string): number {
    // Return average processing time for model, or default estimate
    return this.averageProcessingTime[model] || 30000; // Default 30 seconds
  }

  private estimateRemainingTime(progress: number, startTime: number): number {
    const elapsed = Date.now() - startTime;
    if (progress <= 0) return this.estimateProcessingTime(this.currentTask!.model);
    return Math.round((elapsed / progress) * (100 - progress));
  }

  private updateAverageProcessingTime(model: string, processingTime: number): void {
    if (!this.averageProcessingTime[model]) {
      this.averageProcessingTime[model] = processingTime;
    } else {
      // Exponential moving average with 0.1 weight for new values
      this.averageProcessingTime[model] =
        0.9 * this.averageProcessingTime[model] + 0.1 * processingTime;
    }
  }

  cancelTask(taskId: string): boolean {
    // If it's the current task, mark it as cancelled
    if (this.currentTask?.id === taskId) {
      this.currentTask.cancelToken.cancelled = true;
      return true;
    }

    // If it's in the queue, remove it
    const index = this.queue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      const task = this.queue[index];
      task.cancelToken.cancelled = true;
      task.reject(new Error('Task cancelled'));
      this.queue.splice(index, 1);
      return true;
    }

    return false;
  }

  getQueueStatus(): {
    queueLength: number;
    currentTask: string | null;
    estimatedWaitTime: number;
  } {
    return {
      queueLength: this.queue.length,
      currentTask: this.currentTask?.id || null,
      estimatedWaitTime: this.queue.reduce(
        (total, _, index) => total + this.estimateWaitTime(index),
        0
      )
    };
  }
}
