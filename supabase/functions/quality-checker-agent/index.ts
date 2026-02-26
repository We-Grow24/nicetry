// supabase/functions/quality-checker-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { master_seed }
// Checks : LOD levels, texture_budget, shadow_quality, FPS_target
// Output : { optimizations, warnings }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface MasterSeed {
  world?:      { biome?: string; time_of_day?: number; weather?: string };
  characters?: { id: string; appearance_seed?: number; role?: string }[];
  narrative?:  { act?: number; tension?: number };
  physics?:    { gravity?: number; ragdoll_enabled?: boolean; vehicle_physics?: { enabled?: boolean } };
  world_size?: "small" | "medium" | "large" | "open_world";
  target_platform?: "mobile" | "console" | "pc" | "vr";
}

interface RequestPayload {
  master_seed: MasterSeed;
}

type Severity = "info" | "warning" | "error";

interface Warning {
  id: string;
  severity: Severity;
  category: string;
  message: string;
  affected_systems: string[];
}

interface Optimization {
  id: string;
  category: string;
  action: string;
  estimated_fps_gain: number;
  estimated_memory_mb_saved: number;
  priority: "low" | "medium" | "high" | "critical";
}

interface QualityReport {
  passed: boolean;
  score: number; // 0–100
  fps_target: number;
  lod_levels: number;
  texture_budget_mb: number;
  shadow_quality: "off" | "low" | "medium" | "high" | "ultra";
  draw_call_estimate: number;
  polygon_budget_k: number;
  warnings: Warning[];
  optimizations: Optimization[];
  summary: string;
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

  const seed = payload?.master_seed ?? {};

  // ── Derive platform constraints ────────────────────────────────────────────
  const platform  = seed.target_platform ?? "pc";
  const worldSize = seed.world_size      ?? "medium";
  const weather   = seed.world?.weather  ?? "clear";
  const charCount = (seed.characters ?? []).length;
  const timeOfDay = seed.world?.time_of_day ?? 12;

  const platformLimits: Record<string, { fps: number; texMB: number; shadow: QualityReport["shadow_quality"]; lod: number; drawCalls: number; polyK: number }> = {
    mobile:  { fps: 30,  texMB: 256,  shadow: "low",    lod: 2, drawCalls: 100,  polyK: 500  },
    console: { fps: 60,  texMB: 1024, shadow: "high",   lod: 4, drawCalls: 500,  polyK: 2000 },
    pc:      { fps: 60,  texMB: 2048, shadow: "ultra",  lod: 5, drawCalls: 1000, polyK: 5000 },
    vr:      { fps: 90,  texMB: 1024, shadow: "medium", lod: 3, drawCalls: 300,  polyK: 1500 },
  };

  const limits = platformLimits[platform] ?? platformLimits["pc"];

  const sizeMultiplier = { small: 0.5, medium: 1.0, large: 2.0, open_world: 4.0 }[worldSize] ?? 1;

  // Estimated costs
  const estimatedDrawCalls  = Math.round(limits.drawCalls   * sizeMultiplier + charCount * 15);
  const estimatedPolyBudget = Math.round(limits.polyK       * sizeMultiplier);
  const estimatedTexBudget  = Math.round(limits.texMB       * sizeMultiplier);

  // ── Check thresholds ───────────────────────────────────────────────────────
  const warnings: Warning[] = [];
  const optimizations: Optimization[] = [];

  // Draw calls check
  if (estimatedDrawCalls > limits.drawCalls * 1.2) {
    warnings.push({
      id:               "W001",
      severity:         "warning",
      category:         "Rendering",
      message:          `Estimated draw calls (${estimatedDrawCalls}) exceed ${platform} budget (${Math.round(limits.drawCalls * 1.2)}).`,
      affected_systems: ["renderer", "scene_manager"],
    });
    optimizations.push({
      id:                        "O001",
      category:                  "Rendering",
      action:                    "Enable GPU instancing for environment meshes. Batch static geometry into atlased meshes.",
      estimated_fps_gain:        8,
      estimated_memory_mb_saved: 0,
      priority:                  "high",
    });
  }

