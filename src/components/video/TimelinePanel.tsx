"use client";

import React, { useRef, useCallback } from "react";
import { motion, useDragControls } from "framer-motion";
import type { Track, TimelineBlock } from "./types";

interface Props {
  playhead: number;          // 0-1
  duration: number;          // seconds
  tracks: Track[];
  onPlayheadChange: (frac: number) => void;
  onBlockMove: (trackId: string, blockId: string, startFrac: number) => void;
}

const TRACK_HEIGHT = 36;
const RULER_HEIGHT = 24;

// ─── Ruler tick marks ─────────────────────────────────────────────────────────

function Ruler({ duration }: { duration: number }) {
  const ticks = Array.from({ length: Math.floor(duration) + 1 }, (_, i) => i);
  return (
    <div className="relative h-full flex items-end pb-1">
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute flex flex-col items-center"
          style={{ left: `${(t / duration) * 100}%` }}
        >
          <span className="text-[9px] text-gray-500 font-mono">{t}s</span>
          <div className="w-px h-2 bg-gray-600" />
        </div>
      ))}
    </div>
  );
}

// ─── Timeline block ───────────────────────────────────────────────────────────

function Block({
  block,
  trackId,
  containerWidth,
  duration,
  onMove,
}: {
  block: TimelineBlock;
  trackId: string;
  containerWidth: number;
  duration: number;
  onMove: (trackId: string, blockId: string, startFrac: number) => void;
}) {
  const blockWidth = (block.endFrac - block.startFrac) * containerWidth;

  return (
    <motion.div
      drag="x"
      dragConstraints={{
        left: 0,
        right: containerWidth - blockWidth,
      }}
      dragElastic={0}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const newLeft = block.startFrac * containerWidth + info.offset.x;
        const newFrac = Math.max(0, Math.min(1 - (block.endFrac - block.startFrac), newLeft / containerWidth));
        onMove(trackId, block.id, newFrac);
      }}
      initial={{ x: 0 }}
      style={{
        position: "absolute",
        left: block.startFrac * containerWidth,
        width: blockWidth,
        height: TRACK_HEIGHT - 8,
        top: 4,
        backgroundColor: block.color,
        borderRadius: 4,
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        paddingLeft: 6,
        overflow: "hidden",
      }}
      whileDrag={{ cursor: "grabbing", scale: 1.02 }}
    >
      <span className="text-[10px] font-medium text-white/90 truncate select-none">
        {block.label}
      </span>
    </motion.div>
  );
}

// ─── Main timeline ────────────────────────────────────────────────────────────

export default function TimelinePanel({
  playhead,
  duration,
  tracks,
  onPlayheadChange,
  onBlockMove,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  const handleRailClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!railRef.current) return;
      const rect = railRef.current.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onPlayheadChange(frac);
    },
    [onPlayheadChange]
  );

  const containerWidth = railRef.current?.getBoundingClientRect().width ?? 800;

  return (
    <div className="h-48 bg-gray-900 border-t border-white/10 flex flex-col select-none shrink-0">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 h-9 border-b border-white/10 bg-gray-800/50 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Timeline
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {(playhead * duration).toFixed(1)}s / {duration}s
        </span>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-500">
          <span>Drag blocks to reorder · Click ruler to scrub</span>
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track labels */}
        <div className="w-28 shrink-0 border-r border-white/10 bg-gray-800/40">
          <div style={{ height: RULER_HEIGHT }} className="border-b border-white/10" />
          {tracks.map((track) => (
            <div
              key={track.id}
              style={{ height: TRACK_HEIGHT }}
              className="flex items-center px-3 border-b border-white/5"
            >
              <span className="text-[10px] text-gray-400 truncate">{track.label}</span>
            </div>
          ))}
        </div>

        {/* Rail */}
        <div
          ref={railRef}
          className="flex-1 relative overflow-x-auto cursor-crosshair"
          onClick={handleRailClick}
        >
          {/* Ruler */}
          <div
            style={{ height: RULER_HEIGHT }}
            className="border-b border-white/10 bg-gray-800/20"
          >
            <Ruler duration={duration} />
          </div>

          {/* Tracks */}
          {tracks.map((track) => (
            <div
              key={track.id}
              style={{ height: TRACK_HEIGHT }}
              className="relative border-b border-white/5 bg-gray-900/60"
            >
              {track.blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  trackId={track.id}
                  containerWidth={containerWidth}
                  duration={duration}
                  onMove={onBlockMove}
                />
              ))}
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-indigo-500 pointer-events-none z-10"
            style={{ left: `${playhead * 100}%` }}
          >
            <div className="w-3 h-3 bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
