// src/components/builder/AiGeneratedPreview.tsx
// Component to display AI-generated sections from master_seed
"use client";

import { useEffect, useState } from "react";
import type { ParsedMasterSeed, Character, Mission, WorldMap } from "@/lib/masterSeedParser";
import { generateWebsiteBlockHtml } from "@/lib/masterSeedParser";

interface AiGeneratedPreviewProps {
  parsedSeed: ParsedMasterSeed;
  onAddToCanvas?: (html: string) => void;
}

export default function AiGeneratedPreview({ parsedSeed, onAddToCanvas }: AiGeneratedPreviewProps) {
  const [selectedTab, setSelectedTab] = useState<"overview" | "sections">("overview");

  if (parsedSeed.zone === "website") {
    return <WebsitePreview parsedSeed={parsedSeed} onAddToCanvas={onAddToCanvas} />;
  }

  if (parsedSeed.zone === "game") {
    return <GamePreview parsedSeed={parsedSeed} />;
  }

  return null;
}

// ─── Website Preview ──────────────────────────────────────────────────────────

function WebsitePreview({ parsedSeed, onAddToCanvas }: { parsedSeed: ParsedMasterSeed; onAddToCanvas?: (html: string) => void }) {
  const blocks = parsedSeed.websiteBlocks || [];
  const html = parsedSeed.html || "";

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Generated</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {parsedSeed.title} • {parsedSeed.niche}
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {html && (
          <button
            onClick={() => onAddToCanvas?.(html)}
            className="w-full text-left p-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Complete Page</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Full AI-generated HTML ready to edit</p>
              </div>
              <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
        )}

        {blocks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Sections ({blocks.length})
            </p>
            {blocks.map((block, index) => {
              const blockHtml = generateWebsiteBlockHtml(block);
              return (
                <button
                  key={block.id}
                  onClick={() => onAddToCanvas?.(blockHtml)}
                  className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {block.name}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Block #{index + 1}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!html && blocks.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No sections generated yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game Preview ─────────────────────────────────────────────────────────────

function GamePreview({ parsedSeed }: { parsedSeed: ParsedMasterSeed }) {
  const characters = parsedSeed.characters || [];
  const missions = parsedSeed.missions || [];
  const worldMap = parsedSeed.worldMap;

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Generated Game</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {parsedSeed.title} • {parsedSeed.niche}
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* World Map */}
        {worldMap && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">World Map</h4>
            </div>
            <div className="space-y-2 text-xs">
              {worldMap.biome && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Biome:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{worldMap.biome}</span>
                </div>
              )}
              {worldMap.weather && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Weather:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{worldMap.weather}</span>
                </div>
              )}
              {worldMap.time_of_day !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Time:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{worldMap.time_of_day}:00</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Characters ({characters.length})</h4>
            </div>
            <div className="space-y-2">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{char.name || char.id}</p>
                      {char.role && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 capitalize">{char.role}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                      {(char.name || char.id).charAt(0).toUpperCase()}
                    </div>
                  </div>
                  {char.appearance_seed !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Seed: {char.appearance_seed.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missions */}
        {missions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Missions ({missions.length})</h4>
            </div>
            <div className="space-y-2">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {mission.title || mission.id}
                  </p>
                  {mission.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{mission.description}</p>
                  )}
                  {mission.difficulty !== undefined && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-3 rounded-sm ${
                            i < mission.difficulty!
                              ? "bg-orange-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Difficulty</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!worldMap && characters.length === 0 && missions.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No game elements generated yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
