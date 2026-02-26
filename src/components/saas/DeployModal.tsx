"use client";

import React, { useState } from "react";
import { Node, Edge } from "reactflow";
import { WorkflowNodeData } from "./WorkflowNode";
import { BLOCK_MAP } from "./nodeConfig";

interface DeployModalProps {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  onClose: () => void;
}

function generateEdgeFunctionCode(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): string {
  const nodeMap: Record<string, Node<WorkflowNodeData>> = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  // Build adjacency list
  const adjacency: Record<string, string[]> = {};
  edges.forEach((e) => {
    if (!adjacency[e.source]) adjacency[e.source] = [];
    adjacency[e.source].push(e.target);
  });

  // Find trigger nodes
  const triggers = nodes.filter(
    (n) =>
      n.data.nodeType === "webhookTrigger" || n.data.nodeType === "scheduleTrigger"
  );

  const steps = nodes
    .filter(
      (n) =>
        n.data.nodeType !== "webhookTrigger" &&
        n.data.nodeType !== "scheduleTrigger"
    )
    .map((n) => {
      const cfg = n.data.config ?? {};
      const block = BLOCK_MAP[n.data.nodeType];

      if (n.data.nodeType === "httpRequest") {
        return `  // Step: ${n.data.label} (HTTP Request)
  const ${n.id.replace(/-/g, "_")}_res = await fetch("${cfg.url ?? ""}", {
    method: "${cfg.method ?? "GET"}",
    headers: ${cfg.headers ? cfg.headers : "{}"},
    ${cfg.method !== "GET" && cfg.body ? `body: JSON.stringify(${cfg.body}),` : ""}
  });
  const ${n.id.replace(/-/g, "_")}_data = await ${n.id.replace(/-/g, "_")}_res.json();`;
      }

      if (n.data.nodeType === "supabaseQuery") {
        return `  // Step: ${n.data.label} (Supabase Query)
  const { data: ${n.id.replace(/-/g, "_")}_data, error: ${n.id.replace(/-/g, "_")}_err } = await supabase
    .from("${cfg.table ?? "table_name"}")
    .${cfg.operation ?? "select"}("${cfg.columns ?? "*"}");
  if (${n.id.replace(/-/g, "_")}_err) throw ${n.id.replace(/-/g, "_")}_err;`;
      }

      if (n.data.nodeType === "sendEmail") {
        return `  // Step: ${n.data.label} (Send Email)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": \`Bearer \${Deno.env.get("RESEND_API_KEY")}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "${cfg.from ?? "noreply@example.com"}",
      to: ["${cfg.to ?? ""}"],
      subject: "${cfg.subject ?? ""}",
      html: \`${cfg.template ?? ""}\`,
    }),
  });`;
      }

      if (n.data.nodeType === "openAICall") {
        return `  // Step: ${n.data.label} (OpenAI Call)
  const ${n.id.replace(/-/g, "_")}_response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": \`Bearer \${Deno.env.get("OPENAI_API_KEY")}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "${cfg.model ?? "gpt-4o-mini"}",
      messages: [
        { role: "system", content: "${(cfg.systemPrompt as string ?? "").replace(/"/g, '\\"')}" },
        { role: "user", content: "${(cfg.userPrompt as string ?? "{{input}}").replace(/"/g, '\\"')}" },
      ],
      temperature: ${cfg.temperature ?? 0.7},
      max_tokens: ${cfg.maxTokens ?? 1000},
    }),
  });
  const ${n.id.replace(/-/g, "_")}_data = await ${n.id.replace(/-/g, "_")}_response.json();
  const ${n.id.replace(/-/g, "_")}_text = ${n.id.replace(/-/g, "_")}_data.choices?.[0]?.message?.content ?? "";`;
      }

      if (n.data.nodeType === "ifElse") {
        return `  // Step: ${n.data.label} (If/Else)
  const ${n.id.replace(/-/g, "_")}_condition = (${(cfg.condition as string ?? "true").replace(/{{/g, "context.").replace(/}}/g, "")});
  if (${n.id.replace(/-/g, "_")}_condition) {
    // TRUE branch — continue to next node
  } else {
    // FALSE branch — handle error/fallback
  }`;
      }

      return `  // Step: ${n.data.label} (${block?.label ?? n.data.nodeType})
  // TODO: implement ${n.data.nodeType} logic`;
    });

  const triggerNode = triggers[0];
  const isWebhook = triggerNode?.data.nodeType === "webhookTrigger";
  const triggerConfig = triggerNode?.data.config ?? {};

  return `// Auto-generated Supabase Edge Function
// Workflow: ${nodes.map((n) => n.data.label).join(" → ")}
// Generated on ${new Date().toISOString()}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

${isWebhook ? `    // Webhook Trigger: ${triggerConfig.path ?? "/webhook"}
    const body = req.method !== "GET" ? await req.json() : {};
    const context = { ...body };
    console.log("Workflow triggered via webhook:", context);` : `    // Schedule Trigger: ${triggerConfig.cron ?? "0 9 * * *"}
    const context = { triggeredAt: new Date().toISOString() };
    console.log("Workflow triggered by scheduler:", context);`}

${steps.join("\n\n")}

    return new Response(
      JSON.stringify({ success: true, message: "Workflow completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Workflow error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
`;
}

export default function DeployModal({ nodes, edges, onClose }: DeployModalProps) {
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const code = generateEdgeFunctionCode(nodes, edges);
  const functionName = "workflow-" + Date.now();

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulateDeploy = async () => {
    setDeploying(true);
    await new Promise((r) => setTimeout(r, 2000));
    setDeploying(false);
    setDeployed(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#0d1117", border: "1px solid #30363d" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#21262d", background: "#161b22" }}
        >
          <div>
            <h2 className="text-sm font-bold text-white">Deploy Workflow</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Supabase Edge Function code — {nodes.length} nodes, {edges.length} connections
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl px-2">
            ✕
          </button>
        </div>

        {/* Deploy steps */}
        <div
          className="flex items-center gap-3 px-6 py-3 border-b text-[11px] text-gray-400 flex-wrap"
          style={{ borderColor: "#21262d", background: "#0d1117" }}
        >
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
            Review code
          </span>
          <span className="text-gray-600">→</span>
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
            Click Deploy
          </span>
          <span className="text-gray-600">→</span>
          <span className="flex items-center gap-1">
            <span className={`w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold ${deployed ? "bg-green-600" : "bg-gray-700"}`}>3</span>
            Live on Supabase
          </span>
        </div>

        {/* Code preview */}
        <div className="flex-1 overflow-y-auto">
          <pre
            className="px-6 py-4 text-[11px] font-mono text-green-300 leading-relaxed overflow-x-auto"
            style={{ background: "#0d1117" }}
          >
            {code}
          </pre>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t gap-3"
          style={{ borderColor: "#21262d", background: "#161b22" }}
        >
          <div className="text-[11px] text-gray-500">
            <span className="font-mono text-gray-400">supabase functions deploy {functionName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#21262d", color: copied ? "#4ade80" : "#9ca3af", border: "1px solid #30363d" }}
            >
              {copied ? "✓ Copied" : "Copy Code"}
            </button>
            <button
              onClick={simulateDeploy}
              disabled={deploying || deployed}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
              style={{
                background: deployed ? "#16a34a" : "#2563eb",
                color: "white",
                border: deployed ? "1px solid #15803d" : "1px solid #1d4ed8",
              }}
            >
              {deploying ? "⚡ Deploying…" : deployed ? "✓ Deployed!" : "🚀 Deploy to Supabase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
