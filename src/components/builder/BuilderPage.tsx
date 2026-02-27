"use client";
/*  BuilderPage 
 * Full-screen GrapesJS site-builder page.
 *
 * URL param: ?project_id=<uuid>   loads project from Supabase
 *
 * Layout:
 *  
 *    Top-bar  (project name  undo/redo  preview  save  export)    
 *  
 *   Left Panel            Canvas (GrapesJS)          Right Panel     
 *     search                                       Styles/Layers/AI 
 *     blocks                                                        
 *  
 *  */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Editor } from "grapesjs";
import JSZip from "jszip";
import type { LibraryBlock } from "./GrapesEditor";
import ExportButton from "@/components/common/ExportButton";
import PlayablePreview from "@/components/PlayablePreview";

//  Types 
interface Project {
  id: string;
  type: string;
  master_director_seed: Record<string, unknown> | null;
}

interface RawLibEntry {
  id?: string;
  type: string;
  niche: string;
  name: string;
  tags: string[];
  seed_json: Record<string, string | number>;
}

type RightTab = "styles" | "layers" | "traits" | "ai";
type Device   = "desktop" | "tablet" | "mobile";

//  Generate HTML from a seed entry 
function seedToHtml(entry: RawLibEntry): string {
  const s = entry.seed_json as Record<string, string>;
  const headline    = s.headline    || entry.name;
  const subheadline = s.subheadline || "";
  const button      = s.button      || "Get Started";
  const lc = entry.name.toLowerCase();

  if (lc.includes("hero")) return `
<section class="py-24 px-6 bg-gradient-to-br from-slate-900 to-indigo-900 text-white text-center">
  <h1 class="text-5xl font-bold mb-4">${headline}</h1>
  <p class="text-xl text-slate-300 mb-8 max-w-xl mx-auto">${subheadline}</p>
  <a href="#" class="inline-block px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full transition">${button}</a>
</section>`;

  if (lc.includes("pricing")) return `
<section class="py-20 px-6 bg-white text-center">
  <h2 class="text-3xl font-bold mb-2">${headline}</h2>
  <p class="text-gray-500 mb-12">${subheadline}</p>
  <div class="flex flex-col md:flex-row gap-6 justify-center max-w-4xl mx-auto">
    <div class="flex-1 border rounded-2xl p-8"><h3 class="text-xl font-semibold mb-2">Starter</h3><p class="text-4xl font-bold mb-6">$9<span class="text-base text-gray-400">/mo</span></p><a href="#" class="block py-2 px-6 bg-indigo-600 text-white rounded-lg">${button}</a></div>
    <div class="flex-1 border-2 border-indigo-600 rounded-2xl p-8 shadow-xl"><h3 class="text-xl font-semibold mb-2">Pro</h3><p class="text-4xl font-bold mb-6">$29<span class="text-base text-gray-400">/mo</span></p><a href="#" class="block py-2 px-6 bg-indigo-600 text-white rounded-lg">${button}</a></div>
    <div class="flex-1 border rounded-2xl p-8"><h3 class="text-xl font-semibold mb-2">Enterprise</h3><p class="text-4xl font-bold mb-6">$99<span class="text-base text-gray-400">/mo</span></p><a href="#" class="block py-2 px-6 bg-indigo-600 text-white rounded-lg">${button}</a></div>
  </div>
</section>`;

  if (lc.includes("feature")) return `
<section class="py-20 px-6 bg-gray-50">
  <h2 class="text-3xl font-bold text-center mb-12">${headline}</h2>
  <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
    <div class="bg-white rounded-xl p-6 shadow-sm"><div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-4"></div><h3 class="font-semibold mb-2">Feature One</h3><p class="text-gray-500 text-sm">${subheadline}</p></div>
    <div class="bg-white rounded-xl p-6 shadow-sm"><div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4"></div><h3 class="font-semibold mb-2">Feature Two</h3><p class="text-gray-500 text-sm">${subheadline}</p></div>
    <div class="bg-white rounded-xl p-6 shadow-sm"><div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4"></div><h3 class="font-semibold mb-2">Feature Three</h3><p class="text-gray-500 text-sm">${subheadline}</p></div>
  </div>
</section>`;

  if (lc.includes("cta") || lc.includes("banner")) return `
<section class="py-16 px-6 bg-indigo-600 text-white text-center">
  <h2 class="text-3xl font-bold mb-4">${headline}</h2>
  <p class="text-indigo-200 mb-8">${subheadline}</p>
  <a href="#" class="inline-block px-8 py-3 bg-white text-indigo-600 font-semibold rounded-full hover:bg-indigo-50 transition">${button}</a>
</section>`;

  if (lc.includes("testimonial") || lc.includes("review")) return `
<section class="py-20 px-6 bg-white">
  <h2 class="text-3xl font-bold text-center mb-12">${headline}</h2>
  <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
    <div class="bg-gray-50 rounded-xl p-6"><p class="text-gray-600 mb-4">"${subheadline}"</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-indigo-300"></div><span class="font-medium text-sm">Jane D.</span></div></div>
    <div class="bg-gray-50 rounded-xl p-6"><p class="text-gray-600 mb-4">"${subheadline}"</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-green-300"></div><span class="font-medium text-sm">Mark S.</span></div></div>
  </div>
</section>`;

  // Generic fallback section
  return `
<section class="py-16 px-6 bg-white">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-3xl font-bold mb-4">${headline}</h2>
    <p class="text-gray-500 mb-8">${subheadline}</p>
    <a href="#" class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium">${button}</a>
  </div>
</section>`;
}

