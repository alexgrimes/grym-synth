import { LLMType } from '../services/llm/LLMOrchestrator';

export interface RippleOptions {
  duration: number;
  color: string;
  maxRadius: number;
  count: number;
  intensity: number;
  pulse: boolean;
  trail: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface ParameterPosition {
  id: string;
  position: Point;
  radius: number;
}

export class EnhancedRippleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ripples: Ripple[] = [];
  private trails: Trail[] = [];
  private animationFrame: number | null = null;
  private parameterPositions: Map<string, Point> = new Map();
  private parameterRadii: Map<string, number> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Ensure canvas size matches container
    this.handleResize();

    // Start animation loop
    this.animate();

    // Add resize handler
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.offsetWidth * dpr;
    this.canvas.height = this.canvas.offsetHeight * dpr;
    this.ctx.scale(dpr, dpr);
  };

  /**
   * Update parameter positions for visualization
   */
  updateParameterPositions(positions: ParameterPosition[]): void {
    this.parameterPositions.clear();
    this.parameterRadii.clear();

    positions.forEach(param => {
      this.parameterPositions.set(param.id, param.position);
      this.parameterRadii.set(param.id, param.radius);
    });
  }

  /**
   * Create ripple effect from chat to parameters
   */
  createChatToParameterRipple(
    chatPosition: Point,
    parameterIds: string[],
    llmType: LLMType,
    confidence: number,
    options: Partial<RippleOptions> = {}
  ): void {
    // Skip if no parameters found
    if (parameterIds.length === 0) return;

    // Filter parameter IDs that exist in our position map
    const validParameterIds = parameterIds.filter(id => this.parameterPositions.has(id));

    if (validParameterIds.length === 0) return;

    // Get color based on LLM type
    const color = this.getLLMColor(llmType, confidence);

    // Default options
    const defaultOptions: RippleOptions = {
      duration: 1200,
      color,
      maxRadius: 30,
      count: 3,
      intensity: confidence,
      pulse: confidence > 0.7,
      trail: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Create ripples for each parameter
    validParameterIds.forEach(paramId => {
      const paramPosition = this.parameterPositions.get(paramId)!;

      // Create trail from chat to parameter
      if (finalOptions.trail) {
        this.createTrail(
          chatPosition,
          paramPosition,
          finalOptions.color,
          finalOptions.duration,
          finalOptions.intensity
        );
      }

      // Create ripples at parameter position
      this.createRipplesAtPosition(
        paramPosition,
        finalOptions,
        this.parameterRadii.get(paramId) || 30
      );
    });
  }

  /**
   * Create parameter change ripples
   */
  createParameterChangeRipple(
    parameterId: string,
    value: number,
    previousValue: number | null = null
  ): void {
    if (!this.parameterPositions.has(parameterId)) return;

    const position = this.parameterPositions.get(parameterId)!;
    const radius = this.parameterRadii.get(parameterId) || 30;

    // Determine change intensity
    const changeIntensity = previousValue !== null
      ? Math.abs(value - previousValue)
      : 0.5;

    // Determine color based on value
    const hue = 220 + (value * 120); // 220 (blue) to 340 (purple)
    const color = `hsla(${hue}, 80%, 60%, 0.6)`;

    // Create options
    const options: RippleOptions = {
      duration: 800 + (changeIntensity * 400),
      color,
      maxRadius: radius * 1.5,
      count: 1 + Math.floor(changeIntensity * 3),
      intensity: 0.3 + (changeIntensity * 0.7),
      pulse: changeIntensity > 0.3,
      trail: false
    };

    // Create ripples
    this.createRipplesAtPosition(position, options, radius);
  }

  /**
   * Create confidence pulse effect
   */
  createConfidencePulse(
    centerX: number,
    centerY: number,
    confidence: number,
    llmType: LLMType
  ): void {
    // Get color based on LLM type and confidence
    const color = this.getLLMColor(llmType, confidence);

    // Create ripple options
    const options: RippleOptions = {
      duration: 2000,
      color,
      maxRadius: 100 + (confidence * 100),
      count: 1,
      intensity: confidence,
      pulse: true,
      trail: false
    };

    // Create single large ripple
    this.ripples.push(new Ripple(
      centerX,
      centerY,
      options.maxRadius,
      options.duration,
      options.color,
      options.intensity,
      options.pulse
    ));
  }

  /**
   * Create ripples at a specific position
   */
  private createRipplesAtPosition(
    position: Point,
    options: RippleOptions,
    baseRadius: number
  ): void {
    // Create multiple ripples with delay
    for (let i = 0; i < options.count; i++) {
      setTimeout(() => {
        this.ripples.push(new Ripple(
          position.x,
          position.y,
          options.maxRadius || baseRadius * 1.5,
          options.duration,
          options.color,
          options.intensity,
          options.pulse
        ));
      }, i * (options.duration / options.count / 2));
    }
  }

  /**
   * Create trail effect between two points
   */
  private createTrail(
    start: Point,
    end: Point,
    color: string,
    duration: number,
    intensity: number
  ): void {
    this.trails.push(new Trail(
      start,
      end,
      color,
      duration,
      intensity
    ));
  }

  /**
   * Get color based on LLM type and confidence
   */
  private getLLMColor(llmType: LLMType, confidence: number): string {
    // Base colors for each LLM type
    const colors = {
      reasoning: [100, 140, 255], // Blue
      audio: [100, 255, 140],     // Green
      parameter: [255, 180, 100], // Orange
      visual: [255, 100, 200]     // Pink
    };

    const color = colors[llmType] || colors.reasoning;

    // Adjust alpha based on confidence
    const alpha = 0.3 + (confidence * 0.5);

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  }

  /**
   * Animation loop
   */
  private animate = () => {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);

    // Update and render trails
    this.trails = this.trails.filter(trail => {
      trail.update();
      trail.render(this.ctx);
      return !trail.isFinished();
    });

    // Update and render ripples
    this.ripples = this.ripples.filter(ripple => {
      ripple.update();
      ripple.render(this.ctx);
      return !ripple.isFinished();
    });

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    window.removeEventListener('resize', this.handleResize);
    this.ripples = [];
    this.trails = [];
  }
}

