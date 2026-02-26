"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface UserRow {
  id: string;
  email: string;
  credits: number;
  role: string;
  project_count: number;
  created_at: string;
}

const ROLES = ["creator", "moderator", "admin"];

export default function UsersTab() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [creditModal, setCreditModal] = useState<{
    userId: string;
    email: string;
    current: number;
  } | null>(null);
  const [creditDelta, setCreditDelta] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profiles joined with auth.users email via a view or RPC
      // Using user_profiles + a separate count of projects
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, credits, role, created_at")
        .order("created_at", { ascending: false });

      if (!profiles) return;

      // Fetch project counts
      const { data: projectCounts } = await supabase
        .from("projects")
        .select("user_id");

      const countMap: Record<string, number> = {};
      (projectCounts ?? []).forEach((p) => {
        countMap[p.user_id] = (countMap[p.user_id] ?? 0) + 1;
      });

      // We can't read auth.users directly from client; use email from supabase admin
      // Fallback: show id prefix as email placeholder
      const rows: UserRow[] = profiles.map((p) => ({
        id: p.id,
        email: `${p.id.slice(0, 8)}…`,
        credits: p.credits,
        role: p.role ?? "creator",
        project_count: countMap[p.id] ?? 0,
        created_at: p.created_at,
      }));

      setUsers(rows);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase
      .from("user_profiles")
      .update({ role: newRole })
      .eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const handleCreditEdit = async () => {
    if (!creditModal) return;
    const delta = parseInt(creditDelta, 10);
    if (isNaN(delta)) return;
    setSaving(true);
    const newCredits = Math.max(0, creditModal.current + delta);
    await supabase
      .from("user_profiles")
      .update({ credits: newCredits })
      .eq("id", creditModal.userId);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === creditModal.userId ? { ...u, credits: newCredits } : u
      )
    );
    setSaving(false);
    setCreditModal(null);
    setCreditDelta("");
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Search by email or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field w-40"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="btn-secondary"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["Email / ID", "Credits", "Role", "Projects", "Joined", "Actions"].map(
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
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {u.credits}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded border border-gray-200 bg-transparent px-2 py-1 text-xs dark:border-gray-600"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">{u.project_count}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCreditModal({
                            userId: u.id,
                            email: u.email,
                            current: u.credits,
                          })
                        }
                        className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300"
                      >
                        Edit Credits
                      </button>
                      <a
                        href={`/admin/users/${u.id}/projects`}
                        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      >
                        Projects
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Credit edit modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Edit Credits
            </h3>
            <p className="mb-1 text-sm text-gray-500">
              User: <span className="font-mono">{creditModal.email}</span>
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Current credits:{" "}
              <span className="font-bold text-indigo-500">
                {creditModal.current}
              </span>
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Add / Subtract (e.g. +50 or -20)
            </label>
            <input
              type="number"
              className="input-field w-full"
              placeholder="e.g. 100"
              value={creditDelta}
              onChange={(e) => setCreditDelta(e.target.value)}
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCreditEdit}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "Saving…" : "Apply"}
              </button>
              <button
                onClick={() => {
                  setCreditModal(null);
                  setCreditDelta("");
                }}
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
