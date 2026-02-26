"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { AnimeCharacter, CharacterSeeds } from "./types";
import { createBrowserClient } from "@supabase/ssr";

// ─── Inlined character preview canvas (Three.js / @react-three/fiber) ─────────
const vtx = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main(){
    vUv=uv;
    vNormal=normalize(normalMatrix*normal);
    vViewPos=(modelViewMatrix*vec4(position,1.0)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;
const frg = /* glsl */`
  uniform float faceSeed;
  uniform float bodySeed;
  uniform float costumeSeed;
  uniform float powerSeed;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  float hash(float n){return fract(sin(n)*43758.5453123);}
  vec3 seedHue(float s){
    float h=hash(s*127.1);
    float sat=0.65+hash(s*311.7)*0.35;
    vec3 c=clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
    return 0.5*mix(vec3(1.0),c,sat)+0.4;
  }
  void main(){
    float isBody=step(0.0,vUv.y)*step(vUv.y,0.5);
    float isCostume=step(0.5,vUv.y)*step(vUv.y,0.85);
    float isFace=step(0.85,vUv.y);
    vec3 base=seedHue(faceSeed)*isFace+seedHue(costumeSeed)*isCostume+seedHue(bodySeed)*isBody;
    float diff=dot(vNormal,normalize(vec3(1.5,2.0,1.0)));
    float band=diff>0.5?1.0:diff>0.0?0.6:0.3;
    vec3 color=base*band;
    float rim=1.0-max(dot(vNormal,normalize(-vViewPos)),0.0);
    rim=pow(rim,4.0);
    vec3 aura=seedHue(powerSeed+0.5)*1.5;
    float pulse=0.4+0.4*sin(time*3.0);
    color+=aura*rim*pulse*0.6;
    if(rim>0.85){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
    gl_FragColor=vec4(color,1.0);
  }
`;

function CharMesh({ seeds }: { seeds: CharacterSeeds }) {
  const uniforms = useMemo(() => ({
    faceSeed:    { value: seeds.face_seed    },
    bodySeed:    { value: seeds.body_seed    },
    costumeSeed: { value: seeds.costume_seed },
    powerSeed:   { value: seeds.power_seed   },
    time:        { value: 0                  },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    uniforms.faceSeed.value    = seeds.face_seed;
    uniforms.bodySeed.value    = seeds.body_seed;
    uniforms.costumeSeed.value = seeds.costume_seed;
    uniforms.powerSeed.value   = seeds.power_seed;
  }, [seeds, uniforms]);

  useFrame(({ clock }) => { uniforms.time.value = clock.elapsedTime; });

  const mat = (
    <shaderMaterial vertexShader={vtx} fragmentShader={frg} uniforms={uniforms} />
  );
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.45, 1.2, 12, 24]} />
        {mat}
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        {mat}
      </mesh>
      <mesh position={[-0.65, 0.15, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.15, 0.65, 8, 12]} />
        {mat}
      </mesh>
      <mesh position={[0.65, 0.15, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.15, 0.65, 8, 12]} />
        {mat}
      </mesh>
    </group>
  );
}

function CharPreview({ seeds }: { seeds: CharacterSeeds }) {
  const h = Math.floor(seeds.face_seed * 360);
  return (
    <Canvas
      camera={{ position: [0, 0.5, 4], fov: 45 }}
      style={{ background: `radial-gradient(ellipse at center, hsl(${h},40%,10%) 0%, #0a0a14 100%)` }}
    >
      <ambientLight intensity={0.5} color="#9b59b6" />
      <directionalLight position={[3, 5, 3]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-3, 2, -2]} intensity={0.8} color={`hsl(${h},70%,60%)`} />
      <CharMesh seeds={seeds} />
      <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
      <Environment preset="night" />
    </Canvas>
  );
}

// ─── Seed slider row ──────────────────────────────────────────────────────────
function SliderRow({ label, emoji, value, onChange }: {
  label: string; emoji: string; value: number; onChange: (v: number) => void;
}) {
  const h = Math.floor(value * 360);
  return (
    <div className="flex items-center gap-2">
      <span className="text-base w-6 text-center shrink-0">{emoji}</span>
      <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
      <input type="range" min={0} max={1} step={0.001} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 cursor-pointer"
        style={{ accentColor: `hsl(${h},70%,55%)` }} />
      <span className="text-[10px] font-mono text-gray-500 w-9 text-right shrink-0">
        {value.toFixed(3)}
      </span>
    </div>
  );
}