//  GrapesEditor — client-side only 
const GrapesEditor = dynamic(() => import("./GrapesEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50 dark:bg-gray-900">
      Loading canvas
    </div>
  ),
});

//  Types for canvas sections
interface CanvasSection {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

//  Render master_seed into canvas sections
function renderMasterSeed(seed: Record<string, unknown> | null): CanvasSection[] {
  if (!seed) return [];
  
  const sections: CanvasSection[] = [];
  const metadata = seed.metadata as Record<string, unknown> | undefined;
  const zone = (metadata?.zone as string) || 'website';
  
  // Always add navbar + hero for websites
  if (zone === 'website' || zone === 'builder') {
    sections.push({ 
      id: 'navbar', 
      type: 'navbar', 
      content: { title: metadata?.title || 'My Site' } 
    });
    sections.push({ 
      id: 'hero', 
      type: 'hero', 
      content: { 
        headline: (metadata?.title as string) || 'Welcome', 
        niche: (metadata?.niche as string) || '' 
      } 
    });
    sections.push({ 
      id: 'footer', 
      type: 'footer', 
      content: {} 
    });
  }
  
  // Game: add world map + characters + missions
  if (zone === 'game') {
    const worldState = seed.world_state as Record<string, unknown> | undefined;
    if (worldState) {
      sections.push({ 
        id: 'world', 
        type: 'world_map', 
        content: worldState 
      });
    }
    
    const characters = seed.characters as Record<string, unknown>[] | undefined;
    characters?.forEach((c, i) => 
      sections.push({ 
        id: `char_${i}`, 
        type: 'character_card', 
        content: c 
      })
    );
    
    const gameplay = seed.gameplay as Record<string, unknown> | undefined;
    const missions = gameplay?.missions as Record<string, unknown>[] | undefined;
    missions?.forEach((m, i) =>
      sections.push({ 
        id: `mission_${i}`, 
        type: 'mission_card', 
        content: m 
      })
    );
  }
  
  // Anime: add characters + world + episode list
  if (zone === 'anime') {
    const worldState = seed.world_state as Record<string, unknown> | undefined;
    if (worldState) {
      sections.push({ 
        id: 'world', 
        type: 'anime_world', 
        content: worldState 
      });
    }
    
    const characters = seed.characters as Record<string, unknown>[] | undefined;
    characters?.forEach((c, i) =>
      sections.push({ 
        id: `char_${i}`, 
        type: 'anime_character', 
        content: c 
      })
    );
  }
  
  // SaaS: add dashboard + features
  if (zone === 'saas') {
    const worldState = seed.world_state as Record<string, unknown> | undefined;
    if (worldState) {
      sections.push({ 
        id: 'dashboard', 
        type: 'saas_dashboard', 
        content: worldState 
      });
    }
  }
  
  // Video: add timeline tracks
  if (zone === 'video') {
    const timelineTracks = seed.timeline_tracks as Record<string, unknown>[] | undefined;
    timelineTracks?.forEach((t, i) =>
      sections.push({ 
        id: `track_${i}`, 
        type: 'video_track', 
        content: t 
      })
    );
  }
  
  return sections;
}

//  Convert canvas sections to HTML
function sectionsToHtml(sections: CanvasSection[]): string {
  return sections.map(section => {
    const { type, content } = section;
    
    // Navbar
    if (type === 'navbar') {
      const title = (content.title as string) || 'My Site';
      return `
<nav class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" data-section="navbar">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">${title}</h1>
    <div class="flex gap-6">
      <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Features</a>
      <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Pricing</a>
      <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">About</a>
    </div>
  </div>
</nav>`;
    }
    
    // Hero
    if (type === 'hero') {
      const headline = (content.headline as string) || 'Welcome';
      const niche = (content.niche as string) || '';
      const subheadline = niche ? `The best ${niche} solution` : 'Build something amazing';
      return `
<section class="py-24 px-6 bg-gradient-to-br from-slate-900 to-indigo-900 text-white text-center" data-section="hero">
  <h1 class="text-5xl font-bold mb-4">${headline}</h1>
  <p class="text-xl text-slate-300 mb-8 max-w-xl mx-auto">${subheadline}</p>
  <a href="#" class="inline-block px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full transition">Get Started</a>
</section>`;
    }
    
    // Footer
    if (type === 'footer') {
      return `
<footer class="bg-gray-900 text-gray-400 py-12 px-6" data-section="footer">
  <div class="max-w-7xl mx-auto text-center">
    <p class="text-sm">© 2026 Built with TailAdmin Builder</p>
  </div>
</footer>`;
    }
    
    // World Map (Game)
    if (type === 'world_map') {
      const biome = (content.biome as string) || 'Unknown';
      const weather = (content.weather as string) || 'Clear';
      const timeOfDay = (content.time_of_day as number) || 12;
      return `
<section class="py-20 px-6 bg-gradient-to-br from-green-900 to-blue-900 text-white" data-section="world">
  <h2 class="text-3xl font-bold text-center mb-12">World</h2>
  <div class="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl p-8">
    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h4 class="text-sm font-semibold text-gray-300 mb-1">Biome</h4>
        <p class="text-lg">${biome}</p>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-300 mb-1">Weather</h4>
        <p class="text-lg">${weather}</p>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-300 mb-1">Time of Day</h4>
        <p class="text-lg">${timeOfDay.toFixed(2)}</p>
      </div>
    </div>
  </div>
</section>`;
    }
    
    // Character Card
    if (type === 'character_card' || type === 'anime_character') {
      const name = (content.name as string) || 'Character';
      const role = (content.role as string) || '';
      const appearanceSeed = (content.appearance_seed as number) || null;
      return `
<div class="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition" data-character-id="${section.id}">
  <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-4 flex items-center justify-center">
    <span class="text-2xl font-bold">${name[0] || '?'}</span>
  </div>
  <h3 class="font-semibold text-lg text-center mb-2 text-white">${name}</h3>
  ${role ? `<p class="text-sm text-gray-400 text-center mb-3">${role}</p>` : ''}
  ${appearanceSeed ? `<p class="text-xs text-gray-500 text-center">Appearance: #${appearanceSeed}</p>` : ''}
</div>`;
    }
    
    // Mission Card
    if (type === 'mission_card') {
      const title = (content.title as string) || 'Mission';
      const description = (content.description as string) || '';
      const objectives = (content.objectives as string[]) || [];
      const difficulty = (content.difficulty as number) || null;
      return `
<div class="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700" data-mission-id="${section.id}">
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <h3 class="font-semibold text-lg text-gray-900 dark:text-white mb-2">${title}</h3>
      ${description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${description}</p>` : ''}
      ${objectives.length > 0 ? `
      <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
        ${objectives.map(obj => `<li>• ${obj}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    ${difficulty ? `
    <div class="ml-4 px-3 py-1 rounded-full text-xs font-medium ${
      difficulty <= 3 ? 'bg-green-100 text-green-700' : 
      difficulty <= 6 ? 'bg-yellow-100 text-yellow-700' : 
      'bg-red-100 text-red-700'
    }">
      Level ${difficulty}
    </div>
    ` : ''}
  </div>
</div>`;
    }
    
    // Video Track
    if (type === 'video_track') {
      const trackType = (content.type as string) || 'track';
      const events = (content.events as Record<string, unknown>[]) || [];
      return `
<div class="bg-gray-800 rounded-lg p-4" data-track-type="${trackType}">
  <h3 class="font-semibold mb-3 text-indigo-400">${trackType.toUpperCase()} Track</h3>
  <div class="flex gap-2 overflow-x-auto">
    ${events.map((evt, evtIdx) => {
      const evtType = (evt.type as string) || 'Event';
      const duration = (evt.duration as number) || null;
      return `
    <div class="shrink-0 w-32 h-20 bg-gray-700 rounded border border-gray-600 p-2 text-xs text-white">
      <p class="font-medium">${evtType} ${evtIdx + 1}</p>
      ${duration ? `<p class="text-gray-400">${duration}s</p>` : ''}
    </div>
      `;
    }).join('')}
  </div>
</div>`;
    }
    
    // Anime World
    if (type === 'anime_world') {
      return `
<section class="py-20 px-6 bg-gradient-to-br from-purple-900 to-pink-900 text-white" data-section="world">
  <h2 class="text-3xl font-bold text-center mb-12">World</h2>
  <div class="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl p-8">
    <p class="text-gray-300">Anime world details...</p>
  </div>
</section>`;
    }
    
    // SaaS Dashboard
    if (type === 'saas_dashboard') {
      return `
<section class="py-20 px-6 bg-gray-50 dark:bg-gray-900" data-section="dashboard">
  <h2 class="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Dashboard</h2>
  <div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Users</p>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">1,234</p>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Revenue</p>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">$12,345</p>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Active</p>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">567</p>
    </div>
  </div>
</section>`;
    }
    
    // Fallback
    return `
<section class="py-16 px-6 bg-white dark:bg-gray-800" data-section="${type}">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">${type}</h2>
    <p class="text-gray-500 dark:text-gray-400">Section content</p>
  </div>
</section>`;
  }).join('\n');
}

//  Main Component 
export default function BuilderPage() {
  const searchParams = useSearchParams();
  const projectId    = searchParams.get("project_id");
  const runId        = searchParams.get("run_id");

  const [editor,       setEditor]       = useState<Editor | null>(null);
  const [project,      setProject]      = useState<Project | null>(null);
  const [projectName,  setProjectName]  = useState("Untitled Project");
  const [initialHtml,  setInitialHtml]  = useState<string | undefined>(undefined);
  const [libraryBlocks, setLibraryBlocks] = useState<LibraryBlock[]>([]);
  const [canvasSections, setCanvasSections] = useState<CanvasSection[]>([]);
  const [autoLoadedContent, setAutoLoadedContent] = useState(false);
  const [masterSeed, setMasterSeed] = useState<Record<string, unknown> | null>(null);
  const [showPlayablePreview, setShowPlayablePreview] = useState(false);

  const [saving,     setSaving]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [device,     setDevice]     = useState<Device>("desktop");
  const [rightTab,   setRightTab]   = useState<RightTab>("styles");
  const [blockSearch, setBlockSearch] = useState("");

  const [aiPrompt,   setAiPrompt]   = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiResult,   setAiResult]   = useState("");

  // Mobile panel drawer: null = canvas-only, "left" = blocks, "right" = inspector
  const [mobilePanel, setMobilePanel] = useState<"left" | "right" | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  //  Load library blocks (Supabase  fallback to local JSON) 
  useEffect(() => {
    async function fetchLibrary() {
      const sb = createClient();
      const { data, error } = await sb
        .from("library")
        .select("id,type,niche,name,tags,seed_json")
        .eq("type", "web")
        .limit(200);

      let raw: RawLibEntry[] = [];
      if (!error && data && data.length > 0) {
        raw = data as RawLibEntry[];
      } else {
        // Fallback: import local batch JSON
        try {
          const localData = await import("../../../library_batch_1.json") as unknown as { default: RawLibEntry[] };
          raw = localData.default.filter((b) => b.type === "web");
        } catch {
          raw = [];
        }
      }

      const blocks: LibraryBlock[] = raw.map((entry, i) => ({
        id:    entry.id ?? `local-${i}`,
        name:  entry.name,
        niche: entry.niche,
        tags:  entry.tags ?? [],
        html:  seedToHtml(entry),
      }));
      setLibraryBlocks(blocks);
    }
    fetchLibrary();
  }, []);

  //  Load project from Supabase 
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
      
      // Store master_seed for playable preview
      if (seed) {
        setMasterSeed(seed);
      }
      
      // builder stores saved HTML under seed.builder_html
      if (seed?.builder_html && typeof seed.builder_html === "string") {
        setInitialHtml(seed.builder_html);
      } else if (seed?.html && typeof seed.html === "string") {
        setInitialHtml(seed.html);
      }
      const name = (seed?.project_name as string) ?? `${proj.type} Project`;
      setProjectName(name);
    }
    fetchProject();
  }, [projectId]);

  //  Load pipeline_run from Supabase using run_id — MAGICAL AI-GENERATED LAYOUT
  useEffect(() => {
    // Only fetch if we have a valid run_id (UUID length > 30)
    if (!runId || runId.length <= 30 || projectId) return;
    
    async function fetchPipelineRun() {
      console.log('[builder] 🎨 Loading AI-generated layout from run_id:', runId);
      const sb = createClient();
      const { data: run, error } = await sb
        .from("pipeline_runs")
        .select("master_seed, zone_type, prompt")
        .eq("id", runId)
        .single();
      
      if (error || !run) {
        console.warn('[builder] Failed to fetch pipeline_run:', error);
        return;
      }
      
      // If master_seed exists, render it into canvas sections
      if (run?.master_seed) {
        const masterSeed = run.master_seed as Record<string, unknown>;
        console.log('[builder] ✨ master_seed loaded:', masterSeed.metadata);
        
        // Store master_seed for playable preview
        setMasterSeed(masterSeed);
        
        // MAGICAL: Call renderMasterSeed to get structured sections
        const sections = renderMasterSeed(masterSeed);
        console.log(`[builder] 🎯 Generated ${sections.length} sections from master_seed`);
        
        // Store sections for later use
        setCanvasSections(sections);
        
        // Convert sections to HTML for the canvas
        if (sections.length > 0) {
          const html = sectionsToHtml(sections);
          setInitialHtml(html);
          setAutoLoadedContent(true);
          console.log('[builder] 🚀 AI-generated layout loaded to canvas!');
        }
        
        // Set project name from metadata or prompt
        const metadata = masterSeed.metadata as Record<string, unknown> | undefined;
        const title = (metadata?.title as string) || run.prompt?.substring(0, 30) || 'AI Project';
        setProjectName(title);
      }
    }
    
    fetchPipelineRun();
  }, [runId, projectId]);

  //  Auto-save every 30 s 
  useEffect(() => {
    if (!editor) return;
    autoSaveTimer.current = setInterval(() => {
      handleSave(true);
    }, 30_000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, project]);

  //  Character cards grid (for game/anime zones — wrap individual cards)
  useEffect(() => {
    if (canvasSections.length === 0 || !editor) return;
    
    // Wrap character cards in a grid container
    const charCards = canvasSections.filter(s => 
      s.type === 'character_card' || s.type === 'anime_character'
    );
    
    if (charCards.length > 0) {
      console.log(`[builder] 🎭 ${charCards.length} character cards loaded`);
    }
  }, [canvasSections, editor]);

  //  Block search filter 
  useEffect(() => {
    const container = document.getElementById("gjs-blocks");
    if (!container) return;
    const q = blockSearch.toLowerCase().trim();
    container.querySelectorAll<HTMLElement>(".gjs-block").forEach((el) => {
      const title = (el.getAttribute("title") || el.textContent || "").toLowerCase();
      const tags  = (el.getAttribute("data-tags") || "").toLowerCase();
      const niche = (el.getAttribute("data-niche") || "").toLowerCase();
      const visible = !q || title.includes(q) || tags.includes(q) || niche.includes(q);
      el.style.display = visible ? "" : "none";
    });

    // Also hide empty category labels
    container.querySelectorAll<HTMLElement>(".gjs-block-category").forEach((cat) => {
      const blocks = cat.querySelectorAll<HTMLElement>(".gjs-block");
      const anyVisible = Array.from(blocks).some((b) => b.style.display !== "none");
      cat.style.display = anyVisible ? "" : "none";
    });
  }, [blockSearch]);

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
    };

    if (projectId) {
      const sb = createClient();
      await sb
        .from("projects")
        .update({ master_director_seed: seed })
        .eq("id", projectId);
    }

    if (!silent) {
      setSaving(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }, [editor, project, projectId, projectName]);

  //  Export ZIP 
  const handleExport = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHtml();
    const css  = editor.getCss();
    const slug = projectName.toLowerCase().replace(/\s+/g, "-");

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    ${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;

    const vercelJson = JSON.stringify({ version: 2 }, null, 2);
    const readmeMd   = `# ${projectName}\n\nGenerated by TailAdmin Site Builder.\n\n## Deploy\n\n\`\`\`bash\nnpx vercel\n\`\`\`\n`;

    const zip = new JSZip();
    zip.file("index.html",  fullHtml);
    zip.file("vercel.json", vercelJson);
    zip.file("README.md",   readmeMd);

    const blob = await zip.generateAsync({ type: "blob" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, projectName]);

  //  Preview toggle 
  const handlePreview = useCallback(() => {
    editor?.runCommand("preview");
  }, [editor]);

  //  Device switch 
  const handleDevice = useCallback((d: Device) => {
    setDevice(d);
    const cmds: Record<Device, string> = {
      desktop: "set-device-desktop",
      tablet:  "set-device-tablet",
      mobile:  "set-device-mobile-portrait",
    };
    editor?.runCommand(cmds[d]);
  }, [editor]);

  //  AI Edit 
  const handleAiEdit = useCallback(async () => {
    if (!editor || !aiPrompt.trim()) return;
    const selected = editor.getSelected();
    if (!selected) {
      setAiResult(" Select an element on the canvas first.");
      return;
    }
    setAiLoading(true);
    setAiResult("");
    try {
      const componentHtml = selected.toHTML();
      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: componentHtml, prompt: aiPrompt }),
      });
      const json = await res.json();
      if (json.css) {
        // Apply CSS to the selected component
        const existingStyle = selected.getStyle();
        const newStyle = parseCssText(json.css);
        selected.setStyle({ ...existingStyle, ...newStyle });
        setAiResult(" Styles applied!");
      } else if (json.html) {
        selected.replaceWith(json.html);
        setAiResult(" Component updated!");
      } else if (json.error) {
        setAiResult(` ${json.error}`);
      }
    } catch {
      setAiResult(" Failed to reach AI API.");
    } finally {
      setAiLoading(false);
    }
  }, [editor, aiPrompt]);

  //  Add AI content to canvas 
  const handleAddToCanvas = useCallback((html: string) => {
    if (!editor) return;
    const wrapper = editor.getWrapper();
    if (wrapper) {
      editor.addComponents(html, { at: wrapper.components().length });
      console.log('[builder] Added AI content to canvas');
    }
  }, [editor]);

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

        {/* Left: back + name */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            title="Back to dashboard"
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-sm font-semibold text-gray-800 dark:text-white bg-transparent border-none outline-none min-w-0 truncate max-w-[160px] hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded focus:bg-gray-50 dark:focus:bg-gray-800 transition-colors"
            aria-label="Project name"
          />
        </div>

        {/* Center: device switcher (hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => handleDevice(d)}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                device === d
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {d === "desktop" ? "🖥" : d === "tablet" ? "⬛" : "📱"}
            </button>
          ))}
        </div>

        {/* Mobile-only: panel toggle buttons */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            onClick={() => setMobilePanel((v) => (v === "left" ? null : "left"))}
            title="Blocks"
            className={`flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors ${
              mobilePanel === "left"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Blocks</span>
          </button>
          <button
            onClick={() => setMobilePanel((v) => (v === "right" ? null : "right"))}
            title="Inspector"
            className={`flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors ${
              mobilePanel === "right"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/><circle cx="12" cy="12" r="10"/></svg>
            <span>Styles</span>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Undo */}
          <button
            onClick={() => (window as Window & { __grapes?: Editor }).__grapes?.UndoManager?.undo()}
            title="Undo"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          {/* Redo */}
          <button
            onClick={() => (window as Window & { __grapes?: Editor }).__grapes?.UndoManager?.redo()}
            title="Redo"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Canvas Preview */}
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Canvas
          </button>

          {/* Live Preview (Playable) */}
          {masterSeed && (
            <button
              onClick={() => setShowPlayablePreview(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Live Preview
            </button>
          )}

          {/* Export */}
          <ExportButton
            projectId={projectId}
            projectType="website"
            onLocalExport={async (key) => {
              if (key === "website-zip") await handleExport();
            }}
          />

          {/* Save */}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 h-8 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving ? (
              <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Saving</>
            ) : savedFlash ? (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Saved!</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Save</>
            )}
          </button>
        </div>
      </header>

      {/*  EDITOR ROW  */}
      <div className="flex flex-1 overflow-hidden">

        {/*  LEFT PANEL: Library + Blocks  */}
        <aside className={`
          ${mobilePanel === "left"
            ? "fixed top-14 bottom-0 left-0 w-72 z-40 shadow-2xl"
            : "hidden"}
          md:relative md:top-auto md:bottom-auto md:left-auto md:flex md:w-64 md:shadow-none md:z-10
          flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-hidden
        `}>
          {/* Show AI-generated content notification if available, otherwise show blocks */}
          {autoLoadedContent && canvasSections.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">✨ AI Generated Layout</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {canvasSections.length} sections auto-generated and loaded to canvas!
              </p>
              <div className="space-y-2 pt-4">
                {canvasSections.map(section => (
                  <div key={section.id} className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{section.type}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Blocks</p>
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search blocks"
                    value={blockSearch}
                    onChange={(e) => setBlockSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-indigo-400 text-gray-700 dark:text-gray-300 placeholder-gray-400 transition-colors"
                  />
                </div>
              </div>

              {/* GrapesJS block manager renders here */}
              <div
                id="gjs-blocks"
                className="flex-1 overflow-y-auto builder-blocks-panel"
              />
            </>
          )}
        </aside>

        {/*  CANVAS  */}
        <main className="flex-1 overflow-hidden bg-gray-200 dark:bg-gray-800">
          <GrapesEditor
            initialHtml={initialHtml}
            libraryBlocks={libraryBlocks}
            onReady={setEditor}
          />
        </main>

        {/*  RIGHT PANEL: Inspector + AI  */}
        <aside className={`
          ${mobilePanel === "right"
            ? "fixed top-14 bottom-0 right-0 w-80 z-40 shadow-2xl"
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
              <button
                key={key}
                onClick={() => setRightTab(key)}
                className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                  rightTab === key
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden relative">
            {/* Styles */}
            <div
              id="gjs-styles"
              className={`builder-style-panel absolute inset-0 overflow-y-auto ${rightTab === "styles" ? "" : "hidden"}`}
            />

            {/* Layers */}
            <div
              id="gjs-layers"
              className={`builder-layers-panel absolute inset-0 overflow-y-auto ${rightTab === "layers" ? "" : "hidden"}`}
            />

            {/* Traits */}
            <div
              id="gjs-traits"
              className={`builder-traits-panel absolute inset-0 overflow-y-auto p-2 ${rightTab === "traits" ? "" : "hidden"}`}
            />

            {/* AI Edit */}
            {rightTab === "ai" && (
              <div className="absolute inset-0 flex flex-col p-4 overflow-y-auto gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Selected element</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Click any element on the canvas, then describe what to change.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    What should change?
                  </label>
                  <textarea
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. make this section dark and modern with glassmorphism"
                    className="w-full text-xs p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-indigo-400 resize-none transition-colors"
                  />
                </div>
                <button
                  onClick={handleAiEdit}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 shadow-sm"
                >
                  {aiLoading ? (
                    <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Applying AI edit</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Apply AI Edit</>
                  )}
                </button>

                {aiResult && (
                  <p className={`text-xs rounded-lg px-3 py-2 ${
                    aiResult.startsWith("")
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  }`}>
                    {aiResult}
                  </p>
                )}

                <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick prompts</p>
                  {[
                    "Make it dark and modern",
                    "Add glassmorphism effect",
                    "Make it more spacious",
                    "Bold typography, clean layout",
                    "Gradient background, white text",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setAiPrompt(prompt)}
                      className="w-full text-left text-xs px-2.5 py-1.5 mb-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Playable Preview Modal */}
      {showPlayablePreview && masterSeed && (
        <PlayablePreview
          masterSeed={masterSeed}
          onClose={() => setShowPlayablePreview(false)}
        />
      )}
    </div>
  );
}

//  Helper: parse inline CSS text to style object 
function parseCssText(cssText: string): Record<string, string> {
  const result: Record<string, string> = {};
  cssText.replace(/\/\*[^]*?\*\//g, "").split(";").forEach((declaration) => {
    const [prop, ...vals] = declaration.split(":");
    if (prop && vals.length) {
      const key = prop.trim().replace(/-([a-z])/g, (_, l: string) => l.toUpperCase());
      result[key] = vals.join(":").trim();
    }
  });
  return result;
}
