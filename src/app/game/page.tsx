"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";
import { PlanningAgents } from "@/components/game/PlanningAgents";
import AudioStudio from "@/components/audio/AudioStudio";
import ExportButton from "@/components/common/ExportButton";

// ─── Constants ───────────────────────────────────────────────────────────────

const GODOT_URL =
  "https://gxqwexogmkoxsyvlfpem.supabase.co/storage/v1/object/public/godot/godot-export.html";

const INDIGO = "#6366F1";
const INDIGO_DARK = "#4F46E5";
const GODOT_TIMEOUT_MS = 60_000;
const PLAYCANVAS_URL = "https://launch.playcanvas.com/2433495?debug=true";

type TerrainType = "city" | "forest" | "ocean" | "desert" | "space";
type NpcBehavior  = "peaceful" | "neutral" | "aggressive";

const TERRAIN_LABELS: Record<TerrainType, string> = {
  city:    "🏙 City",
  forest:  "🌲 Forest",
  ocean:   "🌊 Ocean",
  desert:  "🏜 Desert",
  space:   "🚀 Space",
};

/** Default master_director_seed — replace with live pipeline_run data */
const DEFAULT_SEED = {
  world: { biome: "forest", time_of_day: 12, weather: "clear" },
  characters: [{ id: "ninja1", appearance_seed: 0.5, role: "protagonist" }],
  narrative: { act: 1, tension: 0.4 },
};

// ─── Slider ──────────────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ background: INDIGO }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: INDIGO }}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ─── Three.js fallback ───────────────────────────────────────────────────────

function ThreeFallback({ onRetry }: { onRetry: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Sync canvas resolution to its CSS size
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070712);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Wireframe icosphere
    const geo = new THREE.IcosahedronGeometry(1.1, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Starfield
    const stars = new Float32Array(900);
    for (let i = 0; i < stars.length; i++) stars[i] = (Math.random() - 0.5) * 12;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04 })));

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      mesh.rotation.y += 0.006;
      mesh.rotation.x += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Overlay text */}
      <div className="relative z-10 flex flex-col items-center gap-3 pointer-events-none text-center px-6">
        <span className="text-3xl">⚠️</span>
        <p className="text-white font-semibold text-sm">
          Godot failed to load after 60 s
        </p>
        <p className="text-gray-400 text-xs">
          Three.js fallback active — check network / CORS settings
        </p>
        <button
          className="pointer-events-auto mt-2 rounded-lg px-5 py-2 text-xs font-semibold text-white transition-colors"
          style={{ background: INDIGO }}
          onMouseEnter={(e) => (e.currentTarget.style.background = INDIGO_DARK)}
          onMouseLeave={(e) => (e.currentTarget.style.background = INDIGO)}
          onClick={onRetry}
        >
          ↺ Retry Godot
        </button>
      </div>
    </div>
  );
}

// ─── World Engine Controls ────────────────────────────────────────────────────
// Sidebar card for the PlayCanvas world tab: terrain, atmosphere, NPC behavior.

