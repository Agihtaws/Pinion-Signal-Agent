"use client";

import { cn } from "@/lib/utils";

interface AgentRun {
  id: string;
  status: "success" | "failed" | "partial";
  tokensProcessed: string[];
  signalsGenerated: number;
  durationMs: number;
  aiCallsMade: number;
  timestamp: string;
}

interface Signal {
  token: string;
  signal: "BUY" | "HOLD" | "SELL";
  confidence: number;
  timestamp: string;
}

interface SignalHistory {
  token: string;
  signals: Signal[];
}

interface AgentFeedProps {
  runs: AgentRun[];
  signals: SignalHistory[];
  loading?: boolean;
}

const STATUS_CONFIG = {
  success: { color: "text-green", bg: "bg-green/10", label: "OK" },
  partial: { color: "text-amber", bg: "bg-amber/10", label: "PARTIAL" },
  failed: { color: "text-red", bg: "bg-red/10", label: "FAIL" },
};

const SIGNAL_COLOR = {
  BUY: "text-green",
  HOLD: "text-amber",
  SELL: "text-red",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AgentFeed({ runs, signals, loading }: AgentFeedProps) {
  // flatten all signals into a single timeline
  const allSignals: (Signal & { runDuration?: number })[] = signals
    .flatMap((sh) => sh.signals)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 20);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-4 w-24 bg-border rounded mb-4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-border/50 rounded mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-sm font-semibold text-text-primary">
          Agent Activity
        </span>
        {runs.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="font-mono text-2xs text-text-muted">
              {runs.length} runs
            </span>
          </div>
        )}
      </div>

      {/* recent runs summary */}
      {runs.length > 0 && (
        <div className="mb-4 space-y-1">
          {runs.slice(0, 3).map((run) => {
            const cfg = STATUS_CONFIG[run.status];
            return (
              <div
                key={run.id}
                className="flex items-center justify-between py-1.5 px-2 rounded border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-2xs px-1 rounded",
                      cfg.color,
                      cfg.bg
                    )}
                  >
                    {cfg.label}
                  </span>
                  <span className="font-mono text-2xs text-text-secondary">
                    {run.tokensProcessed.join(" · ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xs text-text-muted">
                    {(run.durationMs / 1000).toFixed(1)}s
                  </span>
                  <span className="font-mono text-2xs text-text-muted">
                    {timeAgo(run.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* signal feed */}
      <div className="space-y-0 max-h-64 overflow-y-auto">
        {allSignals.length === 0 ? (
          <p className="font-mono text-xs text-text-muted py-4 text-center">
            Agent is warming up...
          </p>
        ) : (
          allSignals.map((s, i) => (
            <div
              key={`${s.token}-${s.timestamp}-${i}`}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs text-text-muted w-12">
                  {s.token}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    SIGNAL_COLOR[s.signal]
                  )}
                >
                  {s.signal}
                </span>
                <span className="font-mono text-2xs text-text-muted">
                  {s.confidence}%
                </span>
              </div>
              <span className="font-mono text-2xs text-text-muted">
                {timeAgo(s.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}