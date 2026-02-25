# Pinion Signal Agent

> Autonomous AI crypto signal agent built on PinionOS. Earns USDC selling intelligence. Runs forever without human involvement.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Frontend-00d4a0?style=flat-square)](YOUR_VERCEL_URL_HERE)
[![Backend](https://img.shields.io/badge/Backend-Render-f5a623?style=flat-square)](YOUR_RENDER_URL_HERE)
[![Demo Video](https://img.shields.io/badge/Demo-YouTube-ff4d6d?style=flat-square)](YOUR_YOUTUBE_URL_HERE)
[![Built on PinionOS](https://img.shields.io/badge/Built%20on-PinionOS-4d9eff?style=flat-square)](https://github.com/chu2bard/pinion-os)
[![Network](https://img.shields.io/badge/Network-Base%20Sepolia-blue?style=flat-square)](https://sepolia.basescan.org)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-white?style=flat-square)](https://github.com/Agihtaws/Pinion-Signal-Agent)

---

## What Is This?

Pinion Signal Agent is autonomous software that wakes up every 30 minutes, fetches real crypto prices from CoinGecko, asks Gemini AI what it thinks, generates BUY / HOLD / SELL signals with confidence scores, and sells that intelligence to anyone who pays USDC — all without any human involvement after the first deployment.

Built entirely on the [pinion-os](https://github.com/chu2bard/pinion-os) npm package using the x402 micropayment protocol on Base Sepolia.

---

## Live Links

| Resource | URL |
|---|---|
| Frontend Dashboard | [YOUR_VERCEL_URL_HERE](YOUR_VERCEL_URL_HERE) |
| Backend Skill Server | [YOUR_RENDER_URL_HERE](YOUR_RENDER_URL_HERE) |
| Signal Server x402 | [YOUR_RENDER_SIGNAL_URL_HERE](YOUR_RENDER_SIGNAL_URL_HERE) |
| Demo Video | [YouTube](YOUR_YOUTUBE_URL_HERE) |
| GitHub | [Pinion-Signal-Agent](https://github.com/Agihtaws/Pinion-Signal-Agent) |
| Wallet on Basescan | [View Transactions](https://sepolia.basescan.org/address/YOUR_WALLET_ADDRESS_HERE#tokentxns) |

---

## How It Works

```
Every 30 minutes (fully autonomous)
─────────────────────────────────────

  Agent wakes up via node-cron
         │
         ▼
  Fetches ETH, WETH, CBETH prices
  from CoinGecko (free, no API key)
         │
         ▼
  Calculates 1h, 6h, 24h price changes
  Runs score-based signal logic
         │
         ▼
  Calls Gemini AI for analysis report
         │
         ▼
  Blends logic signal + AI signal
  Saves BUY / HOLD / SELL to JSON
         │
         ▼
  Repeats for WETH and CBETH

When someone calls your paid API
─────────────────────────────────────

  Caller hits /signal/ETH
         │
         ▼
  x402 middleware returns 402
  with payment requirements
         │
  Caller pays $0.05 USDC on Base
         │
         ▼
  Facilitator verifies on-chain
  at facilitator.payai.network
         │
         ▼
  Real signal data returned
  Earning logged to earnings.json
```

---

## Paid API Endpoints

All endpoints run on the signal server and require x402 USDC payment on Base Sepolia.

| Endpoint | Method | Price | Description |
|---|---|---|---|
| `/signal/:token` | GET | $0.05 USDC | Latest BUY/HOLD/SELL signal with confidence score |
| `/report/:token` | GET | $0.10 USDC | Full Gemini AI analysis report with signal history |
| `/watchlist` | GET | $0.03 USDC | Signals for all three tokens in one call |

Supported tokens: `ETH` `WETH` `CBETH`

### Example — Pay and Get Signal

```typescript
import { PinionClient, payX402Service } from "pinion-os";

const client = new PinionClient({
  privateKey: "0xYOUR_PRIVATE_KEY",
  network: "base-sepolia",
});

const result = await payX402Service(
  client.signer,
  "YOUR_RENDER_SIGNAL_URL_HERE/signal/ETH",
  { method: "GET", maxAmount: "100000" }
);

console.log(result.data);
// {
//   token: "ETH",
//   signal: "BUY",
//   confidence: 78,
//   priceAtSignal: 1825.42,
//   change1h: 0.5,
//   change6h: 1.2,
//   change24h: 2.1,
//   generatedAt: "2026-02-25T..."
// }
```

---

## Free Skill Endpoints

These require no payment. Used by the agent internally and the frontend dashboard.

| Endpoint | Description |
|---|---|
| `GET /health` | Server health and storage status |
| `GET /catalog` | Full skill catalog with prices |
| `GET /price/:token` | Current USD price from CoinGecko |
| `GET /balance/:address` | ETH and USDC balances from Base RPC |
| `POST /chat` | Chat with Gemini AI analyst |
| `GET /tx/:hash` | Decoded transaction details |
| `GET /wallet/generate` | Generate a fresh keypair |
| `POST /send` | Construct unsigned ETH or USDC transfer |
| `POST /broadcast` | Sign and broadcast a transaction |
| `POST /trade` | Construct unsigned swap transaction |
| `GET /fund/:address` | Wallet balance and funding instructions |

---

## PinionOS Integration

Features used from the [pinion-os](https://github.com/chu2bard/pinion-os) npm package:

| Feature | How We Use It |
|---|---|
| `PinionClient` | Wallet management and x402 payment signing |
| `payX402Service` | Pays any x402 endpoint — handles 402, signs USDC, retries |
| `x402-express` middleware | Server-side payment verification and on-chain USDC settlement |
| x402 v1 protocol | EIP-3009 USDC authorization with nonce and time windows |
| Skills architecture | All 9 skill handlers mirror the PinionOS skills pattern exactly |
| Base Sepolia RPC | Direct JSON-RPC calls for balance and transaction data |
| Facilitator | Payments verified at `https://facilitator.payai.network` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Agent Scheduler | `node-cron` |
| Backend Framework | `Express.js` |
| Payment Infrastructure | `pinion-os` + `x402-express` |
| AI Analysis | `Gemini 2.0 Flash` (free tier) |
| Price Data | `CoinGecko API` (free, no key needed) |
| Blockchain | Base Sepolia testnet |
| Settlement Token | USDC (ERC-20) |
| Frontend | `Next.js 14` + `Tailwind CSS v3` |
| Charts | `Recharts` |
| Wallet Connect | `RainbowKit` + `Wagmi v2` |
| Backend Hosting | `Render` (free tier) |
| Frontend Hosting | `Vercel` (free tier) |

---

## Project Structure

```
Pinion-Signal-Agent/
│
├── backend/
│   ├── agent/
│   │   ├── index.ts          # node-cron scheduler — runs every 30 min
│   │   ├── analyzer.ts       # fetches prices + calls Gemini
│   │   ├── signals.ts        # BUY/HOLD/SELL scoring logic
│   │   └── storage.ts        # JSON file read/write layer
│   │
│   ├── data/
│   │   ├── prices.json       # price history (48 entries = 24h)
│   │   ├── signals.json      # signal history per token
│   │   ├── earnings.json     # USDC earnings log
│   │   └── runs.json         # agent run history
│   │
│   ├── server/
│   │   ├── index.ts          # free skill server (port 4020)
│   │   ├── signal-server.ts  # x402 paid server (port 4021)
│   │   ├── earnings.ts       # payment decoder + earnings logger
│   │   └── skills/
│   │       ├── signal.ts     # /signal/:token — $0.05 USDC
│   │       ├── report.ts     # /report/:token — $0.10 USDC
│   │       └── watchlist.ts  # /watchlist    — $0.03 USDC
│   │
│   ├── skills/
│   │   ├── price.ts          # CoinGecko price fetcher
│   │   ├── chat.ts           # Gemini AI integration
│   │   ├── balance.ts        # Base RPC balance checker
│   │   ├── tx.ts             # transaction decoder
│   │   ├── wallet.ts         # keypair generator
│   │   ├── send.ts           # unsigned transfer builder
│   │   ├── trade.ts          # unsigned swap builder
│   │   ├── broadcast.ts      # sign and broadcast tx
│   │   └── fund.ts           # funding instructions
│   │
│   ├── shared/
│   │   └── types.ts          # all TypeScript interfaces
│   │
│   ├── main.ts               # starts all 3 processes together
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── balance/route.ts
│   │   │   │   ├── earnings/route.ts
│   │   │   │   ├── health/route.ts
│   │   │   │   ├── prices/route.ts
│   │   │   │   ├── runs/route.ts
│   │   │   │   └── signals/route.ts
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── AgentFeed.tsx
│   │   │   ├── EarningsWidget.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LiveTicker.tsx
│   │   │   ├── PriceChart.tsx
│   │   │   ├── Providers.tsx
│   │   │   ├── SignalCard.tsx
│   │   │   └── WalletHealth.tsx
│   │   └── lib/
│   │       ├── utils.ts
│   │       └── wagmi.ts
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Setup and Run Locally

### Prerequisites

- Node.js 18+
- Base Sepolia ETH — free from [faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia)
- Testnet USDC — free from [faucet.circle.com](https://faucet.circle.com) (select Base Sepolia)
- Gemini API key — free from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 1. Clone

```bash
git clone https://github.com/Agihtaws/Pinion-Signal-Agent.git
cd Pinion-Signal-Agent/backend
```

### 2. Install and Configure

```bash
npm install
cp ../.env.example .env
```

Fill in backend/.env:

```bash
PINION_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
PINION_NETWORK=base-sepolia
SKILL_SERVER_PORT=4020
SIGNAL_SERVER_PORT=4021
SKILL_SERVER_PAY_TO=0xYOUR_WALLET_ADDRESS
GEMINI_API_KEY=YOUR_GEMINI_KEY
PINION_API_URL=http://localhost:4020
AGENT_INTERVAL_MINUTES=30
```

### 3. Initialize Data Files

```bash
echo "[]" > data/prices.json
echo "[]" > data/signals.json
echo "[]" > data/runs.json
echo '{"totalEarned":0,"earnedToday":0,"earnedThisWeek":0,"totalCalls":0,"callsToday":0,"entries":[]}' > data/earnings.json
```

### 4. Run Backend

```bash
npm run dev:all
```

Starts three processes:
- Skill server on port 4020 (free endpoints)
- Signal server on port 4021 (x402 paid endpoints)
- Agent scheduler (autonomous, runs every 30 minutes)

### 5. Run Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Verify It Is Working

```bash
# agent health
curl http://localhost:4020/health

# confirm 402 on paid endpoint
curl http://localhost:4021/signal/ETH

# real price
curl http://localhost:4020/price/ETH

# all skills
curl http://localhost:4020/catalog
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PINION_PRIVATE_KEY` | Agent wallet private key | `0x...` |
| `PINION_NETWORK` | Network | `base-sepolia` |
| `SKILL_SERVER_PORT` | Free skills server port | `4020` |
| `SIGNAL_SERVER_PORT` | x402 paid server port | `4021` |
| `SKILL_SERVER_PAY_TO` | Wallet to receive USDC | `0x...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `PINION_API_URL` | Points agent at its own server | `http://localhost:4020` |
| `AGENT_INTERVAL_MINUTES` | How often agent runs | `30` |

---

## Judging Criteria

| Criterion | How We Address It |
|---|---|
| **Creativity** | Autonomous agent that generates AND sells its own crypto intelligence via x402 micropayments — zero human involvement |
| **Functionality** | Real CoinGecko prices, real Gemini analysis, real USDC payments verified on Basescan |
| **PinionOS Usage** | PinionClient, payX402Service, x402-express, skills architecture, facilitator — all used deeply |
| **Completeness** | Full stack deployed, runs forever autonomously, professional dashboard, live paid API |
| **Code Quality** | TypeScript throughout, clean architecture, proper error handling, type safety everywhere |

---

## Built for PinionOS Hackathon

- Hackathon: [PinionOS Hackathon](https://x.com/PinionOS)
- Submission Deadline: March 1, 2026
- Infrastructure: [pinion-os npm](https://www.npmjs.com/package/pinion-os)
- Network: Base Sepolia testnet

---

*Autonomous software that earns on its own — powered by PinionOS x402.*
