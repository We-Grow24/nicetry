"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIGO      = "#6366F1";
const INDIGO_DARK = "#4F46E5";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentId =
  | "story-planner"
  | "character-behavior"
  | "world-planner"
  | "mission-planner"
  | "music-planner"
  | "voice-director"
  | "physics-planner"
  | "quality-checker";

interface AgentDef {
  id: AgentId;
  label: string;
  icon: string;
  functionName: string;
  description: string;
}

const AGENTS: AgentDef[] = [
  { id: "story-planner",       label: "Story",     icon: "📖", functionName: "story-planner-agent",       description: "Generate a 3-act structure with missions, twist & ending." },
  { id: "character-behavior",  label: "Character", icon: "🤖", functionName: "character-behavior-agent",  description: "Build AI state machines and dialogue trees per character." },
  { id: "world-planner",       label: "World",     icon: "🌍", functionName: "world-planner-agent",       description: "Plan SDF layers, POIs, spawn points and weather cycles." },
  { id: "mission-planner",     label: "Mission",   icon: "🎯", functionName: "mission-planner-agent",     description: "Design triggers, rewards, branches and fail conditions." },
  { id: "music-planner",       label: "Music",     icon: "🎵", functionName: "music-planner-agent",       description: "Compose tempo seeds, instruments and mood transitions." },
  { id: "voice-director",      label: "Voice",     icon: "🎙", functionName: "voice-director-agent",      description: "Generate phoneme timing, pitch seeds and SSML hints." },
  { id: "physics-planner",     label: "Physics",   icon: "⚙️", functionName: "physics-planner-agent",     description: "Configure gravity, friction, ragdoll and vehicle physics." },
  { id: "quality-checker",     label: "QA",        icon: "✅", functionName: "quality-checker-agent",     description: "Check LOD, texture budget, shadow quality and FPS targets." },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ─── Individual agent forms ───────────────────────────────────────────────────

function StoryForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [genre,     setGenre]     = useState("rpg");
  const [prompt,    setPrompt]    = useState("A hero searches for a lost relic");
  const [charNames, setCharNames] = useState("Aria, Malachar");

  return (
    <>
      <Field label="Genre">
        <Select value={genre} onChange={setGenre} options={[
          { value: "rpg",        label: "RPG" },
          { value: "shooter",    label: "Shooter" },
          { value: "horror",     label: "Horror" },
          { value: "puzzle",     label: "Puzzle" },
          { value: "platformer", label: "Platformer" },
        ]} />
      </Field>
      <Field label="Prompt">
        <Input value={prompt} onChange={setPrompt} placeholder="Describe the story concept…" />
      </Field>
      <Field label="Character Names (comma-separated)">
        <Input value={charNames} onChange={setCharNames} placeholder="Hero, Villain" />
      </Field>
      <GenerateButton onClick={() => onGenerate({
        genre,
        prompt,
        character_names: charNames.split(",").map((s) => s.trim()).filter(Boolean),
      })} />
    </>
  );
}

function CharacterForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [charId,       setCharId]       = useState("ninja1");
  const [personality,  setPersonality]  = useState("aggressive");

  return (
    <>
      <Field label="Character ID">
        <Input value={charId} onChange={setCharId} placeholder="ninja1" />
      </Field>
      <Field label="Personality">
        <Select value={personality} onChange={setPersonality} options={[
          { value: "aggressive", label: "Aggressive" },
          { value: "cowardly",   label: "Cowardly" },
          { value: "cunning",    label: "Cunning" },
          { value: "neutral",    label: "Neutral" },
        ]} />
      </Field>
      <GenerateButton onClick={() => onGenerate({ character_id: charId, personality })} />
    </>
  );
}

function WorldForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [worldType, setWorldType] = useState("forest");
  const [size,      setSize]      = useState("medium");
  const [density,   setDensity]   = useState("60");

  return (
    <>
      <Field label="World Type">
        <Select value={worldType} onChange={setWorldType} options={[
          { value: "city",    label: "🏙 City" },
          { value: "forest",  label: "🌲 Forest" },
          { value: "ocean",   label: "🌊 Ocean" },
          { value: "desert",  label: "🏜 Desert" },
          { value: "space",   label: "🚀 Space" },
          { value: "dungeon", label: "🏰 Dungeon" },
        ]} />
      </Field>
      <Field label="Size">
        <Select value={size} onChange={setSize} options={[
          { value: "small",      label: "Small" },
          { value: "medium",     label: "Medium" },
          { value: "large",      label: "Large" },
          { value: "open_world", label: "Open World" },
        ]} />
      </Field>
      <Field label="Density (0–100)">
        <Input type="number" value={density} onChange={setDensity} placeholder="60" />
      </Field>
      <GenerateButton onClick={() => onGenerate({
        world_type: worldType,
        size,
        density: Number(density),
      })} />
    </>
  );
}

function MissionForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [protagonist, setProtagonist] = useState("hero");
  const [antagonist,  setAntagonist]  = useState("villain");

  return (
    <>
      <Field label="Protagonist ID">
        <Input value={protagonist} onChange={setProtagonist} placeholder="hero" />
      </Field>
      <Field label="Antagonist ID">
        <Input value={antagonist} onChange={setAntagonist} placeholder="villain" />
      </Field>
      <p className="text-[10px] text-gray-400 mb-3">
        Uses default story structure (Acts 1–3). Run Story agent first for best results.
      </p>
      <GenerateButton onClick={() => onGenerate({
        story_acts: [
          { act: 1, title: "The Awakening",    objective: "Discover the threat",          location: "Ancient Ruins" },
          { act: 2, title: "The Descent",      objective: "Infiltrate the enemy fortress", location: "Dark Forest",    boss: "Necromancer" },
          { act: 3, title: "The Final Stand",  objective: "Defeat the final boss",        location: "Sky Citadel",    boss: "Void Titan" },
        ],
        characters: [
          { id: protagonist, role: "protagonist" },
          { id: antagonist,  role: "antagonist"  },
        ],
      })} />
    </>
  );
}

function MusicForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [zone, setZone] = useState("forest");

  return (
    <>
      <Field label="Zone">
        <Select value={zone} onChange={setZone} options={[
          { value: "city",    label: "🏙 City" },
          { value: "forest",  label: "🌲 Forest" },
          { value: "ocean",   label: "🌊 Ocean" },
          { value: "desert",  label: "🏜 Desert" },
          { value: "space",   label: "🚀 Space" },
          { value: "dungeon", label: "🏰 Dungeon" },
          { value: "boss",    label: "💀 Boss" },
        ]} />
      </Field>
      <p className="text-[10px] text-gray-400 mb-3">
        Mood curve: calm → tense (50%) → epic (80%) → calm (default).
      </p>
      <GenerateButton onClick={() => onGenerate({
        zone,
        mood_curve: [
          { time_pct: 0,   mood: "calm" },
          { time_pct: 50,  mood: "tense" },
          { time_pct: 80,  mood: "epic" },
          { time_pct: 100, mood: "calm" },
        ],
      })} />
    </>
  );
}

function VoiceForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [charId, setCharId] = useState("ninja1");
  const [lines,  setLines]  = useState("Come closer, I dare you.\nYou'll regret this!");

  return (
    <>
      <Field label="Character ID">
        <Input value={charId} onChange={setCharId} placeholder="ninja1" />
      </Field>
      <Field label="Dialogue Lines (one per line)">
        <textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          rows={4}
          placeholder="Enter dialogue lines…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 resize-none"
        />
      </Field>
      <GenerateButton onClick={() => onGenerate({
        character_id: charId,
        dialogue_lines: lines.split("\n").filter(Boolean).map((text, i) => ({
          id:   `line_${i + 1}`,
          text: text.trim(),
        })),
      })} />
    </>
  );
}

function PhysicsForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [worldType,       setWorldType]       = useState("forest");
  const [gameplayStyle, setGameplayStyle]     = useState("arcade");

  return (
    <>
      <Field label="World Type">
        <Select value={worldType} onChange={setWorldType} options={[
          { value: "city",       label: "🏙 City" },
          { value: "forest",     label: "🌲 Forest" },
          { value: "ocean",      label: "🌊 Ocean (Underwater)" },
          { value: "desert",     label: "🏜 Desert" },
          { value: "space",      label: "🚀 Space (Zero-G)" },
          { value: "moon",       label: "🌙 Moon" },
          { value: "dungeon",    label: "🏰 Dungeon" },
        ]} />
      </Field>
      <Field label="Gameplay Style">
        <Select value={gameplayStyle} onChange={setGameplayStyle} options={[
          { value: "arcade",     label: "Arcade (fun > realism)" },
          { value: "realistic",  label: "Realistic" },
          { value: "simulation", label: "Simulation" },
          { value: "casual",     label: "Casual" },
        ]} />
      </Field>
      <GenerateButton onClick={() => onGenerate({ world_type: worldType, gameplay_style: gameplayStyle })} />
    </>
  );
}

