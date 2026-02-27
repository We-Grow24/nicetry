// src/components/PlayablePreview.tsx
// Live interactive preview of master_seed content based on zone type
"use client";

import { useEffect, useRef, useState } from "react";

interface PlayablePreviewProps {
  masterSeed: Record<string, unknown> | null;
  onClose?: () => void;
}

export default function PlayablePreview({ masterSeed, onClose }: PlayablePreviewProps) {
  if (!masterSeed) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No preview available
      </div>
    );
  }

  const metadata = masterSeed.metadata as Record<string, unknown> | undefined;
  const zone = (metadata?.zone as string) || "website";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Preview
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full">
              {zone}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          {zone === "website" && <WebsitePreview masterSeed={masterSeed} />}
          {zone === "builder" && <WebsitePreview masterSeed={masterSeed} />}
          {zone === "game" && <GamePreview masterSeed={masterSeed} />}
          {zone === "anime" && <AnimePreview masterSeed={masterSeed} />}
          {zone === "video" && <VideoPreview masterSeed={masterSeed} />}
          {zone === "saas" && <SaaSPreview masterSeed={masterSeed} />}
        </div>
      </div>
    </div>
  );
}

// ─── Website Preview (iframe with Tailwind) ───────────────────────────────────

function WebsitePreview({ masterSeed }: { masterSeed: Record<string, unknown> }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const metadata = masterSeed.metadata as Record<string, unknown> | undefined;
  const title = (metadata?.title as string) || "Website";
  const niche = (metadata?.niche as string) || "";

  useEffect(() => {
    if (!iframeRef.current) return;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <!-- Navbar -->
  <nav class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">${title}</h1>
      <div class="flex gap-6">
        <a href="#" class="text-sm text-gray-600 hover:text-gray-900">Features</a>
        <a href="#" class="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
        <a href="#" class="text-sm text-gray-600 hover:text-gray-900">About</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="py-24 px-6 bg-gradient-to-br from-slate-900 to-indigo-900 text-white text-center">
    <h1 class="text-5xl font-bold mb-4">${title}</h1>
    <p class="text-xl text-slate-300 mb-8 max-w-xl mx-auto">
      ${niche ? `The best ${niche} solution` : "Build something amazing"}
    </p>
    <a href="#" class="inline-block px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full transition">
      Get Started
    </a>
  </section>

  <!-- Features -->
  <section class="py-20 px-6 bg-white">
    <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
    <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      <div class="bg-gray-50 rounded-xl p-6">
        <div class="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 class="font-semibold mb-2">Lightning Fast</h3>
        <p class="text-gray-500 text-sm">Optimized for speed and performance</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-6">
        <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 class="font-semibold mb-2">Secure</h3>
        <p class="text-gray-500 text-sm">Enterprise-grade security</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-6">
        <div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <h3 class="font-semibold mb-2">Customizable</h3>
        <p class="text-gray-500 text-sm">Fully customizable to your needs</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 py-12 px-6">
    <div class="max-w-7xl mx-auto text-center">
      <p class="text-sm">© 2026 ${title}. Built with TailAdmin Builder</p>
    </div>
  </footer>
</body>
</html>
    `;

    const iframeDoc = iframeRef.current.contentDocument;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
    }
  }, [masterSeed, title, niche]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      title="Website Preview"
    />
  );
}

// ─── Game Preview (Canvas with WASD controls) ─────────────────────────────────

function GamePreview({ masterSeed }: { masterSeed: Record<string, unknown> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerPos, setPlayerPos] = useState({ x: 400, y: 300 });
  const worldState = masterSeed.world_state as Record<string, unknown> | undefined;
  const characters = (masterSeed.characters as Record<string, unknown>[]) || [];
  const gameplay = masterSeed.gameplay as Record<string, unknown> | undefined;
  const missions = (gameplay?.missions as Record<string, unknown>[]) || [];

  // WASD controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const speed = 10;
      setPlayerPos((prev) => {
        switch (e.key.toLowerCase()) {
          case "w":
            return { ...prev, y: Math.max(50, prev.y - speed) };
          case "s":
            return { ...prev, y: Math.min(550, prev.y + speed) };
          case "a":
            return { x: Math.max(50, prev.x - speed), y: prev.y };
          case "d":
            return { x: Math.min(750, prev.x + speed), y: prev.y };
          default:
            return prev;
        }
      });
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Render game canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, 800, 600);

    // Grid pattern
    ctx.strokeStyle = "#2a2a3e";
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 600);
      ctx.stroke();
    }
    for (let i = 0; i < 600; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(800, i);
      ctx.stroke();
    }

    // Draw missions as markers
    missions.forEach((mission, idx) => {
      const x = 150 + idx * 200;
      const y = 150;
      
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", x, y);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px sans-serif";
      ctx.fillText((mission.title as string) || "Mission", x, y + 40);
    });

    // Draw characters as colored circles
    characters.forEach((char, idx) => {
      const x = 200 + idx * 150;
      const y = 400;
      const colors = ["#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b"];
      
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText((char.name as string) || "NPC", x, y + 45);
    });

    // Draw player (controllable character)
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", playerPos.x, playerPos.y);

    // Draw biome info
    if (worldState?.biome) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Biome: ${worldState.biome}`, 20, 30);
    }
    if (worldState?.weather) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`Weather: ${worldState.weather}`, 20, 55);
    }
  }, [playerPos, characters, missions, worldState]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-900">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="rounded-xl shadow-2xl border-2 border-gray-700"
      />
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400 mb-2">Use WASD to move the blue character</p>
        <div className="flex gap-2 justify-center">
          <kbd className="px-3 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 text-xs font-mono">W</kbd>
          <kbd className="px-3 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 text-xs font-mono">A</kbd>
          <kbd className="px-3 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 text-xs font-mono">S</kbd>
          <kbd className="px-3 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 text-xs font-mono">D</kbd>
        </div>
      </div>
    </div>
  );
}

