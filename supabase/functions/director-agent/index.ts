// supabase/functions/director-agent/index.ts
// Deno / Supabase Edge Function
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { master_seed, zone_type, run_id?, pipeline_run_id?, project_id? }
//          run_id / pipeline_run_id — the pipeline_runs row to finalise
//          project_id               — if supplied, update existing project
//                                     instead of inserting a new one
//
// Output : { status: "completed", project_id, redirect, credits_remaining }
//        | { status: "error", error }
//
// Flow   :
//   1. Lookup user_id from pipeline_runs (via run_id)
//   2. INSERT (or UPDATE) into projects table
//   3. Deduct credits via deduct_credits() RPC
//   4. Update pipeline_runs.status = "completed"
//   5. Return { redirect: "/<zone>?project_id=<id>" }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type ZoneType = "game" | "website" | "video" | "anime" | "saas";

const VALID_ZONES: readonly ZoneType[] = ["game", "website", "video", "anime", "saas"];

function isZoneType(v: unknown): v is ZoneType {
  return typeof v === "string" && (VALID_ZONES as string[]).includes(v);
}

interface RequestPayload {
  master_seed: Record<string, unknown>;
  zone_type: ZoneType;
  /** From wisdom-agent */
  run_id?: string;
  /** Alias */
  pipeline_run_id?: string;
  /** Optional: link to / update a pre-existing project row */
  project_id?: string;
}

// ─── Zone config ──────────────────────────────────────────────────────────────

const ZONE_ROUTES: Record<ZoneType, string> = {
  game:    "/game",
  website: "/builder",
  video:   "/video",
  anime:   "/anime",
  saas:    "/saas",
};

/** Credits consumed per pipeline completion by zone */
const CREDIT_COST: Record<ZoneType, number> = {
  game:    20,
  website: 10,
  video:   15,
  anime:   15,
  saas:    10,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function parseBody(req: Request): Promise<RequestPayload | null> {
  try {
    return (await req.json()) as RequestPayload;
  } catch {
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  const payload = await parseBody(req);
  if (!payload) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    master_seed,
    zone_type,
    run_id,
    pipeline_run_id,
    project_id: existingProjectId,
  } = payload;

  const runId = run_id ?? pipeline_run_id ?? null;

  if (!master_seed || !zone_type) {
    return jsonResponse(
      { error: "Missing required fields: master_seed, zone_type" },
      422
    );
  }

  if (!isZoneType(zone_type)) {
    return jsonResponse(
      {
        error: `Unknown zone_type: "${zone_type}". Must be one of: ${VALID_ZONES.join(", ")}`,
      },
      422
    );
  }

  // ── Supabase admin client ─────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── 1. Resolve user_id from pipeline_runs ─────────────────────────────────
  let userId: string | null = null;

  if (runId) {
    const { data: runRow, error: runErr } = await supabase
      .from("pipeline_runs")
      .select("user_id, status")
      .eq("id", runId)
      .single();

    if (runErr || !runRow) {
      console.warn("[director-agent] Could not find pipeline_run:", runErr?.message);
      // Non-fatal: continue without user_id (credits deduction will be skipped)
    } else {
      userId = runRow.user_id as string;
      console.log(
        `[director-agent] run_id=${runId} user_id=${userId} current_status=${runRow.status}`
      );
    }
  }

  // ── 2. Upsert project row ─────────────────────────────────────────────────
  let projectId: string | null = existingProjectId ?? null;

  if (projectId) {
    // Update existing project with latest master_director_seed
    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        master_director_seed: master_seed,
        pipeline_run_id:      runId,
        updated_at:           new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateErr) {
      console.error("[director-agent] projects update error:", updateErr.message);
      return jsonResponse(
        { error: "Failed to update project", detail: updateErr.message },
        500
      );
    }

    console.log(`[director-agent] updated existing project id=${projectId}`);
  } else {
    // Insert new project row
    if (!userId) {
      // Cannot insert without user_id (FK constraint); return clear error
      return jsonResponse(
        {
          error:  "Cannot create project: user_id could not be resolved. Provide a valid run_id tied to a pipeline_run.",
          run_id: runId,
        },
        422
      );
    }

    const { data: newProject, error: insertErr } = await supabase
      .from("projects")
      .insert({
        user_id:              userId,
        type:                 zone_type,
        master_director_seed: master_seed,
        pipeline_run_id:      runId,
        status:               "active",
        created_at:           new Date().toISOString(),
        updated_at:           new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !newProject) {
      console.error("[director-agent] projects insert error:", insertErr?.message);
      return jsonResponse(
        { error: "Failed to create project", detail: insertErr?.message },
        500
      );
    }

    projectId = newProject.id as string;
    console.log(`[director-agent] created project id=${projectId} type=${zone_type}`);
  }

  // ── 3. Deduct credits ─────────────────────────────────────────────────────
  const creditCost = CREDIT_COST[zone_type];
  let creditsRemaining: number | null = null;
  let creditDeductOk = false;

  if (userId) {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      "deduct_credits",
      { p_user_id: userId, p_amount: creditCost }
    );

    if (rpcErr) {
      // Non-fatal: log but never block project delivery for a credits error
      console.warn("[director-agent] deduct_credits RPC error:", rpcErr.message);
    } else {
      const result = rpcResult as {
        ok: boolean;
        remaining: number;
        required?: number;
        deducted?: number;
      };

      if (!result.ok) {
        const needed = result.required !== undefined ? result.required : creditCost;
        console.warn(
          `[director-agent] insufficient credits: has=${result.remaining} needs=${needed} user=${userId}`
        );
        creditsRemaining = result.remaining;
      } else {
        creditDeductOk   = true;
        creditsRemaining = result.remaining;
        console.log(
          `[director-agent] deducted ${creditCost} credits for user=${userId} (remaining=${creditsRemaining})`
        );
      }
    }
  } else {
    console.warn("[director-agent] No user_id — skipping credit deduction");
  }

  // ── 4. Update pipeline_runs status = "completed" ──────────────────────────
  if (runId) {
    const { error: completeErr } = await supabase
      .from("pipeline_runs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", runId);

    if (completeErr) {
      console.warn(
        "[director-agent] pipeline_runs completion update error:",
        completeErr.message
      );
    } else {
      console.log(`[director-agent] pipeline_run ${runId} marked completed`);
    }
  }

  // ── 5. Build redirect URL and return ─────────────────────────────────────
  const redirectUrl = `${ZONE_ROUTES[zone_type]}?project_id=${projectId}`;

  console.log(`[director-agent] done → redirect=${redirectUrl}`);

  return jsonResponse({
    status:            "completed",
    project_id:        projectId,
    redirect:          redirectUrl,
    zone_type,
    run_id:            runId,
    credits_deducted:  creditDeductOk ? creditCost : 0,
    credits_remaining: creditsRemaining,
  });
});
