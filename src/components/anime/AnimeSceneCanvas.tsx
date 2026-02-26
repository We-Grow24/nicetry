"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import type { AnimeSceneObject } from "./types";

// ─── Anime-style seed shader ──────────────────────────────────────────────────
// Uses cel-shading (toon) + bold outlines + vivid palette from seed

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float seed;
  uniform float time;
  uniform float selected;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  vec3 animeColor(float s) {
    // Vivid anime palette
    float h = hash(s * 127.1);
    float sat = 0.7 + hash(s * 311.7) * 0.3;
    float val = 0.7 + hash(s * 74.70) * 0.3;
    // HSV to RGB
    vec3 c = clamp(abs(mod(h*6.0+vec3(0,4,2), 6.0)-3.0)-1.0, 0.0, 1.0);
    return val * mix(vec3(1.0), c, sat);
  }

  void main() {
    vec3 base   = animeColor(seed);
    vec3 shadow = base * 0.4;
    vec3 light  = vec3(1.0, 0.95, 0.85);

    // Cel-shading bands
    float diff = dot(vNormal, normalize(vec3(1.5, 2.0, 1.0)));
    float band = diff > 0.5 ? 1.0 : diff > 0.0 ? 0.6 : 0.3;
    vec3 color = mix(shadow, base * light, band);

    // Outline (rim)
    float rim = 1.0 - max(dot(vNormal, normalize(-vPosition)), 0.0);
    rim = pow(rim, 3.0);
    color = mix(color, vec3(0.0), rim * 0.6);

    // Anime highlight
    float spec = pow(max(dot(reflect(-normalize(vec3(1.5,2,1)), vNormal), normalize(-vPosition)), 0.0), 16.0);
    color += vec3(1.0) * spec * 0.5;

    // Selection glow
    if (selected > 0.5) {
      float pulse = 0.5 + 0.5 * sin(time * 4.0);
      color = mix(color, vec3(1.0, 0.85, 0.0), 0.3 * pulse);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Per-object seeded material ───────────────────────────────────────────────
function SeedMaterial({ seed, selected, time }: { seed: number; selected: boolean; time: number }) {
  const uniforms = useMemo(() => ({
    seed:     { value: seed },
    time:     { value: time },
    selected: { value: selected ? 1.0 : 0.0 },
  }), [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    uniforms.time.value     = time;
    uniforms.selected.value = selected ? 1.0 : 0.0;
  }, [time, selected, uniforms]);

  return (
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
    />
  );
}

// ─── Scene clock (drives shader time uniform) ─────────────────────────────────
function SceneClock({ onTick }: { onTick: (t: number) => void }) {
  useFrame(({ clock }) => onTick(clock.elapsedTime));
  return null;
}

// ─── Single anime object mesh ─────────────────────────────────────────────────
interface SceneMeshProps {
  obj:      AnimeSceneObject;
  selected: boolean;
  time:     number;
  onSelect: (id: string) => void;
  meshRef:  (el: THREE.Mesh | null) => void;
}

function SceneMesh({ obj, selected, time, onSelect, meshRef }: SceneMeshProps) {
  const geometry = useMemo(() => {
    switch (obj.type) {
      case "character": return new THREE.CapsuleGeometry(0.4, 1.1, 8, 16);
      case "background": return new THREE.SphereGeometry(0.8, 32, 32);
      case "prop":       return new THREE.BoxGeometry(0.7, 1.0, 0.35);
      case "effect":     return new THREE.OctahedronGeometry(0.5, 2);
      case "light":      return new THREE.TetrahedronGeometry(0.5);
      default:           return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [obj.type]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[obj.position.x, obj.position.y, obj.position.z]}
        rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
        scale={[obj.scale, obj.scale, obj.scale]}
        onClick={(e) => { e.stopPropagation(); onSelect(obj.id); }}
        onPointerOver={() => document.body.style.cursor = "pointer"}
        onPointerOut={() => document.body.style.cursor = "default"}
      >
        <primitive object={geometry} />
        <SeedMaterial seed={obj.seed} selected={selected} time={time} />
      </mesh>
      {/* Label */}
      <Text
        position={[obj.position.x, obj.position.y + 1.2 * obj.scale, obj.position.z]}
        fontSize={0.18}
        color={selected ? "#fbbf24" : "#e2e8f0"}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {obj.name}
      </Text>
    </group>
  );
}

// ─── Camera auto-fit ─────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ─── Main scene ───────────────────────────────────────────────────────────────
interface AnimeSceneCanvasProps {
  objects:    AnimeSceneObject[];
  selectedId: string | null;
  onSelect:   (id: string | null) => void;
  meshRefs:   React.MutableRefObject<Record<string, THREE.Mesh | null>>;
}

export default function AnimeSceneCanvas({ objects, selectedId, onSelect, meshRefs }: AnimeSceneCanvasProps) {
  const [time, setTime] = React.useState(0);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 3, 8], fov: 45 }}
      style={{ background: "linear-gradient(180deg, #0f0c29 0%, #1a0533 50%, #24243e 100%)" }}
      onClick={() => onSelect(null)}
    >
      <SceneClock onTick={setTime} />
      <CameraRig />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#9b59b6" />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" castShadow />
      <pointLight position={[-5, 3, -3]} intensity={0.8} color="#3498db" />
      <pointLight position={[3, 1, 4]} intensity={0.6} color="#e74c3c" />

      {/* Ground grid */}
      <Grid
        infiniteGrid
        cellSize={1}
        cellThickness={0.3}
        sectionSize={5}
        sectionThickness={0.8}
        cellColor="#2d1b69"
        sectionColor="#6b21a8"
        fadeDistance={25}
        fadeStrength={2}
        followCamera={false}
      />

      {/* Scene objects */}
      {objects.map((obj) => (
        <SceneMesh
          key={obj.id}
          obj={obj}
          selected={obj.id === selectedId}
          time={time}
          onSelect={onSelect}
          meshRef={(el) => { meshRefs.current[obj.id] = el; }}
        />
      ))}

      <OrbitControls makeDefault enablePan enableZoom enableRotate />
      <Environment preset="night" />
    </Canvas>
  );
}
