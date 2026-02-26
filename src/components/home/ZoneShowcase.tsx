"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const ZONES = [
  {
    id: "website",
    label: "Website",
    icon: "🌐",
    gradient: "from-blue-600 to-cyan-500",
    description: "Generate full landing pages, portfolios, and web apps with beautiful UI.",
    features: ["Landing Pages", "Portfolio Sites", "Web Apps", "E-commerce"],
    href: "/create?zone=website",
    preview: "bg-gradient-to-br from-blue-900 to-cyan-900",
  },
  {
    id: "game",
    label: "Game",
    icon: "🎮",
    gradient: "from-purple-600 to-pink-500",
    description: "Design game mechanics, worlds, characters and narrative systems.",
    features: ["Game Design Docs", "World Building", "Character Sheets", "Mechanics"],
    href: "/game",
    preview: "bg-gradient-to-br from-purple-900 to-pink-900",
  },
  {
    id: "anime",
    label: "Anime",
    icon: "✨",
    gradient: "from-rose-600 to-orange-500",
    description: "Create anime-style stories, character arcs, and scene storyboards.",
    features: ["Story Arcs", "Character Design", "Scene Boards", "Script"],
    href: "/anime",
    preview: "bg-gradient-to-br from-rose-900 to-orange-900",
  },
  {
    id: "saas",
    label: "SaaS",
    icon: "⚡",
    gradient: "from-brand-600 to-brand-400",
    description: "Architect your SaaS product — features, pricing, tech stack and roadmap.",
    features: ["Feature Mapping", "Pricing Strategy", "Tech Stack", "Roadmap"],
    href: "/saas",
    preview: "bg-gradient-to-br from-brand-900 to-brand-700",
  },
  {
    id: "video",
    label: "Video",
    icon: "🎬",
    gradient: "from-emerald-600 to-teal-500",
    description: "Script, direct, and plan video productions with AI collaboration.",
    features: ["Scripts", "Shot Lists", "Music Plans", "Voiceover"],
    href: "/video",
    preview: "bg-gradient-to-br from-emerald-900 to-teal-900",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: "🛒",
    gradient: "from-amber-600 to-yellow-500",
    description: "Design marketplace products, listings, categories and seller flows.",
    features: ["Product Listings", "Categories", "Seller Flow", "Pricing"],
    href: "/create?zone=marketplace",
    preview: "bg-gradient-to-br from-amber-900 to-yellow-900",
  },
  {
    id: "app",
    label: "App",
    icon: "📱",
    gradient: "from-indigo-600 to-violet-500",
    description: "Plan mobile or desktop apps with UX flows, components and user stories.",
    features: ["UX Flows", "Components", "User Stories", "API Design"],
    href: "/create?zone=app",
    preview: "bg-gradient-to-br from-indigo-900 to-violet-900",
  },
];

export default function ZoneShowcase() {
  const [active, setActive] = useState(0);
  const zone = ZONES[active];

  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-4">
            Creative Zones
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            What will you build?
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Select your zone and our AI pipelines take it from there.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Zone tabs */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:w-44 shrink-0">
            {ZONES.map((z, i) => (
              <button
                key={z.id}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  active === i
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-base">{z.icon}</span>
                {z.label}
              </button>
            ))}
          </div>

          {/* Preview card */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-white/10 overflow-hidden bg-gray-950/60"
              >
                {/* Visual preview */}
                <div className={`h-48 sm:h-64 ${zone.preview} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="text-8xl sm:text-9xl opacity-30"
                    >
                      {zone.icon}
                    </motion.span>
                  </div>
                  {/* Floating feature chips */}
                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                    {zone.features.map((f, i) => (
                      <motion.span
                        key={f}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="px-2.5 py-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white text-xs font-medium"
                      >
                        {f}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-black text-2xl">{zone.label} Zone</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${zone.gradient} text-white`}>
                      Active
                    </span>
                  </div>
                  <p className="text-gray-400 mb-6">{zone.description}</p>
                  <Link
                    href={zone.href}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${zone.gradient} hover:opacity-90 transition-opacity`}
                  >
                    Enter {zone.label} Zone
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
