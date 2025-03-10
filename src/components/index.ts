// Visualization components
export { PatternVisualizationLayer } from "./visualization/PatternVisualizationLayer";
export { PatternEvolutionView } from "./visualization/PatternEvolutionView";

// Feedback components
export { PatternCorrectionPanel } from "./feedback/PatternCorrectionPanel";

// Control components
export { ConfidenceThresholdControl } from "./controls/ConfidenceThresholdControl";

// Main component
export { AudioPatternAnalyzer } from "./AudioPatternAnalyzer";

// Services
export { PatternRepository } from "../services/storage/PatternRepository";
export { PatternFeedbackService } from "../services/feedback/PatternFeedbackService";

// Types
export type {
  AudioPattern,
  PatternFeedback,
  PatternVersion,
} from "../types/audio";
