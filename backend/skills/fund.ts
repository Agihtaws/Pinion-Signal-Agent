// skills/fund.ts
// returns wallet balances and step by step funding instructions

import type { Request, Response } from "express";
import { fetchBalance } from "./balance";
import type { FundSkillData } from "../shared/types";

export async function fundHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const address = (req.params.address as string).trim();

    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      res.status(400).json({
        error: "invalid ethereum address",
      });
      return;
    }

    const network = process.env.PINION_NETWORK || "base-sepolia";
    const chainId = network === "base" ? 8453 : 84532;
    const isMainnet = network === "base";

    console.log(`[fund] checking funding status for ${address.slice(0, 10)}...`);

    const balances = await fetchBalance(address);

    if (!balances) {
      res.status(500).json({ error: "failed to fetch wallet balances" });
      return;
    }

    const steps = isMainnet
      ? [
          "Buy ETH on Coinbase, Binance, or any exchange",
          "Withdraw ETH to your address on the Base network (not Ethereum mainnet)",
          "Swap some ETH to USDC using the trade skill or any DEX",
          "ETH covers gas fees, USDC covers x402 skill payments at $0.01 each",
        ]
      : [
          "Get free testnet ETH from https://faucet.quicknode.com/base/sepolia",
          "Get free testnet USDC from https://faucet.circle.com (select Base Sepolia)",
          "Testnet tokens are free and work identically to mainnet for testing",
          "Switch PINION_NETWORK=base in .env when ready for mainnet",
        ];

    const response: FundSkillData = {
      address,
      network,
      chainId,
      balances,
      depositAddress: address,
      funding: {
        steps,
        minimumRecommended: {
          ETH: isMainnet
            ? "0.005 ETH (for gas fees)"
            : "0.1 Sepolia ETH (from faucet)",
          USDC: isMainnet
            ? "1.00 USDC (for ~100 skill calls at $0.01 each)"
            : "10 testnet USDC (from Circle faucet)",
        },
        bridgeUrl: isMainnet
          ? "https://bridge.base.org"
          : "https://faucet.quicknode.com/base/sepolia",
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[fund] ${address.slice(0, 10)}... ETH: ${balances.ETH} USDC: ${balances.USDC}`
    );

    res.json(response);
  } catch (err: any) {
    console.error("[fund] error:", err.message);
    res.status(500).json({
      error: "failed to fetch funding info",
      details: err.message,
    });
  }
}