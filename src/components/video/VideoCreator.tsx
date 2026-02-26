"use client";

import React, {
  useState,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";
import type { SceneObject, Track, MasterDirectorSeed } from "./types";
import InspectorPanel from "./InspectorPanel";
import TimelinePanel from "./TimelinePanel";
import SceneLibrary, { type LibraryItem } from "./SceneLibrary";
import AiPromptBar, { type AiEditResult } from "./AiPromptBar";
import AudioStudio from "@/components/audio/AudioStudio";
import ExportButton from "@/components/common/ExportButton";

// Lazy-load the canvas so it only runs client-side (avoids SSR issues with WebGL)
const SceneCanvas = lazy(() => import("./SceneCanvas"));

// ─── Default seed ─────────────────────────────────────────────────────────────

const DEFAULT_SEED: MasterDirectorSeed = {
  world: { biome: "forest", time_of_day: 12, weather: "clear" },
  characters: [{ id: "ninja1", appearance_seed: 0.5, role: "protagonist" }],
  narrative: { act: 1, tension: 0.4 },
};

// ─── Build initial scene objects from seed ────────────────────────────────────

function buildObjectsFromSeed(seed: MasterDirectorSeed): SceneObject[] {
  if (seed.objects?.length) return seed.objects;

  const objects: SceneObject[] = [];

  const chars = seed.characters ?? [];
  chars.forEach((c, i) => {
    objects.push({
      id: c.id,
      name: `${c.role} (${c.id})`,
      type: "character",
      seed: c.appearance_seed,
      position: { x: (i - chars.length / 2) * 2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    });
  });

  const biome = seed.world?.biome ?? "forest";
  objects.push({
    id: "bg_world",
    name: `${biome} background`,
    type: "background",
    seed: (seed.world?.time_of_day ?? 12) / 24,
    position: { x: 4, y: 0.5, z: -2 },
    rotation: { x: 0, y: 0.3, z: 0 },
    scale: 1.2,
  });

  objects.push({
    id: "prop_main",
    name: "Product Bottle",
    type: "prop",
    seed: seed.narrative?.tension ?? 0.4,
    position: { x: -3, y: 0, z: 1 },
    rotation: { x: 0, y: 0.5, z: 0 },
    scale: 1,
  });

  return objects;
}

// ─── Default tracks ───────────────────────────────────────────────────────────

const DEFAULT_TRACKS: Track[] = [
  {
    id: "camera",
    label: "Camera",
    type: "camera",
    blocks: [
      { id: "cam1", startFrac: 0.0, endFrac: 0.4, label: "Wide Shot", color: "#6366f1" },
      { id: "cam2", startFrac: 0.45, endFrac: 0.85, label: "Close Up",  color: "#8b5cf6" },
    ],
  },
  {
    id: "character",
    label: "Character",
    type: "character",
    blocks: [
      { id: "ch1", startFrac: 0.0,  endFrac: 0.3,  label: "Idle",   color: "#059669" },
      { id: "ch2", startFrac: 0.35, endFrac: 0.65, label: "Walk",   color: "#10b981" },
      { id: "ch3", startFrac: 0.7,  endFrac: 1.0,  label: "Action", color: "#34d399" },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    type: "audio",
    blocks: [
      { id: "au1", startFrac: 0.0,  endFrac: 0.5,  label: "Ambient", color: "#d97706" },
      { id: "au2", startFrac: 0.5,  endFrac: 1.0,  label: "Climax",  color: "#f59e0b" },
    ],
  },
];

// ─── Top bar ──────────────────────────────────────────────────────────────────

interface TopBarProps {
  projectName: string;
  setProjectName: (n: string) => void;
  exporting: boolean;
  exportUrl: string | null;
  onExport: () => void;
  playhead: number;
  duration: number;
  projectId: string | null;
}

function TopBar({ projectName, setProjectName, exporting, exportUrl, onExport, playhead, duration, projectId }: TopBarProps) {
  return (
    <header className="h-12 bg-gray-900 border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
      {/* Logo dot */}
      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10,8 16,12 10,16" fill="#6366f1" />
        </svg>
      </div>

      {/* Project name */}
      <input
        className="bg-transparent text-sm font-semibold text-white border-b border-transparent hover:border-white/30 focus:border-indigo-500 outline-none px-1 w-48 transition-colors"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />

      {/* Timecode */}
      <span className="text-xs text-gray-400 font-mono ml-2">
        {(playhead * duration).toFixed(2)}s&nbsp;/&nbsp;{duration}s
      </span>

      <div className="flex-1" />

      {/* Quick scrub bar */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={playhead}
        className="w-40 h-1.5 accent-indigo-500 cursor-pointer"
        readOnly
      />

      {/* Export */}
      <div className="flex items-center gap-2">
        {exportUrl ? (
          <a
            href={exportUrl}
            download="video.mp4"
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            ⬇ Download MP4
          </a>
        ) : null}
        <button
          onClick={onExport}
          disabled={exporting}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5"
        >
          {exporting ? (
            <>
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
              </svg>
              Rendering…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              Export MP4
            </>
          )}
        </button>
        <ExportButton
          projectId={projectId}
          projectType="video"
          dark
        />
      </div>
    </header>
  );
}

// ─── Main VideoCreator ────────────────────────────────────────────────────────

export default function VideoCreator() {
  const searchParams  = useSearchParams();
  const projectId     = searchParams.get("project_id");

  const [projectName, setProjectName] = useState("Untitled Project");
  const [masterSeed, setMasterSeed] = useState<Record<string, unknown>>(
    DEFAULT_SEED as unknown as Record<string, unknown>
  );
  const [objects, setObjects] = useState<SceneObject[]>(() =>
    buildObjectsFromSeed(DEFAULT_SEED)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [duration] = useState(30); // seconds
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Refs to actual Three.js meshes for real-time property updates without re-render
  const meshRefs = useRef<Record<string, THREE.Mesh | null>>({});

  // ── Selected object ──────────────────────────────────────────────────────
  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;

  // ── Object mutation (patches React state + live mesh ref) ────────────────
  const handleObjectChange = useCallback(
    (id: string, patch: Partial<SceneObject>) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );

      // Live-update the Three.js mesh without waiting for React re-render
      const mesh = meshRefs.current[id];
      if (!mesh) return;

      if (patch.position) {
        mesh.position.set(patch.position.x, patch.position.y, patch.position.z);
      }
      if (patch.rotation) {
        mesh.rotation.set(patch.rotation.x, patch.rotation.y, patch.rotation.z);
      }
      if (patch.scale !== undefined) {
        mesh.scale.setScalar(patch.scale);
      }
    },
    []
  );

  // ── Add item from library ────────────────────────────────────────────────
  const handleAddFromLibrary = useCallback((item: LibraryItem) => {
    const newObj: SceneObject = {
      id: `${item.id}_${Date.now()}`,
      name: item.label,
      type: item.type,
      seed: item.seed,
      position: {
        x: (Math.random() - 0.5) * 6,
        y: 0,
        z: (Math.random() - 0.5) * 4,
      },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale: 1,
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedId(newObj.id);
  }, []);

  // ── AI seed update ────────────────────────────────────────────────────────
  const handleSeedUpdate = useCallback(
    (newSeed: Record<string, unknown>, _result: AiEditResult) => {
      setMasterSeed(newSeed);

      // Rebuild objects from updated characters
      const chars = (newSeed.characters as Array<{ id: string; appearance_seed: number; role: string }> | undefined) ?? [];
      if (chars.length > 0) {
        setObjects((prev) => {
          const next = [...prev];
          chars.forEach((c, i) => {
            const existing = next.find((o) => o.id === c.id);
            if (existing) {
              existing.seed = c.appearance_seed;
              // live-update shader uniform if mesh exists
              const mesh = meshRefs.current[c.id];
              if (mesh) {
                const mat = mesh.material as THREE.ShaderMaterial | undefined;
                if (mat?.uniforms?.seed) mat.uniforms.seed.value = c.appearance_seed;
              }
            } else {
              next.push({
                id: c.id,
                name: `${c.role} (${c.id})`,
                type: "character",
                seed: c.appearance_seed,
                position: { x: (i - chars.length / 2) * 2, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: 1,
              });
            }
          });
          return [...next];
        });
      }

      // Rebuild background seed from world_state.sdf_layers / lighting
      const ws = newSeed.world_state as Record<string, unknown> | undefined;
      if (ws) {
        const tod = ((ws.lighting as Record<string, unknown> | undefined)?.time_of_day as number | undefined) ?? 12;
        const newBgSeed = tod / 24;
        setObjects((prev) =>
          prev.map((o) =>
            o.id === "bg_world" ? { ...o, seed: newBgSeed } : o
          )
        );
      }

      // Rebuild timeline tracks from updated timeline_tracks
      const rawTracks = newSeed.timeline_tracks as Array<{ type: string; events: Array<{ t: number; action: string; params: Record<string, unknown>; rotation_speed?: number }> }> | undefined;
      if (rawTracks && rawTracks.length > 0) {
        setTracks((prev) =>
          prev.map((existing) => {
            const raw = rawTracks.find((r) => r.type === existing.type);
            if (!raw || raw.events.length === 0) return existing;
            // Convert raw events to timeline blocks
            const totalDuration = 30;
            const newBlocks = raw.events.slice(0, 4).map((ev, idx) => ({
              id: `${existing.id}_ai_${idx}`,
              startFrac: ev.t / totalDuration,
              endFrac: Math.min(1, ev.t / totalDuration + 0.2),
              label: `${ev.action}${ev.rotation_speed != null ? ` ×${ev.rotation_speed.toFixed(1)}` : ""}`,
              color: existing.blocks[idx]?.color ?? "#6366f1",
            }));
            return { ...existing, blocks: newBlocks };
          })
        );
      }
    },
    []
  );

  // ── Block drag ───────────────────────────────────────────────────────────
  const handleBlockMove = useCallback(
    (trackId: string, blockId: string, newStartFrac: number) => {
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            blocks: t.blocks.map((b) => {
              if (b.id !== blockId) return b;
              const len = b.endFrac - b.startFrac;
              return {
                ...b,
                startFrac: newStartFrac,
                endFrac: Math.min(1, newStartFrac + len),
              };
            }),
          };
        })
      );
    },
    []
  );

  // ── Export MP4 ───────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    setExportUrl(null);

    try {
      const payload = {
        projectName,
        duration,
        objects,
        tracks,
        masterSeed,
      };

      const res = await fetch("/api/export-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setExportUrl(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }, [projectName, duration, objects, tracks]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <TopBar
        projectName={projectName}
        setProjectName={setProjectName}
        exporting={exporting}
        exportUrl={exportUrl}
        onExport={handleExport}
        playhead={playhead}
        duration={duration}
        projectId={projectId}
      />

      {/* ── Export error toast ─────────────────────────────────────────────── */}
      {exportError && (
        <div className="mx-4 mt-2 px-4 py-2 bg-red-900/60 border border-red-700 rounded-lg text-sm text-red-200 flex items-center gap-2 shrink-0">
          <span>⚠</span>
          <span>{exportError}</span>
          <button className="ml-auto text-red-400 hover:text-red-200" onClick={() => setExportError(null)}>✕</button>
        </div>
      )}

      {/* ── Main row: library + canvas + inspector ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: scene library */}
        <SceneLibrary onAdd={handleAddFromLibrary} />

        {/* Center: 3-D canvas */}
        <div
          className="flex-1 relative bg-gray-950"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-gray-500 text-sm gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
                </svg>
                Loading WebGL scene…
              </div>
            }
          >
            <SceneCanvas
              objects={objects}
              selectedId={selectedId}
              playhead={playhead}
              onSelect={setSelectedId}
              meshRefs={meshRefs}
            />
          </Suspense>

          {/* Overlay hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 pointer-events-none bg-gray-950/70 px-3 py-1 rounded-full">
            Orbit: drag · Zoom: scroll · Select: click object
          </div>
        </div>

        {/* Right: inspector + AI prompt bar */}
        <div className="flex flex-col w-64 shrink-0">
          <InspectorPanel object={selectedObject} onChange={handleObjectChange} />
          <AiPromptBar masterSeed={masterSeed} onSeedUpdate={handleSeedUpdate} />
        </div>
      </div>

      {/* ── Bottom: timeline ────────────────────────────────────────────────── */}
      <TimelinePanel
        playhead={playhead}
        duration={duration}
        tracks={tracks}
        onPlayheadChange={setPlayhead}
        onBlockMove={handleBlockMove}
      />
      {/* ── Audio Studio ─────────────────────────────────────────────────────── */}
      <AudioStudio />    </div>
  );
}
