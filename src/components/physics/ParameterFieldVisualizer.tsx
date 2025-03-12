import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Vector3D } from '../parameters/types/StochasticTypes';

interface ParameterField {
  position: Vector3D;
  strength: number;
  radius: number;
  decay: number;
  timestamp: number;
}

interface ParameterFieldVisualizerProps {
  fields: ParameterField[];
  parameters: {
    position: Vector3D;
    id: string;
  }[];
  width?: number;
  height?: number;
  showVectors?: boolean;
}

// Shader code for field visualization
const fieldVertexShader = `
  varying vec3 vPosition;
  varying float vStrength;

  void main() {
    vPosition = position;
    vStrength = float(instanceMatrix[3][3]);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fieldFragmentShader = `
  varying vec3 vPosition;
  varying float vStrength;

  void main() {
    float intensity = vStrength * (1.0 - length(vPosition));
    vec3 color = mix(
      vec3(0.0, 0.5, 1.0),  // Cold blue
      vec3(1.0, 0.2, 0.0),  // Hot red
      intensity
    );
    gl_FragColor = vec4(color, intensity * 0.7);
  }
`;

export const ParameterFieldVisualizer: React.FC<ParameterFieldVisualizerProps> = ({
  fields,
  parameters,
  width = 800,
  height = 600,
  showVectors = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const fieldInstancesRef = useRef<THREE.InstancedMesh>();
  const parameterPointsRef = useRef<THREE.Points>();

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Create field instances
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const fieldMaterial = new THREE.ShaderMaterial({
      vertexShader: fieldVertexShader,
      fragmentShader: fieldFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    const fieldInstances = new THREE.InstancedMesh(
      sphereGeometry,
      fieldMaterial,
      100 // Maximum number of fields
    );
    scene.add(fieldInstances);
    fieldInstancesRef.current = fieldInstances;

    // Create parameter points
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsMaterial = new THREE.PointsMaterial({
      size: 5,
      sizeAttenuation: false,
      vertexColors: true
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);
    parameterPointsRef.current = points;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [width, height]);

  // Update field instances
  useEffect(() => {
    if (!fieldInstancesRef.current) return;

    const matrix = new THREE.Matrix4();
    fields.forEach((field, i) => {
      matrix.makeScale(field.radius, field.radius, field.radius);
      matrix.setPosition(field.position.x, field.position.y, field.position.z);
      fieldInstancesRef.current?.setMatrixAt(i, matrix);
      fieldInstancesRef.current?.setColorAt?.(
        i,
        new THREE.Color(field.strength, 0.5, 1.0 - field.strength)
      );
    });

    fieldInstancesRef.current.count = fields.length;
    fieldInstancesRef.current.instanceMatrix.needsUpdate = true;
    if (fieldInstancesRef.current.instanceColor) {
      fieldInstancesRef.current.instanceColor.needsUpdate = true;
    }
  }, [fields]);

  // Update parameter points
  useEffect(() => {
    if (!parameterPointsRef.current) return;

    const positions = new Float32Array(parameters.length * 3);
    const colors = new Float32Array(parameters.length * 3);

    parameters.forEach((param, i) => {
      positions[i * 3] = param.position.x;
      positions[i * 3 + 1] = param.position.y;
      positions[i * 3 + 2] = param.position.z;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
    });

    parameterPointsRef.current.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    parameterPointsRef.current.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );
  }, [parameters]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative'
      }}
    >
      <div className="stats">
        <div>Fields: {fields.length}</div>
        <div>Parameters: {parameters.length}</div>
      </div>
      <style jsx>{`
        .stats {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default ParameterFieldVisualizer;
