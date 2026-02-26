// ── Shared types for the Anime Studio ──────────────────────────────────────

export interface CharacterSeeds {
  face_seed:    number;
  body_seed:    number;
  costume_seed: number;
  voice_seed:   number;
  power_seed:   number;
}

export interface AnimeCharacter extends CharacterSeeds {
  id:          string;
  name:        string;
  series_name: string;
  // position in scene
  position?:   { x: number; y: number; z: number };
  expression?: "neutral" | "happy" | "angry" | "sad" | "battle";
}

export type AnimeObjectType = "character" | "background" | "prop" | "effect" | "light";

export interface AnimeSceneObject {
  id:       string;
  name:     string;
  type:     AnimeObjectType;
  seed:     number;
  characterId?: string;  // links to AnimeCharacter
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale:    number;
}

export type EpisodeNodeType = "intro" | "conflict" | "battle" | "resolution" | "custom";

export interface EpisodeNodeData extends Record<string, unknown> {
  label:       string;
  nodeType:    EpisodeNodeType;
  dialogue:    string;
  scene:       string;
  characters:  string[];  // character IDs in this node
}

export interface AnimeEpisode {
  id:          string;
  title:       string;
  episode_num: number;
  series_name: string;
  nodes:       Array<{ id: string; data: EpisodeNodeData; [key: string]: unknown }>;
  edges:       Array<{ id: string; source: string; target: string; [key: string]: unknown }>;
}

export interface LibraryItem {
  id:    string;
  label: string;
  type:  AnimeObjectType;
  icon:  string;
  seed:  number;
}

export const ANIME_LIBRARY_ITEMS: LibraryItem[] = [
  // Backgrounds
  { id: "bg_dojo",       label: "Dojo",           type: "background", icon: "⛩️", seed: 0.11 },
  { id: "bg_city_night", label: "City Night",     type: "background", icon: "🌃", seed: 0.24 },
  { id: "bg_forest",     label: "Mystic Forest",  type: "background", icon: "🌲", seed: 0.38 },
  { id: "bg_sky",        label: "Sky Arena",      type: "background", icon: "☁️", seed: 0.52 },
  { id: "bg_ruins",      label: "Ancient Ruins",  type: "background", icon: "🏛️", seed: 0.67 },
  { id: "bg_space",      label: "Void Space",     type: "background", icon: "🌌", seed: 0.81 },
  // Props
  { id: "prop_sword",    label: "Katana",         type: "prop",       icon: "⚔️", seed: 0.15 },
  { id: "prop_scroll",   label: "Scroll",         type: "prop",       icon: "📜", seed: 0.29 },
  { id: "prop_orb",      label: "Power Orb",      type: "prop",       icon: "🔮", seed: 0.43 },
  { id: "prop_gate",     label: "Torii Gate",     type: "prop",       icon: "⛩️", seed: 0.58 },
  // Effects
  { id: "fx_lightning",  label: "Lightning",      type: "effect",     icon: "⚡", seed: 0.72 },
  { id: "fx_fire",       label: "Fire Aura",      type: "effect",     icon: "🔥", seed: 0.85 },
  { id: "fx_sakura",     label: "Sakura Petals",  type: "effect",     icon: "🌸", seed: 0.93 },
  { id: "fx_energy",     label: "Energy Blast",   type: "effect",     icon: "💥", seed: 0.07 },
];
