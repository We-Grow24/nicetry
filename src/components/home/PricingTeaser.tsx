"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface PricingTier {
  name: string;
  credits: number;
  priceUSD: number;
  priceINR: number;
  popular?: boolean;
  features: string[];
}

const TIERS: PricingTier[] = [
  {
    name: "Starter",
    credits: 200,
    priceUSD: 5,
    priceINR: 199,
    features: ["200 generation credits", "All 7 zones", "Download exports", "Email support"],
  },
  {
    name: "Creator",
    credits: 1000,
    priceUSD: 19,
    priceINR: 799,
    popular: true,
    features: ["1,000 generation credits", "All 7 zones", "Priority queue", "Forge templates", "Chat support"],
  },
  {
    name: "Studio",
    credits: 5000,
    priceUSD: 79,
    priceINR: 2999,
    features: ["5,000 generation credits", "All 7 zones", "Priority queue", "Forge templates", "API access", "Dedicated support"],
  },
];

export default function PricingTeaser() {
  const [isINR, setIsINR] = useState(false);

  // Read GEO currency from cookie if set, or default to USD
  useEffect(() => {
    // Check if browser locale suggests India, or if a cookie is set
    const lang = navigator.language;
    setIsINR(lang === "en-IN" || Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Calcutta");
  }, []);

  return (
    <section className="py-24 bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_60%,rgba(70,95,255,0.07),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-4">
            Simple Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Credits that go further.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Pay for what you use. No subscriptions, no surprises.{" "}
            {isINR ? "Prices shown in INR for India." : "Prices shown in USD."}
          </p>

          {/* Currency toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm ${!isINR ? "text-white font-bold" : "text-gray-500"}`}>USD</span>
            <button
              onClick={() => setIsINR((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isINR ? "bg-brand-500" : "bg-gray-700"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isINR ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm ${isINR ? "text-white font-bold" : "text-gray-500"}`}>₹ INR</span>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-3xl p-6 border transition-all ${
                tier.popular
                  ? "bg-brand-500/10 border-brand-500/50 shadow-2xl shadow-brand-500/20 scale-105"
                  : "bg-gray-900/60 border-white/10 hover:border-white/20"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-500 rounded-full text-white text-xs font-black">
                  MOST POPULAR
                </div>
              )}

              <h3 className="text-white font-black text-xl mb-1">{tier.name}</h3>
              <div className="my-4">
                <span className="text-4xl font-black text-white">
                  {isINR ? `₹${tier.priceINR}` : `$${tier.priceUSD}`}
                </span>
                <span className="text-gray-500 ml-1 text-sm">one-time</span>
              </div>
              <div className="text-brand-400 font-bold text-lg mb-6">
                {tier.credits.toLocaleString()} Credits
              </div>

              <ul className="space-y-2.5 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/credits"
                className={`block text-center px-6 py-3 rounded-xl font-bold transition-all ${
                  tier.popular
                    ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                    : "border border-white/20 text-white hover:bg-white/5"
                }`}
              >
                Get {tier.name}
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/credits" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
            View full pricing details →
          </Link>
        </div>
      </div>
    </section>
  );
}
