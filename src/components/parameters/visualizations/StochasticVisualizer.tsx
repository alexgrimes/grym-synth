import React, { useEffect, useRef } from 'react';
import { StochasticParameter, Vector3D } from '../types/StochasticTypes';
import * as THREE from 'three';

interface StochasticVisualizerProps {
  parameter: StochasticParameter;
  width?: number;
  height?: number;
  showForceFields?: boolean;
}

export const StochasticVisualizer: React.FC<StochasticVisualizerProps> = ({
  parameter,
  width = 400,
  height = 400,
  showForceFields = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const particleSystemRef = useRef<THREE.Points>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Setup camera
    camera.position.z = 5;

    // Create particle system for distribution visualization
    const particles = createParticleSystem(parameter);
    scene.add(particles);

    // Add force field visualization if enabled
    if (showForceFields) {
      const forceFields = createForceFields(parameter);
      scene.add(forceFields);
    }

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    particleSystemRef.current = particles;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      updateParticles(parameter);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height, showForceFields]);

  // Update visualization when parameter changes
  useEffect(() => {
    if (!particleSystemRef.current) return;
    updateParticles(parameter);
  }, [parameter]);

  const createParticleSystem = (param: StochasticParameter) => {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    // Generate initial particle positions based on distribution
    for (let i = 0; i < particleCount; i++) {
      const vector = generatePointFromDistribution(param);
      positions[i * 3] = vector.x;
      positions[i * 3 + 1] = vector.y;
      positions[i * 3 + 2] = vector.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7
    });

    return new THREE.Points(geometry, material);
  };

  const createForceFields = (param: StochasticParameter) => {
    const group = new THREE.Group();

    // Add elastic barrier visualization
    const { barriers } = param;
    const barrierGeometry = new THREE.BoxGeometry(
      barriers.max - barriers.min,
      barriers.max - barriers.min,
      barriers.max - barriers.min
    );
    const barrierMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });
    const barrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
    group.add(barrierMesh);

    return group;
  };

  const updateParticles = (param: StochasticParameter) => {
    if (!particleSystemRef.current) return;

    const positions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
    const particleCount = positions.length / 3;

    // Update particle positions based on distribution and forces
    for (let i = 0; i < particleCount; i++) {
      const vector = generatePointFromDistribution(param);
      positions[i * 3] = vector.x;
      positions[i * 3 + 1] = vector.y;
      positions[i * 3 + 2] = vector.z;
    }

    particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
  };

  const generatePointFromDistribution = (param: StochasticParameter): Vector3D => {
    let value: Vector3D;

    switch (param.distribution) {
      case 'poisson':
        value = generatePoissonPoint(param.lambda);
        break;
      case 'cauchy':
        value = generateCauchyPoint();
        break;
      case 'logistic':
        value = generateLogisticPoint();
        break;
      default:
        value = { x: 0, y: 0, z: 0 };
    }

    // Apply elastic barriers
    return applyElasticBarriers(value, param.barriers);
  };

  const generatePoissonPoint = (lambda: number): Vector3D => {
    // Use Box-Muller transform for Poisson approximation
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * v;
    const r = Math.sqrt(-2 * Math.log(u));

    return {
      x: r * Math.cos(theta) * lambda,
      y: r * Math.sin(theta) * lambda,
      z: (Math.random() - 0.5) * lambda
    };
  };

  const generateCauchyPoint = (): Vector3D => {
    // Generate Cauchy distributed point
    const u = Math.random();
    const v = Math.random();
    return {
      x: Math.tan(Math.PI * (u - 0.5)),
      y: Math.tan(Math.PI * (v - 0.5)),
      z: Math.tan(Math.PI * (Math.random() - 0.5))
    };
  };

  const generateLogisticPoint = (): Vector3D => {
    // Generate logistically distributed point
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();
    return {
      x: Math.log(u1 / (1 - u1)),
      y: Math.log(u2 / (1 - u2)),
      z: Math.log(u3 / (1 - u3))
    };
  };

  const applyElasticBarriers = (point: Vector3D, barriers: StochasticParameter['barriers']): Vector3D => {
    const applyBarrier = (value: number) => {
      if (value < barriers.min) {
        return barriers.min + (barriers.min - value) * barriers.stiffness;
      }
      if (value > barriers.max) {
        return barriers.max - (value - barriers.max) * barriers.stiffness;
      }
      return value;
    };

    return {
      x: applyBarrier(point.x),
      y: applyBarrier(point.y),
      z: applyBarrier(point.z)
    };
  };

  return <div ref={mountRef} style={{ width, height }} />;
};
