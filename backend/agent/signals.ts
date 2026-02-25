// agent/signals.ts
// pure logic for generating BUY, HOLD, SELL signals
// based on price history stored in prices.json
// no external API calls — purely mathematical analysis

import type { PriceEntry, SignalType } from "../shared/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PriceChanges {
  change1h: number;   // % change over last 1 hour
  change6h: number;   // % change over last 6 hours
  change24h: number;  // % change over last 24 hours
  hasEnoughData: boolean;
}

export interface SignalResult {
  signal: SignalType;
  confidence: number;   // 0 to 100
  reasoning: string;    // human readable explanation for Gemini context
}

// ── Price Change Calculator ───────────────────────────────────────────────────

// entries are stored newest first
// at 30min intervals: 1h = 2 entries ago, 6h = 12 entries ago, 24h = 48 entries ago

export function calculatePriceChanges(entries: PriceEntry[]): PriceChanges {
  if (entries.length === 0) {
    return {
      change1h: 0,
      change6h: 0,
      change24h: 0,
      hasEnoughData: false,
    };
  }

  const current = entries[0].priceUSD;

  // index positions for time windows at 30min intervals
  const INDEX_1H = 2;   // 2 entries ago = 1 hour
  const INDEX_6H = 12;  // 12 entries ago = 6 hours
  const INDEX_24H = 48; // 48 entries ago = 24 hours

  function calcChange(pastIndex: number): number {
    if (entries.length <= pastIndex) {
      // not enough history, use what we have
      const oldest = entries[entries.length - 1].priceUSD;
      return parseFloat(
        (((current - oldest) / oldest) * 100).toFixed(2)
      );
    }
    const past = entries[pastIndex].priceUSD;
    return parseFloat(
      (((current - past) / past) * 100).toFixed(2)
    );
  }

  return {
    change1h: calcChange(INDEX_1H),
    change6h: calcChange(INDEX_6H),
    change24h: calcChange(INDEX_24H),
    hasEnoughData: entries.length >= 3, // at least 1.5 hours of data
  };
}

// ── Trend Detector ────────────────────────────────────────────────────────────

// looks at the last N prices and determines if trend is consistently
// up, down, or sideways using simple linear regression direction

export function detectTrend(
  entries: PriceEntry[],
  window: number = 6
): "up" | "down" | "sideways" {
  const slice = entries.slice(0, Math.min(window, entries.length));

  if (slice.length < 2) return "sideways";

  // reverse so oldest is first for trend calculation
  const prices = slice.map((e) => e.priceUSD).reverse();

  let upMoves = 0;
  let downMoves = 0;

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) upMoves++;
    else if (prices[i] < prices[i - 1]) downMoves++;
  }

  const total = prices.length - 1;
  const upRatio = upMoves / total;
  const downRatio = downMoves / total;

  if (upRatio >= 0.6) return "up";
  if (downRatio >= 0.6) return "down";
  return "sideways";
}

// ── Volatility Calculator ─────────────────────────────────────────────────────

// standard deviation of recent prices as a percentage of mean
// high volatility reduces confidence in any signal

export function calculateVolatility(entries: PriceEntry[]): number {
  const slice = entries.slice(0, Math.min(12, entries.length));
  if (slice.length < 2) return 0;

  const prices = slice.map((e) => e.priceUSD);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
    prices.length;
  const stdDev = Math.sqrt(variance);

  // return as percentage of mean
  return parseFloat(((stdDev / mean) * 100).toFixed(2));
}

// ── Signal Generator ──────────────────────────────────────────────────────────

