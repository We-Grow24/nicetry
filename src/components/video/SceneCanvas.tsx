"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject } from "./types";

// ─── Seed Shader ─────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float seed;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  vec3 seedColor(float s) {
    return vec3(
      hash(s * 127.1 + 1.0),
      hash(s * 311.7 + 2.0),
      hash(s * 74.70 + 3.0)
    );
  }

  void main() {
    vec3 base   = seedColor(seed);
    vec3 accent = seedColor(seed + 0.5);
    // Subtle noise pattern from UV + seed
    float n  = fract(sin(dot(vUv * 8.0 + seed, vec2(127.1, 311.7))) * 43758.55);
    vec3 col = mix(base, accent, n * 0.4);
    // Simple Lambertian lighting
    float diff = max(dot(vNormal, normalize(vec3(1.0, 2.0, 1.5))), 0.1);
    gl_FragColor = vec4(col * diff, 1.0);
  }
`;

// ─── Per-object seeded material ───────────────────────────────────────────────

function SeedMaterial({ seed, time }: { seed: number; time: number }) {
  const uniforms = useMemo(
    () => ({
      seed: { value: seed },
      time: { value: time },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  );

  useEffect(() => {
    uniforms.time.value = time;
  }, [time, uniforms]);

  return (
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
    />
  );
}

// ─── Single scene object mesh ─────────────────────────────────────────────────

interface SceneMeshProps {
  obj: SceneObject;
  selected: boolean;
  time: number;
  onSelect: (id: string) => void;
  meshRef: (el: THREE.Mesh | null) => void;
}

function SceneMesh({ obj, selected, time, onSelect, meshRef }: SceneMeshProps) {
  const hoverRef = useRef(false);

  const geometry = useMemo(() => {
    switch (obj.type) {
      case "character":
        return new THREE.CapsuleGeometry(0.4, 1.0, 8, 16);
      case "prop":
        return new THREE.BoxGeometry(0.8, 1.2, 0.4);
      case "background":
        return new THREE.SphereGeometry(0.7, 32, 32);
      case "light":
        return new THREE.OctahedronGeometry(0.5);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [obj.type]);

  return (
    <mesh
      ref={meshRef}
      position={[obj.position.x, obj.position.y, obj.position.z]}
      rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
      scale={[obj.scale, obj.scale, obj.scale]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hoverRef.current = true;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hoverRef.current = false;
        document.body.style.cursor = "default";
      }}
      geometry={geometry}
    >
      <SeedMaterial seed={obj.seed} time={time} />
      {/* Selection outline */}
      {selected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#6366f1" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}

// ─── Scene label ─────────────────────────────────────────────────────────────

function ObjectLabel({ obj }: { obj: SceneObject }) {
  return (
    <Text
      position={[obj.position.x, obj.position.y + 1.2 * obj.scale + 0.3, obj.position.z]}
      fontSize={0.18}
      color="#a5b4fc"
      anchorX="center"
      anchorY="bottom"
    >
      {obj.name}
    </Text>
  );
}

// ─── Camera animation driven by timeline playhead ────────────────────────────

function CameraTrack({ playhead }: { playhead: number }) {
  const { camera } = useThree();
  useFrame(() => {
    const angle = playhead * Math.PI * 2;
    camera.position.x = Math.sin(angle) * 8;
    camera.position.z = Math.cos(angle) * 8;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Scene contents ───────────────────────────────────────────────────────────

interface SceneContentsProps {
  objects: SceneObject[];
  selectedId: string | null;
  playhead: number;
  onSelect: (id: string) => void;
  meshRefs: React.MutableRefObject<Record<string, THREE.Mesh | null>>;
  orbitEnabled: boolean;
}

function SceneContents({
  objects,
  selectedId,
  playhead,
  onSelect,
  meshRefs,
  orbitEnabled,
}: SceneContentsProps) {
  const clockRef = useRef(0);

  useFrame((_, delta) => {
    clockRef.current += delta;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-4, 3, -4]} intensity={0.6} color="#6366f1" />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#374151"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4b5563"
        fadeDistance={30}
        position={[0, -0.01, 0]}
      />

      <Environment preset="night" />

      {/* Camera orbit during playback */}
      <CameraTrack playhead={playhead} />

      {objects.map((obj) => (
          <group key={obj.id}>
            <SceneMesh
              obj={obj}
              selected={selectedId === obj.id}
              time={clockRef.current}
              onSelect={onSelect}
              meshRef={(el) => {
                meshRefs.current[obj.id] = el;
              }}
            />
            <ObjectLabel obj={obj} />
          </group>
        )
      )}

      <OrbitControls enabled={orbitEnabled} makeDefault />
    </>
  );
}

// ─── Public canvas component ──────────────────────────────────────────────────

export interface SceneCanvasProps {
  objects: SceneObject[];
  selectedId: string | null;
  playhead: number;
  onSelect: (id: string | null) => void;
  meshRefs: React.MutableRefObject<Record<string, THREE.Mesh | null>>;
}

export default function SceneCanvas({
  objects,
  selectedId,
  playhead,
  onSelect,
  meshRefs,
}: SceneCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 8], fov: 50 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      className="w-full h-full"
      onClick={(e) => {
        // Click on empty canvas → deselect
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <SceneContents
        objects={objects}
        selectedId={selectedId}
        playhead={playhead}
        onSelect={onSelect}
        meshRefs={meshRefs}
        orbitEnabled={selectedId === null}
      />
    </Canvas>
  );
}
