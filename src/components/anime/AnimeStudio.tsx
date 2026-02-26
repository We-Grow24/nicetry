"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { Node, Edge } from "@xyflow/react";
import { createBrowserClient } from "@supabase/ssr";

import type {
  AnimeCharacter,
  AnimeSceneObject,
  AnimeEpisode,
  EpisodeNodeData,
  LibraryItem,
} from "./types";
import AnimeLeftPanel      from "./AnimeLeftPanel";
import AnimeInspectorPanel from "./AnimeInspectorPanel";
import CharacterCreatorModal from "./CharacterCreatorModal";
import EpisodePlanner      from "./EpisodePlanner";
import AudioStudio         from "@/components/audio/AudioStudio";

const AnimeSceneCanvas = dynamic<{
  objects: AnimeSceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  meshRefs: React.MutableRefObject<Record<string, THREE.Mesh | null>>;
}>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => import("./AnimeSceneCanvas") as any,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-gray-500 text-sm gap-2">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
        </svg>
        Loading Anime Scene…
      </div>
    ),
  }
);

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type: "success" | "error" | "info"; onDone: () => void; }
function Toast({ message, type, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "bg-emerald-700" : type === "error" ? "bg-red-700" : "bg-purple-700";
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] ${bg} text-white text-sm font-semibold px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all`}>
      <span>{type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Default scene objects ────────────────────────────────────────────────────
function buildDefaultScene(): AnimeSceneObject[] {
  return [
    {
      id: "bg_dojo",
      name: "Dojo Background",
      type: "background",
      seed: 0.11,
      position: { x: 0, y: 1.5, z: -4 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 2.5,
    },
    {
      id: "char_hero",
      name: "Hero",
      type: "character",
      seed: 0.22,
      position: { x: -1.5, y: 0, z: 0 },
      rotation: { x: 0, y: 0.3, z: 0 },
      scale: 1,
    },
  ];
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
interface TopBarProps {
  seriesName:    string;
  setSeriesName: (n: string) => void;
  onSaveConfig:  () => void;
  saving:        boolean;
  onTogglePlanner: () => void;
  plannerOpen: boolean;
}

function TopBar({ seriesName, setSeriesName, onSaveConfig, saving, onTogglePlanner, plannerOpen }: TopBarProps) {
  return (
    <header className="h-12 bg-gray-900 border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
      {/* Logo */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shrink-0">
        <span className="text-sm">⛩️</span>
      </div>

      {/* Series name */}
      <input
        className="bg-transparent text-sm font-semibold text-white border-b border-transparent hover:border-white/30 focus:border-purple-500 outline-none px-1 w-52 transition-colors"
        value={seriesName}
        onChange={(e) => setSeriesName(e.target.value)}
        placeholder="Series name…"
      />

      <span className="text-xs text-gray-500">Anime Studio</span>

      <div className="flex-1" />

      {/* Episode planner toggle */}
      <button
        onClick={onTogglePlanner}
        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5
          ${plannerOpen
            ? "bg-purple-600 border-purple-500 text-white"
            : "border-white/10 text-gray-300 hover:bg-white/5"
          }`}
      >
        🗺️ Episode Planner
      </button>

      {/* Save config (gold CTA) */}
      <button
        onClick={onSaveConfig}
        disabled={saving}
        className="px-4 py-1.5 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black transition-colors flex items-center gap-1.5"
      >
        {saving ? (
          <>
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round"/>
            </svg>
            Saving…
          </>
        ) : "💾 Save Config"}
      </button>
    </header>
  );
}

// ─── Prompt bar ───────────────────────────────────────────────────────────────
interface PromptBarProps {
  onGenerate: (prompt: string) => void;
  generating: boolean;
}
function PromptBar({ onGenerate, generating }: PromptBarProps) {
  const [val, setVal] = useState("");
  return (
    <div className="h-12 bg-gray-900 border-t border-white/10 flex items-center px-4 gap-3 shrink-0">
      <span className="text-purple-400 text-lg shrink-0">✨</span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && val.trim() && onGenerate(val)}
        placeholder="Describe the anime scene or episode… (Enter to generate)"
        className="flex-1 bg-gray-800/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
      />
      <button
        onClick={() => val.trim() && onGenerate(val)}
        disabled={generating || !val.trim()}
        className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors whitespace-nowrap"
      >
        {generating ? "Generating…" : "Generate ⚡"}
      </button>
    </div>
  );
}

