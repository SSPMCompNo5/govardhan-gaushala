import Razorpay from "razorpay";
import { NextResponse } from "next/server";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
  try {
    const { amount } = await req.json();

    if (!amount || isNaN(amount) || Number(amount) < 1) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum donation is ₹1." },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency: "INR",
      receipt: `donate_${Date.now()}`,
      notes: {
        source: "Govardhan Goshala Homepage",
        purpose: "Gau Seva Donation",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("[Razorpay] create-order error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create payment order." },
      { status: 500 }
    );
  }
}
