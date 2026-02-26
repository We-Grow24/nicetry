"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AiEditResult {
  updated_seed: Record<string, unknown>;
  changes_made: string[];
  description: string;
  agent: string;
}

interface HistoryEntry {
  command: string;
  result: AiEditResult;
  timestamp: number;
}

interface Props {
  masterSeed: Record<string, unknown>;
  onSeedUpdate: (newSeed: Record<string, unknown>, result: AiEditResult) => void;
}

// ─── Examples carousel ───────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "make the bottle spin 2× faster",
  "change background to Tokyo sunset",
  "add a jump cut at 8 seconds",
  "make it rain",
  "slow down the camera pan",
  "night scene with neon lights",
  "fade in at the start",
  "change audio mood to epic",
  "deep space background",
  "brighter lighting",
];

// ─── Small spinner ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin w-3.5 h-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
    </svg>
  );
}

// ─── Agent badge ──────────────────────────────────────────────────────────────

function AgentBadge({ agent }: { agent: string }) {
  const isScene   = agent.includes("scene");
  const isGpt     = agent.includes("gpt");
  return (
    <span
      className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
        isScene
          ? "border-emerald-600/50 text-emerald-400 bg-emerald-900/20"
          : "border-indigo-600/50 text-indigo-400 bg-indigo-900/20"
      }`}
    >
      {isScene ? "scene" : "timeline"}
      {isGpt ? " · gpt" : " · rules"}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiPromptBar({ masterSeed, onSeedUpdate }: Props) {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Submit ──────────────────────────────────────────────────────────────
  const submit = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/video-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: trimmed, master_seed: masterSeed }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const result = (await res.json()) as AiEditResult;
        onSeedUpdate(result.updated_seed, result);

        setHistory((prev) => [
          { command: trimmed, result, timestamp: Date.now() },
          ...prev.slice(0, 19),
        ]);
        setCommand("");
        setShowHistory(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [masterSeed, onSeedUpdate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) submit(command);
    if (e.key === "Tab") {
      e.preventDefault();
      setCommand(EXAMPLE_PROMPTS[exampleIdx % EXAMPLE_PROMPTS.length]);
      setExampleIdx((i) => i + 1);
    }
  };

  const latestEntry = history[0];

  return (
    <div className="border-t border-white/10 bg-gray-800/40 select-none">
      {/* ── Result feedback ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {latestEntry && showHistory && (
          <motion.div
            key={latestEntry.timestamp}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-3 py-2 border-b border-white/10 bg-indigo-950/40"
          >
            <div className="flex items-start gap-2">
              {/* Tick */}
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-gray-300 truncate font-medium">
                    "{latestEntry.command}"
                  </span>
                  <AgentBadge agent={latestEntry.result.agent} />
                </div>
                <ul className="space-y-0.5">
                  {latestEntry.result.changes_made.map((c, i) => (
                    <li key={i} className="text-[10px] text-gray-400 font-mono leading-snug">
                      · {c}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-600 hover:text-gray-400 text-sm shrink-0 leading-none"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error feedback ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-3 py-2 bg-red-900/30 border-b border-red-800/50 flex items-center gap-2"
          >
            <span className="text-red-400 text-xs">⚠ {error}</span>
            <button className="ml-auto text-red-600 hover:text-red-400 text-xs" onClick={() => setError(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* AI sparkle icon */}
        <svg
          className={`w-4 h-4 shrink-0 transition-colors ${loading ? "text-indigo-400 animate-pulse" : "text-gray-500"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
          <path d="M5 16l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" opacity="0.6" />
          <path d="M19 14l0.7 2 2 0.7-2 0.7-0.7 2-0.7-2-2-0.7 2-0.7 0.7-2z" opacity="0.4" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder={`Describe your change… (Tab for example: "${EXAMPLE_PROMPTS[exampleIdx % EXAMPLE_PROMPTS.length]}")`}
          className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-500 outline-none disabled:opacity-50"
        />

        {loading ? (
          <div className="flex items-center gap-1.5 text-indigo-400 text-[10px]">
            <Spinner />
            <span>Thinking…</span>
          </div>
        ) : (
          <button
            onClick={() => submit(command)}
            disabled={!command.trim()}
            className="px-2.5 py-1 text-[10px] font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1 shrink-0"
          >
            Apply
            <kbd className="text-[8px] opacity-60 font-mono">↵</kbd>
          </button>
        )}
      </div>

      {/* ── History pills ────────────────────────────────────────────────────── */}
      {history.length > 1 && (
        <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
          {history.slice(1, 5).map((h, i) => (
            <button
              key={h.timestamp}
              onClick={() => submit(h.command)}
              disabled={loading}
              className="text-[9px] text-gray-400 hover:text-indigo-300 bg-gray-800/60 hover:bg-indigo-900/30 border border-white/10 hover:border-indigo-600/50 px-2 py-0.5 rounded-full transition-colors disabled:opacity-40 truncate max-w-[120px]"
              title={h.command}
            >
              ↺ {h.command}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
