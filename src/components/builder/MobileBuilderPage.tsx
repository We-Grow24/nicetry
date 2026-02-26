"use client";
/*  MobileBuilderPage 
 * Full-screen mobile app builder built on top of GrapesJS (MobileEditor).
 *
 * URL param: ?project_id=<uuid>   loads from Supabase projects table
 *
 * Layout:
 *  
 *    Top bar  (name  undo/redo  save  preview)               
 *  
 *   Left Panel    Phone-frame canvas         Right Panel       
 *     search     iOS / Android preview      Styles / AI       
 *     blocks                                                  
 *  
 *    Bottom bar    Export PWA    Generate APK                 
 *  
 *  */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Editor } from "grapesjs";
import JSZip from "jszip";
import ExportButton from "@/components/common/ExportButton";

//  Types 
interface Project {
  id: string;
  type: string;
  master_director_seed: Record<string, unknown> | null;
}

type RightTab  = "styles" | "layers" | "traits" | "ai";
type PhoneTheme = "ios" | "android";
type AppDevice  = "iphone14" | "iphonese" | "android";

const DEVICE_WIDTHS: Record<AppDevice, string> = {
  iphone14: "390px",
  iphonese: "375px",
  android: "360px",
};

const DEVICE_LABELS: Record<AppDevice, string> = {
  iphone14: "iPhone 14",
  iphonese: "iPhone SE",
  android: "Android",
};

//  MobileEditor — client-side only 
const MobileEditor = dynamic(() => import("./MobileEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-white text-gray-400 text-xs">
      Loading canvas
    </div>
  ),
});

