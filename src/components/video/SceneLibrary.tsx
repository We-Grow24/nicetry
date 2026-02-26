"use client";

import React from "react";
import type { ObjectType } from "./types";

interface LibraryItem {
  id: string;
  label: string;
  type: ObjectType;
  icon: string;
  seed: number;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  // Characters
  { id: "char_hero",    label: "Hero",       type: "character",  icon: "🧑",  seed: 0.12 },
  { id: "char_villain", label: "Villain",    type: "character",  icon: "🦹",  seed: 0.47 },
  { id: "char_npc",     label: "NPC Crowd",  type: "character",  icon: "👥",  seed: 0.63 },
  // Props
  { id: "prop_bottle",  label: "Product Bottle", type: "prop",   icon: "🧴",  seed: 0.22 },
  { id: "prop_car",     label: "Car",       type: "prop",        icon: "🚗",  seed: 0.38 },
  { id: "prop_tree",    label: "Tree",      type: "prop",        icon: "🌲",  seed: 0.55 },
  { id: "prop_box",     label: "Box",       type: "prop",        icon: "📦",  seed: 0.71 },
  // Backgrounds
  { id: "bg_city",      label: "City",      type: "background",  icon: "🏙",  seed: 0.18 },
  { id: "bg_forest",    label: "Forest",    type: "background",  icon: "🌳",  seed: 0.34 },
  { id: "bg_studio",    label: "Studio",    type: "background",  icon: "🎬",  seed: 0.89 },
  // Lights
  { id: "light_sun",    label: "Sunlight",  type: "light",       icon: "☀️",  seed: 0.05 },
  { id: "light_neon",   label: "Neon",      type: "light",       icon: "💡",  seed: 0.92 },
];

const SECTION_ORDER: ObjectType[] = ["character", "prop", "background", "light"];
const SECTION_LABELS: Record<ObjectType, string> = {
  character:  "Characters",
  prop:       "Props",
  background: "Backgrounds",
  light:      "Lights",
};

interface Props {
  onAdd: (item: LibraryItem) => void;
}

export default function SceneLibrary({ onAdd }: Props) {
  return (
    <aside className="w-48 shrink-0 bg-gray-900 border-r border-white/10 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/10 bg-gray-800/60 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Scene Library
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {SECTION_ORDER.map((type) => {
          const items = LIBRARY_ITEMS.filter((i) => i.type === type);
          return (
            <div key={type} className="mb-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 px-3 py-1.5 bg-gray-800/30 sticky top-0">
                {SECTION_LABELS[type]}
              </p>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onAdd(item)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-600/20 active:bg-indigo-600/40 transition-colors border-b border-white/5 group"
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 group-hover:text-white truncate">
                      {item.label}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono">
                      seed {item.seed.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-gray-600 group-hover:text-indigo-400 text-sm leading-none">+</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export type { LibraryItem };
