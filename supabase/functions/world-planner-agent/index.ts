// supabase/functions/world-planner-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { world_type, size, density }
// Output : { sdf_layers, poi_locations, spawn_points, weather_cycle }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface RequestPayload {
  world_type: string; // "city" | "forest" | "ocean" | "desert" | "space" | "dungeon"
  size: "small" | "medium" | "large" | "open_world";
  density: number; // 0–100
}

interface Vec3 { x: number; y: number; z: number; }
interface SDFLayer { name: string; primitive: string; blend_mode: string; scale: Vec3; offset: Vec3; }
interface POI { id: string; type: string; name: string; position: Vec3; radius: number; }
interface SpawnPoint { id: string; faction: string; position: Vec3; max_entities: number; }
interface WeatherPhase { name: string; duration_min: number; intensity: number; next: string; }

function vec3(x: number, y: number, z: number): Vec3 { return { x, y, z }; }

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

  const { world_type, size, density } = payload;

  if (!world_type || !size) {
    return jsonResponse({ error: "world_type and size are required" }, 400);
  }

  const d = Math.max(0, Math.min(100, density ?? 50));
  const sizeScale = { small: 1, medium: 2, large: 4, open_world: 8 }[size] ?? 2;

  // ── SDF layers by world type ───────────────────────────────────────────────
  const sdfMap: Record<string, SDFLayer[]> = {
    city:    [
      { name: "ground_plane",   primitive: "plane",  blend_mode: "union",     scale: vec3(1,1,1),     offset: vec3(0,0,0)   },
      { name: "building_grid",  primitive: "box",    blend_mode: "union",     scale: vec3(.3,.8,.3),  offset: vec3(0,.4,0)  },
      { name: "road_network",   primitive: "plane",  blend_mode: "subtract",  scale: vec3(.1,.01,.1), offset: vec3(0,.01,0) },
    ],
    forest:  [
      { name: "terrain_hmap",   primitive: "heightmap", blend_mode: "union",  scale: vec3(1,.3,1),    offset: vec3(0,0,0)   },
      { name: "tree_instances", primitive: "cylinder",  blend_mode: "union",  scale: vec3(.05,.6,.05),offset: vec3(0,.3,0)  },
      { name: "undergrowth",    primitive: "sphere",    blend_mode: "smooth", scale: vec3(.2,.1,.2),  offset: vec3(0,.1,0)  },
    ],
    ocean:   [
      { name: "sea_floor",      primitive: "plane",     blend_mode: "union",  scale: vec3(1,1,1),     offset: vec3(0,-10,0) },
      { name: "water_surface",  primitive: "plane",     blend_mode: "union",  scale: vec3(1,.01,1),   offset: vec3(0,0,0)   },
      { name: "coral_reef",     primitive: "sphere",    blend_mode: "smooth", scale: vec3(.2,.15,.2), offset: vec3(0,-4,0)  },
    ],
    desert:  [
      { name: "sand_dunes",     primitive: "heightmap", blend_mode: "union",  scale: vec3(1,.15,1),   offset: vec3(0,0,0)   },
      { name: "rock_formations",primitive: "box",       blend_mode: "union",  scale: vec3(.4,.6,.4),  offset: vec3(0,.3,0)  },
    ],
    space:   [
      { name: "void_field",     primitive: "sphere",    blend_mode: "union",  scale: vec3(50,50,50),  offset: vec3(0,0,0)   },
      { name: "asteroid_field", primitive: "sphere",    blend_mode: "union",  scale: vec3(.5,.5,.5),  offset: vec3(0,0,0)   },
      { name: "nebula_cloud",   primitive: "sphere",    blend_mode: "smooth", scale: vec3(10,5,10),   offset: vec3(20,0,20) },
    ],
    dungeon: [
      { name: "cave_walls",     primitive: "box",       blend_mode: "subtract", scale: vec3(.8,1,.8), offset: vec3(0,.5,0)  },
      { name: "floor_tiles",    primitive: "plane",     blend_mode: "union",    scale: vec3(1,1,1),   offset: vec3(0,0,0)   },
      { name: "stalagmites",    primitive: "cylinder",  blend_mode: "union",    scale: vec3(.05,.3,.05), offset: vec3(0,.15,0) },
    ],
  };

  const sdf_layers = sdfMap[world_type.toLowerCase()] ?? sdfMap["forest"];

  // ── POI Locations ──────────────────────────────────────────────────────────
  const poiTypes: Record<string, { type: string; name: string }[]> = {
    city:    [{ type: "market", name: "Grand Bazaar" }, { type: "stronghold", name: "City Watch HQ" }, { type: "tavern", name: "The Rusty Anchor" }],
    forest:  [{ type: "shrine", name: "Ancient Shrine" }, { type: "camp", name: "Ranger Outpost" }, { type: "cave", name: "Bear Den" }],
    ocean:   [{ type: "shipwreck", name: "The Drowned Queen" }, { type: "reef", name: "Coral Cathedral" }, { type: "island", name: "Skull Island" }],
    desert:  [{ type: "oasis", name: "Hidden Oasis" }, { type: "ruin", name: "Lost Temple" }, { type: "camp", name: "Nomad Camp" }],
    space:   [{ type: "station", name: "Alpha Station" }, { type: "anomaly", name: "Dark Rift" }, { type: "derelict", name: "Ghost Ship" }],
    dungeon: [{ type: "boss_room", name: "Throne of Bones" }, { type: "treasure", name: "Vault of Ages" }, { type: "trap_room", name: "The Gauntlet" }],
  };

  const rawPOIs = poiTypes[world_type.toLowerCase()] ?? poiTypes["forest"];
  const poi_locations: POI[] = rawPOIs.map((p, i) => ({
    id:       `poi_${i + 1}`,
    type:     p.type,
    name:     p.name,
    position: vec3((i - 1) * sizeScale * 30, 0, i * sizeScale * 20),
    radius:   10 + i * 5,
  }));

  // ── Spawn Points ───────────────────────────────────────────────────────────
  const spawn_points: SpawnPoint[] = [
    { id: "spawn_player",  faction: "player",  position: vec3(0, 0, 0),           max_entities: 1  },
    { id: "spawn_enemy_1", faction: "enemy",   position: vec3(sizeScale * 20, 0, sizeScale * 15), max_entities: Math.round(d / 10) + 2 },
    { id: "spawn_enemy_2", faction: "enemy",   position: vec3(-sizeScale * 25, 0, sizeScale * 10), max_entities: Math.round(d / 15) + 1 },
    { id: "spawn_neutral", faction: "neutral", position: vec3(sizeScale * 5, 0, sizeScale * 25),   max_entities: Math.round(d / 20) + 3 },
  ];

  // ── Weather Cycle ──────────────────────────────────────────────────────────
  const weatherCycles: Record<string, WeatherPhase[]> = {
    city:    [{ name: "overcast", duration_min: 20, intensity: 0.4, next: "rain" }, { name: "rain", duration_min: 10, intensity: 0.7, next: "clear" }, { name: "clear", duration_min: 30, intensity: 0.1, next: "overcast" }],
    forest:  [{ name: "clear", duration_min: 25, intensity: 0.1, next: "foggy" }, { name: "foggy", duration_min: 15, intensity: 0.5, next: "rain" }, { name: "rain", duration_min: 10, intensity: 0.8, next: "clear" }],
    ocean:   [{ name: "calm", duration_min: 20, intensity: 0.1, next: "choppy" }, { name: "choppy", duration_min: 15, intensity: 0.5, next: "storm" }, { name: "storm", duration_min: 8, intensity: 1.0, next: "calm" }],
    desert:  [{ name: "hot_clear", duration_min: 40, intensity: 0.2, next: "sandstorm" }, { name: "sandstorm", duration_min: 10, intensity: 0.9, next: "hot_clear" }],
    space:   [{ name: "stable", duration_min: 60, intensity: 0.0, next: "ion_storm" }, { name: "ion_storm", duration_min: 5, intensity: 1.0, next: "stable" }],
    dungeon: [{ name: "still", duration_min: 999, intensity: 0.0, next: "still" }],
  };

  const weather_cycle = weatherCycles[world_type.toLowerCase()] ?? weatherCycles["forest"];

  return jsonResponse({
    status: "ok",
    data: { sdf_layers, poi_locations, spawn_points, weather_cycle },
  });
});
