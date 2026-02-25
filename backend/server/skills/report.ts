// server/skills/report.ts
// paid endpoint — returns full AI analysis report for a token
// price: $0.10 USDC per call via x402

import type { Request, Response } from "express";
import {
  getLatestSignal,
  getSignalHistoryForToken,
  getLatestPrice,
} from "../../agent/storage";
import { logEarning } from "../earnings";
import type { ReportEndpointResponse } from "../../shared/types";

export async function reportHandler(
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
      });
      return;
    }

    const signal = getLatestSignal(token);
    const latestPrice = getLatestPrice(token);

    if (!signal) {
      res.status(404).json({
        error: "no report available yet",
        token,
        note: "the agent generates reports every 30 minutes. check back soon.",
      });
      return;
    }

    // get last 5 signals for trend context
    const history = getSignalHistoryForToken(token).slice(0, 5);
    const signalTrend = history.map((s) => ({
      signal: s.signal,
      confidence: s.confidence,
      timestamp: s.timestamp,
    }));

    const response: ReportEndpointResponse & {
      currentPrice: number | null;
      signalTrend: typeof signalTrend;
    } = {
      token: signal.token,
      signal: signal.signal,
      confidence: signal.confidence,
      priceAtSignal: signal.priceAtSignal,
      aiReport: signal.aiReport,
      generatedAt: signal.timestamp,
      currentPrice: latestPrice?.priceUSD || null,
      signalTrend,
    };

    // log earning — payment already verified by x402 middleware
    logEarning(req, `/report/${token}`, 0.10);

    console.log(
      `[report] served full report for ${token} — ` +
      `${signal.aiReport.slice(0, 50)}...`
    );

    res.json(response);
  } catch (err: any) {
    console.error("[report] error:", err.message);
    res.status(500).json({
      error: "failed to fetch report",
      details: err.message,
    });
  }
}