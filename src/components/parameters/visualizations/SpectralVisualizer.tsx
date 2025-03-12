import React, { useEffect, useRef } from 'react';
import { SpectralParameter, Vector3D } from '../types/StochasticTypes';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface SpectralVisualizerProps {
  parameter: SpectralParameter;
  width?: number;
  height?: number;
  showAttractionFields?: boolean;
}

export const SpectralVisualizer: React.FC<SpectralVisualizerProps> = ({
  parameter,
  width = 400,
  height = 400,
  showAttractionFields = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const spectralLinesRef = useRef<THREE.LineSegments>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Setup camera and controls
    camera.position.z = 5;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Create spectral visualization
    const spectralLines = createSpectralVisualization(parameter);
    scene.add(spectralLines);

    // Add attraction/repulsion field visualization if enabled
    if (showAttractionFields) {
      const fields = createForceFields(parameter);
      scene.add(fields);
    }

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    spectralLinesRef.current = spectralLines;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      updateSpectralVisualization(parameter);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height, showAttractionFields]);

  // Update visualization when parameter changes
  useEffect(() => {
    if (!spectralLinesRef.current) return;
    updateSpectralVisualization(parameter);
  }, [parameter]);

  const createSpectralVisualization = (param: SpectralParameter): THREE.LineSegments => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(param.frequencies.length * 3);

    // Create vertices from frequency/amplitude data
    for (let i = 0; i < param.frequencies.length; i++) {
      const freq = param.frequencies[i];
      const amp = param.amplitudes[i];
      const phase = param.phases[i];

      vertices[i * 3] = freq / 1000; // Scale frequency to reasonable range
      vertices[i * 3 + 1] = amp;
      vertices[i * 3 + 2] = phase / (2 * Math.PI);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // Create connecting lines between frequency points
    const indices = [];
    for (let i = 0; i < param.frequencies.length - 1; i++) {
      indices.push(i, i + 1);
    }
    geometry.setIndex(indices);

    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2
    });

    return new THREE.LineSegments(geometry, material);
  };

  const createForceFields = (param: SpectralParameter) => {
    const group = new THREE.Group();

    // Visualize attraction fields
    param.envelope.attractions.forEach(attraction => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(attraction.radius, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x0000ff,
          transparent: true,
          opacity: 0.2
        })
      );
      sphere.position.set(
        attraction.position.x,
        attraction.position.y,
        attraction.position.z
      );
      group.add(sphere);
    });

    // Visualize repulsion fields
    param.envelope.repulsions.forEach(repulsion => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(repulsion.radius, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.2
        })
      );
      sphere.position.set(
        repulsion.position.x,
        repulsion.position.y,
        repulsion.position.z
      );
      group.add(sphere);
    });

    return group;
  };

  const updateSpectralVisualization = (param: SpectralParameter) => {
    if (!spectralLinesRef.current) return;

    const positions = spectralLinesRef.current.geometry.attributes.position.array as Float32Array;

    // Update vertex positions based on current spectral parameters
    for (let i = 0; i < param.frequencies.length; i++) {
      const freq = param.frequencies[i];
      const amp = param.amplitudes[i];
      const phase = param.phases[i];

      positions[i * 3] = freq / 1000;
      positions[i * 3 + 1] = amp;
      positions[i * 3 + 2] = phase / (2 * Math.PI);
    }

    spectralLinesRef.current.geometry.attributes.position.needsUpdate = true;
  };

  return <div ref={mountRef} style={{ width, height }} />;
};
