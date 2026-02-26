"use client";

import React, { useState } from "react";
import type { AnimeCharacter, AnimeEpisode, LibraryItem } from "./types";
import { ANIME_LIBRARY_ITEMS } from "./types";

type TabId = "characters" | "library" | "episodes";

interface Props {
  characters:       AnimeCharacter[];
  episodes:         AnimeEpisode[];
  onNewCharacter:   () => void;
  onEditCharacter:  (char: AnimeCharacter) => void;
  onAddFromLibrary: (item: LibraryItem) => void;
  onLoadEpisode:    (ep: AnimeEpisode) => void;
  onNewEpisode:     () => void;
  onOpenPlanner:    () => void;
  seriesName:       string;
}

// ─── Character avatar thumbnail (seed-based gradient) ─────────────────────────
function CharAvatar({ seed, name }: { seed: number; name: string }) {
  const h = Math.floor(seed * 360);
  return (
    <div
      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
      style={{ background: `hsl(${h},70%,40%)` }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function AnimeLeftPanel({
  characters,
  episodes,
  onNewCharacter,
  onEditCharacter,
  onAddFromLibrary,
  onLoadEpisode,
  onNewEpisode,
  onOpenPlanner,
  seriesName,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("characters");

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "characters", label: "Characters", icon: "👤" },
    { id: "library",    label: "Library",    icon: "📚" },
    { id: "episodes",   label: "Episodes",   icon: "🎬" },
  ];

  return (
    <aside className="w-60 shrink-0 bg-gray-900 border-r border-white/10 flex flex-col overflow-hidden">
      {/* Series badge */}
      <div className="px-3 py-2 border-b border-white/10 bg-purple-900/30 shrink-0">
        <p className="text-[9px] uppercase tracking-widest text-purple-400 font-semibold">Series</p>
        <p className="text-xs text-white font-semibold truncate">{seriesName || "Untitled Series"}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-white/10 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            title={t.label}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] transition-colors
              ${activeTab === t.id
                ? "bg-purple-700/40 text-purple-300 border-b-2 border-purple-500"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span className="uppercase tracking-wide font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── CHARACTERS TAB ─────────────────────────────────────────────── */}
        {activeTab === "characters" && (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 shrink-0">
              <button
                onClick={onNewCharacter}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="text-base leading-none">＋</span>
                New Character
              </button>
            </div>

            {characters.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-xs">
                <div className="text-3xl mb-2">🎭</div>
                <p>No characters yet.</p>
                <p className="mt-1">Create your first character above.</p>
              </div>
            ) : (
              <ul className="px-2 pb-3 flex flex-col gap-1.5">
                {characters.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 transition-colors group"
                  >
                    <CharAvatar seed={c.face_seed} name={c.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{c.series_name}</p>
                    </div>
                    <button
                      onClick={() => onEditCharacter(c)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-400 transition-all text-xs p-1"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── LIBRARY TAB ────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div className="px-2 py-2 flex flex-col gap-1">
            {/* Group by type */}
            {(["background", "prop", "effect"] as const).map((section) => {
              const items = ANIME_LIBRARY_ITEMS.filter((i) => i.type === section);
              const labels: Record<string, string> = {
                background: "🌄 Backgrounds",
                prop:       "⚔️ Props",
                effect:     "✨ Effects",
              };
              return (
                <div key={section}>
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 px-1 mt-2 mb-1 font-semibold">
                    {labels[section]}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onAddFromLibrary(item)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-left transition-colors group"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
                      <span className="ml-auto text-gray-600 group-hover:text-gray-400 text-xs">＋</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── EPISODES TAB ───────────────────────────────────────────────── */}
        {activeTab === "episodes" && (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 flex flex-col gap-2 shrink-0">
              <button
                onClick={onNewEpisode}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="text-base leading-none">＋</span>
                New Episode
              </button>
              <button
                onClick={onOpenPlanner}
                className="w-full py-2 rounded-lg border border-purple-500/50 hover:bg-purple-500/10 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>🗺️</span>
                Open Planner
              </button>
            </div>

            {episodes.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-xs">
                <div className="text-3xl mb-2">📺</div>
                <p>No episodes yet.</p>
                <p className="mt-1">Create one to start planning.</p>
              </div>
            ) : (
              <ul className="px-2 pb-3 flex flex-col gap-1.5">
                {episodes.map((ep) => (
                  <li key={ep.id}>
                    <button
                      onClick={() => onLoadEpisode(ep)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 transition-colors text-left"
                    >
                      <span className="text-lg">🎞️</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{ep.title}</p>
                        <p className="text-[10px] text-gray-400">Episode {ep.episode_num}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
