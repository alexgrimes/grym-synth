import React, { useEffect, useState } from 'react';
import { visualizeProfile, ProfileVisualization, MasteryLevel } from '../../lib/learning-profiles';
import ForceGraph2D from 'react-force-graph-2d';
import { BaseGraphNode, BaseGraphLink, CanvasContext } from '../../lib/visualization/types';

interface ModelLearningViewProps {
  modelId: string;
  width?: number;
  height?: number;
}

interface LearningNode extends BaseGraphNode {
  val: number;  // Size based on confidence
  color: string;  // Color based on mastery
  mastery: MasteryLevel;
  confidence: number;
}

interface LearningLink extends BaseGraphLink {
  value: number;  // Strength of connection
}

interface GraphData {
  nodes: LearningNode[];
  links: LearningLink[];
}

export function ModelLearningView({ 
  modelId, 
  width = 600, 
  height = 400 
}: ModelLearningViewProps) {
  const [profile, setProfile] = useState<ProfileVisualization | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    const loadProfile = async () => {
      const data = await visualizeProfile(modelId);
      setProfile(data);
    };
    loadProfile();
  }, [modelId]);

  useEffect(() => {
    if (!profile) return;

    // Convert profile data to graph format
    const nodes = profile.domains.map(domain => ({
      id: domain.name,
      name: domain.name,
      val: Math.max(5, domain.confidence * 20), // Scale node size
      color: getMasteryColor(domain.mastery),
      mastery: domain.mastery,
      confidence: domain.confidence
    }));

    const links = profile.domains.flatMap(domain =>
      domain.connections.map(conn => ({
        source: domain.name,
        target: conn.to,
        value: conn.strength
      }))
    );

    setGraphData({ nodes, links });
  }, [profile]);

  if (!profile) {
    return <div>Loading learning profile...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Model Learning Graph</h3>
        <div className="border rounded">
          <ForceGraph2D<LearningNode, LearningLink>
            graphData={graphData}
            width={width}
            height={height}
            nodeLabel={node => `${node.name} (${Math.round(node.confidence * 100)}% confident)`}
            linkWidth={link => link.value * 2}
            nodeRelSize={6}
            linkColor={() => '#999'}
            nodeCanvasObject={(node, ctx: CanvasContext, globalScale) => {
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = node.color;
              ctx.beginPath();
              ctx.arc(0, 0, node.val, 0, 2 * Math.PI);
              ctx.fill();
              ctx.fillStyle = '#000';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, 0, 0);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Learning Timeline</h3>
        <div className="space-y-2">
          {profile.timeline.map((event, i) => (
            <div 
              key={i}
              className="flex items-center space-x-2 text-sm"
            >
              <span className="text-gray-500">
                {new Date(event.timestamp).toLocaleString()}
              </span>
              <span className="font-medium">{event.domain}</span>
              <span className="text-gray-600">
                {formatEvent(event.event)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Domain Mastery</h3>
        <div className="grid grid-cols-2 gap-4">
          {profile.domains.map(domain => (
            <div 
              key={domain.name}
              className="border rounded p-2"
            >
              <div className="font-medium">{domain.name}</div>
              <div className="flex items-center space-x-2">
                <div 
                  className="h-2 flex-grow rounded-full bg-gray-200"
                >
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${domain.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {Math.round(domain.confidence * 100)}%
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {domain.mastery}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getMasteryColor(mastery: MasteryLevel): string {
  switch (mastery) {
    case 'novice':
      return '#60A5FA'; // blue-400
    case 'competent':
      return '#34D399'; // green-400
    case 'expert':
      return '#F59E0B'; // yellow-500
    default:
      return '#9CA3AF'; // gray-400
  }
}

function formatEvent(event: string): string {
  switch (event) {
    case 'interaction':
      return 'New interaction';
    case 'mastery_change':
      return 'Mastery level changed';
    case 'connection_formed':
      return 'New connection discovered';
    default:
      return event;
  }
}