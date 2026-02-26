// supabase/functions/video-editor-agent/index.ts
// Deno / Supabase Edge Function
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { command: string, master_seed: MasterDirectorJSON }
// Output : { updated_seed, changes_made: string[], description: string }
//
// Speciality: video timeline edits
//   "make the bottle spin faster"
//     → timeline_tracks[action].events[].rotation_speed *= 2
//   "slow down the camera pan"
//     → timeline_tracks[camera].events[].params.speed *= 0.5
//   "add a jump cut at 5 seconds"
//     → pushes cut event into camera track
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

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

interface MasterSeed {
  metadata?: Record<string, unknown>;
  world_state?: Record<string, unknown>;
  characters?: unknown[];
  timeline_tracks?: TimelineTrack[];
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

function ensureTimeline(seed: MasterSeed): TimelineTrack[] {
  if (!Array.isArray(seed.timeline_tracks)) {
    seed.timeline_tracks = [
      { type: "camera", events: [] },
      { type: "action", events: [] },
      { type: "audio",  events: [] },
    ];
  }
  return seed.timeline_tracks;
}

function trackByType(tracks: TimelineTrack[], type: TimelineTrack["type"]): TimelineTrack {
  let t = tracks.find((tr) => tr.type === type);
  if (!t) {
    t = { type, events: [] };
    tracks.push(t);
  }
  return t;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the Video Editor Agent — an AI that modifies video scene timeline data.

You receive:
1. A natural-language editing command from the user.
2. The current master_seed JSON (a MasterDirectorJSON object).

Your task:
- Parse the intent of the command (speed change, new event, property tweak, etc.).
- Apply precise, minimal changes to the master_seed JSON.
- Return ONLY a JSON object with this exact shape:
{
  "updated_seed": { /* the entire updated master_seed */ },
  "changes_made": ["human-readable description of each change made"],
  "description": "one-sentence summary of what changed"
}

Rules:
- timeline_tracks is an array of { type: "camera"|"action"|"audio", events: [...] }.
- Each event has: { t: number, action: string, params: {}, ...extra_props }.
- rotation_speed lives directly on action-track events (e.g. events[].rotation_speed).
- Speed multipliers: "faster" = ×2, "slower" = ×0.5, "much faster" = ×3.
- Time in seconds (t field).
- Seeds are floats 0.0–1.0.
- Do NOT remove existing events unless the command explicitly says to.
- If no relevant track/event exists, create one with sensible defaults.
- Return ONLY the raw JSON — no markdown, no code fences, no commentary.`;
}

function buildUserPrompt(command: string, seed: MasterSeed): string {
  return `## User Command
"${command}"

## Current master_seed
${JSON.stringify(seed, null, 2)}

Apply the command and return the updated JSON as described.`;
}

// ─── Rule-based fallback (no OpenAI key required) ─────────────────────────────

function ruleBasedEdit(command: string, seed: MasterSeed): EditResult {
  const lower = command.toLowerCase();
  const changes: string[] = [];
  const updated: MasterSeed = JSON.parse(JSON.stringify(seed));
  const tracks = ensureTimeline(updated);

  // ── Rotation speed ──────────────────────────────────────────────────────
  const spinMatch = lower.match(/(\w+)(?:er)?\s+(?:spin|rotation|rotate)/);
  if (spinMatch || lower.includes("spin") || lower.includes("rotat")) {
    const multiplier = lower.includes("much faster") ? 3
      : lower.includes("faster") || lower.includes("fast") ? 2
      : lower.includes("slower") || lower.includes("slow") ? 0.5
      : 1.5;

    const actionTrack = trackByType(tracks, "action");
    if (actionTrack.events.length === 0) {
      actionTrack.events.push({ t: 0, action: "spin", params: {}, rotation_speed: 1.0 });
    }
    actionTrack.events = actionTrack.events.map((ev) => ({
      ...ev,
      rotation_speed: ((ev.rotation_speed as number | undefined) ?? 1.0) * multiplier,
    }));
    changes.push(`Set rotation_speed ×${multiplier} on all action events`);
  }

  // ── Camera speed ─────────────────────────────────────────────────────────
  if (lower.includes("camera") || lower.includes("pan") || lower.includes("zoom")) {
    const multiplier = lower.includes("faster") ? 2 : lower.includes("slower") ? 0.5 : 1;
    if (multiplier !== 1) {
      const camTrack = trackByType(tracks, "camera");
      camTrack.events = camTrack.events.map((ev) => ({
        ...ev,
        params: {
          ...ev.params,
          speed: ((ev.params?.speed as number | undefined) ?? 1.0) * multiplier,
        },
      }));
      changes.push(`Set camera speed ×${multiplier}`);
    }
  }

  // ── Jump cut ─────────────────────────────────────────────────────────────
  const jumpMatch = lower.match(/(?:add|insert)?\s*(?:a\s+)?(?:jump\s*cut|cut)\s+at\s+(\d+(?:\.\d+)?)/);
  if (jumpMatch) {
    const t = parseFloat(jumpMatch[1]);
    const camTrack = trackByType(tracks, "camera");
    camTrack.events.push({ t, action: "jump_cut", params: { blend_frames: 0 } });
    camTrack.events.sort((a, b) => a.t - b.t);
    changes.push(`Added jump_cut at t=${t}s`);
  }

  // ── Fade in/out ───────────────────────────────────────────────────────────
  if (lower.includes("fade in")) {
    const camTrack = trackByType(tracks, "camera");
    camTrack.events.unshift({ t: 0, action: "fade_in", params: { duration: 1.0 } });
    changes.push("Added fade_in at t=0");
  }
  if (lower.includes("fade out")) {
    const camTrack = trackByType(tracks, "camera");
    camTrack.events.push({ t: 999, action: "fade_out", params: { duration: 1.0 } });
    changes.push("Added fade_out at end");
  }

  // ── Audio mood ────────────────────────────────────────────────────────────
  const moodMatch = lower.match(/(?:change|set|make)\s+(?:the\s+)?(?:audio|music|mood)\s+(?:to\s+)?(\w+)/);
  if (moodMatch) {
    const mood = moodMatch[1];
    const audioTrack = trackByType(tracks, "audio");
    if (audioTrack.events.length === 0) {
      audioTrack.events.push({ t: 0, action: "play_music", track: mood, params: { mood } });
    } else {
      audioTrack.events = audioTrack.events.map((ev) => ({
        ...ev,
        track: mood,
        params: { ...ev.params, mood },
      }));
    }
    changes.push(`Set audio mood to "${mood}"`);
  }

  if (changes.length === 0) {
    changes.push("(No matching pattern — seed unchanged)");
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
        console.log("[video-editor-agent] GPT changes:", result.changes_made);
        return jsonResponse(result);
      }

      console.warn("[video-editor-agent] OpenAI failed, falling through to rule-based");
    } catch (err) {
      console.warn("[video-editor-agent] GPT error, falling through:", err);
    }
  }

  // ── Rule-based fallback ────────────────────────────────────────────────────
  const result = ruleBasedEdit(command, seed);
  console.log("[video-editor-agent] rule-based changes:", result.changes_made);
  return jsonResponse(result);
});
