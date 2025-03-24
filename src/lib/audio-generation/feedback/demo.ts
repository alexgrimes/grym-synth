/**
 * Demonstration of the XenakisLDM Bidirectional Feedback System
 * 
 * This file demonstrates how to use the feedback system to:
 * 1. Generate audio with mathematical structures
 * 2. Analyze audio to extract features
 * 3. Process feedback to refine mathematical parameters
 * 4. Integrate with a reasoning LLM for creative decisions
 */

import { XenakisLDMClient, XenakisLDMParams } from '../xenakisldm-client';
import { AudioAnalyzer } from '../../../services/audio/AudioAnalyzer';
import { GrymSynthHealthMonitor } from '../../monitoring/GrymSynthHealthMonitor';
import { XenakisLDMWithFeedback, LLMFeedbackDecision } from './';

// Mock reasoning LLM function (in a real implementation, this would call an actual LLM)
async function reasoningLLM(
  audioAnalysis: any,
  structure: any,
  deviations: number[],
  context: any
): Promise<LLMFeedbackDecision> {
  console.log('LLM Reasoning Process:');
  console.log('- Analyzing audio features:', Object.keys(audioAnalysis.spectromorphAnalysis));
  console.log('- Evaluating structure type:', structure.type);
  console.log('- Observed deviations:', deviations);
  console.log('- Current iteration:', context.feedbackHistory.length);
  
  // Calculate average deviation
  const avgDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
  console.log('- Average deviation:', avgDeviation.toFixed(3));
  
  // Simple decision logic
  if (avgDeviation < 0.05) {
    return {
      action: 'terminate',
      reasoning: 'Deviations are within acceptable threshold. Audio quality meets expectations.'
    };
  } else if (context.feedbackHistory.length >= 2) {
    // Check if we're improving
    const currentStatus = context.feedbackHistory[context.feedbackHistory.length - 1].status;
    if (currentStatus === 'oscillating') {
      // Suggest adjusted parameters with damping
      const adjustedParams = { ...context.currentParams };
      
      // Apply small adjustments based on structure type
      if (structure.type === 'stochastic' && adjustedParams.stochastic) {
        adjustedParams.stochastic.density = 
          Math.min(0.9, Math.max(0.1, adjustedParams.stochastic.density + deviations[0] * 0.05));
      }
      
      return {
        action: 'adjust',
        reasoning: 'Oscillation detected. Applying dampened parameter adjustments to stabilize.',
        adjustedParams
      };
    }
  }
  
  // Default: continue with automated adjustments
  return {
    action: 'continue',
    reasoning: 'Continuing feedback process with automated adjustments. Progress is being made.'
  };
}

// Main demonstration function
export async function demonstrateFeedbackSystem() {
  console.log('Initializing XenakisLDM Bidirectional Feedback System Demo');
  
  // Create instances
  const xenakisLDMClient = new XenakisLDMClient();
  const audioAnalyzer = new AudioAnalyzer();
  const healthMonitor = new GrymSynthHealthMonitor();
  
  // Create feedback-enhanced client
  const feedbackClient = new XenakisLDMWithFeedback(
    xenakisLDMClient,
    audioAnalyzer,
    {
      maxFeedbackIterations: 3,
      enableAutomaticFeedback: true,
      enableLLMReasoning: true,
      visualizeFeedbackProcess: true
    },
    healthMonitor
  );
  
  // Register the reasoning LLM
  feedbackClient.setReasoningLLM(reasoningLLM);
  
  // Define test parameters
  const testParams: XenakisLDMParams = {
    prompt: 'Stochastic cloud texture with evolving spectral density',
    duration: 5,
    stochastic: {
      distributionType: 'poisson',
      density: 0.6,
      randomness: 0.4
    },
    granular: {
      grainSize: 15,
      density: 0.5,
      randomization: 0.3
    }
  };
  
  console.log('Starting generation with feedback...');
  
  // Generate audio with feedback
  try {
    const result = await feedbackClient.generateAudioWithFeedback(
      testParams,
      progress => {
        const stage = progress.processingStage || 'initializing';
        const iteration = progress.feedbackIteration !== undefined ? 
          `Iteration ${progress.feedbackIteration + 1}` : '';
        
        // Print progress
        console.log(
          `[${stage.toUpperCase()}] ${iteration} - ${progress.percentComplete.toFixed(0)}% complete`
        );
        
        // Print feedback details if available
        if (progress.feedbackStatus) {
          console.log(`  Status: ${progress.feedbackStatus}`);
        }
        
        if (progress.adjustments && Object.keys(progress.adjustments).length > 0) {
          console.log('  Adjustments:', JSON.stringify(progress.adjustments));
        }
      }
    );
    
    console.log('Generation complete!');
    console.log('Result duration:', result.duration);
    console.log('Processing time:', result.processingTime);
    
    // Show feedback metadata if available
    if ((result as any).feedbackMetadata) {
      console.log('Feedback summary:');
      console.log('- Iterations:', (result as any).feedbackMetadata.iterations);
      console.log('- Convergence score:', (result as any).feedbackMetadata.convergence.toFixed(3));
    }
    
    return result;
  } catch (error) {
    console.error('Error in feedback generation:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateFeedbackSystem()
    .then(() => console.log('Demo completed successfully'))
    .catch(err => console.error('Demo failed:', err));
}