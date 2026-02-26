"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface WisdomRule {
  id: string;
  zone_type: string;
  rule_key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  severity: string;
  trigger_count: number;
  created_at: string;
}

const ZONES = ["game", "website", "video", "anime", "saas"];
const SEVERITIES = ["error", "warning"];

const EMPTY_FORM = {
  zone_type: "game",
  rule_key: "",
  label: "",
  description: "",
  severity: "error",
  enabled: true,
};

export default function WisdomRulesTab() {
  const supabase = createClient();
  const [rules, setRules] = useState<WisdomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wisdom_rules")
      .select("*")
      .order("zone_type")
      .order("rule_key");
    setRules((data as WisdomRule[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (r: WisdomRule) => {
    await supabase
      .from("wisdom_rules")
      .update({ enabled: !r.enabled })
      .eq("id", r.id);
    setRules((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x))
    );
  };

  const saveNew = async () => {
    setError("");
    if (!form.rule_key.trim() || !form.label.trim()) {
      setError("rule_key and label are required");
      return;
    }
    setSaving(true);
    const { error: dbErr } = await supabase.from("wisdom_rules").insert({
      zone_type: form.zone_type,
      rule_key: form.rule_key.trim(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      severity: form.severity,
      enabled: form.enabled,
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setShowForm(false);
    setForm(EMPTY_FORM);
    load();
  };

  const filtered =
    zoneFilter === "all"
      ? rules
      : rules.filter((r) => r.zone_type === zoneFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            Wisdom Rules
          </h2>
          <select
            className="input-field w-36"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="all">All zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add Rule
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["Zone", "Key", "Label", "Severity", "Triggers", "Enabled"].map(
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  No rules
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !r.enabled ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {r.zone_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {r.rule_key}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {r.label}
                      </p>
                      {r.description && (
                        <p className="text-xs text-gray-400">
                          {r.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.severity === "error"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {r.trigger_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleEnabled(r)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                        r.enabled ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          r.enabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add rule modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">
              New Wisdom Rule
            </h3>
            {error && (
              <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="space-y-3">
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
                className="input-field w-full"
                placeholder="rule_key (snake_case)"
                value={form.rule_key}
                onChange={(e) => setForm({ ...form, rule_key: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <select
                className="input-field w-full"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                Enabled
              </label>
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
    </div>
  );
}
