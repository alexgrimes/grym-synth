/**
 * GrymSynth Organic Voronoi Parameter Visualizer
 *
 * This implementation creates an organic, flowing visualization
 * for audio parameters using Voronoi patterns and natural shapes.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SpectroMorphAnalysis } from './SpectroMorphAnalyzer';

// Types for the Voronoi visualization
export interface VoronoiCell {
  id: string;
  points: Point[];      // Vertices defining the cell
  center: Point;        // Center point of the cell
  neighbors: string[];  // IDs of neighboring cells
  parameters: {
    frequency: number;  // Associated frequency
    amplitude: number;  // Associated amplitude
    phase: number;      // Associated phase
  };
  visual: {
    color: string;      // Fill color
    borderColor: string; // Border color
    borderWidth: number; // Border width
    opacity: number;    // Opacity
  };
  motion: {
    velocity: Vector;   // Current velocity
    acceleration: Vector; // Current acceleration
    target: Point | null; // Target position (if any)
  };
  field: {
    strength: number;   // Field strength (0-1)
    type: 'attract' | 'repel'; // Field type
    radius: number;     // Field influence radius
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface VoronoiRendererOptions {
  cellCount: number;         // Initial number of cells
  relaxationIterations: number; // Lloyd relaxation iterations
  fluidityFactor: number;    // How fluid/organic the motion is (0-1)
  colorPalette: string[];    // Colors to use for cells
  centerPoint: Point;        // Center of the visualization
  eqPosition: Point;         // Position of the EQ controls
  eqSize: { width: number; height: number }; // Size of EQ controls
}

interface OrganicVoronoiVisualizerProps {
  width?: number;
  height?: number;
  options?: Partial<VoronoiRendererOptions>;
  onCellInteraction?: (cellId: string, position: Point) => void;
  onEQInteraction?: (band: number, value: number) => void;
}

/**
 * Main Voronoi pattern visualizer that creates organic, flowing visuals
 */
