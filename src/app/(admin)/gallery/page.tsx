"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone = "game" | "website" | "video";

interface Template {
  id: string;
  name: string;
  preview_image: string | null;
  zone: Zone;
  niche: string;
  credits_cost: number;
  is_available: boolean;
  purchased_by: string | null;
  seed: Record<string, unknown> | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<Zone, { bg: string; text: string; label: string }> = {
  game:    { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Game" },
  website: { bg: "bg-sky-100 dark:bg-sky-900/30",      text: "text-sky-700 dark:text-sky-300",       label: "Website" },
  video:   { bg: "bg-rose-100 dark:bg-rose-900/30",    text: "text-rose-700 dark:text-rose-300",     label: "Video" },
};

const ZONE_GRADIENTS: Record<Zone, string> = {
  game:    "from-purple-500 via-indigo-600 to-blue-700",
  website: "from-sky-400 via-cyan-500 to-teal-600",
  video:   "from-rose-500 via-pink-600 to-fuchsia-700",
};

const ZONE_OPTIONS: { value: Zone | "all"; label: string }[] = [
  { value: "all",     label: "All Zones" },
  { value: "game",    label: "Game" },
  { value: "website", label: "Website" },
  { value: "video",   label: "Video" },
];

const SORT_OPTIONS = [
  { value: "newest",       label: "Newest" },
  { value: "oldest",       label: "Oldest" },
  { value: "price_asc",    label: "Price ↑" },
  { value: "price_desc",   label: "Price ↓" },
];

const PER_PAGE = 12;

// ─── Particle sparks for fire effect ─────────────────────────────────────────

function Spark({ delay }: { delay: number }) {
  const x = (Math.random() - 0.5) * 120;
  const y = -(40 + Math.random() * 80);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 6 + Math.random() * 6,
        height: 6 + Math.random() * 6,
        background: `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 20}%)`,
        bottom: "30%",
        left: "50%",
      }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x, y, scale: 0 }}
      transition={{ duration: 0.8 + Math.random() * 0.4, delay, ease: "easeOut" }}
    />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  text: string;
  type: "success" | "error";
}

