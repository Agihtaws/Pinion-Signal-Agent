// server/skills/watchlist.ts
// paid endpoint — returns signals for all tracked tokens at once
// price: $0.03 USDC per call via x402

import type { Request, Response } from "express";
import {
  getAllLatestSignals,
  getLatestPrice,
} from "../../agent/storage";
import { logEarning } from "../earnings";
import type { WatchlistEndpointResponse } from "../../shared/types";

export async function watchlistHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const signals = getAllLatestSignals();

    if (signals.length === 0) {
      res.status(404).json({
        error: "no signals available yet",
        note: "the agent generates signals every 30 minutes. check back soon.",
      });
      return;
    }

    const response: WatchlistEndpointResponse & {
      signals: Array<{
        token: string;
        signal: any;
        confidence: number;
        priceAtSignal: number;
        change1h: string;   // changed from number to string
        change6h: string;   // changed from number to string
        change24h: string;  // changed from number to string
        currentPrice: number;
        generatedAt: string;
      }>;
    } = {
      signals: signals.map((s) => {
        const latestPrice = getLatestPrice(s.token);
        return {
          token: s.token,
          signal: s.signal,
          confidence: s.confidence,
          priceAtSignal: s.priceAtSignal,
          // Convert numbers to strings to satisfy frontend .startsWith()
          change1h: String(s.change1h || "0"),
          change6h: String(s.change6h || "0"),
          change24h: String(s.change24h || "0"),
          currentPrice: latestPrice?.priceUSD || s.priceAtSignal,
          generatedAt: s.timestamp,
        };
      }),
      generatedAt: new Date().toISOString(),
    };

    // log earning — payment already verified by x402 middleware
    logEarning(req, "/watchlist", 0.03);

    console.log(`[watchlist] served ${signals.length} signals`);

    res.json(response);
  } catch (err: any) {
    console.error("[watchlist] error:", err.message);
    res.status(500).json({
      error: "failed to fetch watchlist",
      details: err.message,
    });
  }
}
