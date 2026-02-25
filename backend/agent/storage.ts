// agent/storage.ts
// read and write functions for all three JSON data files
// all functions are synchronous-safe but use async for future compatibility

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  PriceEntry,
  PriceHistory,
  Signal,
  SignalHistory,
  EarningEntry,
  EarningsSummary,
  AgentRun,
} from "../shared/types.js";

// ── File Paths ────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const PRICES_FILE = path.join(DATA_DIR, "prices.json");
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");
const EARNINGS_FILE = path.join(DATA_DIR, "earnings.json");
const RUNS_FILE = path.join(DATA_DIR, "runs.json");

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log("[storage] created data directory");
  }
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      writeJson(filePath, defaultValue);
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw || raw === "") {
      writeJson(filePath, defaultValue);
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err: any) {
    console.error(`[storage] failed to read ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`[storage] failed to write ${filePath}:`, err.message);
    throw err;
  }
}

// ── Price Storage ─────────────────────────────────────────────────────────────

// max entries per token kept in history (48 = 24 hours at 30min intervals)
const MAX_PRICE_ENTRIES = 48;

export function readPriceHistory(): PriceHistory[] {
  return readJson<PriceHistory[]>(PRICES_FILE, []);
}

export function writePriceEntry(entry: PriceEntry): void {
  const history = readPriceHistory();

  // find existing token history or create new one
  let tokenHistory = history.find((h) => h.token === entry.token);

  if (!tokenHistory) {
    tokenHistory = { token: entry.token, entries: [] };
    history.push(tokenHistory);
  }

  // add new entry at the front
  tokenHistory.entries.unshift(entry);

  // keep only the last MAX_PRICE_ENTRIES entries
  if (tokenHistory.entries.length > MAX_PRICE_ENTRIES) {
    tokenHistory.entries = tokenHistory.entries.slice(0, MAX_PRICE_ENTRIES);
  }

  writeJson(PRICES_FILE, history);
  console.log(
    `[storage] price saved — ${entry.token} $${entry.priceUSD}`
  );
}

export function getPriceHistoryForToken(token: string): PriceEntry[] {
  const history = readPriceHistory();
  const tokenHistory = history.find((h) => h.token === token);
  return tokenHistory?.entries || [];
}

export function getLatestPrice(token: string): PriceEntry | null {
  const entries = getPriceHistoryForToken(token);
  return entries.length > 0 ? entries[0] : null;
}

// ── Signal Storage ────────────────────────────────────────────────────────────

const MAX_SIGNAL_ENTRIES = 100;

export function readSignalHistory(): SignalHistory[] {
  return readJson<SignalHistory[]>(SIGNALS_FILE, []);
}

export function writeSignal(signal: Signal): void {
  const history = readSignalHistory();

  let tokenHistory = history.find((h) => h.token === signal.token);

  if (!tokenHistory) {
    tokenHistory = { token: signal.token, signals: [] };
    history.push(tokenHistory);
  }

  // add new signal at the front
  tokenHistory.signals.unshift(signal);

  // keep only the last MAX_SIGNAL_ENTRIES
  if (tokenHistory.signals.length > MAX_SIGNAL_ENTRIES) {
    tokenHistory.signals = tokenHistory.signals.slice(0, MAX_SIGNAL_ENTRIES);
  }

  writeJson(SIGNALS_FILE, history);
  console.log(
    `[storage] signal saved — ${signal.token} ${signal.signal} ` +
    `confidence ${signal.confidence}%`
  );
}

export function getSignalHistoryForToken(token: string): Signal[] {
  const history = readSignalHistory();
  const tokenHistory = history.find((h) => h.token === token);
  return tokenHistory?.signals || [];
}

export function getLatestSignal(token: string): Signal | null {
  const signals = getSignalHistoryForToken(token);
  return signals.length > 0 ? signals[0] : null;
}

export function getAllLatestSignals(): Signal[] {
  const history = readSignalHistory();
  return history
    .map((h) => (h.signals.length > 0 ? h.signals[0] : null))
    .filter((s): s is Signal => s !== null);
}

// ── Earnings Storage ──────────────────────────────────────────────────────────

const MAX_EARNING_ENTRIES = 200;

export function readEarnings(): EarningsSummary {
  return readJson<EarningsSummary>(EARNINGS_FILE, {
    totalEarned: 0,
    earnedToday: 0,
    earnedThisWeek: 0,
    totalCalls: 0,
    callsToday: 0,
    entries: [],
  });
}

export function writeEarningEntry(
  endpoint: string,
  amountUSDC: number,
  callerAddress: string
): void {
  const earnings = readEarnings();

  const entry: EarningEntry = {
    id: randomUUID(),
    endpoint,
    amountUSDC,
    callerAddress,
    timestamp: new Date().toISOString(),
  };

  // add to entries
  earnings.entries.unshift(entry);
  if (earnings.entries.length > MAX_EARNING_ENTRIES) {
    earnings.entries = earnings.entries.slice(0, MAX_EARNING_ENTRIES);
  }

  // recalculate totals
  earnings.totalEarned = parseFloat(
    (earnings.totalEarned + amountUSDC).toFixed(4)
  );
  earnings.totalCalls += 1;

  // recalculate today and this week from entries
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  earnings.earnedToday = parseFloat(
    earnings.entries
      .filter((e) => new Date(e.timestamp).getTime() >= todayStart)
      .reduce((sum, e) => sum + e.amountUSDC, 0)
      .toFixed(4)
  );

  earnings.earnedThisWeek = parseFloat(
    earnings.entries
      .filter((e) => new Date(e.timestamp).getTime() >= weekStart)
      .reduce((sum, e) => sum + e.amountUSDC, 0)
      .toFixed(4)
  );

  earnings.callsToday = earnings.entries.filter(
    (e) => new Date(e.timestamp).getTime() >= todayStart
  ).length;

  writeJson(EARNINGS_FILE, earnings);
  console.log(
    `[storage] earning logged — ${endpoint} +${amountUSDC} USDC ` +
    `(total: $${earnings.totalEarned})`
  );
}

// ── Agent Run Storage ─────────────────────────────────────────────────────────

const MAX_RUN_ENTRIES = 50;

export function readAgentRuns(): AgentRun[] {
  return readJson<AgentRun[]>(RUNS_FILE, []);
}

export function writeAgentRun(run: Omit<AgentRun, "id">): AgentRun {
  const runs = readAgentRuns();

  const fullRun: AgentRun = {
    id: randomUUID(),
    ...run,
  };

  runs.unshift(fullRun);

  if (runs.length > MAX_RUN_ENTRIES) {
    runs.splice(MAX_RUN_ENTRIES);
  }

  writeJson(RUNS_FILE, runs);
  console.log(
    `[storage] agent run logged — ${fullRun.status} ` +
    `(${fullRun.durationMs}ms, ${fullRun.signalsGenerated} signals)`
  );

  return fullRun;
}

export function getLastAgentRun(): AgentRun | null {
  const runs = readAgentRuns();
  return runs.length > 0 ? runs[0] : null;
}

// ── Storage Health Check ──────────────────────────────────────────────────────

export function storageHealthCheck(): {
  ok: boolean;
  files: Record<string, boolean>;
} {
  ensureDataDir();

  const files = {
    prices: fs.existsSync(PRICES_FILE),
    signals: fs.existsSync(SIGNALS_FILE),
    earnings: fs.existsSync(EARNINGS_FILE),
    runs: fs.existsSync(RUNS_FILE),
  };

  // create any missing files
  if (!files.prices) writeJson(PRICES_FILE, []);
  if (!files.signals) writeJson(SIGNALS_FILE, []);
  if (!files.earnings)
    writeJson(EARNINGS_FILE, {
      totalEarned: 0,
      earnedToday: 0,
      earnedThisWeek: 0,
      totalCalls: 0,
      callsToday: 0,
      entries: [],
    });
  if (!files.runs) writeJson(RUNS_FILE, []);

  return { ok: true, files };
}