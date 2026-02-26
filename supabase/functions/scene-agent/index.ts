// supabase/functions/scene-agent/index.ts
// Deno / Supabase Edge Function
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { command: string, master_seed: MasterDirectorJSON }
// Output : { updated_seed, changes_made: string[], description: string }
//
// Speciality: world_state edits — backgrounds, lighting, weather, SDF layers
//   "Change background to Tokyo sunset"
//     → world_state.sdf_layers[0].scene_type = "tokyo_sunset"
//     → world_state.lighting.time_of_day = 18.5
//   "Make it rain"
//     → world_state.weather = { type: "rain", intensity: 0.7 }
//   "Night scene with neon lights"
//     → world_state.lighting.time_of_day = 23, world_state.lighting.bloom = true
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  sun_direction?: number[];
  intensity?: number;
  bloom?: boolean;
  time_of_day?: number;
  color_temperature?: number;
  [key: string]: unknown;
}

interface Weather {
  type?: string;
  intensity?: number;
  [key: string]: unknown;
}

interface WorldState {
  sdf_layers?: SdfLayer[];
  lighting?: Lighting;
  weather?: Weather;
  [key: string]: unknown;
}

interface MasterSeed {
  metadata?: Record<string, unknown>;
  world_state?: WorldState;
  characters?: unknown[];
  timeline_tracks?: unknown[];
  gameplay?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RequestPayload {
  command: string;
  master_seed: MasterSeed;
}

interface EditResult {
  updated_seed: MasterSeed;
  changes_made: string[];
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ensureWorldState(seed: MasterSeed): WorldState {
  if (!seed.world_state || typeof seed.world_state !== "object") {
    seed.world_state = {};
  }
  if (!Array.isArray(seed.world_state.sdf_layers)) {
    seed.world_state.sdf_layers = [{ id: "bg_0", shape: "plane", blend_mode: "normal", params: {} }];
  }
  if (!seed.world_state.lighting) {
    seed.world_state.lighting = { ambient: "#1a1a2e", intensity: 1.0, bloom: false, time_of_day: 12 };
  }
  if (!seed.world_state.weather) {
    seed.world_state.weather = { type: "clear", intensity: 0 };
  }
  return seed.world_state;
}

// ─── Scene catalogue ─────────────────────────────────────────────────────────
// Maps keywords → scene_type slug + lighting preset

const SCENE_PRESETS: Array<{
  keywords: string[];
  scene_type: string;
  biome: string;
  time_of_day: number;
  ambient: string;
  bloom: boolean;
  sun_direction: number[];
  color_temperature: number;
}> = [
  {
    keywords: ["tokyo", "japan", "city", "urban", "neon", "cyberpunk"],
    scene_type: "tokyo_sunset",
    biome: "urban",
    time_of_day: 18.5,
    ambient: "#2d1b69",
    bloom: true,
    sun_direction: [-0.3, 0.2, -0.9],
    color_temperature: 3200,
  },
  {
    keywords: ["forest", "jungle", "woods", "trees", "nature"],
    scene_type: "forest_clearing",
    biome: "forest",
    time_of_day: 10,
    ambient: "#0d3318",
    bloom: false,
    sun_direction: [0.5, 0.8, 0.3],
    color_temperature: 5500,
  },
  {
    keywords: ["desert", "sand", "sahara", "dune", "arid"],
    scene_type: "desert_noon",
    biome: "desert",
    time_of_day: 12,
    ambient: "#7a5c1e",
    bloom: false,
    sun_direction: [0, 1, 0],
    color_temperature: 6000,
  },
  {
    keywords: ["ocean", "beach", "sea", "water", "coast", "island"],
    scene_type: "ocean_shore",
    biome: "ocean",
    time_of_day: 14,
    ambient: "#0e4d6e",
    bloom: false,
    sun_direction: [0.3, 0.7, 0.6],
    color_temperature: 5800,
  },
  {
    keywords: ["space", "galaxy", "stars", "cosmos", "nebula", "planet"],
    scene_type: "deep_space",
    biome: "space",
    time_of_day: 0,
    ambient: "#00000f",
    bloom: true,
    sun_direction: [0.1, 0, -1],
    color_temperature: 10000,
  },
  {
    keywords: ["studio", "white", "minimal", "clean", "product"],
    scene_type: "studio_white",
    biome: "studio",
    time_of_day: 12,
    ambient: "#e8e8e8",
    bloom: false,
    sun_direction: [0.4, 0.9, 0.2],
    color_temperature: 6500,
  },
  {
    keywords: ["sunset", "dusk", "golden", "evening", "warm"],
    scene_type: "golden_sunset",
    biome: "plains",
    time_of_day: 18,
    ambient: "#7c3d1a",
    bloom: true,
    sun_direction: [-0.8, 0.15, -0.6],
    color_temperature: 2700,
  },
  {
    keywords: ["night", "midnight", "dark", "moon", "stars"],
    scene_type: "night_sky",
    biome: "plains",
    time_of_day: 23,
    ambient: "#0a0a1a",
    bloom: true,
    sun_direction: [0, -1, 0],
    color_temperature: 8000,
  },
  {
    keywords: ["dawn", "morning", "sunrise", "early"],
    scene_type: "dawn_mist",
    biome: "plains",
    time_of_day: 6,
    ambient: "#4a3520",
    bloom: false,
    sun_direction: [0.9, 0.2, 0.4],
    color_temperature: 4000,
  },
];

const WEATHER_PRESETS: Array<{ keywords: string[]; type: string; intensity: number }> = [
  { keywords: ["rain", "rainy", "drizzle", "downpour", "storm", "thunderstorm"], type: "rain",  intensity: 0.7 },
  { keywords: ["snow", "snowy", "blizzard", "winter", "ice"],                    type: "snow",  intensity: 0.6 },
  { keywords: ["fog", "foggy", "mist", "misty", "haze"],                         type: "fog",   intensity: 0.5 },
  { keywords: ["clear", "sunny", "bright", "cloudless"],                          type: "clear", intensity: 0   },
  { keywords: ["cloudy", "overcast", "grey", "gray"],                             type: "clouds",intensity: 0.4 },
  { keywords: ["wind", "windy", "gust", "breeze"],                               type: "wind",  intensity: 0.6 },
];

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the Scene Agent — an AI that modifies the world_state of a video scene.

You receive:
1. A natural-language scene command from the user.
2. The current master_seed JSON.

Your task:
- Parse the scene/environment intent of the command.
- Apply changes to world_state.sdf_layers, world_state.lighting, and world_state.weather.
- Return ONLY a JSON object with this exact shape:
{
  "updated_seed": { /* the entire updated master_seed */ },
  "changes_made": ["human-readable description of each change"],
  "description": "one-sentence summary of what changed"
}

world_state shape:
{
  "sdf_layers": [{ "id": "bg_0", "scene_type": "<slug>", "biome": "<biome>", "params": {} }],
  "lighting": {
    "ambient": "<hex>",
    "intensity": 1.0,
    "bloom": false,
    "time_of_day": 12.0,          // 0–24 float
    "color_temperature": 6500,    // Kelvin
    "sun_direction": [x, y, z]    // normalised
  },
  "weather": { "type": "<clear|rain|snow|fog|clouds|wind|storm>", "intensity": 0.0–1.0 }
}

Rules:
- "Tokyo sunset" → scene_type="tokyo_sunset", time_of_day=18.5, bloom=true.
- time_of_day: dawn=6, morning=9, noon=12, afternoon=15, sunset=18, dusk=20, night=23.
- Neon/cyberpunk → bloom=true, dark ambient.
- Seeds are floats 0.0–1.0.
- Return ONLY raw JSON, no markdown.`;
}

function buildUserPrompt(command: string, seed: MasterSeed): string {
  return `## User Command
"${command}"

## Current master_seed
${JSON.stringify(seed, null, 2)}

Apply the command and return the updated JSON.`;
}

// ─── Rule-based fallback ──────────────────────────────────────────────────────

function ruleBasedEdit(command: string, seed: MasterSeed): EditResult {
  const lower = command.toLowerCase();
  const changes: string[] = [];
  const updated: MasterSeed = JSON.parse(JSON.stringify(seed));
  const ws = ensureWorldState(updated);

  // ── Scene / background preset ─────────────────────────────────────────────
  let matchedScene = false;
  for (const preset of SCENE_PRESETS) {
    if (preset.keywords.some((kw) => lower.includes(kw))) {
      ws.sdf_layers![0] = {
        ...ws.sdf_layers![0],
        scene_type: preset.scene_type,
        biome: preset.biome,
      };
      ws.lighting = {
        ...ws.lighting,
        ambient:           preset.ambient,
        bloom:             preset.bloom,
        time_of_day:       preset.time_of_day,
        sun_direction:     preset.sun_direction,
        color_temperature: preset.color_temperature,
      };
      changes.push(`Set scene to "${preset.scene_type}" (${preset.biome})`);
      changes.push(`Set time_of_day=${preset.time_of_day}, ambient=${preset.ambient}`);
      if (preset.bloom) changes.push("Enabled bloom");
      matchedScene = true;
      break;
    }
  }

  // ── Explicit time of day ──────────────────────────────────────────────────
  const timeMatch = lower.match(/(?:time|at)\s+(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/);
  if (!matchedScene && timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    const tod = h + m / 60;
    ws.lighting!.time_of_day = tod;
    changes.push(`Set time_of_day=${tod.toFixed(1)}`);
  }

  // ── Bloom / neon ──────────────────────────────────────────────────────────
  if (lower.includes("neon") || lower.includes("bloom") || lower.includes("glow")) {
    ws.lighting!.bloom = true;
    changes.push("Enabled bloom/neon glow");
  }
  if (lower.includes("no bloom") || lower.includes("no glow") || lower.includes("realistic")) {
    ws.lighting!.bloom = false;
    changes.push("Disabled bloom");
  }

  // ── Weather ───────────────────────────────────────────────────────────────
  for (const preset of WEATHER_PRESETS) {
    if (preset.keywords.some((kw) => lower.includes(kw))) {
      ws.weather = { type: preset.type, intensity: preset.intensity };
      changes.push(`Set weather to "${preset.type}" (intensity ${preset.intensity})`);
      break;
    }
  }

  // ── Lighting intensity ────────────────────────────────────────────────────
  if (lower.includes("bright") || lower.includes("brighter")) {
    ws.lighting!.intensity = Math.min(2.0, ((ws.lighting!.intensity as number) ?? 1) + 0.4);
    changes.push("Increased lighting intensity");
  }
  if (lower.includes("dark") || lower.includes("darker") || lower.includes("dim")) {
    ws.lighting!.intensity = Math.max(0.1, ((ws.lighting!.intensity as number) ?? 1) - 0.4);
    changes.push("Decreased lighting intensity");
  }

  if (changes.length === 0) {
    changes.push("(No matching scene pattern — seed unchanged)");
  }

  return {
    updated_seed: updated,
    changes_made: changes,
    description: changes.join("; "),
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { command, master_seed } = payload;

  if (!command) {
    return jsonResponse({ error: "Missing required field: command" }, 422);
  }

  const seed: MasterSeed = master_seed ?? {};
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  // ── GPT path ──────────────────────────────────────────────────────────────
  if (openAiKey) {
    try {
      const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 2500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user",   content: buildUserPrompt(command, seed) },
          ],
        }),
      });

      if (gptRes.ok) {
        const data = await gptRes.json();
        const raw: string = data.choices?.[0]?.message?.content ?? "{}";
        const result = JSON.parse(raw) as EditResult;
        console.log("[scene-agent] GPT changes:", result.changes_made);
        return jsonResponse(result);
      }

      console.warn("[scene-agent] OpenAI failed, falling through to rule-based");
    } catch (err) {
      console.warn("[scene-agent] GPT error, falling through:", err);
    }
  }

  // ── Rule-based fallback ────────────────────────────────────────────────────
  const result = ruleBasedEdit(command, seed);
  console.log("[scene-agent] rule-based changes:", result.changes_made);
  return jsonResponse(result);
});
