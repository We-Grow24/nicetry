"use client";

import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import * as Tone from "tone";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mood    = "tense" | "epic" | "happy" | "sad" | "action" | "horror";
type Emotion = "happy" | "angry" | "sad" | "scared";
type AudioTab = "music" | "voice" | "sfx";

export interface MusicSeed {
  tempo_seed:        number;   // 0–1 (maps 60–180 BPM)
  mood_seed:         Mood;
  instrument_seeds:  { drums: boolean; bass: boolean; strings: boolean; synth: boolean };
}

interface SfxItem  { id: string; name: string; url: string;  tags: string[] }
interface Character{ id: string; name: string; voice_seed?: number }

// ─── Mood → generative parameters ────────────────────────────────────────────

const MOOD_PATTERNS: Record<Mood, { notes: string[]; density: number }> = {
  tense:  { notes: ["C3","Eb3","F3","Gb3","Ab3","Bb3"],       density: 0.55 },
  epic:   { notes: ["C3","G3","E3","D3","A3","B3"],           density: 0.80 },
  happy:  { notes: ["C4","E4","G4","A4","B4"],                density: 0.90 },
  sad:    { notes: ["A3","C4","Eb4","G4","F4"],               density: 0.32 },
  action: { notes: ["E3","G3","A3","B3","D4","F#3"],          density: 1.00 },
  horror: { notes: ["C2","Db2","E2","F2","Bb2","B1"],         density: 0.38 },
};

const MOOD_COLORS: Record<Mood, string> = {
  tense: "#f59e0b", epic: "#6366f1", happy: "#34d399",
  sad: "#60a5fa", action: "#ef4444", horror: "#9333ea",
};

// ─── Deterministic PRNG (xorshift32) ─────────────────────────────────────────

