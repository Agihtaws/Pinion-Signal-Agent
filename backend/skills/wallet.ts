// skills/wallet.ts

import type { Request, Response } from "express";
import { ethers } from "ethers";
import type { WalletSkillData } from "../shared/types";

export async function walletHandler(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const network = process.env.PINION_NETWORK || "base-sepolia";
    const chainId = network === "base" ? 8453 : 84532;

    console.log(`[wallet] generating new keypair for ${network}`);

    // generate cryptographically secure random wallet
    const wallet = ethers.Wallet.createRandom();

    const response: WalletSkillData = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      network,
      chainId,
      note: "Fund this wallet with ETH for gas and USDC for payments. Store the private key safely — it will not be shown again.",
      timestamp: new Date().toISOString(),
    };

    console.log(`[wallet] generated address: ${wallet.address}`);
    res.json(response);
  } catch (err: any) {
    console.error("[wallet] error:", err.message);
    res.status(500).json({
      error: "failed to generate wallet",
      details: err.message,
    });
  }
}

// standalone generator used by agent internally
export function generateWallet(): {
  address: string;
  privateKey: string;
} {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}