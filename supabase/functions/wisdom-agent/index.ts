// supabase/functions/wisdom-agent/index.ts
// Deno / Supabase Edge Function
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { master_seed, zone_type, pipeline_run_id }
//          (also accepts "run_id" as alias for pipeline_run_id — architect sends that)
// Output : { status: "wisdom_approved", run_id }
//        | { status: "rejected", reason, suggested_fix, failures }
//
// Flow   : fetch DB rules → run hardcoded validators → log all decisions
//          → if pass: set pipeline_runs.status = "wisdom_approved" + call director-agent
//          → if fail: set pipeline_runs.status = "wisdom_rejected" + return rejection
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type ZoneType = "game" | "website" | "video" | "anime" | "saas";

interface RequestPayload {
  master_seed: MasterSeed;
  zone_type: ZoneType;
  /** Primary field name per spec */
  pipeline_run_id?: string;
  /** Alias sent by architect-agent */
  run_id?: string;
}

interface MasterSeed {
  metadata?: Record<string, unknown>;
  world_state?: Record<string, unknown>;
  characters?: Array<Record<string, unknown>>;
  timeline_tracks?: Array<{ type?: string; events?: unknown[] }>;
  gameplay?: {
    missions?: Array<Record<string, unknown>>;
    economy?: Record<string, unknown>;
  };
  sections?: Array<Record<string, unknown>>;
  nodes?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  library_blocks_used?: string[];
  [key: string]: unknown;
}

interface WisdomRule {
  rule_key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  severity: "error" | "warning";
}

interface RuleResult {
  rule_key: string;
  label: string;
  passed: boolean;
  severity: "error" | "warning";
  reason: string | null;
  suggested_fix: string | null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Case-insensitive keyword search across the stringified value of an object,
 * limited to a specific depth to avoid false-positives in large seeds.
 */
function deepContainsKeyword(
  obj: unknown,
  keyword: string,
  maxDepth = 4,
  _depth = 0
): boolean {
  if (_depth > maxDepth) return false;
  if (typeof obj === "string") {
    return obj.toLowerCase().includes(keyword.toLowerCase());
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => deepContainsKeyword(item, keyword, maxDepth, _depth + 1));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj as Record<string, unknown>).some((v) =>
      deepContainsKeyword(v, keyword, maxDepth, _depth + 1)
    );
  }
  return false;
}

// ─── Zone Validators ──────────────────────────────────────────────────────────
// Each validator receives the master_seed and a map of DB-enabled rules
// (rule_key → enabled). Returns an array of RuleResult for that zone.

function validateGame(
  seed: MasterSeed,
  dbRules: Map<string, WisdomRule>
): RuleResult[] {
  const results: RuleResult[] = [];
  const missions = seed.gameplay?.missions ?? [];
  const economy = seed.gameplay?.economy ?? {};

  // ── min_one_character ─────────────────────────────────────────────────────
  if (dbRules.get("min_one_character")?.enabled !== false) {
    const chars = seed.characters ?? [];
    results.push({
      rule_key: "min_one_character",
      label: "At least 1 character",
      severity: "error",
      passed: chars.length >= 1,
      reason: chars.length < 1 ? "No characters defined in master_seed.characters" : null,
      suggested_fix:
        chars.length < 1
          ? 'Add at least one character object to master_seed.characters, e.g. { "id": "hero", "appearance_seed": 0.5, "voice_seed": 0.5, "power_seed": 0.5, "stats": {} }'
          : null,
    });
  }

  // ── no_dead_end_missions ──────────────────────────────────────────────────
  if (dbRules.get("no_dead_end_missions")?.enabled !== false) {
    const deadEnds = (missions as Array<Record<string, unknown>>).filter((m) => {
      const rewards = Number(m["reward_credits"] ?? 0);
      const hasNext = Boolean(m["next_mission"] ?? m["continues_to"] ?? m["unlocks"]);
      return rewards === 0 && !hasNext;
    });
    results.push({
      rule_key: "no_dead_end_missions",
      label: "No dead-end missions",
      severity: "error",
      passed: deadEnds.length === 0,
      reason:
        deadEnds.length > 0
          ? `${deadEnds.length} mission(s) have no reward_credits and no continuation link: ${deadEnds.map((m) => m["id"] ?? m["title"] ?? "?").join(", ")}`
          : null,
      suggested_fix:
        deadEnds.length > 0
          ? 'Set reward_credits > 0 on each mission, or add a "next_mission" / "unlocks" field to chain them.'
          : null,
    });
  }

  // ── economy_balanced ─────────────────────────────────────────────────────
  if (dbRules.get("economy_balanced")?.enabled !== false) {
    const sc = economy["starting_credits"];
    const er = economy["credit_earn_rate"];
    const balanced =
      sc !== undefined && sc !== null &&
      er !== undefined && er !== null &&
      Number(sc) >= 0 && Number(er) > 0;
    const missing: string[] = [];
    if (sc === undefined || sc === null) missing.push("starting_credits");
    if (er === undefined || er === null || Number(er) <= 0) missing.push("credit_earn_rate (must be > 0)");
    results.push({
      rule_key: "economy_balanced",
      label: "Economy balanced",
      severity: "error",
      passed: balanced,
      reason: !balanced ? `Economy missing or invalid fields: ${missing.join(", ")}` : null,
      suggested_fix: !balanced
        ? `Set master_seed.gameplay.economy.starting_credits (≥0) and credit_earn_rate (>0).`
        : null,
    });
  }

  return results;
}

