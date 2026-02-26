"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Tx {
  id: string;
  user_id: string;
  amount_inr: number;
  credits_added: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function PaymentsTab() {
  const supabase = createClient();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chartData, setChartData] = useState<{ label: string; revenue: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    const rows = (data as Tx[]) ?? [];
    setTxs(rows);

    // Build chart data
    const completed = rows.filter((t) => t.status === "completed");
    const buckets: Record<string, number> = {};
    completed.forEach((t) => {
      const d = new Date(t.created_at);
      let key: string;
      if (period === "day") {
        key = d.toISOString().slice(0, 10);
      } else if (period === "week") {
        const ws = new Date(d);
        ws.setDate(d.getDate() - d.getDay());
        key = ws.toISOString().slice(5, 10);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      buckets[key] = (buckets[key] ?? 0) + Number(t.amount_inr);
    });
    setChartData(
      Object.entries(buckets)
        .slice(-12)
        .map(([label, revenue]) => ({ label, revenue }))
    );

    setLoading(false);
  }, [supabase, statusFilter, period]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = txs
    .filter((t) => t.status === "completed")
    .reduce((acc, t) => acc + Number(t.amount_inr), 0);
  const pending = txs.filter((t) => t.status === "pending").length;
  const failed = txs.filter((t) => t.status === "failed").length;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Revenue (₹)", value: `₹${totalRevenue.toLocaleString()}` },
          { label: "Pending", value: pending },
          { label: "Failed", value: failed },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">
            Revenue Chart
          </h3>
          <div className="flex gap-2">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  period === p
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="flex items-center gap-3">
        <select
          className="input-field w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={load} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["User", "Amount", "Credits", "Razorpay ID", "Status", "Date"].map(
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
            ) : txs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  No transactions
                </td>
              </tr>
            ) : (
              txs.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {t.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                    ₹{t.amount_inr}
                  </td>
                  <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">
                    +{t.credits_added}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {t.razorpay_payment_id ?? t.razorpay_order_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[t.status] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
