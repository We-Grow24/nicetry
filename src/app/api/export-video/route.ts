/**
 * /api/export-video
 *
 * Two modes:
 *
 * A) PROJECT-BASED (preferred)
 *    POST { project_id: string }   or   GET ?project_id=<uuid>
 *    Fetches master_director_seed from Supabase → builds render manifest →
 *    returns a ZIP with manifest.json + ffmpeg_render.sh + README.md.
 *
 * B) SCENE-PAYLOAD (legacy / VideoCreator direct export)
 *    POST { projectName, duration, objects, tracks, masterSeed }
 *    Validates payload → returns JSON with render manifest + FFmpeg command.
 *
 * Full server render pipeline (requires FFmpeg + headless browser on PATH):
 *   1. For each frame t in [0, duration * fps]:
 *      a. Serialize scene state at that timestamp.
 *      b. Render to an off-screen Three.js canvas (Puppeteer / offscreen).
 *      c. Write PNG → /tmp/frames/name_%06d.png.
 *   2. ffmpeg -r {fps} -i frames/%06d.png -c:v libx264 -pix_fmt yuv420p output.mp4
 *   3. Stream MP4 as attachment.
 *
 * Wire up the real renderer by uncommenting the "Real render path" block below.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import JSZip from "jszip";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SceneObject {
  id: string;
  name: string;
  type: string;
  seed: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

interface TimelineBlock {
  id: string;
  startFrac: number;
  endFrac: number;
  label: string;
}

interface Track {
  id: string;
  label: string;
  type: string;
  blocks: TimelineBlock[];
}

interface ScenePayload {
  projectName: string;
  duration: number;
  objects: SceneObject[];
  tracks: Track[];
  masterSeed: Record<string, unknown>;
}

interface MasterDirectorSeed {
  project_name?: string;
  duration?: number;
  fps?: number;
  objects?: SceneObject[];
  tracks?: Track[];
  world?: Record<string, unknown>;
  characters?: Array<{ id: string; role: string; appearance_seed: number }>;
  narrative?: Record<string, unknown>;
  [key: string]: unknown;
}

const DEFAULT_FPS      = 30;
const DEFAULT_DURATION = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeSlug(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, "_");
}

function buildFfmpegCommand(name: string, duration: number, fps = DEFAULT_FPS): string {
  const slug = safeSlug(name);
  return [
    `ffmpeg`,
    `-y`,
    `-r ${fps}`,
    `-i /tmp/frames/${slug}_%06d.png`,
    `-c:v libx264`,
    `-preset fast`,
    `-crf 23`,
    `-pix_fmt yuv420p`,
    `-movflags +faststart`,
    `/tmp/${slug}.mp4`,
  ].join(" \\\n  ");
}

function buildObjectsFromSeed(seed: MasterDirectorSeed): SceneObject[] {
  if (seed.objects?.length) return seed.objects;
  const objects: SceneObject[] = [];
  const chars = seed.characters ?? [];
  chars.forEach((c, i) => {
    objects.push({
      id: c.id,
      name: `${c.role} (${c.id})`,
      type: "character",
      seed: c.appearance_seed,
      position: { x: (i - chars.length / 2) * 2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    });
  });
  objects.push({
    id: "bg_world",
    name: `${seed.world?.biome ?? "forest"} background`,
    type: "background",
    seed: ((seed.world?.time_of_day as number) ?? 12) / 24,
    position: { x: 4, y: 0.5, z: -2 },
    rotation: { x: 0, y: 0.3, z: 0 },
    scale: 1.2,
  });
  return objects;
}

function buildDefaultTracks(seed: MasterDirectorSeed): Track[] {
  if (seed.tracks?.length) return seed.tracks;
  return [
    {
      id: "camera",
      label: "Camera",
      type: "camera",
      blocks: [
        { id: "cam1", startFrac: 0.0, endFrac: 0.45, label: "Wide Shot" },
        { id: "cam2", startFrac: 0.5, endFrac: 1.0, label: "Close Up" },
      ],
    },
    {
      id: "character",
      label: "Character",
      type: "character",
      blocks: [
        { id: "ch1", startFrac: 0.0, endFrac: 0.5, label: "Idle" },
        { id: "ch2", startFrac: 0.5, endFrac: 1.0, label: "Action" },
      ],
    },
  ];
}

function buildManifest(
  name: string,
  duration: number,
  objects: SceneObject[],
  tracks: Track[],
  masterSeed: Record<string, unknown>,
  fps = DEFAULT_FPS
) {
  return {
    project: name,
    fps,
    totalFrames: Math.ceil(duration * fps),
    duration,
    resolution: { width: 1920, height: 1080 },
    objects: objects.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      seed: o.seed,
      startTransform: { position: o.position, rotation: o.rotation, scale: o.scale },
    })),
    tracks,
    masterSeed,
    cameraPath: {
      type: "orbital",
      radius: 8,
      elevationDeg: 20,
      revolutionsPerSecond: 1 / duration,
    },
  };
}

function buildFfmpegShell(name: string, duration: number, fps = DEFAULT_FPS): string {
  const slug = safeSlug(name);
  const totalFrames = Math.ceil(duration * fps);
  return `#!/usr/bin/env bash
# Auto-generated render script for "${name}"
# Requirements: FFmpeg on PATH + PNG frames in /tmp/frames/${slug}_NNNNNN.png

set -e
FRAMES_DIR="/tmp/frames"
OUTPUT="/tmp/${slug}.mp4"
FPS=${fps}
NAME="${slug}"
echo "[render] Expecting ${totalFrames} frames @ \${FPS}fps"
mkdir -p "\${FRAMES_DIR}"

# ── Replace the block below with your frame generator ─────────────────────────
# (Puppeteer + Three.js / Remotion / Blender)

# ── Encode ────────────────────────────────────────────────────────────────────
ffmpeg -y \\
  -r \${FPS} \\
  -i "\${FRAMES_DIR}/\${NAME}_%06d.png" \\
  -c:v libx264 -preset fast -crf 23 \\
  -pix_fmt yuv420p -movflags +faststart \\
  "\${OUTPUT}"
echo "[render] Done → \${OUTPUT}"
`;
}

function buildReadme(name: string, projectId: string): string {
  return `# ${name} — Video Export

Auto-generated by **TailAdmin Video Creator** (project \`${projectId}\`).

## Files

| File | Description |
|------|-------------|
| \`manifest.json\` | Full render manifest (scene objects, tracks, camera path) |
| \`ffmpeg_render.sh\` | Bash render script — add your frame generator and run |

## Quick start

\`\`\`bash
# Install FFmpeg (macOS)
brew install ffmpeg

# Generate frames with Puppeteer + Three.js, then:
bash ffmpeg_render.sh
\`\`\`

## Alternative renderers

- **Remotion** — \`npx create-video\`, copy objects from manifest.json
- **Blender** — \`blender --background --python render.py -- manifest.json\`

## Re-open in editor

TailAdmin → Video Creator → load project \`${projectId}\`.
`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) { return handler(req, null); }

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null = null;
  try { body = await req.json(); } catch { /* empty */ }
  return handler(req, body);
}

