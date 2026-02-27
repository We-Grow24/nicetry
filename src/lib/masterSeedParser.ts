// src/lib/masterSeedParser.ts
// Utilities to parse master_seed from pipeline_runs and extract renderable sections

import type { MasterDirectorJSON } from "./architect";

export interface WebsiteBlock {
  id: string;
  name: string;
  type: string;
  seed: Record<string, unknown>;
}

export interface Character {
  id: string;
  name?: string;
  appearance_seed?: number;
  voice_seed?: number;
  power_seed?: number;
  stats?: Record<string, unknown>;
  role?: string;
}

export interface Mission {
  id: string;
  title?: string;
  description?: string;
  objectives?: string[];
  difficulty?: number;
}

export interface WorldMap {
  biome?: string;
  time_of_day?: number;
  weather?: string;
  sdf_layers?: unknown[];
  lighting?: Record<string, unknown>;
}

export interface ParsedMasterSeed {
  zone: string;
  niche: string;
  title: string;
  
  // Website specific
  websiteBlocks?: WebsiteBlock[];
  html?: string;
  
  // Game specific
  characters?: Character[];
  missions?: Mission[];
  worldMap?: WorldMap;
  
  // Raw data
  raw: MasterDirectorJSON;
}

/**
 * Parse a master_seed JSON into structured sections for rendering
 */
export function parseMasterSeed(
  masterSeed: Record<string, unknown> | null
): ParsedMasterSeed | null {
  if (!masterSeed) return null;

  const metadata = masterSeed.metadata as Record<string, unknown> | undefined;
  const zone = (metadata?.zone as string) || "website";
  const niche = (metadata?.niche as string) || "";
  const title = (metadata?.title as string) || "Untitled Project";

  const result: ParsedMasterSeed = {
    zone,
    niche,
    title,
    raw: masterSeed as unknown as MasterDirectorJSON,
  };

  // Parse website-specific data
  if (zone === "website") {
    const libraryBlocksUsed = masterSeed.library_blocks_used as string[] | undefined;
    const blocks: WebsiteBlock[] = [];
    
    if (libraryBlocksUsed && Array.isArray(libraryBlocksUsed)) {
      libraryBlocksUsed.forEach((blockId, index) => {
        blocks.push({
          id: blockId,
          name: `Block ${index + 1}`,
          type: "web",
          seed: {},
        });
      });
    }
    
    result.websiteBlocks = blocks;
    result.html = masterSeed.html as string | undefined;
  }

  // Parse game-specific data
  if (zone === "game") {
    // Characters
    const charactersData = masterSeed.characters as unknown[] | undefined;
    if (charactersData && Array.isArray(charactersData)) {
      result.characters = charactersData.map((char: unknown, index: number) => {
        const c = char as Record<string, unknown>;
        return {
          id: (c.id as string) || `char_${index}`,
          name: (c.name as string) || `Character ${index + 1}`,
          appearance_seed: c.appearance_seed as number | undefined,
          voice_seed: c.voice_seed as number | undefined,
          power_seed: c.power_seed as number | undefined,
          stats: c.stats as Record<string, unknown> | undefined,
          role: c.role as string | undefined,
        };
      });
    }

    // Missions
    const gameplayData = masterSeed.gameplay as Record<string, unknown> | undefined;
    const missionsData = gameplayData?.missions as unknown[] | undefined;
    if (missionsData && Array.isArray(missionsData)) {
      result.missions = missionsData.map((mission: unknown, index: number) => {
        const m = mission as Record<string, unknown>;
        return {
          id: (m.id as string) || `mission_${index}`,
          title: (m.title as string) || `Mission ${index + 1}`,
          description: m.description as string | undefined,
          objectives: m.objectives as string[] | undefined,
          difficulty: m.difficulty as number | undefined,
        };
      });
    }

    // World map
    const worldStateData = masterSeed.world_state as Record<string, unknown> | undefined;
    if (worldStateData) {
      result.worldMap = {
        biome: worldStateData.biome as string | undefined,
        time_of_day: worldStateData.time_of_day as number | undefined,
        weather: worldStateData.weather as string | undefined,
        sdf_layers: worldStateData.sdf_layers as unknown[] | undefined,
        lighting: worldStateData.lighting as Record<string, unknown> | undefined,
      };
    }
  }

  return result;
}

/**
 * Generate HTML for a website block based on library data
 */
