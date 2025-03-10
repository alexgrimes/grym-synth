import React, { useCallback, useState } from 'react';
import ReactFlow, { 
  Node,
  Edge,
  Connection, 
  addEdge, 
  Background, 
  Controls,
  MiniMap,
  NodeTypes,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowStep {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

interface WorkflowDesignerProps {
  initialSteps?: WorkflowStep[];
  onWorkflowUpdate?: (steps: WorkflowStep[], connections: Edge[]) => void;
}

interface AudioProcessingNodeData {
  label: string;
  parameters: Record<string, any>;
}

// Custom node for audio processing steps
const AudioProcessingNode: React.FC<NodeProps<AudioProcessingNodeData>> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-lg rounded-md bg-white border-2 border-gray-200">
      <div className="font-bold text-sm text-gray-700">{data.label}</div>
      {data.parameters && (
        <div className="mt-2">
          {Object.entries(data.parameters).map(([key, value]) => (
            <div key={key} className="text-xs text-gray-600">
              {key}: {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  audioProcessing: AudioProcessingNode,
};

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  initialSteps = [],
  onWorkflowUpdate,
}) => {
  // Convert initial steps to ReactFlow nodes
  const initialNodes: Node<AudioProcessingNodeData>[] = initialSteps.map((step) => ({
    id: step.id,
    type: 'audioProcessing',
    position: { x: 0, y: 0 }, // Would need proper layout logic in real implementation
    data: { 
      label: step.type,
      parameters: step.parameters
    },
  }));

  const [nodes, setNodes] = useState<Node<AudioProcessingNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      onWorkflowUpdate?.(
        nodes.map(node => ({
          id: node.id,
          type: node.data.label,
          parameters: node.data.parameters,
        })),
        newEdges
      );
    },
    [edges, nodes, onWorkflowUpdate]
  );

  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        onWorkflowUpdate?.(
          updatedNodes.map(node => ({
            id: node.id,
            type: node.data.label,
            parameters: node.data.parameters,
          })),
          edges
        );
        return updatedNodes;
      });
    },
    [edges, onWorkflowUpdate]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        onWorkflowUpdate?.(
          nodes.map(node => ({
            id: node.id,
            type: node.data.label,
            parameters: node.data.parameters,
          })),
          updatedEdges
        );
        return updatedEdges;
      });
    },
    [nodes, onWorkflowUpdate]
  );

  return (
    <div className="h-[600px] w-full border border-gray-200 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

// Helper functions for applying changes
const applyNodeChanges = (changes: any, nodes: Node<AudioProcessingNodeData>[]) => {
  return nodes.map(node => {
    const change = changes.find((c: any) => c.id === node.id);
    if (change) {
      return { ...node, ...change };
    }
    return node;
  });
};

const applyEdgeChanges = (changes: any, edges: Edge[]) => {
  return edges.map(edge => {
    const change = changes.find((c: any) => c.id === edge.id);
    if (change) {
      return { ...edge, ...change };
    }
    return edge;
  });
};