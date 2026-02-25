"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface WalletHealthProps {
  walletAddress: string;
}

interface Balance {
  ETH: string;
  USDC: string;
}

export function WalletHealth({ walletAddress }: WalletHealthProps) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;

    const fetch_ = async () => {
      try {
        const res = await fetch(
          `/api/balance?address=${walletAddress}`
        );
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balances);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetch_();
    const interval = setInterval(fetch_, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const ethFloat = parseFloat(balance?.ETH || "0");
  const ethHealth =
    ethFloat >= 0.05 ? "good" : ethFloat >= 0.01 ? "warning" : "critical";

  const healthConfig = {
    good: { color: "text-green", label: "HEALTHY", dot: "bg-green" },
    warning: { color: "text-amber", label: "LOW ETH", dot: "bg-amber" },
    critical: { color: "text-red", label: "CRITICAL", dot: "bg-red" },
  };

  const cfg = healthConfig[ethHealth];

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-sm font-semibold text-text-primary">
          Agent Wallet
        </span>
        {!loading && balance && (
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
            <span className={cn("font-mono text-2xs", cfg.color)}>
              {cfg.label}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-border rounded w-full" />
          <div className="h-4 bg-border rounded w-3/4" />
        </div>
      ) : !balance ? (
        <p className="font-mono text-xs text-text-muted">
          Could not fetch balance
        </p>
      ) : (
        <>
          {/* balances */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between p-2 rounded border border-border bg-background">
              <span className="font-mono text-xs text-text-muted">ETH</span>
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  ethHealth === "good"
                    ? "text-text-primary"
                    : ethHealth === "warning"
                    ? "text-amber"
                    : "text-red"
                )}
              >
                {balance.ETH}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded border border-border bg-background">
              <span className="font-mono text-xs text-text-muted">USDC</span>
              <span className="font-mono text-xs font-medium text-text-primary">
                {balance.USDC}
              </span>
            </div>
          </div>

          {/* address */}
          <div className="p-2 rounded border border-border bg-background">
            <p className="font-mono text-2xs text-text-muted mb-1">Address</p>
            <p className="font-mono text-2xs text-text-secondary truncate">
              {walletAddress}
            </p>
          </div>

          {/* basescan link */}
<a
  href={`https://sepolia.basescan.org/address/${walletAddress}#tokentxns`}
  target="_blank"
  rel="noopener noreferrer"
  className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded border border-border hover:border-green/40 hover:text-green transition-colors"
>
  <span className="font-mono text-2xs text-text-secondary hover:text-green">
    View on Basescan ↗
  </span>
</a>
        </>
      )}
    </div>
  );
}