// ─── Anime Preview (Slideshow) ────────────────────────────────────────────────

function AnimePreview({ masterSeed }: { masterSeed: Record<string, unknown> }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const characters = (masterSeed.characters as Record<string, unknown>[]) || [];
  const metadata = masterSeed.metadata as Record<string, unknown> | undefined;
  const title = (metadata?.title as string) || "Anime";

  // Auto-advance every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.max(characters.length, 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [characters.length]);

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No characters to preview</p>
      </div>
    );
  }

  const currentChar = characters[currentSlide];
  const charName = (currentChar?.name as string) || "Character";
  const charRole = (currentChar?.role as string) || "";
  const appearanceSeed = (currentChar?.appearance_seed as number) || 0;

  const gradients = [
    "from-purple-900 to-pink-900",
    "from-blue-900 to-cyan-900",
    "from-green-900 to-teal-900",
    "from-red-900 to-orange-900",
    "from-indigo-900 to-purple-900",
  ];
  const gradient = gradients[currentSlide % gradients.length];

  return (
    <div className={`h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-12 text-white relative`}>
      {/* Episode indicator */}
      <div className="absolute top-8 left-8 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
        <p className="text-sm font-medium">{title}</p>
      </div>

      {/* Slide counter */}
      <div className="absolute top-8 right-8 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
        <p className="text-sm font-mono">{currentSlide + 1} / {characters.length}</p>
      </div>

      {/* Character card */}
      <div className="max-w-md w-full bg-black/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl transform transition-all duration-500">
        <div className="w-40 h-40 mx-auto mb-6 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border-4 border-white/30">
          <span className="text-6xl font-bold">{charName[0]}</span>
        </div>
        
        <h2 className="text-3xl font-bold text-center mb-2">{charName}</h2>
        {charRole && (
          <p className="text-lg text-center text-white/70 mb-6">{charRole}</p>
        )}
        
        {appearanceSeed > 0 && (
          <div className="text-center">
            <p className="text-sm text-white/50">Appearance Seed</p>
            <p className="text-2xl font-mono text-white/90">#{appearanceSeed}</p>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-8 flex gap-2">
        {characters.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentSlide
                ? "bg-white w-8"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Auto-play indicator */}
      <div className="absolute bottom-20 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
        <p className="text-xs text-white/70">Auto-advancing...</p>
      </div>
    </div>
  );
}

// ─── Video Preview (Timeline scrubber) ────────────────────────────────────────

function VideoPreview({ masterSeed }: { masterSeed: Record<string, unknown> }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineTracks = (masterSeed.timeline_tracks as Record<string, unknown>[]) || [];
  
  const totalDuration = timelineTracks.reduce((sum, track) => {
    const events = (track.events as Record<string, unknown>[]) || [];
    const trackDuration = events.reduce((s, e) => s + ((e.duration as number) || 1), 0);
    return Math.max(sum, trackDuration);
  }, 10);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  const trackColors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white p-8">
      <div className="flex-1 flex items-center justify-center mb-8">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              {isPlaying ? (
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              ) : (
                <path d="M8 5v14l11-7z" />
              )}
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">Video Timeline</h3>
          <p className="text-gray-400 text-lg font-mono">
            {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Timeline tracks */}
      <div className="space-y-3 mb-6">
        {timelineTracks.map((track, idx) => {
          const trackType = (track.type as string) || "track";
          const events = (track.events as Record<string, unknown>[]) || [];
          let eventStartTime = 0;

          return (
            <div key={idx} className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">{trackType}</p>
              <div className="relative h-12 bg-gray-700 rounded overflow-hidden">
                {events.map((event, eventIdx) => {
                  const duration = (event.duration as number) || 1;
                  const startPercent = (eventStartTime / totalDuration) * 100;
                  const widthPercent = (duration / totalDuration) * 100;
                  const start = eventStartTime;
                  eventStartTime += duration;

                  const isActive = currentTime >= start && currentTime < start + duration;

                  return (
                    <div
                      key={eventIdx}
                      className={`absolute h-full ${trackColors[idx % trackColors.length]} ${
                        isActive ? "opacity-100 ring-2 ring-white" : "opacity-60"
                      } transition-all`}
                      style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      title={`${event.type || "Event"} - ${duration}s`}
                    >
                      <div className="p-2 text-xs font-medium truncate">
                        {event.type as string || "Event"}
                      </div>
                    </div>
                  );
                })}
                
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                  style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full -mt-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </>
          )}
        </button>
        
        <button
          onClick={() => setCurrentTime(0)}
          className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
        >
          Reset
        </button>

        {/* Scrubber */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / totalDuration) * 100}%, #374151 ${(currentTime / totalDuration) * 100}%, #374151 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── SaaS Preview (Interactive Dashboard) ─────────────────────────────────────

function SaaSPreview({ masterSeed }: { masterSeed: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState(1234);
  const [revenue, setRevenue] = useState(45678);
  const metadata = masterSeed.metadata as Record<string, unknown> | undefined;
  const title = (metadata?.title as string) || "SaaS Dashboard";

  // Simulate live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setUsers((prev) => prev + Math.floor(Math.random() * 3));
      setRevenue((prev) => prev + Math.floor(Math.random() * 100));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Live interactive dashboard preview</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8">
        <div className="flex gap-6">
          {["overview", "analytics", "users", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{users.toLocaleString()}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">↑ Live updating</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">${revenue.toLocaleString()}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">+12.5% vs last month</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Active Now</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">567</p>
            <p className="text-xs text-gray-400 mt-2">Average session: 8m 32s</p>
          </div>
        </div>

        {/* Chart placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Growth Chart</h3>
          <div className="h-64 flex items-end gap-2">
            {[40, 65, 55, 80, 70, 90, 85, 95, 75, 88, 92, 98].map((height, idx) => (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all hover:from-indigo-700 hover:to-indigo-500"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {["New user signup", "Payment received", "Feature deployed", "Support ticket resolved"].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{activity}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{idx + 1} minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
