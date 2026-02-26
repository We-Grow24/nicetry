"use client";
/**
 * Sidecolumn — converted from wixclone/src/Component/Sidecolumn/sidecolumn.js
 * Changes made for Next.js compatibility:
 *   - CSS modules replaced with Tailwind classes
 *   - Sub-components (SideColumnLayout, HtmlElement, ElementLayer) stubbed
 *     since they reference 40+ internal files; use GrapesJS block/layer
 *     managers as the live equivalent (grapesjs-preset-webpage)
 */
import { useContext, useRef, useState } from "react";
import { pageDesignContext } from "./context";

// ── Stub sub-panels ──────────────────────────────────────────────────────────
function SideColumnLayout() {
  return (
    <div className="p-3 text-xs text-gray-500">
      Layout elements powered by GrapesJS blocks panel (left side of the editor).
    </div>
  );
}

function HtmlElement() {
  return (
    <div className="p-3 text-xs text-gray-500">
      HTML elements are available in the GrapesJS blocks panel.
    </div>
  );
}

function ElementLayer({ layerKey }: { layerKey: string | null }) {
  return (
    <div className="p-3 text-xs text-gray-500">
      Layers are shown in the GrapesJS layers panel (right side of the editor).
      <br />
      Active layer key: <code>{layerKey ?? "none"}</code>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
const icons = [
  // panel 0 — layout
  <svg key="layout" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>,
  // panel 1 — elements
  <svg key="elements" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>,
  // panel 2 — layers
  <svg key="layers" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
  </svg>,
];

// ── Component ────────────────────────────────────────────────────────────────
export default function SideColumn({ prevWid }: { prevWid?: { width: string } }) {
  const markerpos = useRef<HTMLSpanElement>(null);
  const pageDesignState = useContext(pageDesignContext);

  const [panelMode, setPanelMode] = useState(0);

  const updateMarkerPos = (e: React.MouseEvent<HTMLLIElement>) => {
    if (!markerpos.current) return;
    markerpos.current.style.scale = "1";
    markerpos.current.style.top =
      (e.currentTarget.getBoundingClientRect().top - 40) + "px";
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Options bar (original: sidebar_optionsbar) */}
      <div
        className="flex flex-col items-center py-2 w-12 border-r border-gray-100 dark:border-gray-800 relative"
        onMouseEnter={() => {
          if (markerpos.current) markerpos.current.style.display = "block";
        }}
        onMouseLeave={() => {
          if (markerpos.current) markerpos.current.style.display = "none";
        }}
      >
        <ul className="flex flex-col gap-1">
          {icons.map((icon, i) => (
            <li
              key={i}
              onClick={() => setPanelMode(i)}
              onMouseEnter={updateMarkerPos}
              className={`flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-colors ${
                panelMode === i
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {icon}
            </li>
          ))}
        </ul>

        {/* Highlight marker (original: sidebar_option_highlighter) */}
        <span
          ref={markerpos}
          className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full transition-all duration-150 hidden"
          style={{ top: 0, scale: "0" }}
        />
      </div>

      {/* Panel results (original: sidebar_optionResults) */}
      <div
        className="flex-1 overflow-y-auto"
        style={prevWid}
      >
        {panelMode === 0 && <SideColumnLayout />}
        {panelMode === 1 && <HtmlElement />}
        {panelMode === 2 && (
          <ElementLayer layerKey={pageDesignState.activeElemLayer.current} />
        )}
      </div>
    </div>
  );
}
