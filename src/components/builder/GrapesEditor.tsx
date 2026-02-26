"use client";
/*  GrapesEditor 
 * Full GrapesJS canvas with all plugins. Panel UIs (blocks, styles, layers,
 * traits) are mounted into external DOM nodes so BuilderPage can arrange them.
 *  */
import { useEffect, useRef } from "react";
import grapesjs, { Editor, Plugin } from "grapesjs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpagePlugin = require("grapesjs-preset-webpage") as Plugin;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const blocksBasic = require("grapesjs-blocks-basic") as Plugin;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindPlugin = require("grapesjs-tailwind") as Plugin;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const formsPlugin = require("grapesjs-plugin-forms") as Plugin;

export interface LibraryBlock {
  id: string;
  name: string;
  niche: string;
  tags: string[];
  html: string;
}

interface Props {
  initialHtml?: string;
  libraryBlocks?: LibraryBlock[];
  onReady?: (editor: Editor) => void;
}

declare global {
  interface Window { __grapes?: Editor; }
}

export default function GrapesEditor({ initialHtml, libraryBlocks = [], onReady }: Props) {
  const mountedRef = useRef(false);
  const editorRef  = useRef<Editor | null>(null);

  //  Add library blocks whenever they arrive (may be after editor init) 
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || libraryBlocks.length === 0) return;
    libraryBlocks.forEach((block) => {
      const key = `lib-${block.id}`;
      if (!editor.BlockManager.get(key)) {
        editor.BlockManager.add(key, {
          label: block.name,
          category: { id: "library", label: " Library" },
          content: block.html,
          attributes: {
            title: block.name,
            "data-tags": block.tags.join(","),
            "data-niche": block.niche,
          },
        });
      }
    });
  }, [libraryBlocks]);

  //  Main GrapesJS init 
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorInit = {  // typed as any below to avoid SelectOption['id'] requirement
      container: "#gjs",
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,

      plugins: [webpagePlugin, blocksBasic, tailwindPlugin, formsPlugin],
      pluginsOpts: {
        "gjs-preset-webpage": {
          blocks: ["link-block", "quote", "text-basic"],
          modalImportTitle: "Import Template",
          modalImportLabel: "Paste HTML/CSS:",
          modalImportContent: "",
        },
        "gjs-blocks-basic": { flexGrid: true, category: " Basic" },
        "grapesjs-tailwind": {},
        "grapesjs-plugin-forms": { category: " Forms" },
      },

      //  No default GrapesJS chrome — everything is in our React layout 
      panels: { defaults: [] },

      blockManager: { appendTo: "#gjs-blocks" },

      styleManager: {
        appendTo: "#gjs-styles",
        sectors: [
          {
            name: "General", open: true,
            properties: [
              { name: "Display", property: "display", type: "select", defaults: "block",
                options: [{ value: "block" }, { value: "flex" }, { value: "grid" }, { value: "inline" }, { value: "none" }] },
              { name: "Width",      property: "width" },
              { name: "Min Width",  property: "min-width" },
              { name: "Max Width",  property: "max-width" },
              { name: "Height",     property: "height" },
            ],
          },
          {
            name: "Typography", open: false,
            properties: [
              { name: "Font Family", property: "font-family", type: "select", defaults: "inherit",
                options: [{ value: "inherit" }, { value: "Arial, sans-serif" }, { value: "'Inter', sans-serif" }, { value: "Georgia, serif" }, { value: "'Roboto', sans-serif" }, { value: "monospace" }] },
              { name: "Font Size",    property: "font-size" },
              { name: "Font Weight",  property: "font-weight", type: "select",
                options: [{ value: "300" }, { value: "400" }, { value: "500" }, { value: "600" }, { value: "700" }, { value: "900" }] },
              { name: "Color",        property: "color",        type: "color" },
              { name: "Line Height",  property: "line-height" },
              { name: "Letter Spacing", property: "letter-spacing" },
              { name: "Text Align",   property: "text-align",   type: "radio",
                options: [{ value: "left", title: "Left" }, { value: "center", title: "Center" }, { value: "right", title: "Right" }] },
            ],
          },
          {
            name: "Spacing", open: false,
            properties: [
              { name: "Padding",        property: "padding" },
              { name: "Padding Top",    property: "padding-top" },
              { name: "Padding Right",  property: "padding-right" },
              { name: "Padding Bottom", property: "padding-bottom" },
              { name: "Padding Left",   property: "padding-left" },
              { name: "Margin",         property: "margin" },
              { name: "Margin Top",     property: "margin-top" },
              { name: "Margin Right",   property: "margin-right" },
              { name: "Margin Bottom",  property: "margin-bottom" },
              { name: "Margin Left",    property: "margin-left" },
            ],
          },
          {
            name: "Background", open: false,
            properties: [
              { name: "Background Color", property: "background-color", type: "color" },
              { name: "Background Image", property: "background-image" },
              { name: "Background Size",  property: "background-size", type: "select",
                options: [{ value: "auto" }, { value: "cover" }, { value: "contain" }] },
              { name: "Background Position", property: "background-position" },
            ],
          },
          {
            name: "Border", open: false,
            properties: [
              { name: "Border",        property: "border" },
              { name: "Border Width",  property: "border-width" },
              { name: "Border Style",  property: "border-style", type: "select",
                options: [{ value: "none" }, { value: "solid" }, { value: "dashed" }, { value: "dotted" }] },
              { name: "Border Color",  property: "border-color",  type: "color" },
              { name: "Border Radius", property: "border-radius" },
            ],
          },
          {
            name: "Effects", open: false,
            properties: [
              { name: "Opacity",    property: "opacity",    type: "slider", defaults: 1, min: 0, max: 1, step: 0.01 },
              { name: "Box Shadow", property: "box-shadow" },
              { name: "Transition", property: "transition" },
              { name: "Transform",  property: "transform" },
            ],
          },
          {
            name: "Flexbox", open: false,
            properties: [
              { name: "Flex Direction",  property: "flex-direction", type: "select",
                options: [{ value: "row" }, { value: "row-reverse" }, { value: "column" }, { value: "column-reverse" }] },
              { name: "Justify Content", property: "justify-content", type: "select",
                options: [{ value: "flex-start" }, { value: "flex-end" }, { value: "center" }, { value: "space-between" }, { value: "space-around" }] },
              { name: "Align Items",     property: "align-items", type: "select",
                options: [{ value: "stretch" }, { value: "flex-start" }, { value: "flex-end" }, { value: "center" }] },
              { name: "Gap", property: "gap" },
            ],
          },
        ],
      },

      layerManager: { appendTo: "#gjs-layers" },
      traitManager: { appendTo: "#gjs-traits" },

      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Tablet",  width: "768px", widthMedia: "992px" },
          { name: "Mobile",  width: "375px", widthMedia: "480px" },
        ],
      },

      // Inject Tailwind CDN + Inter font inside the canvas iframe
      canvas: {
        styles: [
          "https://cdn.tailwindcss.com",
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        ],
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const editor: Editor = grapesjs.init(editorInit);

    // Load initial HTML
    if (initialHtml) editor.setComponents(initialHtml);

    window.__grapes = editor;
    editorRef.current = editor;
    onReady?.(editor);

    return () => {
      editor.destroy();
      window.__grapes = undefined;
      editorRef.current = null;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="gjs" style={{ height: "100%", width: "100%", overflow: "hidden" }} />
  );
}