// ─── Main AnimeStudio ─────────────────────────────────────────────────────────
export default function AnimeStudio() {
  const [seriesName,  setSeriesName]  = useState("My Anime Series");
  const [characters,  setCharacters]  = useState<AnimeCharacter[]>([]);
  const [episodes,    setEpisodes]    = useState<AnimeEpisode[]>([]);
  const [sceneObjects, setSceneObjects] = useState<AnimeSceneObject[]>(buildDefaultScene);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

  const [showCreator, setShowCreator] = useState(false);
  const [editingChar, setEditingChar] = useState<AnimeCharacter | undefined>(undefined);
  const [showPlanner, setShowPlanner] = useState(false);

  const [savingConfig, setSavingConfig] = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const meshRefs = useRef<Record<string, THREE.Mesh | null>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ── Load characters for this series ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .eq("series_name", seriesName)
        .order("created_at", { ascending: true });

      if (!cancelled && data) {
        setCharacters(data.map((r: Record<string, unknown>) => ({
          id:           String(r.id),
          name:         String(r.name),
          series_name:  String(r.series_name),
          face_seed:    Number(r.face_seed),
          body_seed:    Number(r.body_seed),
          costume_seed: Number(r.costume_seed),
          voice_seed:   Number(r.voice_seed),
          power_seed:   Number(r.power_seed),
        })));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [seriesName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Character saved callback ────────────────────────────────────────────────
  const handleCharacterSaved = useCallback((char: AnimeCharacter) => {
    setCharacters((prev) => {
      const exists = prev.findIndex((c) => c.id === char.id);
      return exists >= 0
        ? prev.map((c) => c.id === char.id ? char : c)
        : [...prev, char];
    });
    // If this character is already in the scene, update its seed
    setSceneObjects((prev) =>
      prev.map((o) =>
        o.characterId === char.id ? { ...o, seed: char.face_seed, name: char.name } : o
      )
    );
    setShowCreator(false);
    setEditingChar(undefined);
    setToast({ message: `Character "${char.name}" saved!`, type: "success" });
  }, []);

  // ── Add library item to scene ───────────────────────────────────────────────
  const handleAddFromLibrary = useCallback((item: LibraryItem) => {
    const obj: AnimeSceneObject = {
      id:       `${item.id}_${Date.now()}`,
      name:     item.label,
      type:     item.type,
      seed:     item.seed,
      position: { x: (Math.random() - 0.5) * 6, y: 0, z: (Math.random() - 0.5) * 3 },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale:    1,
    };
    setSceneObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
  }, []);

  // ── Object change ───────────────────────────────────────────────────────────
  const handleObjectChange = useCallback((id: string, patch: Partial<AnimeSceneObject>) => {
    setSceneObjects((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));

    const mesh = meshRefs.current[id];
    if (!mesh) return;
    if (patch.position) mesh.position.set(patch.position.x, patch.position.y, patch.position.z);
    if (patch.rotation) mesh.rotation.set(patch.rotation.x, patch.rotation.y, patch.rotation.z);
    if (patch.scale !== undefined) mesh.scale.setScalar(patch.scale);
  }, []);

  // ── Episode planner generate ─────────────────────────────────────────────────
  const handleEpisodeGenerate = useCallback((nodes: Node<EpisodeNodeData>[], edges: Edge[]) => {
    const newEp: AnimeEpisode = {
      id:          `ep_${Date.now()}`,
      title:       `Episode ${episodes.length + 1}`,
      episode_num: episodes.length + 1,
      series_name: seriesName,
      nodes,
      edges,
    };
    setEpisodes((prev) => [...prev, newEp]);
    setShowPlanner(false);
    setToast({ message: `Episode ${newEp.episode_num} added to series!`, type: "success" });
  }, [episodes.length, seriesName]);

  // ── Load episode ─────────────────────────────────────────────────────────────
  const handleLoadEpisode = useCallback((ep: AnimeEpisode) => {
    // Populate scene with characters from that episode's nodes
    const charIds = new Set(ep.nodes.flatMap((n) => n.data.characters));
    const presentChars = characters.filter((c) => charIds.has(c.id));
    if (presentChars.length > 0) {
      const charObjects: AnimeSceneObject[] = presentChars.map((c, i) => ({
        id:          `char_${c.id}`,
        name:        c.name,
        type:        "character" as const,
        seed:        c.face_seed,
        characterId: c.id,
        position:    { x: (i - presentChars.length / 2) * 2.5, y: 0, z: 0 },
        rotation:    { x: 0, y: 0, z: 0 },
        scale:       1,
      }));
      setSceneObjects((prev) => {
        const nonChars = prev.filter((o) => o.type !== "character");
        return [...nonChars, ...charObjects];
      });
    }
    setToast({ message: `Loaded "${ep.title}" — characters placed in scene.`, type: "info" });
  }, [characters]);

  // ── Save config (upsert characters from current scene) ──────────────────────
  const handleSaveConfig = useCallback(async () => {
    setSavingConfig(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract character objects that have a linked AnimeCharacter
      const sceneChars = sceneObjects.filter((o) => o.type === "character" && o.characterId);

      if (sceneChars.length === 0 && characters.length === 0) {
        setToast({ message: "No characters to save.", type: "info" });
        return;
      }

      // Build upsert payload from scene characters (seed may have been adjusted)
      const toSave = sceneChars
        .map((sc) => {
          const orig = characters.find((c) => c.id === sc.characterId);
          if (!orig) return null;
          return {
            user_id:      user.id,
            series_name:  seriesName,
            name:         orig.name,
            avatar_seed:  sc.seed,
            face_seed:    sc.seed,
            body_seed:    orig.body_seed,
            costume_seed: orig.costume_seed,
            voice_seed:   orig.voice_seed,
            power_seed:   orig.power_seed,
          };
        })
        .filter(Boolean);

      if (toSave.length > 0) {
        const { error } = await supabase
          .from("characters")
          .upsert(toSave, { onConflict: "user_id,series_name,name" });
        if (error) throw error;
      }

      setToast({
        message: "Configuration saved — characters will appear in next episode",
        type: "success",
      });
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Save failed", type: "error" });
    } finally {
      setSavingConfig(false);
    }
  }, [sceneObjects, characters, seriesName, supabase]);

  // ── AI prompt (mock — replace with your pipeline call) ──────────────────────
  const handleGenerate = useCallback(async (prompt: string) => {
    setGenerating(true);
    // Simulate a generation delay; replace with real API call
    await new Promise((r) => setTimeout(r, 1500));
    setToast({ message: `Scene generated from: "${prompt}"`, type: "success" });
    setGenerating(false);
  }, []);

  const selectedObject = sceneObjects.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top bar */}
      <TopBar
        seriesName={seriesName}
        setSeriesName={setSeriesName}
        onSaveConfig={handleSaveConfig}
        saving={savingConfig}
        onTogglePlanner={() => setShowPlanner((v) => !v)}
        plannerOpen={showPlanner}
      />

      {/* Main row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <AnimeLeftPanel
          characters={characters}
          episodes={episodes}
          onNewCharacter={() => { setEditingChar(undefined); setShowCreator(true); }}
          onEditCharacter={(c) => { setEditingChar(c); setShowCreator(true); }}
          onAddFromLibrary={handleAddFromLibrary}
          onLoadEpisode={handleLoadEpisode}
          onNewEpisode={() => setShowPlanner(true)}
          onOpenPlanner={() => setShowPlanner(true)}
          seriesName={seriesName}
        />

        {/* 3-D Canvas */}
        <div
          className="flex-1 relative bg-gray-950"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <AnimeSceneCanvas
              objects={sceneObjects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              meshRefs={meshRefs}
            />

          {/* Object count badge */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-[10px] text-gray-400 px-2 py-1 rounded-full pointer-events-none">
            {sceneObjects.length} object{sceneObjects.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Inspector */}
        <AnimeInspectorPanel obj={selectedObject} onChange={handleObjectChange} />
      </div>

      {/* Prompt bar */}
      <PromptBar onGenerate={handleGenerate} generating={generating} />

      {/* Audio Studio */}
      <AudioStudio />

      {/* ── Character Creator Modal ─────────────────────────────────────────── */}
      {showCreator && (
        <CharacterCreatorModal
          initial={editingChar}
          seriesName={seriesName}
          onSaved={handleCharacterSaved}
          onClose={() => { setShowCreator(false); setEditingChar(undefined); }}
        />
      )}

      {/* ── Episode Planner ──────────────────────────────────────────────────── */}
      {showPlanner && (
        <EpisodePlanner
          episodeTitle={`Episode ${episodes.length + 1} — ${seriesName}`}
          allChars={characters}
          onGenerate={handleEpisodeGenerate}
          onClose={() => setShowPlanner(false)}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
