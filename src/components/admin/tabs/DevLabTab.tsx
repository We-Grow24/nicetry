"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  updated_at: string;
}

export default function DevLabTab() {
  const supabase = createClient();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", label: "", description: "" });
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feature_flags")
      .select("*")
      .order("label");
    setFlags((data as FeatureFlag[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (f: FeatureFlag) => {
    await supabase
      .from("feature_flags")
      .update({ enabled: !f.enabled })
      .eq("id", f.id);
    setFlags((prev) =>
      prev.map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x))
    );
  };

  const addFlag = async () => {
    if (!newFlag.key.trim() || !newFlag.label.trim()) return;
    setSaving(true);
    await supabase.from("feature_flags").insert({
      key: newFlag.key.trim(),
      label: newFlag.label.trim(),
      description: newFlag.description.trim() || null,
      enabled: false,
    });
    setSaving(false);
    setShowFlagForm(false);
    setNewFlag({ key: "", label: "", description: "" });
    load();
  };

  const pushAnnouncement = async () => {
    if (!announcement.trim()) return;
    // Store in feature_flags as a special "announcement" key for demo.
    // In production this would write to a notifications or announcements table.
    setSaving(true);
    await supabase.from("feature_flags").upsert({
      key: "latest_announcement",
      label: "Latest Announcement",
      description: announcement.trim(),
      enabled: true,
    }, { onConflict: "key" });
    setSaving(false);
    setAnnouncementSent(true);
    setTimeout(() => setAnnouncementSent(false), 3000);
    setAnnouncement("");
  };

  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            🔬 Feature Flags
          </h2>
          <button onClick={() => setShowFlagForm(true)} className="btn-primary text-sm">
            + New Flag
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flags.map((f) => (
              <div
                key={f.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  f.enabled
                    ? "border-indigo-200 bg-indigo-50 dark:border-indigo-700/40 dark:bg-indigo-900/10"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {f.label}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">
                    {f.key}
                  </p>
                  {f.description && (
                    <p className="mt-1 text-xs text-gray-500">{f.description}</p>
                  )}
                </div>
                <button
                  onClick={() => toggle(f)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    f.enabled
                      ? "bg-indigo-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      f.enabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcements */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
          📢 Push Announcement
        </h3>
        <textarea
          rows={3}
          className="input-field w-full"
          placeholder="Write your announcement for all users…"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={pushAnnouncement}
            disabled={saving || !announcement.trim()}
            className="btn-primary"
          >
            {saving ? "Sending…" : "Push Announcement"}
          </button>
          {announcementSent && (
            <span className="text-sm text-green-500">
              ✅ Announcement pushed!
            </span>
          )}
        </div>
      </div>

      {/* Landing page sections hint */}
      <div className="rounded-2xl border border-dashed border-gray-300 p-5 dark:border-gray-600">
        <h3 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
          🎨 Landing Page Editor
        </h3>
        <p className="text-sm text-gray-400">
          GrapesJS-powered landing page editor — coming soon. Edit hero text,
          CTA buttons, and section order without a deploy.
        </p>
      </div>

      {/* New flag modal */}
      {showFlagForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-3 font-semibold dark:text-white">New Feature Flag</h3>
            <div className="space-y-3">
              <input
                className="input-field w-full"
                placeholder="Key (snake_case)"
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Label"
                value={newFlag.label}
                onChange={(e) => setNewFlag({ ...newFlag, label: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Description (optional)"
                value={newFlag.description}
                onChange={(e) =>
                  setNewFlag({ ...newFlag, description: e.target.value })
                }
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={addFlag} disabled={saving} className="btn-primary flex-1">
                {saving ? "…" : "Create"}
              </button>
              <button
                onClick={() => setShowFlagForm(false)}
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
