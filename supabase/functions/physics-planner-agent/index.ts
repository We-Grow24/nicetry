// supabase/functions/physics-planner-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { world_type, gameplay_style }
// Output : { gravity, friction, ragdoll_enabled, vehicle_physics }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface RequestPayload {
  world_type: string;      // "city" | "forest" | "space" | "underwater" | "moon" | "hell"
  gameplay_style: string;  // "realistic" | "arcade" | "simulation" | "casual"
}

interface VehiclePhysics {
  enabled: boolean;
  max_speed_kmh: number;
  acceleration: number;
  handling: number;
  enable_drift: boolean;
  enable_damage: boolean;
}

interface PhysicsConfig {
  world_type: string;
  gameplay_style: string;
  gravity: number;
  gravity_direction: [number, number, number];
  friction_ground: number;
  friction_air: number;
  restitution: number; // bounciness
  ragdoll_enabled: boolean;
  ragdoll_joint_limit_deg: number;
  jump_force: number;
  terminal_velocity: number;
  buoyancy_enabled: boolean;
  wind_force: [number, number, number];
  vehicle_physics: VehiclePhysics;
  constraints: { name: string; value: number | boolean; unit: string }[];
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

  const { world_type, gameplay_style } = payload;

  if (!world_type || !gameplay_style) {
    return jsonResponse({ error: "world_type and gameplay_style are required" }, 400);
  }

  // ── Gravity by world type ────────────────────────────────────────────────
  const gravityMap: Record<string, number> = {
    city:       -9.81,
    forest:     -9.81,
    desert:     -9.81,
    ocean:      -2.0,   // underwater buoyancy reduces effective gravity
    space:      -0.001,
    moon:       -1.62,
    hell:       -12.0,
    dungeon:    -9.81,
    mountain:   -9.81,
  };

  const gravity = gravityMap[world_type.toLowerCase()] ?? -9.81;

  // ── Style multipliers ─────────────────────────────────────────────────────
  const styleMultipliers: Record<string, { friction: number; ragdoll: boolean; jump: number; restitution: number }> = {
    realistic:   { friction: 0.85, ragdoll: true,  jump: 420,  restitution: 0.1 },
    simulation:  { friction: 0.90, ragdoll: true,  jump: 380,  restitution: 0.05 },
    arcade:      { friction: 0.50, ragdoll: false, jump: 600,  restitution: 0.3 },
    casual:      { friction: 0.60, ragdoll: false, jump: 500,  restitution: 0.2 },
  };

  const sm = styleMultipliers[gameplay_style.toLowerCase()] ?? styleMultipliers["arcade"];

  const isSpace = world_type.toLowerCase() === "space";
  const isOcean = world_type.toLowerCase() === "ocean";

  const config: PhysicsConfig = {
    world_type,
    gameplay_style,
    gravity,
    gravity_direction: [0, 1, 0], // Y-up
    friction_ground:  sm.friction,
    friction_air:     isSpace ? 0.0 : isOcean ? 0.15 : 0.02,
    restitution:      sm.restitution,
    ragdoll_enabled:  sm.ragdoll && !isSpace,
    ragdoll_joint_limit_deg: sm.ragdoll ? 45 : 0,
    jump_force:       isSpace ? sm.jump * 3 : isOcean ? sm.jump * 0.4 : sm.jump,
    terminal_velocity: isSpace ? 0 : isOcean ? 8 : 54,
    buoyancy_enabled: isOcean,
    wind_force:       world_type.toLowerCase() === "desert"
      ? [5, 0, 2]
      : world_type.toLowerCase() === "mountain"
      ? [10, 0, 5]
      : [0, 0, 0],
    vehicle_physics: {
      enabled:       ["city", "desert", "mountain"].includes(world_type.toLowerCase()),
      max_speed_kmh: gameplay_style === "realistic" ? 180 : gameplay_style === "simulation" ? 220 : 300,
      acceleration:  gameplay_style === "casual" ? 0.4 : gameplay_style === "realistic" ? 0.7 : 1.0,
      handling:      gameplay_style === "casual" ? 0.5 : gameplay_style === "realistic" ? 0.8 : 0.6,
      enable_drift:  ["arcade", "casual"].includes(gameplay_style.toLowerCase()),
      enable_damage: ["realistic", "simulation"].includes(gameplay_style.toLowerCase()),
    },
    constraints: [
      { name: "max_rigidbodies",     value: gameplay_style === "casual" ? 64 : 256,   unit: "count" },
      { name: "collision_iterations", value: gameplay_style === "simulation" ? 10 : 4, unit: "count" },
      { name: "enable_soft_body",    value: gameplay_style === "simulation",           unit: "bool"  },
      { name: "step_dt_ms",          value: gameplay_style === "simulation" ? 8 : 16,  unit: "ms"    },
    ],
  };

  return jsonResponse({ status: "ok", data: config });
});