// ─── DB row mapper ────────────────────────────────────────────────────────────
function dbRowToChar(row: Record<string, unknown>): AnimeCharacter {
  return {
    id:           String(row.id),
    name:         String(row.name),
    series_name:  String(row.series_name),
    face_seed:    Number(row.face_seed),
    body_seed:    Number(row.body_seed),
    costume_seed: Number(row.costume_seed),
    voice_seed:   Number(row.voice_seed),
    power_seed:   Number(row.power_seed),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  initial?:    Partial<AnimeCharacter>;
  seriesName:  string;
  onSaved:     (char: AnimeCharacter) => void;
  onClose:     () => void;
}

export default function CharacterCreatorModal({ initial, seriesName, onSaved, onClose }: Props) {
  const [name,       setName]       = useState(initial?.name        ?? "");
  const [series,     setSeries]     = useState(initial?.series_name ?? seriesName ?? "");
  const [seeds, setSeeds] = useState<CharacterSeeds>({
    face_seed:    initial?.face_seed    ?? Math.random(),
    body_seed:    initial?.body_seed    ?? Math.random(),
    costume_seed: initial?.costume_seed ?? Math.random(),
    voice_seed:   initial?.voice_seed   ?? Math.random(),
    power_seed:   initial?.power_seed   ?? Math.random(),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  function setSeed(key: keyof CharacterSeeds, v: number) {
    setSeeds((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSave() {
    if (!name.trim())   { setError("Character name is required."); return; }
    if (!series.trim()) { setError("Series name is required.");    return; }
    setError(null);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id:      user.id,
        series_name:  series.trim(),
        name:         name.trim(),
        avatar_seed:  seeds.face_seed,
        face_seed:    seeds.face_seed,
        body_seed:    seeds.body_seed,
        costume_seed: seeds.costume_seed,
        voice_seed:   seeds.voice_seed,
        power_seed:   seeds.power_seed,
      };

      let row: AnimeCharacter;

      if (initial?.id) {
        // Update
        const { data, error: dbErr } = await supabase
          .from("characters")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single();
        if (dbErr) throw dbErr;
        row = dbRowToChar(data);
      } else {
        // Upsert by (user_id, series_name, name)
        const { data, error: dbErr } = await supabase
          .from("characters")
          .upsert(payload, { onConflict: "user_id,series_name,name" })
          .select()
          .single();
        if (dbErr) throw dbErr;
        row = dbRowToChar(data);
      }

      onSaved(row);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  // Randomise all seeds
  function handleRandomise() {
    setSeeds({
      face_seed:    Math.random(),
      body_seed:    Math.random(),
      costume_seed: Math.random(),
      voice_seed:   Math.random(),
      power_seed:   Math.random(),
    });
  }

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <span className="text-2xl">🎭</span>
          <div>
            <h2 className="text-white font-bold text-base">
              {initial?.id ? "Edit Character" : "Create Character"}
            </h2>
            <p className="text-xs text-gray-400">Seeds lock the look across all episodes</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="flex flex-col gap-4 px-5 py-4 w-64 shrink-0 overflow-y-auto border-r border-white/10">
            {/* Name */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-semibold uppercase tracking-wide">
                Character Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Takeshi"
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Series */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-semibold uppercase tracking-wide">
                Series Name
              </label>
              <input
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="e.g. Dragon Realm"
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[10px] text-gray-600 mt-1">Same series = same character across episodes</p>
            </div>

            {/* Sliders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Seeds</p>
                <button
                  onClick={handleRandomise}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  🎲 Randomise
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <SliderRow label="Face"    emoji="😊" value={seeds.face_seed}    onChange={(v) => setSeed("face_seed",    v)} />
                <SliderRow label="Body"    emoji="🦾" value={seeds.body_seed}    onChange={(v) => setSeed("body_seed",    v)} />
                <SliderRow label="Costume" emoji="👘" value={seeds.costume_seed} onChange={(v) => setSeed("costume_seed", v)} />
                <SliderRow label="Voice"   emoji="🎙️" value={seeds.voice_seed}   onChange={(v) => setSeed("voice_seed",   v)} />
                <SliderRow label="Power"   emoji="⚡" value={seeds.power_seed}   onChange={(v) => setSeed("power_seed",   v)} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round"/>
                    </svg>
                    Saving…
                  </>
                ) : "💾 Save Character"}
              </button>
            </div>
          </div>

          {/* Right: live Three.js preview */}
          <div className="flex-1 relative bg-gray-950 min-h-0">
            <div className="absolute inset-0">
              <CharPreview seeds={seeds} />
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-gray-900/80 px-3 py-1 rounded-full select-none">
              Drag to rotate · Scroll to zoom
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
