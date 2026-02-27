// supabase/functions/architect-agent/index.ts
// Deno / Supabase Edge Function
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { prompt, answers, zone_type, user_id, run_id? }
// Output : Master Director JSON (also stored in pipeline_runs.master_seed)
// Flow   : keyword-extract → library query → GPT-4o-mini → DB write → wisdom-agent
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestPayload {
  prompt: string;
  answers: Record<string, unknown>;
  zone_type: "game" | "website" | "video";
  user_id: string;
  run_id?: string; // existing pipeline_runs row to update
}

interface LibraryBlock {
  id: string;
  type: string;
  niche: string;
  name: string;
  tags: string[];
  seed_json: Record<string, unknown>;
}

interface MasterDirectorJSON {
  metadata: {
    zone: string;
    niche: string;
    title: string;
  };
  world_state: {
    sdf_layers: unknown[];
    lighting: Record<string, unknown>;
    weather: Record<string, unknown>;
  };
  characters: Array<{
    id: string;
    appearance_seed: number;
    voice_seed: number;
    power_seed: number;
    stats: Record<string, unknown>;
  }>;
  timeline_tracks: Array<{
    type: "camera" | "action" | "audio";
    events: unknown[];
  }>;
  gameplay: {
    missions: unknown[];
    economy: Record<string, unknown>;
  };
  library_blocks_used: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract unique lowercase keywords from a prompt string.
 * Strips common stop-words and returns an array of meaningful tokens.
 */
function extractKeywords(prompt: string): string[] {
  const STOP_WORDS = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "as","by","is","it","this","that","be","are","was","were","have","has",
    "i","me","my","we","our","you","your","he","she","they","their","its",
    "from","about","into","create","make","build","generate","need","want",
    "should","would","could","can","will","do","does","did","use","using",
  ]);

  return Array.from(
    new Set(
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    )
  );
}

/**
 * Score a library block against keyword list.
 * Returns number of tag matches.
 */
function scoreBlock(block: LibraryBlock, keywords: string[]): number {
  const tagSet = new Set(block.tags.map((t) => t.toLowerCase()));
  const nameTokens = new Set(
    block.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
  );
  let score = 0;
  for (const kw of keywords) {
    if (tagSet.has(kw)) score += 2;
    if (nameTokens.has(kw)) score += 1;
  }
  return score;
}

