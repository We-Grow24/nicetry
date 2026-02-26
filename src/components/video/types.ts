// ─── Core scene types ─────────────────────────────────────────────────────────

export type ObjectType = "character" | "prop" | "background" | "light";

export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  seed: number;          // drives color / texture shader
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

// ─── Timeline types ───────────────────────────────────────────────────────────

export type TrackType = "camera" | "character" | "audio";

export interface TimelineBlock {
  id: string;
  startFrac: number;  // 0-1 fraction of total duration
  endFrac: number;
  label: string;
  color: string;
}

export interface Track {
  id: string;
  label: string;
  type: TrackType;
  blocks: TimelineBlock[];
}

// ─── Master director seed shape ───────────────────────────────────────────────

export interface MasterDirectorSeed {
  world?: {
    biome?: string;
    time_of_day?: number;
    weather?: string;
  };
  characters?: Array<{
    id: string;
    appearance_seed: number;
    role: string;
  }>;
  narrative?: {
    act?: number;
    tension?: number;
  };
  objects?: SceneObject[];
}
