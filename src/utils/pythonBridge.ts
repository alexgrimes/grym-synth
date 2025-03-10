import { spawn, ChildProcess } from "child_process";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";

export interface PythonBridgeOptions {
  pythonPath?: string;
  scriptPath?: string;
  timeout?: number;
}

export class PythonBridgeError extends Error {
  constructor(
    message: string,
    public readonly requestId: string,
    public readonly code?: number
  ) {
    super(message);
    this.name = "PythonBridgeError";
  }
}

export class PythonBridge {
  private pythonPath: string;
  private scriptPath: string;
  private timeout: number;
  private activeProcesses: Set<ChildProcess>;
  private isDisposed: boolean;

  constructor(options: PythonBridgeOptions = {}) {
    this.pythonPath = options.pythonPath || "python";
    this.scriptPath =
      options.scriptPath ||
      path.join(__dirname, "../../scripts/wav2vec2_operations.py");
    this.timeout = options.timeout || 30000; // 30 seconds default timeout
    this.activeProcesses = new Set();
    this.isDisposed = false;
  }

  /**
   * Execute Python code to load and use wav2vec2
   */
  async executeWav2Vec2(
    operation: string,
    audioData: Buffer | string
  ): Promise<any> {
    if (this.isDisposed) {
      throw new PythonBridgeError("Bridge has been disposed", uuidv4());
    }

    const requestId = uuidv4();
    let audioPath: string = "";
    let tempFile = false;

    try {
      // If audioData is a Buffer, save it to a temp file
      if (Buffer.isBuffer(audioData)) {
        audioPath = path.join(os.tmpdir(), `wav2vec2_${requestId}.wav`);
        await fs.promises.writeFile(audioPath, audioData);
        tempFile = true;
      } else {
        // Assume it's a path
        audioPath = audioData;

        // Verify the file exists
        try {
          await fs.promises.access(audioPath);
        } catch (error) {
          throw new PythonBridgeError(
            `Audio file not found: ${audioPath}`,
            requestId
          );
        }
      }

      const result = await this.executeWithTimeout(
        this.spawnPythonProcess(operation, audioPath, requestId)
      );

      return result;
    } finally {
      // Clean up temp file if we created one
      if (tempFile && audioPath) {
        try {
          await fs.promises.unlink(audioPath);
        } catch (error) {
          console.error("Failed to delete temp file:", error);
        }
      }
    }
  }

  /**
   * Execute a promise with timeout
   */
  private executeWithTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${this.timeout}ms`));
        }, this.timeout);
      }),
    ]);
  }

  /**
   * Spawn Python process and handle communication
   */
  private spawnPythonProcess(
    operation: string,
    audioPath: string,
    requestId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [
        this.scriptPath,
        "--operation",
        operation,
        "--audio",
        audioPath,
        "--request-id",
        requestId,
      ]);

      // Track the process
      this.activeProcesses.add(pythonProcess);

      let result = "";
      let errorOutput = "";

      pythonProcess.stdout.on("data", (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on("error", (error: Error) => {
        this.activeProcesses.delete(pythonProcess);
        reject(
          new PythonBridgeError(
            `Failed to spawn Python process: ${error.message}`,
            requestId
          )
        );
      });

      pythonProcess.on("close", (code: number | null) => {
        this.activeProcesses.delete(pythonProcess);

        if (code !== 0) {
          reject(
            new PythonBridgeError(
              `Python process exited with code ${
                code || "unknown"
              }: ${errorOutput}`,
              requestId,
              code || undefined
            )
          );
          return;
        }

        try {
          const parsedResult = JSON.parse(result);

          // Check if Python script returned an error
          if (parsedResult.error) {
            reject(
              new PythonBridgeError(parsedResult.error, parsedResult.request_id)
            );
            return;
          }

          resolve(parsedResult);
        } catch (error) {
          reject(
            new PythonBridgeError(
              `Failed to parse result: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              requestId
            )
          );
        }
      });
    });
  }

  /**
   * Verify Python environment
   */
  async verifyEnvironment(): Promise<boolean> {
    if (this.isDisposed) {
      throw new PythonBridgeError("Bridge has been disposed", uuidv4());
    }

    try {
      const pythonProcess = spawn(this.pythonPath, [
        "-c",
        "import torch, transformers, soundfile",
      ]);

      // Track the process
      this.activeProcesses.add(pythonProcess);

      return new Promise((resolve) => {
        pythonProcess.on("close", (code) => {
          this.activeProcesses.delete(pythonProcess);
          resolve(code === 0);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up resources and terminate any active Python processes
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) {
      return; // Already disposed
    }

    this.isDisposed = true;

    // Terminate all active processes
    for (const process of this.activeProcesses) {
      if (!process.killed) {
        process.kill();
      }
    }

    this.activeProcesses.clear();
  }
}