/**
 * JSON-safe response helper.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── System prompt for GPT ────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the Architect — an expert creative director and game/web/video project designer.
Your job is to produce a complete, valid Master Director JSON object that precisely follows the schema provided.
Always return ONLY the raw JSON object with no extra commentary, no markdown fences, no explanation.
Every field in the schema must be present. Invent plausible, creative, and internally-consistent values.
Seeds are floats between 0.0 and 1.0. IDs use snake_case. All text values are concise but evocative.`;
}

function buildUserPrompt(
  userPrompt: string,
  answers: Record<string, unknown>,
  blocks: LibraryBlock[],
  zoneType: string
): string {
  const blockSummary = blocks
    .map(
      (b, idx) =>
        `[${idx + 1}] id="${b.id}" name="${b.name}" niche="${b.niche}" tags=[${b.tags.join(", ")}]`
    )
    .join("\n");

  const blockIds = blocks.map((b) => b.id);

  const schema = JSON.stringify(
    {
      metadata: { zone: zoneType, niche: "<string>", title: "<string>" },
      world_state: {
        sdf_layers: [
          { id: "<string>", shape: "<string>", blend_mode: "<string>", params: {} },
        ],
        lighting: {
          ambient: "<hex>",
          sun_direction: [0, 0, 0],
          intensity: 1.0,
          bloom: false,
        },
        weather: { type: "<clear|rain|snow|fog|storm>", intensity: 0.5 },
      },
      characters: [
        {
          id: "<snake_case>",
          appearance_seed: 0.5,
          voice_seed: 0.5,
          power_seed: 0.5,
          stats: {
            health: 100,
            speed: 5,
            strength: 10,
            intelligence: 7,
            charisma: 6,
          },
        },
      ],
      timeline_tracks: [
        {
          type: "camera",
          events: [
            { t: 0, action: "<string>", params: {} },
          ],
        },
        {
          type: "action",
          events: [
            { t: 0, action: "<string>", params: {} },
          ],
        },
        {
          type: "audio",
          events: [
            { t: 0, action: "<string>", track: "<string>", params: {} },
          ],
        },
      ],
      gameplay: {
        missions: [
          {
            id: "<string>",
            title: "<string>",
            objective: "<string>",
            reward_credits: 50,
            difficulty: "<easy|medium|hard>",
          },
        ],
        economy: {
          starting_credits: 100,
          credit_earn_rate: 10,
          shop_items: [],
        },
      },
      library_blocks_used: blockIds,
    },
    null,
    2
  );

  return `## User's Project Vision
${userPrompt}

## User's Questionnaire Answers
${JSON.stringify(answers, null, 2)}

## Available Library Blocks (relevant to zone="${zoneType}")
${blockSummary || "(none found — infer from prompt)"}

## Required Output Schema
Produce ONE JSON object that strictly conforms to this schema.
Populate every field creatively based on the vision and answers above.
Use the provided library block IDs in "library_blocks_used" when relevant.

${schema}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Parse body ──
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { prompt, answers, zone_type, user_id, run_id } = payload;

  if (!prompt || !zone_type || !user_id) {
    return jsonResponse(
      { error: "Missing required fields: prompt, zone_type, user_id" },
      422
    );
  }

  // ── Supabase admin client ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openAiKey = Deno.env.get("OPENAI_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── 1. Extract keywords from prompt ──────────────────────────────────────
  const keywords = extractKeywords(prompt);
  console.log("[architect-agent] keywords:", keywords);

  // ── 2. Query library table for relevant blocks ───────────────────────────
  // Primary filter: type = zone_type
  // Secondary: tags overlap with keywords (done client-side for flexibility)
  const { data: libraryRows, error: libError } = await supabase
    .from("library")
    .select("id, type, niche, name, tags, seed_json")
    .eq("type", zone_type);

  if (libError) {
    // Non-fatal: library table may not exist yet — continue with no blocks
    console.warn("[architect-agent] library query error (continuing):", libError.message);
  }

  // Score and sort by keyword relevance; take top 12
  const scoredBlocks: LibraryBlock[] = ((libraryRows ?? []) as LibraryBlock[])
    .map((block) => ({ ...block, _score: scoreBlock(block, keywords) }))
    .sort((a, b) => (b as unknown as { _score: number })._score - (a as unknown as { _score: number })._score)
    .slice(0, 12)
    .map(({ ...rest }) => {
      const copy = { ...rest } as Record<string, unknown>;
      delete copy["_score"];
      return copy as unknown as LibraryBlock;
    });

  console.log(
    "[architect-agent] selected blocks:",
    scoredBlocks.map((b) => b.name)
  );

  // ── 3. Build GPT-4o-mini request ─────────────────────────────────────────
  const gptPayload = {
    model: "gpt-4o-mini",
    temperature: 0.85,
    max_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildUserPrompt(prompt, answers ?? {}, scoredBlocks, zone_type),
      },
    ],
  };

  let masterJSON: MasterDirectorJSON;

  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gptPayload),
    });

    if (!gptRes.ok) {
      const errText = await gptRes.text();
      console.error("[architect-agent] OpenAI error:", errText);
      return jsonResponse(
        { error: "OpenAI request failed", detail: errText },
        502
      );
    }

    const gptData = await gptRes.json();
    const rawContent: string = gptData.choices?.[0]?.message?.content ?? "{}";

    masterJSON = JSON.parse(rawContent) as MasterDirectorJSON;
  } catch (err) {
    console.error("[architect-agent] GPT parse error:", err);
    return jsonResponse(
      { error: "Failed to parse GPT response", detail: String(err) },
      500
    );
  }

  // Ensure library_blocks_used is always populated
  if (!Array.isArray(masterJSON.library_blocks_used)) {
    masterJSON.library_blocks_used = scoredBlocks.map((b) => b.id);
  }

  console.log(
    "[architect-agent] master JSON title:",
    masterJSON.metadata?.title
  );

  // ── 4. Upsert pipeline_runs with master_seed ──────────────────────────────
  let pipelineRunId = run_id;

  if (pipelineRunId) {
    // Update existing row
    const { error: updateErr } = await supabase
      .from("pipeline_runs")
      .update({
        master_seed: masterJSON,
        status: "architect_done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", pipelineRunId);

    if (updateErr) {
      console.error("[architect-agent] pipeline_runs update error:", updateErr);
      // Non-fatal — continue to wisdom-agent
    }
  } else {
    // Insert new row
    const { data: newRun, error: insertErr } = await supabase
      .from("pipeline_runs")
      .insert({
        user_id,
        zone_type,
        prompt,
        answers,
        master_seed: masterJSON,
        status: "architect_done",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[architect-agent] pipeline_runs insert error:", insertErr);
    } else {
      pipelineRunId = newRun?.id;
    }
  }

  // ── 5. Invoke wisdom-agent ────────────────────────────────────────────────
  const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1/wisdom-agent`;

  // Fire-and-forget — we don't block the response on wisdom-agent finishing
  const wisdomPayload = {
    master_seed: masterJSON,
    user_id,
    run_id: pipelineRunId,
    zone_type,
  };

  // Fire-and-forget: never await wisdom-agent — a missing/slow wisdom-agent
  // must not block or error the architect response.
  const fireWisdom = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5s max
    try {
      await fetch(supabaseFunctionsUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          apikey: serviceKey,
        },
        body: JSON.stringify(wisdomPayload),
      })
    } catch {
      console.warn('[architect] wisdom-agent timed out — continuing')
    } finally {
      clearTimeout(timeout)
    }
  }

  try { EdgeRuntime.waitUntil(fireWisdom()) } catch { fireWisdom() }

  // ── 6. Return Master Director JSON to caller ──────────────────────────────
  return jsonResponse({
    success: true,
    run_id: pipelineRunId,
    master_seed: masterJSON,
    blocks_used: scoredBlocks.map((b) => ({ id: b.id, name: b.name, niche: b.niche })),
    keywords_extracted: keywords,
  });
});
