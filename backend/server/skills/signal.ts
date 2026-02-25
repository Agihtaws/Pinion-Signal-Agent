// server/skills/signal.ts
// paid endpoint — returns latest signal for a token
// price: $0.05 USDC per call via x402

import type { Request, Response } from "express";
import {
  getLatestSignal,
  getLatestPrice,
} from "../../agent/storage";
import { logEarning } from "../earnings";
import type { SignalEndpointResponse } from "../../shared/types";

export async function signalHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const token = (req.params.token as string).toUpperCase().trim();
    const supported = ["ETH", "WETH", "CBETH"];

    if (!supported.includes(token)) {
      res.status(400).json({
        error: `unsupported token: ${token}`,
        supported,
        note: "signals are generated every 30 minutes for these tokens",
      });
      return;
    }

    const signal = getLatestSignal(token);
    const latestPrice = getLatestPrice(token);

    if (!signal) {
      res.status(404).json({
        error: "no signal available yet",
        token,
        note: "the agent generates signals every 30 minutes. check back soon.",
      });
      return;
    }

    const response: SignalEndpointResponse & {
      currentPrice: number;
      currentChange24h: string | null;
    } = {
      token: signal.token,
      signal: signal.signal,
      confidence: signal.confidence,
      priceAtSignal: signal.priceAtSignal,
      change1h: signal.change1h,
      change6h: signal.change6h,
      change24h: signal.change24h,
      currentPrice: latestPrice?.priceUSD || signal.priceAtSignal,
      currentChange24h: latestPrice?.change24h || null,
      generatedAt: signal.timestamp,
    };

    // log earning — payment already verified by x402 middleware
    logEarning(req, `/signal/${token}`, 0.05);

    console.log(
      `[signal] served ${token} — ${signal.signal} ` +
      `confidence ${signal.confidence}%`
    );

    res.json(response);
  } catch (err: any) {
    console.error("[signal] error:", err.message);
    res.status(500).json({
      error: "failed to fetch signal",
      details: err.message,
    });
  }
}