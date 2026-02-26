"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  in_progress:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  closed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function SupportTab() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async (close: boolean) => {
    if (!selected) return;
    setSaving(true);
    await supabase
      .from("support_tickets")
      .update({
        admin_reply: reply,
        replied_at: new Date().toISOString(),
        status: close ? "closed" : "in_progress",
      })
      .eq("id", selected.id);
    setSaving(false);
    setSelected(null);
    setReply("");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
          Support Tickets
        </h2>
        <select
          className="input-field w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        <button onClick={load} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["User", "Subject", "Status", "Submitted", "Actions"].map(
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
                <td colSpan={5} className="py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">
                  No tickets
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {t.user_id.slice(0, 8)}…
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {t.subject}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelected(t);
                        setReply(t.admin_reply ?? "");
                      }}
                      className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300"
                    >
                      Reply
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reply modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-1 text-lg font-semibold dark:text-white">
              {selected.subject}
            </h3>
            <p className="mb-1 text-xs text-gray-400 font-mono">
              User: {selected.user_id}
            </p>
            <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {selected.body}
            </div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin Reply
            </label>
            <textarea
              rows={4}
              className="input-field w-full"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply…"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => sendReply(false)}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "…" : "Reply & Keep Open"}
              </button>
              <button
                onClick={() => sendReply(true)}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
              >
                Reply & Close
              </button>
              <button
                onClick={() => { setSelected(null); setReply(""); }}
                className="btn-secondary"
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
