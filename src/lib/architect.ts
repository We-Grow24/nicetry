// src/lib/architect.ts
// Client-side helper that invokes the architect-agent Edge Function.
// Usage:
//   import { runArchitect } from "@/lib/architect";
//   const result = await runArchitect({ prompt, answers, zone_type, user_id });

import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZoneType = "game" | "website" | "video";

export interface ArchitectInput {
  prompt: string;
  answers: Record<string, unknown>;
  zone_type: ZoneType;
  user_id: string;
  run_id?: string;
}

export interface MasterDirectorMetadata {
  zone: string;
  niche: string;
  title: string;
}

export interface MasterDirectorJSON {
  metadata: MasterDirectorMetadata;
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

export interface ArchitectResult {
  success: boolean;
  run_id: string;
  master_seed: MasterDirectorJSON;
  blocks_used: Array<{ id: string; name: string; niche: string }>;
  keywords_extracted: string[];
}

// ─── Invoker ──────────────────────────────────────────────────────────────────

/**
 * Calls the `architect-agent` Supabase Edge Function.
 * Automatically attaches the current user's session token.
 */
export async function runArchitect(
  input: ArchitectInput,
): Promise<ArchitectResult> {
  const supabase = createClient();

  // Get current session token for the Authorization header
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const functionUrl = `${supabaseUrl}/functions/v1/architect-agent`;

  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.detail ?? errBody?.error ?? res.statusText;
    } catch {
      try { detail = await res.text(); } catch { detail = res.statusText; }
    }
    throw new Error(
      `architect-agent failed (HTTP ${res.status}): ${detail}`
    );
  }

  return res.json() as Promise<ArchitectResult>;
}
