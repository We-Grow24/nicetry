"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface LibBlock {
  id: string;
  type: string;
  niche: string | null;
  name: string;
  tags: string[];
  seed_json: Record<string, unknown>;
  usage_count: number;
  is_quarantine: boolean;
  is_approved: boolean;
  created_at: string;
}

export default function LibraryTab() {
  const supabase = createClient();
  const [blocks, setBlocks] = useState<LibBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [quarFilter, setQuarFilter] = useState("all");
  const [jsonPreview, setJsonPreview] = useState<LibBlock | null>(null);
  const [editTags, setEditTags] = useState<{
    id: string;
    tags: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_blocks")
      .select("*")
      .order("created_at", { ascending: false });
    setBlocks((data as LibBlock[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const allTypes = Array.from(new Set(blocks.map((b) => b.type)));

  const filtered = blocks.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.niche ?? "").toLowerCase().includes(search.toLowerCase()) ||
      b.tags.join(" ").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || b.type === typeFilter;
    const matchQuar =
      quarFilter === "all"
        ? true
        : quarFilter === "yes"
        ? b.is_quarantine
        : !b.is_quarantine;
    return matchSearch && matchType && matchQuar;
  });

  const toggleQuarantine = async (b: LibBlock) => {
    await supabase
      .from("library_blocks")
      .update({ is_quarantine: !b.is_quarantine })
      .eq("id", b.id);
    setBlocks((prev) =>
      prev.map((x) =>
        x.id === b.id ? { ...x, is_quarantine: !x.is_quarantine } : x
      )
    );
  };

  const deleteBlock = async (id: string) => {
    if (!confirm("Delete this library block?")) return;
    await supabase.from("library_blocks").delete().eq("id", id);
    setBlocks((prev) => prev.filter((x) => x.id !== id));
  };

  const saveTags = async () => {
    if (!editTags) return;
    setSaving(true);
    const tagsArr = editTags.tags.split(",").map((t) => t.trim()).filter(Boolean);
    await supabase
      .from("library_blocks")
      .update({ tags: tagsArr })
      .eq("id", editTags.id);
    setBlocks((prev) =>
      prev.map((x) => (x.id === editTags.id ? { ...x, tags: tagsArr } : x))
    );
    setSaving(false);
    setEditTags(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input-field flex-1 min-w-[180px]"
          placeholder="Search name, niche, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field w-36"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input-field w-40"
          value={quarFilter}
          onChange={(e) => setQuarFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="yes">Quarantined</option>
          <option value="no">Approved</option>
        </select>
        <button onClick={load} className="btn-secondary">
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["Name", "Type", "Niche", "Tags", "Usage", "Quarantine", "Actions"].map(
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  No blocks found
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr
                  key={b.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    b.is_quarantine ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {b.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {b.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.niche ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {b.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{b.usage_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleQuarantine(b)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.is_quarantine
                          ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                      }`}
                    >
                      {b.is_quarantine ? "Quarantined" : "Live"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setJsonPreview(b)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() =>
                          setEditTags({ id: b.id, tags: b.tags.join(", ") })
                        }
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                      >
                        Tags
                      </button>
                      <button
                        onClick={() => deleteBlock(b.id)}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* JSON Preview Modal */}
      {jsonPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              {jsonPreview.name} — seed_json
            </h3>
            <pre className="max-h-96 overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-green-400">
              {JSON.stringify(jsonPreview.seed_json, null, 2)}
            </pre>
            <button
              onClick={() => setJsonPreview(null)}
              className="btn-secondary mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Tags Modal */}
      {editTags && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-semibold dark:text-white">
              Edit Tags
            </h3>
            <input
              className="input-field w-full"
              value={editTags.tags}
              onChange={(e) =>
                setEditTags({ ...editTags, tags: e.target.value })
              }
              placeholder="tag1, tag2, tag3"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={saveTags}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditTags(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
