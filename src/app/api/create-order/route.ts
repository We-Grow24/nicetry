/**
 * POST /api/create-order
 * Creates a Razorpay order for a credit pack purchase.
 *
 * Body: { packId: "starter" | "creator" | "pro" }
 * Returns: { orderId, amount, currency, keyId }
 */

import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const PACKS = {
  starter: { credits: 200, amountInr: 199 },
  creator: { credits: 600, amountInr: 499 },
  pro:     { credits: 1500, amountInr: 999 },
} as const;

type PackId = keyof typeof PACKS;

export async function POST(req: NextRequest) {
  try {
    const { packId } = await req.json() as { packId: string };

    if (!packId || !(packId in PACKS)) {
      return NextResponse.json({ error: "Invalid packId" }, { status: 400 });
    }

    const pack = PACKS[packId as PackId];

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: pack.amountInr * 100, // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { packId, credits: String(pack.credits) },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      packId,
      credits: pack.credits,
    });
  } catch (err: unknown) {
    console.error("[create-order]", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
