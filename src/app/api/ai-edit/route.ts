import { NextRequest, NextResponse } from "next/server";

/* ─── POST /api/ai-edit ────────────────────────────────────────────────────
 * Body: { html: string, prompt: string }
 * Returns: { css?: string, html?: string, error?: string }
 *
 * Calls GPT-4o-mini to generate either:
 *   - inline CSS properties (as a raw CSS text string) to apply to the
 *     selected GrapesJS component, OR
 *   - a replacement HTML snippet if the user asked for structural changes
 * ─────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set." }, { status: 500 });
  }

  let body: { html?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { html = "", prompt = "" } = body;
  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const systemPrompt = `You are a web design assistant. 
The user has selected an HTML element in a visual builder and wants to style it.
Respond with ONLY a JSON object in one of these two shapes:

1. For style-only changes:
   { "css": "background: linear-gradient(...); color: #fff; padding: 2rem;" }
   The css value must be pure CSS declarations (property: value pairs), no selectors.

2. For structural/content changes:
   { "html": "<section class=\\"...\\">....</section>" }
   Return a complete replacement snippet with Tailwind CSS classes.

Do NOT include any explanation, markdown, or code fences. Return raw JSON only.`;

  const userMessage = `HTML element:\n${html}\n\nUser instruction: ${prompt}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: "OpenAI request failed." }, { status: 502 });
    }

    const data = await response.json();
    const raw  = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip potential markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If GPT returned raw CSS declarations instead of JSON, wrap them
      if (cleaned.includes(":") && !cleaned.startsWith("{")) {
        return NextResponse.json({ css: cleaned });
      }
      return NextResponse.json({ error: "Unexpected AI response format.", raw: cleaned }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("ai-edit error:", e);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
