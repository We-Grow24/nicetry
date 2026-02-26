"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const ZONES = [
  { label: "Website", href: "/create?zone=website", icon: "🌐" },
  { label: "App", href: "/create?zone=app", icon: "📱" },
  { label: "Game", href: "/game", icon: "🎮" },
  { label: "Marketplace", href: "/create?zone=marketplace", icon: "🛒" },
  { label: "SaaS", href: "/saas", icon: "⚡" },
  { label: "Video", href: "/video", icon: "🎬" },
  { label: "Anime", href: "/anime", icon: "✨" },
];

export default function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-gray-950/95 backdrop-blur-xl border-b border-white/10 shadow-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/60 transition-shadow">
              <span className="text-white font-black text-sm">Z</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight">
              ZYN<span className="text-brand-400">TRIX</span>
            </span>
          </Link>

          {/* Center: Zone Dropdown */}
          <div className="hidden md:flex items-center gap-1" ref={dropdownRef}>
            <button
              onClick={() => setZoneOpen((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              Create A Zone
              <motion.svg
                animate={{ rotate: zoneOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>

            <AnimatePresence>
              {zoneOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-16 left-1/2 -translate-x-1/2 mt-1 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 grid grid-cols-2 gap-1"
                >
                  {ZONES.map((zone) => (
                    <Link
                      key={zone.label}
                      href={zone.href}
                      onClick={() => setZoneOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-brand-500/20 transition-all group"
                    >
                      <span className="text-lg">{zone.icon}</span>
                      <span className="text-sm font-medium">{zone.label}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {[
              { label: "Gallery", href: "/gallery" },
              { label: "Pricing", href: "/credits" },
              { label: "Community", href: "/community" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right: Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50"
              >
                <span>Dashboard</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-gray-950/98 backdrop-blur-xl border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {ZONES.map((zone) => (
                <Link
                  key={zone.label}
                  href={zone.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>{zone.icon}</span>
                  <span className="font-medium">{zone.label}</span>
                </Link>
              ))}
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {user ? (
                  <Link href="/dashboard" className="block px-4 py-2.5 bg-brand-500 text-white rounded-xl font-semibold text-center" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/signin" className="block px-4 py-2.5 text-gray-300 text-center" onClick={() => setMobileOpen(false)}>Login</Link>
                    <Link href="/signup" className="block px-4 py-2.5 bg-brand-500 text-white rounded-xl font-semibold text-center" onClick={() => setMobileOpen(false)}>Get Started</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
