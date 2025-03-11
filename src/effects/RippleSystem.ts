export interface RippleOptions {
  duration: number;
  color: string;
  maxRadius: number;
  count: number;
}

export class RippleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ripples: Ripple[] = [];
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Start animation loop
    this.animate();

    // Resize handler
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  };

  createRipple(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options: Partial<RippleOptions> = {}
  ) {
    const defaultOptions: RippleOptions = {
      duration: 1000,
      color: 'rgba(100, 180, 255, 0.3)',
      maxRadius: 40,
      count: 3
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Create path ripples
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(3, Math.floor(distance / 100));

    for (let i = 0; i < finalOptions.count; i++) {
      // Stagger ripple creation
      setTimeout(() => {
        for (let j = 0; j <= steps; j++) {
          const x = startX + (dx * j / steps);
          const y = startY + (dy * j / steps);

          // Add some random variation
          const variance = 20;
          const varX = x + (Math.random() - 0.5) * variance;
          const varY = y + (Math.random() - 0.5) * variance;

          // Add ripple with delay based on position
          setTimeout(() => {
            this.ripples.push(new Ripple(
              varX,
              varY,
              finalOptions.maxRadius,
              finalOptions.duration,
              finalOptions.color
            ));
          }, j * (finalOptions.duration / steps));
        }
      }, i * 150);
    }
  }

  private animate = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and render ripples
    this.ripples = this.ripples.filter(ripple => {
      ripple.update();
      ripple.render(this.ctx);
      return !ripple.isFinished();
    });

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  dispose() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    window.removeEventListener('resize', this.handleResize);
    this.ripples = [];
  }
}

class Ripple {
  private x: number;
  private y: number;
  private radius: number;
  private maxRadius: number;
  private duration: number;
  private color: string;
  private startTime: number;

  constructor(x: number, y: number, maxRadius: number, duration: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.color = color;
    this.startTime = performance.now();
  }

  update() {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(1, elapsed / this.duration);

    // Easing function for smooth animation
    const easing = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

    this.radius = this.maxRadius * easing;
  }

  render(ctx: CanvasRenderingContext2D) {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(1, elapsed / this.duration);

    // Fade out as the ripple expands
    const alpha = 1 - progress;
    const colorWithAlpha = this.color.replace(/[\d.]+\)$/, `${alpha})`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha;
    ctx.fill();
  }

  isFinished(): boolean {
    return performance.now() - this.startTime > this.duration;
  }
}

// Export a singleton instance
let rippleSystem: RippleSystem | null = null;

export function initRippleSystem(canvas: HTMLCanvasElement): RippleSystem {
  if (rippleSystem) {
    rippleSystem.dispose();
  }

  rippleSystem = new RippleSystem(canvas);
  return rippleSystem;
}

export function getRippleSystem(): RippleSystem | null {
  return rippleSystem;
}
