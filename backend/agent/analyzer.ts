// agent/analyzer.ts
// the core brain of the agent
// fetches prices, calculates signals, calls Gemini for analysis
// writes everything to JSON storage
// called by the scheduler every 30 minutes

import { randomUUID } from "crypto";
import { fetchPrice } from "../skills/price";
import { fetchBalance } from "../skills/balance";
import { generateMarketAnalysis } from "../skills/chat";
import {
  writePriceEntry,
  writeSignal,
  writeAgentRun,
  getPriceHistoryForToken,
} from "./storage";
import {
  calculatePriceChanges,
  generateSignal,
  extractPriceHistory,
} from "./signals";
import type { PriceEntry, Signal, AgentRun } from "../shared/types";

// ── Config ────────────────────────────────────────────────────────────────────

const TOKENS = ["ETH", "WETH", "CBETH"];
const AGENT_WALLET = process.env.SKILL_SERVER_PAY_TO || "";

// ── Single Token Analyzer ─────────────────────────────────────────────────────

async function analyzeToken(token: string): Promise<Signal | null> {
  console.log(`[analyzer] analyzing ${token}...`);

  try {
    // step 1: fetch current price from CoinGecko
    const priceData = await fetchPrice(token);

    if (!priceData) {
      console.error(`[analyzer] failed to fetch price for ${token}`);
      return null;
    }

    // step 2: save price to history
    const priceEntry: PriceEntry = {
      token,
      priceUSD: priceData.priceUSD,
      change24h: priceData.change24h,
      source: priceData.source,
      timestamp: new Date().toISOString(),
    };
    writePriceEntry(priceEntry);

    // step 3: get full price history for this token
    const history = getPriceHistoryForToken(token);

    // step 4: calculate price changes from history
    const changes = calculatePriceChanges(history);

    // step 5: generate signal from price logic
    const signalResult = generateSignal(history, changes);

    // step 6: extract recent prices for Gemini context
    const recentPrices = extractPriceHistory(history, 10);

    // step 7: call Gemini for human readable AI report
    console.log(`[analyzer] calling Gemini for ${token} analysis...`);
    const aiResult = await generateMarketAnalysis({
      token,
      currentPrice: priceData.priceUSD,
      change1h: changes.change1h,
      change6h: changes.change6h,
      change24h: changes.change24h,
      priceHistory: recentPrices,
    });

    // step 8: build final signal object
    // use Gemini signal if confidence is higher otherwise use our logic
    let finalSignal = signalResult.signal;
    let finalConfidence = signalResult.confidence;

    // if Gemini strongly disagrees with our logic, blend the confidence down
    if (aiResult.signal !== signalResult.signal) {
      finalConfidence = Math.round(finalConfidence * 0.75);
      console.log(
        `[analyzer] ${token} signal divergence — ` +
        `logic says ${signalResult.signal}, Gemini says ${aiResult.signal}. ` +
        `keeping logic signal with reduced confidence ${finalConfidence}%`
      );
    } else {
      // both agree — boost confidence slightly
      finalConfidence = Math.min(95, Math.round(
        (signalResult.confidence + aiResult.confidence) / 2
      ));
    }

    const signal: Signal = {
      id: randomUUID(),
      token,
      signal: finalSignal,
      confidence: finalConfidence,
      priceAtSignal: priceData.priceUSD,
      change1h: changes.change1h,
      change6h: changes.change6h,
      change24h: changes.change24h,
      aiReport: aiResult.report,
      timestamp: new Date().toISOString(),
    };

    // step 9: save signal to storage
    writeSignal(signal);

    console.log(
      `[analyzer] ${token} complete — ` +
      `$${priceData.priceUSD.toFixed(2)} | ` +
      `${signal.signal} | ` +
      `confidence: ${signal.confidence}%`
    );

    return signal;
  } catch (err: any) {
    console.error(`[analyzer] error analyzing ${token}:`, err.message);
    return null;
  }
}

// ── Main Run Function ─────────────────────────────────────────────────────────

export async function runAnalysis(): Promise<AgentRun> {
  const startTime = Date.now();
  console.log("\n[analyzer] ════════════════════════════════════");
  console.log("[analyzer] starting analysis run...");
  console.log(`[analyzer] tokens: ${TOKENS.join(", ")}`);
  console.log(`[analyzer] time: ${new Date().toISOString()}`);
  console.log("[analyzer] ════════════════════════════════════");

  const results: (Signal | null)[] = [];
  let aiCallsMade = 0;

  // check agent wallet health first
  if (AGENT_WALLET) {
    try {
      const balance = await fetchBalance(AGENT_WALLET);
      if (balance) {
        console.log(
          `[analyzer] wallet health — ` +
          `ETH: ${balance.ETH} USDC: ${balance.USDC}`
        );

        // warn if ETH is low
        if (parseFloat(balance.ETH) < 0.01) {
          console.warn(
            "[analyzer] WARNING: ETH balance is low. " +
            "Get more testnet ETH from faucet."
          );
        }
      }
    } catch {
      console.warn("[analyzer] could not check wallet balance");
    }
  }

  // analyze each token sequentially
  // sequential not parallel to avoid rate limiting Gemini and CoinGecko
  for (const token of TOKENS) {
    const signal = await analyzeToken(token);
    results.push(signal);

    if (signal) aiCallsMade++;

    // small delay between tokens to be nice to free tier APIs
    if (token !== TOKENS[TOKENS.length - 1]) {
      console.log("[analyzer] waiting 3s before next token...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const successful = results.filter((r) => r !== null);
  const failed = results.filter((r) => r === null);

  const durationMs = Date.now() - startTime;

  // determine run status
  let status: AgentRun["status"];
  if (successful.length === TOKENS.length) {
    status = "success";
  } else if (successful.length > 0) {
    status = "partial";
  } else {
    status = "failed";
  }

  // build run record
  const run: Omit<AgentRun, "id"> = {
    status,
    tokensProcessed: successful
      .filter((s): s is Signal => s !== null)
      .map((s) => s.token),
    signalsGenerated: successful.length,
    pricesFetched: results.length,
    aiCallsMade,
    durationMs,
    error:
      failed.length > 0
        ? `${failed.length} token(s) failed to analyze`
        : undefined,
    timestamp: new Date().toISOString(),
  };

  const agentRun = writeAgentRun(run);

  console.log("\n[analyzer] ════════════════════════════════════");
  console.log(`[analyzer] run complete — status: ${status.toUpperCase()}`);
  console.log(`[analyzer] signals generated: ${successful.length}/${TOKENS.length}`);
  console.log(`[analyzer] duration: ${durationMs}ms`);
  console.log("[analyzer] ════════════════════════════════════\n");

  return agentRun;
}