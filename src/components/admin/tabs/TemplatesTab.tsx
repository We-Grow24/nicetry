"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface Template {
  id: string;
  name: string;
  zone_type: string;
  price_credits: number;
  seed_json: Record<string, unknown>;
  is_available: boolean;
  sold_count: number;
  preview_url: string | null;
  created_at: string;
}

const ZONES = ["game", "website", "video", "anime", "saas"];
const EMPTY_FORM = {
  name: "",
  zone_type: "game",
  price_credits: 0,
  seed_json: "{}",
  is_available: true,
  preview_url: "",
};

export default function TemplatesTab() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editPrice, setEditPrice] = useState<{
    id: string;
    price: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const saveNew = async () => {
    setError("");
    let seedParsed: Record<string, unknown>;
    try {
      seedParsed = JSON.parse(form.seed_json);
    } catch {
      setError("seed_json is not valid JSON");
      return;
    }
    setSaving(true);
    const { error: dbErr } = await supabase.from("templates").insert({
      name: form.name,
      zone_type: form.zone_type,
      price_credits: form.price_credits,
      seed_json: seedParsed,
      is_available: form.is_available,
      preview_url: form.preview_url || null,
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setShowForm(false);
    setForm(EMPTY_FORM);
    load();
  };

  const savePrice = async () => {
    if (!editPrice) return;
    setSaving(true);
    await supabase
      .from("templates")
      .update({ price_credits: parseInt(editPrice.price, 10) || 0 })
      .eq("id", editPrice.id);
    setSaving(false);
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editPrice.id
          ? { ...t, price_credits: parseInt(editPrice.price, 10) || 0 }
          : t
      )
    );
    setEditPrice(null);
  };

  const markAvailable = async (id: string) => {
    await supabase
      .from("templates")
      .update({ is_available: true })
      .eq("id", id);
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_available: true } : t))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
          Templates
        </h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add Template
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["Name", "Zone", "Price", "Available", "Sold", "Actions"].map(
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
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  No templates yet
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {t.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {t.zone_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">
                    ⭐ {t.price_credits}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_available
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {t.is_available ? "Live" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{t.sold_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditPrice({
                            id: t.id,
                            price: String(t.price_credits),
                          })
                        }
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                      >
                        Price
                      </button>
                      {!t.is_available && (
                        <button
                          onClick={() => markAvailable(t.id)}
                          className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        >
                          Re-activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add template modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">
              New Template
            </h3>
            {error && (
              <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="space-y-3">
              <input
                className="input-field w-full"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <select
                className="input-field w-full"
                value={form.zone_type}
                onChange={(e) => setForm({ ...form, zone_type: e.target.value })}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input-field w-full"
                placeholder="Price (credits)"
                value={form.price_credits}
                onChange={(e) =>
                  setForm({ ...form, price_credits: Number(e.target.value) })
                }
              />
              <textarea
                className="input-field w-full font-mono text-xs"
                rows={5}
                placeholder='seed_json (valid JSON) e.g. {"track": "hero"}'
                value={form.seed_json}
                onChange={(e) => setForm({ ...form, seed_json: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Preview URL (optional)"
                value={form.preview_url}
                onChange={(e) =>
                  setForm({ ...form, preview_url: e.target.value })
                }
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={saveNew}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "Saving…" : "Create"}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(""); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit price modal */}
      {editPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-3 font-semibold dark:text-white">Edit Price</h3>
            <input
              type="number"
              className="input-field w-full"
              value={editPrice.price}
              onChange={(e) => setEditPrice({ ...editPrice, price: e.target.value })}
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={savePrice}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "…" : "Save"}
              </button>
              <button
                onClick={() => setEditPrice(null)}
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
