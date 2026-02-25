"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { SignalCard } from "@/components/SignalCard";
import { PriceChart } from "@/components/PriceChart";
import { AgentFeed } from "@/components/AgentFeed";
import { EarningsWidget } from "@/components/EarningsWidget";
import { WalletHealth } from "@/components/WalletHealth";
import { LiveTicker } from "@/components/LiveTicker";

const AGENT_WALLET = process.env.NEXT_PUBLIC_AGENT_WALLET || "";
const TOKENS = ["ETH", "WETH", "CBETH"];

// Fixed the Signal interface: the SignalCard component expects change fields to be strings
interface Signal {
  token: string;
  signal: "BUY" | "HOLD" | "SELL";
  confidence: number;
  priceAtSignal: number;
  change1h: string;
  change6h: string;
  change24h: string;
  aiReport: string;
  timestamp: string;
}

interface SignalHistory {
  token: string;
  signals: Signal[];
}

interface PriceHistory {
  token: string;
  entries: any[];
}

interface AgentRun {
  id: string;
  status: "success" | "failed" | "partial";
  tokensProcessed: string[];
  signalsGenerated: number;
  durationMs: number;
  aiCallsMade: number;
  timestamp: string;
}

interface Earnings {
  totalEarned: number;
  earnedToday: number;
  totalCalls: number;
  callsToday: number;
  entries: any[];
}

export default function Dashboard() {
  const [signals, setSignals] = useState<SignalHistory[]>([]);
  const [prices, setPrices] = useState<PriceHistory[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [sigRes, priceRes, earnRes, runRes] = await Promise.all([
        fetch("/api/signals"),
        fetch("/api/prices"),
        fetch("/api/earnings"),
        fetch("/api/runs"),
      ]);

      const [sigData, priceData, earnData, runData] = await Promise.all([
        sigRes.json(),
        priceRes.json(),
        earnRes.json(),
        runRes.json(),
      ]);

      setSignals(sigData);
      setPrices(priceData);
      setEarnings(earnData);
      setRuns(runData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  function getLatestSignal(token: string): Signal | null {
    const history = signals.find((s) => s.token === token);
    return (history?.signals?.[0] as Signal) || null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* grid background */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none" />

      <Header />

      {/* live ticker below header */}
      <LiveTicker prices={prices} signals={signals} />

      <main className="relative z-10 max-w-screen-xl mx-auto px-4 py-6">
        {/* page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">
              Signal Dashboard
            </h1>
            <p className="font-mono text-2xs text-text-muted mt-0.5">
              Autonomous AI signals — updated every 30 minutes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="font-mono text-2xs text-text-muted">
              Refreshed {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* API endpoints banner */}
        <div className="mb-6 p-3 rounded-lg border border-blue/20 bg-blue/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-1 rounded-full bg-blue" />
            <span className="font-mono text-2xs text-blue">
              x402 PAID ENDPOINTS
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { path: "/signal/ETH", price: "0.05 dollars" },
              { path: "/report/ETH", price: "0.10 dollars" },
              { path: "/watchlist", price: "0.03 dollars" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-1.5">
                <code className="font-mono text-2xs text-text-secondary bg-surface px-2 py-0.5 rounded border border-border">
                  {ep.path}
                </code>
                <span className="font-mono text-2xs text-amber">
                  {ep.price}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* signal cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {TOKENS.map((token) => (
            <SignalCard
              key={token}
              token={token}
              signal={getLatestSignal(token)}
              loading={loading}
            />
          ))}
        </div>

        {/* main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* left col — chart + feed */}
          <div className="lg:col-span-2 space-y-4">
            <PriceChart prices={prices} loading={loading} />
            <AgentFeed runs={runs} signals={signals} loading={loading} />
          </div>

          {/* right col */}
          <div className="space-y-4">
            <EarningsWidget earnings={earnings} loading={loading} />
            <WalletHealth
              walletAddress={
                AGENT_WALLET ||
                "0x63eea403e3075D9e6b5eA18c28021e6FfdD04a67"
              }
            />
          </div>
        </div>

        {/* footer */}
        <footer className="mt-8 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xs text-text-muted">
              Built on PinionOS x402
            </span>
            <span className="font-mono text-2xs text-text-muted">·</span>
            <span className="font-mono text-2xs text-text-muted">
              Base Sepolia
            </span>
          </div>

          <a
            href="https://github.com/chu2bard/pinion-os"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-2xs text-text-muted hover:text-green transition-colors"
          >
            PinionOS GitHub ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
