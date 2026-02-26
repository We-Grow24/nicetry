"use client";

import React from "react";
import type { SceneObject } from "./types";

interface Props {
  object: SceneObject | null;
  onChange: (id: string, patch: Partial<SceneObject>) => void;
}

// ─── Reusable slider row ──────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min = -5,
  max = 5,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-6 text-xs text-gray-400 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
      />
      <span className="w-10 text-right text-xs text-gray-300 font-mono tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-2 border-b border-white/10 pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Inspector panel ──────────────────────────────────────────────────────────

export default function InspectorPanel({ object, onChange }: Props) {
  if (!object) {
    return (
      <aside className="flex-1 bg-gray-900 border-l border-white/10 flex flex-col items-center justify-center text-gray-500 text-sm text-center px-6 gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <span>Click any object in the scene to inspect and edit it.</span>
      </aside>
    );
  }

  const patchPos = (axis: "x" | "y" | "z", v: number) =>
    onChange(object.id, { position: { ...object.position, [axis]: v } });

  const patchRot = (axis: "x" | "y" | "z", v: number) =>
    onChange(object.id, { rotation: { ...object.rotation, [axis]: v } });

  return (
    <aside className="flex-1 bg-gray-900 border-l border-white/10 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gray-800/60">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">
          {object.type}
        </p>
        <h3 className="text-sm font-semibold text-white truncate">{object.name}</h3>
        <p className="text-[10px] text-gray-500 font-mono">{object.id}</p>
      </div>

      <div className="px-4 py-3 flex-1">
        {/* Seed */}
        <Section title="Shader Seed">
          <SliderRow
            label="seed"
            value={object.seed}
            min={0}
            max={1}
            step={0.001}
            onChange={(v) => onChange(object.id, { seed: v })}
          />
          {/* Seed preview swatch */}
          <div
            className="h-6 rounded mt-1 border border-white/10"
            style={{
              background: `hsl(${Math.floor((object.seed * 360 + 30) % 360)}deg, 60%, 55%)`,
            }}
          />
        </Section>

        {/* Position */}
        <Section title="Position">
          <SliderRow label="X" value={object.position.x} onChange={(v) => patchPos("x", v)} />
          <SliderRow label="Y" value={object.position.y} min={0} max={5} onChange={(v) => patchPos("y", v)} />
          <SliderRow label="Z" value={object.position.z} onChange={(v) => patchPos("z", v)} />
        </Section>

        {/* Rotation */}
        <Section title="Rotation">
          <SliderRow label="X" value={object.rotation.x} min={-Math.PI} max={Math.PI} onChange={(v) => patchRot("x", v)} />
          <SliderRow label="Y" value={object.rotation.y} min={-Math.PI} max={Math.PI} onChange={(v) => patchRot("y", v)} />
          <SliderRow label="Z" value={object.rotation.z} min={-Math.PI} max={Math.PI} onChange={(v) => patchRot("z", v)} />
        </Section>

        {/* Scale */}
        <Section title="Scale">
          <SliderRow
            label="S"
            value={object.scale}
            min={0.1}
            max={3}
            step={0.01}
            onChange={(v) => onChange(object.id, { scale: v })}
          />
        </Section>
      </div>
    </aside>
  );
}
