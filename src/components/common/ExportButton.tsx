"use client";
/**
 * ExportButton
 *
 * A universal "Export ▾" dropdown placed in every builder's top navbar.
 *
 * Props:
 *   projectId   — Supabase project UUID. If null, the button is disabled with
 *                 a "Save project first" tooltip.
 *   projectType — "website" | "game" | "video" | "saas" | "app"
 *                 Controls which export options appear in the dropdown.
 *   onLocalExport — Optional: replace the API call with a local ZIP generation
 *                   (used by BuilderPage / SaasWorkflowBuilder which already
 *                    have their own HTML-from-editor logic).
 *   className   — Additional Tailwind classes on the wrapper.
 *
 * Each export option calls the relevant API route with the project_id,
 * receives an application/zip response, and streams it as a browser download.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Option definitions ───────────────────────────────────────────────────────

export type ExportType = "website" | "game" | "video" | "saas" | "app";

interface ExportOption {
  key: string;
  label: string;
  icon: string;
  description: string;
  endpoint: string;
  /** filename hint (overrides Content-Disposition if needed) */
  filename?: string;
}

const EXPORT_OPTIONS: Record<ExportType, ExportOption[]> = {
  website: [
    {
      key: "website-zip",
      label: "Export Website ZIP",
      icon: "🌐",
      description: "HTML + Tailwind + vercel.json — deploy instantly",
      endpoint: "/api/export-website",
    },
    {
      key: "app-zip",
      label: "Export Mobile App (APK)",
      icon: "📱",
      description: "Capacitor config + mobile HTML — build with Android Studio",
      endpoint: "/api/export-app",
    },
  ],
  app: [
    {
      key: "app-zip",
      label: "Export Mobile App (APK)",
      icon: "📱",
      description: "Capacitor config + mobile HTML — build with Android Studio",
      endpoint: "/api/export-app",
    },
    {
      key: "website-zip",
      label: "Export as Website ZIP",
      icon: "🌐",
      description: "Plain HTML + deploy instructions",
      endpoint: "/api/export-website",
    },
  ],
  game: [
    {
      key: "game-zip",
      label: "Export Godot Project",
      icon: "🎮",
      description: "Godot 4 project + GDScript bootstrap + EXE instructions",
      endpoint: "/api/export-game",
    },
  ],
  video: [
    {
      key: "video-zip",
      label: "Export Video Package",
      icon: "🎬",
      description: "Render manifest + FFmpeg script → encode to MP4",
      endpoint: "/api/export-video",
    },
  ],
  saas: [
    {
      key: "saas-zip",
      label: "Export SaaS ZIP",
      icon: "🚀",
      description: "Next.js API routes + workflow JSON + README",
      endpoint: "/api/export-website",
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ExportButtonProps {
  projectId: string | null;
  projectType: ExportType;
  /** Called instead of API when provided (e.g. GrapesJS local export) */
  onLocalExport?: (key: string) => Promise<void> | void;
  className?: string;
  /** Dark top-bar variant (e.g. VideoCreator, SaasWorkflowBuilder) */
  dark?: boolean;
}

type OptionState = "idle" | "loading" | "done" | "error";

export default function ExportButton({
  projectId,
  projectType,
  onLocalExport,
  className = "",
  dark = false,
}: ExportButtonProps) {
  const [open, setOpen]         = useState(false);
  const [status, setStatus]     = useState<Record<string, OptionState>>({});
  const [errMsg, setErrMsg]     = useState<Record<string, string>>({});
  const containerRef            = useRef<HTMLDivElement>(null);

  const options = EXPORT_OPTIONS[projectType] ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = useCallback(
    async (opt: ExportOption) => {
      if (!projectId) return;

      // Local export shortcut
      if (onLocalExport) {
        setStatus((s) => ({ ...s, [opt.key]: "loading" }));
        try {
          await onLocalExport(opt.key);
          setStatus((s) => ({ ...s, [opt.key]: "done" }));
          setTimeout(() => setStatus((s) => ({ ...s, [opt.key]: "idle" })), 3000);
        } catch (err) {
          setStatus((s) => ({ ...s, [opt.key]: "error" }));
          setErrMsg((m) => ({ ...m, [opt.key]: String(err) }));
        }
        return;
      }

      setStatus((s) => ({ ...s, [opt.key]: "loading" }));
      setErrMsg((m) => ({ ...m, [opt.key]: "" }));

      try {
        const res = await fetch(opt.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }

        // Derive filename from Content-Disposition or fallback
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = disposition.match(/filename="?([^";]+)"?/);
        const filename =
          match?.[1] ??
          opt.filename ??
          `${projectType}-export-${Date.now()}.zip`;

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        setStatus((s) => ({ ...s, [opt.key]: "done" }));
        setTimeout(() => setStatus((s) => ({ ...s, [opt.key]: "idle" })), 3500);
      } catch (err) {
        setStatus((s) => ({ ...s, [opt.key]: "error" }));
        setErrMsg((m) => ({ ...m, [opt.key]: String(err instanceof Error ? err.message : err) }));
        setTimeout(() => setStatus((s) => ({ ...s, [opt.key]: "idle" })), 5000);
      }
    },
    [projectId, projectType, onLocalExport]
  );

  const isAnyLoading = Object.values(status).some((v) => v === "loading");
  const noProject    = !projectId;

  // ── Button styles (light vs dark toolbar) ────────────────────────────────

  const triggerBase = dark
    ? "inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white transition-colors"
    : "inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => !noProject && setOpen((o) => !o)}
        disabled={isAnyLoading}
        title={noProject ? "Save the project first to enable export" : "Export project"}
        className={triggerBase}
      >
        {isAnyLoading ? (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        Export
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* "Save first" hint */}
      {noProject && (
        <div className="absolute right-0 top-10 z-50 w-52 bg-gray-900 text-white text-xs rounded-xl shadow-xl px-4 py-3 pointer-events-none">
          Save the project first to unlock export.
        </div>
      )}

      {/* Dropdown */}
      {open && !noProject && (
        <div className="absolute right-0 top-10 z-50 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Export options
            </p>
          </div>

          <ul className="py-1">
            {options.map((opt) => {
              const state = status[opt.key] ?? "idle";
              return (
                <li key={opt.key}>
                  <button
                    onClick={() => handleExport(opt)}
                    disabled={state === "loading"}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-60"
                  >
                    <span className="text-lg leading-none mt-0.5 shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {opt.label}
                        </span>
                        {state === "loading" && (
                          <svg className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        )}
                        {state === "done" && (
                          <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {state === "error" && (
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {state === "error"
                          ? (errMsg[opt.key] ?? "Export failed")
                          : state === "done"
                          ? "Download started!"
                          : opt.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Project ID: <span className="font-mono">{projectId?.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
