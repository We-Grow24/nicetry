"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { BLOCK_MAP } from "./nodeConfig";

export interface WorkflowNodeData {
  label: string;
  nodeType: string;
  color?: string;
  icon?: string;
  config?: Record<string, unknown>;
  isCustom?: boolean;
  description?: string;
}

function WorkflowNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const block = BLOCK_MAP[data.nodeType];
  const color = data.color ?? block?.color ?? "#6b7280";
  const icon = data.icon ?? block?.icon ?? "⚡";
  const label = data.label ?? block?.label ?? "Node";
  const isTrigger = block?.category === "trigger";

  return (
    <div
      className="relative min-w-[180px] rounded-xl shadow-lg transition-all duration-150"
      style={{
        background: "rgba(17,24,39,0.97)",
        border: `2px solid ${selected ? "#fff" : color}`,
        boxShadow: selected
          ? `0 0 0 3px ${color}55, 0 8px 30px rgba(0,0,0,0.5)`
          : `0 4px 20px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Top handle — input (except triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !rounded-full !border-2 !border-gray-800"
          style={{ background: color, top: -7 }}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
        style={{ background: `${color}22`, borderBottom: `1px solid ${color}33` }}
      >
        <span className="text-lg leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{label}</p>
          {block?.category && (
            <p
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `${color}cc` }}
            >
              {block.category}
            </p>
          )}
        </div>
        {/* live indicator */}
        <span
          className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
          style={{ background: color }}
        />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <p className="text-[11px] text-gray-400 truncate">
          {data.description ?? block?.description ?? "Configure in inspector →"}
        </p>
        {/* Show a couple config pills */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(data.config)
              .slice(0, 2)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                  style={{ background: `${color}22`, color: `${color}dd` }}
                >
                  {k}:{" "}
                  {String(v).length > 10 ? String(v).slice(0, 10) + "…" : String(v)}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Bottom handle — output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !rounded-full !border-2 !border-gray-800"
        style={{ background: color, bottom: -7 }}
      />

      {/* If/Else has two output handles */}
      {data.nodeType === "ifElse" && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !rounded-full !border-2 !border-gray-800"
            style={{ background: "#22c55e", bottom: -7, left: "30%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !rounded-full !border-2 !border-gray-800"
            style={{ background: "#ef4444", bottom: -7, left: "70%" }}
          />
          <div className="flex justify-between px-4 pb-1">
            <span className="text-[9px] text-green-400">TRUE</span>
            <span className="text-[9px] text-red-400">FALSE</span>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(WorkflowNode);
