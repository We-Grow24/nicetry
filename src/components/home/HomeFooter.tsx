"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const LINKS = {
  Zones: [
    { label: "Website", href: "/create?zone=website" },
    { label: "App", href: "/create?zone=app" },
    { label: "Game", href: "/game" },
    { label: "Marketplace", href: "/create?zone=marketplace" },
    { label: "SaaS", href: "/saas" },
    { label: "Video", href: "/video" },
    { label: "Anime", href: "/anime" },
  ],
  Platform: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "The Forge Gallery", href: "/gallery" },
    { label: "Library Blocks", href: "/create" },
    { label: "Pricing & Credits", href: "/credits" },
    { label: "Community", href: "/community" },
  ],
  Account: [
    { label: "Sign Up", href: "/signup" },
    { label: "Login", href: "/signin" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Profile", href: "/profile" },
    { label: "Support", href: "/support" },
  ],
  Company: [
    { label: "About ZYNTRIX", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ],
};

export default function HomeFooter() {
  return (
    <footer className="bg-gray-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <span className="text-white font-black text-sm">Z</span>
              </div>
              <span className="text-white font-black text-xl tracking-tight">
                ZYN<span className="text-brand-400">TRIX</span>
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              The AI-native creative engine for builders, storytellers, and entrepreneurs.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: "X", href: "https://x.com/zyntrix", label: "Twitter" },
                { icon: "in", href: "https://linkedin.com/company/zyntrix", label: "LinkedIn" },
                { icon: "gh", href: "https://github.com/zyntrix", label: "GitHub" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-brand-500/50 hover:bg-brand-500/10 transition-all text-xs font-bold"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-white font-bold text-sm mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} ZYNTRIX. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
