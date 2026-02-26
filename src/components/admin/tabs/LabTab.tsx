"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface QueueBlock {
  id: string;
  name: string;
  type: string;
  fusion_description: string | null;
  seed_json: Record<string, unknown>;
  tags: string[];
  created_at: string;
}

export default function LabTab() {
  const supabase = createClient();
  const [queue, setQueue] = useState<QueueBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningLab, setRunningLab] = useState(false);
  const [labMsg, setLabMsg] = useState("");
  const [previewBlock, setPreviewBlock] = useState<QueueBlock | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_blocks")
      .select("*")
      .eq("is_quarantine", true)
      .eq("is_approved", false)
      .order("created_at", { ascending: false });
    setQueue((data as QueueBlock[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    await supabase
      .from("library_blocks")
      .update({ is_quarantine: false, is_approved: true })
      .eq("id", id);
    setQueue((prev) => prev.filter((b) => b.id !== id));
  };

  const reject = async (id: string) => {
    if (!confirm("Delete this fusion block?")) return;
    await supabase.from("library_blocks").delete().eq("id", id);
    setQueue((prev) => prev.filter((b) => b.id !== id));
  };

  const runLab = async () => {
    setRunningLab(true);
    setLabMsg("");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/alchemical-lab`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ trigger: "manual" }),
        }
      );
      const json = await res.json().catch(() => ({}));
      setLabMsg(
        res.ok
          ? `✅ Lab run triggered. ${json.message ?? ""}`
          : `❌ Error: ${json.error ?? res.status}`
      );
      if (res.ok) load();
    } catch (e) {
      setLabMsg(`❌ Network error: ${String(e)}`);
    } finally {
      setRunningLab(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            ⚗️ Alchemical Lab
          </h2>
          <p className="text-sm text-gray-500">
            Fusions awaiting review — {queue.length} pending
          </p>
        </div>
        <div className="flex items-center gap-3">
          {labMsg && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {labMsg}
            </span>
          )}
          <button
            onClick={runLab}
            disabled={runningLab}
            className="btn-primary"
          >
            {runningLab ? "Running…" : "Run Lab Now"}
          </button>
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <p className="text-gray-400">Loading queue…</p>
      ) : queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400 dark:border-gray-600">
          No fusions waiting for review
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queue.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/40 dark:bg-amber-900/10"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    {b.name}
                  </h3>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {b.type}
                  </span>
                </div>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
                  Pending
                </span>
              </div>

              {b.fusion_description && (
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  {b.fusion_description}
                </p>
              )}

              <div className="mb-3 flex flex-wrap gap-1">
                {b.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => approve(b.id)}
                  className="flex-1 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => reject(b.id)}
                  className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
                >
                  ❌ Reject
                </button>
                <button
                  onClick={() => setPreviewBlock(b)}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                >
                  JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* JSON Preview */}
      {previewBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-3 font-semibold dark:text-white">
              {previewBlock.name} — seed_json
            </h3>
            <pre className="max-h-96 overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-green-400">
              {JSON.stringify(previewBlock.seed_json, null, 2)}
            </pre>
            <button
              onClick={() => setPreviewBlock(null)}
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
