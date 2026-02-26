"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import * as THREE from "three";

/* ─── Three.js Particle Field ─── */
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!);
  const COUNT = 3000;

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const brandColors = [
      new THREE.Color("#465fff"), // brand-500
      new THREE.Color("#7592ff"), // brand-400
      new THREE.Color("#9cb9ff"), // brand-300
      new THREE.Color("#3641f5"), // brand-600
      new THREE.Color("#252dae"), // brand-800
    ];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      const c = brandColors[Math.floor(Math.random() * brandColors.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime * 0.08;
    pointsRef.current.rotation.y = t;
    pointsRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
      />
    </points>
  );
}

/* ─── Floating Connection Lines ─── */
function ConnectionLines() {
  const linesRef = useRef<THREE.LineSegments>(null!);
  const COUNT = 40;

  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      const ax = (Math.random() - 0.5) * 24;
      const ay = (Math.random() - 0.5) * 16;
      const az = (Math.random() - 0.5) * 10;
      const bx = ax + (Math.random() - 0.5) * 6;
      const by = ay + (Math.random() - 0.5) * 6;
      const bz = az + (Math.random() - 0.5) * 4;
      pts.push(ax, ay, az, bx, by, bz);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!linesRef.current) return;
    linesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#465fff" transparent opacity={0.12} />
    </lineSegments>
  );
}

/* ─── Hero Section ─── */
export default function HeroSection() {
  const [user, setUser] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(!!data.user));
  }, []);

  const ctaHref = user ? "/create" : "/signup";

  const words = ["Create Anything.", "Surpass Everything."];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950">
      {/* Three.js canvas background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.3} />
          <ParticleField />
          <ConnectionLines />
        </Canvas>
      </div>

      {/* Radial gradient glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(70,95,255,0.18),transparent)]" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 text-brand-400 text-sm font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          The AI Creation Platform
        </motion.div>

        {/* Headline */}
        <div className="mb-6">
          {words.map((word, i) => (
            <motion.h1
              key={i}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={`block text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-none tracking-tight ${
                i === 0 ? "text-white" : "text-brand-400"
              }`}
            >
              {word}
            </motion.h1>
          ))}
        </div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          ZYNTRIX is an AI-native creative engine. Pick a zone, answer a few questions,
          and watch your vision come to life — game, website, anime, SaaS, or video.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {mounted && (
            <Link
              href={ctaHref}
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-lg rounded-2xl 
                         shadow-[0_0_40px_rgba(70,95,255,0.5)] hover:shadow-[0_0_60px_rgba(70,95,255,0.7)] 
                         transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">Start Creating</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative z-10 text-xl"
              >
                →
              </motion.span>
              <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )}
          <Link
            href="#what-is-zyntrix"
            className="px-6 py-4 text-gray-400 hover:text-white font-medium transition-colors flex items-center gap-2"
          >
            Learn more
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500"
        >
          {["10,000+ Library Blocks", "15 Creative Zones", "AI-Powered Pipelines"].map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-brand-500" />
              {s}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 rounded-full bg-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