function QualityForm({ onGenerate }: { onGenerate: (p: unknown) => void }) {
  const [platform,  setPlatform]  = useState("pc");
  const [worldSize, setWorldSize] = useState("medium");
  const [weather,   setWeather]   = useState("clear");
  const [charCount, setCharCount] = useState("2");
  const [ragdoll,   setRagdoll]   = useState(false);

  return (
    <>
      <Field label="Target Platform">
        <Select value={platform} onChange={setPlatform} options={[
          { value: "pc",      label: "💻 PC" },
          { value: "console", label: "🎮 Console" },
          { value: "mobile",  label: "📱 Mobile" },
          { value: "vr",      label: "🥽 VR" },
        ]} />
      </Field>
      <Field label="World Size">
        <Select value={worldSize} onChange={setWorldSize} options={[
          { value: "small",      label: "Small" },
          { value: "medium",     label: "Medium" },
          { value: "large",      label: "Large" },
          { value: "open_world", label: "Open World" },
        ]} />
      </Field>
      <Field label="Weather">
        <Select value={weather} onChange={setWeather} options={[
          { value: "clear",  label: "☀ Clear" },
          { value: "rain",   label: "🌧 Rain" },
          { value: "storm",  label: "⛈ Storm" },
          { value: "fog",    label: "🌫 Fog" },
        ]} />
      </Field>
      <Field label="Character Count">
        <Input type="number" value={charCount} onChange={setCharCount} placeholder="2" />
      </Field>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="ragdoll"
          checked={ragdoll}
          onChange={(e) => setRagdoll(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="ragdoll" className="text-xs text-gray-600 dark:text-gray-300">
          Ragdoll enabled
        </label>
      </div>
      <GenerateButton onClick={() => onGenerate({
        master_seed: {
          world:           { weather, time_of_day: 12 },
          characters:      Array.from({ length: Number(charCount) || 1 }, (_, i) => ({ id: `char_${i + 1}`, role: i === 0 ? "protagonist" : "npc" })),
          physics:         { ragdoll_enabled: ragdoll },
          world_size:      worldSize,
          target_platform: platform,
        },
      })} />
    </>
  );
}

// ─── Generate button ──────────────────────────────────────────────────────────

function GenerateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors mt-1"
      style={{ background: INDIGO }}
      onMouseEnter={(e) => (e.currentTarget.style.background = INDIGO_DARK)}
      onMouseLeave={(e) => (e.currentTarget.style.background = INDIGO)}
    >
      ▶ Generate
    </button>
  );
}

// ─── Result preview ───────────────────────────────────────────────────────────

function ResultPreview({
  result,
  loading,
  error,
}: {
  result: unknown;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
        <svg className="animate-spin h-4 w-4 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-xs text-gray-500 dark:text-gray-400">Running agent…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Error</p>
        <p className="text-xs text-red-500 dark:text-red-400 break-all">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const json = JSON.stringify(result, null, 2);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Result
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(json)}
          className="text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          Copy JSON
        </button>
      </div>
      <pre className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 font-mono text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed overflow-auto max-h-64 whitespace-pre-wrap break-all">
        {json}
      </pre>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanningAgents() {
  const [activeAgent, setActiveAgent] = useState<AgentId>("story-planner");
  const [results,     setResults]     = useState<Partial<Record<AgentId, unknown>>>({});
  const [loading,     setLoading]     = useState<Partial<Record<AgentId, boolean>>>({});
  const [errors,      setErrors]      = useState<Partial<Record<AgentId, string>>>({});

  const supabase = createClient();

  const runAgent = async (agentId: AgentId, functionName: string, payload: unknown) => {
    setLoading((prev) => ({ ...prev, [agentId]: true }));
    setErrors((prev)  => ({ ...prev, [agentId]: undefined }));
    setResults((prev) => ({ ...prev, [agentId]: undefined }));

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload as Record<string, unknown>,
      });

      if (error) throw new Error(error.message);
      setResults((prev) => ({ ...prev, [agentId]: data?.data ?? data }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, [agentId]: msg }));
    } finally {
      setLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  const currentAgent = AGENTS.find((a) => a.id === activeAgent)!;

  // ── Render current form ───────────────────────────────────────────────────
  const renderForm = () => {
    const gen = (payload: unknown) => runAgent(activeAgent, currentAgent.functionName, payload);

    switch (activeAgent) {
      case "story-planner":      return <StoryForm      onGenerate={gen} />;
      case "character-behavior": return <CharacterForm  onGenerate={gen} />;
      case "world-planner":      return <WorldForm      onGenerate={gen} />;
      case "mission-planner":    return <MissionForm    onGenerate={gen} />;
      case "music-planner":      return <MusicForm      onGenerate={gen} />;
      case "voice-director":     return <VoiceForm      onGenerate={gen} />;
      case "physics-planner":    return <PhysicsForm    onGenerate={gen} />;
      case "quality-checker":    return <QualityForm    onGenerate={gen} />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-md text-white text-xs"
          style={{ background: INDIGO }}
        >
          🧠
        </span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          Planning Agents
        </h3>
      </div>

      {/* Agent tab strip — 4×2 grid of small pills */}
      <div className="grid grid-cols-4 border-b border-gray-200 dark:border-gray-700">
        {AGENTS.map((agent) => {
          const active = activeAgent === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              title={agent.label}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-semibold transition-colors focus:outline-none border-b-2 ${
                active
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <span className="text-base leading-none">{agent.icon}</span>
              <span className="leading-none">{agent.label}</span>
              {/* Loading indicator dot */}
              {!!loading[agent.id] && (
                <span className="inline-block w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
              )}
              {!!results[agent.id] && !loading[agent.id] && (
                <span className="inline-block w-1 h-1 rounded-full bg-green-400" />
              )}
              {!!errors[agent.id] && !loading[agent.id] && (
                <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Form body */}
      <div className="p-4">
        {/* Agent description */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
          {currentAgent.description}
        </p>

        {/* Form inputs */}
        {renderForm()}

        {/* Result */}
        <ResultPreview
          result={results[activeAgent]}
          loading={loading[activeAgent] ?? false}
          error={errors[activeAgent] ?? null}
        />
      </div>
    </div>
  );
}
