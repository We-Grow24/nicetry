"use client";

import React from "react";
import { Node } from "reactflow";
import { BLOCK_MAP } from "./nodeConfig";
import { WorkflowNodeData } from "./WorkflowNode";

interface InspectorPanelProps {
  node: Node<WorkflowNodeData> | null;
  onChange: (nodeId: string, config: Record<string, unknown>) => void;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  options,
  rows,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (k: string, v: string) => void;
  type?: string;
  placeholder?: string;
  options?: string[];
  rows?: number;
}) {
  const cls =
    "w-full px-2.5 py-1.5 rounded-md text-xs bg-[#161b22] border border-[#30363d] text-gray-200 focus:outline-none focus:border-blue-500 placeholder-gray-600";

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </label>
      {options ? (
        <select
          className={cls}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : rows ? (
        <textarea
          className={cls}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <input
          className={cls}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
    </div>
  );
}

function ConfigFields({
  nodeType,
  config,
  setField,
}: {
  nodeType: string;
  config: Record<string, unknown>;
  setField: (k: string, v: string) => void;
}) {
  const get = (k: string) => String(config[k] ?? "");

  if (nodeType === "httpRequest") {
    return (
      <div className="space-y-3">
        <Field label="URL" name="url" value={get("url")} onChange={setField} placeholder="https://api.example.com/endpoint" />
        <Field label="Method" name="method" value={get("method")} onChange={setField} options={["GET", "POST", "PUT", "PATCH", "DELETE"]} />
        <Field label="Headers (JSON)" name="headers" value={get("headers")} onChange={setField} rows={3} placeholder={'{"Authorization": "Bearer {{token}}"}'} />
        <Field label="Body (JSON)" name="body" value={get("body")} onChange={setField} rows={4} placeholder={'{"key": "{{value}}"}'} />
      </div>
    );
  }

  if (nodeType === "supabaseQuery") {
    return (
      <div className="space-y-3">
        <Field label="Table" name="table" value={get("table")} onChange={setField} placeholder="users" />
        <Field label="Operation" name="operation" value={get("operation")} onChange={setField} options={["select", "insert", "update", "upsert", "delete"]} />
        <Field label="Columns" name="columns" value={get("columns")} onChange={setField} placeholder="id, name, email" />
        <Field label="Filters (e.g. id=eq.{{id}})" name="filters" value={get("filters")} onChange={setField} rows={2} placeholder="status=eq.active" />
      </div>
    );
  }

  if (nodeType === "sendEmail") {
    return (
      <div className="space-y-3">
        <Field label="From" name="from" value={get("from")} onChange={setField} placeholder="noreply@example.com" />
        <Field label="To" name="to" value={get("to")} onChange={setField} placeholder="{{user.email}}" />
        <Field label="Subject" name="subject" value={get("subject")} onChange={setField} placeholder="Welcome to our app!" />
        <Field label="Template (HTML or text)" name="template" value={get("template")} onChange={setField} rows={5} placeholder="<h1>Hello {{name}}</h1>" />
      </div>
    );
  }

  if (nodeType === "razorpayPayment") {
    return (
      <div className="space-y-3">
        <Field label="Amount (in paise)" name="amount" value={get("amount")} onChange={setField} placeholder="10000" />
        <Field label="Currency" name="currency" value={get("currency")} onChange={setField} options={["INR", "USD", "EUR", "GBP"]} />
        <Field label="Order ID" name="orderId" value={get("orderId")} onChange={setField} placeholder="{{order.id}}" />
        <Field label="Webhook URL" name="webhookUrl" value={get("webhookUrl")} onChange={setField} placeholder="https://yourapp.com/api/razorpay-webhook" />
      </div>
    );
  }

  if (nodeType === "openAICall") {
    return (
      <div className="space-y-3">
        <Field label="Model" name="model" value={get("model")} onChange={setField} options={["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]} />
        <Field label="System Prompt" name="systemPrompt" value={get("systemPrompt")} onChange={setField} rows={3} placeholder="You are a helpful assistant..." />
        <Field label="User Prompt" name="userPrompt" value={get("userPrompt")} onChange={setField} rows={3} placeholder="Summarize: {{input}}" />
        <Field label="Temperature (0-1)" name="temperature" value={get("temperature")} onChange={setField} placeholder="0.7" />
        <Field label="Max Tokens" name="maxTokens" value={get("maxTokens")} onChange={setField} placeholder="1000" />
      </div>
    );
  }

  if (nodeType === "ifElse") {
    return (
      <div className="space-y-3">
        <Field label="Condition (JS expression)" name="condition" value={get("condition")} onChange={setField} rows={2} placeholder="{{data.status}} === 'active'" />
        <Field label="Variable Expression" name="expression" value={get("expression")} onChange={setField} rows={2} placeholder="{{data.amount}} > 1000" />
        <div className="p-2 rounded-md" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-[10px] text-gray-400">
            ✅ <span className="text-green-400">True</span> → connects to next node via green handle
            <br />
            ❌ <span className="text-red-400">False</span> → connects to error/fallback node via red handle
          </p>
        </div>
      </div>
    );
  }

  if (nodeType === "scheduleTrigger") {
    return (
      <div className="space-y-3">
        <Field label="Cron Expression" name="cron" value={get("cron")} onChange={setField} placeholder="0 9 * * *" />
        <Field label="Timezone" name="timezone" value={get("timezone")} onChange={setField} options={["UTC", "Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Tokyo"]} />
        <div className="p-2 rounded-md" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-[10px] text-gray-500">Examples:</p>
          <p className="text-[10px] text-gray-400 font-mono mt-1">0 9 * * * → 9am daily<br />*/15 * * * * → every 15 min<br />0 0 * * 1 → every Monday</p>
        </div>
      </div>
    );
  }

  if (nodeType === "webhookTrigger") {
    return (
      <div className="space-y-3">
        <Field label="Path" name="path" value={get("path")} onChange={setField} placeholder="/webhook/my-trigger" />
        <Field label="Method" name="method" value={get("method")} onChange={setField} options={["POST", "GET", "PUT"]} />
        <Field label="Secret Token" name="secret" value={get("secret")} onChange={setField} type="password" placeholder="webhook-secret" />
        <div className="p-2 rounded-md" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <p className="text-[10px] text-gray-400">
            Endpoint URL will be:<br />
            <span className="font-mono text-teal-400">https://[project].supabase.co/functions/v1/workflow{get("path")}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-md" style={{ background: "#161b22", border: "1px solid #30363d" }}>
      <p className="text-xs text-gray-500">Custom node — configure via code.</p>
    </div>
  );
}

export default function InspectorPanel({ node, onChange }: InspectorPanelProps) {
  if (!node) {
    return (
      <aside
        className="flex flex-col items-center justify-center h-full p-6"
        style={{ background: "#0d1117", borderLeft: "1px solid #21262d" }}
      >
        <div className="text-center">
          <span className="text-4xl">👆</span>
          <p className="text-sm text-gray-400 mt-3">Click a node to configure it</p>
          <p className="text-[11px] text-gray-600 mt-1">Select any node on the canvas</p>
        </div>
      </aside>
    );
  }

  const block = BLOCK_MAP[node.data.nodeType];
  const color = node.data.color ?? block?.color ?? "#6b7280";
  const config = (node.data.config ?? {}) as Record<string, unknown>;

  const setField = (k: string, v: string) => {
    onChange(node.id, { ...config, [k]: v });
  };

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "#0d1117", borderLeft: "1px solid #21262d" }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b border-[#21262d]"
        style={{ background: `${color}11` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{node.data.icon ?? block?.icon ?? "⚡"}</span>
          <div>
            <p className="text-sm font-semibold text-white">{node.data.label}</p>
            <p
              className="text-[10px] uppercase tracking-wider font-medium"
              style={{ color: `${color}cc` }}
            >
              {block?.category ?? "custom"} · {node.id}
            </p>
          </div>
        </div>
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
          Configuration
        </p>
        <ConfigFields nodeType={node.data.nodeType} config={config} setField={setField} />
      </div>

      {/* Node description */}
      <div className="px-4 py-3 border-t border-[#21262d]">
        <p className="text-[10px] text-gray-600">
          Use <span className="text-gray-400 font-mono">{`{{variable}}`}</span> syntax to pass data between nodes.
        </p>
      </div>
    </aside>
  );
}
