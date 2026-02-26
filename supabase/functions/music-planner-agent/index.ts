// supabase/functions/music-planner-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { zone, mood_curve }
// Output : { tempo_seed, instruments, mood_transitions, audio_events }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface MoodPoint {
  time_pct: number; // 0–100
  mood: string;     // "calm" | "tense" | "epic" | "sad" | "mysterious" | "frantic"
}

interface RequestPayload {
  zone: string;
  mood_curve: MoodPoint[];
}

interface MoodTransition {
  from_mood: string;
  to_mood: string;
  at_time_pct: number;
  crossfade_ms: number;
}

interface AudioEvent {
  trigger: string;
  sound: string;
  volume: number;
  loop: boolean;
}

interface MusicPlan {
  zone: string;
  tempo_seed: number;
  base_bpm: number;
  key_signature: string;
  instruments: string[];
  mood_transitions: MoodTransition[];
  audio_events: AudioEvent[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: RequestPayload;
  try {
    payload = (await req.json()) as RequestPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { zone, mood_curve } = payload;

  if (!zone) {
    return jsonResponse({ error: "zone is required" }, 400);
  }

  const curve: MoodPoint[] = mood_curve ?? [
    { time_pct: 0,   mood: "calm" },
    { time_pct: 50,  mood: "tense" },
    { time_pct: 80,  mood: "epic" },
    { time_pct: 100, mood: "calm" },
  ];

  // ── Zone instrument palettes ──────────────────────────────────────────────
  const zoneProfiles: Record<string, { base_bpm: number; key: string; instruments: string[] }> = {
    city:    { base_bpm: 110, key: "D minor",  instruments: ["synth_bass", "electric_guitar", "drum_machine", "strings", "brass"] },
    forest:  { base_bpm: 72,  key: "G major",  instruments: ["flute", "harp", "acoustic_guitar", "ambient_pad", "birds_sfx"] },
    dungeon: { base_bpm: 85,  key: "C# minor", instruments: ["pipe_organ", "choir", "low_brass", "taiko_drums", "bass_strings"] },
    ocean:   { base_bpm: 65,  key: "Eb major", instruments: ["marimba", "vibraphone", "whale_song_sfx", "flowing_strings", "wind_chimes"] },
    desert:  { base_bpm: 90,  key: "F minor",  instruments: ["oud", "tabla", "duduk", "low_strings", "sand_sfx"] },
    space:   { base_bpm: 55,  key: "A minor",  instruments: ["theremin", "synth_pad", "choir", "sub_bass", "cosmic_sfx"] },
    boss:    { base_bpm: 140, key: "B minor",  instruments: ["full_orchestra", "choir", "heavy_drums", "brass_staccato", "electric_guitar"] },
  };

  const profile = zoneProfiles[zone.toLowerCase()] ?? zoneProfiles["forest"];

  // ── Tempo seed: hash zone name to stable float ────────────────────────────
  const tempoSeed = zone.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 1000 / 1000;

  // ── Build mood transitions from curve ────────────────────────────────────
  const mood_transitions: MoodTransition[] = [];
  for (let i = 1; i < curve.length; i++) {
    mood_transitions.push({
      from_mood:   curve[i - 1].mood,
      to_mood:     curve[i].mood,
      at_time_pct: curve[i].time_pct,
      crossfade_ms: curve[i].mood === "epic" ? 2000 : curve[i].mood === "calm" ? 4000 : 1500,
    });
  }

  // ── Standard audio events ─────────────────────────────────────────────────
  const audio_events: AudioEvent[] = [
    { trigger: "player_enters_zone",   sound: `${zone}_ambient_loop`,    volume: 0.6, loop: true  },
    { trigger: "combat_start",         sound: `${zone}_combat_theme`,    volume: 0.9, loop: true  },
    { trigger: "enemy_defeated",       sound: "victory_sting",           volume: 0.8, loop: false },
    { trigger: "player_low_health",    sound: "heartbeat_sfx",           volume: 0.5, loop: true  },
    { trigger: "boss_encounter",       sound: `${zone}_boss_theme`,      volume: 1.0, loop: true  },
    { trigger: "player_exits_zone",    sound: `${zone}_ambient_fadeout`, volume: 0.6, loop: false },
  ];

  const plan: MusicPlan = {
    zone,
    tempo_seed:      tempoSeed,
    base_bpm:        profile.base_bpm,
    key_signature:   profile.key,
    instruments:     profile.instruments,
    mood_transitions,
    audio_events,
  };

  return jsonResponse({ status: "ok", data: plan });
});
