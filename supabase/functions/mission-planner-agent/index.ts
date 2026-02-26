// supabase/functions/mission-planner-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { story_acts, characters }
// Output : { triggers, rewards, branches, fail_conditions }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface StoryAct {
  act: number;
  title: string;
  objective: string;
  location: string;
  boss?: string;
}

interface Character {
  id: string;
  role: string;
}

interface RequestPayload {
  story_acts: StoryAct[];
  characters: Character[];
}

interface Trigger {
  id: string;
  event: string;
  condition: string;
  act: number;
}

interface Reward {
  mission_id: string;
  xp: number;
  gold: number;
  item?: string;
  unlock?: string;
}

interface Branch {
  mission_id: string;
  choice: string;
  consequence: string;
  leads_to?: string;
}

interface FailCondition {
  mission_id: string;
  condition: string;
  penalty: string;
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

  const { story_acts, characters } = payload;

  if (!story_acts || !Array.isArray(story_acts) || story_acts.length === 0) {
    return jsonResponse({ error: "story_acts array is required" }, 400);
  }

  const protagonist = characters?.find((c) => c.role === "protagonist")?.id ?? "hero";
  const antagonist  = characters?.find((c) => c.role === "antagonist")?.id  ?? "villain";

  const triggers: Trigger[] = story_acts.flatMap((act) => [
    {
      id:        `trigger_act${act.act}_start`,
      event:     `act_${act.act}_begin`,
      condition: act.act === 1 ? "game_start" : `act_${act.act - 1}_completed`,
      act:       act.act,
    },
    {
      id:        `trigger_act${act.act}_boss`,
      event:     `boss_encounter`,
      condition: `reached_${act.location.replace(/\s+/g, "_").toLowerCase()}`,
      act:       act.act,
    },
  ]);

  const rewards: Reward[] = story_acts.map((act) => ({
    mission_id: `mission_act${act.act}`,
    xp:         act.act * 500,
    gold:       act.act * 250,
    item:       act.act === 1
      ? "Iron Sigil"
      : act.act === 2
      ? `${antagonist}_war_map`
      : "Legendary_Artifact",
    unlock: act.act === story_acts.length
      ? "new_game_plus"
      : `zone_${act.location.replace(/\s+/g, "_").toLowerCase()}`,
  }));

  const branches: Branch[] = [
    {
      mission_id: "mission_act1",
      choice:     `Spare the informant`,
      consequence: `Informant becomes ally in Act 2`,
      leads_to:   "mission_act2_ally_path",
    },
    {
      mission_id: "mission_act2",
      choice:     `Accept ${antagonist}'s offer`,
      consequence: `Unlocks dark path — ${protagonist} gains power but loses an ally`,
      leads_to:   "mission_act3_dark_ending",
    },
    {
      mission_id: "mission_act3",
      choice:     `Sacrifice self to seal the rift`,
      consequence: `True ending unlocked — credits sequence changes`,
      leads_to:   "ending_heroic_sacrifice",
    },
  ];

  const fail_conditions: FailCondition[] = story_acts.map((act) => ({
    mission_id: `mission_act${act.act}`,
    condition:  act.boss ? `${act.boss.replace(/\s+/g, "_")}_survives` : `time_limit_exceeded`,
    penalty:    act.act < story_acts.length ? "restart_checkpoint" : "game_over",
  }));

  return jsonResponse({
    status: "ok",
    data: { triggers, rewards, branches, fail_conditions },
  });
});
