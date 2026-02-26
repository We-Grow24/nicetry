/**
 * POST /api/verify-payment
 * Verifies a Razorpay HMAC signature after payment success,
 * then credits the user's account and logs the transaction.
 *
 * Body: {
 *   razorpay_order_id: string
 *   razorpay_payment_id: string
 *   razorpay_signature: string
 *   packId: "starter" | "creator" | "pro"
 * }
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const PACKS = {
  starter: { credits: 200, amountInr: 199 },
  creator: { credits: 600, amountInr: 499 },
  pro:     { credits: 1500, amountInr: 999 },
} as const;

type PackId = keyof typeof PACKS;

function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      packId,
    } = await req.json() as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      packId: string;
    };

    // 1. Verify HMAC signature
    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (!(packId in PACKS)) {
      return NextResponse.json({ error: "Invalid packId" }, { status: 400 });
    }

    const pack = PACKS[packId as PackId];

    // 2. Get authenticated user from Authorization header (JWT)
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Decode user from JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    // 3. Update credits (upsert to handle first-time users)
    const { error: creditError } = await supabase.rpc("increment_credits", {
      p_user_id: userId,
      p_credits: pack.credits,
    });

    if (creditError) {
      // Fallback: manual upsert
      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(
          { id: userId, credits: pack.credits, total_spent: pack.amountInr },
          { onConflict: "id" },
        );

      if (upsertError) {
        // Try plain increment via select + update
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("credits, total_spent")
          .eq("id", userId)
          .single();

        if (profile) {
          await supabase
            .from("user_profiles")
            .update({
              credits: (profile.credits ?? 0) + pack.credits,
              total_spent: (profile.total_spent ?? 0) + pack.amountInr,
            })
            .eq("id", userId);
        } else {
          await supabase.from("user_profiles").insert({
            id: userId,
            credits: pack.credits,
            total_spent: pack.amountInr,
          });
        }
      }
    }

    // 4. Log transaction
    await supabase.from("transactions").insert({
      user_id: userId,
      amount_inr: pack.amountInr,
      credits_added: pack.credits,
      razorpay_order_id,
      razorpay_payment_id,
      status: "completed",
    });

    return NextResponse.json({ success: true, creditsAdded: pack.credits });
  } catch (err: unknown) {
    console.error("[verify-payment]", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
