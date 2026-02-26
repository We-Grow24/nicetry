"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const STEPS = [
  {
    num: "01",
    icon: "🎯",
    title: "Pick Your Zone",
    desc: "Choose from 7 creative zones: Website, App, Game, Marketplace, SaaS, Video, or Anime. Each zone has a specialized AI pipeline.",
    color: "brand",
    link: "/create",
    linkLabel: "Browse Zones",
  },
  {
    num: "02",
    icon: "💬",
    title: "Answer Questions",
    desc: "Our conversational AI asks the right questions to understand your vision — tone, audience, features, aesthetics. No prompts to write.",
    color: "violet",
    link: null,
    linkLabel: null,
  },
  {
    num: "03",
    icon: "✨",
    title: "Get Your Preview",
    desc: "Within seconds, receive a complete structured seed — characters, mechanics, UI flows, scripts — ready to refine and export.",
    color: "emerald",
    link: "/gallery",
    linkLabel: "See Examples",
  },
];

const colorMap: Record<string, string> = {
  brand: "border-brand-500 bg-brand-500/10 text-brand-400 shadow-brand-500/20",
  violet: "border-violet-500 bg-violet-500/10 text-violet-400 shadow-violet-500/20",
  emerald: "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/20",
};

const numColorMap: Record<string, string> = {
  brand: "text-brand-500",
  violet: "text-violet-500",
  emerald: "text-emerald-500",
};

export default function HowItWorks() {
  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(70,95,255,0.05),transparent)]" />

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
            How It Works
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Three steps. Then magic.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            No prompt engineering. No templates to tweak. Just answer questions and watch your creation take shape.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-brand-500/20 via-violet-500/20 to-emerald-500/20" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number */}
              <div className={`text-xs font-black tracking-widest mb-4 ${numColorMap[step.color]}`}>
                STEP {step.num}
              </div>

              {/* Icon circle */}
              <div className={`w-20 h-20 rounded-2xl border-2 ${colorMap[step.color]} flex items-center justify-center text-4xl mb-6 shadow-xl`}>
                {step.icon}
              </div>

              <h3 className="text-white font-black text-xl mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{step.desc}</p>

              {step.link && (
                <Link
                  href={step.link}
                  className={`text-sm font-semibold transition-colors ${numColorMap[step.color]} hover:underline`}
                >
                  {step.linkLabel} →
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-16"
        >
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all"
          >
            Try It Free
            <span className="text-lg">→</span>
          </Link>
          <p className="text-gray-500 text-sm mt-3">No credit card required to preview</p>
        </motion.div>
      </div>
    </section>
  );
}