  // Texture budget check
  if (estimatedTexBudget > limits.texMB) {
    warnings.push({
      id:               "W002",
      severity:         "warning",
      category:         "Memory",
      message:          `Texture budget (${estimatedTexBudget} MB) exceeds ${platform} limit (${limits.texMB} MB).`,
      affected_systems: ["texture_manager", "streaming_system"],
    });
    optimizations.push({
      id:                        "O002",
      category:                  "Memory",
      action:                    "Enable texture streaming (mip-map budget). Compress textures to BC7/ASTC. Reduce world-space texture resolution for distant objects.",
      estimated_fps_gain:        3,
      estimated_memory_mb_saved: Math.round(estimatedTexBudget - limits.texMB),
      priority:                  estimatedTexBudget > limits.texMB * 1.5 ? "critical" : "medium",
    });
  }

  // Shadow check in VR
  if (platform === "vr" && limits.shadow === "medium" && weather === "storm") {
    warnings.push({
      id:               "W003",
      severity:         "warning",
      category:         "Shadows",
      message:          "Storm weather with medium shadows may cause reprojection artifacts in VR.",
      affected_systems: ["shadow_map", "vr_compositor"],
    });
    optimizations.push({
      id:                        "O003",
      category:                  "Shadows",
      action:                    "Switch dynamic shadows to baked lightmaps during storm weather in VR. Use shadow LOD fade.",
      estimated_fps_gain:        12,
      estimated_memory_mb_saved: 0,
      priority:                  "high",
    });
  }

  // Ragdoll on mobile check
  const ragdollEnabled = seed.physics?.ragdoll_enabled ?? false;
  if (platform === "mobile" && ragdollEnabled) {
    warnings.push({
      id:               "W004",
      severity:         "error",
      category:         "Physics",
      message:          "Ragdoll physics enabled on mobile platform. This will cause severe FPS drops.",
      affected_systems: ["physics_engine", "character_controller"],
    });
    optimizations.push({
      id:                        "O004",
      category:                  "Physics",
      action:                    "Replace ragdoll with pre-baked death animations on mobile. Ragdoll remains enabled on PC/console.",
      estimated_fps_gain:        20,
      estimated_memory_mb_saved: 8,
      priority:                  "critical",
    });
  }

  // LOD check for open world
  if (worldSize === "open_world" && limits.lod < 4) {
    warnings.push({
      id:               "W005",
      severity:         "warning",
      category:         "LOD",
      message:          `Open world requires at least 4 LOD levels, but ${platform} config has ${limits.lod}.`,
      affected_systems: ["lod_system", "streaming_system"],
    });
    optimizations.push({
      id:                        "O005",
      category:                  "LOD",
      action:                    "Implement hierarchical LOD with impostor billboards at LOD3+. Use Nanite-style virtual geometry for distant meshes.",
      estimated_fps_gain:        15,
      estimated_memory_mb_saved: 64,
      priority:                  "high",
    });
  }

  // Night-time lighting check
  if ((timeOfDay < 6 || timeOfDay > 21) && limits.shadow === "ultra") {
    optimizations.push({
      id:                        "O006",
      category:                  "Lighting",
      action:                    "At night-time, switch from ultra shadows to deferred volumetric lighting for better visual quality at lower cost.",
      estimated_fps_gain:        7,
      estimated_memory_mb_saved: 12,
      priority:                  "low",
    });
  }

  // Score calculation
  const errorCount   = warnings.filter((w) => w.severity === "error").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 8);
  const passed = errorCount === 0 && score >= 60;

  const report: QualityReport = {
    passed,
    score,
    fps_target:         limits.fps,
    lod_levels:         Math.min(limits.lod, worldSize === "open_world" ? 5 : limits.lod),
    texture_budget_mb:  limits.texMB,
    shadow_quality:     limits.shadow,
    draw_call_estimate: estimatedDrawCalls,
    polygon_budget_k:   estimatedPolyBudget,
    warnings,
    optimizations,
    summary: passed
      ? `Quality check passed (score ${score}/100). ${optimizations.length} optimisation(s) suggested.`
      : `Quality check FAILED (score ${score}/100). ${errorCount} error(s) and ${warningCount} warning(s) must be resolved before shipping.`,
  };

  return jsonResponse({ status: "ok", data: report });
});