async function handler(req: NextRequest, body: Record<string, unknown> | null) {
  // ── Mode A: project_id ────────────────────────────────────────────────────
  const projectId =
    (body?.project_id as string | undefined) ??
    req.nextUrl.searchParams.get("project_id");

  if (projectId) {
    const sb = await createClient();
    const { data: project, error } = await sb
      .from("projects")
      .select("id, type, master_director_seed")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.type !== "video") {
      return NextResponse.json(
        { error: `Project type is "${project.type}", expected "video"` },
        { status: 400 }
      );
    }

    const seed     = (project.master_director_seed ?? {}) as MasterDirectorSeed;
    const name     = seed.project_name ?? "My Video";
    const slug     = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const duration = seed.duration ?? DEFAULT_DURATION;
    const fps      = seed.fps ?? DEFAULT_FPS;
    const objects  = buildObjectsFromSeed(seed);
    const tracks   = buildDefaultTracks(seed);
    const manifest = buildManifest(name, duration, objects, tracks, seed as Record<string, unknown>, fps);

    const zip = new JSZip();
    zip.file("manifest.json",    JSON.stringify(manifest, null, 2));
    zip.file("ffmpeg_render.sh", buildFfmpegShell(name, duration, fps));
    zip.file("README.md",        buildReadme(name, projectId));

    /**
     * ── Real render path (uncomment when FFmpeg + Puppeteer are available) ──
     *
     * const { execSync } = await import("child_process");
     * const fs = await import("fs");
     * const framesDir = `/tmp/frames/${safeSlug(name)}`;
     * fs.mkdirSync(framesDir, { recursive: true });
     * for (let f = 0; f < manifest.totalFrames; f++) {
     *   const frameData = renderFrameToBuffer(manifest, f / fps);  // headless Three.js
     *   fs.writeFileSync(`${framesDir}/${String(f).padStart(6,"0")}.png`, frameData);
     * }
     * execSync(buildFfmpegCommand(name, duration, fps));
     * const mp4 = fs.readFileSync(`/tmp/${safeSlug(name)}.mp4`);
     * return new Response(mp4, {
     *   headers: { "Content-Type": "video/mp4",
     *     "Content-Disposition": `attachment; filename="${slug}.mp4"` },
     * });
     */

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-video-export.zip"`,
        "Content-Length": String(buffer.length),
      },
    });
  }

  // ── Mode B: legacy scene payload ──────────────────────────────────────────
  if (!body) {
    return NextResponse.json(
      { error: "Provide project_id or a scene payload (projectName, duration, objects, tracks)" },
      { status: 400 }
    );
  }

  const { projectName, duration, objects, tracks, masterSeed } = body as Partial<ScenePayload>;

  if (!projectName || typeof duration !== "number" || duration <= 0) {
    return NextResponse.json(
      { error: "duration must be a positive number and projectName is required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(objects)) {
    return NextResponse.json({ error: "objects must be an array" }, { status: 400 });
  }

  const manifest = buildManifest(
    projectName,
    duration,
    objects as SceneObject[],
    (tracks ?? []) as Track[],
    (masterSeed ?? {}) as Record<string, unknown>
  );

  return NextResponse.json(
    {
      status: "queued",
      message:
        "Export queued. The render pipeline requires FFmpeg + headless Chrome on the server. " +
        "See ffmpegCommand and manifest for the full scene spec.",
      jobId: `job_${Date.now()}`,
      manifest,
      ffmpegCommand: buildFfmpegCommand(projectName, duration),
      setupInstructions: {
        step1: "Install FFmpeg: https://ffmpeg.org/download.html",
        step2: "Install Puppeteer: npm install puppeteer",
        step3: "Uncomment the 'Real render path' block in /src/app/api/export-video/route.ts",
        step4: "Implement renderFrameToBuffer() using @react-three/offscreen or a headless Puppeteer page.",
      },
    },
    { status: 202 }
  );
}
