"use client";

import React from "react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "🧠",
    title: "AI-Powered Pipelines",
    desc: "Multi-agent orchestration turns your ideas into structured creative seeds in seconds.",
  },
  {
    icon: "🏗️",
    title: "Zone Architecture",
    desc: "Every creation lives in a typed zone — Game, Anime, SaaS, Video, Website, App, or Marketplace.",
  },
  {
    icon: "📚",
    title: "10,000+ Library Blocks",
    desc: "Pre-built characters, mechanics, UI kits, music plans and scenes ready to fuse.",
  },
  {
    icon: "⚖️",
    title: "Wisdom Engine",
    desc: "Quality rules and auto-fix agents review every output before it reaches you.",
  },
  {
    icon: "🎨",
    title: "Visual Forge",
    desc: "Drag-and-drop builder with real-time preview — no code required.",
  },
  {
    icon: "🌍",
    title: "GEO-Smart Pricing",
    desc: "India pays in INR, everyone else in USD. Fair, transparent, no currency tricks.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function WhatIsZyntrix() {
  return (
    <section id="what-is-zyntrix" className="py-24 bg-gray-950 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(70,95,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(70,95,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-4">
            What is ZYNTRIX?
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            One platform. Every creative zone.
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            ZYNTRIX is an AI-native creation studio. In under 30 seconds, describe what 
            you want to build — our multi-agent pipeline handles the rest.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group relative p-6 rounded-2xl bg-gray-900/60 border border-white/5 hover:border-brand-500/30 hover:bg-gray-900/80 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-2xl mb-4 group-hover:bg-brand-500/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_50%,rgba(70,95,255,0.06),transparent)] transition-opacity" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