export default function MobileBuilderPage() {
  const searchParams = useSearchParams();
  const projectId    = searchParams.get("project_id");

  const [editor,       setEditor]       = useState<Editor | null>(null);
  const [project,      setProject]      = useState<Project | null>(null);
  const [projectName,  setProjectName]  = useState("Untitled App");
  const [initialHtml,  setInitialHtml]  = useState<string | undefined>(undefined);

  const [saving,       setSaving]       = useState(false);
  const [savedFlash,   setSavedFlash]   = useState(false);
  const [rightTab,     setRightTab]     = useState<RightTab>("styles");
  const [blockSearch,  setBlockSearch]  = useState("");
  const [phoneTheme,   setPhoneTheme]   = useState<PhoneTheme>("ios");
  const [appDevice,    setAppDevice]    = useState<AppDevice>("iphone14");

  const [aiPrompt,     setAiPrompt]     = useState("");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiResult,     setAiResult]     = useState("");

  const [showApkModal, setShowApkModal] = useState(false);

  // Mobile panel drawer: null = canvas-only, "left" = blocks, "right" = inspector
  const [mobilePanel, setMobilePanel] = useState<"left" | "right" | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  //  Load project 
  useEffect(() => {
    if (!projectId) return;
    async function fetchProject() {
      const sb = createClient();
      const { data, error } = await sb
        .from("projects")
        .select("id,type,master_director_seed")
        .eq("id", projectId)
        .single();
      if (error || !data) return;
      const proj = data as Project;
      setProject(proj);
      const seed = proj.master_director_seed as Record<string, unknown> | null;
      if (seed?.builder_html && typeof seed.builder_html === "string") {
        setInitialHtml(seed.builder_html);
      }
      setProjectName((seed?.project_name as string) ?? "Untitled App");
    }
    fetchProject();
  }, [projectId]);

  //  Auto-save every 30 s 
  useEffect(() => {
    if (!editor) return;
    autoSaveTimer.current = setInterval(() => handleSave(true), 30_000);
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, project]);

  //  Block search filter 
  useEffect(() => {
    const container = document.getElementById("app-blocks");
    if (!container) return;
    const q = blockSearch.toLowerCase().trim();
    container.querySelectorAll<HTMLElement>(".gjs-block").forEach((el) => {
      const title = (el.getAttribute("title") || el.textContent || "").toLowerCase();
      el.style.display = !q || title.includes(q) ? "" : "none";
    });
    container.querySelectorAll<HTMLElement>(".gjs-block-category").forEach((cat) => {
      const visible = Array.from(cat.querySelectorAll<HTMLElement>(".gjs-block"))
        .some((b) => b.style.display !== "none");
      cat.style.display = visible ? "" : "none";
    });
  }, [blockSearch]);

  //  Device switch 
  useEffect(() => {
    if (!editor) return;
    const deviceName = DEVICE_LABELS[appDevice];
    editor.setDevice(deviceName);
  }, [editor, appDevice]);

  //  Save 
  const handleSave = useCallback(async (silent = false) => {
    if (!editor) return;
    if (!silent) setSaving(true);
    const html = editor.getHtml();
    const css  = editor.getCss();
    const seed = {
      ...(project?.master_director_seed ?? {}),
      builder_html: html,
      builder_css:  css,
      project_name: projectName,
      kind: "mobile_app",
    };
    if (projectId) {
      const sb = createClient();
      await sb.from("projects").update({ master_director_seed: seed }).eq("id", projectId);
    }
    if (!silent) {
      setSaving(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }, [editor, project, projectId, projectName]);

  //  Export PWA 
  const handleExportPwa = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHtml();
    const css  = editor.getCss();
    const slug = projectName.toLowerCase().replace(/\s+/g, "-");

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#6366f1" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="${projectName}" />
  <link rel="manifest" href="/manifest.json" />
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; margin: 0; max-width: 430px; margin: 0 auto; overflow-x: hidden; }
    ${css}
  </style>
</head>
<body>
${html}
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
<\/script>
</body>
</html>`;

    const manifestJson = JSON.stringify({
      name: projectName,
      short_name: projectName.split(" ")[0],
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#6366f1",
      orientation: "portrait",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    }, null, 2);

    const swJs = `// Service Worker — Cache-first strategy
const CACHE = '${slug}-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        return caches.open(CACHE).then((c) => { c.put(e.request, res.clone()); return res; });
      })
    )
  );
});`;

    const readmeMd = `# ${projectName} — PWA\n\nGenerated by TailAdmin Mobile Builder.\n\n## Deploy to Vercel\n\n\`\`\`bash\nnpx vercel\n\`\`\`\n\n## Android APK\n\nSee the Generate APK flow in the builder.\n`;

    const zip = new JSZip();
    zip.file("index.html",    indexHtml);
    zip.file("manifest.json", manifestJson);
    zip.file("sw.js",         swJs);
    zip.file("README.md",     readmeMd);

    const blob = await zip.generateAsync({ type: "blob" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${slug}-pwa.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, projectName]);

  //  Download capacitor.config.json 
  const downloadCapacitorConfig = useCallback(() => {
    const slug   = projectName.toLowerCase().replace(/\s+/g, "-");
    const config = {
      appId: `com.example.${slug.replace(/-/g, "")}`,
      appName: projectName,
      webDir: ".",
      bundledWebRuntime: false,
      server: { androidScheme: "https" },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "capacitor.config.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName]);

  //  AI Edit 
  const handleAiEdit = useCallback(async () => {
    if (!editor || !aiPrompt.trim()) return;
    const selected = editor.getSelected();
    if (!selected) { setAiResult(" Select an element first."); return; }
    setAiLoading(true);
    setAiResult("");
    try {
      const res  = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: selected.toHTML(), prompt: aiPrompt }),
      });
      const json = await res.json();
      if (json.css) {
        const parsed = parseCssText(json.css);
        selected.setStyle({ ...selected.getStyle(), ...parsed });
        setAiResult(" Styles applied!");
      } else if (json.html) {
        selected.replaceWith(json.html);
        setAiResult(" Component updated!");
      } else {
        setAiResult(` ${json.error ?? "Unexpected response"}`);
      }
    } catch { setAiResult(" Failed to reach AI API."); }
    finally    { setAiLoading(false); }
  }, [editor, aiPrompt]);

  //  Phone frame chrome 
  const canvasWidth = DEVICE_WIDTHS[appDevice];
  const isIos = phoneTheme === "ios";

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">

      {/* Mobile drawer backdrop */}
      {mobilePanel && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobilePanel(null)}
        />
      )}

      {/*  TOP BAR  */}
      <header className="flex items-center justify-between h-14 px-2 sm:px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" title="Back" className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </div>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-sm font-semibold text-gray-800 dark:text-white bg-transparent border-none outline-none min-w-0 truncate max-w-[140px] hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded focus:bg-gray-50 transition-colors"
          />
        </div>

        {/* Center: device picker (hidden on mobile, replaced by panel toggles) */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["iphone14","iphonese","android"] as AppDevice[]).map((d) => (
            <button
              key={d}
              onClick={() => setAppDevice(d)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                appDevice === d
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {DEVICE_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Mobile-only: panel toggle buttons */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            onClick={() => setMobilePanel((v) => (v === "left" ? null : "left"))}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors ${
              mobilePanel === "left"
                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Blocks</span>
          </button>
          <button
            onClick={() => setMobilePanel((v) => (v === "right" ? null : "right"))}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors ${
              mobilePanel === "right"
                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V12m0 0v6m0-6h6m-6 0H6"/><circle cx="12" cy="12" r="10"/></svg>
            <span>Styles</span>
          </button>
        </div>

        {/* Right: theme + undo/redo + save */}
        <div className="flex items-center gap-1.5">
          {/* iOS / Android theme toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(["ios","android"] as PhoneTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setPhoneTheme(t)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  phoneTheme === t
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "ios" ? " iOS" : " Droid"}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"/>

          <button onClick={() => (window as Window & { __grapesApp?: Editor }).__grapesApp?.UndoManager?.undo()} title="Undo"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
          </button>
          <button onClick={() => (window as Window & { __grapesApp?: Editor }).__grapesApp?.UndoManager?.redo()} title="Redo"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/></svg>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"/>

          <ExportButton
            projectId={projectId}
            projectType="app"
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"/>

          <button onClick={() => handleSave(false)} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 h-8 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 active:bg-violet-800 transition-colors disabled:opacity-60 shadow-sm">
            {saving    ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Saving</> :
             savedFlash ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Saved!</> :
             <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg> Save</>}
          </button>
        </div>
      </header>

      {/*  EDITOR ROW  */}
      <div className="flex flex-1 overflow-hidden">

        {/*  LEFT PANEL  */}
        <aside className={`
          ${mobilePanel === "left"
            ? "fixed top-14 bottom-12 left-0 w-72 z-40 shadow-2xl"
            : "hidden"}
          md:relative md:top-auto md:bottom-auto md:left-auto md:flex md:w-60 md:shadow-none md:z-10
          flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-hidden
        `}>
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Mobile Blocks</p>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
              </svg>
              <input type="text" placeholder="Search blocks" value={blockSearch} onChange={(e) => setBlockSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-violet-400 text-gray-700 dark:text-gray-300 placeholder-gray-400 transition-colors"/>
            </div>
          </div>
          <div id="app-blocks" className="flex-1 overflow-y-auto app-blocks-panel"/>
        </aside>

        {/*  CANVAS: Phone Frame  */}
        <main className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-800 flex items-start justify-center py-8">
          <div className="flex flex-col items-center gap-0 shrink-0">
            {/* Phone outer shell */}
            <div
              className={`relative bg-gray-900 shadow-2xl ${isIos ? "rounded-[44px]" : "rounded-[28px]"}`}
              style={{ width: `calc(${canvasWidth} + 24px)`, padding: "12px" }}
            >
              {/* Side buttons */}
              <div className="absolute left-0 top-[88px] w-1 h-8 bg-gray-700 rounded-l-sm" />
              <div className="absolute left-0 top-[130px] w-1 h-10 bg-gray-700 rounded-l-sm" />
              <div className="absolute left-0 top-[152px] w-1 h-10 bg-gray-700 rounded-l-sm" />
              <div className="absolute right-0 top-[116px] w-1 h-14 bg-gray-700 rounded-r-sm" />

              {/* Screen bezel */}
              <div
                className={`relative overflow-hidden bg-white ${isIos ? "rounded-[36px]" : "rounded-[20px]"}`}
                style={{ width: canvasWidth, height: "780px" }}
              >
                {/* Notch (iOS) */}
                {isIos && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[34px] bg-gray-900 rounded-b-3xl flex items-center justify-center gap-2">
                    <div className="w-12 h-3 bg-black rounded-full" />
                    <div className="w-3 h-3 bg-gray-800 rounded-full border border-gray-700" />
                  </div>
                )}

                {/* Camera bar (Android) */}
                {!isIos && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-3 h-3 bg-gray-800 rounded-full border border-gray-700" />
                )}

                {/* GrapesJS canvas fills screen */}
                <div className="absolute inset-0">
                  <MobileEditor
                    initialHtml={initialHtml}
                    onReady={setEditor}
                  />
                </div>

                {/* Home indicator (iOS) */}
                {isIos && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[120px] h-1 bg-gray-900/30 rounded-full pointer-events-none" />
                )}
              </div>
            </div>

            {/* Device label */}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
              {DEVICE_LABELS[appDevice]}  {canvasWidth}  {phoneTheme === "ios" ? "iOS" : "Android"}
            </p>
          </div>
        </main>

        {/*  RIGHT PANEL  */}
        <aside className={`
          ${mobilePanel === "right"
            ? "fixed top-14 bottom-12 right-0 w-80 z-40 shadow-2xl"
            : "hidden"}
          md:relative md:top-auto md:bottom-auto md:right-auto md:flex md:w-72 md:shadow-none md:z-10
          flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-hidden
        `}>
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0">
            {([
              { key: "styles", label: "Styles" },
              { key: "layers", label: "Layers" },
              { key: "traits", label: "Traits" },
              { key: "ai",     label: " AI" },
            ] as { key: RightTab; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setRightTab(key)}
                className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                  rightTab === key
                    ? "border-violet-600 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div id="app-styles" className={`app-style-panel absolute inset-0 overflow-y-auto ${rightTab === "styles" ? "" : "hidden"}`} />
            <div id="app-layers" className={`app-layers-panel absolute inset-0 overflow-y-auto ${rightTab === "layers" ? "" : "hidden"}`} />
            <div id="app-traits" className={`app-traits-panel absolute inset-0 overflow-y-auto p-2 ${rightTab === "traits" ? "" : "hidden"}`} />

            {rightTab === "ai" && (
              <div className="absolute inset-0 flex flex-col p-4 overflow-y-auto gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">AI Element Editor</p>
                  <p className="text-xs text-gray-400">Click a block on the phone, then describe your change.</p>
                </div>
                <textarea rows={4} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. make the card dark with a purple gradient"
                  className="w-full text-xs p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-violet-400 resize-none transition-colors"/>
                <button onClick={handleAiEdit} disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-sm">
                  {aiLoading
                    ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Applying</>
                    : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Apply AI Edit</>}
                </button>
                {aiResult && (
                  <p className={`text-xs rounded-lg px-3 py-2 ${aiResult.startsWith("") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{aiResult}</p>
                )}
                <div className="mt-1 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-500 mb-2">Quick prompts</p>
                  {["Dark mode style", "Glassmorphism card", "Bold colorful hero", "Minimal white layout", "Gradient accent color"].map((p) => (
                    <button key={p} onClick={() => setAiPrompt(p)}
                      className="w-full text-left text-xs px-2.5 py-1.5 mb-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/*  BOTTOM BAR  */}
      <footer className="flex items-center justify-between px-4 h-12 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0 z-20">
        <p className="text-xs text-gray-400 dark:text-gray-500">Auto-saves every 30 s</p>
        <div className="flex items-center gap-2">
          {/* Export PWA */}
          <button onClick={handleExportPwa}
            className="inline-flex items-center gap-2 px-4 h-8 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5l-6-6 1.41-1.41L11 15.67V3h2v12.67l3.59-3.58L18 13.5l-6 5z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 21H4v-2h16v2z"/>
            </svg>
            Export PWA
          </button>

          {/* Generate APK */}
          <button onClick={() => setShowApkModal(true)}
            className="inline-flex items-center gap-2 px-4 h-8 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
            Generate APK
          </button>
        </div>
      </footer>

      {/*  APK INSTRUCTIONS MODAL  */}
      {showApkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Generate Android APK</h2>
                  <p className="text-xs text-gray-400">Using Capacitor + Android Studio</p>
                </div>
              </div>
              <button onClick={() => setShowApkModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Steps */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-xs text-gray-500 leading-relaxed">
                Export your PWA first, then follow these steps to wrap it in a native Android APK using Capacitor.
              </p>

              {[
                {
                  step: "1",
                  title: "Export your PWA",
                  desc: "Click Export PWA in the bottom bar first. Extract the ZIP into a new folder.",
                  code: null,
                },
                {
                  step: "2",
                  title: "Download capacitor.config.json",
                  desc: "Place this file in your project root (same folder as index.html).",
                  code: null,
                  action: true,
                },
                {
                  step: "3",
                  title: "Install Node dependencies",
                  desc: "Run this in your project folder:",
                  code: "npm init -y\nnpm install @capacitor/core @capacitor/cli @capacitor/android",
                },
                {
                  step: "4",
                  title: "Initialize Capacitor",
                  desc: "Initialize and add the Android platform:",
                  code: `npx cap init "${projectName}" com.example.${projectName.toLowerCase().replace(/\s+/g, "")}\nnpx cap add android`,
                },
                {
                  step: "5",
                  title: "Copy web assets & build",
                  desc: "Sync your web files into the Android project:",
                  code: "npx cap copy android\nnpx cap sync android",
                },
                {
                  step: "6",
                  title: "Build APK",
                  desc: "Open Android Studio and build, or use Gradle directly:",
                  code: "npx cap open android\n# In Android Studio: Build  Build Bundle(s) / APK(s)  Build APK(s)",
                },
                {
                  step: "7",
                  title: "Install on device",
                  desc: "Find the APK at:",
                  code: "android/app/build/outputs/apk/debug/app-debug.apk",
                },
              ].map(({ step, title, desc, code, action }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{step}</div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">{title}</p>
                    <p className="text-xs text-gray-500 mb-2">{desc}</p>
                    {action && (
                      <button onClick={downloadCapacitorConfig}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Download capacitor.config.json
                      </button>
                    )}
                    {code && (
                      <pre className="bg-gray-900 text-green-400 text-[11px] leading-relaxed rounded-lg p-3 overflow-x-auto font-mono">{code}</pre>
                    )}
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Requirements</p>
                <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-0.5 list-disc list-inside">
                  <li>Node.js 18+</li>
                  <li>Android Studio with SDK 33+</li>
                  <li>Java 17 (JDK)</li>
                </ul>
              </div>
            </div>

            <div className="px-6 pb-5">
              <button onClick={() => setShowApkModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseCssText(cssText: string): Record<string, string> {
  const result: Record<string, string> = {};
  cssText.replace(/\/\*[^]*?\*\//g, "").split(";").forEach((d) => {
    const [prop, ...vals] = d.split(":");
    if (prop && vals.length) {
      const key = prop.trim().replace(/-([a-z])/g, (_, l: string) => l.toUpperCase());
      result[key] = vals.join(":").trim();
    }
  });
  return result;
}
