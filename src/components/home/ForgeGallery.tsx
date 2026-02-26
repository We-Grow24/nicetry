"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const TEMPLATES = [
  {
    id: 1,
    name: "Neon Samurai",
    zone: "Anime",
    icon: "⚔️",
    description: "Cyberpunk anime series bible with 12 characters, 3 arcs, and full world map.",
    price: 49,
    priceINR: 499,
    gradient: "from-rose-600 via-orange-500 to-amber-400",
    glow: "shadow-rose-500/40",
    badge: "🔥 Hot",
  },
  {
    id: 2,
    name: "SaaS Titan",
    zone: "SaaS",
    icon: "🚀",
    description: "B2B SaaS blueprint: feature matrix, pricing tiers, GTM strategy and tech stack.",
    price: 79,
    priceINR: 799,
    gradient: "from-brand-700 via-brand-500 to-brand-300",
    glow: "shadow-brand-500/40",
    badge: "⭐ Top Pick",
  },
  {
    id: 3,
    name: "Dungeon Forge",
    zone: "Game",
    icon: "🎲",
    description: "Fantasy RPG GDD: 5 character classes, procedural dungeons, and lore system.",
    price: 59,
    priceINR: 599,
    gradient: "from-purple-700 via-violet-500 to-indigo-400",
    glow: "shadow-purple-500/40",
    badge: "🔥 Trending",
  },
];

/* Fire particle CSS animation */
const fireKeyframes = `
@keyframes flicker1 { 0%,100%{transform:translateY(0) scaleX(1)} 25%{transform:translateY(-4px) scaleX(1.05)} 75%{transform:translateY(-2px) scaleX(0.96)} }
@keyframes flicker2 { 0%,100%{transform:translateY(0) scaleX(0.98)} 33%{transform:translateY(-6px) scaleX(1.08)} 66%{transform:translateY(-3px) scaleX(0.95)} }
`;

export default function ForgeGallery() {
  return (
    <section className="py-24 bg-gray-950 relative overflow-hidden">
      <style>{fireKeyframes}</style>

      {/* Background ember particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-orange-500/60"
            style={{
              left: `${10 + i * 7}%`,
              top: `${20 + (i % 4) * 18}%`,
              animation: `flicker${(i % 2) + 1} ${1.5 + (i % 3) * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm font-medium mb-4">
            🔥 The Forge
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Grab a proven template.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Battle-tested creative seeds, hand-curated by our top creators.
          </p>
        </motion.div>

        {/* Template cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {TEMPLATES.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`relative rounded-3xl border border-white/10 overflow-hidden bg-gray-900/80 shadow-2xl ${t.glow}`}
            >
              {/* Gradient top strip */}
              <div className={`h-2 bg-gradient-to-r ${t.gradient}`} />

              {/* Burning card header */}
              <div className={`relative h-36 bg-gradient-to-br ${t.gradient} opacity-15`} />
              <div className="absolute top-10 left-0 right-0 flex items-center justify-center">
                <span className="text-6xl" style={{ animation: "flicker1 2s ease-in-out infinite" }}>
                  {t.icon}
                </span>
              </div>

              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-bold text-white border border-white/10">
                  {t.badge}
                </span>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.zone}</span>
                </div>
                <h3 className="text-white font-black text-xl mb-2">{t.name}</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">{t.description}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-black text-lg">
                      <span className="text-gray-400 text-sm line-through mr-1">${t.price}</span>
                    </span>
                    <span className="text-brand-400 font-black text-lg ml-1">Free with credits</span>
                  </div>
                </div>
              </div>

              {/* Fire glow at bottom */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${t.gradient} opacity-60`} />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-semibold transition-all"
          >
            Browse all templates →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
