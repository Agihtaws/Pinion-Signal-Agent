// server/index.ts
// single combined server for Render deployment
// free skills + x402 paid endpoints on one port
// Render sets PORT automatically via environment variable

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";

// free skill handlers
import { priceHandler } from "../skills/price";
import { balanceHandler } from "../skills/balance";
import { chatHandler } from "../skills/chat";
import { txHandler } from "../skills/tx";
import { walletHandler } from "../skills/wallet";
import { sendHandler } from "../skills/send";
import { broadcastHandler } from "../skills/broadcast";
import { tradeHandler } from "../skills/trade";
import { fundHandler } from "../skills/fund";

// paid skill handlers
import { signalHandler } from "./skills/signal";
import { reportHandler } from "./skills/report";
import { watchlistHandler } from "./skills/watchlist";

import { storageHealthCheck, readEarnings } from "../agent/storage";

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || process.env.SKILL_SERVER_PORT || "4020", 10);
const NETWORK = process.env.PINION_NETWORK || "base-sepolia";
const PAY_TO = process.env.SKILL_SERVER_PAY_TO || "";
const FACILITATOR = "https://facilitator.payai.network";

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

if (!PAY_TO) {
  console.error("[server] ERROR: SKILL_SERVER_PAY_TO not set in .env");
  process.exit(1);
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());

// ── Free Health Endpoint ──────────────────────────────────────────────────────
// Responds to both /health and /api/health (what the frontend expects)
app.get(["/health", "/api/health"], (req, res) => {
  const health = storageHealthCheck();
  res.json({
    status: "ok",
    server: "pinion-signal-agent",
    network: NETWORK,
    storage: health,
    timestamp: new Date().toISOString(),
  });
});

// ── Free Skill Endpoints (with /api prefix for frontend compatibility) ───────
app.get("/api/price/:token", priceHandler);
app.get("/api/balance/:address", balanceHandler);
app.post("/api/chat", chatHandler);
app.get("/api/tx/:hash", txHandler);
app.get("/api/wallet/generate", walletHandler);
app.post("/api/send", sendHandler);
app.post("/api/broadcast", broadcastHandler);
app.post("/api/trade", tradeHandler);
app.get("/api/fund/:address", fundHandler);

// ── Catalog (remains free, lists all available endpoints) ────────────────────
app.get("/catalog", (req, res) => {
  res.json({
    server: "pinion-signal-agent",
    network: NETWORK,
    skills: [
      { endpoint: "/api/price/:token",    method: "GET",  price: "free",  description: "Get USD price for ETH, WETH, CBETH, USDC, DAI, USDT" },
      { endpoint: "/api/balance/:address",method: "GET",  price: "free",  description: "Get ETH and USDC balances for any address" },
      { endpoint: "/api/chat",            method: "POST", price: "free",  description: "Chat with Gemini AI analyst" },
      { endpoint: "/api/tx/:hash",        method: "GET",  price: "free",  description: "Get decoded transaction details" },
      { endpoint: "/api/wallet/generate", method: "GET",  price: "free",  description: "Generate a fresh wallet keypair" },
      { endpoint: "/api/send",            method: "POST", price: "free",  description: "Construct unsigned ETH or USDC transfer tx" },
      { endpoint: "/api/broadcast",       method: "POST", price: "free",  description: "Sign and broadcast a transaction" },
      { endpoint: "/api/trade",           method: "POST", price: "free",  description: "Construct unsigned swap transaction" },
      { endpoint: "/api/fund/:address",   method: "GET",  price: "free",  description: "Get wallet balance and funding instructions" },
      { endpoint: "/api/signal/:token",   method: "GET",  price: "$0.05", description: "AI-powered market signal (BUY/HOLD/SELL)" },
      { endpoint: "/api/report/:token",   method: "GET",  price: "$0.10", description: "Full AI analysis report for a token" },
      { endpoint: "/api/signals",         method: "GET",  price: "$0.03", description: "Signals for all tracked tokens in one call" },
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── Free Dashboard Data Endpoints ─────────────────────────────────────────────
// These provide the data needed by the frontend dashboard

app.get("/api/prices", (req, res) => {
  try {
    const { readPriceHistory } = require("../agent/storage"); // .js removed
    const history = readPriceHistory();
    
    // Ensure change values are strings (frontend expects strings)
    const safeHistory = history.map((h: any) => ({
      ...h,
      change24h: String(h.change24h || "0")
    }));
    
    res.json(safeHistory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/earnings", (req, res) => {
  try {
    res.json(readEarnings());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/runs", (req, res) => {
  try {
    const { readAgentRuns } = require("../agent/storage"); // .js removed
    res.json(readAgentRuns());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Test Data Endpoint (legacy, kept for debugging) ──────────────────────────
app.get("/test/data", (req, res) => {
  try {
    const {
      readPriceHistory,
      readSignalHistory,
      readEarnings,
      readAgentRuns,
    } = require("../agent/storage"); // .js removed

    res.json({
      prices: readPriceHistory(),
      signals: readSignalHistory(),
      earnings: readEarnings(),
      runs: readAgentRuns(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── x402 Paid Endpoints (with /api prefix) ────────────────────────────────────
// These routes require payment via x402

const BASE_URL = process.env.RENDER_EXTERNAL_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || `http://localhost:${PORT}`;

const paidRoutes = {
  "/api/signal/:token": {
    price: { amount: "50000", asset: USDC_ADDRESS },
    description: "AI-powered market signal (BUY/HOLD/SELL) with confidence score",
  },
  "/api/report/:token": {
    price: { amount: "100000", asset: USDC_ADDRESS },
    description: "Full AI-generated market analysis report for a token",
  },
  "/api/signals": {
    price: { amount: "30000", asset: USDC_ADDRESS },
    description: "Signals for all tracked tokens in one call",
  },
};

// Apply payment middleware only to the paid routes
app.use(
  paymentMiddleware(PAY_TO, paidRoutes, {
    url: FACILITATOR,
    network: NETWORK as any,
  })
);

// Paid route handlers (after middleware)
app.get("/api/signal/:token", signalHandler);
app.get("/api/report/:token", reportHandler);
app.get("/api/signals", watchlistHandler); // This matches the frontend's fetch call

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("\n");
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     PINION SIGNAL AGENT SERVER           ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`[server] port:     ${PORT}`);
  console.log(`[server] network:  ${NETWORK}`);
  console.log(`[server] pay to:   ${PAY_TO}`);
  console.log(`[server] free skills: price, balance, chat, tx, wallet, send, broadcast, trade, fund`);
  console.log(`[server] paid skills: signal ($0.05), report ($0.10), signals ($0.03)`);
  console.log("──────────────────────────────────────────\n");

  const health = storageHealthCheck();
  console.log(`[server] storage health: ${health.ok ? "OK" : "FAIL"}`);
});

export { app };
