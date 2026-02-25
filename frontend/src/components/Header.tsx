"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}......${address.slice(-4)}`;
}

export function Header() {
  const [time, setTime] = useState("");
  const [agentStatus, setAgentStatus] = useState<"online" | "offline">("offline");
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + " UTC");
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setAgentStatus(data.status === "ok" ? "online" : "offline");
      } catch {
        setAgentStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* left — brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                agentStatus === "online"
                  ? "bg-green animate-pulse"
                  : "bg-red"
              }`}
            />
            <span className="font-display font-semibold text-text-primary text-sm">
              PINION<span className="text-green">.</span>SIGNAL
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-surface">
            <span className="font-mono text-2xs text-text-muted">AGENT</span>
            <span
              className={`font-mono text-2xs font-medium ${
                agentStatus === "online" ? "text-green" : "text-red"
              }`}
            >
              {agentStatus.toUpperCase()}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-surface">
            <span className="font-mono text-2xs text-text-muted">NET</span>
            <span className="font-mono text-2xs text-amber font-medium">
              BASE SEPOLIA
            </span>
          </div>
        </div>

        {/* center — clock */}
        <div suppressHydrationWarning className="hidden md:block font-mono text-2xs text-text-muted">
         {time}
        </div>

        {/* right — wallet */}
        <div className="flex items-center gap-3">

          {/* show truncated address when connected */}
          {isConnected && address && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded border border-green/20 bg-green/5">
              <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              <span className="font-mono text-2xs text-green tracking-wide">
                {truncateAddress(address)}
              </span>
            </div>
          )}

          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
