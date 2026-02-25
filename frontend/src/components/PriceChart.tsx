"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PriceEntry {
  token: string;
  priceUSD: number;
  timestamp: string;
}

interface PriceHistory {
  token: string;
  entries: PriceEntry[];
}

interface PriceChartProps {
  prices: PriceHistory[];
  loading?: boolean;
}

const TOKEN_COLORS: Record<string, string> = {
  ETH: "#00d4a0",
  WETH: "#f5a623",
  CBETH: "#4d9eff",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded p-2 shadow-xl">
        <p className="font-mono text-2xs text-text-muted mb-1">
          {new Date(label).toLocaleTimeString()}
        </p>
        {payload.map((p: any) => (
          <p
            key={p.name}
            className="font-mono text-xs font-medium"
            style={{ color: p.color }}
          >
            {p.name}: ${p.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PriceChart({ prices, loading }: PriceChartProps) {
  const [activeToken, setActiveToken] = useState("ETH");

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 h-64 animate-pulse">
        <div className="h-4 w-32 bg-border rounded mb-4" />
        <div className="h-48 bg-border/50 rounded" />
      </div>
    );
  }

  const tokenData = prices.find((p) => p.token === activeToken);
  const chartData = tokenData
    ? [...tokenData.entries]
        .reverse()
        .map((e) => ({
          time: e.timestamp,
          price: e.priceUSD,
        }))
    : [];

  const color = TOKEN_COLORS[activeToken] || "#00d4a0";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-text-primary">
            Price History
          </span>
          <span className="font-mono text-2xs text-text-muted">24h</span>
        </div>

        {/* token selector */}
        <div className="flex items-center gap-1">
          {["ETH", "WETH", "CBETH"].map((token) => (
            <button
              key={token}
              onClick={() => setActiveToken(token)}
              className={cn(
                "font-mono text-2xs px-2 py-1 rounded transition-all",
                activeToken === token
                  ? "text-background font-medium"
                  : "text-text-muted hover:text-text-secondary"
              )}
              style={
                activeToken === token
                  ? { backgroundColor: TOKEN_COLORS[token] }
                  : {}
              }
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* chart */}
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="font-mono text-xs text-text-muted">
            Collecting price data...
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={192}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${activeToken}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              tick={{ fontSize: 9, fill: "#4a5568", fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 9, fill: "#4a5568", fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#gradient-${activeToken})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}