import * as THREE from 'three';

export class VisualizationTools {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public initialize(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;
  }

  public createWaveform(audioData: Float32Array): void {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(audioData.length * 3);

    for (let i = 0; i < audioData.length; i++) {
      vertices[i * 3] = (i / audioData.length) * 2 - 1; // x
      vertices[i * 3 + 1] = audioData[i]; // y
      vertices[i * 3 + 2] = 0; // z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const waveform = new THREE.Line(geometry, material);

    this.scene.clear();
    this.scene.add(waveform);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

export default VisualizationTools;
