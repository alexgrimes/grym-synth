declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    WebGLRenderingContext: typeof WebGLRenderingContext;
  }

  var performance: Performance;
}

declare module NodeJS {
  interface Global {
    AudioContext: typeof AudioContext;
    WebGLRenderingContext: any;
    performance: Performance;
    requestAnimationFrame: (callback: FrameRequestCallback) => number;
    cancelAnimationFrame: (handle: number) => void;
    ResizeObserver: typeof ResizeObserver;
    IntersectionObserver: typeof IntersectionObserver;
    URL: typeof URL;
  }
}

export {};
