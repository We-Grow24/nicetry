"use client";
/*  MobileEditor 
 * GrapesJS canvas tuned for mobile app screens:
 *  - Fixed 375px viewport (all other device options removed)
 *  - Custom mobile-pattern blocks registered under #app-blocks
 *  - Style/Layer/Trait managers mount into #app-styles / #app-layers / #app-traits
 *  - Tailwind CDN + Inter injected into canvas iframe
 *  */
import { useEffect, useRef } from "react";
import grapesjs, { Editor, Plugin } from "grapesjs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const formsPlugin = require("grapesjs-plugin-forms") as Plugin;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindPlugin = require("grapesjs-tailwind") as Plugin;

interface Props {
  initialHtml?: string;
  onReady?: (editor: Editor) => void;
}

declare global {
  interface Window { __grapesApp?: Editor; }
}

//  Mobile block definitions 
const MOBILE_BLOCKS = [
  {
    id: "mb-statusbar",
    label: "Status Bar",
    category: " Structure",
    content: `<div class="flex items-center justify-between px-5 pt-3 pb-1 bg-white text-xs font-semibold">
  <span>9:41</span>
  <div class="flex gap-1 items-center">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect x="1" y="7" width="3" height="9" rx="1"/><rect x="6" y="4" width="3" height="12" rx="1"/><rect x="11" y="1" width="3" height="15" rx="1"/><rect x="16" y="5" width="3" height="11" rx="1"/></svg>
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8-8-3.582-8-8zm8-6a6 6 0 100 12A6 6 0 0010 4z"/></svg>
    <div class="w-6 h-3 border border-current rounded-sm relative"><div class="absolute inset-0.5 left-0.5 right-1.5 bg-current rounded-sm"></div><div class="absolute right-0 top-0.5 bottom-0.5 w-0.5 bg-current rounded-r-sm"></div></div>
  </div>
</div>`,
  },
  {
    id: "mb-navbar",
    label: "App Header",
    category: " Structure",
    content: `<header class="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
  <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
  </button>
  <h1 class="text-base font-semibold text-gray-900">App Title</h1>
  <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/></svg>
  </button>
</header>`,
  },
  {
    id: "mb-tabbar",
    label: "Tab Bar",
    category: " Structure",
    content: `<nav class="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 bg-white border-t border-gray-100 shadow-lg">
  <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-indigo-600">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
    <span class="text-[10px] font-medium">Home</span>
  </button>
  <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/></svg>
    <span class="text-[10px]">Search</span>
  </button>
  <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
    <span class="text-[10px]">Saved</span>
  </button>
  <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    <span class="text-[10px]">Profile</span>
  </button>
</nav>`,
  },
  {
    id: "mb-hero",
    label: "App Hero",
    category: " Screens",
    content: `<section class="flex flex-col items-center justify-center px-6 pt-12 pb-8 bg-gradient-to-br from-indigo-600 to-violet-700 min-h-[280px] text-white text-center">
  <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 text-3xl"></div>
  <h2 class="text-2xl font-bold mb-2">Welcome Back</h2>
  <p class="text-indigo-200 text-sm mb-6">Your personalized dashboard is ready.</p>
  <button class="px-6 py-2.5 bg-white text-indigo-600 font-semibold rounded-full text-sm shadow">Get Started</button>
</section>`,
  },
  {
    id: "mb-card",
    label: "App Card",
    category: " Cards",
    content: `<div class="mx-4 my-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
  <div class="flex items-center gap-3 mb-3">
    <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-lg"></div>
    <div><p class="text-sm font-semibold text-gray-900">Card Title</p><p class="text-xs text-gray-400">Subtitle text</p></div>
    <span class="ml-auto text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">New</span>
  </div>
  <p class="text-xs text-gray-500 leading-relaxed">Card body text goes here. Keep it concise for mobile screens.</p>
</div>`,
  },
  {
    id: "mb-card-image",
    label: "Image Card",
    category: " Cards",
    content: `<div class="mx-4 my-2 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
  <div class="h-36 bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-4xl"></div>
  <div class="p-4">
    <p class="text-sm font-semibold text-gray-900 mb-1">Card with Image</p>
    <p class="text-xs text-gray-500 mb-3">A short description about this card item.</p>
    <button class="text-xs font-semibold text-indigo-600">Learn more </button>
  </div>
</div>`,
  },
  {
    id: "mb-list",
    label: "List Row",
    category: " Lists",
    content: `<div class="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50 active:bg-gray-50">
  <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-base shrink-0"></div>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900 truncate">List Item Title</p>
    <p class="text-xs text-gray-400 truncate">Subtitle or metadata</p>
  </div>
  <div class="flex items-center gap-1 shrink-0">
    <span class="text-xs text-gray-400">Detail</span>
    <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
  </div>
</div>`,
  },
  {
    id: "mb-list-section",
    label: "List Section",
    category: " Lists",
    content: `<div class="mt-4">
  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-1">Section Title</p>
  <div class="bg-white rounded-2xl overflow-hidden mx-4 shadow-sm border border-gray-100">
    <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm"></div>
      <span class="flex-1 text-sm font-medium text-gray-900">Item One</span>
      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    </div>
    <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm"></div>
      <span class="flex-1 text-sm font-medium text-gray-900">Item Two</span>
      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    </div>
    <div class="flex items-center gap-3 px-4 py-3">
      <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-sm"></div>
      <span class="flex-1 text-sm font-medium text-gray-900">Item Three</span>
      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    </div>
  </div>
</div>`,
  },
  {
    id: "mb-form",
    label: "Login Form",
    category: " Forms",
    content: `<div class="px-6 py-8">
  <h2 class="text-xl font-bold text-gray-900 mb-1">Sign in</h2>
  <p class="text-sm text-gray-400 mb-6">Welcome back! Please enter your details.</p>
  <div class="space-y-4">
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
      <input type="email" placeholder="you@example.com" class="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 transition"/>
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
      <input type="password" placeholder="" class="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 transition"/>
    </div>
    <button class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:bg-indigo-700 transition">Sign In</button>
  </div>
  <p class="text-center text-xs text-gray-400 mt-6">Don't have an account? <a href="#" class="text-indigo-600 font-medium">Sign up</a></p>
</div>`,
  },
  {
    id: "mb-search",
    label: "Search Bar",
    category: " Forms",
    content: `<div class="px-4 py-2">
  <div class="relative">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/></svg>
    <input type="search" placeholder="Search" class="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 rounded-xl border-none outline-none text-gray-700 placeholder-gray-400"/>
  </div>
</div>`,
  },
  {
    id: "mb-toggle",
    label: "Toggle Row",
    category: " Forms",
    content: `<div class="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-50">
  <div>
    <p class="text-sm font-medium text-gray-900">Notifications</p>
    <p class="text-xs text-gray-400">Push alerts enabled</p>
  </div>
  <button class="relative w-11 h-6 bg-indigo-600 rounded-full transition-colors focus:outline-none" role="switch" aria-checked="true">
    <span class="block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 right-0.5 transition-transform"></span>
  </button>
</div>`,
  },
  {
    id: "mb-segmented",
    label: "Segmented Control",
    category: " Forms",
    content: `<div class="mx-4 my-3 flex bg-gray-100 rounded-xl p-1 gap-1">
  <button class="flex-1 py-2 text-xs font-semibold bg-white text-gray-900 rounded-lg shadow-sm">All</button>
  <button class="flex-1 py-2 text-xs font-medium text-gray-500 rounded-lg">Active</button>
  <button class="flex-1 py-2 text-xs font-medium text-gray-500 rounded-lg">Done</button>
</div>`,
  },
  {
    id: "mb-fab",
    label: "FAB Button",
    category: " Buttons",
    content: `<div class="fixed bottom-20 right-4">
  <button class="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
  </button>
</div>`,
  },
  {
    id: "mb-cta-button",
    label: "CTA Button",
    category: " Buttons",
    content: `<div class="px-4 py-2">
  <button class="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition">Get Started Free</button>
</div>`,
  },
  {
    id: "mb-ghost-button",
    label: "Ghost Button",
    category: " Buttons",
    content: `<div class="px-4 py-2">
  <button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-2xl text-sm hover:bg-indigo-50 transition">Learn More</button>
</div>`,
  },
  {
    id: "mb-stats",
    label: "Stats Row",
    category: " Data",
    content: `<div class="flex gap-3 px-4 my-3">
  <div class="flex-1 bg-indigo-50 rounded-2xl p-3 text-center">
    <p class="text-xl font-bold text-indigo-700">24k</p>
    <p class="text-xs text-indigo-400 mt-0.5">Followers</p>
  </div>
  <div class="flex-1 bg-green-50 rounded-2xl p-3 text-center">
    <p class="text-xl font-bold text-green-700">1.2k</p>
    <p class="text-xs text-green-400 mt-0.5">Posts</p>
  </div>
  <div class="flex-1 bg-purple-50 rounded-2xl p-3 text-center">
    <p class="text-xl font-bold text-purple-700">98%</p>
    <p class="text-xs text-purple-400 mt-0.5">Rating</p>
  </div>
</div>`,
  },
  {
    id: "mb-notification",
    label: "Notification",
    category: " Data",
    content: `<div class="flex items-start gap-3 px-4 py-3 bg-white border-b border-gray-50">
  <div class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-base shrink-0"></div>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900">New message</p>
    <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">You have a new message from Alex. Tap to view.</p>
    <p class="text-[10px] text-gray-300 mt-1">2 min ago</p>
  </div>
</div>`,
  },
  {
    id: "mb-profile",
    label: "Profile Header",
    category: " User",
    content: `<div class="flex flex-col items-center py-8 px-6 bg-white">
  <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold mb-3">JD</div>
  <h2 class="text-lg font-bold text-gray-900">Jane Doe</h2>
  <p class="text-sm text-gray-400 mb-4">Product Designer</p>
  <div class="flex gap-3">
    <button class="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-full">Follow</button>
    <button class="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">Message</button>
  </div>
</div>`,
  },
  {
    id: "mb-onboarding",
    label: "Onboarding Slide",
    category: " User",
    content: `<div class="flex flex-col items-center justify-center px-8 py-16 min-h-[500px] bg-white text-center">
  <div class="w-32 h-32 rounded-3xl bg-indigo-50 flex items-center justify-center text-6xl mb-8"></div>
  <h2 class="text-2xl font-bold text-gray-900 mb-3">Discover New Things</h2>
  <p class="text-sm text-gray-500 leading-relaxed mb-8">Explore thousands of features designed to make your life easier and more productive.</p>
  <div class="flex gap-1.5 mb-8">
    <span class="w-6 h-1.5 bg-indigo-600 rounded-full"></span>
    <span class="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
    <span class="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
  </div>
  <button class="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl text-sm">Continue</button>
</div>`,
  },
];

