"use client";

/* 
  Lazy-loaded by CharacterCreatorModal.
  Renders a live Three.js character preview that updates as seed sliders change.
*/

import React, { useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { CharacterSeeds } from "./types";

// ─── Cel-shade shader (same as scene canvas, character focused) ───────────────
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float faceSeed;
  uniform float bodySeed;
  uniform float costumeSeed;
  uniform float powerSeed;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  vec3 seedHue(float s) {
    float h = hash(s * 127.1);
    float sat = 0.65 + hash(s * 311.7) * 0.35;
    vec3 c = clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
    return 0.5 * mix(vec3(1.0), c, sat) + 0.4;
  }

  void main() {
    float isBody    = step(0.0, vUv.y) * step(vUv.y, 0.5);
    float isCostume = step(0.5, vUv.y) * step(vUv.y, 0.85);
    float isFace    = step(0.85, vUv.y);

    vec3 base = seedHue(faceSeed) * isFace
              + seedHue(costumeSeed) * isCostume
              + seedHue(bodySeed) * isBody;

    // Toon bands
    float diff = dot(vNormal, normalize(vec3(1.5, 2.0, 1.0)));
    float band = diff > 0.5 ? 1.0 : diff > 0.0 ? 0.6 : 0.3;
    vec3 color = base * band;

    // Power aura rim
    float rim = 1.0 - max(dot(vNormal, normalize(-vViewPos)), 0.0);
    rim = pow(rim, 4.0);
    vec3 aura = seedHue(powerSeed + 0.5) * 1.5;
    float pulse = 0.4 + 0.4 * sin(time * 3.0);
    color += aura * rim * pulse * 0.6;

    // Outline
    if (rim > 0.85) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Animated character mesh ──────────────────────────────────────────────────
interface CharMeshProps {
  seeds: CharacterSeeds;
}

function CharMesh({ seeds }: CharMeshProps) {
  const uniforms = useMemo(() => ({
    faceSeed:    { value: seeds.face_seed    },
    bodySeed:    { value: seeds.body_seed    },
    costumeSeed: { value: seeds.costume_seed },
    powerSeed:   { value: seeds.power_seed   },
    time:        { value: 0                  },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live-update uniforms when seeds change (without remounting)
  useEffect(() => {
    uniforms.faceSeed.value    = seeds.face_seed;
    uniforms.bodySeed.value    = seeds.body_seed;
    uniforms.costumeSeed.value = seeds.costume_seed;
    uniforms.powerSeed.value   = seeds.power_seed;
  }, [seeds, uniforms]);

  useFrame(({ clock }) => { uniforms.time.value = clock.elapsedTime; });

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.45, 1.2, 12, 24]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.65, 0.15, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.15, 0.65, 8, 12]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.65, 0.15, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.15, 0.65, 8, 12]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

// ─── Exported canvas ──────────────────────────────────────────────────────────
interface Props {
  seeds: CharacterSeeds;
  name:  string;
}

export default function CharPreviewCanvas({ seeds, name }: Props) {
  const h = Math.floor(seeds.face_seed * 360);
  return (
    <Canvas
      camera={{ position: [0, 0.5, 4], fov: 45 }}
      style={{ background: `radial-gradient(ellipse at center, hsl(${h},40%,10%) 0%, #0a0a14 100%)` }}
    >
      <ambientLight intensity={0.5} color="#9b59b6" />
      <directionalLight position={[3, 5, 3]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-3, 2, -2]} intensity={0.8} color={`hsl(${h},70%,60%)`} />

      <CharMesh seeds={seeds} />

      {/* Character name label rendered via DOM overlay (avoid Text font issues) */}
      <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
      <Environment preset="night" />
    </Canvas>
  );
}
