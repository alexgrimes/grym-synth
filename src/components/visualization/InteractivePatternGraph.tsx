import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AudioPattern } from '../../lib/types/audio';
import * as d3 from 'd3';
import './InteractivePatternGraph.css';

interface PatternNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  confidence: number;
  features: Float32Array;
  radius: number;
  color: string;
  x?: number;
  y?: number;
}

interface PatternLink extends d3.SimulationLinkDatum<PatternNode> {
  source: string | PatternNode;
  target: string | PatternNode;
  similarity: number;
  width: number;
}

interface InteractivePatternGraphProps {
  patterns: AudioPattern[];
  width: number;
  height: number;
  onPatternSelect?: (pattern: AudioPattern) => void;
  selectedPatternId?: string;
  similarityThreshold?: number;
}

export const InteractivePatternGraph: React.FC<InteractivePatternGraphProps> = ({
  patterns,
  width,
  height,
  onPatternSelect,
  selectedPatternId,
  similarityThreshold = 0.5,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const simulationRef = useRef<d3.Simulation<PatternNode, PatternLink> | null>(null);

  // Compute pattern nodes and links with similarity measures
  const { nodes, links } = useMemo(() => {
    // Convert patterns to nodes with visual properties
    const patternNodes: PatternNode[] = patterns.map(pattern => {
      const typeColors: Record<string, string> = {
        'harmonic': '#2ecc71',
        'percussive': '#e74c3c',
        'melodic': '#3498db',
        'speech': '#9b59b6',
        'noise': '#7f8c8d',
        'textural': '#f1c40f',
        'ambient': '#1abc9c',
        'default': '#f39c12'
      };
      
      return {
        id: pattern.id,
        type: pattern.type,
        confidence: pattern.confidence,
        features: pattern.features,
        radius: 10 + (pattern.confidence * 15), // Size based on confidence
        color: typeColors[pattern.type] || typeColors.default,
      };
    });
    
    // Calculate similarity between patterns and create links
    const patternLinks: PatternLink[] = [];
    
    for (let i = 0; i < patternNodes.length; i++) {
      for (let j = i + 1; j < patternNodes.length; j++) {
        const similarity = calculateSimilarity(
          patternNodes[i].features, 
          patternNodes[j].features
        );
        
        // Only create links for patterns with similarity above threshold
        if (similarity >= similarityThreshold) {
          patternLinks.push({
            source: patternNodes[i].id,
            target: patternNodes[j].id,
            similarity,
            width: similarity * 5, // Width based on similarity
          });
        }
      }
    }
    
    return { nodes: patternNodes, links: patternLinks };
  }, [patterns, similarityThreshold]);
  
  // Calculate similarity between two patterns using cosine similarity
  const calculateSimilarity = (
    features1: Float32Array, 
    features2: Float32Array
  ): number => {
    if (!features1 || !features2 || features1.length !== features2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      mag1 += features1[i] * features1[i];
      mag2 += features2[i] * features2[i];
    }
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
    return Math.max(0, Math.min(1, similarity)); // Clamp between 0 and 1
  };
  
  // Set up and run the force simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    setSimulationRunning(true);
    
    // Clear previous simulation
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Create the force simulation
    const simulation = d3.forceSimulation<PatternNode>(nodes)
      .force("link", d3.forceLink<PatternNode, PatternLink>(links)
        .id(d => d.id)
        .distance(d => 200 - (d.similarity * 150)) // Closer for more similar patterns
        .strength(d => d.similarity * 0.5))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<PatternNode>().radius(d => d.radius + 5));
    
    // Create the links
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", d => d.width)
      .attr("stroke", "rgba(150, 150, 150, 0.5)");
    
    // Create the nodes
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("stroke", d => 
        d.id === selectedPatternId 
          ? "#fff" 
          : d.id === hoveredPatternId 
            ? "#eee" 
            : "none"
      )
      .attr("stroke-width", d => 
        d.id === selectedPatternId 
          ? 3 
          : d.id === hoveredPatternId 
            ? 2 
            : 0
      )
      .call(d3.drag<SVGCircleElement, PatternNode>()
        .on("start", dragStarted)
        .on("drag", dragging)
        .on("end", dragEnded))
      .on("mouseover", (event, d) => {
        setHoveredPatternId(d.id);
      })
      .on("mouseout", () => {
        setHoveredPatternId(null);
      })
      .on("click", (event, d) => {
        if (onPatternSelect) {
          const selectedPattern = patterns.find(p => p.id === d.id);
          if (selectedPattern) {
            onPatternSelect(selectedPattern);
          }
        }
      });
    
    // Add node labels
    const labels = svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text(d => d.type.charAt(0).toUpperCase() + d.type.slice(1))
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .style("fill", "#333");
    
    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as PatternNode).x || 0)
        .attr("y1", d => (d.source as PatternNode).y || 0)
        .attr("x2", d => (d.target as PatternNode).x || 0)
        .attr("y2", d => (d.target as PatternNode).y || 0);
        
      node
        .attr("cx", d => {
          // Keep nodes within boundaries
          d.x = Math.max(d.radius, Math.min(width - d.radius, d.x || width/2));
          return d.x;
        })
        .attr("cy", d => {
          // Keep nodes within boundaries
          d.y = Math.max(d.radius, Math.min(height - d.radius, d.y || height/2));
          return d.y;
        });
        
      labels
        .attr("x", d => d.x || 0)
        .attr("y", d => (d.y || 0) - d.radius - 5);
    });
    
    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGCircleElement, PatternNode, PatternNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragging(event: d3.D3DragEvent<SVGCircleElement, PatternNode, PatternNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGCircleElement, PatternNode, PatternNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    simulationRef.current = simulation;
    
    // Stop the simulation after it's stabilized
    simulation.on("end", () => {
      setSimulationRunning(false);
    });
    
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, selectedPatternId, hoveredPatternId, onPatternSelect]);
  
  // Handle selected pattern highlight updates
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Update strokes for selected and hovered nodes
    d3.select(svgRef.current)
      .selectAll("circle")
      .attr("stroke", d => 
        (d as PatternNode).id === selectedPatternId 
          ? "#fff" 
          : (d as PatternNode).id === hoveredPatternId 
            ? "#eee" 
            : "none"
      )
      .attr("stroke-width", d => 
        (d as PatternNode).id === selectedPatternId 
          ? 3 
          : (d as PatternNode).id === hoveredPatternId 
            ? 2 
            : 0
      );
      
  }, [selectedPatternId, hoveredPatternId]);
  
  return (
    <div className="pattern-graph-container">
      <div className="graph-controls">
        <button 
          onClick={() => {
            if (simulationRef.current) {
              simulationRef.current.alpha(0.3).restart();
              setSimulationRunning(true);
            }
          }}
          disabled={simulationRunning}
          className="graph-control-button"
        >
          Rearrange
        </button>
        <div className="similarity-control">
          <label>Similarity Threshold: {similarityThreshold.toFixed(2)}</label>
        </div>
      </div>
      
      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        className="pattern-graph"
        viewBox={`0 0 ${width} ${height}`}
      />
      
      {hoveredPatternId && (
        <div className="pattern-tooltip">
          {hoveredPatternId && patterns.find(p => p.id === hoveredPatternId)?.type}
        </div>
      )}
      
      <div className="graph-legend">
        <div className="legend-title">Pattern Types</div>
        <div className="legend-items">
          {[
            { type: 'harmonic', color: '#2ecc71' },
            { type: 'percussive', color: '#e74c3c' },
            { type: 'melodic', color: '#3498db' },
            { type: 'speech', color: '#9b59b6' },
            { type: 'noise', color: '#7f8c8d' },
            { type: 'textural', color: '#f1c40f' },
            { type: 'ambient', color: '#1abc9c' }
          ].map(item => (
            <div key={item.type} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: item.color }}
              />
              <div className="legend-label">
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};