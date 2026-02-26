"use client";

import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EpisodeNodeData, EpisodeNodeType, AnimeCharacter } from "./types";

// ─── Node type colours & icons ────────────────────────────────────────────────
const NODE_STYLE: Record<EpisodeNodeType, { bg: string; border: string; icon: string }> = {
  intro:      { bg: "#1e3a5f", border: "#3b82f6", icon: "🌅" },
  conflict:   { bg: "#3b1f1f", border: "#ef4444", icon: "⚔️" },
  battle:     { bg: "#3b2a10", border: "#f59e0b", icon: "💥" },
  resolution: { bg: "#1a3a2a", border: "#22c55e", icon: "🌸" },
  custom:     { bg: "#2a1a3b", border: "#a855f7", icon: "⭐" },
};

// ─── Custom node renderer ─────────────────────────────────────────────────────
function StoryNode({ data, selected }: NodeProps) {
  const d = data as unknown as EpisodeNodeData;
  const st = NODE_STYLE[d.nodeType];
  return (
    <div
      style={{
        background:   st.bg,
        borderColor:  selected ? "#ffffff" : st.border,
        borderWidth:  selected ? 2 : 1.5,
        borderStyle:  "solid",
        borderRadius: 10,
        padding:      "8px 12px",
        minWidth:     140,
        boxShadow:    `0 0 ${selected ? 16 : 8}px ${st.border}55`,
        transition:   "box-shadow 0.2s",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{st.icon}</span>
        <span className="text-xs font-bold text-white truncate">{d.label}</span>
      </div>
      {d.scene && (
        <p className="text-[10px] text-gray-400 truncate">{d.scene}</p>
      )}
      {d.characters.length > 0 && (
        <p className="text-[10px] text-gray-500 mt-0.5">
          👥 {d.characters.length} character{d.characters.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

const nodeTypes = { storyNode: StoryNode };

// ─── Default arc (Intro → Conflict → Battle → Resolution) ────────────────────
function buildDefaultNodes(): Node<EpisodeNodeData>[] {
  const arc: Array<{ type: EpisodeNodeType; label: string; x: number }> = [
    { type: "intro",      label: "Intro",      x: 80  },
    { type: "conflict",   label: "Conflict",   x: 280 },
    { type: "battle",     label: "Battle",     x: 480 },
    { type: "resolution", label: "Resolution", x: 680 },
  ];
  return arc.map((a, i) => ({
    id:       `node_${i}`,
    type:     "storyNode",
    position: { x: a.x, y: 160 },
    data: {
      label:      a.label,
      nodeType:   a.type,
      dialogue:   "",
      scene:      "",
      characters: [],
    },
  }));
}

function buildDefaultEdges(): Edge[] {
  return [
    { id: "e0-1", source: "node_0", target: "node_1", animated: true, style: { stroke: "#6b7280" } },
    { id: "e1-2", source: "node_1", target: "node_2", animated: true, style: { stroke: "#6b7280" } },
    { id: "e2-3", source: "node_2", target: "node_3", animated: true, style: { stroke: "#6b7280" } },
  ];
}

// ─── Node inspector ───────────────────────────────────────────────────────────
interface InspectorProps {
  node:        Node<EpisodeNodeData> | null;
  allChars:    AnimeCharacter[];
  onUpdate:    (id: string, patch: Partial<EpisodeNodeData>) => void;
}

function NodeInspector({ node, allChars, onUpdate }: InspectorProps) {
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs text-center px-4">
        <div className="text-4xl mb-3">🗒️</div>
        <p>Click a node to inspect</p>
      </div>
    );
  }
  const d = node.data as EpisodeNodeData;
  const st = NODE_STYLE[d.nodeType];
  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span className="text-xl">{st.icon}</span>
        <div>
          <input
            value={d.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="bg-transparent text-sm font-bold text-white border-b border-white/20 focus:border-purple-500 outline-none w-full"
          />
          <p className="text-[10px] text-gray-500 capitalize">{d.nodeType}</p>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1 block">Scene</label>
        <input
          value={d.scene}
          onChange={(e) => onUpdate(node.id, { scene: e.target.value })}
          placeholder="Scene description…"
          className="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1 block">Dialogue</label>
        <textarea
          value={d.dialogue}
          onChange={(e) => onUpdate(node.id, { dialogue: e.target.value })}
          placeholder="Key dialogue or narration…"
          rows={4}
          className="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1 block">
          Characters in scene
        </label>
        {allChars.length === 0 ? (
          <p className="text-[10px] text-gray-600">No characters — create some first.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {allChars.map((c) => {
              const checked = d.characters.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? d.characters.filter((x) => x !== c.id)
                        : [...d.characters, c.id];
                      onUpdate(node.id, { characters: next });
                    }}
                    className="rounded accent-purple-500"
                  />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{c.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main EpisodePlanner ──────────────────────────────────────────────────────
interface Props {
  episodeTitle:  string;
  allChars:      AnimeCharacter[];
  onGenerate:    (nodes: Node<EpisodeNodeData>[], edges: Edge[]) => void;
  onClose:       () => void;
}

export default function EpisodePlanner({ episodeTitle, allChars, onGenerate, onClose }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EpisodeNodeData>>(buildDefaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildDefaultEdges());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: "#6b7280" } }, eds)),
    [setEdges]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  function updateNodeData(id: string, patch: Partial<EpisodeNodeData>) {
    setNodes((prev) =>
      prev.map((n) => n.id !== id ? n : { ...n, data: { ...n.data as EpisodeNodeData, ...patch } })
    );
  }

  function addCustomNode() {
    const newNode: Node<EpisodeNodeData> = {
      id:       `node_${Date.now()}`,
      type:     "storyNode",
      position: { x: 100 + Math.random() * 400, y: 260 + Math.random() * 100 },
      data: { label: "New Scene", nodeType: "custom", dialogue: "", scene: "", characters: [] },
    };
    setNodes((prev) => [...prev, newNode]);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="h-12 bg-gray-900 border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
        <span className="text-lg">🗺️</span>
        <span className="text-sm font-bold text-white">Episode Planner</span>
        <span className="text-xs text-gray-400 border border-white/10 rounded px-2 py-0.5">{episodeTitle || "Untitled Episode"}</span>

        <button
          onClick={addCustomNode}
          className="ml-2 px-3 py-1.5 text-xs rounded-md bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-600/30 transition-colors"
        >
          + Add Scene
        </button>

        <div className="flex-1" />

        <button
          onClick={() => onGenerate(nodes, edges)}
          className="px-3 py-1.5 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-400 text-black transition-colors flex items-center gap-1.5"
        >
          ⚡ Generate Episode
        </button>

        <button onClick={onClose} className="ml-3 text-gray-500 hover:text-white text-xl transition-colors">✕</button>
      </div>

      {/* Body: flow + inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            style={{ background: "#0e0e1a" }}
          >
            <Background color="#2d2d4a" gap={20} size={1} />
            <Controls
              style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <MiniMap
              nodeColor={(n) => {
                const st = NODE_STYLE[(n.data as unknown as EpisodeNodeData).nodeType];
                return st?.border ?? "#6b7280";
              }}
              style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </ReactFlow>
        </div>

        {/* Inspector panel */}
        <div className="w-56 shrink-0 bg-gray-900 border-l border-white/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Node Inspector</p>
          </div>
          <NodeInspector node={selectedNode} allChars={allChars} onUpdate={updateNodeData} />
        </div>
      </div>
    </div>
  );
}