export function generateSignal(
  entries: PriceEntry[],
  changes: PriceChanges
): SignalResult {
  if (!changes.hasEnoughData || entries.length < 2) {
    return {
      signal: "HOLD",
      confidence: 30,
      reasoning:
        "Insufficient price history to generate a reliable signal. " +
        "At least 1.5 hours of data needed.",
    };
  }

  const trend = detectTrend(entries, 6);
  const longTrend = detectTrend(entries, 24);
  const volatility = calculateVolatility(entries);
  const current = entries[0].priceUSD;

  // scoring system
  // each factor adds or subtracts from a base score
  // final score determines signal and confidence

  let score = 0; // positive = bullish, negative = bearish
  const factors: string[] = [];

  // 1h momentum (most recent, highest weight)
  if (changes.change1h > 0.5) {
    score += 3;
    factors.push(`strong 1h upward momentum (+${changes.change1h}%)`);
  } else if (changes.change1h > 0.1) {
    score += 1;
    factors.push(`mild 1h upward movement (+${changes.change1h}%)`);
  } else if (changes.change1h < -0.5) {
    score -= 3;
    factors.push(`strong 1h downward pressure (${changes.change1h}%)`);
  } else if (changes.change1h < -0.1) {
    score -= 1;
    factors.push(`mild 1h decline (${changes.change1h}%)`);
  } else {
    factors.push(`flat 1h movement (${changes.change1h}%)`);
  }

  // 6h trend (medium term weight)
  if (changes.change6h > 2) {
    score += 2;
    factors.push(`positive 6h trend (+${changes.change6h}%)`);
  } else if (changes.change6h > 0.5) {
    score += 1;
    factors.push(`slight 6h uptrend (+${changes.change6h}%)`);
  } else if (changes.change6h < -2) {
    score -= 2;
    factors.push(`negative 6h trend (${changes.change6h}%)`);
  } else if (changes.change6h < -0.5) {
    score -= 1;
    factors.push(`slight 6h downtrend (${changes.change6h}%)`);
  }

  // 24h context (lower weight but important)
  if (changes.change24h > 5) {
    score += 1;
    factors.push(`bullish 24h context (+${changes.change24h}%)`);
  } else if (changes.change24h < -5) {
    score -= 1;
    factors.push(`bearish 24h context (${changes.change24h}%)`);
  }

  // short term trend consistency
  if (trend === "up") {
    score += 2;
    factors.push("consistent upward price action in recent candles");
  } else if (trend === "down") {
    score -= 2;
    factors.push("consistent downward price action in recent candles");
  } else {
    factors.push("sideways price action, no clear direction");
  }

  // long term trend alignment
  if (longTrend === "up" && trend === "up") {
    score += 1;
    factors.push("short and long term trends aligned bullish");
  } else if (longTrend === "down" && trend === "down") {
    score -= 1;
    factors.push("short and long term trends aligned bearish");
  } else if (longTrend !== trend && trend !== "sideways") {
    // divergence reduces confidence
    score = Math.round(score * 0.8);
    factors.push("short and long term trends diverging — reduced confidence");
  }

  // volatility penalty (high volatility = less confident)
  let volatilityNote = "";
  if (volatility > 2) {
    score = Math.round(score * 0.7);
    volatilityNote = `high volatility (${volatility}%) reducing confidence`;
    factors.push(volatilityNote);
  } else if (volatility > 1) {
    score = Math.round(score * 0.85);
    factors.push(`moderate volatility (${volatility}%)`);
  }

  // ── Determine Signal and Confidence ──────────────────────────────────────

  let signal: SignalType;
  let baseConfidence: number;

  if (score >= 5) {
    signal = "BUY";
    baseConfidence = Math.min(90, 60 + score * 4);
  } else if (score >= 2) {
    signal = "BUY";
    baseConfidence = Math.min(75, 50 + score * 5);
  } else if (score <= -5) {
    signal = "SELL";
    baseConfidence = Math.min(90, 60 + Math.abs(score) * 4);
  } else if (score <= -2) {
    signal = "SELL";
    baseConfidence = Math.min(75, 50 + Math.abs(score) * 5);
  } else {
    signal = "HOLD";
    baseConfidence = Math.max(40, 60 - Math.abs(score) * 5);
  }

  // clamp confidence to 0-100
  const confidence = Math.min(100, Math.max(0, Math.round(baseConfidence)));

  // build reasoning string for Gemini context
  const reasoning = [
    `Current price: $${current.toFixed(2)}`,
    `Score: ${score} (positive=bullish, negative=bearish)`,
    `Short-term trend: ${trend}, Long-term trend: ${longTrend}`,
    `Volatility: ${volatility}%`,
    `Key factors:`,
    ...factors.map((f) => `  - ${f}`),
  ].join("\n");

  return { signal, confidence, reasoning };
}

// ── Price History Extractor ───────────────────────────────────────────────────

// extracts last N prices oldest to newest for Gemini context
export function extractPriceHistory(
  entries: PriceEntry[],
  count: number = 10
): number[] {
  return entries
    .slice(0, Math.min(count, entries.length))
    .map((e) => e.priceUSD)
    .reverse(); // oldest first
}