"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const POSTS = [
  {
    id: 1,
    author: "Arjun M.",
    avatar: "🧑‍💻",
    zone: "Game",
    zoneColor: "text-purple-400 bg-purple-500/10",
    title: "Just shipped my first roguelike GDD using the Game Zone!",
    excerpt: "Used the dungeon mechanics seed as a base and added my own twist on the combat system. The wisdom agent caught 3 balance issues I completely missed.",
    likes: 142,
    comments: 28,
    time: "2h ago",
  },
  {
    id: 2,
    author: "Priya S.",
    avatar: "👩‍🎨",
    zone: "Anime",
    zoneColor: "text-rose-400 bg-rose-500/10",
    title: "My first anime series bible — 5 episodes planned, AI wrote the arc",
    excerpt: "The story planner agent connected all my character motivations into a coherent arc structure. Never thought I'd have a complete series bible in one afternoon.",
    likes: 89,
    comments: 15,
    time: "5h ago",
  },
  {
    id: 3,
    author: "Dev K.",
    avatar: "🚀",
    zone: "SaaS",
    zoneColor: "text-brand-400 bg-brand-500/10",
    title: "ZYNTRIX helped me validate my SaaS idea before writing a line of code",
    excerpt: "The architect agent mapped out every feature, found gaps in my pricing model, and suggested a freemium tier I hadn't considered. Saved me weeks.",
    likes: 201,
    comments: 44,
    time: "1d ago",
  },
];

export default function CommunityHighlights() {
  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4"
        >
          <div>
            <span className="inline-block px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-3">
              Community
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              What creators are building.
            </h2>
          </div>
          <Link
            href="/community"
            className="shrink-0 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:text-white hover:bg-white/5 font-medium text-sm transition-all"
          >
            View all posts →
          </Link>
        </motion.div>

        {/* Post cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {POSTS.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group p-6 rounded-2xl bg-gray-950/60 border border-white/5 hover:border-white/15 transition-all"
            >
              {/* Author */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                  {post.avatar}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{post.author}</p>
                  <p className="text-gray-500 text-xs">{post.time}</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${post.zoneColor}`}>
                  {post.zone}
                </span>
              </div>

              <h3 className="text-white font-bold mb-2 leading-snug group-hover:text-brand-300 transition-colors">
                {post.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
                {post.excerpt}
              </p>

              {/* Engagement */}
              <div className="flex items-center gap-4 text-gray-500 text-sm">
                <span className="flex items-center gap-1.5 hover:text-rose-400 cursor-pointer transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {post.likes}
                </span>
                <span className="flex items-center gap-1.5 hover:text-brand-400 cursor-pointer transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.comments}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
