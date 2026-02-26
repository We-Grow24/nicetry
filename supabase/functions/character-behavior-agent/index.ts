// supabase/functions/character-behavior-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { character_id, personality }
// Output : { ai_state_machine: { idle, alert, attack, flee }, dialogue_trees }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface RequestPayload {
  character_id: string;
  personality: string; // e.g. "aggressive", "cowardly", "neutral", "cunning"
}

interface StateConfig {
  transition_trigger: string;
  animation: string;
  speed: number;
  next_states: string[];
}

interface CharacterBehavior {
  character_id: string;
  personality: string;
  ai_state_machine: {
    idle:   StateConfig;
    alert:  StateConfig;
    attack: StateConfig;
    flee:   StateConfig;
  };
  dialogue_trees: {
    state: string;
    lines: string[];
    emotion: string;
  }[];
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

  const { character_id, personality } = payload;

  if (!character_id || !personality) {
    return jsonResponse({ error: "character_id and personality are required" }, 400);
  }

  const p = personality.toLowerCase();

  // ── Personality-driven state machine parameters ────────────────────────────
  const profiles: Record<string, CharacterBehavior["ai_state_machine"]> = {
    aggressive: {
      idle:   { transition_trigger: "enemy_in_range_8m",  animation: "idle_tense",   speed: 0,   next_states: ["alert", "attack"] },
      alert:  { transition_trigger: "enemy_confirmed",    animation: "patrol_fast",  speed: 4.5, next_states: ["attack"] },
      attack: { transition_trigger: "hp_below_10pct",     animation: "attack_heavy", speed: 5.5, next_states: ["flee"] },
      flee:   { transition_trigger: "distance_gt_20m",    animation: "run_panic",    speed: 7.0, next_states: ["idle"] },
    },
    cowardly: {
      idle:   { transition_trigger: "enemy_in_range_15m", animation: "idle_nervous", speed: 0,   next_states: ["alert", "flee"] },
      alert:  { transition_trigger: "enemy_confirmed",    animation: "look_around",  speed: 2.0, next_states: ["flee"] },
      attack: { transition_trigger: "cornered",           animation: "attack_light", speed: 3.0, next_states: ["flee"] },
      flee:   { transition_trigger: "always",             animation: "run_fast",     speed: 8.0, next_states: ["idle"] },
    },
    cunning: {
      idle:   { transition_trigger: "enemy_in_range_12m", animation: "idle_calm",    speed: 0,   next_states: ["alert"] },
      alert:  { transition_trigger: "flank_possible",     animation: "sneak",        speed: 2.5, next_states: ["attack"] },
      attack: { transition_trigger: "outnumbered",        animation: "attack_sneak", speed: 4.0, next_states: ["flee", "idle"] },
      flee:   { transition_trigger: "hp_below_30pct",     animation: "tactical_retreat", speed: 6.0, next_states: ["idle"] },
    },
    neutral: {
      idle:   { transition_trigger: "enemy_in_range_10m", animation: "idle_default", speed: 0,   next_states: ["alert"] },
      alert:  { transition_trigger: "enemy_confirmed",    animation: "walk_fast",    speed: 3.5, next_states: ["attack", "flee"] },
      attack: { transition_trigger: "hp_below_20pct",     animation: "attack_combo", speed: 4.5, next_states: ["flee"] },
      flee:   { transition_trigger: "distance_gt_15m",    animation: "run",          speed: 6.5, next_states: ["idle"] },
    },
  };

  const stateMachine = profiles[p] ?? profiles["neutral"];

  const dialogueTrees: CharacterBehavior["dialogue_trees"] = [
    {
      state: "idle",
      lines: [
        `${p === "aggressive" ? "Come closer, I dare you." : p === "cowardly" ? "Please… just leave me alone." : "Nothing to see here."}`,
        "My post. My rules.",
      ],
      emotion: p === "cowardly" ? "fearful" : p === "aggressive" ? "hostile" : "neutral",
    },
    {
      state: "alert",
      lines: ["Who goes there?", "I heard something…", "Show yourself!"],
      emotion: p === "cowardly" ? "panicked" : "suspicious",
    },
    {
      state: "attack",
      lines: [
        p === "aggressive" ? "You'll regret this!" : p === "cunning" ? "I've been waiting for this." : "Defend yourself!",
        "Take this!",
      ],
      emotion: "aggressive",
    },
    {
      state: "flee",
      lines: ["I… I need to fall back!", "This isn't worth dying for!", "Retreat!"],
      emotion: "fearful",
    },
  ];

  const result: CharacterBehavior = {
    character_id,
    personality,
    ai_state_machine: stateMachine,
    dialogue_trees: dialogueTrees,
  };

  return jsonResponse({ status: "ok", data: result });
});
