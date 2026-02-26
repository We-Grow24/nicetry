// supabase/functions/interrogator-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { prompt: string, attachments?: FilePayload[] }
// Output : { questions: Question[], zone: string, summary: string }
//
// Reads the user's raw prompt, classifies the project zone, and generates
// 3-5 targeted clarifying questions for the create-page questionnaire.
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilePayload {
  name: string;
  type: string;
  data: string; // base64
}

interface RequestPayload {
  prompt: string;
  attachments?: FilePayload[];
}

interface Question {
  id: string;
  text: string;
  type: "text" | "choice";
  choices?: string[];
}

interface InterrogatorResult {
  questions: Question[];
  zone: "game" | "website" | "video" | "builder";
  summary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Interrogator — an expert project analyst for an AI creative platform.

Given a user's project description, you must:
1. Classify the project into exactly one ZONE: "game", "website", "video", or "builder"
   - "game"    → interactive game, simulation, arcade, RPG, puzzle, etc.
   - "website" → landing page, SaaS site, e-commerce, portfolio, blog, etc.
   - "video"   → promotional video, explainer, short film, animation, ad, etc.
   - "builder" → dashboard, tool, app, utility that doesn't fit above

2. Write a 1-sentence SUMMARY that captures the essence of the project.

3. Generate exactly 4 QUESTIONS that will help the AI build the project better.
   - Mix question types: use "choice" for categorical questions, "text" for open-ended ones
   - "choice" questions must have 4-6 concise, mutually-exclusive options
   - Questions must be highly specific to the described project (not generic)
   - Cover: tone/style, target audience, key feature priority, technical constraints

Return ONLY valid JSON with this exact schema (no markdown, no explanation):
{
  "zone": "game" | "website" | "video" | "builder",
  "summary": "<one sentence>",
  "questions": [
    {
      "id": "q1",
      "text": "<question text>",
      "type": "choice",
      "choices": ["Option A", "Option B", "Option C", "Option D"]
    },
    {
      "id": "q2",
      "text": "<question text>",
      "type": "text"
    }
  ]
}`;

function buildUserMessage(prompt: string, attachments: FilePayload[]): string {
  let msg = `Project description:\n"${prompt}"`;

  if (attachments.length > 0) {
    const fileNames = attachments.map((a) => `${a.name} (${a.type})`).join(", ");
    msg += `\n\nAttached reference files: ${fileNames}`;
    msg += `\n(Use attachment names as context clues for the project style/domain.)`;
  }

  return msg;
}

// ─── Fallback questions (used when GPT is unavailable) ────────────────────────

function fallbackResult(prompt: string): InterrogatorResult {
  const lower = prompt.toLowerCase();
  const zone: InterrogatorResult["zone"] =
    /game|arcade|rpg|puzzle|quest|level|player|score/.test(lower)
      ? "game"
      : /video|film|animation|ad|promo|explainer|reel/.test(lower)
      ? "video"
      : /site|page|landing|ecommerce|shop|portfolio|blog/.test(lower)
      ? "website"
      : "builder";

  return {
    zone,
    summary: "A creative project built with AI assistance.",
    questions: [
      {
        id: "q1",
        text: "What best describes the style of this project?",
        type: "choice",
        choices: ["Minimal & Clean", "Bold & Vibrant", "Dark & Dramatic", "Playful & Fun"],
      },
      {
        id: "q2",
        text: "Who is the primary audience?",
        type: "choice",
        choices: ["Kids (under 12)", "Teens", "Adults", "Professionals"],
      },
      {
        id: "q3",
        text: "What is the single most important feature or experience you want users to have?",
        type: "text",
      },
      {
        id: "q4",
        text: "What platform should this primarily target?",
        type: "choice",
        choices: ["Mobile", "Desktop", "Both equally", "Web browser only"],
      },
    ],
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

  // ── Parse body ──
  let payload: RequestPayload;
  try {
    payload = (await req.json()) as RequestPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const prompt: string = payload.prompt ?? "";
  const attachments: FilePayload[] = payload.attachments ?? [];

  if (!prompt.trim()) {
    return jsonResponse({ error: "prompt is required" }, 422);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    console.warn("[interrogator-agent] OPENAI_API_KEY not set — returning fallback");
    return jsonResponse(fallbackResult(prompt));
  }

  // ── Call OpenAI ──
  let gptRes: Response;
  try {
    gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(prompt, attachments) },
        ],
      }),
    });
  } catch (fetchErr) {
    console.error("[interrogator-agent] fetch error:", fetchErr);
    return jsonResponse(fallbackResult(prompt));
  }

  if (!gptRes.ok) {
    const errText = await gptRes.text();
    console.error("[interrogator-agent] OpenAI error:", errText);
    return jsonResponse(fallbackResult(prompt));
  }

  // ── Parse GPT response ──
  let rawContent = "";
  try {
    const gptData = await gptRes.json();
    rawContent = gptData.choices?.[0]?.message?.content ?? "";
  } catch (parseErr) {
    console.error("[interrogator-agent] response parse error:", parseErr);
    return jsonResponse(fallbackResult(prompt));
  }

  // ── Parse JSON from GPT content ──
  let parsed: InterrogatorResult;
  try {
    parsed = JSON.parse(rawContent) as InterrogatorResult;
  } catch {
    console.error("[interrogator-agent] JSON parse error, raw:", rawContent);
    return jsonResponse(fallbackResult(prompt));
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return jsonResponse(fallbackResult(prompt));
  }

  parsed.questions = parsed.questions.map((q, i) => ({
    ...q,
    id: q.id ?? `q${i + 1}`,
  }));

  console.log(
    `[interrogator-agent] zone="${parsed.zone}" questions=${parsed.questions.length}`
  );

  return jsonResponse(parsed);
});
