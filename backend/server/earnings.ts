// server/earnings.ts
// decodes x402 payment header to extract caller address
// and logs earnings after each successful skill call

import type { Request } from "express";
import { writeEarningEntry } from "../agent/storage";
import type { DecodedPayment } from "../shared/types";

// ── Decode Payment Header ─────────────────────────────────────────────────────

export function extractCallerAddress(req: Request): string {
  try {
    const paymentHeader = req.headers["x-payment"] as string;
    if (!paymentHeader) return "unknown";

    const decoded: DecodedPayment = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf-8")
    );

    return decoded?.payload?.authorization?.from || "unknown";
  } catch {
    return "unknown";
  }
}

// ── Log Earning ───────────────────────────────────────────────────────────────

export function logEarning(
  req: Request,
  endpoint: string,
  amountUSDC: number
): void {
  try {
    const callerAddress = extractCallerAddress(req);
    writeEarningEntry(endpoint, amountUSDC, callerAddress);
    console.log(
      `[earnings] logged — ${endpoint} +$${amountUSDC} USDC ` +
      `from ${callerAddress.slice(0, 12)}...`
    );
  } catch (err: any) {
    console.error("[earnings] failed to log earning:", err.message);
  }
}