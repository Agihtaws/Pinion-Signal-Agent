"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TickerItem {
  token: string;
  price: number;
  change24h: number | null;
  signal: "BUY" | "HOLD" | "SELL" | null;
}

interface PriceHistory {
  token: string;
  entries: { priceUSD: number; change24h: number | null }[];
}

interface SignalHistory {
  token: string;
  signals: { signal: "BUY" | "HOLD" | "SELL" }[];
}

const SIGNAL_COLOR = {
  BUY: "text-green",
  HOLD: "text-amber",
  SELL: "text-red",
};

export function LiveTicker({
  prices,
  signals,
}: {
  prices: PriceHistory[];
  signals: SignalHistory[];
}) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const built: TickerItem[] = ["ETH", "WETH", "CBETH"].map((token) => {
      const ph = prices.find((p) => p.token === token);
      const sh = signals.find((s) => s.token === token);
      return {
        token,
        price: ph?.entries?.[0]?.priceUSD || 0,
        change24h: ph?.entries?.[0]?.change24h ?? null,
        signal: sh?.signals?.[0]?.signal || null,
      };
    });
    setItems(built);
  }, [prices, signals]);

  // scroll animation
  useEffect(() => {
    if (items.length === 0) return;
    const interval = setInterval(() => {
      setOffset((prev) => {
        const next = prev - 1;
        // reset when fully scrolled one set
        return next < -300 ? 0 : next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [items]);

  if (items.length === 0) return null;

  // duplicate items for seamless loop
  const tickerItems = [...items, ...items, ...items];

  return (
    <div suppressHydrationWarning className="w-full overflow-hidden border-b border-border bg-surface/50 py-2">
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{ transform: `translateX(${offset}px)`, transition: "none" }}
      >
        {tickerItems.map((item, i) => (
          <div
            key={`${item.token}-${i}`}
            className="flex items-center gap-3 px-4"
          >
            {/* token */}
            <span className="font-mono text-xs font-semibold text-text-primary">
              {item.token}
            </span>

            {/* price */}
            <span className="font-mono text-xs text-text-secondary">
              {item.price > 0
                ? `USD ${item.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "—"}
            </span>

            {/* 24h change - Fixed .startsWith error by treating change24h as a number */}
            {item.change24h !== null && (
              <span
                className={cn(
                  "font-mono text-2xs",
                  item.change24h < 0
                    ? "text-red"
                    : "text-green"
                )}
              >
                {item.change24h > 0 ? "+" : ""}{item.change24h.toFixed(2)}%
              </span>
            )}

            {/* signal badge */}
            {item.signal && (
              <span
                className={cn(
                  "font-mono text-2xs font-bold px-1.5 py-0.5 rounded border",
                  item.signal === "BUY"
                    ? "text-green border-green/30 bg-green/10"
                    : item.signal === "SELL"
                    ? "text-red border-red/30 bg-red/10"
                    : "text-amber border-amber/30 bg-amber/10"
                )}
              >
                {item.signal}
              </span>
            )}

            {/* separator */}
            <span className="text-border font-mono text-xs">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