function makeRng(seed: number) {
  let s = ((seed * 2654435761) >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── BPM ↔ seed ───────────────────────────────────────────────────────────────

const BPM_MIN = 60, BPM_MAX = 180;
function tempoFromSeed(s: number)   { return Math.round(BPM_MIN + s * (BPM_MAX - BPM_MIN)); }
function seedFromTempo(bpm: number) { return (bpm - BPM_MIN) / (BPM_MAX - BPM_MIN); }

// ─── AudioBuffer → 16-bit PCM WAV blob ───────────────────────────────────────

function toWavBlob(buf: AudioBuffer): Blob {
  const numCh = buf.numberOfChannels;
  const len   = buf.length;
  const sr    = buf.sampleRate;
  const pcm   = new Int16Array(len * numCh);
  for (let s = 0; s < len; s++)
    for (let ch = 0; ch < numCh; ch++) {
      const f = buf.getChannelData(ch)[s] ?? 0;
      pcm[s * numCh + ch] = Math.max(-32768, Math.min(32767, Math.round(f * 32767)));
    }
  const bytes = pcm.buffer.byteLength;
  const wb    = new ArrayBuffer(44 + bytes);
  const v     = new DataView(wb);
  const s4    = (o: number, t: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s4(0, "RIFF"); v.setUint32(4,  36 + bytes, true);
  s4(8, "WAVE"); s4(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * numCh * 2, true); v.setUint16(32, numCh * 2, true);
  v.setUint16(34, 16, true); s4(36, "data"); v.setUint32(40, bytes, true);
  new Uint8Array(wb, 44).set(new Uint8Array(pcm.buffer));
  return new Blob([wb], { type: "audio/wav" });
}

// ─── Waveform painter ─────────────────────────────────────────────────────────

function paintWaveform(canvas: HTMLCanvasElement, buf: AudioBuffer, color: string) {
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const ch  = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(ch.length / W));
  ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < W; i++) {
    let mn = 1, mx = -1;
    for (let j = 0; j < step; j++) {
      const d = ch[i * step + j] ?? 0;
      if (d < mn) mn = d; if (d > mx) mx = d;
    }
    const y1 = ((1 - mx) / 2) * H, y2 = ((1 - mn) / 2) * H;
    if (i === 0) ctx.moveTo(0, (y1 + y2) / 2);
    else { ctx.lineTo(i, y1); ctx.lineTo(i, y2); }
  }
  ctx.stroke();
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface AudioStudioProps {
  /** Fired whenever a new procedural track is rendered. */
  onMusicSeed?: (seed: MusicSeed) => void;
  /** Fired when the user clicks or drags an SFX chip. */
  onSfxDrop?:  (sfx: { id: string; name: string; url: string }) => void;
}

export default function AudioStudio({ onMusicSeed, onSfxDrop }: AudioStudioProps) {

  // ── Panel state ───────────────────────────────────────────────────────────
  const [tab,       setTab]       = useState<AudioTab>("music");
  const [expanded,  setExpanded]  = useState(true);

  // ── Music state ───────────────────────────────────────────────────────────
  const [mood,        setMood]        = useState<Mood>("epic");
  const [bpm,         setBpm]         = useState(120);
  const [instruments, setInstruments] = useState({ drums: true, bass: true, strings: false, synth: true });
  const [generating,  setGenerating]  = useState(false);
  const [playing,     setPlaying]     = useState(false);
  const [musicUrl,    setMusicUrl]    = useState<string | null>(null);
  const [musicSeed,   setMusicSeed]   = useState<MusicSeed | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Tone.Player | null>(null);

  // ── Voice state ───────────────────────────────────────────────────────────
  const [characters,   setCharacters]   = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState("");
  const [dialogue,     setDialogue]     = useState("");
  const [pitch,        setPitch]        = useState(0);
  const [voiceSpeed,   setVoiceSpeed]   = useState(1.0);
  const [emotion,      setEmotion]      = useState<Emotion>("happy");
  const [voiceBusy,    setVoiceBusy]    = useState(false);

  // ── SFX state ─────────────────────────────────────────────────────────────
  const [sfxItems,   setSfxItems]   = useState<SfxItem[]>([]);
  const [sfxSearch,  setSfxSearch]  = useState("");
  const [sfxLoading, setSfxLoading] = useState(false);
  const hoverAudio = useRef<HTMLAudioElement | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("characters").select("id,name,voice_seed").limit(50)
      .then(({ data }) => { if (data) setCharacters(data as Character[]); });
  }, [supabase]);

  useEffect(() => {
    if (tab !== "sfx") return;
    setSfxLoading(true);
    supabase.from("library").select("id,name,url,tags").eq("type", "audio")
      .then(({ data }) => { setSfxItems((data as SfxItem[]) ?? []); setSfxLoading(false); });
  }, [tab, supabase]);

  // Empty waveform placeholder
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, c.height / 2); ctx.lineTo(c.width, c.height / 2); ctx.stroke();
  }, []);

  // ── Generate music ────────────────────────────────────────────────────────
  const handleGenerateMusic = useCallback(async () => {
    setGenerating(true);
    setMusicUrl(null);
    setPlaying(false);
    if (playerRef.current) { try { playerRef.current.stop(); } catch { /* already stopped */ } playerRef.current.dispose(); playerRef.current = null; }

    try {
      const newSeed: MusicSeed = { tempo_seed: seedFromTempo(bpm), mood_seed: mood, instrument_seeds: { ...instruments } };
      setMusicSeed(newSeed);

      const pat  = MOOD_PATTERNS[mood];
      const rng  = makeRng(Math.round(newSeed.tempo_seed * 99991) + mood.charCodeAt(0) * 1000);
      const bars = 8;
      const totalSec = bars * 4 * (60 / bpm);

      const pickNote = () => pat.notes[Math.floor(rng() * pat.notes.length)];

      // ── Offline render ────────────────────────────────────────────────────
      const offCtx = new Tone.OfflineContext(2, totalSec, 44100);
      Tone.setContext(offCtx as unknown as Tone.Context);
      Tone.getTransport().bpm.value = bpm;

      if (instruments.drums) {
        const kick  = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 } }).toDestination();
        const snare = new Tone.NoiseSynth({ noise: { type: "white" as const }, envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.04 } }).toDestination();
        const hihat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.04, release: 0.02 }, harmonicity: 5.1, modulationIndex: 22, resonance: 4200 }).toDestination();
        hihat.frequency.value = 440;

        const kicks: Tone.Unit.Time[] = [], snares: Tone.Unit.Time[] = [], hihats: Tone.Unit.Time[] = [];
        for (let b = 0; b < bars; b++) {
          kicks.push(`${b}:0:0`, `${b}:2:0`);
          snares.push(`${b}:1:0`, `${b}:3:0`);
          for (let s8 = 0; s8 < 8; s8++) if (rng() < pat.density) hihats.push(`${b}:${Math.floor(s8 / 2)}:${(s8 % 2) * 2}`);
        }
        new Tone.Part((t) => kick.triggerAttackRelease("C1",  "16n", t), kicks.map(  t => ({ time: t }))).start(0);
        new Tone.Part((t) => snare.triggerAttackRelease("8n", t),         snares.map( t => ({ time: t }))).start(0);
        new Tone.Part((t) => hihat.triggerAttackRelease("32n", t),        hihats.map( t => ({ time: t }))).start(0);
      }

      if (instruments.bass) {
        const bass = new Tone.MonoSynth({ oscillator: { type: "sawtooth" as const }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.3 } }).toDestination();
        const notes: { time: Tone.Unit.Time; note: string }[] = [];
        for (let b = 0; b < bars; b++) for (let s = 0; s < 4; s++) if (rng() < pat.density) notes.push({ time: `${b}:${s}:0`, note: pickNote() });
        new Tone.Part((t, { note }) => bass.triggerAttackRelease(note, "4n", t), notes).start(0);
      }

      if (instruments.strings) {
        const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth" as const, spread: 40 }, envelope: { attack: 0.5, decay: 0.8, sustain: 0.7, release: 2.0 } }).toDestination();
        const chords: { time: Tone.Unit.Time; chord: string[] }[] = [];
        for (let b = 0; b < bars; b += 2) if (rng() < pat.density)
          chords.push({ time: `${b}:0:0`, chord: [pat.notes[0], pat.notes[2 % pat.notes.length], pat.notes[4 % pat.notes.length]] });
        new Tone.Part((t, { chord }) => pad.triggerAttackRelease(chord, "2n", t), chords).start(0);
      }

      if (instruments.synth) {
        const mel = new Tone.Synth({ oscillator: { type: "triangle" as const }, envelope: { attack: 0.02, decay: 0.15, sustain: 0.5, release: 0.4 } }).toDestination();
        const notes: { time: Tone.Unit.Time; note: string }[] = [];
        for (let b = 0; b < bars; b++) for (let s = 0; s < 8; s++) if (rng() < pat.density)
          notes.push({ time: `${b}:${Math.floor(s / 2)}:${(s % 2) * 2}`, note: pickNote() });
        new Tone.Part((t, { note }) => mel.triggerAttackRelease(note, "16n", t), notes).start(0);
      }

      Tone.getTransport().start(0);
      const rendered = await offCtx.render();

      // Reset to live AudioContext
      Tone.setContext(new Tone.Context());

      // Copy into a native AudioBuffer (required by Tone.Player)
      const nCtx   = new AudioContext();
      const native = nCtx.createBuffer(rendered.numberOfChannels, rendered.length, rendered.sampleRate);
      for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
        const src = rendered.getChannelData(ch);
        const copy = new Float32Array(src.length);
        copy.set(src);
        native.copyToChannel(copy, ch);
      }

      if (canvasRef.current) paintWaveform(canvasRef.current, native, MOOD_COLORS[mood]);

      const wavUrl = URL.createObjectURL(toWavBlob(native));
      setMusicUrl(wavUrl);

      await Tone.start();
      const tbuf  = new Tone.ToneAudioBuffer(native);
      const player = new Tone.Player(tbuf).toDestination();
      playerRef.current = player;
      player.onstop = () => setPlaying(false);

      onMusicSeed?.(newSeed);
    } catch (err) {
      console.error("[AudioStudio] music generation error", err);
    } finally {
      setGenerating(false);
    }
  }, [bpm, mood, instruments, onMusicSeed]);

  // ── Play / Stop ───────────────────────────────────────────────────────────
  const handlePlayStop = useCallback(async () => {
    const p = playerRef.current; if (!p) return;
    await Tone.start();
    if (playing) { p.stop(); setPlaying(false); }
    else         { p.start(); setPlaying(true);  }
  }, [playing]);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const handleGenerateVoice = useCallback(() => {
    if (!dialogue.trim() || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setVoiceBusy(true);
    const utt   = new SpeechSynthesisUtterance(dialogue);

    // Emotion modifiers
    const rateBoost  = emotion === "angry" ? 1.3 : emotion === "scared" ? 1.2 : emotion === "sad" ? 0.75 : 1;
    const pitchShift = emotion === "scared" ? 0.4 : emotion === "angry" ? 0.2 : emotion === "sad" ? -0.2 : 0;
    utt.rate  = Math.max(0.1, Math.min(10, voiceSpeed * rateBoost));
    utt.pitch = Math.max(0, Math.min(2, 1 + pitch / 12 + pitchShift));

    // If a character has a voice_seed, shift pitch slightly by seed
    const char = characters.find(c => c.id === selectedChar);
    if (char?.voice_seed != null) utt.pitch = Math.max(0, Math.min(2, utt.pitch + (char.voice_seed - 0.5) * 0.4));

    utt.onend = utt.onerror = () => setVoiceBusy(false);
    window.speechSynthesis.speak(utt);
  }, [dialogue, pitch, voiceSpeed, emotion, characters, selectedChar]);

  // ── SFX hover preview ─────────────────────────────────────────────────────
  const handleSfxEnter = useCallback((url: string | undefined) => {
    if (!url) return;
    hoverAudio.current?.pause();
    const a = new Audio(url); a.volume = 0.5; a.play().catch(() => {});
    hoverAudio.current = a;
  }, []);
  const handleSfxLeave = useCallback(() => { hoverAudio.current?.pause(); }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredSfx  = sfxItems.filter(s => {
    const q = sfxSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || (s.tags ?? []).some(t => t.toLowerCase().includes(q));
  });
  const seedLabel = musicSeed
    ? `${musicSeed.mood_seed}·${tempoFromSeed(musicSeed.tempo_seed)}bpm`
    : null;

  const MOODS:    Mood[]    = ["tense","epic","happy","sad","action","horror"];
  const EMOTIONS: Emotion[] = ["happy","angry","sad","scared"];
  const INSTS     = ["drums","bass","strings","synth"] as const;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`bg-gray-900 border-t border-white/10 flex flex-col shrink-0 transition-[height] duration-200 ${expanded ? "h-56" : "h-9"}`}>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="h-9 flex items-center border-b border-white/10 px-3 gap-1 shrink-0">
        <button onClick={() => setExpanded(v => !v)}
          className="text-gray-500 hover:text-gray-300 text-[10px] mr-1 w-4 shrink-0">
          {expanded ? "▼" : "▲"}
        </button>
        <span className="text-[10px] text-gray-500 font-semibold tracking-widest mr-2 select-none">🎵 AUDIO</span>

        {(["music","voice","sfx"] as AudioTab[]).map(t => (
          <button key={t}
            onClick={() => { setTab(t); if (!expanded) setExpanded(true); }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              tab === t && expanded
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}>
            {t === "music" ? "🎼 Music" : t === "voice" ? "🎙 Voice" : "🔊 SFX"}
          </button>
        ))}

        {seedLabel && expanded && (
          <button
            onClick={() => musicSeed && navigator.clipboard?.writeText(JSON.stringify(musicSeed))}
            title="Click to copy seed JSON"
            className="ml-auto text-[10px] font-mono text-gray-600 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition-colors truncate max-w-xs">
            📋 {seedLabel}
          </button>
        )}
      </div>

      {/* ── Panel body ──────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="flex-1 overflow-hidden min-h-0">

          {/* ════ MUSIC ════════════════════════════════════════════════════════ */}
          {tab === "music" && (
            <div className="h-full flex overflow-hidden">

              {/* Left: controls */}
              <div className="w-80 shrink-0 flex flex-col gap-2.5 px-4 py-2 border-r border-white/10 overflow-y-auto">

                {/* Mood chips */}
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Mood</p>
                  <div className="flex flex-wrap gap-1">
                    {MOODS.map(m => (
                      <button key={m} onClick={() => setMood(m)}
                        className="px-2 py-0.5 text-[10px] rounded-full font-semibold border transition-all"
                        style={{ background: mood===m ? MOOD_COLORS[m] : "transparent", borderColor: MOOD_COLORS[m], color: mood===m ? "#fff" : MOOD_COLORS[m] }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tempo slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Tempo</p>
                    <span className="text-[10px] font-mono text-indigo-400">{bpm} BPM</span>
                  </div>
                  <input type="range" min={60} max={180} value={bpm} onChange={e => setBpm(+e.target.value)}
                    className="w-full h-1.5 rounded appearance-none cursor-pointer" style={{ accentColor: "#6366f1" }} />
                  <div className="flex justify-between text-[9px] text-gray-700 mt-0.5"><span>60</span><span>180</span></div>
                </div>

                {/* Instruments */}
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Instruments</p>
                  <div className="flex flex-wrap gap-3">
                    {INSTS.map(inst => (
                      <label key={inst} className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={instruments[inst]}
                          onChange={e => setInstruments(p => ({ ...p, [inst]: e.target.checked }))}
                          className="w-3 h-3" style={{ accentColor: "#6366f1" }} />
                        {inst}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Generate */}
                <button onClick={handleGenerateMusic} disabled={generating}
                  className="w-full py-1.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-colors">
                  {generating
                    ? (<><svg className="animate-spin w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round"/></svg>Composing…</>)
                    : "✨ Generate Music"}
                </button>
              </div>

              {/* Right: waveform + playback */}
              <div className="flex-1 flex flex-col px-4 py-2 gap-2 min-w-0 overflow-hidden">
                <canvas ref={canvasRef} width={900} height={90}
                  className="w-full rounded border border-white/10 shrink-0 block" style={{ height: 90 }} />
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handlePlayStop} disabled={!playerRef.current}
                    className={`px-3 py-1 text-xs font-semibold rounded border transition-colors disabled:opacity-30 ${
                      playing ? "bg-red-600/20 border-red-500 text-red-400" : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"}`}>
                    {playing ? "⬛ Stop" : "▶ Play"}
                  </button>
                  {musicUrl && (
                    <a href={musicUrl} download={`${mood}-${bpm}bpm.wav`}
                      className="px-3 py-1 text-xs font-semibold rounded border border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 transition-colors">
                      ↓ Export WAV
                    </a>
                  )}
                  {musicSeed && (
                    <span className="ml-auto text-[9px] font-mono text-gray-700 truncate hidden xl:block">
                      {JSON.stringify(musicSeed).slice(0, 80)}…
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ VOICE ════════════════════════════════════════════════════════ */}
          {tab === "voice" && (
            <div className="h-full px-4 py-2 flex flex-col gap-2 overflow-y-auto">

              <div className="flex gap-3 flex-wrap items-end">
                {/* Character selector */}
                <div className="flex-1 min-w-36">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Character</p>
                  <select value={selectedChar} onChange={e => setSelectedChar(e.target.value)}
                    className="w-full bg-gray-800 border border-white/10 text-xs text-gray-200 rounded px-2 py-1 outline-none focus:border-purple-500">
                    <option value="">— Default voice —</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {/* Emotion */}
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Emotion</p>
                  <div className="flex gap-1">
                    {EMOTIONS.map(em => (
                      <button key={em} onClick={() => setEmotion(em)}
                        className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                          emotion===em ? "bg-purple-600 border-purple-500 text-white" : "border-white/20 text-gray-400 hover:bg-white/5"}`}>
                        {em === "happy" ? "😊" : em === "angry" ? "😠" : em === "sad" ? "😢" : "😨"} {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dialogue area */}
              <textarea value={dialogue} onChange={e => setDialogue(e.target.value)}
                placeholder="Type dialogue line here…" rows={2}
                className="w-full bg-gray-800 border border-white/10 text-xs text-gray-200 rounded px-2 py-1.5 resize-none outline-none focus:border-purple-500" />

              {/* Pitch + Speed */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Pitch</p>
                    <span className="text-[10px] font-mono text-purple-400">{pitch > 0 ? "+" : ""}{pitch} st</span>
                  </div>
                  <input type="range" min={-12} max={12} step={1} value={pitch} onChange={e => setPitch(+e.target.value)}
                    className="w-full h-1.5 appearance-none cursor-pointer" style={{ accentColor: "#a855f7" }} />
                  <div className="flex justify-between text-[9px] text-gray-700 mt-0.5"><span>-12</span><span>+12</span></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Speed</p>
                    <span className="text-[10px] font-mono text-purple-400">{voiceSpeed.toFixed(1)}×</span>
                  </div>
                  <input type="range" min={0.5} max={2} step={0.1} value={voiceSpeed} onChange={e => setVoiceSpeed(+e.target.value)}
                    className="w-full h-1.5 appearance-none cursor-pointer" style={{ accentColor: "#a855f7" }} />
                  <div className="flex justify-between text-[9px] text-gray-700 mt-0.5"><span>0.5×</span><span>2×</span></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={handleGenerateVoice} disabled={voiceBusy || !dialogue.trim()}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors">
                  {voiceBusy ? "🔊 Speaking…" : "🎙 Generate Voice"}
                </button>
                <p className="text-[10px] text-gray-600 self-center">
                  Export: use browser&apos;s screen-record or OS audio capture.
                </p>
              </div>
            </div>
          )}

          {/* ════ SFX ══════════════════════════════════════════════════════════ */}
          {tab === "sfx" && (
            <div className="h-full flex flex-col px-4 py-2 gap-2">
              <input type="text" value={sfxSearch} onChange={e => setSfxSearch(e.target.value)}
                placeholder="Search sound effects… (hover to preview, drag to timeline)"
                className="w-full bg-gray-800 border border-white/10 text-xs text-gray-200 rounded px-3 py-1.5 outline-none focus:border-indigo-500 shrink-0" />

              {sfxLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">Loading library…</div>
              ) : filteredSfx.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-600 text-xs">
                  <span>{sfxItems.length === 0 ? "No audio assets in library yet." : "No results."}</span>
                  {sfxItems.length === 0 && (
                    <span className="text-[10px] text-gray-700">Insert rows into the <code>library</code> table with <code>type = &apos;audio&apos;</code>.</span>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-wrap gap-1.5 content-start">
                  {filteredSfx.map(sfx => (
                    <button key={sfx.id} draggable
                      onDragStart={e => e.dataTransfer.setData("application/json", JSON.stringify({ id: sfx.id, name: sfx.name, url: sfx.url }))}
                      onMouseEnter={() => handleSfxEnter(sfx.url)}
                      onMouseLeave={handleSfxLeave}
                      onClick={() => onSfxDrop?.({ id: sfx.id, name: sfx.name, url: sfx.url })}
                      title={(sfx.tags ?? []).join(", ") || sfx.name}
                      className="px-2 py-1 text-[10px] bg-gray-800 border border-white/10 rounded hover:border-amber-500 hover:bg-amber-500/10 text-gray-300 hover:text-amber-300 transition-colors cursor-grab active:cursor-grabbing select-none">
                      🔊 {sfx.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