/**
 * Ripple effect class
 */
class Ripple {
  private x: number;
  private y: number;
  private radius: number;
  private maxRadius: number;
  private duration: number;
  private color: string;
  private startTime: number;
  private intensity: number;
  private pulse: boolean;
  private pulsePhase: number = 0;

  constructor(
    x: number,
    y: number,
    maxRadius: number,
    duration: number,
    color: string,
    intensity: number = 0.5,
    pulse: boolean = false
  ) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.color = color;
    this.startTime = performance.now();
    this.intensity = intensity;
    this.pulse = pulse;
  }

  update(): void {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(1, elapsed / this.duration);

    // Easing function for smooth animation
    const easing = this.pulse
      ? this.pulseEasing(progress)
      : this.cubicEaseOut(progress);

    this.radius = this.maxRadius * easing;

    // Update pulse phase
    if (this.pulse) {
      this.pulsePhase = (elapsed / 300) % (Math.PI * 2);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(1, elapsed / this.duration);

    // Fade out as the ripple expands
    let alpha = (1 - progress) * this.intensity;

    // Add pulse effect if enabled
    if (this.pulse) {
      const pulseEffect = Math.sin(this.pulsePhase) * 0.2 + 0.8;
      alpha *= pulseEffect;
    }

    // Create gradient for more natural look
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );

    // Extract base color components for gradient
    const baseColor = this.color.replace(/rgba?\(/, '').replace(/\)/, '').split(',');
    const r = baseColor[0].trim();
    const g = baseColor[1].trim();
    const b = baseColor[2].trim();

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  isFinished(): boolean {
    return performance.now() - this.startTime > this.duration;
  }

  private cubicEaseOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private pulseEasing(t: number): number {
    // Combine a regular ease-out with a slight bounce
    const baseEasing = this.cubicEaseOut(t);
    const pulse = Math.sin(t * Math.PI * 3) * 0.1 * (1 - t);
    return baseEasing + pulse;
  }
}

