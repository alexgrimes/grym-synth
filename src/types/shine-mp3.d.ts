declare module 'shine-mp3' {
  interface ShineOptions {
    sampleRate: number;
    channels: number;
    bitrate?: number;
  }

  class Shine {
    constructor(options: ShineOptions);
    encode(samples: Float32Array[]): Uint8Array;
    flush(): Uint8Array | null;
  }

  export default Shine;
}
