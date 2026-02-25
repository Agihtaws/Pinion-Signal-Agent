// server/index.ts
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import {
  storageHealthCheck,
  writePriceEntry,
  readPriceHistory,
  writeSignal,
  readSignalHistory,
  writeEarningEntry,
  readEarnings,
} from "../agent/storage";
import { priceHandler } from "../skills/price";
import { balanceHandler } from "../skills/balance";
import { chatHandler } from "../skills/chat";
import { txHandler } from "../skills/tx";
import { walletHandler } from "../skills/wallet";
import { sendHandler } from "../skills/send";
import { broadcastHandler } from "../skills/broadcast";
import { tradeHandler } from "../skills/trade";
import { fundHandler } from "../skills/fund";

const app = express();
app.use(express.json());

const PORT = process.env.SKILL_SERVER_PORT || 4020;

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  const storage = storageHealthCheck();
  res.json({
    status: "ok",
    server: "pinion-signal-agent",
    network: process.env.PINION_NETWORK || "base-sepolia",
    storage,
    timestamp: new Date().toISOString(),
  });
});

// ── Skills ────────────────────────────────────────────────────────────────────

app.get("/price/:token", priceHandler);
app.get("/balance/:address", balanceHandler);
app.post("/chat", chatHandler);
app.get("/tx/:hash", txHandler);
app.get("/wallet/generate", walletHandler);
app.post("/send", sendHandler);
app.post("/broadcast", broadcastHandler);
app.post("/trade", tradeHandler);
app.get("/fund/:address", fundHandler);

// ── Catalog (free discovery endpoint) ────────────────────────────────────────

app.get("/catalog", (_req, res) => {
  res.json({
    server: "pinion-signal-agent",
    network: process.env.PINION_NETWORK || "base-sepolia",
    skills: [
      { endpoint: "/price/:token", method: "GET", price: "$0.01", description: "Get USD price for ETH, WETH, CBETH, USDC, DAI, USDT" },
      { endpoint: "/balance/:address", method: "GET", price: "$0.01", description: "Get ETH and USDC balances for any address" },
      { endpoint: "/chat", method: "POST", price: "$0.01", description: "Chat with Gemini AI analyst" },
      { endpoint: "/tx/:hash", method: "GET", price: "$0.01", description: "Get decoded transaction details" },
      { endpoint: "/wallet/generate", method: "GET", price: "$0.01", description: "Generate a fresh wallet keypair" },
      { endpoint: "/send", method: "POST", price: "$0.01", description: "Construct unsigned ETH or USDC transfer tx" },
      { endpoint: "/broadcast", method: "POST", price: "$0.01", description: "Sign and broadcast a transaction" },
      { endpoint: "/trade", method: "POST", price: "$0.01", description: "Construct unsigned swap transaction" },
      { endpoint: "/fund/:address", method: "GET", price: "$0.01", description: "Get wallet balance and funding instructions" },
      { endpoint: "/signal/:token", method: "GET", price: "$0.05", description: "Get AI-powered market signal for a token" },
      { endpoint: "/report/:token", method: "GET", price: "$0.10", description: "Get full AI analysis report for a token" },
      { endpoint: "/watchlist", method: "GET", price: "$0.03", description: "Get signals for all tracked tokens" },
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── Storage Test Endpoints (remove after testing) ─────────────────────────────

app.post("/test/price", (req, res) => {
  writePriceEntry({
    token: req.body.token || "ETH",
    priceUSD: req.body.priceUSD || 2650.00,
    change24h: req.body.change24h || "+1.23%",
    source: "test",
    timestamp: new Date().toISOString(),
  });
  res.json({ ok: true, history: readPriceHistory() });
});

app.post("/test/signal", (req, res) => {
  const { randomUUID } = require("crypto");
  writeSignal({
    id: randomUUID(),
    token: req.body.token || "ETH",
    signal: req.body.signal || "BUY",
    confidence: req.body.confidence || 75,
    priceAtSignal: req.body.priceAtSignal || 2650.00,
    change1h: req.body.change1h || 0.5,
    change6h: req.body.change6h || 1.2,
    change24h: req.body.change24h || 2.1,
    aiReport: req.body.aiReport || "Test AI report.",
    timestamp: new Date().toISOString(),
  });
  res.json({ ok: true, history: readSignalHistory() });
});

app.post("/test/earning", (req, res) => {
  writeEarningEntry(
    req.body.endpoint || "/signal/ETH",
    req.body.amountUSDC || 0.05,
    req.body.callerAddress || "0x1234567890abcdef1234567890abcdef12345678"
  );
  res.json({ ok: true, earnings: readEarnings() });
});

app.get("/test/data", (_req, res) => {
  res.json({
    prices: readPriceHistory(),
    signals: readSignalHistory(),
    earnings: readEarnings(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`pinion-signal-agent server running on port ${PORT}`);
  storageHealthCheck();
  console.log("[storage] all data files verified");
  console.log(`[server] ${12} skills registered`);
});

export default app;