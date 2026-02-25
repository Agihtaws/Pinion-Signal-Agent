"use client";

import { cn } from "@/lib/utils";

interface Signal {
  token: string;
  signal: "BUY" | "HOLD" | "SELL";
  confidence: number;
  priceAtSignal: number;
  change1h: number;
  change6h: number;
  change24h: number;
  aiReport: string;
  timestamp: string;
}

interface SignalCardProps {
  signal: Signal | null;
  token: string;
  loading?: boolean;
}

const SIGNAL_CONFIG = {
  BUY: {
    color: "text-green",
    bg: "bg-green/10",
    border: "border-green/20",
    glow: "card-glow-green",
    bar: "bg-green",
    dot: "bg-green",
  },
  HOLD: {
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/20",
    glow: "card-glow-amber",
    bar: "bg-amber",
    dot: "bg-amber",
  },
  SELL: {
    color: "text-red",
    bg: "bg-red/10",
    border: "border-red/20",
    glow: "card-glow-red",
    bar: "bg-red",
    dot: "bg-red",
  },
};

function ChangeChip({ value }: { value: number }) {
  const isPos = value >= 0;
  return (
    <span className={cn("font-mono text-2xs px-1.5 py-0.5 rounded", isPos ? "text-green bg-green/10" : "text-red bg-red/10")}>
      {isPos ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export function SignalCard({ signal, token, loading }: SignalCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-16 bg-border rounded mb-3" />
        <div className="h-8 w-24 bg-border rounded mb-2" />
        <div className="h-3 w-32 bg-border rounded" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-2xs text-text-muted">{token}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
        </div>
        <p className="font-mono text-xs text-text-muted">
          Waiting for agent...
        </p>
      </div>
    );
  }

  const config = SIGNAL_CONFIG[signal.signal];
  const timeAgo = Math.round(
    (Date.now() - new Date(signal.timestamp).getTime()) / 60000
  );

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 transition-all duration-300",
        config.border,
        config.glow,
        "animate-slide-up"
      )}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
          <span className="font-mono text-xs font-medium text-text-primary">
            {signal.token}
          </span>
        </div>
        <span className="font-mono text-2xs text-text-muted">
          {timeAgo}m ago
        </span>
      </div>

      {/* price */}
      <div className="mb-3">
        <span className="font-mono text-2xl font-semibold text-text-primary">
          USD {signal.priceAtSignal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      {/* signal badge */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={cn(
            "font-mono text-lg font-bold tracking-wider",
            config.color
          )}
        >
          {signal.signal}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-2xs text-text-muted">
              confidence
            </span>
            <span className={cn("font-mono text-2xs font-medium", config.color)}>
              {signal.confidence}%
            </span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", config.bar)}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* changes */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-2xs text-text-muted">1h</span>
        <ChangeChip value={signal.change1h} />
        <span className="font-mono text-2xs text-text-muted">6h</span>
        <ChangeChip value={signal.change6h} />
        <span className="font-mono text-2xs text-text-muted">24h</span>
        <ChangeChip value={signal.change24h} />
      </div>

      {/* ai report */}
      <p className="font-body text-xs text-text-secondary leading-relaxed line-clamp-3">
        {signal.aiReport}
      </p>
    </div>
  );
}
