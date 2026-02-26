"use client";

import React from "react";
import type { AnimeSceneObject } from "./types";

interface Props {
  obj:      AnimeSceneObject | null;
  onChange: (id: string, patch: Partial<AnimeSceneObject>) => void;
}

function NumInput({ label, value, step, onChange }: {
  label: string; value: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-5 shrink-0">{label}</span>
      <input
        type="number"
        value={value.toFixed(2)}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500 text-right"
      />
    </div>
  );
}

function SeedSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const h = Math.floor(value * 360);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-16 shrink-0">{label}</span>
      <input
        type="range" min={0} max={1} step={0.001}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 cursor-pointer"
        style={{ accentColor: `hsl(${h},70%,55%)` }}
      />
      <span className="text-[10px] font-mono text-gray-500 w-8 text-right shrink-0">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

const EXPRESSIONS = ["neutral", "happy", "angry", "sad", "battle"] as const;

export default function AnimeInspectorPanel({ obj, onChange }: Props) {
  if (!obj) {
    return (
      <aside className="w-52 shrink-0 bg-gray-900 border-l border-white/10 flex flex-col items-center justify-center text-gray-600 text-xs text-center px-4">
        <div className="text-4xl mb-3">🎯</div>
        <p>Click an object in the scene to inspect it.</p>
      </aside>
    );
  }

  const { id, position: pos, rotation: rot, scale, seed } = obj;

  return (
    <aside className="w-52 shrink-0 bg-gray-900 border-l border-white/10 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/10 bg-gray-800/60 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Inspector</p>
        <p className="text-xs text-white font-bold truncate mt-0.5">{obj.name}</p>
        <p className="text-[10px] text-gray-500 capitalize">{obj.type}</p>
      </div>

      <div className="px-3 py-3 flex flex-col gap-4">
        {/* Seed visual */}
        <div
          className="h-8 rounded-md"
          style={{ background: `hsl(${Math.floor(seed*360)},60%,30%)` }}
        />

        {/* Seed slider */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Appearance Seed</p>
          <SeedSlider label="Seed" value={seed} onChange={(v) => onChange(id, { seed: v })} />
        </div>

        {/* Expression (character only) */}
        {obj.type === "character" && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Expression</p>
            <div className="flex flex-wrap gap-1">
              {EXPRESSIONS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => onChange(id, { expression: ex } as Partial<AnimeSceneObject>)}
                  className={`px-2 py-1 rounded text-[10px] font-medium capitalize transition-colors
                    ${(obj as AnimeSceneObject & { expression?: string }).expression === ex
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Position */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Position</p>
          <div className="flex flex-col gap-1.5">
            <NumInput label="X" value={pos.x} step={0.1} onChange={(v) => onChange(id, { position: { ...pos, x: v } })} />
            <NumInput label="Y" value={pos.y} step={0.1} onChange={(v) => onChange(id, { position: { ...pos, y: v } })} />
            <NumInput label="Z" value={pos.z} step={0.1} onChange={(v) => onChange(id, { position: { ...pos, z: v } })} />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Rotation (rad)</p>
          <div className="flex flex-col gap-1.5">
            <NumInput label="X" value={rot.x} step={0.05} onChange={(v) => onChange(id, { rotation: { ...rot, x: v } })} />
            <NumInput label="Y" value={rot.y} step={0.05} onChange={(v) => onChange(id, { rotation: { ...rot, y: v } })} />
            <NumInput label="Z" value={rot.z} step={0.05} onChange={(v) => onChange(id, { rotation: { ...rot, z: v } })} />
          </div>
        </div>

        {/* Scale */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Scale</p>
          <input
            type="range" min={0.1} max={3} step={0.05}
            value={scale}
            onChange={(e) => onChange(id, { scale: parseFloat(e.target.value) })}
            className="w-full h-1.5 accent-purple-500 cursor-pointer"
          />
          <p className="text-right text-[10px] text-gray-500 font-mono mt-0.5">{scale.toFixed(2)}×</p>
        </div>
      </div>
    </aside>
  );
}
