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

app.get("/health", (req, res) => {
  const health = storageHealthCheck();
  res.json({
    status: "ok",
    server: "pinion-signal-agent",
    network: NETWORK,
    storage: health,
    timestamp: new Date().toISOString(),
  });
});

// ── Free Skill Endpoints ──────────────────────────────────────────────────────

app.get("/price/:token", priceHandler);
app.get("/balance/:address", balanceHandler);
app.post("/chat", chatHandler);
app.get("/tx/:hash", txHandler);
app.get("/wallet/generate", walletHandler);
app.post("/send", sendHandler);
app.post("/broadcast", broadcastHandler);
app.post("/trade", tradeHandler);
app.get("/fund/:address", fundHandler);

// ── Catalog ───────────────────────────────────────────────────────────────────

app.get("/catalog", (req, res) => {
  res.json({
    server: "pinion-signal-agent",
    network: NETWORK,
    skills: [
      { endpoint: "/price/:token",    method: "GET",  price: "free",  description: "Get USD price for ETH, WETH, CBETH, USDC, DAI, USDT" },
      { endpoint: "/balance/:address",method: "GET",  price: "free",  description: "Get ETH and USDC balances for any address" },
      { endpoint: "/chat",            method: "POST", price: "free",  description: "Chat with Gemini AI analyst" },
      { endpoint: "/tx/:hash",        method: "GET",  price: "free",  description: "Get decoded transaction details" },
      { endpoint: "/wallet/generate", method: "GET",  price: "free",  description: "Generate a fresh wallet keypair" },
      { endpoint: "/send",            method: "POST", price: "free",  description: "Construct unsigned ETH or USDC transfer tx" },
      { endpoint: "/broadcast",       method: "POST", price: "free",  description: "Sign and broadcast a transaction" },
      { endpoint: "/trade",           method: "POST", price: "free",  description: "Construct unsigned swap transaction" },
      { endpoint: "/fund/:address",   method: "GET",  price: "free",  description: "Get wallet balance and funding instructions" },
      { endpoint: "/signal/:token",   method: "GET",  price: "$0.05", description: "AI-powered market signal (BUY/HOLD/SELL)" },
      { endpoint: "/report/:token",   method: "GET",  price: "$0.10", description: "Full AI analysis report for a token" },
      { endpoint: "/watchlist",       method: "GET",  price: "$0.03", description: "Signals for all tracked tokens in one call" },
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── Test Data Endpoint (for frontend dashboard) ───────────────────────────────

app.get("/test/data", (req, res) => {
  try {
    const {
      readPriceHistory,
      readSignalHistory,
      readEarnings,
      readAgentRuns,
    } = require("../agent/storage");

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

// ── x402 Paid Endpoints ───────────────────────────────────────────────────────
// apply payment middleware only to these three routes

const BASE_URL = process.env.RENDER_EXTERNAL_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || `http://localhost:${PORT}`;

const paidRoutes = {
  [`/signal/:token`]: {
    price: { amount: "50000", asset: USDC_ADDRESS },
    description: "AI-powered market signal (BUY/HOLD/SELL) with confidence score",
  },
  [`/report/:token`]: {
    price: { amount: "100000", asset: USDC_ADDRESS },
    description: "Full AI-generated market analysis report for a token",
  },
  "/watchlist": {
    price: { amount: "30000", asset: USDC_ADDRESS },
    description: "Signals for all tracked tokens in one call",
  },
};

// x402 middleware for paid routes
app.use(
  paymentMiddleware(PAY_TO, paidRoutes, {
    url: FACILITATOR,
    network: NETWORK as any,
  })
);

// paid route handlers (after middleware)
app.get("/signal/:token", signalHandler);
app.get("/report/:token", reportHandler);
app.get("/watchlist", watchlistHandler);

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
  console.log(`[server] paid skills: signal ($0.05), report ($0.10), watchlist ($0.03)`);
  console.log("──────────────────────────────────────────\n");

  const health = storageHealthCheck();
  console.log(`[server] storage health: ${health.ok ? "OK" : "FAIL"}`);
});

export { app };
