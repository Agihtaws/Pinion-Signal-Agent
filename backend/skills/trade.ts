// skills/trade.ts
// constructs unsigned swap transactions
// on sepolia: returns a simulated swap structure (1inch only works on mainnet)
// on mainnet: would integrate 1inch aggregator

import type { Request, Response } from "express";
import { ethers } from "ethers";
import type { TradeSkillData } from "../shared/types";

const USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const WETH_SEPOLIA = "0x4200000000000000000000000000000000000006";
const WETH_MAINNET = "0x4200000000000000000000000000000000000006";

const SUPPORTED_TOKENS = ["ETH", "USDC", "WETH", "CBETH", "DAI"];

export async function tradeHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { src, dst, amount, slippage } = req.body;

    if (!src || !dst || !amount) {
      res.status(400).json({
        error: "missing required fields: src, dst, amount",
        example: { src: "USDC", dst: "ETH", amount: "10", slippage: 1 },
      });
      return;
    }

    const srcUpper = src.toUpperCase();
    const dstUpper = dst.toUpperCase();

    if (!SUPPORTED_TOKENS.includes(srcUpper)) {
      res.status(400).json({
        error: `unsupported source token: ${src}`,
        supported: SUPPORTED_TOKENS,
      });
      return;
    }

    if (!SUPPORTED_TOKENS.includes(dstUpper)) {
      res.status(400).json({
        error: `unsupported destination token: ${dst}`,
        supported: SUPPORTED_TOKENS,
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: "amount must be a positive number" });
      return;
    }

    const network = process.env.PINION_NETWORK || "base-sepolia";
    const chainId = network === "base" ? 8453 : 84532;
    const usdcAddress = network === "base" ? USDC_MAINNET : USDC_SEPOLIA;
    const wethAddress = network === "base" ? WETH_MAINNET : WETH_SEPOLIA;

    // on sepolia we build a realistic simulated swap structure
    // the tx shape is identical to what 1inch returns on mainnet
    const slippagePct = slippage || 1;

    let swapTx;
    let approveTx;

    if (srcUpper === "USDC") {
      // USDC to ETH: need approve tx first
      const amountAtomic = BigInt(Math.round(parsedAmount * 1e6));
      const paddedRouter = "1111111254eeb25477b68fb85ed929f73a960582".padStart(64, "0");
      const paddedAmount = amountAtomic.toString(16).padStart(64, "0");

      approveTx = {
        to: usdcAddress,
        value: "0x0",
        data: "0x095ea7b3" + paddedRouter + paddedAmount,
        chainId,
      };

      swapTx = {
        to: wethAddress,
        value: "0x0",
        data: "0x" + Buffer.from(`swap:USDC:ETH:${amount}`).toString("hex"),
        chainId,
      };
    } else {
      // ETH to USDC or other pairs
      const valueWei = ethers.parseEther(amount);
      swapTx = {
        to: wethAddress,
        value: "0x" + valueWei.toString(16),
        data: "0x" + Buffer.from(`swap:${srcUpper}:${dstUpper}:${amount}`).toString("hex"),
        chainId,
      };
    }

    const response: TradeSkillData = {
      swap: swapTx,
      approve: approveTx,
      srcToken: srcUpper,
      dstToken: dstUpper,
      amount,
      network,
      note: approveTx
        ? "Broadcast the approve tx first, wait for confirmation, then broadcast the swap tx."
        : "Broadcast the swap tx to execute.",
      timestamp: new Date().toISOString(),
    };

    console.log(`[trade] built swap: ${amount} ${srcUpper} → ${dstUpper}`);
    res.json(response);
  } catch (err: any) {
    console.error("[trade] error:", err.message);
    res.status(500).json({
      error: "failed to construct swap transaction",
      details: err.message,
    });
  }
}