function validateWebsite(
  seed: MasterSeed,
  dbRules: Map<string, WisdomRule>
): RuleResult[] {
  const results: RuleResult[] = [];

  // Aggregate all text content in sections, timeline, missions for keyword search
  const sections = seed.sections ?? [];
  const tracks = seed.timeline_tracks ?? [];
  const missions = seed.gameplay?.missions ?? [];
  const searchTargets = [...sections, ...tracks, ...missions];

  const hasKeyword = (kw: string) =>
    deepContainsKeyword(searchTargets, kw) ||
    deepContainsKeyword(seed.metadata ?? {}, kw) ||
    deepContainsKeyword(seed.library_blocks_used ?? [], kw);

  // ── has_navbar ────────────────────────────────────────────────────────────
  if (dbRules.get("has_navbar")?.enabled !== false) {
    const found = hasKeyword("navbar") || hasKeyword("nav") || hasKeyword("navigation");
    results.push({
      rule_key: "has_navbar",
      label: "Navbar present",
      severity: "error",
      passed: found,
      reason: !found ? 'No navbar/navigation section found in master_seed' : null,
      suggested_fix: !found
        ? 'Add a section or track entry with type/title containing "navbar" or "navigation".'
        : null,
    });
  }

  // ── has_hero ──────────────────────────────────────────────────────────────
  if (dbRules.get("has_hero")?.enabled !== false) {
    const found = hasKeyword("hero");
    results.push({
      rule_key: "has_hero",
      label: "Hero section present",
      severity: "error",
      passed: found,
      reason: !found ? 'No hero section found in master_seed' : null,
      suggested_fix: !found
        ? 'Add a section or track entry with type/title containing "hero".'
        : null,
    });
  }

  // ── has_footer ────────────────────────────────────────────────────────────
  if (dbRules.get("has_footer")?.enabled !== false) {
    const found = hasKeyword("footer");
    results.push({
      rule_key: "has_footer",
      label: "Footer present",
      severity: "error",
      passed: found,
      reason: !found ? 'No footer section found in master_seed' : null,
      suggested_fix: !found
        ? 'Add a section or track entry with type/title containing "footer".'
        : null,
    });
  }

  // ── mobile_responsive ────────────────────────────────────────────────────
  if (dbRules.get("mobile_responsive")?.enabled !== false) {
    const flag =
      seed.metadata?.["mobile_responsive"] ??
      seed["mobile_responsive"] ??
      (seed.world_state as Record<string, unknown> | undefined)?.["mobile_responsive"];
    const isResponsive = flag === true || flag === "true" || flag === 1;
    results.push({
      rule_key: "mobile_responsive",
      label: "Mobile responsive flag",
      severity: "error",
      passed: isResponsive,
      reason: !isResponsive
        ? `master_seed.metadata.mobile_responsive is ${JSON.stringify(flag)} (expected true)`
        : null,
      suggested_fix: !isResponsive
        ? 'Set master_seed.metadata.mobile_responsive = true to indicate mobile-first layout support.'
        : null,
    });
  }

  return results;
}

