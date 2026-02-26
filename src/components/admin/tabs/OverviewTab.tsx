"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Stats {
  totalUsers: number;
  activeToday: number;
  creditsSold: number;
  pipelineSuccess: number;
  pipelineTotal: number;
}

interface WeekRevenue {
  week: string;
  revenue: number;
}

interface ZoneUsage {
  name: string;
  value: number;
}

const ZONE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

export default function OverviewTab() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeToday: 0,
    creditsSold: 0,
    pipelineSuccess: 0,
    pipelineTotal: 0,
  });
  const [weekRevenue, setWeekRevenue] = useState<WeekRevenue[]>([]);
  const [zoneUsage, setZoneUsage] = useState<ZoneUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Total users
        const { count: totalUsers } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true });

        // Active today (profiles updated today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: activeToday } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .gte("updated_at", todayStart.toISOString());

        // Credits sold (sum of credits_added from completed transactions)
        const { data: txData } = await supabase
          .from("transactions")
          .select("credits_added")
          .eq("status", "completed");
        const creditsSold = (txData ?? []).reduce(
          (acc, r) => acc + (r.credits_added ?? 0),
          0
        );

        // Pipeline success rate
        const { count: pipelineTotal } = await supabase
          .from("pipeline_runs")
          .select("*", { count: "exact", head: true });
        const { count: pipelineSuccess } = await supabase
          .from("pipeline_runs")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed");

        setStats({
          totalUsers: totalUsers ?? 0,
          activeToday: activeToday ?? 0,
          creditsSold,
          pipelineSuccess: pipelineSuccess ?? 0,
          pipelineTotal: pipelineTotal ?? 0,
        });

        // Weekly revenue (last 8 weeks)
        const { data: allTx } = await supabase
          .from("transactions")
          .select("amount_inr, created_at")
          .eq("status", "completed")
          .order("created_at", { ascending: true });

        const weekMap: Record<string, number> = {};
        (allTx ?? []).forEach((tx) => {
          const d = new Date(tx.created_at);
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          const key = weekStart.toISOString().split("T")[0];
          weekMap[key] = (weekMap[key] ?? 0) + Number(tx.amount_inr);
        });
        const revenueArr = Object.entries(weekMap)
          .slice(-8)
          .map(([week, revenue]) => ({ week: week.slice(5), revenue }));
        setWeekRevenue(revenueArr.length ? revenueArr : demoRevenue());

        // Zone usage
        const { data: zones } = await supabase
          .from("pipeline_runs")
          .select("zone_type");
        const zoneMap: Record<string, number> = {};
        (zones ?? []).forEach((r) => {
          zoneMap[r.zone_type] = (zoneMap[r.zone_type] ?? 0) + 1;
        });
        const zoneArr = Object.entries(zoneMap).map(([name, value]) => ({
          name,
          value,
        }));
        setZoneUsage(zoneArr.length ? zoneArr : demoZones());
      } catch (e) {
        console.error(e);
        setWeekRevenue(demoRevenue());
        setZoneUsage(demoZones());
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const successRate =
    stats.pipelineTotal > 0
      ? Math.round((stats.pipelineSuccess / stats.pipelineTotal) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Users", value: loading ? "…" : stats.totalUsers },
          { label: "Active Today", value: loading ? "…" : stats.activeToday },
          { label: "Credits Sold", value: loading ? "…" : stats.creditsSold },
          {
            label: "Pipeline Success",
            value: loading ? "…" : `${successRate}%`,
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {m.label}
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue bar chart */}
        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
            Weekly Revenue (₹)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zone donut */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
            Zone Usage
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={zoneUsage}
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {zoneUsage.map((_, i) => (
                  <Cell
                    key={i}
                    fill={ZONE_COLORS[i % ZONE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline success bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pipeline Success Rate
          </span>
          <span className="text-sm font-bold text-indigo-500">
            {successRate}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${successRate}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {stats.pipelineSuccess} / {stats.pipelineTotal} runs completed
        </p>
      </div>
    </div>
  );
}

function demoRevenue(): WeekRevenue[] {
  return [
    { week: "01-05", revenue: 4200 },
    { week: "01-12", revenue: 6800 },
    { week: "01-19", revenue: 5100 },
    { week: "01-26", revenue: 9200 },
    { week: "02-02", revenue: 7600 },
    { week: "02-09", revenue: 11000 },
    { week: "02-16", revenue: 8300 },
    { week: "02-23", revenue: 13500 },
  ];
}

function demoZones(): ZoneUsage[] {
  return [
    { name: "game", value: 40 },
    { name: "video", value: 25 },
    { name: "anime", value: 18 },
    { name: "website", value: 10 },
    { name: "saas", value: 7 },
  ];
}
