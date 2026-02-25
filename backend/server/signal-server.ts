// server/signal-server.ts
// x402 paywalled signal server built directly with express and x402-express
// identical to what createSkillServer does internally
// runs on port 4021 — the EARNING side of the agent

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { signalHandler } from "./skills/signal";
import { reportHandler } from "./skills/report";
import { watchlistHandler } from "./skills/watchlist";

const PAY_TO = process.env.SKILL_SERVER_PAY_TO;
const NETWORK = process.env.PINION_NETWORK || "base-sepolia";
const SIGNAL_PORT = parseInt(process.env.SIGNAL_SERVER_PORT || "4021", 10);
const FACILITATOR_URL = "https://facilitator.payai.network";

if (!PAY_TO) {
  console.error(
    "[signal-server] ERROR: SKILL_SERVER_PAY_TO is not set in .env"
  );
  process.exit(1);
}

const app = express();
app.use(express.json());

// ── CORS for x402 preflight ───────────────────────────────────────────────────

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, X-PAYMENT, Accept"
  );
  res.header("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ── x402 Payment Middleware ───────────────────────────────────────────────────

let paymentMiddleware: any = null;

try {
  const x402 = require("x402-express");
  paymentMiddleware = x402.paymentMiddleware;
  console.log("[signal-server] x402-express loaded successfully");
} catch (err) {
  console.error("[signal-server] x402-express not found:", err);
  process.exit(1);
}

// define routes and prices for x402 middleware
// x402-express uses bracket notation [param] not colon notation :param
const routes: Record<string, any> = {
  "GET /signal/[token]": {
    price: "$0.05",
    network: NETWORK,
    config: {
      description:
        "AI-powered market signal (BUY/HOLD/SELL) with confidence score",
    },
  },
  "GET /report/[token]": {
    price: "$0.10",
    network: NETWORK,
    config: {
      description: "Full AI-generated market analysis report for a token",
    },
  },
  "GET /watchlist": {
    price: "$0.03",
    network: NETWORK,
    config: {
      description: "Signals for all tracked tokens in one call",
    },
  },
};

// apply x402 middleware to all routes
app.use(
  paymentMiddleware(PAY_TO, routes, {
    url: FACILITATOR_URL,
  })
);

// ── Free Endpoints ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    server: "pinion-signal-agent-x402",
    network: NETWORK,
    payTo: PAY_TO,
    skills: [
      { endpoint: "/signal/:token", price: "$0.05" },
      { endpoint: "/report/:token", price: "$0.10" },
      { endpoint: "/watchlist", price: "$0.03" },
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── Paid Skill Routes ─────────────────────────────────────────────────────────

app.get("/signal/:token", signalHandler);
app.get("/report/:token", reportHandler);
app.get("/watchlist", watchlistHandler);

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(SIGNAL_PORT, () => {
  console.log(
    `[signal-server] x402 paywalled server running on port ${SIGNAL_PORT}`
  );
  console.log(`[signal-server] paying to: ${PAY_TO}`);
  console.log(`[signal-server] network:   ${NETWORK}`);
  console.log(`[signal-server] facilitator: ${FACILITATOR_URL}`);
  console.log(
    `[signal-server] skills: signal ($0.05) report ($0.10) watchlist ($0.03)`
  );
});