export default function MobileEditor({ initialHtml, onReady }: Props) {
  const mountedRef = useRef(false);
  const editorRef  = useRef<Editor | null>(null);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorInit: any = {
      container: "#gjs-app",
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,

      plugins: [tailwindPlugin, formsPlugin],
      pluginsOpts: {
        "grapesjs-tailwind": {},
        "grapesjs-plugin-forms": { category: " Forms" },
      },

      panels: { defaults: [] },

      blockManager: { appendTo: "#app-blocks" },

      styleManager: {
        appendTo: "#app-styles",
        sectors: [
          {
            name: "General", open: true,
            properties: [
              { name: "Display", property: "display", type: "select", defaults: "block",
                options: [{ value: "block" }, { value: "flex" }, { value: "grid" }, { value: "inline" }, { value: "none" }] },
              { name: "Width", property: "width" },
              { name: "Height", property: "height" },
            ],
          },
          {
            name: "Typography", open: false,
            properties: [
              { name: "Font Size",   property: "font-size" },
              { name: "Font Weight", property: "font-weight", type: "select",
                options: [{ value: "300" }, { value: "400" }, { value: "500" }, { value: "600" }, { value: "700" }] },
              { name: "Color",       property: "color",       type: "color" },
              { name: "Text Align",  property: "text-align",  type: "radio",
                options: [{ value: "left", title: "Left" }, { value: "center", title: "Center" }, { value: "right", title: "Right" }] },
            ],
          },
          {
            name: "Spacing", open: false,
            properties: [
              { name: "Padding",  property: "padding" },
              { name: "Margin",   property: "margin" },
              { name: "Gap",      property: "gap" },
            ],
          },
          {
            name: "Background", open: false,
            properties: [
              { name: "Background Color", property: "background-color", type: "color" },
              { name: "Background Image", property: "background-image" },
            ],
          },
          {
            name: "Border", open: false,
            properties: [
              { name: "Border Radius", property: "border-radius" },
              { name: "Border",        property: "border" },
              { name: "Border Color",  property: "border-color", type: "color" },
            ],
          },
          {
            name: "Effects", open: false,
            properties: [
              { name: "Opacity",    property: "opacity", type: "slider", defaults: 1, min: 0, max: 1, step: 0.01 },
              { name: "Box Shadow", property: "box-shadow" },
            ],
          },
        ],
      },

      layerManager:  { appendTo: "#app-layers" },
      traitManager:  { appendTo: "#app-traits" },

      deviceManager: {
        devices: [
          { name: "iPhone 14",    width: "390px",  widthMedia: "430px" },
          { name: "iPhone SE",    width: "375px",  widthMedia: "414px" },
          { name: "Android",      width: "360px",  widthMedia: "412px" },
          { name: "iPad Mini",    width: "768px",  widthMedia: "834px" },
        ],
      },

      canvas: {
        styles: [
          "https://cdn.tailwindcss.com",
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        ],
      },
    };

    const editor: Editor = grapesjs.init(editorInit);

    // Lock default device to iPhone 14
    editor.setDevice("iPhone 14");

    // Register all mobile blocks
    MOBILE_BLOCKS.forEach((block) => {
      editor.BlockManager.add(block.id, {
        label: block.label,
        category: { id: block.category, label: block.category },
        content: block.content,
        attributes: { title: block.label },
      });
    });

    if (initialHtml) editor.setComponents(initialHtml);

    window.__grapesApp = editor;
    editorRef.current  = editor;
    onReady?.(editor);

    return () => {
      editor.destroy();
      window.__grapesApp = undefined;
      editorRef.current  = null;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="gjs-app" style={{ height: "100%", width: "100%", overflow: "hidden" }} />
  );
}
