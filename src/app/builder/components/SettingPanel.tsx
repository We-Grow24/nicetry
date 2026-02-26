"use client";
/**
 * SettingPanel — converted from wixclone/src/Component/SettingPanel/settingPanel.js
 * Changes made for Next.js compatibility:
 *   - Custom pageDesignContext → ./context
 *   - Sub-panel imports stubbed (createRowsLayout, fontManager, googleAnalytics,
 *     websiteSetting, createNewPage) — connect originals after porting them
 *   - CSS removed (tailwind equivalent used)
 *
 * Original settigMode values:
 *   -1 = closed
 *    0 = Create Rows / Layout
 *    1 = Font Manager
 *    2 = Google Analytics
 *    3 = Website Settings
 *    4 = Create New Page
 */
import { useContext } from "react";
import { pageDesignContext } from "./context";

// ── Stub sub-panels ──────────────────────────────────────────────────────────
function CreateRowsLayout({ closeWin }: { closeWin: () => void }) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Choose a row layout to add to your page.
      </p>
      {[1, 2, 3].map((cols) => (
        <button
          key={cols}
          onClick={closeWin}
          className="w-full flex items-center justify-center gap-1 h-12 border rounded-lg border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-700 dark:hover:bg-indigo-900/20 transition text-sm text-gray-600 dark:text-gray-300"
        >
          {Array.from({ length: cols }, (_, i) => (
            <span key={i} className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
          <span className="ml-2 text-xs text-gray-400">{cols} col{cols > 1 ? "s" : ""}</span>
        </button>
      ))}
    </div>
  );
}

function FontManager({ closeWin }: { closeWin: () => void }) {
  return (
    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
      <p>Font manager — connect to Google Fonts or your font list.</p>
      <button onClick={closeWin} className="mt-3 text-xs text-indigo-600 hover:underline">
        Close
      </button>
    </div>
  );
}

function GoogleAnalytics({ closeWin }: { closeWin: () => void }) {
  return (
    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
      <p>Enter your Google Analytics tracking ID:</p>
      <input
        type="text"
        placeholder="G-XXXXXXXXXX"
        className="mt-2 w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
          Save
        </button>
        <button onClick={closeWin} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

function WebsiteSettings({ closeWin }: { closeWin: () => void }) {
  return (
    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
      <p>Website-level settings (SEO, favicon, custom head scripts).</p>
      <button onClick={closeWin} className="mt-3 text-xs text-indigo-600 hover:underline">
        Close
      </button>
    </div>
  );
}

function CreateNewPage({ closeWin }: { closeWin: () => void }) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">Create a new page:</p>
      <input
        type="text"
        placeholder="Page name"
        className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <div className="flex gap-2">
        <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
          Create
        </button>
        <button onClick={closeWin} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Panel config map ─────────────────────────────────────────────────────────
const PANEL_TITLES: Record<number, string> = {
  0: "Create Layout",
  1: "Font Manager",
  2: "Google Analytics",
  3: "Website Settings",
  4: "New Page",
};

// ── Component ────────────────────────────────────────────────────────────────
export default function SettingPanel() {
  const pageDesignState = useContext(pageDesignContext);

  const closeSettingPanel = () => {
    pageDesignState.setDesign({ ...pageDesignState.design, settigMode: -1 });
  };

  if (pageDesignState.design.settigMode === -1) return null;

  const mode = pageDesignState.design.settigMode;
  const isWide = mode === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: isWide ? "70%" : "600px", width: "100%", maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">
            {PANEL_TITLES[mode] ?? "Settings"}
          </h2>
          <button
            onClick={closeSettingPanel}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto">
          {mode === 0 && <CreateRowsLayout closeWin={closeSettingPanel} />}
          {mode === 1 && <FontManager closeWin={closeSettingPanel} />}
          {mode === 2 && <GoogleAnalytics closeWin={closeSettingPanel} />}
          {mode === 3 && <WebsiteSettings closeWin={closeSettingPanel} />}
          {mode === 4 && <CreateNewPage closeWin={closeSettingPanel} />}
        </div>
      </div>
    </div>
  );
}
