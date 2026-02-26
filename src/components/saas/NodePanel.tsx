"use client";

import React from "react";
import { LOGIC_BLOCKS, CATEGORY_COLORS } from "./nodeConfig";

const CATEGORY_LABELS: Record<string, string> = {
  trigger: "Triggers",
  integration: "Integrations",
  database: "Database",
  communication: "Communication",
  payment: "Payments",
  ai: "AI",
  logic: "Logic",
};

export default function NodePanel() {
  const grouped = LOGIC_BLOCKS.reduce<Record<string, typeof LOGIC_BLOCKS>>(
    (acc, b) => {
      if (!acc[b.category]) acc[b.category] = [];
      acc[b.category].push(b);
      return acc;
    },
    {}
  );

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "#0d1117", borderRight: "1px solid #21262d" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#21262d]">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">
          Logic Blocks
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">Drag onto canvas</p>
      </div>

      {/* Block categories */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {Object.entries(grouped).map(([category, blocks]) => (
          <div key={category}>
            <p
              className="text-[9px] font-bold uppercase tracking-widest mb-1.5 px-1"
              style={{ color: CATEGORY_COLORS[category] ?? "#9ca3af" }}
            >
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="space-y-1.5">
              {blocks.map((block) => (
                <div
                  key={block.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, block.type)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-100 select-none group"
                  style={{ border: `1px solid ${block.color}33` }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      `${block.color}22`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                  }}
                >
                  <span className="text-base leading-none">{block.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate">
                      {block.label}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {block.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-[#21262d]">
        <p className="text-[10px] text-gray-600 text-center">
          ↑ Drag blocks to canvas
        </p>
      </div>
    </aside>
  );
}
