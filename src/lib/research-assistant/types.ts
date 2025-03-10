export interface ThemeNode {
  id: string;
  occurrences: number;
  relatedConcepts: Map<string, number>;
  firstSeen: Date;
  lastSeen: Date;
  conversations: Set<string>;
  evolution: {
    branches: Map<string, string[]>;
    depth: number;  // Theme complexity
    breadth: number;  // Related concept count
  };
}

import { BaseNodeObject } from 'react-force-graph-2d';

export interface KnowledgeMapNode extends BaseNodeObject {
  id: string;  // Required by BaseNodeObject but we need to explicitly declare it
  size: number;
  depth: number;
  connections: number;
  group?: string;
  x?: number;
  y?: number;
}

export interface KnowledgeMapLink {
  source: string;
  target: string;
  strength: number;
}

export interface KnowledgeMapCluster {
  id: string;
  themes: string[];
  centroid: { x: number; y: number };
}

export interface KnowledgeMap {
  nodes: KnowledgeMapNode[];
  links: KnowledgeMapLink[];
  clusters: KnowledgeMapCluster[];
}

export interface ResearchInsight {
  type: 'trend' | 'connection' | 'gap' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  relatedThemes: string[];
  actionable: boolean;
}

export interface UserFeedback {
  themeAccuracy: boolean;
  missingConnections: string[];
  userInsights: string;
}

export interface ThemeVisualizerOptions {
  width: number;
  height: number;
  nodeColor?: (node: KnowledgeMapNode) => string;
  nodeSize?: (node: KnowledgeMapNode) => number;
  linkStrength?: (link: KnowledgeMapLink) => number;
  onNodeClick?: (node: KnowledgeMapNode) => void;
}

export interface ThemeAnalysis {
  concepts: Array<{
    name: string;
    related: string[];
    depth: number;
  }>;
  patterns: {
    recurring: string[];
    emerging: string[];
  };
}

export interface ResearchAssistantResult {
  analysis: ThemeAnalysis;
  visualization: KnowledgeMap;
  insights: ResearchInsight[];
  suggestedExplorations: string[];
}

export interface ForceGraphMethods {
  centerAt: (x: number, y: number, duration: number) => void;
  zoom: (zoom: number, duration: number) => void;
  zoomToFit: (duration: number, padding: number) => void;
}

export interface GraphData {
  nodes: KnowledgeMapNode[];
  links: KnowledgeMapLink[];
}

export interface CanvasRenderingContext {
  beginPath: () => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => void;
  fillStyle: string;
  fill: () => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  font: string;
  measureText: (text: string) => { width: number };
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillText: (text: string, x: number, y: number) => void;
}