function WorldEngineControls({
  postToPlayCanvas,
  terrain,
  setTerrain,
  atmosphere,
  setAtmosphere,
  npcBehavior,
  setNpcBehavior,
  npcDensity,
  weather,
  timeOfDay,
}: {
  postToPlayCanvas: (msg: object) => void;
  terrain:      TerrainType;
  setTerrain:   (t: TerrainType) => void;
  atmosphere:   number;
  setAtmosphere:(v: number) => void;
  npcBehavior:  NpcBehavior;
  setNpcBehavior:(b: NpcBehavior) => void;
  npcDensity: number;
  weather:    number;
  timeOfDay:  number;
}) {
  const weatherStr =
    weather < 20 ? "clear" : weather < 50 ? "cloudy" : weather < 75 ? "rain" : "storm";

  const handleApply = () => {
    postToPlayCanvas({
      type:         "world_update",
      npc_density:  parseFloat((npcDensity / 100).toFixed(2)),
      weather:      weatherStr,
      time_of_day:  timeOfDay,
      terrain,
      atmosphere:   parseFloat((atmosphere / 100).toFixed(2)),
      npc_behavior: npcBehavior,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs"
          style={{ background: INDIGO }}
        >
          🌍
        </span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          World Engine Controls
        </h3>
      </div>

      {/* ── Terrain Type ── */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          Terrain Type
        </label>
        <select
          value={terrain}
          onChange={(e) => {
            const t = e.target.value as TerrainType;
            setTerrain(t);
            postToPlayCanvas({ type: "world_update", terrain: t });
          }}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {(Object.keys(TERRAIN_LABELS) as TerrainType[]).map((t) => (
            <option key={t} value={t}>
              {TERRAIN_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* ── Atmosphere ── */}
      <Slider
        label="Atmosphere"
        value={atmosphere}
        onChange={(v) => {
          setAtmosphere(v);
          postToPlayCanvas({
            type: "world_update",
            atmosphere: parseFloat((v / 100).toFixed(2)),
          });
        }}
        min={0}
        max={100}
        unit=""
      />

      {/* ── NPC Behavior ── */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          NPC Behavior
        </label>
        <div className="flex gap-2">
          {(["peaceful", "neutral", "aggressive"] as NpcBehavior[]).map((b) => (
            <button
              key={b}
              onClick={() => {
                setNpcBehavior(b);
                postToPlayCanvas({ type: "world_update", npc_behavior: b });
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                npcBehavior === b
                  ? "text-white border-transparent"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
              style={npcBehavior === b ? { background: INDIGO } : undefined}
            >
              {b === "peaceful" ? "😊" : b === "neutral" ? "😐" : "😤"}{" "}
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Apply ── */}
      <button
        className="w-full rounded-lg py-2 text-sm font-semibold text-white transition-colors"
        style={{ background: INDIGO }}
        onMouseEnter={(e) => (e.currentTarget.style.background = INDIGO_DARK)}
        onMouseLeave={(e) => (e.currentTarget.style.background = INDIGO)}
        onClick={handleApply}
      >
        Apply to World
      </button>

      {/* ── Live message preview ── */}
      <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 font-mono text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        &#123; type:{" "}
        <span className="text-green-500">&apos;world_update&apos;</span>,
        <br />
        {"  "}terrain:{" "}
        <span className="text-green-500">&apos;{terrain}&apos;</span>,
        <br />
        {"  "}atmosphere:{" "}
        <span className="text-yellow-500">{(atmosphere / 100).toFixed(2)}</span>
        ,
        <br />
        {"  "}npc_behavior:{" "}
        <span className="text-green-500">&apos;{npcBehavior}&apos;</span>,
        <br />
        {"  "}weather:{" "}
        <span className="text-green-500">&apos;{weatherStr}&apos;</span>,
        <br />
        {"  "}time_of_day:{" "}
        <span className="text-yellow-500">{timeOfDay}</span> &#125;
      </div>
    </div>
  );
}

// ─── Character Inspector ─────────────────────────────────────────────────────
// Sidebar card with per-character sliders that postMessage seed_update events
// directly to the Godot iframe (mirrors the window.godotFrame bridge pattern).

function CharacterInspector({
  postToGodot,
}: {
  postToGodot: (msg: object) => void;
}) {
  const [appearanceSeed, setAppearanceSeed] = useState(50);
  const [combatSeed, setCombatSeed] = useState(40);
  const CHARACTER_ID = "ninja1";

  const handleAppearance = (raw: number) => {
    const value = parseFloat((raw / 100).toFixed(2));
    setAppearanceSeed(raw);
    postToGodot({
      type: "seed_update",
      character_id: CHARACTER_ID,
      property: "appearance_seed",
      value,
    });
    // Also mirrors: window.godotFrame.contentWindow.postMessage({...}, '*')
    const gf = (window as Window & { godotFrame?: HTMLIFrameElement }).godotFrame;
    if (gf?.contentWindow) {
      gf.contentWindow.postMessage(
        { type: "seed_update", character_id: CHARACTER_ID, property: "appearance_seed", value },
        "*",
      );
    }
  };

  const handleCombat = (raw: number) => {
    const value = parseFloat((raw / 100).toFixed(2));
    setCombatSeed(raw);
    postToGodot({
      type: "seed_update",
      character_id: CHARACTER_ID,
      property: "combat_seed",
      value,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs"
          style={{ background: INDIGO }}
        >
          🥷
        </span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          Character Inspector
        </h3>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Sliders postMessage{" "}
        <code className="bg-gray-100 dark:bg-gray-700 rounded px-1">seed_update</code>{" "}
        events to Godot in real-time.
      </p>

      <Slider
        label="Appearance Seed (ninja1)"
        value={appearanceSeed}
        onChange={handleAppearance}
        min={0}
        max={100}
        unit=""
      />
      <Slider
        label="Combat Seed (ninja1)"
        value={combatSeed}
        onChange={handleCombat}
        min={0}
        max={100}
        unit=""
      />

      <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 font-mono text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        <span className="text-indigo-500">window</span>.godotFrame
        <br />
        {"  "}.contentWindow.postMessage(
        <br />
        {"    "}&#123; type:{" "}
        <span className="text-green-500">&apos;seed_update&apos;</span>,
        <br />
        {"      "}character_id:{" "}
        <span className="text-green-500">&apos;ninja1&apos;</span>,
        <br />
        {"      "}property:{" "}
        <span className="text-green-500">&apos;appearance_seed&apos;</span>,
        <br />
        {"      "}value:{" "}
        <span className="text-yellow-500">
          {(appearanceSeed / 100).toFixed(2)}
        </span>
        <br />
        {"    "}&#125;, <span className="text-green-500">&apos;*&apos;</span>)
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function GamePage() {
  const searchParams = useSearchParams();
  const projectId    = searchParams.get("project_id");

  const [activeTab, setActiveTab] = useState<"story" | "world">("story");
  const [npcDensity, setNpcDensity] = useState(50);
  const [weather, setWeather] = useState(30);
  const [timeOfDay, setTimeOfDay] = useState(12);

  // Godot load state
  const [godotLoaded, setGodotLoaded] = useState(false);
  const [godotTimedOut, setGodotTimedOut] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PlayCanvas state
  const [pcLoaded, setPcLoaded] = useState(false);
  const pcIframeRef = useRef<HTMLIFrameElement>(null);
  const [terrain, setTerrain] = useState<TerrainType>("forest");
  const [atmosphere, setAtmosphere] = useState(50);
  const [npcBehavior, setNpcBehavior] = useState<NpcBehavior>("neutral");
  const [pcStats, setPcStats] = useState({
    activeNpcs: 60,
    weather:    "Clear",
    lighting:   "Day",
    fps:        "60",
  });

  // ── postMessage bridges ───────────────────────────────────────────────────
  const postToGodot = useCallback((msg: object) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(msg, "*");
  }, []);

  const postToPlayCanvas = useCallback((msg: object) => {
    const frame = pcIframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(msg, "*");
  }, []);

  // Expose iframes on window for external bridge calls:
  //   window.godotFrame.contentWindow.postMessage({ type: 'seed_update', … }, '*')
  //   window.pcFrame.contentWindow.postMessage({ type: 'world_update', … }, '*')
  useEffect(() => {
    if (iframeRef.current) {
      (window as Window & { godotFrame?: HTMLIFrameElement }).godotFrame =
        iframeRef.current;
    }
  }, [godotLoaded]);

  useEffect(() => {
    if (pcIframeRef.current) {
      (window as Window & { pcFrame?: HTMLIFrameElement }).pcFrame =
        pcIframeRef.current;
    }
  }, [pcLoaded]);

  // ── Listen for postMessage stats from PlayCanvas ──────────────────────────
  // PlayCanvas scene should emit: { type: 'pc_stats', active_npcs, weather, lighting, fps }
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || e.data.type !== "pc_stats") return;
      setPcStats((prev) => ({
        activeNpcs: e.data.active_npcs ?? prev.activeNpcs,
        weather:    e.data.weather     ?? prev.weather,
        lighting:   e.data.lighting    ?? prev.lighting,
        fps:        String(e.data.fps  ?? prev.fps),
      }));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Start 60 s timeout when story tab is first shown ─────────────────────
  useEffect(() => {
    if (activeTab !== "story" || godotLoaded || godotTimedOut) return;

    timeoutRef.current = setTimeout(() => {
      if (!godotLoaded) setGodotTimedOut(true);
    }, GODOT_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeTab, godotLoaded, godotTimedOut]);

  // ── Once Godot loads: clear timeout + post seed ───────────────────────────
  const handleGodotLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setGodotLoaded(true);
    // Small delay so Godot's JS runtime is initialised before receiving messages
    setTimeout(() => {
      postToGodot({ type: "init_seed", seed: DEFAULT_SEED });
    }, 800);
  }, [postToGodot]);

  // ── Retry handler ─────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setGodotLoaded(false);
    setGodotTimedOut(false);
    // Force iframe reload by key — we flip a nonce
    timeoutRef.current = setTimeout(() => {
      if (!godotLoaded) setGodotTimedOut(true);
    }, GODOT_TIMEOUT_MS);
  }, [godotLoaded]);

  // ── Slider helpers — bridge to both Godot and PlayCanvas ────────────────
  const handleNpcDensity = useCallback(
    (v: number) => {
      setNpcDensity(v);
      postToGodot({
        type: "seed_update",
        character_id: "ninja1",
        property: "npc_density",
        value: v / 100,
      });
      postToPlayCanvas({ type: "world_update", npc_density: parseFloat((v / 100).toFixed(2)) });
    },
    [postToGodot, postToPlayCanvas],
  );

  const handleWeather = useCallback(
    (v: number) => {
      setWeather(v);
      const weatherStr = v < 20 ? "clear" : v < 50 ? "cloudy" : v < 75 ? "rain" : "storm";
      postToGodot({
        type: "seed_update",
        character_id: "ninja1",
        property: "weather_intensity",
        value: v / 100,
      });
      postToPlayCanvas({ type: "world_update", weather: weatherStr });
    },
    [postToGodot, postToPlayCanvas],
  );

  const handleTimeOfDay = useCallback(
    (v: number) => {
      setTimeOfDay(v);
      postToGodot({
        type: "seed_update",
        character_id: "ninja1",
        property: "time_of_day",
        value: v,
      });
      postToPlayCanvas({ type: "world_update", time_of_day: v });
    },
    [postToGodot, postToPlayCanvas],
  );

  const tabs: { id: "story" | "world"; label: string }[] = [
    { id: "story", label: "Story Engine (Godot)" },
    { id: "world", label: "World Engine (PlayCanvas)" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* ------------------------------------------------------------------ */}
      {/* Navbar                                                               */}
      {/* ------------------------------------------------------------------ */}
      <nav className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm"
              style={{ background: INDIGO }}
            >
              G
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
              Game Studio
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
            >
              ← Dashboard
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ background: INDIGO }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = INDIGO_DARK)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = INDIGO)
              }
            >
              ▶ Play Now
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ⚙ Settings
            </button>
            <ExportButton
              projectId={projectId}
              projectType="game"
            />
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        {/* Main column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Tabs */}
          <div className="flex bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors focus:outline-none ${
                    active
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  style={active ? { background: INDIGO } : undefined}
                >
                  {tab.id === "story" ? "🎮 " : "🌍 "}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Engine panel */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {activeTab === "story" ? (
              /* ── Godot 16:9 container ── */
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                {/* Godot iframe — always mounted so WASM download starts immediately */}
                {!godotTimedOut && (
                  <iframe
                    ref={iframeRef}
                    src={GODOT_URL}
                    title="Story Engine — Godot"
                    className="absolute inset-0 w-full h-full border-0"
                    allow="fullscreen; autoplay"
                    onLoad={handleGodotLoad}
                  />
                )}

                {/* Loading overlay — hidden once Godot signals it's ready */}
                {!godotLoaded && !godotTimedOut && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/90 z-10">
                    {/* Animated spinner */}
                    <svg
                      className="animate-spin h-10 w-10 text-indigo-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <p className="text-white text-sm font-semibold">
                      🎮 Loading Game Engine…
                    </p>
                    <p className="text-gray-400 text-xs">
                      (first load may take 30 s while WASM initialises)
                    </p>
                  </div>
                )}

                {/* Three.js fallback — shown after 60 s timeout */}
                {godotTimedOut && <ThreeFallback onRetry={handleRetry} />}
              </div>
            ) : (
              /* ── PlayCanvas 16:9 container ── */
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  ref={pcIframeRef}
                  src={PLAYCANVAS_URL}
                  title="World Engine — PlayCanvas"
                  className="absolute inset-0 w-full h-full border-0"
                  allow="fullscreen; autoplay"
                  onLoad={() => setPcLoaded(true)}
                />

                {/* Loading overlay — visible until iframe fires onLoad */}
                {!pcLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/90 z-10 pointer-events-none">
                    <svg
                      className="animate-spin h-10 w-10 text-indigo-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <p className="text-white text-sm font-semibold">
                      🌍 Loading World Engine…
                    </p>
                    <p className="text-gray-400 text-xs">
                      Connecting to PlayCanvas scene {" "}
                      <span className="text-indigo-400">2433495</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 shadow-sm">
            <span className="flex items-center gap-1.5">
              {godotTimedOut ? (
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
              ) : godotLoaded ? (
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
              ) : activeTab === "story" ? (
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              ) : pcLoaded ? (
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
              {activeTab === "story"
                ? godotTimedOut
                  ? "Godot timeout — Three.js fallback"
                  : godotLoaded
                  ? "Godot ready"
                  : "Godot initialising…"
                : pcLoaded
                ? "PlayCanvas ready"
                : "PlayCanvas loading…"}
            </span>
            <span>|</span>
            <span>
              Engine:{" "}
              <strong className="text-gray-700 dark:text-gray-200">
                {activeTab === "story"
                  ? godotTimedOut
                    ? "Three.js (fallback)"
                    : "Godot 4.x"
                  : "PlayCanvas"}
              </strong>
            </span>
            <span>|</span>
            <span>
              NPC Density:{" "}
              <strong className="text-gray-700 dark:text-gray-200">
                {npcDensity}%
              </strong>
            </span>
            <span>|</span>
            <span>
              Time:{" "}
              <strong className="text-gray-700 dark:text-gray-200">
                {timeOfDay}:00
              </strong>
            </span>
          </div>

          {/* ── Audio Studio ─────────────────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden shadow-sm">
            <AudioStudio />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right sidebar                                                     */}
        {/* ---------------------------------------------------------------- */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
          {/* ── Shared world-parameter sliders (broadcast to both engines) ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs"
                style={{ background: INDIGO }}
              >
                ⚙
              </span>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                World Controls
              </h3>
            </div>

            <Slider
              label="NPC Density"
              value={npcDensity}
              onChange={handleNpcDensity}
            />
            <Slider
              label="Weather Intensity"
              value={weather}
              onChange={handleWeather}
            />
            <Slider
              label="Time of Day"
              value={timeOfDay}
              onChange={handleTimeOfDay}
              min={0}
              max={23}
              unit=":00"
            />

            <button
              className="w-full mt-1 rounded-lg py-2 text-sm font-semibold text-white transition-colors"
              style={{ background: INDIGO }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = INDIGO_DARK)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = INDIGO)
              }
              onClick={() => {
                const weatherStr =
                  weather < 20
                    ? "clear"
                    : weather < 50
                    ? "cloudy"
                    : weather < 75
                    ? "rain"
                    : "storm";
                // Send to Godot
                postToGodot({
                  type: "init_seed",
                  seed: {
                    ...DEFAULT_SEED,
                    world: { biome: "forest", time_of_day: timeOfDay, weather: weatherStr },
                  },
                });
                // Send to PlayCanvas
                postToPlayCanvas({
                  type:        "world_update",
                  npc_density: parseFloat((npcDensity / 100).toFixed(2)),
                  weather:     weatherStr,
                  time_of_day: timeOfDay,
                });
              }}
            >
              Apply to World
            </button>
          </div>

          {/* ── Story tab: Character Inspector ─────────────────────────────── */}
          {activeTab === "story" && (
            <CharacterInspector postToGodot={postToGodot} />
          )}

          {/* ── World tab: PlayCanvas-specific controls ─────────────────────── */}
          {activeTab === "world" && (
            <WorldEngineControls
              postToPlayCanvas={postToPlayCanvas}
              terrain={terrain}
              setTerrain={setTerrain}
              atmosphere={atmosphere}
              setAtmosphere={setAtmosphere}
              npcBehavior={npcBehavior}
              setNpcBehavior={setNpcBehavior}
              npcDensity={npcDensity}
              weather={weather}
              timeOfDay={timeOfDay}
            />
          )}

          {/* ── Scene Stats — live from PlayCanvas postMessage on world tab ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                Scene Stats
              </h3>
              {activeTab === "world" && pcLoaded && (
                <span className="text-xs font-medium text-green-500">
                  ● live
                </span>
              )}
            </div>
            {[
              {
                label: "Active NPCs",
                value:
                  activeTab === "world"
                    ? pcStats.activeNpcs
                    : Math.round(npcDensity * 1.2),
              },
              {
                label: "Weather",
                value:
                  activeTab === "world"
                    ? pcStats.weather
                    : weather < 20
                    ? "Clear"
                    : weather < 50
                    ? "Cloudy"
                    : weather < 75
                    ? "Rainy"
                    : "Storm",
              },
              {
                label: "Lighting",
                value:
                  activeTab === "world"
                    ? pcStats.lighting
                    : timeOfDay < 6 || timeOfDay > 20
                    ? "Night"
                    : timeOfDay < 9 || timeOfDay > 17
                    ? "Golden"
                    : "Day",
              },
              {
                label: "FPS Target",
                value: activeTab === "world" ? pcStats.fps : "60",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Planning Agents */}
          <PlanningAgents />

          {/* Tips card */}
          <div
            className="rounded-xl p-5 text-white"
            style={{ background: INDIGO }}
          >
            <h3 className="text-sm font-semibold mb-2">💡 Tip</h3>
            <p className="text-xs opacity-90 leading-relaxed">
              {activeTab === "world"
                ? "Terrain, atmosphere, and NPC behavior changes are sent live to PlayCanvas via postMessage. Scene Stats update automatically from engine responses."
                : "Adjust NPC Density and Weather sliders to test different world configurations before publishing to players."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
