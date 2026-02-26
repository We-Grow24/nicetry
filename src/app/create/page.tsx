"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type QuestionType = "text" | "choice";

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  choices?: string[];
}

interface InterrogatorResult {
  questions: Question[];
  zone?: "game" | "builder" | string;
  summary?: string;
}

type Step = "prompt" | "loading-interrogator" | "questions" | "pipeline" | "error";

const PIPELINE_STAGES = [
  "Analyzing your idea…",
  "Architecting the experience…",
  "Wisdom Check…",
  "Loading Preview…",
];

const CREDITS_COST = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PaperclipIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Step state
  const [step, setStep] = useState<Step>("prompt");
  const [errorMsg, setErrorMsg] = useState("");

  // Prompt step
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Interrogator result
  const [interrogatorResult, setInterrogatorResult] =
    useState<InterrogatorResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Credits
  const [credits, setCredits] = useState<number | null>(null);

  // Pipeline
  const [pipelineStage, setPipelineStage] = useState(0);
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(null);

  // ── Load credits on mount ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchCredits() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("credits")
        .eq("id", user.id)
        .single();
      if (data) setCredits(data.credits);
    }
    fetchCredits();
  }, []);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  const handlePromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
    },
    []
  );

  // ── Attachments ──────────────────────────────────────────────────────────
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setAttachments((prev) => [
        ...prev,
        ...Array.from(e.target.files!),
      ]);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Think (call interrogator-agent) ─────────────────────────────────────
  async function handleThink() {
    if (!prompt.trim()) return;
    setStep("loading-interrogator");
    setErrorMsg("");

    try {
      const supabase = createClient();

      // Build the payload. File contents are included as base64 if present.
      const filePayloads = await Promise.all(
        attachments.map(async (f) => {
          const buf = await f.arrayBuffer();
          const b64 = btoa(
            String.fromCharCode(...new Uint8Array(buf))
          );
          return { name: f.name, type: f.type, data: b64 };
        })
      );

      const { data, error } = await supabase.functions.invoke<InterrogatorResult>(
        "interrogator-agent",
        {
          body: {
            prompt: prompt.trim(),
            attachments: filePayloads,
          },
        }
      );

      if (error) throw error;

      // Fallback questions if Edge Function not yet deployed
      const result: InterrogatorResult = data ?? {
        questions: [
          {
            id: "q1",
            text: "What genre or style best describes what you want to build?",
            type: "choice",
            choices: ["Game", "Interactive Story", "Dashboard", "Website", "Other"],
          },
          {
            id: "q2",
            text: "Who is the primary audience for this creation?",
            type: "choice",
            choices: ["Kids", "Teens", "Adults", "Professionals", "Everyone"],
          },
          {
            id: "q3",
            text: "Describe any specific features or mechanics you must have.",
            type: "text",
          },
        ],
        zone: "game",
      };

      setInterrogatorResult(result);
      // Pre-fill first choice for each choice question
      const defaultAnswers: Record<string, string> = {};
      result.questions.forEach((q) => {
        if (q.type === "choice" && q.choices?.[0]) {
          defaultAnswers[q.id] = q.choices[0];
        }
      });
      setAnswers(defaultAnswers);
      setStep("questions");
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
      setStep("error");
    }
  }

  // ── Build It ─────────────────────────────────────────────────────────────
  async function handleBuildIt() {
    setErrorMsg("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/signin");
      return;
    }

    // Re-fetch credits for safety
    const { data: userData } = await supabase
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .single();

    const currentCredits = userData?.credits ?? 0;

    if (currentCredits < CREDITS_COST) {
      setErrorMsg(
        `Not enough credits. You need ${CREDITS_COST} credits but only have ${currentCredits}.`
      );
      return;
    }

    setStep("pipeline");
    setPipelineStage(0);

    // Deduct credits via RPC
    const { error: rpcError } = await supabase.rpc("deduct_credits", {
      user_id: user.id,
      amount: CREDITS_COST,
    });
    if (rpcError) console.warn("deduct_credits RPC error:", rpcError.message);

    // Insert pipeline_run
    const { data: runData } = await supabase
      .from("pipeline_runs")
      .insert({
        user_id: user.id,
        prompt: prompt.trim(),
        answers,
        zone: interrogatorResult?.zone ?? "builder",
        status: "running",
      })
      .select("id")
      .single();
    if (runData?.id) setPipelineRunId(runData.id);

    // Animate pipeline stages
    for (let i = 1; i <= PIPELINE_STAGES.length; i++) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, i === PIPELINE_STAGES.length ? 1200 : 900)
      );
      setPipelineStage(i);
    }

    // Mark pipeline_run complete (best-effort)
    if (runData?.id) {
      await supabase
        .from("pipeline_runs")
        .update({ status: "complete" })
        .eq("id", runData.id);
    }

    // Redirect based on zone
    const zone = interrogatorResult?.zone ?? "builder";
    router.push(zone === "game" ? "/game" : "/builder");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Renders
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-indigo-300 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2 text-xs text-indigo-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z" />
          </svg>
          {credits !== null ? (
            <span className="font-semibold text-indigo-200">{credits} credits</span>
          ) : (
            <span className="w-12 h-3 bg-indigo-800 rounded animate-pulse" />
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {step === "prompt" && (
          <PromptStep
            prompt={prompt}
            attachments={attachments}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            onPromptChange={handlePromptChange}
            onFileChange={handleFileChange}
            onRemoveAttachment={removeAttachment}
            onThink={handleThink}
          />
        )}

        {step === "loading-interrogator" && <LoadingInterrogator />}

        {step === "questions" && interrogatorResult && (
          <QuestionsStep
            questions={interrogatorResult.questions}
            answers={answers}
            setAnswers={setAnswers}
            onBuildIt={handleBuildIt}
            creditsRequired={CREDITS_COST}
            creditsAvailable={credits ?? 0}
            errorMsg={errorMsg}
          />
        )}

        {step === "pipeline" && (
          <PipelineStep stage={pipelineStage} runId={pipelineRunId} />
        )}

        {step === "error" && (
          <ErrorStep
            message={errorMsg}
            onRetry={() => setStep("prompt")}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 – Prompt
// ─────────────────────────────────────────────────────────────────────────────
function PromptStep({
  prompt,
  attachments,
  textareaRef,
  fileInputRef,
  onPromptChange,
  onFileChange,
  onRemoveAttachment,
  onThink,
}: {
  prompt: string;
  attachments: File[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (i: number) => void;
  onThink: () => void;
}) {
  return (
    <div className="w-full max-w-3xl animate-fade-in">
      {/* Headline */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-6 uppercase tracking-widest">
          <SparkleIcon />
          AI Creator
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
          What will you{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            create
          </span>{" "}
          today?
        </h1>
        <p className="text-indigo-300/70 text-lg max-w-xl mx-auto">
          Describe your idea in plain English. Our AI will ask the right questions
          and build it for you.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-1 shadow-2xl">
        {/* Textarea */}
        <textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={prompt}
          onChange={onPromptChange}
          placeholder="e.g. A fast-paced dodge-and-collect arcade game with power-ups, leaderboard, and neon aesthetic…"
          rows={4}
          className="w-full bg-transparent text-white placeholder:text-indigo-300/40 text-base resize-none outline-none px-5 pt-5 pb-2 leading-relaxed"
          style={{ minHeight: 120, maxHeight: 320 }}
        />

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            {attachments.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-indigo-700/40 border border-indigo-600/40 rounded-lg px-2.5 py-1 text-xs text-indigo-200"
              >
                <PaperclipIcon />
                {f.name}
                <button
                  onClick={() => onRemoveAttachment(i)}
                  className="ml-1 text-indigo-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-white/10 mt-2">
          <div className="flex items-center gap-2">
            {/* Paperclip */}
            <input
              ref={fileInputRef as React.RefObject<HTMLInputElement>}
              type="file"
              multiple
              accept="image/*,.pdf,.svg"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-200 text-sm transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              title="Attach files (logo, references)"
            >
              <PaperclipIcon />
              <span className="hidden sm:inline text-xs">Attach</span>
            </button>
            <span className="text-white/20 text-xs hidden sm:inline">
              logo, references, images…
            </span>
          </div>

          {/* Think button */}
          <button
            onClick={onThink}
            disabled={!prompt.trim()}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200",
              prompt.trim()
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:shadow-indigo-700/50 hover:scale-105 active:scale-95"
                : "bg-indigo-900/40 text-indigo-500 cursor-not-allowed"
            )}
          >
            <SparkleIcon />
            Think
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-indigo-400/50 text-xs mt-6">
        Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">Think</kbd> to have AI analyze your idea and ask clarifying questions.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading – Interrogator
// ─────────────────────────────────────────────────────────────────────────────
function LoadingInterrogator() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      400
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      {/* Pulsing orb */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-indigo-600/30 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-indigo-600/50 animate-ping [animation-delay:0.2s]" />
        <div className="absolute inset-4 rounded-full bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-900">
          <SparkleIcon />
        </div>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white mb-2">
          AI is reading your prompt{dots}
        </p>
        <p className="text-indigo-300/70 text-sm">
          Formulating the perfect questions to understand your vision
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 – Questions
// ─────────────────────────────────────────────────────────────────────────────
function QuestionsStep({
  questions,
  answers,
  setAnswers,
  onBuildIt,
  creditsRequired,
  creditsAvailable,
  errorMsg,
}: {
  questions: Question[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBuildIt: () => void;
  creditsRequired: number;
  creditsAvailable: number;
  errorMsg: string;
}) {
  const hasEnough = creditsAvailable >= creditsRequired;
  const allAnswered = questions.every((q) => (answers[q.id] ?? "").trim() !== "");

  return (
    <div className="w-full max-w-2xl animate-fade-in">
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">
          A few quick questions
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Help us nail your vision
        </h2>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            index={idx + 1}
            question={q}
            answer={answers[q.id] ?? ""}
            onChange={(val) =>
              setAnswers((prev) => ({ ...prev, [q.id]: val }))
            }
          />
        ))}
      </div>

      {/* Credits notice */}
      <div className="mt-6 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
        <span className="text-sm text-indigo-300">
          This will use{" "}
          <span className="font-bold text-white">{creditsRequired} credits</span>
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            hasEnough ? "text-emerald-400" : "text-red-400"
          )}
        >
          You have {creditsAvailable} credits
        </span>
      </div>

      {errorMsg && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Build It */}
      <button
        onClick={onBuildIt}
        disabled={!allAnswered || !hasEnough}
        className={cn(
          "mt-6 w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-lg font-bold transition-all duration-200",
          allAnswered && hasEnough
            ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-2xl shadow-indigo-900/60 hover:scale-[1.02] active:scale-[0.98]"
            : "bg-white/5 text-white/30 cursor-not-allowed"
        )}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Build It
      </button>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  answer,
  onChange,
}: {
  index: number;
  question: Question;
  answer: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 transition-all hover:border-indigo-500/40">
      <div className="flex items-start gap-4">
        {/* Number badge */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium mb-4 leading-snug">{question.text}</p>

          {question.type === "text" ? (
            <textarea
              value={answer}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer…"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 resize-none outline-none focus:border-indigo-500 transition-colors"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {question.choices?.map((choice) => (
                <button
                  key={choice}
                  onClick={() => onChange(choice)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all duration-150",
                    answer === choice
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40"
                      : "bg-white/5 border-white/10 text-indigo-200 hover:bg-indigo-700/30 hover:border-indigo-600/40"
                  )}
                >
                  {answer === choice && <CheckIcon />}
                  {choice}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 – Pipeline
// ─────────────────────────────────────────────────────────────────────────────
function PipelineStep({
  stage,
  runId,
}: {
  stage: number;
  runId: string | null;
}) {
  return (
    <div className="w-full max-w-lg animate-fade-in flex flex-col items-center gap-10">
      {/* Central orb */}
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-spin [animation-duration:6s]" />
        <div className="absolute inset-3 rounded-full border-2 border-indigo-500/30 animate-spin [animation-duration:4s] [animation-direction:reverse]" />
        <div className="absolute inset-6 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-2xl shadow-indigo-900">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Stages */}
      <div className="w-full space-y-3">
        {PIPELINE_STAGES.map((label, i) => {
          const isDone = stage > i;
          const isActive = stage === i;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-4 rounded-xl px-5 py-3.5 border transition-all duration-500",
                isDone
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : isActive
                  ? "bg-indigo-600/20 border-indigo-500/40 shadow-lg shadow-indigo-900/30"
                  : "bg-white/3 border-white/5 opacity-40"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  isDone
                    ? "bg-emerald-500"
                    : isActive
                    ? "bg-indigo-500"
                    : "bg-white/10"
                )}
              >
                {isDone ? (
                  <CheckIcon />
                ) : isActive ? (
                  <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isDone
                    ? "text-emerald-300"
                    : isActive
                    ? "text-white"
                    : "text-white/30"
                )}
              >
                {label}
              </span>
              {isActive && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {runId && (
        <p className="text-xs text-indigo-500/60 font-mono">run/{runId}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error step
// ─────────────────────────────────────────────────────────────────────────────
function ErrorStep({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
        <p className="text-indigo-300/70 text-sm">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
