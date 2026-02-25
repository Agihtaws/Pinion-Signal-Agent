// skills/balance.ts
// fetches real ETH and USDC balances from Base Sepolia RPC
// uses direct JSON-RPC calls, no third party library needed

import type { Request, Response } from "express";
import type { BalanceSkillData } from "../shared/types";

// ── Constants ─────────────────────────────────────────────────────────────────

// Base Sepolia RPC endpoint (free, no API key needed)
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_MAINNET_RPC = "https://mainnet.base.org";

// USDC contract addresses
const USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// balanceOf(address) function selector
const BALANCE_OF_SELECTOR = "0x70a08231";

// ── RPC Helper ────────────────────────────────────────────────────────────────

async function rpcCall(
  rpcUrl: string,
  method: string,
  params: any[]
): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as any;

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }

  return json.result;
}

// ── Balance Fetchers ──────────────────────────────────────────────────────────

async function getEthBalance(
  address: string,
  rpcUrl: string
): Promise<string> {
  const hexBalance = await rpcCall(rpcUrl, "eth_getBalance", [
    address,
    "latest",
  ]);
  const wei = BigInt(hexBalance);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

async function getUsdcBalance(
  address: string,
  rpcUrl: string,
  usdcAddress: string
): Promise<string> {
  // pad address to 32 bytes for ABI encoding
  const paddedAddress = address.slice(2).toLowerCase().padStart(64, "0");
  const callData = BALANCE_OF_SELECTOR + paddedAddress;

  const hexBalance = await rpcCall(rpcUrl, "eth_call", [
    {
      to: usdcAddress,
      data: callData,
    },
    "latest",
  ]);

  // USDC has 6 decimals
  const raw = BigInt(hexBalance);
  const usdc = Number(raw) / 1e6;
  return usdc.toFixed(2);
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export async function balanceHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const address = (req.params.address as string).trim();

    // validate ethereum address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      res.status(400).json({
        error: "invalid ethereum address",
        note: "address must be 0x followed by 40 hex characters",
      });
      return;
    }

    const network = process.env.PINION_NETWORK || "base-sepolia";
    const isMainnet = network === "base";
    const rpcUrl = isMainnet ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC;
    const usdcAddress = isMainnet ? USDC_MAINNET : USDC_SEPOLIA;

    console.log(`[balance] fetching balances for ${address} on ${network}`);

    // fetch both balances in parallel
    const [ethBalance, usdcBalance] = await Promise.all([
      getEthBalance(address, rpcUrl),
      getUsdcBalance(address, rpcUrl, usdcAddress),
    ]);

    const response: BalanceSkillData = {
      address,
      network,
      balances: {
        ETH: ethBalance,
        USDC: usdcBalance,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[balance] ${address.slice(0, 10)}... ` +
      `ETH: ${ethBalance} USDC: ${usdcBalance}`
    );

    res.json(response);
  } catch (err: any) {
    console.error("[balance] error:", err.message);
    res.status(500).json({
      error: "failed to fetch balance",
      details: err.message,
    });
  }
}

// ── Standalone Fetcher (used by agent internally) ─────────────────────────────

export async function fetchBalance(address: string): Promise<{
  ETH: string;
  USDC: string;
} | null> {
  try {
    const network = process.env.PINION_NETWORK || "base-sepolia";
    const isMainnet = network === "base";
    const rpcUrl = isMainnet ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC;
    const usdcAddress = isMainnet ? USDC_MAINNET : USDC_SEPOLIA;

    const [ethBalance, usdcBalance] = await Promise.all([
      getEthBalance(address, rpcUrl),
      getUsdcBalance(address, rpcUrl, usdcAddress),
    ]);

    return { ETH: ethBalance, USDC: usdcBalance };
  } catch (err: any) {
    console.error("[balance] standalone fetch error:", err.message);
    return null;
  }
}