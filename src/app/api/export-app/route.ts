/**
 * /api/export-app
 *
 * Accepts: POST { project_id: string }
 *   OR:    GET  ?project_id=<uuid>
 *
 * Fetches the project's master_director_seed from Supabase, renders a
 * mobile-first HTML shell, adds a Capacitor configuration, and returns a ZIP
 * that the developer can immediately open in Android Studio or Xcode.
 *
 * ZIP contents:
 *   www/index.html        — Capacitor web layer (mobile HTML)
 *   www/manifest.json     — PWA manifest
 *   capacitor.config.json — Capacitor project config
 *   package.json          — Minimal package.json with Capacitor deps
 *   README.md             — Step-by-step APK / IPA build guide
 *   seed.json             — Raw director seed for re-import
 *
 * Quick-start (after unzipping):
 *   npm install
 *   npx cap add android   # or ios
 *   npx cap sync
 *   npx cap open android  # opens Android Studio → Build → Generate APK
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
  cta?: string;
  [key: string]: unknown;
}

interface MasterDirectorSeed {
  project_name?: string;
  app_id?: string;
  sections?: SeedSection[];
  theme?: { primary?: string; font?: string; dark?: boolean };
  [key: string]: unknown;
}

// ─── Mobile HTML renderer ─────────────────────────────────────────────────────

function sectionToMobileHtml(s: SeedSection, primary: string): string {
  const title = s.headline ?? s.name ?? "Screen";
  const sub   = s.subheadline ?? "";
  const cta   = s.cta ?? "Continue";
  const type  = (s.type ?? s.name ?? "").toLowerCase();

  if (type.includes("splash") || type.includes("hero") || type.includes("onboard"))
    return `
  <section class="screen" id="screen-${type}">
    <div class="screen-hero">
      <div class="screen-icon" style="background:${primary}"></div>
      <h1>${title}</h1>
      <p>${sub}</p>
      <button class="btn-primary" style="background:${primary}" onclick="showNext(this)">${cta}</button>
    </div>
  </section>`;

  if (type.includes("feature") || type.includes("list"))
    return `
  <section class="screen" id="screen-${type}">
    <div class="screen-body">
      <h2>${title}</h2>
      <p class="sub">${sub}</p>
      <ul class="feature-list">
        <li><span class="dot" style="background:${primary}"></span>Core Feature</li>
        <li><span class="dot" style="background:${primary}"></span>Premium Access</li>
        <li><span class="dot" style="background:${primary}"></span>Instant Sync</li>
      </ul>
      <button class="btn-primary" style="background:${primary}" onclick="showNext(this)">${cta}</button>
    </div>
  </section>`;

  if (type.includes("login") || type.includes("signin") || type.includes("auth"))
    return `
  <section class="screen" id="screen-${type}">
    <div class="screen-body">
      <h2>${title}</h2>
      <p class="sub">${sub}</p>
      <form class="auth-form" onsubmit="return false">
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button class="btn-primary" style="background:${primary}">${cta}</button>
        <a href="#" class="link">Forgot password?</a>
      </form>
    </div>
  </section>`;

  if (type.includes("dashboard") || type.includes("home") || type.includes("feed"))
    return `
  <section class="screen" id="screen-${type}">
    <div class="screen-body">
      <h2>${title}</h2>
      <p class="sub">${sub}</p>
      <div class="card-grid">
        <div class="card" style="border-left:3px solid ${primary}"><p class="card-label">Today</p><p class="card-val">24</p></div>
        <div class="card" style="border-left:3px solid ${primary}"><p class="card-label">Total</p><p class="card-val">1,208</p></div>
      </div>
    </div>
  </section>`;

  // Generic screen fallback
  return `
  <section class="screen" id="screen-${type}">
    <div class="screen-body">
      <h2>${title}</h2>
      ${sub ? `<p class="sub">${sub}</p>` : ""}
      <button class="btn-primary" style="background:${primary}" onclick="showNext(this)">${cta}</button>
    </div>
  </section>`;
}

function renderMobileHtml(seed: MasterDirectorSeed): string {
  const name     = seed.project_name ?? "My App";
  const primary  = seed.theme?.primary ?? "#6366f1";
  const font     = seed.theme?.font ?? "Inter";
  const dark     = seed.theme?.dark ?? false;
  const sections = seed.sections ?? [];

  const bodyHtml = sections.length > 0
    ? sections.map(s => sectionToMobileHtml(s, primary)).join("\n")
    : sectionToMobileHtml({ type: "hero", headline: name, subheadline: "Mobile App", cta: "Get Started" }, primary);

  return `<!DOCTYPE html>
<html lang="en" data-theme="${dark ? "dark" : "light"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="theme-color" content="${primary}" />
  <title>${name}</title>
  <link rel="manifest" href="manifest.json" />
  <link href="https://fonts.googleapis.com/css2?family=${font.replace(/ /g,"+")}:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, body { font-family: '${font}', sans-serif; box-sizing: border-box; }
    body { margin: 0; background: ${dark ? "#0f172a" : "#f8fafc"}; color: ${dark ? "#f1f5f9" : "#1e293b"}; }
    .app-shell { max-width: 430px; margin: 0 auto; min-height: 100dvh; overflow: hidden; position: relative; }
    .screen { display: none; min-height: 100dvh; flex-direction: column; }
    .screen.active { display: flex; }
    .screen-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100dvh; padding: 2rem; text-align: center; gap: 1.25rem; }
    .screen-hero h1 { font-size: 2rem; font-weight: 700; margin: 0; }
    .screen-hero p { font-size: 1rem; opacity: .7; margin: 0; max-width: 280px; }
    .screen-icon { width: 80px; height: 80px; border-radius: 24px; opacity: .9; }
    .screen-body { padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .screen-body h2 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .sub { opacity: .6; margin: 0; }
    .btn-primary { width: 100%; padding: .875rem; border: none; border-radius: 14px; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: .5rem; transition: opacity .15s; }
    .btn-primary:active { opacity: .8; }
    .auth-form { display: flex; flex-direction: column; gap: .875rem; }
    .auth-form input { padding: .875rem 1rem; border: 1.5px solid ${dark ? "#334155" : "#e2e8f0"}; border-radius: 12px; background: ${dark ? "#1e293b" : "#fff"}; color: inherit; font-size: .9375rem; outline: none; }
    .auth-form input:focus { border-color: ${primary}; }
    .link { text-align: center; color: ${primary}; text-decoration: none; font-size: .875rem; }
    .feature-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem; }
    .feature-list li { display: flex; align-items: center; gap: .75rem; font-size: .9375rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .card { background: ${dark ? "#1e293b" : "#fff"}; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .card-label { font-size: .75rem; opacity: .6; margin: 0 0 .25rem; text-transform: uppercase; letter-spacing: .04em; }
    .card-val { font-size: 1.5rem; font-weight: 700; margin: 0; }
  </style>
</head>
<body>
<div class="app-shell">
${bodyHtml}
</div>

<script>
  // Activate first screen
  const screens = document.querySelectorAll('.screen');
  if (screens.length) screens[0].classList.add('active');

  function showNext(btn) {
    const currentScreen = btn.closest('.screen');
    const allScreens = Array.from(document.querySelectorAll('.screen'));
    const idx = allScreens.indexOf(currentScreen);
    if (currentScreen) currentScreen.classList.remove('active');
    const next = allScreens[idx + 1];
    if (next) next.classList.add('active');
  }

  // Capacitor-ready (no-ops in browser, real events in native)
  document.addEventListener('deviceready', function () {
    console.log('[${name}] Capacitor device ready');
  }, false);
<\/script>
</body>
</html>`;
}

// ─── Capacitor config ─────────────────────────────────────────────────────────

function buildCapacitorConfig(name: string, seed: MasterDirectorSeed): string {
  const appId = seed.app_id
    ?? `com.tailadmin.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return JSON.stringify(
    {
      appId,
      appName: name,
      webDir: "www",
      bundledWebRuntime: false,
      server: { androidScheme: "https" },
      android: {
        buildOptions: { keystorePath: null, keystoreAlias: null },
        allowMixedContent: true,
      },
      ios: { contentInset: "always" },
      plugins: {
        SplashScreen: {
          launchShowDuration: 2000,
          backgroundColor: seed.theme?.primary ?? "#6366f1",
          showSpinner: false,
        },
        StatusBar: { style: "default" },
      },
    },
    null,
    2
  );
}

function buildPackageJson(name: string): string {
  const safeName = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return JSON.stringify(
    {
      name: safeName,
      version: "1.0.0",
      description: `${name} — generated by TailAdmin App Builder`,
      scripts: {
        "build": "echo 'No build step — web layer is static HTML'",
        "android": "npx cap sync && npx cap open android",
        "ios": "npx cap sync && npx cap open ios",
        "serve": "npx cap serve",
      },
      dependencies: {
        "@capacitor/core": "^5.0.0",
        "@capacitor/android": "^5.0.0",
        "@capacitor/ios": "^5.0.0",
        "@capacitor/splash-screen": "^5.0.0",
        "@capacitor/status-bar": "^5.0.0",
      },
      devDependencies: {
        "@capacitor/cli": "^5.0.0",
      },
    },
    null,
    2
  );
}

function buildReadme(name: string, seed: MasterDirectorSeed): string {
  const appId =
    seed.app_id ??
    `com.tailadmin.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return `# ${name} — Capacitor App Export

Auto-generated by **TailAdmin App Builder**.

## 📁 ZIP contents

| Path | Description |
|------|-------------|
| \`www/index.html\` | Mobile HTML (Capacitor web layer) |
| \`www/manifest.json\` | PWA manifest |
| \`capacitor.config.json\` | Capacitor project config |
| \`package.json\` | Dependencies |
| \`seed.json\` | Raw director seed |

## 🔧 Prerequisites

- **Node.js** ≥ 18 — <https://nodejs.org>
- **Android Studio** (for APK) — <https://developer.android.com/studio>
- **Xcode** ≥ 15 (for IPA, macOS only) — via Mac App Store
- **Java** 17+ (bundled with Android Studio)

## 🚀 Quick start

\`\`\`bash
# 1. Install dependencies
npm install
npx cap init "${name}" "${appId}" --web-dir www

# 2. Add platforms
npx cap add android
# npx cap add ios   ← macOS only

# 3. Sync web assets into native project
npx cap sync
\`\`\`

## 📱 Build Android APK (debug)

\`\`\`bash
npx cap open android
# Android Studio opens → Build → Build Bundle(s) / APK(s) → Build APK(s)
# Output: app/build/outputs/apk/debug/app-debug.apk
\`\`\`

## 📱 Build Android APK (release / signed)

\`\`\`bash
# In Android Studio:
# Build → Generate Signed Bundle / APK → APK → create/select keystore → finish
\`\`\`

## 🍎 Build iOS IPA (macOS only)

\`\`\`bash
npx cap open ios
# Xcode opens → Product → Archive → Distribute App
\`\`\`

## 🌐 Test in browser (PWA mode)

\`\`\`bash
npx cap serve
# Opens http://localhost:3000
\`\`\`

## ♻️ Re-import seed

Upload \`seed.json\` in the TailAdmin App Builder to restore this project.
App ID: \`${appId}\`
`;
}

// ─── PWA manifest ──────────────────────────────────────────────────────────────

function buildPwaManifest(name: string, primary: string): string {
  return JSON.stringify(
    {
      name,
      short_name: name.split(" ")[0],
      start_url: "/",
      display: "standalone",
      background_color: primary,
      theme_color: primary,
      orientation: "portrait",
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function getProjectId(req: NextRequest): Promise<string | null> {
  if (req.method === "GET") return req.nextUrl.searchParams.get("project_id");
  try { return (await req.json())?.project_id ?? null; } catch { return null; }
}

export async function GET(req: NextRequest)  { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }

async function handler(req: NextRequest) {
  const projectId = await getProjectId(req);
  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  const sb = await createClient();
  const { data: project, error } = await sb
    .from("projects")
    .select("id, type, master_director_seed")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Accept both "website" type (mobile first) and any generic project
  const seed    = (project.master_director_seed ?? {}) as MasterDirectorSeed;
  const name    = seed.project_name ?? "My App";
  const slug    = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const primary = seed.theme?.primary ?? "#6366f1";

  const zip = new JSZip();
  const www = zip.folder("www")!;

  www.file("index.html",   renderMobileHtml(seed));
  www.file("manifest.json", buildPwaManifest(name, primary));

  zip.file("capacitor.config.json", buildCapacitorConfig(name, seed));
  zip.file("package.json",          buildPackageJson(name));
  zip.file("README.md",             buildReadme(name, seed));
  zip.file("seed.json",             JSON.stringify(seed, null, 2));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-app.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
