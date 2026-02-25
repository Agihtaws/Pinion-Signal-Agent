"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface EarningEntry {
  id: string;
  endpoint: string;
  amountUSDC: number;
  callerAddress: string;
  timestamp: string;
}

interface Earnings {
  totalEarned: number;
  earnedToday: number;
  totalCalls: number;
  callsToday: number;
  entries: EarningEntry[];
}

interface EarningsWidgetProps {
  earnings: Earnings | null;
  loading?: boolean;
}

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const diff = value - display;
    if (Math.abs(diff) < 0.001) return;
    const steps = 20;
    const increment = diff / steps;
    let count = 0;
    const timer = setInterval(() => {
      setDisplay((prev) => {
        count++;
        if (count >= steps) {
          clearInterval(timer);
          return value;
        }
        return prev + increment;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}{display.toFixed(4)}
    </span>
  );
}

export function EarningsWidget({ earnings, loading }: EarningsWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-24 bg-border rounded mb-4" />
        <div className="h-8 w-32 bg-border rounded mb-2" />
        <div className="h-3 w-20 bg-border rounded" />
      </div>
    );
  }

  const data = earnings || {
    totalEarned: 0,
    earnedToday: 0,
    totalCalls: 0,
    callsToday: 0,
    entries: [],
  };

  const recentEntries = data.entries.slice(0, 5);

  return (
    <div className="rounded-lg border border-green/20 bg-surface p-4 card-glow-green">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-sm font-semibold text-text-primary">
          Earnings
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green/10 border border-green/20">
          <div className="w-1 h-1 rounded-full bg-green animate-pulse" />
          <span className="font-mono text-2xs text-green">EARNING</span>
        </div>
      </div>

      {/* total earned */}
      <div className="mb-4">
        <p className="font-mono text-2xs text-text-muted mb-1">All Time</p>
        <p className="font-mono text-2xl font-semibold text-green">
          <AnimatedNumber value={data.totalEarned} prefix="$" />
          <span className="text-sm text-text-muted ml-1">USDC</span>
        </p>
      </div>

      {/* today */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded border border-border bg-background">
          <p className="font-mono text-2xs text-text-muted mb-1">Today</p>
          <p className="font-mono text-sm font-medium text-green">
            ${data.earnedToday.toFixed(4)}
          </p>
        </div>
        <div className="p-2 rounded border border-border bg-background">
          <p className="font-mono text-2xs text-text-muted mb-1">Calls</p>
          <p className="font-mono text-sm font-medium text-text-primary">
            {data.totalCalls}
            <span className="text-2xs text-text-muted ml-1">total</span>
          </p>
        </div>
      </div>

      {/* recent entries */}
      <div className="space-y-0">
        <p className="font-mono text-2xs text-text-muted mb-2">Recent</p>
        {recentEntries.length === 0 ? (
          <p className="font-mono text-2xs text-text-muted">
            No earnings yet — share your API!
          </p>
        ) : (
          recentEntries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
            >
              <span className="font-mono text-2xs text-text-secondary truncate max-w-[120px]">
                {e.endpoint}
              </span>
              <span className="font-mono text-2xs text-green font-medium">
                +${e.amountUSDC}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}