export function generateWebsiteBlockHtml(
  block: WebsiteBlock,
  libraryData?: Record<string, unknown>
): string {
  const seed = libraryData?.seed_json as Record<string, string> | undefined;
  const headline = seed?.headline || block.name;
  const subheadline = seed?.subheadline || "";
  const button = seed?.button || "Get Started";
  const lc = block.name.toLowerCase();

  if (lc.includes("hero")) {
    return `
<section class="py-24 px-6 bg-gradient-to-br from-slate-900 to-indigo-900 text-white text-center">
  <h1 class="text-5xl font-bold mb-4">${headline}</h1>
  <p class="text-xl text-slate-300 mb-8 max-w-xl mx-auto">${subheadline}</p>
  <a href="#" class="inline-block px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full transition">${button}</a>
</section>`;
  }

  if (lc.includes("navbar") || lc.includes("header")) {
    return `
<nav class="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
    <div class="text-xl font-bold text-gray-900 dark:text-white">${headline}</div>
    <div class="flex items-center gap-6">
      <a href="#" class="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600">Home</a>
      <a href="#" class="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600">Features</a>
      <a href="#" class="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600">Pricing</a>
      <a href="#" class="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">${button}</a>
    </div>
  </div>
</nav>`;
  }

  if (lc.includes("footer")) {
    return `
<footer class="bg-gray-900 text-gray-400 py-12 px-6">
  <div class="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
    <div>
      <h3 class="text-white font-semibold mb-3">${headline}</h3>
      <p class="text-sm">${subheadline}</p>
    </div>
    <div>
      <h4 class="text-white font-medium mb-3">Product</h4>
      <ul class="text-sm space-y-2">
        <li><a href="#" class="hover:text-white">Features</a></li>
        <li><a href="#" class="hover:text-white">Pricing</a></li>
        <li><a href="#" class="hover:text-white">FAQ</a></li>
      </ul>
    </div>
    <div>
      <h4 class="text-white font-medium mb-3">Company</h4>
      <ul class="text-sm space-y-2">
        <li><a href="#" class="hover:text-white">About</a></li>
        <li><a href="#" class="hover:text-white">Blog</a></li>
        <li><a href="#" class="hover:text-white">Careers</a></li>
      </ul>
    </div>
    <div>
      <h4 class="text-white font-medium mb-3">Legal</h4>
      <ul class="text-sm space-y-2">
        <li><a href="#" class="hover:text-white">Privacy</a></li>
        <li><a href="#" class="hover:text-white">Terms</a></li>
      </ul>
    </div>
  </div>
  <div class="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm">
    © 2026 ${headline}. All rights reserved.
  </div>
</footer>`;
  }

  if (lc.includes("pricing")) {
    return `
<section class="py-20 px-6 bg-white dark:bg-gray-900 text-center">
  <h2 class="text-3xl font-bold mb-2 text-gray-900 dark:text-white">${headline}</h2>
  <p class="text-gray-500 dark:text-gray-400 mb-12">${subheadline}</p>
  <div class="flex flex-col md:flex-row gap-6 justify-center max-w-4xl mx-auto">
    <div class="flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 bg-white dark:bg-gray-800">
      <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Starter</h3>
      <p class="text-4xl font-bold mb-6 text-gray-900 dark:text-white">$9<span class="text-base text-gray-400">/mo</span></p>
      <a href="#" class="block py-2 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${button}</a>
    </div>
    <div class="flex-1 border-2 border-indigo-600 rounded-2xl p-8 shadow-xl bg-white dark:bg-gray-800">
      <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Pro</h3>
      <p class="text-4xl font-bold mb-6 text-gray-900 dark:text-white">$29<span class="text-base text-gray-400">/mo</span></p>
      <a href="#" class="block py-2 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${button}</a>
    </div>
    <div class="flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 bg-white dark:bg-gray-800">
      <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Enterprise</h3>
      <p class="text-4xl font-bold mb-6 text-gray-900 dark:text-white">$99<span class="text-base text-gray-400">/mo</span></p>
      <a href="#" class="block py-2 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${button}</a>
    </div>
  </div>
</section>`;
  }

  if (lc.includes("feature")) {
    return `
<section class="py-20 px-6 bg-gray-50 dark:bg-gray-800">
  <h2 class="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">${headline}</h2>
  <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
    <div class="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
      <div class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
        <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Fast Performance</h3>
      <p class="text-gray-500 dark:text-gray-400 text-sm">${subheadline}</p>
    </div>
    <div class="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
      <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
        <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Reliable</h3>
      <p class="text-gray-500 dark:text-gray-400 text-sm">${subheadline}</p>
    </div>
    <div class="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
      <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
        <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
      </div>
      <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Scalable</h3>
      <p class="text-gray-500 dark:text-gray-400 text-sm">${subheadline}</p>
    </div>
  </div>
</section>`;
  }

  // Generic fallback
  return `
<section class="py-16 px-6 bg-white dark:bg-gray-900">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">${headline}</h2>
    <p class="text-gray-500 dark:text-gray-400 mb-8">${subheadline}</p>
    <a href="#" class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">${button}</a>
  </div>
</section>`;
}
