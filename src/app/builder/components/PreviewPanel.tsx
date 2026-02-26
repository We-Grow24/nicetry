"use client";
/**
 * PreviewPanel — converted from wixclone/src/Component/PreviewPanel/previewPanel.js
 * (original: 1337 lines with DOM manipulation, custom context, 15+ sub-panels)
 *
 * Changes made for Next.js compatibility:
 *   - Custom pageDesignContext → ./context
 *   - lodash set/get, html-react-parser, CSS modules → Tailwind / React
 *   - All 15 sub-panel imports (AnimationOptionsPanel, AddLink, EditSettings…)
 *     are stubbed. The live builder uses the GrapesJS canvas (GrapesEditor)
 *     which provides an equivalent interactive preview panel out of the box.
 *   - react-router-dom removed (not needed in preview panel)
 *
 * TODO: To restore the original wixclone preview panel behaviour:
 *   1. Install lodash: npm i lodash @types/lodash
 *   2. Install html-react-parser: npm i html-react-parser
 *   3. Port each sub-panel file from wixclone/src/Component/PreviewPanel/
 */
import { useContext, useRef, useState } from "react";
import { pageDesignContext } from "./context";

// ── Stub sub-panels (mirrors original imports) ───────────────────────────────
const SubPanel = ({ title }: { title: string }) => (
  <div className="p-4 text-xs text-gray-400 italic">[{title} panel — connect to wixclone sub-panel]</div>
);

// ── Component ────────────────────────────────────────────────────────────────
export default function PreviewPanel() {
  const pageDesignState = useContext(pageDesignContext);

  // Mirrors original refs
  const ElementSwitcher = useRef<HTMLDivElement>(null);
  const ElementNodeSelector = useRef<HTMLDivElement | null>(null);

  // Original panel settings state
  const [panelSettings, setPanelSettings] = useState({
    panelTitle: "Animation",
    panelMode: "animation",
    rowMode: "",
  });

  const [rCount, setRCount] = useState({ refreshCount: 0 });

  // ── Helper mirrors from original ──────────────────────────────────────────

  /**
   * Refresh the preview panel content.
   * Original used lodash `set/get` to mutate pageDesignState.design.
   */
  const refreshPanel = () => {
    setRCount((prev) => ({ refreshCount: prev.refreshCount + 1 }));
  };

  return (
    <div
      className="relative flex flex-col h-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
      data-panelmain
    >
      {/* ── Toolbar (mirrors original operation dock) ─────────────────── */}
      <div
        className="flex items-center gap-1 h-9 px-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
        data-operation
      >
        {/* Device toggle buttons */}
        {(["Desktop", "Tablet", "Mobile"] as const).map((dev) => (
          <button
            key={dev}
            onClick={() => {
              const editor = (window as typeof window & { __grapes?: { setDevice: (d: string) => void } }).__grapes;
              if (editor) editor.setDevice(dev);
            }}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {dev}
          </button>
        ))}

        <span className="flex-1" />

        {/* Undo / Redo */}
        <button
          onClick={() => (window as typeof window & { __grapes?: { UndoManager: { undo: () => void } } }).__grapes?.UndoManager.undo()}
          className="px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Undo"
        >
          ↶
        </button>
        <button
          onClick={() => (window as typeof window & { __grapes?: { UndoManager: { redo: () => void } } }).__grapes?.UndoManager.redo()}
          className="px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Redo"
        >
          ↷
        </button>
      </div>

      {/* ── Canvas area (GrapesJS renders here, this is the container) ── */}
      <div className="flex-1 overflow-hidden bg-gray-200 dark:bg-gray-700" ref={ElementSwitcher}>
        {/* In the live builder, GrapesEditor mounts into #gjs which fills
            the full BuilderPage. This preview panel is kept as a companion
            component; use it when you want a custom canvas overlay. */}
        <div className="flex items-center justify-center h-full text-xs text-gray-400">
          Live canvas is rendered by GrapesJS inside the main
          <code className="mx-1">#gjs</code>container.
        </div>
      </div>

      {/* ── Floating element operation panel (original: elementalOptions ref) ── */}
      <div
        ref={ElementNodeSelector}
        className="absolute top-0 left-0 hidden pointer-events-none z-50"
      >
        {/* Position updated programmatically (see original updateSettingsWidth) */}
      </div>

      {/* ── Side settings panel (panelMode switcher, matches original) ── */}
      {panelSettings.panelMode !== "" && (
        <aside className="absolute right-0 top-9 bottom-0 w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto z-30">
          <div className="flex items-center justify-between px-3 h-9 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {panelSettings.panelTitle}
            </span>
            <button
              onClick={() => setPanelSettings({ ...panelSettings, panelMode: "" })}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Sub-panel stubs — connect original sub-components here */}
          {panelSettings.panelMode === "animation" && <SubPanel title="Animation Options" />}
          {panelSettings.panelMode === "link" && <SubPanel title="Add Link" />}
          {panelSettings.panelMode === "rowWidth" && <SubPanel title="Row Width" />}
          {panelSettings.panelMode === "editSettings" && <SubPanel title="Edit Settings" />}
        </aside>
      )}
    </div>
  );
}