function validateVideo(
  seed: MasterSeed,
  dbRules: Map<string, WisdomRule>
): RuleResult[] {
  const results: RuleResult[] = [];
  const tracks = seed.timeline_tracks ?? [];

  // ── timeline_not_empty ────────────────────────────────────────────────────
  if (dbRules.get("timeline_not_empty")?.enabled !== false) {
    const hasEvents = tracks.some((t) => (t.events?.length ?? 0) >= 1);
    results.push({
      rule_key: "timeline_not_empty",
      label: "Timeline not empty",
      severity: "error",
      passed: hasEvents,
      reason: !hasEvents
        ? `master_seed.timeline_tracks has ${tracks.length} track(s) but no events`
        : null,
      suggested_fix: !hasEvents
        ? 'Ensure at least one timeline track contains ≥1 event object with a "t" timestamp and "action" field.'
        : null,
    });
  }

  // ── min_one_subject (character or product) ────────────────────────────────
  if (dbRules.get("min_one_subject")?.enabled !== false) {
    const hasChar = (seed.characters?.length ?? 0) >= 1;
    const hasProduct = (seed.products?.length ?? 0) >= 1;
    const passed = hasChar || hasProduct;
    results.push({
      rule_key: "min_one_subject",
      label: "At least 1 character or product",
      severity: "error",
      passed,
      reason: !passed
        ? "Neither master_seed.characters nor master_seed.products contain any entries"
        : null,
      suggested_fix: !passed
        ? 'Add at least one entry to master_seed.characters (for a person/presenter) or master_seed.products (for a product showcase).'
        : null,
    });
  }

  return results;
}

function validateAnime(
  seed: MasterSeed,
  dbRules: Map<string, WisdomRule>
): RuleResult[] {
  const results: RuleResult[] = [];

  // ── series_name_defined ───────────────────────────────────────────────────
  if (dbRules.get("series_name_defined")?.enabled !== false) {
    const sn =
      seed.metadata?.["series_name"] ??
      seed["series_name"] ??
      seed.metadata?.["title"]; // title is acceptable fallback
    const defined = typeof sn === "string" && sn.trim().length > 0;
    results.push({
      rule_key: "series_name_defined",
      label: "Series name defined",
      severity: "error",
      passed: defined,
      reason: !defined
        ? 'master_seed.metadata.series_name is missing or empty'
        : null,
      suggested_fix: !defined
        ? 'Set master_seed.metadata.series_name to a non-empty string, e.g. "Dragon Chronicles".'
        : null,
    });
  }

  // ── min_one_named_char ────────────────────────────────────────────────────
  if (dbRules.get("min_one_named_char")?.enabled !== false) {
    const chars = seed.characters ?? [];
    const namedChars = chars.filter(
      (c) =>
        (typeof c["id"] === "string" && c["id"].trim().length > 0) ||
        (typeof c["name"] === "string" && c["name"].trim().length > 0)
    );
    results.push({
      rule_key: "min_one_named_char",
      label: "At least 1 named character",
      severity: "error",
      passed: namedChars.length >= 1,
      reason:
        namedChars.length < 1
          ? `No named characters found in master_seed.characters (${chars.length} entries have no id or name)`
          : null,
      suggested_fix:
        namedChars.length < 1
          ? 'Add at least one character with a non-empty "id" or "name" field, e.g. { "id": "sakura", "name": "Sakura" }.'
          : null,
    });
  }

  return results;
}

