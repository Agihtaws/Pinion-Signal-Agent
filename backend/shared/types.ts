// shared/types.ts
// all TypeScript interfaces used across agent, server, and skills

// ── Price ────────────────────────────────────────────────────────────────────

export interface PriceEntry {
  token: string;          // ETH, WETH, CBETH
  priceUSD: number;       // current USD price
  change24h: number | null; // Fixed double semicolon
  source: string;         // coingecko, birdeye etc
  timestamp: string;      // ISO string
}

export interface PriceHistory {
  token: string;
  entries: PriceEntry[];  // last 48 entries (24 hours at 30min intervals)
}

// ── Signal ───────────────────────────────────────────────────────────────────

export type SignalType = "BUY" | "HOLD" | "SELL";

export interface Signal {
  id: string;
  token: string;
  signal: SignalType;
  confidence: number;
  priceAtSignal: number;
  change1h: number; 
  change6h: number;
  change24h: number;
  aiReport: string;
  timestamp: string;
}

export interface SignalHistory {
  token: string;
  signals: Signal[];      // last 100 signals per token
}

// ── Earnings ─────────────────────────────────────────────────────────────────

export interface EarningEntry {
  id: string;             // uuid v4
  endpoint: string;       // which skill was called e.g. /signal/ETH
  amountUSDC: number;     // how much was earned in USDC
  callerAddress: string;  // who paid
  timestamp: string;      // ISO string
}

export interface EarningsSummary {
  totalEarned: number;        // all time USDC earned
  earnedToday: number;        // USDC earned today
  earnedThisWeek: number;     // USDC earned this week
  totalCalls: number;         // all time calls served
  callsToday: number;         // calls served today
  entries: EarningEntry[];    // last 200 entries
}

// ── Agent Run ─────────────────────────────────────────────────────────────────

export interface AgentRun {
  id: string;             // uuid v4
  status: "success" | "failed" | "partial";
  tokensProcessed: string[];  // which tokens were analyzed
  signalsGenerated: number;   // how many signals were produced
  pricesFetched: number;      // how many price calls were made
  aiCallsMade: number;        // how many Gemini calls were made
  durationMs: number;         // how long the run took
  error?: string;             // if failed, why
  timestamp: string;          // ISO string
}

// ── Skill Response Wrappers ───────────────────────────────────────────────────

export interface SkillResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// price skill response
export interface PriceSkillData {
  token: string;
  network: string;
  priceUSD: number;
  change24h: number | null; // Changed from string to number for consistency
  source: string;
  timestamp: string;
}

// balance skill response
export interface BalanceSkillData {
  address: string;
  network: string;
  balances: {
    ETH: string;
    USDC: string;
  };
  timestamp: string;
}

// chat skill response
export interface ChatSkillData {
  response: string;
}

// wallet skill response
export interface WalletSkillData {
  address: string;
  privateKey: string;
  network: string;
  chainId: number;
  note: string;
  timestamp: string;
}

// tx skill response
export interface TxSkillData {
  hash: string;
  network: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: string;
  blockNumber: number | null;
  timestamp: string;
}

// send skill response
export interface SendSkillData {
  tx: UnsignedTx;
  token: string;
  amount: string;
  network: string;
  note: string;
  timestamp: string;
}

// trade skill response
export interface TradeSkillData {
  swap: UnsignedTx;
  approve?: UnsignedTx;
  srcToken: string;
  dstToken: string;
  amount: string;
  network: string;
  note: string;
  timestamp: string;
}

// broadcast skill response
export interface BroadcastSkillData {
  txHash: string;
  explorerUrl: string;
  from: string;
  to: string;
  network: string;
  status: string;
  note: string;
  timestamp: string;
}

// fund skill response
export interface FundSkillData {
  address: string;
  network: string;
  chainId: number;
  balances: {
    ETH: string;
    USDC: string;
  };
  depositAddress: string;
  funding: {
    steps: string[];
    minimumRecommended: {
      ETH: string;
      USDC: string;
    };
    bridgeUrl: string;
  };
  timestamp: string;
}

// unsigned transaction shape used in send and trade
export interface UnsignedTx {
  to: string;
  value: string;
  data: string;
  chainId: number;
}

// ── Server Skill Endpoint Responses ──────────────────────────────────────────

// what /signal/:token returns to callers
export interface SignalEndpointResponse {
  token: string;
  signal: SignalType;
  confidence: number;
  priceAtSignal: number;
  change1h: number;
  change6h: number;
  change24h: number;
  generatedAt: string;
}


// what /report/:token returns to callers
export interface ReportEndpointResponse {
  token: string;
  signal: SignalType;
  confidence: number;
  priceAtSignal: number;
  aiReport: string;
  generatedAt: string;
}

// what /watchlist returns to callers
export interface WatchlistEndpointResponse {
  signals: (SignalEndpointResponse & { currentPrice: number })[];
  generatedAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  privateKey: string;
  network: string;
  geminiApiKey: string;
  skillServerUrl: string;
  payTo: string;
  port: number;
  tokens: string[];         // tokens to track, default ETH WETH CBETH
  intervalMinutes: number;  // how often agent runs, default 30
}

// payment header decoder shape
export interface DecodedPayment {
  payload?: {
    authorization?: {
      from?: string;
    };
  };
}
