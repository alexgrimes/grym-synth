import React, { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  KnowledgeMap, 
  ThemeVisualizerOptions, 
  KnowledgeMapNode, 
  KnowledgeMapLink,
  ForceGraphMethods,
  GraphData,
  CanvasRenderingContext
} from '@/lib/research-assistant/types';
import { BaseNodeObject } from 'react-force-graph-2d';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface KnowledgeMapProps extends ThemeVisualizerOptions {
  data: KnowledgeMap;
  className?: string;
}

const defaultNodeColor = (node: KnowledgeMapNode): string => {
  const depthColors = [
    '#60A5FA', // blue-400
    '#34D399', // emerald-400
    '#F472B6', // pink-400
    '#A78BFA', // violet-400
    '#FBBF24', // amber-400
  ];
  return depthColors[Math.min(node.depth - 1, depthColors.length - 1)];
};

const defaultNodeSize = (node: KnowledgeMapNode): number => Math.sqrt(node.size) * 5;
const defaultLinkStrength = (link: KnowledgeMapLink): number => link.strength;

export const KnowledgeMapView: React.FC<KnowledgeMapProps> = ({
  data,
  width,
  height,
  nodeColor = defaultNodeColor,
  nodeSize = defaultNodeSize,
  linkStrength = defaultLinkStrength,
  onNodeClick,
  className = '',
}) => {
  const graphRef = useRef<ForceGraphMethods>(null);

  const handleNodeClick = useCallback((node: BaseNodeObject) => {
    if (onNodeClick) {
      onNodeClick(node as KnowledgeMapNode);
    }

    // Center view on clicked node
    const distance = 200;
    const distRatio = 1 + distance/Math.hypot(node.x || 0, node.y || 0);
    if (graphRef.current) {
      graphRef.current.centerAt(
        node.x || 0,
        node.y || 0,
        1000 // transition duration
      );
      graphRef.current.zoom(2, 1000); // zoom level and duration
    }
  }, [onNodeClick]);

  useEffect(() => {
    // Initial zoom to fit
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  }, [data]);

  const graphData: GraphData = {
    nodes: data.nodes,
    links: data.links
  };

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeColor={(node: BaseNodeObject) => nodeColor(node as KnowledgeMapNode)}
        nodeVal={(node: BaseNodeObject) => nodeSize(node as KnowledgeMapNode)}
        linkStrength={linkStrength}
        nodeLabel={(node: BaseNodeObject) => {
          const n = node as KnowledgeMapNode;
          return `${n.id}\nDepth: ${n.depth}\nConnections: ${n.connections}`;
        }}
        onNodeClick={handleNodeClick}
        width={width}
        height={height}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={(d: KnowledgeMapLink) => d.strength * 0.01}
        d3VelocityDecay={0.3}
        cooldownTime={3000}
        nodeCanvasObject={(node: BaseNodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const n = node as KnowledgeMapNode;
          const label = n.id;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, nodeSize(n)/globalScale, 0, 2 * Math.PI);
          ctx.fillStyle = nodeColor(n);
          ctx.fill();

          // Draw label background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(
            (node.x || 0) - bckgDimensions[0] / 2,
            (node.y || 0) + nodeSize(n)/globalScale + 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );

          // Draw label text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(
            label,
            node.x || 0,
            (node.y || 0) + nodeSize(n)/globalScale + 2 + bckgDimensions[1]/2
          );
        }}
      />
    </div>
  );
};