function validateSaas(
  seed: MasterSeed,
  dbRules: Map<string, WisdomRule>
): RuleResult[] {
  const results: RuleResult[] = [];

  // Nodes can live in seed.nodes, seed.timeline_tracks events, or seed.gameplay.missions
  const nodeSearch = [
    ...(seed.nodes ?? []),
    ...(seed.timeline_tracks ?? []).flatMap((t) => t.events ?? []),
    ...(seed.gameplay?.missions ?? []),
  ];

  const hasNodeType = (keyword: string) =>
    (seed.nodes ?? []).some(
      (n) =>
        String(n["type"] ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(n["id"] ?? "")
          .toLowerCase()
          .includes(keyword)
    ) || deepContainsKeyword(nodeSearch, keyword);

  // ── has_input_node ────────────────────────────────────────────────────────
  if (dbRules.get("has_input_node")?.enabled !== false) {
    const found = hasNodeType("input");
    results.push({
      rule_key: "has_input_node",
      label: "At least 1 input node",
      severity: "error",
      passed: found,
      reason: !found ? 'No input node found in master_seed.nodes or timeline events' : null,
      suggested_fix: !found
        ? 'Add an entry to master_seed.nodes with type: "input_node" representing the data entry point of the SaaS workflow.'
        : null,
    });
  }

  // ── has_output_node ───────────────────────────────────────────────────────
  if (dbRules.get("has_output_node")?.enabled !== false) {
    const found = hasNodeType("output");
    results.push({
      rule_key: "has_output_node",
      label: "At least 1 output node",
      severity: "error",
      passed: found,
      reason: !found ? 'No output node found in master_seed.nodes or timeline events' : null,
      suggested_fix: !found
        ? 'Add an entry to master_seed.nodes with type: "output_node" representing the data delivery point of the SaaS workflow.'
        : null,
    });
  }

  return results;
}

// ─── Rule Dispatch ────────────────────────────────────────────────────────────

function runValidators(
  seed: MasterSeed,
  zoneType: ZoneType,
  dbRules: Map<string, WisdomRule>
): RuleResult[] {
  switch (zoneType) {
    case "game":    return validateGame(seed, dbRules);
    case "website": return validateWebsite(seed, dbRules);
    case "video":   return validateVideo(seed, dbRules);
    case "anime":   return validateAnime(seed, dbRules);
    case "saas":    return validateSaas(seed, dbRules);
    default:
      console.warn(`[wisdom-agent] Unknown zone_type="${zoneType}" — skipping zone validators`);
      return [];
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
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    master_seed,
    zone_type,
    pipeline_run_id,
    run_id, // alias from architect-agent
  } = payload;

  const runId = pipeline_run_id ?? run_id ?? null;

  if (!master_seed || !zone_type) {
    return jsonResponse(
      { error: "Missing required fields: master_seed, zone_type" },
      422
    );
  }

  // ── Supabase admin client ─────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── 1. Fetch DB wisdom rules for this zone ────────────────────────────────
  const { data: dbRuleRows, error: rulesError } = await supabase
    .from("wisdom_rules")
    .select("rule_key, label, description, enabled, severity")
    .eq("zone_type", zone_type);

  if (rulesError) {
    console.warn("[wisdom-agent] Could not fetch DB rules (using hardcoded defaults):", rulesError.message);
  }

  // Build lookup map; absent rules default to enabled
  const dbRulesMap = new Map<string, WisdomRule>(
    ((dbRuleRows ?? []) as WisdomRule[]).map((r) => [r.rule_key, r])
  );

  console.log(
    `[wisdom-agent] zone=${zone_type} run_id=${runId ?? "N/A"} db_rules_loaded=${dbRulesMap.size}`
  );

  // ── 2. Run zone validators ────────────────────────────────────────────────
  const results = runValidators(master_seed, zone_type as ZoneType, dbRulesMap);

  console.log(
    `[wisdom-agent] evaluated ${results.length} rules:`,
    results.map((r) => `${r.rule_key}=${r.passed ? "PASS" : "FAIL"}`)
  );

  // ── 3. Log all decisions to wisdom_rules_log ──────────────────────────────
  if (results.length > 0) {
    const logRows = results.map((r) => ({
      pipeline_run_id: runId,
      zone_type,
      rule_key: r.rule_key,
      passed: r.passed,
      reason: r.reason,
      suggested_fix: r.suggested_fix,
      severity: r.severity,
      evaluated_at: new Date().toISOString(),
    }));

    const { error: logError } = await supabase
      .from("wisdom_rules_log")
      .insert(logRows);

    if (logError) {
      // Non-fatal — never let logging failure block validation output
      console.warn("[wisdom-agent] Failed to write wisdom_rules_log:", logError.message);
    }
  }

  // ── 4. Collect failures (error-severity only blocks pipeline) ─────────────
  const errorFailures = results.filter((r) => !r.passed && r.severity === "error");
  const warnings = results.filter((r) => !r.passed && r.severity === "warning");

  if (warnings.length > 0) {
    console.warn(
      "[wisdom-agent] warnings (non-blocking):",
      warnings.map((w) => w.rule_key)
    );
  }

  // ── 5a. REJECTED path ─────────────────────────────────────────────────────
  if (errorFailures.length > 0) {
    const primaryFailure = errorFailures[0];
    const allReasons = errorFailures.map((f) => f.reason).filter(Boolean).join("; ");
    const allFixes = errorFailures.map((f) => f.suggested_fix).filter(Boolean).join(" | ");

    // Update pipeline_runs status to "wisdom_rejected"
    if (runId) {
      const { error: rejectErr } = await supabase
        .from("pipeline_runs")
        .update({
          status: "wisdom_rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);

      if (rejectErr) {
        console.warn("[wisdom-agent] Failed to update pipeline_runs (rejected):", rejectErr.message);
      }
    }

    console.log(`[wisdom-agent] REJECTED — ${errorFailures.length} rule(s) failed`);

    return jsonResponse({
      status: "rejected",
      reason: allReasons || primaryFailure.reason || "Validation failed",
      suggested_fix: allFixes || primaryFailure.suggested_fix || "Review the master_seed structure",
      failures: errorFailures.map((f) => ({
        rule_key: f.rule_key,
        label: f.label,
        reason: f.reason,
        suggested_fix: f.suggested_fix,
      })),
      warnings: warnings.map((w) => ({
        rule_key: w.rule_key,
        label: w.label,
        reason: w.reason,
        suggested_fix: w.suggested_fix,
      })),
      run_id: runId,
    });
  }

  // ── 5b. APPROVED path ────────────────────────────────────────────────────
  // Update pipeline_runs status to "wisdom_approved"
  if (runId) {
    const { error: approveErr } = await supabase
      .from("pipeline_runs")
      .update({
        status: "wisdom_approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (approveErr) {
      console.warn("[wisdom-agent] Failed to update pipeline_runs (approved):", approveErr.message);
    }
  }

  // ── 6. Call director-agent (fire-and-forget) ──────────────────────────────
  const directorUrl = `${supabaseUrl}/functions/v1/director-agent`;
  const directorPayload = {
    master_seed,
    zone_type,
    run_id: runId,
  };

  const fireDirector = () =>
    fetch(directorUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: serviceKey,
      },
      body: JSON.stringify(directorPayload),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.warn("[wisdom-agent] director-agent non-2xx:", await res.text());
        } else {
          console.log("[wisdom-agent] director-agent queued ok");
        }
      })
      .catch((err) =>
        console.warn("[wisdom-agent] director-agent unreachable:", err)
      );

  try {
    // @ts-ignore: EdgeRuntime is available in Supabase hosted Deno
    EdgeRuntime.waitUntil(fireDirector());
  } catch {
    fireDirector();
  }

  console.log(`[wisdom-agent] APPROVED — all ${results.length} rules passed`);

  return jsonResponse({
    status: "wisdom_approved",
    run_id: runId,
    rules_passed: results.length,
    warnings: warnings.map((w) => ({
      rule_key: w.rule_key,
      label: w.label,
      reason: w.reason,
      suggested_fix: w.suggested_fix,
    })),
  });
});
