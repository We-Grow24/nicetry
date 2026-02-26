// supabase/functions/story-planner-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { genre, prompt, character_names }
// Output : { acts: 3, missions: [], twist: "", ending: "" }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface RequestPayload {
  genre: string;
  prompt: string;
  character_names: string[];
}

interface StoryPlan {
  acts: number;
  missions: {
    act: number;
    title: string;
    objective: string;
    location: string;
    boss?: string;
  }[];
  twist: string;
  ending: string;
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

  const { genre, prompt, character_names } = payload;

  if (!genre || !prompt) {
    return jsonResponse({ error: "genre and prompt are required" }, 400);
  }

  const names = character_names ?? [];
  const protagonist = names[0] ?? "Hero";
  const antagonist  = names[1] ?? "Shadow";

  // ── Deterministic seed-based story generation ──────────────────────────────
  const genreSeeds: Record<string, { locations: string[]; bossTypes: string[] }> = {
    rpg:      { locations: ["Ancient Ruins", "Dark Forest", "Sky Citadel"],   bossTypes: ["Necromancer", "Dragon Lord", "Void Titan"] },
    shooter:  { locations: ["Urban Warzone", "Research Facility", "Orbital Station"], bossTypes: ["Mercenary General", "Corrupted AI", "War Machine"] },
    horror:   { locations: ["Abandoned Hospital", "Cursed Mansion", "Shadow Realm"],  bossTypes: ["Haunted Entity", "The Watcher", "Soul Devourer"] },
    puzzle:   { locations: ["Ancient Temple", "Data Vault", "Mirror Labyrinth"],       bossTypes: ["Riddle Keeper", "Logic Engine", "Reality Weaver"] },
    platformer: { locations: ["Crystal Caves", "Clockwork City", "Storm Peaks"],       bossTypes: ["Golem King", "Gear Tyrant", "Thunder Wraith"] },
  };

  const seed = genreSeeds[genre.toLowerCase()] ?? genreSeeds["rpg"];

  const plan: StoryPlan = {
    acts: 3,
    missions: [
      {
        act: 1,
        title: "The Awakening",
        objective: `${protagonist} discovers the truth behind the world's corruption. Investigate the first disturbance tied to "${prompt}".`,
        location: seed.locations[0],
        boss: undefined,
      },
      {
        act: 2,
        title: "The Descent",
        objective: `${protagonist} and allies push into ${antagonist}'s territory. Survive the ambush at the ${seed.locations[1]}.`,
        location: seed.locations[1],
        boss: seed.bossTypes[0],
      },
      {
        act: 3,
        title: "The Final Stand",
        objective: `Confront ${antagonist} at the ${seed.locations[2]}. End the cycle.`,
        location: seed.locations[2],
        boss: seed.bossTypes[2] ?? seed.bossTypes[1],
      },
    ],
    twist: `${antagonist} was once ${protagonist}'s mentor — their betrayal stems from a sacrifice made to protect the world from a greater threat.`,
    ending: `With ${antagonist} defeated, ${protagonist} must now carry the burden of the forbidden knowledge alone. The world is saved, but nothing will ever be the same.`,
  };

  return jsonResponse({ status: "ok", data: plan });
});