function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
        msg.type === "success" ? "bg-indigo-600" : "bg-red-600"
      }`}
    >
      {msg.type === "success" ? (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {msg.text}
    </motion.div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

interface CardProps {
  template: Template;
  onClaim: (id: string) => void;
  isBurning: boolean;
  isClaimed: boolean;
}

function TemplateCard({ template, onClaim, isBurning, isClaimed }: CardProps) {
  const { zone, niche, preview_image, name, credits_cost } = template;
  const zoneStyle = ZONE_COLORS[zone];
  const sparks = Array.from({ length: 16 }, (_, i) => i);

  return (
    <AnimatePresence>
      {!isClaimed && (
        <motion.div
          layout
          key={template.id}
          initial={{ opacity: 0, scale: 0.93 }}
          animate={
            isBurning
              ? { scale: [1, 1.04, 0.85, 0.6, 0.1], opacity: [1, 1, 0.8, 0.4, 0], rotate: [0, -2, 3, -5, 0] }
              : { opacity: 1, scale: 1 }
          }
          exit={{ opacity: 0, scale: 0 }}
          transition={isBurning ? { duration: 0.85, ease: "easeIn" } : { duration: 0.35 }}
          className="relative rounded-2xl overflow-visible bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700"
        >
          {/* Fire overlay */}
          {isBurning && (
            <div className="absolute inset-0 z-20 pointer-events-none overflow-visible flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ background: "rgba(255,100,0,0)" }}
                animate={{ background: ["rgba(255,100,0,0)", "rgba(255,60,0,0.45)", "rgba(255,30,0,0.8)"] }}
                transition={{ duration: 0.7 }}
              />
              {sparks.map((i) => (
                <Spark key={i} delay={i * 0.04} />
              ))}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{ background: "radial-gradient(circle at 50% 60%, #ff6a00cc, #ee0979bb)" }}
              />
            </div>
          )}

          {/* Preview image / gradient placeholder */}
          <div className={`relative h-40 w-full bg-gradient-to-br ${ZONE_GRADIENTS[zone]} overflow-hidden`}>
            {preview_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview_image} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-60">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 4.5h16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V5.25a.75.75 0 01.75-.75z" />
                </svg>
                <span className="text-white text-xs font-medium">Preview</span>
              </div>
            )}
            {/* Zone badge */}
            <span className={`absolute top-2.5 left-2.5 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm
              bg-white/20 text-white border border-white/30`}>
              {ZONE_COLORS[zone].label}
            </span>
          </div>

          {/* Card body */}
          <div className="p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white truncate">{name}</h3>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${zoneStyle.bg} ${zoneStyle.text}`}>
                {niche}
              </span>
              <span className="flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07a7.007 7.007 0 01-5.93-5.93H6v-2h1.07A7.008 7.008 0 0112 5.07V4h2v1.07A7.007 7.007 0 0119.93 9H18v2h1.07A7.007 7.007 0 0113 16.93zM12 9a3 3 0 100 6 3 3 0 000-6z"/>
                </svg>
                {credits_cost}
              </span>
            </div>

            <button
              onClick={() => onClaim(template.id)}
              disabled={isBurning}
              className="mt-2 w-full py-2 px-4 rounded-xl text-sm font-semibold text-white
                bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60
                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isBurning ? "Claiming..." : "Claim Template"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4">
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, -3, 3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg className="w-20 h-20 text-indigo-300 dark:text-indigo-700" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.2.085a3 3 0 012.143 2.817v1.094M21 18.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25z" />
        </svg>
      </motion.div>
      <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
        🧪 Lab is brewing new templates...
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Check back soon — fresh templates are being forged.
      </p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="h-40 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="flex justify-between">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
        </div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [allNiches, setAllNiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [zone, setZone] = useState<Zone | "all">("all");
  const [niche, setNiche] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Interaction state
  const [burningId, setBurningId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [toastCounter, setToastCounter] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  const addToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastCounter((c) => {
      const id = c + 1;
      setToasts((prev) => [...prev, { id, text, type }]);
      return id;
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Init user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase.auth]);

  // Fetch niches (once)
  useEffect(() => {
    supabase
      .from("templates")
      .select("niche")
      .eq("is_available", true)
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map((d) => d.niche as string).filter(Boolean)));
          setAllNiches(unique.sort());
        }
      });
  }, [supabase]);

  // Fetch user credits
  const fetchCredits = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    if (data) setUserCredits(data.credits ?? null);
  }, [supabase, userId]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PER_PAGE;
    const to = from + PER_PAGE - 1;

    let query = supabase
      .from("templates")
      .select("*", { count: "exact" })
      .eq("is_available", true)
      .range(from, to);

    if (zone !== "all") query = query.eq("zone", zone);
    if (niche !== "all") query = query.eq("niche", niche);

    if (sort === "newest")     query = query.order("created_at", { ascending: false });
    else if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (sort === "price_asc")  query = query.order("credits_cost", { ascending: true });
    else if (sort === "price_desc") query = query.order("credits_cost", { ascending: false });

    const { data, count, error } = await query;

    if (!error && data) {
      setTemplates(data as Template[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [supabase, zone, niche, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [zone, niche, sort]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Claim handler
  const handleClaim = useCallback(async (templateId: string) => {
    if (!userId) {
      addToast("Sign in to claim templates.", "error");
      return;
    }
    if (burningId) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setBurningId(templateId);

    // Brief animation window
    await new Promise((r) => setTimeout(r, 900));

    // 1. Deduct credits via RPC
    const { error: rpcError } = await supabase.rpc("deduct_credits", {
      user_id: userId,
      amount: template.credits_cost,
    });

    if (rpcError) {
      setBurningId(null);
      addToast(rpcError.message ?? "Not enough credits.", "error");
      return;
    }

    // 2. Mark template as claimed
    const { error: updateError } = await supabase
      .from("templates")
      .update({ is_available: false, purchased_by: userId })
      .eq("id", templateId);

    if (updateError) {
      setBurningId(null);
      addToast("Claim failed — please retry.", "error");
      return;
    }

    // 3. Animate out then redirect
    setClaimedIds((prev) => new Set([...prev, templateId]));
    setBurningId(null);
    addToast("Template claimed! Opening editor...", "success");
    await fetchCredits();

    // Determine builder route
    const builderPath =
      template.zone === "game"
        ? `/game?seed=${encodeURIComponent(JSON.stringify(template.seed ?? {}))}`
        : template.zone === "video"
        ? `/video?seed=${encodeURIComponent(JSON.stringify(template.seed ?? {}))}`
        : `/builder?seed=${encodeURIComponent(JSON.stringify(template.seed ?? {}))}`;

    setTimeout(() => router.push(builderPath), 800);
  }, [userId, burningId, templates, supabase, addToast, fetchCredits, router]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Template Gallery</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Choose a template, spend credits, and launch your project instantly.
            </p>
          </div>
          {userCredits !== null && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07a7.007 7.007 0 01-5.93-5.93H6v-2h1.07A7.008 7.008 0 0112 5.07V4h2v1.07A7.007 7.007 0 0119.93 9H18v2h1.07A7.007 7.007 0 0113 16.93zM12 9a3 3 0 100 6 3 3 0 000-6z"/>
              </svg>
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {userCredits.toLocaleString()} credits
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
      <div className="flex gap-3 sm:flex-wrap min-w-max sm:min-w-0 pb-2 sm:pb-0">
        {/* Zone filter */}
        <div className="relative">
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value as Zone | "all")}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {ZONE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Niche filter */}
        <div className="relative">
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Niches</option>
            {allNiches.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Active filter pills */}
        {zone !== "all" && (
          <button
            onClick={() => setZone("all")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl
              bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300
              hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
          >
            {ZONE_COLORS[zone].label}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {niche !== "all" && (
          <button
            onClick={() => setNiche("all")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl
              bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300
              hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
          >
            {niche}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Result count */}
        {!loading && (
          <span className="hidden sm:inline ml-auto text-sm text-gray-400 dark:text-gray-500 self-center">
            {total} template{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      </div>
      {/* Result count — mobile */}
      {!loading && (
        <div className="flex sm:hidden justify-end mb-2 text-sm text-gray-400 dark:text-gray-500">
          {total} template{total !== 1 ? "s" : ""}
        </div>
      )}

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: PER_PAGE }, (_, i) => <CardSkeleton key={i} />)
          : templates.length === 0
          ? <EmptyState />
          : templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onClaim={handleClaim}
                isBurning={burningId === t.id}
                isClaimed={claimedIds.has(t.id)}
              />
            ))
        }
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            ← Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-10 h-10 text-sm font-semibold rounded-xl transition-colors ${
                    page === p
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Toast container ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast msg={t} onDone={() => removeToast(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