/**
 * Trail effect class for connecting points
 */
class Trail {
  private start: Point;
  private end: Point;
  private color: string;
  private duration: number;
  private startTime: number;
  private intensity: number;
  private particles: TrailParticle[] = [];

  constructor(
    start: Point,
    end: Point,
    color: string,
    duration: number,
    intensity: number = 0.5
  ) {
    this.start = start;
    this.end = end;
    this.color = color;
    this.duration = duration;
    this.startTime = performance.now();
    this.intensity = intensity;

    // Create trail particles
    this.createParticles();
  }

  private createParticles(): void {
    // Calculate direction vector
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Create more particles for longer distances
    const particleCount = Math.max(20, Math.floor(distance / 10));

    // Create particles along the path
    for (let i = 0; i < particleCount; i++) {
      const progress = i / (particleCount - 1);
      const x = this.start.x + dx * progress;
      const y = this.start.y + dy * progress;

      // Add some randomness for more natural look
      const variance = 15 * this.intensity;
      const offsetX = (Math.random() - 0.5) * variance;
      const offsetY = (Math.random() - 0.5) * variance;

      // Create particle with offset and delay
      this.particles.push(new TrailParticle(
        x + offsetX,
        y + offsetY,
        this.color,
        this.duration,
        this.intensity,
        progress * (this.duration * 0.5) // Staggered delay
      ));
    }
  }

  update(): void {
    // Update all particles
    this.particles.forEach(particle => particle.update());
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Render all particles
    this.particles.forEach(particle => particle.render(ctx));
  }

  isFinished(): boolean {
    return performance.now() - this.startTime > this.duration * 1.5;
  }
}

/**
 * Individual particle in a trail
 */
class TrailParticle {
  private x: number;
  private y: number;
  private color: string;
  private duration: number;
  private startTime: number;
  private delay: number;
  private size: number;
  private intensity: number;

  constructor(
    x: number,
    y: number,
    color: string,
    duration: number,
    intensity: number,
    delay: number = 0
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.duration = duration;
    this.startTime = performance.now();
    this.delay = delay;
    this.size = 2 + Math.random() * 4 * intensity;
    this.intensity = intensity;
  }

  update(): void {
    // No position update needed
  }

  render(ctx: CanvasRenderingContext2D): void {
    const elapsed = performance.now() - this.startTime - this.delay;

    // Don't render if before delay
    if (elapsed < 0) return;

    const progress = Math.min(1, elapsed / this.duration);

    // Fade in and out
    const fadeInOut = Math.sin(progress * Math.PI);
    const alpha = fadeInOut * this.intensity;

    // Extract base color components
    const baseColor = this.color.replace(/rgba?\(/, '').replace(/\)/, '').split(',');
    const r = baseColor[0].trim();
    const g = baseColor[1].trim();
    const b = baseColor[2].trim();

    // Render particle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * fadeInOut, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fill();
  }
}

// Export a singleton instance
let enhancedRippleSystem: EnhancedRippleSystem | null = null;

export function initEnhancedRippleSystem(canvas: HTMLCanvasElement): EnhancedRippleSystem {
  if (enhancedRippleSystem) {
    enhancedRippleSystem.dispose();
  }

  enhancedRippleSystem = new EnhancedRippleSystem(canvas);
  return enhancedRippleSystem;
}

export function getEnhancedRippleSystem(): EnhancedRippleSystem | null {
  return enhancedRippleSystem;
}
