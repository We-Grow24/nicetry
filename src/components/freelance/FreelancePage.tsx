"use client";
import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type ZoneFilter = "all" | "game" | "website" | "anime" | "saas" | "video" | "other";

interface Job {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  zone_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  is_open: boolean;
  application_count: number;
  created_at: string;
}

interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  message: string;
  status: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ZONES: { label: string; value: ZoneFilter }[] = [
  { label: "All", value: "all" },
  { label: "Game", value: "game" },
  { label: "Website", value: "website" },
  { label: "Anime", value: "anime" },
  { label: "SaaS", value: "saas" },
  { label: "Video", value: "video" },
  { label: "Other", value: "other" },
];

const ZONE_BADGE: Record<string, string> = {
  game:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  website: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  anime:   "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  saas:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  video:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  other:   "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

// ─── Post Job Modal ───────────────────────────────────────────────────────────
function PostJobModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState("game");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) { setError("Title and description are required."); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in."); setLoading(false); return; }

    const { error: err } = await supabase.from("jobs").insert({
      poster_id: user.id,
      title: title.trim(),
      description: description.trim(),
      zone_type: zone,
      budget_min: budgetMin ? parseInt(budgetMin) : null,
      budget_max: budgetMax ? parseInt(budgetMax) : null,
      budget_currency: currency,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onPosted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Post a Job</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zone / Category</label>
            <select value={zone} onChange={e => setZone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="game">Game</option>
              <option value="website">Website</option>
              <option value="anime">Anime</option>
              <option value="saas">SaaS</option>
              <option value="video">Video</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unity Developer for 2D Platformer"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Describe the project, skills needed, timeline…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Budget</label>
              <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="500"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Budget</label>
              <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="2000"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option>USD</option>
                <option>INR</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2.5 text-sm transition-colors">
            {loading ? "Posting…" : "Post Job"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────
function ApplyModal({ job, onClose, onApplied }: { job: Job; onClose: () => void; onApplied: () => void }) {
  const supabase = createClient();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!message.trim()) { setError("Please write a message to the job poster."); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in."); setLoading(false); return; }

    const { error: err } = await supabase.from("job_applications").insert({
      job_id: job.id,
      applicant_id: user.id,
      message: message.trim(),
    });
    setLoading(false);
    if (err) {
      if (err.code === "23505") {
        setError("You have already applied to this job.");
      } else {
        setError(err.message);
      }
      return;
    }
    setSuccess(true);
    onApplied();
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Apply to Job</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-5">
          <p className="font-medium text-gray-900 dark:text-white text-sm">{job.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{job.description}</p>
        </div>
        {success ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Application submitted!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                placeholder="Introduce yourself, explain your experience, and why you're the right fit…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2.5 text-sm transition-colors">
              {loading ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── My Applications Dashboard Panel ─────────────────────────────────────────
function MyApplicationsPanel({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();
  const [apps, setApps] = useState<(Application & { job?: Job })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      const { data: appData } = await supabase
        .from("job_applications")
        .select("*")
        .eq("applicant_id", currentUserId)
        .order("created_at", { ascending: false });
      if (!appData) { setLoading(false); return; }

      const jobIds = [...new Set(appData.map(a => a.job_id))];
      const { data: jobData } = await supabase.from("jobs").select("*").in("id", jobIds);
      const jobMap = Object.fromEntries((jobData ?? []).map(j => [j.id, j]));
      setApps(appData.map(a => ({ ...a, job: jobMap[a.job_id] })));
      setLoading(false);
    };
    fetchApps();

    const ch = supabase.channel("my-applications")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "job_applications", filter: `applicant_id=eq.${currentUserId}` }, fetchApps)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentUserId, supabase]);

  const STATUS_COLORS: Record<string, string> = {
    pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    accepted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  if (loading) return <div className="animate-pulse h-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />;
  if (apps.length === 0) return <p className="text-sm text-gray-400 text-center py-6">You haven&apos;t applied to any jobs yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      {apps.map(a => (
        <div key={a.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.job?.title ?? a.job_id}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.message}</p>
          </div>
          <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status] ?? ""}`}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, currentUserId, isOwner }: { job: Job; currentUserId: string | null; isOwner: boolean }) {
  const supabase = createClient();
  const [showApply, setShowApply] = useState(false);
  const [showApplicants, setShowApplicants] = useState(false);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [appCount, setAppCount] = useState(job.application_count);
  const [appliedAlready, setAppliedAlready] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("job_applications").select("job_id").eq("job_id", job.id).eq("applicant_id", currentUserId).single()
      .then(({ data }) => setAppliedAlready(!!data));
  }, [job.id, currentUserId, supabase]);

  // Realtime app count
  useEffect(() => {
    const ch = supabase.channel(`job-card:${job.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${job.id}` },
        payload => setAppCount((payload.new as Job).application_count))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [job.id, supabase]);

  const loadApplicants = useCallback(async () => {
    const { data } = await supabase.from("job_applications").select("*").eq("job_id", job.id).order("created_at");
    setApplicants(data ?? []);
  }, [job.id, supabase]);

  const updateStatus = async (appId: string, status: string) => {
    await supabase.from("job_applications").update({ status }).eq("id", appId);
    loadApplicants();
  };

  const budget = job.budget_min && job.budget_max
    ? `${job.budget_currency} ${job.budget_min.toLocaleString()} – ${job.budget_max.toLocaleString()}`
    : job.budget_min
    ? `From ${job.budget_currency} ${job.budget_min.toLocaleString()}`
    : job.budget_max
    ? `Up to ${job.budget_currency} ${job.budget_max.toLocaleString()}`
    : "Budget: Negotiable";

  const ago = new Date(job.created_at).toLocaleDateString();
  const badgeClass = job.zone_type ? ZONE_BADGE[job.zone_type] ?? ZONE_BADGE.other : ZONE_BADGE.other;

  return (
    <>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">{job.title}</h3>
          {job.zone_type && (
            <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${badgeClass}`}>
              {job.zone_type}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{job.description}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {budget}
          </span>
          <span>{ago}</span>
          <span>{appCount} applicant{appCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-2 pt-1">
          {isOwner ? (
            <button
              onClick={() => { loadApplicants(); setShowApplicants(o => !o); }}
              className="flex-1 rounded-lg border border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 px-4 py-2 text-sm font-medium transition-colors"
            >
              {showApplicants ? "Hide" : "View"} Applicants ({appCount})
            </button>
          ) : (
            <button
              onClick={() => setShowApply(true)}
              disabled={!job.is_open || appliedAlready}
              className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              {appliedAlready ? "Applied" : job.is_open ? "Apply" : "Closed"}
            </button>
          )}
        </div>

        {/* Owner: applicants list */}
        {showApplicants && isOwner && (
          <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
            {applicants.length === 0 ? (
              <p className="text-xs text-gray-400">No applications yet.</p>
            ) : applicants.map(a => (
              <div key={a.id} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Applicant #{a.applicant_id.slice(0, 8)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === "accepted" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : a.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{a.message}</p>
                {a.status === "pending" && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => updateStatus(a.id, "accepted")}
                      className="text-xs rounded-lg bg-green-500 hover:bg-green-600 text-white px-3 py-1 transition-colors">Accept</button>
                    <button onClick={() => updateStatus(a.id, "rejected")}
                      className="text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white px-3 py-1 transition-colors">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showApply && <ApplyModal job={job} onClose={() => setShowApply(false)} onApplied={() => setAppliedAlready(true)} />}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FreelancePage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [budgetMax, setBudgetMax] = useState("");
  const [showPostJob, setShowPostJob] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"listings" | "my-applications">("listings");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [supabase]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("jobs").select("*").eq("is_open", true).order("created_at", { ascending: false });
    if (zoneFilter !== "all") q = q.eq("zone_type", zoneFilter);
    if (budgetMax) q = q.lte("budget_min", parseInt(budgetMax));
    const { data } = await q;
    setJobs(data ?? []);
    setLoading(false);
  }, [zoneFilter, budgetMax, supabase]);

  useEffect(() => {
    fetchJobs();
    const ch = supabase.channel("jobs_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, fetchJobs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchJobs, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Freelance Jobs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Find work or hire for your next project</p>
        </div>
        <button
          onClick={() => setShowPostJob(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 text-sm font-medium transition-colors shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post a Job
        </button>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto mb-5 flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {([["listings", "Job Listings"], ["my-applications", "My Applications"]] as [string, string][]).map(([val, label]) => (
          <button key={val} onClick={() => setActiveTab(val as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === val ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "my-applications" ? (
        <div className="max-w-5xl mx-auto">
          {currentUserId ? <MyApplicationsPanel currentUserId={currentUserId} /> : (
            <p className="text-sm text-gray-400 text-center py-8">Sign in to see your applications.</p>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="max-w-5xl mx-auto mb-5 flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5 flex-wrap">
              {ZONES.map(z => (
                <button key={z.value} onClick={() => setZoneFilter(z.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${zoneFilter === z.value ? "bg-brand-500 text-white border-brand-500" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400"}`}>
                  {z.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Max Budget</label>
              <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="Any"
                className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* Grid */}
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 h-48" />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No open jobs match your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map(j => (
                  <JobCard key={j.id} job={j} currentUserId={currentUserId} isOwner={currentUserId === j.poster_id} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showPostJob && <PostJobModal onClose={() => setShowPostJob(false)} onPosted={fetchJobs} />}
    </div>
  );
}