export const OrganicVoronoiVisualizer: React.FC<OrganicVoronoiVisualizerProps> = ({
  width = 800,
  height = 400,
  options = {},
  onCellInteraction,
  onEQInteraction
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cells, setCells] = useState<Map<string, VoronoiCell>>(new Map());
  const [eqVisible, setEqVisible] = useState<boolean>(true);
  const [eqParameters, setEqParameters] = useState<Map<string, number>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Initialize the visualization
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Set default options
    const rendererOptions: VoronoiRendererOptions = {
      cellCount: 25,
      relaxationIterations: 3,
      fluidityFactor: 0.7,
      colorPalette: [
        '#1A237E', '#283593', '#303F9F', '#3949AB',
        '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA'
      ],
      centerPoint: { x: canvas.width / 2, y: canvas.height / 2 },
      eqPosition: { x: canvas.width / 2, y: canvas.height / 2 },
      eqSize: { width: canvas.width * 0.6, height: canvas.height * 0.2 },
      ...options
    };

    // Initialize EQ parameters
    const bands = 8;
    const initialEqParams = new Map<string, number>();
    for (let i = 0; i < bands; i++) {
      initialEqParams.set(`eq-band-${i}`, 0.5 + (Math.random() - 0.5) * 0.5);
    }
    setEqParameters(initialEqParams);

    // Generate initial points
    const points = generateInitialPoints(canvas, rendererOptions);

    // Create initial cells
    const initialCells = createVoronoiCells(points, rendererOptions);
    setCells(initialCells);

    // Start animation loop
    startAnimation();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [options, width, height]);

  // Generate initial points in an organic pattern
  const generateInitialPoints = (canvas: HTMLCanvasElement, options: VoronoiRendererOptions): Point[] => {
    const points: Point[] = [];
    const { width, height } = canvas;
    const { cellCount, centerPoint } = options;

    // Create points in a natural distribution
    // Avoid the EQ area in the center
    const eqRect = getEQRectangle(options);

    // Use golden ratio for more natural point distribution
    const goldenRatio = 1.61803398875;
    const goldenAngle = Math.PI * 2 / goldenRatio;

    for (let i = 0; i < cellCount; i++) {
      // Use golden angle to create spiral pattern
      const angle = i * goldenAngle;
      // Distance increases with sqrt to distribute points more evenly
      const distance = Math.sqrt(i / cellCount) * Math.min(width, height) * 0.4;

      let x = centerPoint.x + Math.cos(angle) * distance;
      let y = centerPoint.y + Math.sin(angle) * distance;

      // Add some randomness for organic feel
      x += (Math.random() - 0.5) * distance * 0.2;
      y += (Math.random() - 0.5) * distance * 0.2;

      // Make sure point is not in the EQ rectangle
      if (
        x >= eqRect.x &&
        x <= eqRect.x + eqRect.width &&
        y >= eqRect.y &&
        y <= eqRect.y + eqRect.height
      ) {
        // Move point outside EQ area
        const angle = Math.atan2(y - centerPoint.y, x - centerPoint.x);
        const newDistance = Math.max(
          eqRect.width / Math.abs(Math.cos(angle)),
          eqRect.height / Math.abs(Math.sin(angle))
        ) * 0.6;

        x = centerPoint.x + Math.cos(angle) * newDistance;
        y = centerPoint.y + Math.sin(angle) * newDistance;
      }

      // Keep points within canvas
      x = Math.max(10, Math.min(width - 10, x));
      y = Math.max(10, Math.min(height - 10, y));

      points.push({ x, y });
    }

    return points;
  };

  // Create Voronoi cells from points
  const createVoronoiCells = (points: Point[], options: VoronoiRendererOptions): Map<string, VoronoiCell> => {
    const cells = new Map<string, VoronoiCell>();

    // Create cells based on points
    points.forEach((point, index) => {
      const id = `cell-${index}`;

      // Create a cell with organic shape
      const cell: VoronoiCell = {
        id,
        points: generateCellPoints(point),
        center: point,
        neighbors: [],
        parameters: {
          frequency: 200 + Math.random() * 2000,
          amplitude: Math.random(),
          phase: Math.random() * Math.PI * 2
        },
        visual: {
          color: options.colorPalette[
            Math.floor(Math.random() * options.colorPalette.length)
          ],
          borderColor: '#FFFFFF',
          borderWidth: 1,
          opacity: 0.6 + Math.random() * 0.4
        },
        motion: {
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          target: null
        },
        field: {
          strength: 0.1 + Math.random() * 0.5,
          type: Math.random() > 0.5 ? 'attract' : 'repel',
          radius: 50 + Math.random() * 100
        }
      };

      cells.set(id, cell);
    });

    // Compute neighbors
    computeNeighbors(cells);

    return cells;
  };

  // Generate points for a cell to create an organic shape
  const generateCellPoints = (center: Point): Point[] => {
    const points: Point[] = [];
    const numPoints = 8 + Math.floor(Math.random() * 4);
    const baseRadius = 20 + Math.random() * 30;

    // Create an irregular oval-like shape
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;

      // Vary the radius to create organic shape
      const radius = baseRadius * (0.8 + Math.cos(angle * 2) * 0.1 + Math.sin(angle * 3) * 0.1);

      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    }

    return points;
  };

  // Compute neighboring cells
  const computeNeighbors = (cells: Map<string, VoronoiCell>): void => {
    const cellArray = Array.from(cells.values());

    for (const cell of cellArray) {
      cell.neighbors = [];

      for (const otherCell of cellArray) {
        if (otherCell.id === cell.id) continue;

        const dx = otherCell.center.x - cell.center.x;
        const dy = otherCell.center.y - cell.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Consider cells neighbors if they're close enough
        if (distance < 100) {
          cell.neighbors.push(otherCell.id);
        }
      }
    }
  };

  // Start the animation loop
  const startAnimation = () => {
    lastUpdateTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = timestamp;

      // Update cells
      updateCells(deltaTime / 1000); // Convert to seconds

      // Render current state
      render();

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Update cells based on physics and parameters
  const updateCells = (deltaTime: number) => {
    setCells(prevCells => {
      const updatedCells = new Map(prevCells);
      const rendererOptions = {
        fluidityFactor: 0.7,
        centerPoint: { x: width / 2, y: height / 2 },
        eqPosition: { x: width / 2, y: height / 2 },
        eqSize: { width: width * 0.6, height: height * 0.2 },
        ...options
      };

      for (const cell of updatedCells.values()) {
        // Apply natural motion
        applyNaturalMotion(cell, deltaTime, rendererOptions);

        // Apply field effects from other cells
        applyFieldEffects(cell, deltaTime, updatedCells);

        // Apply parameter influences
        applyParameterInfluences(cell, deltaTime);

        // Update position based on velocity
        cell.center.x += cell.motion.velocity.x * deltaTime * rendererOptions.fluidityFactor;
        cell.center.y += cell.motion.velocity.y * deltaTime * rendererOptions.fluidityFactor;

        // Apply velocity damping for stability
        cell.motion.velocity.x *= 0.95;
        cell.motion.velocity.y *= 0.95;

        // Update cell shape based on new center
        cell.points = generateCellPoints(cell.center);

        // Keep cells within canvas bounds
        constrainToCanvas(cell, width, height);

        // Avoid EQ area
        if (eqVisible) {
          avoidEQArea(cell, rendererOptions);
        }
      }

      return updatedCells;
    });
  };

  // Apply natural flowing motion to cells
  const applyNaturalMotion = (cell: VoronoiCell, deltaTime: number, options: Partial<VoronoiRendererOptions>) => {
    const centerPoint = options.centerPoint || { x: width / 2, y: height / 2 };

    // Apply gentle random motion for organic feel
    cell.motion.acceleration.x += (Math.random() - 0.5) * 5 * deltaTime;
    cell.motion.acceleration.y += (Math.random() - 0.5) * 5 * deltaTime;

    // Apply acceleration to velocity
    cell.motion.velocity.x += cell.motion.acceleration.x * deltaTime;
    cell.motion.velocity.y += cell.motion.acceleration.y * deltaTime;

    // Apply mild circular motion for flowing effect
    const centerDist = {
      x: centerPoint.x - cell.center.x,
      y: centerPoint.y - cell.center.y
    };
    const distance = Math.sqrt(centerDist.x * centerDist.x + centerDist.y * centerDist.y);

    if (distance > 10) {
      // Apply gentle orbital tendency
      const angle = Math.atan2(centerDist.y, centerDist.x);
      const orbitalForce = 0.5 * deltaTime;

      cell.motion.velocity.x += Math.cos(angle + Math.PI/2) * orbitalForce;
      cell.motion.velocity.y += Math.sin(angle + Math.PI/2) * orbitalForce;

      // Mild attraction to prevent cells from drifting too far
      cell.motion.velocity.x += centerDist.x * 0.01 * deltaTime;
      cell.motion.velocity.y += centerDist.y * 0.01 * deltaTime;
    }

    // Reset acceleration
    cell.motion.acceleration.x = 0;
    cell.motion.acceleration.y = 0;
  };

  // Apply field effects from other cells
  const applyFieldEffects = (cell: VoronoiCell, deltaTime: number, cells: Map<string, VoronoiCell>) => {
    for (const otherId of cell.neighbors) {
      const otherCell = cells.get(otherId);
      if (!otherCell) continue;

      const dx = otherCell.center.x - cell.center.x;
      const dy = otherCell.center.y - cell.center.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < 1) continue; // Avoid division by zero

      // Calculate field effect based on field properties
      const fieldRadius = otherCell.field.radius;

      if (dist < fieldRadius) {
        const force = otherCell.field.strength * (1 - dist / fieldRadius) * 10 * deltaTime;
        const forceX = dx / dist * force;
        const forceY = dy / dist * force;

        // Apply attraction or repulsion
        const multiplier = otherCell.field.type === 'attract' ? 1 : -1;

        cell.motion.velocity.x += forceX * multiplier;
        cell.motion.velocity.y += forceY * multiplier;
      }
    }
  };

  // Apply parameter influences to cell properties
  const applyParameterInfluences = (cell: VoronoiCell, deltaTime: number) => {
    // Update visual properties based on parameters

    // Frequency affects color
    const frequencyNorm = (cell.parameters.frequency - 200) / 2000;
    const colorIndex = Math.floor(frequencyNorm * (options.colorPalette?.length || 8));
    cell.visual.color = (options.colorPalette || [
      '#1A237E', '#283593', '#303F9F', '#3949AB',
      '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA'
    ])[Math.max(0, Math.min((options.colorPalette?.length || 8) - 1, colorIndex))];

    // Amplitude affects opacity
    cell.visual.opacity = 0.3 + cell.parameters.amplitude * 0.7;

    // Phase affects border width
    cell.visual.borderWidth = 0.5 + Math.sin(cell.parameters.phase) * 1.5;
  };

  // Constrain cell to canvas boundaries
  const constrainToCanvas = (cell: VoronoiCell, width: number, height: number) => {
    const margin = 30; // Margin to keep cells fully visible

    // Calculate bounding box of cell
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of cell.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    // Calculate offsets to keep cell within canvas
    const offsetX = minX < margin ? margin - minX :
                   maxX > width - margin ? width - margin - maxX : 0;

    const offsetY = minY < margin ? margin - minY :
                   maxY > height - margin ? height - margin - maxY : 0;

    // Apply offsets to cell center and points
    if (offsetX !== 0 || offsetY !== 0) {
      cell.center.x += offsetX;
      cell.center.y += offsetY;

      for (const point of cell.points) {
        point.x += offsetX;
        point.y += offsetY;
      }

      // Add slight bounce effect on collision with boundary
      if (offsetX !== 0) {
        cell.motion.velocity.x = -cell.motion.velocity.x * 0.5;
      }

      if (offsetY !== 0) {
        cell.motion.velocity.y = -cell.motion.velocity.y * 0.5;
      }
    }
  };

  // Make cells avoid the EQ area
  const avoidEQArea = (cell: VoronoiCell, options: Partial<VoronoiRendererOptions>) => {
    const eqRect = getEQRectangle(options);

    // Calculate cell bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of cell.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    // Check for overlap with EQ area
    if (
      maxX >= eqRect.x &&
      minX <= eqRect.x + eqRect.width &&
      maxY >= eqRect.y &&
      minY <= eqRect.y + eqRect.height
    ) {
      // Calculate direction to move away from EQ
      const cellCenterX = (minX + maxX) / 2;
      const cellCenterY = (minY + maxY) / 2;
      const eqCenterX = eqRect.x + eqRect.width / 2;
      const eqCenterY = eqRect.y + eqRect.height / 2;

      const dx = cellCenterX - eqCenterX;
      const dy = cellCenterY - eqCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        // Calculate repulsion force
        const repulsionForce = 2;
        const moveX = dx / dist * repulsionForce;
        const moveY = dy / dist * repulsionForce;

        // Move cell away from EQ
        cell.center.x += moveX;
        cell.center.y += moveY;

        // Update points
        for (const point of cell.points) {
          point.x += moveX;
          point.y += moveY;
        }

        // Add velocity away from EQ
        cell.motion.velocity.x += moveX * 2;
        cell.motion.velocity.y += moveY * 2;
      }
    }
  };

  // Get the EQ area rectangle
  const getEQRectangle = (options: Partial<VoronoiRendererOptions>) => {
    const eqPosition = options.eqPosition || { x: width / 2, y: height / 2 };
    const eqSize = options.eqSize || { width: width * 0.6, height: height * 0.2 };

    return {
      x: eqPosition.x - eqSize.width / 2,
      y: eqPosition.y - eqSize.height / 2,
      width: eqSize.width,
      height: eqSize.height
    };
  };

  // Render the current state
  const render = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background gradient
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#0F0F1A');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Render cells from back to front (sort by size for pseudo-depth)
    const sortedCells = Array.from(cells.values())
      .sort((a, b) => {
        const aSize = calculateCellSize(a);
        const bSize = calculateCellSize(b);
        return aSize - bSize;
      });

    // Render connections between neighboring cells
    renderConnections(ctx, cells);

    // Render cells
    for (const cell of sortedCells) {
      renderCell(ctx, cell);
    }

    // Render EQ controls
    if (eqVisible) {
      renderEQ(ctx);
    }
  };

  // Calculate approximate cell size
  const calculateCellSize = (cell: VoronoiCell): number => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of cell.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return (maxX - minX) * (maxY - minY);
  };

  // Render a single cell
  const renderCell = (ctx: CanvasRenderingContext2D, cell: VoronoiCell) => {
    if (cell.points.length < 3) return;

    ctx.save();

    // Begin path for cell shape
    ctx.beginPath();
    ctx.moveTo(cell.points[0].x, cell.points[0].y);

    // Draw cell shape with smooth curves for organic feel
    for (let i = 0; i < cell.points.length; i++) {
      const current = cell.points[i];
      const next = cell.points[(i + 1) % cell.points.length];

      // Use quadratic curves for smoother shape
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    ctx.closePath();

    // Fill with semi-transparent color
    ctx.fillStyle = cell.visual.color;
    ctx.globalAlpha = cell.visual.opacity;
    ctx.fill();

    // Stroke with border
    ctx.strokeStyle = cell.visual.borderColor;
    ctx.lineWidth = cell.visual.borderWidth;
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    // Draw field indicator
    renderCellField(ctx, cell);

    ctx.restore();
  };

  // Render cell's field
  const renderCellField = (ctx: CanvasRenderingContext2D, cell: VoronoiCell) => {
    // Only render field if strength is significant
    if (cell.field.strength < 0.1) return;

    ctx.save();

    // Draw field indicator
    const gradient = ctx.createRadialGradient(
      cell.center.x, cell.center.y, 0,
      cell.center.x, cell.center.y, cell.field.radius
    );

    // Different colors for attract vs repel
    const color = cell.field.type === 'attract' ?
      'rgba(64, 128, 255, ' : 'rgba(255, 64, 128, ';

    gradient.addColorStop(0, color + '0.2)');
    gradient.addColorStop(0.7, color + '0.05)');
    gradient.addColorStop(1, color + '0)');

    ctx.fillStyle = gradient;
    ctx.globalAlpha = cell.field.strength;
    ctx.beginPath();
    ctx.arc(cell.center.x, cell.center.y, cell.field.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Render connections between neighboring cells
  const renderConnections = (ctx: CanvasRenderingContext2D, cells: Map<string, VoronoiCell>) => {
    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;

    const renderedConnections = new Set<string>();

    for (const cell of cells.values()) {
      for (const neighborId of cell.neighbors) {
        // Avoid rendering the same connection twice
        const connectionId = [cell.id, neighborId].sort().join('-');
        if (renderedConnections.has(connectionId)) continue;
        renderedConnections.add(connectionId);

        const neighbor = cells.get(neighborId);
        if (!neighbor) continue;

        // Draw line between cell centers with slight curve
        ctx.beginPath();

        // Calculate midpoint with slight offset for curve
        const midX = (cell.center.x + neighbor.center.x) / 2;
        const midY = (cell.center.y + neighbor.center.y) / 2;

        // Calculate perpendicular offset for control point
        const dx = neighbor.center.x - cell.center.x;
        const dy = neighbor.center.y - cell.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Skip if cells are too close
        if (dist < 5) continue;

        // Add slight curve
        const curveAmount = Math.min(20, dist * 0.2);
        const offsetX = -dy / dist * curveAmount;
        const offsetY = dx / dist * curveAmount;

        const controlX = midX + offsetX;
        const controlY = midY + offsetY;

        // Draw curved connection
        ctx.moveTo(cell.center.x, cell.center.y);
        ctx.quadraticCurveTo(
          controlX, controlY,
          neighbor.center.x, neighbor.center.y
        );

        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Render EQ controls
  const renderEQ = (ctx: CanvasRenderingContext2D) => {
    const eqRect = getEQRectangle(options);

    ctx.save();

    // Draw EQ background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
    ctx.strokeStyle = 'rgba(100, 140, 255, 0.5)';
    ctx.lineWidth = 2;

    // Draw rounded rectangle
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(eqRect.x + radius, eqRect.y);
    ctx.lineTo(eqRect.x + eqRect.width - radius, eqRect.y);
    ctx.quadraticCurveTo(eqRect.x + eqRect.width, eqRect.y, eqRect.x + eqRect.width, eqRect.y + radius);
    ctx.lineTo(eqRect.x + eqRect.width, eqRect.y + eqRect.height - radius);
    ctx.quadraticCurveTo(eqRect.x + eqRect.width, eqRect.y + eqRect.height, eqRect.x + eqRect.width - radius, eqRect.y + eqRect.height);
    ctx.lineTo(eqRect.x + radius, eqRect.y + eqRect.height);
    ctx.quadraticCurveTo(eqRect.x, eqRect.y + eqRect.height, eqRect.x, eqRect.y + eqRect.height - radius);
    ctx.lineTo(eqRect.x, eqRect.y + radius);
    ctx.quadraticCurveTo(eqRect.x, eqRect.y, eqRect.x + radius, eqRect.y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Draw EQ sliders
    const bands = 8;
    const sliderWidth = eqRect.width / (bands + 1);
    const sliderHeight = eqRect.height * 0.6;
    const sliderY = eqRect.y + (eqRect.height - sliderHeight) / 2;

    // Draw each EQ band
    for (let i = 0; i < bands; i++) {
      const paramName = `eq-band-${i}`;
      const value = eqParameters.get(paramName) || 0.5;
      const sliderX = eqRect.x + sliderWidth * (i + 1);

      // Draw slider track
      ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
      ctx.fillRect(
        sliderX - sliderWidth * 0.3,
        sliderY,
        sliderWidth * 0.6,
        sliderHeight
      );

      // Draw slider handle
      const handleY = sliderY + sliderHeight * (1 - value);
      const handleHeight = sliderHeight * 0.05 + sliderHeight * 0.1 * value;

      // Draw gradient for slider value
      const gradient = ctx.createLinearGradient(
        sliderX - sliderWidth * 0.3,
        handleY,
        sliderX + sliderWidth * 0.3,
        handleY + handleHeight
      );

      // Color based on frequency band
      const hue = 220 + (i / bands) * 140;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.8)`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.8)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(
        sliderX - sliderWidth * 0.3,
        handleY,
        sliderWidth * 0.6,
        handleHeight
      );

      // Draw frequency label
      ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';

      // Calculate frequency for this band (logarithmic scale)
      const freq = Math.round(20 * Math.pow(2, i * 10 / bands));
      let freqLabel = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${freq}`;

      ctx.fillText(
        freqLabel,
        sliderX,
        eqRect.y + eqRect.height - 5
      );
    }

    // Draw EQ title
    ctx.fillStyle = 'rgba(200, 200, 255, 0.9)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'SPECTRAL EQ',
      eqRect.x + eqRect.width / 2,
      eqRect.y + 15
    );

    ctx.restore();
  };

  // Handle mouse interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on EQ
    if (isPointInEQ(x, y)) {
      handleEQInteraction(x, y);
    } else {
      handleCellInteraction(x, y);
    }
  };

  // Check if point is in EQ area
  const isPointInEQ = (x: number, y: number): boolean => {
    if (!eqVisible) return false;

    const eqRect = getEQRectangle(options);

    return (
      x >= eqRect.x &&
      x <= eqRect.x + eqRect.width &&
      y >= eqRect.y &&
      y <= eqRect.y + eqRect.height
    );
  };

  // Handle interaction with EQ controls
  const handleEQInteraction = (x: number, y: number) => {
    const eqRect = getEQRectangle(options);

    // Calculate which band was clicked
    const bands = 8;
    const sliderWidth = eqRect.width / (bands + 1);

    // Find which slider was clicked
    for (let i = 0; i < bands; i++) {
      const sliderX = eqRect.x + sliderWidth * (i + 1);

      if (Math.abs(x - sliderX) < sliderWidth * 0.3) {
        // Calculate new value based on y position
        const sliderHeight = eqRect.height * 0.6;
        const sliderY = eqRect.y + (eqRect.height - sliderHeight) / 2;

        // Convert y position to value (0-1)
        let value = 1 - (y - sliderY) / sliderHeight;
        value = Math.max(0, Math.min(1, value));

        // Update parameter
        setEqParameters(prev => {
          const updated = new Map(prev);
          updated.set(`eq-band-${i}`, value);
          return updated;
        });

        // Call callback if provided
        if (onEQInteraction) {
          onEQInteraction(i, value);
        }

        // Update cells based on EQ change
        updateCellsFromEQ(i, value);

        break;
      }
    }
  };

  // Update cells based on EQ change
  const updateCellsFromEQ = (band: number, value: number) => {
    // Calculate frequency range for this band
    const minFreq = 20 * Math.pow(2, band * 10 / 8);
    const maxFreq = 20 * Math.pow(2, (band + 1) * 10 / 8);

    setCells(prevCells => {
      const updatedCells = new Map(prevCells);

      // Update cells that fall in this frequency range
      for (const cell of updatedCells.values()) {
        if (cell.parameters.frequency >= minFreq && cell.parameters.frequency < maxFreq) {
          // Update amplitude based on EQ value
          cell.parameters.amplitude = value;

          // Add some energy to cell based on value change
          const energyBoost = Math.abs(value - 0.5) * 5;
          const angle = Math.random() * Math.PI * 2;

          cell.motion.velocity.x += Math.cos(angle) * energyBoost;
          cell.motion.velocity.y += Math.sin(angle) * energyBoost;

          // Update visual properties
          cell.visual.opacity = 0.3 + value * 0.7;
        }
      }

      return updatedCells;
    });
  };

  // Handle interaction with cells
  const handleCellInteraction = (x: number, y: number) => {
    // Find closest cell
    let closestCell: VoronoiCell | null = null;
    let minDistance = Infinity;

    for (const cell of cells.values()) {
      const dx = cell.center.x - x;
      const dy = cell.center.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestCell = cell;
      }
    }

    // Interact with closest cell if it's close enough
    if (closestCell && minDistance < 50) {
      setCells(prevCells => {
        const updatedCells = new Map(prevCells);
        const cell = updatedCells.get(closestCell!.id);

        if (cell) {
          // Toggle field type
          cell.field.type = cell.field.type === 'attract' ? 'repel' : 'attract';

          // Boost field strength temporarily
          cell.field.strength = Math.min(1, cell.field.strength + 0.3);

          // Add energy to all cells based on field
          for (const otherCell of updatedCells.values()) {
            if (otherCell.id === cell.id) continue;

            const dx = otherCell.center.x - cell.center.x;
            const dy = otherCell.center.y - cell.center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cell.field.radius) {
              const force = cell.field.strength * (1 - dist / cell.field.radius) * 20;
              const forceX = dx / dist * force;
              const forceY = dy / dist * force;

              // Apply attraction or repulsion
              const multiplier = cell.field.type === 'attract' ? -1 : 1;

              otherCell.motion.velocity.x += forceX * multiplier;
              otherCell.motion.velocity.y += forceY * multiplier;
            }
          }
        }

        // Call callback if provided
        if (onCellInteraction && closestCell) {
          onCellInteraction(closestCell.id, closestCell.center);
        }

        return updatedCells;
      });
    }
  };

  // Update visualization from audio analysis
  const updateFromAudioAnalysis = (analysis: SpectroMorphAnalysis) => {
    setCells(prevCells => {
      const updatedCells = new Map(prevCells);
      const cellArray = Array.from(updatedCells.values());

      // Sort cells by frequency
      cellArray.sort((a, b) => a.parameters.frequency - b.parameters.frequency);

      // Create groups of cells based on spectral typology
      const noteThreshold = analysis.spectralTypology.position * 0.5;
      const noiseThreshold = 0.5 + analysis.spectralTypology.position * 0.5;

      // Group cells by spectral position
      const noteCells = cellArray.slice(0, Math.floor(cellArray.length * noteThreshold));
      const nodeCells = cellArray.slice(
        Math.floor(cellArray.length * noteThreshold),
        Math.floor(cellArray.length * noiseThreshold)
      );
      const noiseCells = cellArray.slice(Math.floor(cellArray.length * noiseThreshold));

      // Apply different behaviors to each group

      // Note cells - more ordered, coherent
      for (const cell of noteCells) {
        // Make more stable, smaller field radius
        cell.field.radius = 30 + Math.random() * 20;
        cell.field.strength = 0.2 + Math.random() * 0.3;
        cell.visual.opacity = 0.7 + Math.random() * 0.3;

        // More likely to attract
        cell.field.type = Math.random() < 0.7 ? 'attract' : 'repel';
      }

      // Node cells - balanced behavior
      for (const cell of nodeCells) {
        // Moderate parameters
        cell.field.radius = 40 + Math.random() * 30;
        cell.field.strength = 0.3 + Math.random() * 0.4;
        cell.visual.opacity = 0.5 + Math.random() * 0.4;

        // Equal chance of attract/repel
        cell.field.type = Math.random() < 0.5 ? 'attract' : 'repel';
      }

      // Noise cells - more chaotic, larger fields
      for (const cell of noiseCells) {
        // More unstable, larger fields
        cell.field.radius = 60 + Math.random() * 40;
        cell.field.strength = 0.4 + Math.random() * 0.6;
        cell.visual.opacity = 0.3 + Math.random() * 0.5;

        // More likely to repel
        cell.field.type = Math.random() < 0.3 ? 'attract' : 'repel';
      }

      // Apply motion based on spectral motion
      applySpectralMotion(updatedCells, analysis.spectralMotion);

      // Apply morphological model
      applyMorphologicalModel(updatedCells, analysis.morphologicalModel);

      return updatedCells;
    });
  };

  // Apply spectral motion to cells
  const applySpectralMotion = (cells: Map<string, VoronoiCell>, motion: any) => {
    const cellArray = Array.from(cells.values());

    // Apply different motion patterns based on motion type
    switch (motion.type) {
      case 'linear':
        // Cells move in one direction
        for (const cell of cellArray) {
          const angle = Math.PI * 0.5; // Move upward
          cell.motion.velocity.x += Math.cos(angle) * motion.intensity * 2;
          cell.motion.velocity.y += Math.sin(angle) * motion.intensity * 2;
        }
        break;

      case 'parabola':
        // Cells follow curved path
        for (const cell of cellArray) {
          const normalizedX = (cell.center.x / width) * 2 - 1;
          const forceY = -normalizedX * normalizedX * motion.intensity * 3;
          cell.motion.velocity.y += forceY;
          cell.motion.velocity.x += normalizedX * 0.1;
        }
        break;

      case 'oscillation':
        // Regular oscillation
        for (const cell of cellArray) {
          const angle = performance.now() * 0.001 * motion.rate;
          const force = Math.sin(angle) * motion.intensity * 3;
          cell.motion.velocity.x += force;
        }
        break;

      case 'undulation':
        // Irregular oscillation
        for (const cell of cellArray) {
          const baseAngle = performance.now() * 0.001 * motion.rate;
          const noise = Math.sin(cell.center.x * 0.1) * Math.cos(cell.center.y * 0.1);
          const force = Math.sin(baseAngle + noise * 2) * motion.intensity * 3;
          cell.motion.velocity.x += force * Math.cos(noise);
          cell.motion.velocity.y += force * Math.sin(noise);
        }
        break;

      case 'iteration':
        // Regular pulses
        for (const cell of cellArray) {
          const pulse = (Math.floor(performance.now() * 0.01 * motion.rate) % 2) === 0;
          if (pulse) {
            const angle = Math.random() * Math.PI * 2;
            cell.motion.velocity.x += Math.cos(angle) * motion.intensity * 2;
            cell.motion.velocity.y += Math.sin(angle) * motion.intensity * 2;
          }
        }
        break;

      case 'turbulence':
        // Chaotic motion
        for (const cell of cellArray) {
          const angle = Math.random() * Math.PI * 2;
          cell.motion.velocity.x += Math.cos(angle) * motion.intensity * 4;
          cell.motion.velocity.y += Math.sin(angle) * motion.intensity * 4;
        }
        break;
    }
  };

  // Apply morphological model to cells
  const applyMorphologicalModel = (cells: Map<string, VoronoiCell>, model: any) => {
    const cellArray = Array.from(cells.values());
    const centerPoint = options.centerPoint || { x: width / 2, y: height / 2 };

    // Apply different behaviors based on morphological phase
    switch (model.phase) {
      case 'onset':
        // Expanding energy
        for (const cell of cellArray) {
          // Cells move outward from center
          const dx = cell.center.x - centerPoint.x;
          const dy = cell.center.y - centerPoint.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 10) {
            const angle = Math.atan2(dy, dx);
            cell.motion.velocity.x += Math.cos(angle) * model.energy * 3;
            cell.motion.velocity.y += Math.sin(angle) * model.energy * 3;
          }
        }
        break;

      case 'continuant':
        // Sustained energy
        for (const cell of cellArray) {
          // Cells maintain position with slight motion
          cell.motion.velocity.x *= 0.8;
          cell.motion.velocity.y *= 0.8;

          // Add slight flowing motion
          const angle = performance.now() * 0.0005 +
                      cell.center.x * 0.01 +
                      cell.center.y * 0.01;

          cell.motion.velocity.x += Math.cos(angle) * model.energy * 0.5;
          cell.motion.velocity.y += Math.sin(angle) * model.energy * 0.5;
        }
        break;

      case 'termination':
        // Contracting energy
        for (const cell of cellArray) {
          // Cells move toward center
          const dx = centerPoint.x - cell.center.x;
          const dy = centerPoint.y - cell.center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 10) {
            const angle = Math.atan2(dy, dx);
            cell.motion.velocity.x += Math.cos(angle) * model.energy * 2;
            cell.motion.velocity.y += Math.sin(angle) * model.energy * 2;
          }
        }
        break;
    }

    // Apply complexity factor
    if (model.complexity > 0.7) {
      // Add more chaotic behavior for complex sounds
      for (const cell of cellArray) {
        const chaosFactor = (model.complexity - 0.7) * 3.3;
        const angle = Math.random() * Math.PI * 2;
        cell.motion.velocity.x += Math.cos(angle) * chaosFactor;
        cell.motion.velocity.y += Math.sin(angle) * chaosFactor;
      }
    }
  };

  // Toggle EQ visibility
  const toggleEQ = () => {
    setEqVisible(!eqVisible);
  };

  return (
    <div className="organic-voronoi-visualizer">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        className="voronoi-canvas"
      />
      <style jsx>{`
        .organic-voronoi-visualizer {
          position: relative;
          width: ${width}px;
          height: ${height}px;
        }

        .voronoi-canvas {
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default OrganicVoronoiVisualizer;
