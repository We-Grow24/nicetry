/**
 * POST /api/video-edit
 *
 * Smart-router for video editing AI commands.
 * Classifies the command intent, then calls the appropriate agent
 * (video-editor-agent for timeline/animation edits,
 *  scene-agent for world/environment edits).
 *
 * In production the agents run as Supabase Edge Functions.
 * This route implements the same rule-based + GPT logic inline so it
 * works locally without needing `supabase functions serve`.
 *
 * Body  : { command: string, master_seed: object }
 * Returns: { updated_seed, changes_made: string[], description: string, agent: string }
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  t: number;
  action: string;
  params: Record<string, unknown>;
  rotation_speed?: number;
  [key: string]: unknown;
}

interface TimelineTrack {
  type: "camera" | "action" | "audio";
  events: TimelineEvent[];
}

interface SdfLayer {
  id?: string;
  shape?: string;
  blend_mode?: string;
  scene_type?: string;
  biome?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Lighting {
  ambient?: string;
  intensity?: number;
  bloom?: boolean;
  time_of_day?: number;
  color_temperature?: number;
  sun_direction?: number[];
  [key: string]: unknown;
}

interface MasterSeed {
  metadata?: Record<string, unknown>;
  world_state?: {
    sdf_layers?: SdfLayer[];
    lighting?: Lighting;
    weather?: { type?: string; intensity?: number };
    [key: string]: unknown;
  };
  characters?: unknown[];
  timeline_tracks?: TimelineTrack[];
  gameplay?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EditResult {
  updated_seed: MasterSeed;
  changes_made: string[];
  description: string;
  agent: string;
}

// ─── Intent classification ────────────────────────────────────────────────────

const SCENE_KEYWORDS = [
  "background", "scene", "environment", "setting", "biome",
  "tokyo", "forest", "jungle", "desert", "ocean", "beach", "space",
  "sky", "galaxy", "studio", "city", "urban", "cyberpunk",
  "sunset", "sunrise", "dawn", "dusk", "night", "noon", "morning", "evening",
  "rain", "snow", "fog", "storm", "weather", "sunny", "cloudy", "overcast",
  "lighting", "light", "dark", "bright", "dim", "bloom", "glow", "neon",
  "ambient", "atmosphere", "mood", "warm", "cool", "temperature",
  "time of day", "time_of_day",
];

const VIDEO_KEYWORDS = [
  "spin", "rotate", "rotation", "speed", "faster", "slower",
  "camera", "pan", "zoom", "cut", "jump cut", "fade", "transition",
  "animation", "animate", "motion", "move", "track",
  "timeline", "keyframe", "action", "event",
  "audio", "music", "sound", "beat", "rhythm",
  "play", "pause", "loop",
];

type AgentType = "video-editor" | "scene";

function classifyIntent(command: string): AgentType {
  const lower = command.toLowerCase();

  let sceneScore = 0;
  let videoScore = 0;

  for (const kw of SCENE_KEYWORDS) {
    if (lower.includes(kw)) sceneScore++;
  }
  for (const kw of VIDEO_KEYWORDS) {
    if (lower.includes(kw)) videoScore++;
  }

  return sceneScore >= videoScore ? "scene" : "video-editor";
}

// ─── Scene presets ────────────────────────────────────────────────────────────

const SCENE_PRESETS = [
  { keywords: ["tokyo", "japan", "neon", "cyberpunk", "city", "urban"], scene_type: "tokyo_sunset",    biome: "urban",   time_of_day: 18.5, ambient: "#2d1b69", bloom: true,  sun_direction: [-0.3, 0.2, -0.9], color_temperature: 3200 },
  { keywords: ["forest", "jungle", "woods", "nature"],                  scene_type: "forest_clearing", biome: "forest",  time_of_day: 10,   ambient: "#0d3318", bloom: false, sun_direction: [0.5, 0.8, 0.3],   color_temperature: 5500 },
  { keywords: ["desert", "sand", "dune"],                               scene_type: "desert_noon",     biome: "desert",  time_of_day: 12,   ambient: "#7a5c1e", bloom: false, sun_direction: [0, 1, 0],          color_temperature: 6000 },
  { keywords: ["ocean", "beach", "sea", "coast"],                       scene_type: "ocean_shore",     biome: "ocean",   time_of_day: 14,   ambient: "#0e4d6e", bloom: false, sun_direction: [0.3, 0.7, 0.6],   color_temperature: 5800 },
  { keywords: ["space", "galaxy", "stars", "cosmos", "nebula"],        scene_type: "deep_space",      biome: "space",   time_of_day: 0,    ambient: "#00000f", bloom: true,  sun_direction: [0.1, 0, -1],       color_temperature: 10000 },
  { keywords: ["studio", "white", "minimal", "product"],               scene_type: "studio_white",    biome: "studio",  time_of_day: 12,   ambient: "#e8e8e8", bloom: false, sun_direction: [0.4, 0.9, 0.2],   color_temperature: 6500 },
  { keywords: ["sunset", "dusk", "golden", "warm"],                    scene_type: "golden_sunset",   biome: "plains",  time_of_day: 18,   ambient: "#7c3d1a", bloom: true,  sun_direction: [-0.8, 0.15, -0.6], color_temperature: 2700 },
  { keywords: ["night", "midnight", "dark", "moon"],                   scene_type: "night_sky",       biome: "plains",  time_of_day: 23,   ambient: "#0a0a1a", bloom: true,  sun_direction: [0, -1, 0],         color_temperature: 8000 },
  { keywords: ["dawn", "morning", "sunrise"],                          scene_type: "dawn_mist",       biome: "plains",  time_of_day: 6,    ambient: "#4a3520", bloom: false, sun_direction: [0.9, 0.2, 0.4],   color_temperature: 4000 },
] as const;

const WEATHER_PRESETS = [
  { keywords: ["rain", "drizzle", "downpour", "storm"],    type: "rain",   intensity: 0.7 },
  { keywords: ["snow", "blizzard", "winter"],              type: "snow",   intensity: 0.6 },
  { keywords: ["fog", "mist", "haze"],                     type: "fog",    intensity: 0.5 },
  { keywords: ["clear", "sunny", "cloudless"],             type: "clear",  intensity: 0   },
  { keywords: ["cloudy", "overcast", "grey", "gray"],      type: "clouds", intensity: 0.4 },
] as const;

// ─── Rule-based scene edit ────────────────────────────────────────────────────

function applySceneRules(command: string, seed: MasterSeed): EditResult {
  const lower = command.toLowerCase();
  const changes: string[] = [];
  const updated: MasterSeed = JSON.parse(JSON.stringify(seed));

  if (!updated.world_state) updated.world_state = {};
  const ws = updated.world_state;
  if (!Array.isArray(ws.sdf_layers)) ws.sdf_layers = [{ id: "bg_0", shape: "plane", blend_mode: "normal", params: {} }];
  if (!ws.lighting) ws.lighting = { ambient: "#1a1a2e", intensity: 1.0, bloom: false, time_of_day: 12 };
  if (!ws.weather)  ws.weather  = { type: "clear", intensity: 0 };

  for (const p of SCENE_PRESETS) {
    if (p.keywords.some((kw) => lower.includes(kw))) {
      ws.sdf_layers![0] = { ...ws.sdf_layers![0], scene_type: p.scene_type, biome: p.biome };
      ws.lighting = { ...ws.lighting, ambient: p.ambient, bloom: p.bloom, time_of_day: p.time_of_day, sun_direction: [...p.sun_direction], color_temperature: p.color_temperature };
      changes.push(`Set scene → "${p.scene_type}" (${p.biome})`);
      changes.push(`Lighting: time_of_day=${p.time_of_day}, bloom=${p.bloom}`);
      break;
    }
  }

  for (const p of WEATHER_PRESETS) {
    if (p.keywords.some((kw) => lower.includes(kw))) {
      ws.weather = { type: p.type, intensity: p.intensity };
      changes.push(`Weather → ${p.type} (intensity ${p.intensity})`);
      break;
    }
  }

  if (lower.includes("neon") || lower.includes("bloom")) {
    ws.lighting!.bloom = true;
    changes.push("Enabled bloom");
  }
  if (lower.includes("bright")) {
    ws.lighting!.intensity = Math.min(2, ((ws.lighting!.intensity as number) ?? 1) + 0.4);
    changes.push("Increased brightness");
  }
  if (lower.includes("dark") || lower.includes("dim")) {
    ws.lighting!.intensity = Math.max(0.1, ((ws.lighting!.intensity as number) ?? 1) - 0.4);
    changes.push("Decreased brightness");
  }

  if (changes.length === 0) changes.push("(No matching scene pattern)");
  return { updated_seed: updated, changes_made: changes, description: changes.join("; "), agent: "scene-agent" };
}

// ─── Rule-based video edit ────────────────────────────────────────────────────

function ensureTrack(tracks: TimelineTrack[], type: TimelineTrack["type"]): TimelineTrack {
  let t = tracks.find((tr) => tr.type === type);
  if (!t) { t = { type, events: [] }; tracks.push(t); }
  return t;
}

function applyVideoRules(command: string, seed: MasterSeed): EditResult {
  const lower = command.toLowerCase();
  const changes: string[] = [];
  const updated: MasterSeed = JSON.parse(JSON.stringify(seed));

  if (!Array.isArray(updated.timeline_tracks)) {
    updated.timeline_tracks = [
      { type: "camera", events: [] },
      { type: "action", events: [] },
      { type: "audio",  events: [] },
    ];
  }
  const tracks = updated.timeline_tracks;

  // Rotation speed
  if (lower.includes("spin") || lower.includes("rotat")) {
    const mult = lower.includes("much faster") ? 3 : lower.includes("faster") || lower.includes("fast") ? 2 : lower.includes("slower") || lower.includes("slow") ? 0.5 : 1.5;
    const at = ensureTrack(tracks, "action");
    if (at.events.length === 0) at.events.push({ t: 0, action: "spin", params: {}, rotation_speed: 1.0 });
    at.events = at.events.map((e) => ({ ...e, rotation_speed: ((e.rotation_speed as number) ?? 1) * mult }));
    changes.push(`rotation_speed ×${mult}`);
  }

  // Camera speed
  if (lower.includes("camera") || lower.includes("pan") || lower.includes("zoom")) {
    const mult = lower.includes("faster") ? 2 : lower.includes("slower") ? 0.5 : 0;
    if (mult) {
      const ct = ensureTrack(tracks, "camera");
      ct.events = ct.events.map((e) => ({ ...e, params: { ...e.params, speed: ((e.params?.speed as number) ?? 1) * mult } }));
      changes.push(`Camera speed ×${mult}`);
    }
  }

  // Jump cut
  const jm = lower.match(/(?:add|insert)?\s*(?:a\s+)?(?:jump\s*cut|cut)\s+at\s+(\d+(?:\.\d+)?)/);
  if (jm) {
    const t = parseFloat(jm[1]);
    const ct = ensureTrack(tracks, "camera");
    ct.events.push({ t, action: "jump_cut", params: { blend_frames: 0 } });
    ct.events.sort((a, b) => a.t - b.t);
    changes.push(`jump_cut at t=${t}s`);
  }

  // Fades
  if (lower.includes("fade in"))  { ensureTrack(tracks, "camera").events.unshift({ t: 0,   action: "fade_in",  params: { duration: 1 } }); changes.push("fade_in at t=0"); }
  if (lower.includes("fade out")) { ensureTrack(tracks, "camera").events.push({   t: 9999, action: "fade_out", params: { duration: 1 } }); changes.push("fade_out at end"); }

  // Audio mood
  const am = lower.match(/(?:change|set|make)\s+(?:the\s+)?(?:audio|music|mood)\s+(?:to\s+)?(\w+)/);
  if (am) {
    const mood = am[1];
    const at = ensureTrack(tracks, "audio");
    at.events = at.events.length
      ? at.events.map((e) => ({ ...e, track: mood, params: { ...e.params, mood } }))
      : [{ t: 0, action: "play_music", track: mood, params: { mood } }];
    changes.push(`Audio mood → "${mood}"`);
  }

  if (changes.length === 0) changes.push("(No matching video pattern)");
  return { updated_seed: updated, changes_made: changes, description: changes.join("; "), agent: "video-editor-agent" };
}

// ─── GPT path (shared) ────────────────────────────────────────────────────────

async function callGpt(
  apiKey: string,
  systemPrompt: string,
  userContent: string
): Promise<EditResult | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userContent },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as EditResult;
  } catch {
    return null;
  }
}

const VIDEO_SYSTEM_PROMPT = `You are the Video Editor Agent.
You modify timeline_tracks in a master_seed JSON.
timeline_tracks is: [{ type: "camera"|"action"|"audio", events: [{t, action, params, rotation_speed?, ...}] }]
Return ONLY: { "updated_seed": {...}, "changes_made": ["..."], "description": "..." }
No markdown, no fences.`;

const SCENE_SYSTEM_PROMPT = `You are the Scene Agent.
You modify world_state in a master_seed JSON.
world_state shape: { sdf_layers: [{id, scene_type, biome, params}], lighting: {ambient, intensity, bloom, time_of_day, color_temperature, sun_direction}, weather: {type, intensity} }
Return ONLY: { "updated_seed": {...}, "changes_made": ["..."], "description": "..." }
No markdown, no fences.`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { command?: string; master_seed?: MasterSeed };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { command, master_seed } = body;

  if (!command?.trim()) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  const seed: MasterSeed = master_seed ?? {};
  const agent = classifyIntent(command);
  const apiKey = process.env.OPENAI_API_KEY;

  // Try delegating to deployed Supabase Edge Functions first
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const fnName = agent === "scene" ? "scene-agent" : "video-editor-agent";
    try {
      const edgeRes = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command, master_seed: seed }),
      });

      if (edgeRes.ok) {
        const result = await edgeRes.json() as EditResult;
        result.agent = fnName;
        return NextResponse.json(result);
      }
      console.warn(`[video-edit] edge fn ${fnName} returned ${edgeRes.status} — falling through`);
    } catch (err) {
      console.warn("[video-edit] edge fn call failed:", err);
    }
  }

  // Try OpenAI directly
  if (apiKey) {
    const systemPrompt = agent === "scene" ? SCENE_SYSTEM_PROMPT : VIDEO_SYSTEM_PROMPT;
    const userContent = `Command: "${command}"\n\nmaster_seed:\n${JSON.stringify(seed, null, 2)}`;
    const result = await callGpt(apiKey, systemPrompt, userContent);
    if (result) {
      result.agent = agent === "scene" ? "scene-agent (gpt)" : "video-editor-agent (gpt)";
      return NextResponse.json(result);
    }
  }

  // Rule-based fallback — always works, no external dependencies
  const result =
    agent === "scene"
      ? applySceneRules(command, seed)
      : applyVideoRules(command, seed);

  return NextResponse.json(result);
}
