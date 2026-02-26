/**
 * /api/export-website
 *
 * Accepts: POST { project_id: string }
 *   OR:    GET  ?project_id=<uuid>
 *
 * Fetches the project's master_director_seed from Supabase, renders each
 * section to HTML (mirroring the GrapesJS seedToHtml logic in BuilderPage),
 * packages the result into a ZIP and returns it as an octet-stream download.
 *
 * ZIP contents:
 *   index.html   — full responsive site
 *   vercel.json  — zero-config Vercel deployment
 *   README.md    — quick-start + deploy instructions
 *   seed.json    — raw master_director_seed for re-import
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import JSZip from "jszip";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedSection {
  type?: string;
  name?: string;
  headline?: string;
  subheadline?: string;
  button?: string;
  [key: string]: unknown;
}

interface MasterDirectorSeed {
  project_name?: string;
  sections?: SeedSection[];
  theme?: { primary?: string; font?: string };
  [key: string]: unknown;
}

// ─── HTML generators ─────────────────────────────────────────────────────────

function sectionToHtml(s: SeedSection, primary: string): string {
  const headline = s.headline ?? s.name ?? "Welcome";
  const sub      = s.subheadline ?? "";
  const btn      = s.button ?? "Get Started";
  const type     = (s.type ?? s.name ?? "").toLowerCase();

  if (type.includes("hero"))
    return `
  <section class="py-24 px-6 text-white text-center" style="background:linear-gradient(135deg,#0f172a,${primary})">
    <h1 class="text-5xl font-bold mb-4">${headline}</h1>
    <p class="text-xl text-white/70 mb-8 max-w-xl mx-auto">${sub}</p>
    <a href="#" class="inline-block px-8 py-3 font-semibold rounded-full transition" style="background:${primary}">${btn}</a>
  </section>`;

  if (type.includes("feature"))
    return `
  <section class="py-20 px-6 bg-gray-50">
    <h2 class="text-3xl font-bold text-center mb-12">${headline}</h2>
    <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      ${[1, 2, 3].map(i => `<div class="bg-white rounded-xl p-6 shadow-sm"><div class="w-10 h-10 rounded-lg mb-4" style="background:${primary}20"></div><h3 class="font-semibold mb-2">Feature ${i}</h3><p class="text-gray-500 text-sm">${sub}</p></div>`).join("")}
    </div>
  </section>`;

  if (type.includes("pricing"))
    return `
  <section class="py-20 px-6 bg-white text-center">
    <h2 class="text-3xl font-bold mb-2">${headline}</h2>
    <p class="text-gray-500 mb-12">${sub}</p>
    <div class="flex flex-col md:flex-row gap-6 justify-center max-w-4xl mx-auto">
      <div class="flex-1 border rounded-2xl p-8"><h3 class="text-xl font-semibold mb-2">Starter</h3><p class="text-4xl font-bold mb-6">$9<span class="text-base text-gray-400">/mo</span></p><a href="#" class="block py-2 px-6 text-white rounded-lg" style="background:${primary}">${btn}</a></div>
      <div class="flex-1 rounded-2xl p-8 shadow-xl border-2" style="border-color:${primary}"><h3 class="text-xl font-semibold mb-2">Pro</h3><p class="text-4xl font-bold mb-6">$29<span class="text-base text-gray-400">/mo</span></p><a href="#" class="block py-2 px-6 text-white rounded-lg" style="background:${primary}">${btn}</a></div>
      <div class="flex-1 border rounded-2xl p-8"><h3 class="text-xl font-semibold mb-2">Enterprise</h3><p class="text-4xl font-bold mb-6">$99<span class="text-base text-gray-400">/mo</span></p><a href="#" class="block py-2 px-6 text-white rounded-lg" style="background:${primary}">${btn}</a></div>
    </div>
  </section>`;

  if (type.includes("cta") || type.includes("banner"))
    return `
  <section class="py-16 px-6 text-white text-center" style="background:${primary}">
    <h2 class="text-3xl font-bold mb-4">${headline}</h2>
    <p class="mb-8" style="color:rgba(255,255,255,0.8)">${sub}</p>
    <a href="#" class="inline-block px-8 py-3 bg-white font-semibold rounded-full hover:opacity-90 transition" style="color:${primary}">${btn}</a>
  </section>`;

  if (type.includes("testimonial") || type.includes("review"))
    return `
  <section class="py-20 px-6 bg-white">
    <h2 class="text-3xl font-bold text-center mb-12">${headline}</h2>
    <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <div class="bg-gray-50 rounded-xl p-6"><p class="text-gray-600 mb-4">"${sub}"</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full" style="background:${primary}60"></div><span class="font-medium text-sm">Jane D.</span></div></div>
      <div class="bg-gray-50 rounded-xl p-6"><p class="text-gray-600 mb-4">"${sub}"</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-green-300"></div><span class="font-medium text-sm">Mark S.</span></div></div>
    </div>
  </section>`;

  if (type.includes("footer"))
    return `
  <footer class="py-12 px-6 text-white" style="background:#0f172a">
    <div class="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="font-bold text-lg">${headline}</p>
      <p class="text-white/50 text-sm">${sub || "© 2026 All rights reserved."}</p>
    </div>
  </footer>`;

  // Generic section fallback
  return `
  <section class="py-16 px-6 bg-white">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4">${headline}</h2>
      ${sub ? `<p class="text-gray-500 mb-6">${sub}</p>` : ""}
      ${btn !== "Get Started" ? `<a href="#" class="inline-block px-6 py-2 text-white rounded-lg" style="background:${primary}">${btn}</a>` : ""}
    </div>
  </section>`;
}

function renderFullHtml(seed: MasterDirectorSeed): string {
  const name    = seed.project_name ?? "My Website";
  const primary = seed.theme?.primary ?? "#6366f1";
  const font    = seed.theme?.font ?? "Inter";
  const sections = seed.sections ?? [];

  // If no sections, build one from top-level seed fields
  const bodyHtml = sections.length > 0
    ? sections.map(s => sectionToHtml(s, primary)).join("\n")
    : sectionToHtml({ type: "hero", headline: name, subheadline: "Built with TailAdmin", button: "Get Started" }, primary);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=${font.replace(/ /g,"+")}:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, body { font-family: '${font}', sans-serif; }
    html { scroll-behavior: smooth; }
  </style>
</head>
<body class="m-0 p-0">
${bodyHtml}
</body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function getProjectId(req: NextRequest): Promise<string | null> {
  if (req.method === "GET") {
    return req.nextUrl.searchParams.get("project_id");
  }
  try {
    const body = await req.json();
    return body?.project_id ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest)  { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }

async function handler(req: NextRequest) {
  const projectId = await getProjectId(req);

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  // Fetch from Supabase
  const sb = await createClient();
  const { data: project, error } = await sb
    .from("projects")
    .select("id, type, master_director_seed")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.type !== "website") {
    return NextResponse.json(
      { error: `Project type is "${project.type}", expected "website"` },
      { status: 400 }
    );
  }

  const seed = (project.master_director_seed ?? {}) as MasterDirectorSeed;
  const name = seed.project_name ?? "my-website";
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Build ZIP
  const zip = new JSZip();

  zip.file("index.html", renderFullHtml(seed));

  zip.file(
    "vercel.json",
    JSON.stringify({ version: 2, rewrites: [{ source: "/(.*)", destination: "/" }] }, null, 2)
  );

  zip.file(
    "README.md",
    `# ${name}

Generated by TailAdmin Website Builder — project ID \`${projectId}\`.

## Preview locally

Open \`index.html\` in any browser.

## Deploy to Vercel

\`\`\`bash
npx vercel
\`\`\`

## Deploy to Netlify

\`\`\`bash
npx netlify deploy --dir . --prod
\`\`\`

## Re-import seed

Upload \`seed.json\` in the builder to restore this project.
`
  );

  zip.file("seed.json", JSON.stringify(seed, null, 2));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
