// skills/send.ts
// constructs an unsigned ETH or USDC transfer transaction
// returns the raw tx object for client to sign and broadcast

import type { Request, Response } from "express";
import { ethers } from "ethers";
import type { SendSkillData, UnsignedTx } from "../shared/types";

// USDC contract addresses
const USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// ERC20 transfer(address,uint256) selector
const TRANSFER_SELECTOR = "0xa9059cbb";

function buildUsdcTransferData(to: string, amount: string): string {
  // amount is human readable e.g. "10" means 10 USDC = 10_000_000 atomic
  const atomic = BigInt(Math.round(parseFloat(amount) * 1e6));
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = atomic.toString(16).padStart(64, "0");
  return TRANSFER_SELECTOR + paddedTo + paddedAmount;
}

export async function sendHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { to, amount, token } = req.body;

    // validate inputs
    if (!to || !amount || !token) {
      res.status(400).json({
        error: "missing required fields: to, amount, token",
        example: { to: "0x...", amount: "0.1", token: "ETH" },
      });
      return;
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
      res.status(400).json({ error: "invalid recipient address" });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: "amount must be a positive number" });
      return;
    }

    if (!["ETH", "USDC"].includes(token.toUpperCase())) {
      res.status(400).json({
        error: "unsupported token",
        supported: ["ETH", "USDC"],
      });
      return;
    }

    const network = process.env.PINION_NETWORK || "base-sepolia";
    const chainId = network === "base" ? 8453 : 84532;
    const usdcAddress = network === "base" ? USDC_MAINNET : USDC_SEPOLIA;

    let tx: UnsignedTx;

    if (token.toUpperCase() === "ETH") {
      const valueWei = ethers.parseEther(amount);
      tx = {
        to,
        value: "0x" + valueWei.toString(16),
        data: "0x",
        chainId,
      };
    } else {
      // USDC transfer via ERC20 contract
      tx = {
        to: usdcAddress,
        value: "0x0",
        data: buildUsdcTransferData(to, amount),
        chainId,
      };
    }

    const response: SendSkillData = {
      tx,
      token: token.toUpperCase(),
      amount,
      network,
      note: "Sign this transaction with your private key and use the broadcast skill to execute it.",
      timestamp: new Date().toISOString(),
    };

    console.log(`[send] built ${token.toUpperCase()} tx: ${amount} to ${to.slice(0, 10)}...`);
    res.json(response);
  } catch (err: any) {
    console.error("[send] error:", err.message);
    res.status(500).json({
      error: "failed to construct transaction",
      details: err.message,
    });
  }
}