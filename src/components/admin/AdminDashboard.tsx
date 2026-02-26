"use client";

import React, { useState, Suspense, lazy } from "react";

const OverviewTab    = lazy(() => import("./tabs/OverviewTab"));
const UsersTab       = lazy(() => import("./tabs/UsersTab"));
const LibraryTab     = lazy(() => import("./tabs/LibraryTab"));
const LabTab         = lazy(() => import("./tabs/LabTab"));
const TemplatesTab   = lazy(() => import("./tabs/TemplatesTab"));
const PipelineLogTab = lazy(() => import("./tabs/PipelineLogTab"));
const PaymentsTab    = lazy(() => import("./tabs/PaymentsTab"));
const WisdomRulesTab = lazy(() => import("./tabs/WisdomRulesTab"));
const SupportTab     = lazy(() => import("./tabs/SupportTab"));
const DevLabTab      = lazy(() => import("./tabs/DevLabTab"));

const TABS = [
  { id: "overview",     label: "Overview",      icon: "📊" },
  { id: "users",        label: "Users",         icon: "👥" },
  { id: "library",      label: "Library",       icon: "📚" },
  { id: "lab",          label: "Lab",           icon: "⚗️" },
  { id: "templates",    label: "Templates",     icon: "🗂️" },
  { id: "pipeline",     label: "Pipeline Log",  icon: "🔄" },
  { id: "payments",     label: "Payments",      icon: "💳" },
  { id: "wisdom",       label: "Wisdom Rules",  icon: "🧠" },
  { id: "support",      label: "Support",       icon: "🎧" },
  { id: "devlab",       label: "Dev Lab",       icon: "🔬" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabFallback() {
  return (
    <div className="flex h-40 items-center justify-center text-gray-400">
      Loading…
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState<TabId>("overview");

  function renderTab() {
    switch (active) {
      case "overview":  return <OverviewTab />;
      case "users":     return <UsersTab />;
      case "library":   return <LibraryTab />;
      case "lab":       return <LabTab />;
      case "templates": return <TemplatesTab />;
      case "pipeline":  return <PipelineLogTab />;
      case "payments":  return <PaymentsTab />;
      case "wisdom":    return <WisdomRulesTab />;
      case "support":   return <SupportTab />;
      case "devlab":    return <DevLabTab />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Full system control — admin access only
          </p>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600 dark:bg-red-900/30 dark:text-red-400">
          Admin
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              active === tab.id
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <Suspense fallback={<TabFallback />}>
        {renderTab()}
      </Suspense>
    </div>
  );
}
