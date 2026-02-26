"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pack {
  id: "starter" | "creator" | "pro";
  name: string;
  credits: number;
  price: number;      // INR
  label: string;      // price label
  highlight: boolean;
  badge?: string;
  perks: string[];
  color: string;      // tailwind gradient
  btnClass: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

// ─── Pack definitions ─────────────────────────────────────────────────────────

const PACKS: Pack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 200,
    price: 199,
    label: "₹199",
    highlight: false,
    perks: [
      "2 full game builds",
      "~4 anime episodes",
      "10 SaaS prototypes",
      "Basic AI assistance",
    ],
    color: "from-slate-800 to-slate-900",
    btnClass:
      "bg-white/10 hover:bg-white/20 border border-white/20 text-white",
  },
  {
    id: "creator",
    name: "Creator",
    credits: 600,
    price: 499,
    label: "₹499",
    highlight: true,
    badge: "Most Popular",
    perks: [
      "6 full game builds",
      "~12 anime episodes",
      "30 SaaS prototypes",
      "Priority AI queue",
      "3× value vs Starter",
    ],
    color: "from-indigo-600 to-violet-700",
    btnClass: "bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 1500,
    price: 999,
    label: "₹999",
    highlight: false,
    perks: [
      "15 full game builds",
      "~30 anime episodes",
      "75 SaaS prototypes",
      "Dedicated AI pipeline",
      "Best value overall",
    ],
    color: "from-slate-800 to-slate-900",
    btnClass:
      "bg-white/10 hover:bg-white/20 border border-white/20 text-white",
  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning";

interface ToastState {
  message: string;
  type: ToastType;
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-amber-500",
  };

  const icons: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl text-white text-sm font-semibold transition-all ${styles[toast.type]}`}
    >
      <span>{icons[toast.type]}</span>
      <span>{toast.message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ─── Load Razorpay script ──────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Pack Card ────────────────────────────────────────────────────────────────

function PackCard({
  pack,
  loading,
  onBuy,
}: {
  pack: Pack;
  loading: boolean;
  onBuy: (id: Pack["id"]) => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-gradient-to-b ${pack.color} p-7 text-white shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl ${
        pack.highlight ? "ring-4 ring-white/30 scale-105" : ""
      }`}
    >
      {/* Badge */}
      {pack.badge && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold text-indigo-700 shadow">
          {pack.badge}
        </span>
      )}

      {/* Pack name + price */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
          {pack.name}
        </p>
        <p className="mt-1 text-4xl font-extrabold">{pack.label}</p>
        <p className="mt-1 text-sm opacity-70">one-time purchase</p>
      </div>

      {/* Credits highlight */}
      <div className="mb-5 rounded-xl bg-white/10 px-4 py-3 text-center">
        <span className="text-3xl font-black">{pack.credits.toLocaleString()}</span>
        <span className="ml-2 text-sm font-semibold opacity-80">credits</span>
      </div>

      {/* Perks */}
      <ul className="mb-6 space-y-2 text-sm opacity-90">
        {pack.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-emerald-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {perk}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        disabled={loading}
        onClick={() => onBuy(pack.id)}
        className={`mt-auto w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${pack.btnClass}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing…
          </span>
        ) : (
          `Buy ${pack.name} — ${pack.label}`
        )}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingPack, setLoadingPack] = useState<Pack["id"] | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [jwt, setJwt] = useState<string>("");

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
  }, []);

  // Fetch current user credits
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setJwt(session.access_token);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("credits")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setCredits(profile.credits);
        if (profile.credits < 50) {
          showToast(
            `Low credits! You only have ${profile.credits} credits remaining.`,
            "warning",
          );
        }
      }
    })();
  }, [showToast]);

  const handleBuy = async (packId: Pack["id"]) => {
    setLoadingPack(packId);
    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast("Failed to load payment gateway. Please try again.", "error");
        setLoadingPack(null);
        return;
      }

      // 2. Create order
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Order creation failed");

      // 3. Open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "CreatorOS",
          description: `${PACKS.find((p) => p.id === packId)?.name} Pack — ${order.credits} credits`,
          image: "/images/logo/logo.svg",
          theme: { color: "#6366f1" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 4. Verify payment
              const verifyRes = await fetch("/api/verify-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                  ...response,
                  packId,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error ?? "Verification failed");

              // 5. Update UI credits
              setCredits((prev) => (prev ?? 0) + verifyData.creditsAdded);
              showToast(
                `🎉 ${verifyData.creditsAdded} credits added! Enjoy building.`,
                "success",
              );
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              resolve(); // User closed modal — not an error
            },
          },
        });
        rzp.open();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      showToast(message, "error");
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12 sm:px-8">
      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="mx-auto mb-12 max-w-3xl text-center text-white">
        <span className="mb-4 inline-block rounded-full bg-indigo-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Credits
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Power up your{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            creative workflow
          </span>
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Credits unlock AI-powered game builds, anime episodes, SaaS projects,
          and more. No subscriptions — pay once, build forever.
        </p>

        {credits !== null && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2 text-sm text-gray-300 ring-1 ring-white/10">
            <svg
              className="h-4 w-4 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12zm.75-9.25a.75.75 0 00-1.5 0v4l2.625 1.575a.75.75 0 00.75-1.3L10.75 9.5V6.75z" />
            </svg>
            Your current balance:{" "}
            <span
              className={`font-bold ${credits < 50 ? "text-red-400" : "text-emerald-400"}`}
            >
              {credits} credits
            </span>
            {credits < 50 && (
              <span className="ml-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                Low
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pack grid */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
        {PACKS.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            loading={loadingPack === pack.id}
            onBuy={handleBuy}
          />
        ))}
      </div>

      {/* FAQ / info strip */}
      <div className="mx-auto mt-14 max-w-3xl rounded-2xl bg-white/5 p-6 text-center text-sm text-gray-400 ring-1 ring-white/10">
        <p className="font-semibold text-gray-300">How credits work</p>
        <p className="mt-1">
          Each AI generation action costs credits. Unused credits never expire.
          All purchases are instant and non-refundable once generation starts.
        </p>
      </div>
    </div>
  );
}
