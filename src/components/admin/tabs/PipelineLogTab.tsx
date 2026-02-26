"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface PipelineRun {
  id: string;
  user_id: string;
  zone_type: string;
  status: string;
  prompt: string | null;
  master_seed: Record<string, unknown> | null;
  created_at: string;
  wisdom_rejection?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  architect_done: "bg-blue-100 text-blue-700",
  wisdom_approved: "bg-green-100 text-green-700",
  wisdom_rejected: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-200 text-red-800",
};

export default function PipelineLogTab() {
  const supabase = createClient();
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [detailRun, setDetailRun] = useState<PipelineRun | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("pipeline_runs")
      .select("id, user_id, zone_type, status, prompt, master_seed, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (zoneFilter !== "all") q = q.eq("zone_type", zoneFilter);
    if (userFilter.trim()) q = q.eq("user_id", userFilter.trim());

    const { data } = await q;
    setRuns((data as PipelineRun[]) ?? []);
    setLoading(false);
  }, [supabase, statusFilter, zoneFilter, userFilter]);

  useEffect(() => { load(); }, [load]);

  const allStatuses = [
    "pending",
    "architect_done",
    "wisdom_approved",
    "wisdom_rejected",
    "completed",
    "failed",
  ];
  const allZones = ["game", "website", "video", "anime", "saas"];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Filter by user ID…"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <select
          className="input-field w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="input-field w-36"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="all">All zones</option>
          {allZones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <button onClick={load} className="btn-secondary">
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["Run ID", "User", "Zone", "Status", "Prompt", "Started", "Detail"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  No runs found
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {r.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {r.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {r.zone_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[r.status] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {r.prompt ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailRun(r)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detailRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold dark:text-white">
                Run: {detailRun.id}
              </h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_COLORS[detailRun.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {detailRun.status}
              </span>
            </div>
            <p className="mb-1 text-sm text-gray-500">
              <strong>Zone:</strong> {detailRun.zone_type} |{" "}
              <strong>User:</strong> {detailRun.user_id}
            </p>
            {detailRun.prompt && (
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                <strong>Prompt:</strong> {detailRun.prompt}
              </p>
            )}
            {detailRun.master_seed ? (
              <>
                <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  master_seed JSON
                </p>
                <pre className="max-h-96 overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-green-400">
                  {JSON.stringify(detailRun.master_seed, null, 2)}
                </pre>
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No master_seed generated yet
              </p>
            )}
            <button
              onClick={() => setDetailRun(null)}
              className="btn-secondary mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
