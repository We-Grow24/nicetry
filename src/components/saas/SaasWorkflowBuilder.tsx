"use client";

import React, {
  useCallback,
  useRef,
  useState,
  DragEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  OnNodesChange,
  OnEdgesChange,
} from "reactflow";
import "reactflow/dist/style.css";

import WorkflowNode, { WorkflowNodeData } from "./WorkflowNode";
import NodePanel from "./NodePanel";
import InspectorPanel from "./InspectorPanel";
import DeployModal from "./DeployModal";
import ExportButton from "@/components/common/ExportButton";
import { BLOCK_MAP, LOGIC_BLOCKS } from "./nodeConfig";

// Register custom node types
const nodeTypes = { workflowNode: WorkflowNode };

let idCounter = 1;
const getId = () => `node_${idCounter++}`;

// ------------------------------------------------------------------
// Inner canvas (needs useReactFlow — must be inside ReactFlowProvider)
// ------------------------------------------------------------------
function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  selectedNode,
  setSelectedNode,
}: {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: React.Dispatch<React.SetStateAction<Node<WorkflowNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  selectedNode: Node<WorkflowNodeData> | null;
  setSelectedNode: (n: Node<WorkflowNodeData> | null) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#4b5563", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/reactflow-type");
      if (!nodeType) return;

      const block = BLOCK_MAP[nodeType];
      if (!block) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const newNode: Node<WorkflowNodeData> = {
        id: getId(),
        type: "workflowNode",
        position,
        data: {
          label: block.label,
          nodeType: block.type,
          color: block.color,
          icon: block.icon,
          description: block.description,
          config: { ...block.defaultData },
        },
      };

      setNodes((ns) => [...ns, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1e2533"
        />
        <Controls
          className="!bg-[#161b22] !border-[#30363d] !rounded-xl overflow-hidden"
          style={{ bottom: 24, left: 24 }}
        />
        <MiniMap
          className="!bg-[#0d1117] !border-[#21262d] !rounded-xl overflow-hidden"
          nodeColor={(n: Node<WorkflowNodeData>) =>
            n.data?.color ?? "#374151"
          }
          style={{ bottom: 24, right: 24 }}
        />
      </ReactFlow>
    </div>
  );
}

// ------------------------------------------------------------------
// Main builder wrapper
// ------------------------------------------------------------------
export default function SaasWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);

  const searchParams  = useSearchParams();
  const projectId     = searchParams.get("project_id");

  const [showDeploy, setShowDeploy] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [workflowName, setWorkflowName] = useState("My Workflow");

  // Keep selected node in sync when config changes
  const handleConfigChange = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config } }
            : n
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? { ...prev, data: { ...prev.data, config } }
          : prev
      );
    },
    [setNodes]
  );

  // ---------- Custom GPT node generation ----------
  const handleGenerateNode = async () => {
    if (!customPrompt.trim()) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are a workflow builder AI. The user wants a custom logic block.
Description: "${customPrompt}"

Respond with ONLY a valid JSON object (no markdown, no explanation) like:
{
  "label": "...",
  "icon": "...",
  "color": "#hexcolor",
  "description": "...",
  "config": { "key1": "value1", "key2": "value2" }
}`,
          mode: "node-gen",
        }),
      });

      let nodeData: Partial<WorkflowNodeData> = {};

      if (res.ok) {
        const json = await res.json();
        // Try to parse the AI response
        const raw = json.result ?? json.text ?? json.content ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            nodeData = JSON.parse(match[0]);
          } catch {
            // fallback below
          }
        }
      }

      // Build node with AI data or fallback
      const newNode: Node<WorkflowNodeData> = {
        id: getId(),
        type: "workflowNode",
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        data: {
          label: (nodeData.label as string) ?? customPrompt.slice(0, 30),
          nodeType: "custom_" + Date.now(),
          icon: (nodeData.icon as string) ?? "✨",
          color: (nodeData.color as string) ?? "#8b5cf6",
          description: (nodeData.description as string) ?? customPrompt,
          isCustom: true,
          config: (nodeData.config as Record<string, unknown>) ?? {},
        },
      };

      setNodes((ns) => [...ns, newNode]);
      setCustomPrompt("");
    } catch (err) {
      console.error("Node generation error:", err);
      // Add a fallback node anyway
      const newNode: Node<WorkflowNodeData> = {
        id: getId(),
        type: "workflowNode",
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        data: {
          label: customPrompt.slice(0, 30),
          nodeType: "custom_" + Date.now(),
          icon: "✨",
          color: "#8b5cf6",
          description: customPrompt,
          isCustom: true,
          config: {},
        },
      };
      setNodes((ns) => [...ns, newNode]);
      setCustomPrompt("");
    } finally {
      setGenerating(false);
    }
  };

  // ---------- Export SaaS as ZIP ----------
  const handleExport = async () => {
    setExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const apiFolder = zip.folder("pages/api");
      const slugName = workflowName.toLowerCase().replace(/\s+/g, "-");

      // Generate API route
      const apiRoute = generateNextApiRoute(nodes, edges, slugName);
      apiFolder?.file(`${slugName}.ts`, apiRoute);

      // Generate package.json
      zip.file(
        "package.json",
        JSON.stringify(
          {
            name: slugName + "-saas",
            version: "1.0.0",
            scripts: { dev: "next dev", build: "next build", start: "next start" },
            dependencies: {
              next: "^14.0.0",
              react: "^18.0.0",
              "react-dom": "^18.0.0",
              "@supabase/supabase-js": "^2.0.0",
            },
          },
          null,
          2
        )
      );

      // README
      zip.file(
        "README.md",
        `# ${workflowName}\n\nAuto-generated SaaS workflow with ${nodes.length} nodes.\n\n## Setup\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## API Endpoint\n\`POST /api/${slugName}\`\n`
      );

      // Workflow JSON
      zip.file(
        "workflow.json",
        JSON.stringify({ name: workflowName, nodes, edges }, null, 2)
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugName}-saas.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const clearCanvas = () => {
    if (confirm("Clear all nodes and connections?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#0d1117" }}
    >
      {/* ── Top Toolbar ── */}
      <header
        className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ background: "#161b22", borderColor: "#21262d" }}
      >
        {/* Logo + name */}
        <div className="flex items-center gap-2 mr-2">
          <span className="text-xl">⚡</span>
          <input
            className="text-sm font-semibold bg-transparent text-white border-b border-transparent focus:border-blue-500 focus:outline-none w-44 truncate"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
          />
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Stats */}
        <span className="text-[11px] text-gray-500">
          {nodes.length} nodes · {edges.length} edges
        </span>

        <div className="flex-1" />

        {/* GPT-4o-mini custom node prompt */}
        <div className="flex items-center gap-1.5 flex-1 max-w-sm">
          <input
            className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[#0d1117] border border-[#30363d] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="Describe a custom logic block…"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateNode()}
          />
          <button
            onClick={handleGenerateNode}
            disabled={generating || !customPrompt.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: "#7c3aed", color: "white", border: "1px solid #6d28d9" }}
          >
            {generating ? "⚡ Generating…" : "✨ Generate"}
          </button>
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Action buttons */}
        <button
          onClick={clearCanvas}
          className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
          style={{ border: "1px solid #30363d" }}
        >
          Clear
        </button>
        <button
          onClick={handleExport}
          disabled={exporting || nodes.length === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: "#0f4c75", color: "#7dd3fc", border: "1px solid #1e6091" }}
        >
          {exporting ? "Zipping…" : "📦 Export SaaS"}
        </button>
        <ExportButton
          projectId={projectId}
          projectType="saas"
          dark
        />
        <button
          onClick={() => nodes.length > 0 && setShowDeploy(true)}
          disabled={nodes.length === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: "#16a34a", color: "white", border: "1px solid #15803d" }}
        >
          🚀 Deploy Workflow
        </button>
      </header>

      {/* ── Main 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — 220px */}
        <div className="flex-shrink-0 overflow-hidden" style={{ width: 220 }}>
          <NodePanel />
        </div>

        {/* Center — React Flow canvas */}
        <div className="flex-1 relative overflow-hidden">
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="text-center max-w-xs">
                <span className="text-5xl">🔗</span>
                <p className="text-gray-400 text-sm mt-4 font-medium">
                  Drag logic blocks from the left panel
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Connect nodes to build your workflow. Start with a trigger.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center pointer-events-auto">
                  {LOGIC_BLOCKS.filter((b) => b.category === "trigger").map((b) => (
                    <button
                      key={b.type}
                      onClick={() => {
                        const block = BLOCK_MAP[b.type];
                        const newNode: Node<WorkflowNodeData> = {
                          id: getId(),
                          type: "workflowNode",
                          position: { x: 300, y: 200 },
                          data: {
                            label: block.label,
                            nodeType: block.type,
                            color: block.color,
                            icon: block.icon,
                            description: block.description,
                            config: { ...block.defaultData },
                          },
                        };
                        setNodes([newNode]);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: `${b.color}22`,
                        border: `1px solid ${b.color}44`,
                        color: b.color,
                      }}
                    >
                      {b.icon} Add {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setNodes={setNodes}
              setEdges={setEdges}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
            />
          </ReactFlowProvider>
        </div>

        {/* Right panel — Inspector, 260px */}
        <div className="flex-shrink-0 overflow-hidden" style={{ width: 260 }}>
          <InspectorPanel node={selectedNode} onChange={handleConfigChange} />
        </div>
      </div>

      {/* Deploy Modal */}
      {showDeploy && (
        <DeployModal
          nodes={nodes}
          edges={edges}
          onClose={() => setShowDeploy(false)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Next.js API route generator
// ----------------------------------------------------------------
function generateNextApiRoute(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  name: string
): string {
  return `// Auto-generated Next.js API route: /api/${name}
// Workflow: ${nodes.map((n) => n.data.label).join(" → ")}

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const context: Record<string, unknown> = { ...req.body, ...req.query };

${nodes
  .filter((n) => n.data.nodeType !== "webhookTrigger" && n.data.nodeType !== "scheduleTrigger")
  .map((n) => {
    const cfg = n.data.config ?? {};
    if (n.data.nodeType === "httpRequest") {
      return `    // HTTP Request: ${n.data.label}
    const res_${n.id.replace(/-/g, "_")} = await fetch("${cfg.url}", { method: "${cfg.method ?? "GET"}" });
    context["${n.id}"] = await res_${n.id.replace(/-/g, "_")}.json();`;
    }
    return `    // ${n.data.label} (${n.data.nodeType})
    // TODO: implement node logic`;
  })
  .join("\n\n")}

    return res.status(200).json({ success: true, data: context });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
`;
}
