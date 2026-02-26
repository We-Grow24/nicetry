// supabase/functions/voice-director-agent/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Input  : { character_id, dialogue_lines }
// Output : { phoneme_timing, pitch_seed, emotion_tags }
// ─────────────────────────────────────────────────────────────────────────────

import { corsHeaders } from "../_shared/cors.ts";

interface DialogueLine {
  id?: string;
  text: string;
  emotion?: string;
}

interface RequestPayload {
  character_id: string;
  dialogue_lines: DialogueLine[];
}

interface PhonemeGroup {
  line_id: string;
  text: string;
  duration_ms: number;
  phonemes: { symbol: string; start_ms: number; end_ms: number }[];
}

interface VoiceResult {
  character_id: string;
  pitch_seed: number;
  voice_class: string;
  phoneme_timing: PhonemeGroup[];
  emotion_tags: { line_id: string; emotion: string; intensity: number }[];
  ssml_hints: { line_id: string; ssml: string }[];
}

const VOWELS = ["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"];
const CONSONANTS = ["B","CH","D","DH","F","G","HH","JH","K","L","M","N","NG","P","R","S","SH","T","TH","V","W","Y","Z","ZH"];

function approximatePhonemes(text: string): { symbol: string; start_ms: number; end_ms: number }[] {
  const words = text.trim().split(/\s+/);
  const phonemes: { symbol: string; start_ms: number; end_ms: number }[] = [];
  let cursor = 0;
  for (const word of words) {
    const letters = word.toLowerCase().replace(/[^a-z]/g, "").split("");
    for (const l of letters) {
      const isVowelLetter = "aeiou".includes(l);
      const symbol = isVowelLetter
        ? VOWELS[l.charCodeAt(0) % VOWELS.length]
        : CONSONANTS[l.charCodeAt(0) % CONSONANTS.length];
      const dur = isVowelLetter ? 80 : 50;
      phonemes.push({ symbol, start_ms: cursor, end_ms: cursor + dur });
      cursor += dur;
    }
    cursor += 120; // pause between words
  }
  return phonemes;
}

const EMOTION_INTENSITY: Record<string, number> = {
  neutral:    0.3,
  happy:      0.7,
  fearful:    0.8,
  aggressive: 0.9,
  sad:        0.6,
  surprised:  0.75,
  disgusted:  0.65,
  panicked:   0.95,
};

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

  const { character_id, dialogue_lines } = payload;

  if (!character_id || !dialogue_lines || !Array.isArray(dialogue_lines)) {
    return jsonResponse({ error: "character_id and dialogue_lines array are required" }, 400);
  }

  // ── Stable pitch seed from character_id ───────────────────────────────────
  const pitch_seed = character_id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 1000 / 1000;

  // Voice class heuristic from pitch_seed
  const voice_class = pitch_seed < 0.25 ? "bass" : pitch_seed < 0.5 ? "baritone" : pitch_seed < 0.75 ? "tenor" : "soprano";

  const phoneme_timing: PhonemeGroup[] = dialogue_lines.map((line, i) => {
    const id = line.id ?? `line_${i + 1}`;
    const phones = approximatePhonemes(line.text);
    const duration_ms = phones.length > 0 ? phones[phones.length - 1].end_ms : 0;
    return { line_id: id, text: line.text, duration_ms, phonemes: phones };
  });

  const emotion_tags = dialogue_lines.map((line, i) => {
    const id = line.id ?? `line_${i + 1}`;
    const emotion = line.emotion ?? "neutral";
    return {
      line_id:   id,
      emotion,
      intensity: EMOTION_INTENSITY[emotion] ?? 0.5,
    };
  });

  const ssml_hints = dialogue_lines.map((line, i) => {
    const id = line.id ?? `line_${i + 1}`;
    const emotion = line.emotion ?? "neutral";
    const rate   = emotion === "panicked" ? "fast" : emotion === "sad" ? "slow" : "medium";
    const pitch  = emotion === "aggressive" ? "high" : emotion === "fearful" ? "x-low" : "medium";
    const volume = emotion === "panicked" || emotion === "aggressive" ? "loud" : "medium";
    return {
      line_id: id,
      ssml: `<speak><prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${line.text}</prosody></speak>`,
    };
  });

  const result: VoiceResult = { character_id, pitch_seed, voice_class, phoneme_timing, emotion_tags, ssml_hints };

  return jsonResponse({ status: "ok", data: result });
});
