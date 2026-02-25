// skills/broadcast.ts

import type { Request, Response } from "express";
import { ethers } from "ethers";
import type { BroadcastSkillData } from "../shared/types";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_MAINNET_CHAIN_ID = 8453;

export async function broadcastHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { tx, privateKey } = req.body;

    if (!tx || !privateKey) {
      res.status(400).json({
        error: "missing required fields: tx, privateKey",
        note: "get an unsigned tx from the send or trade skill first",
      });
      return;
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      res.status(400).json({
        error: "invalid private key format",
        note: "must be 0x followed by 64 hex characters",
      });
      return;
    }

    if (!tx.to) {
      res.status(400).json({ error: "tx must include a to address" });
      return;
    }

    const network = process.env.PINION_NETWORK || "base-sepolia";
    const isMainnet = network === "base";
    const rpcUrl = isMainnet ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC;
    const chainId = isMainnet ? BASE_MAINNET_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`[broadcast] signing tx from ${wallet.address} on ${network}`);

    const txRequest: ethers.TransactionRequest = {
      to: tx.to,
      value: tx.value || "0x0",
      data: tx.data || "0x",
      chainId,
    };

    if (tx.gasLimit) txRequest.gasLimit = tx.gasLimit;

    const sentTx = await wallet.sendTransaction(txRequest);

    const explorerBase = isMainnet
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

    const response: BroadcastSkillData = {
      txHash: sentTx.hash,
      explorerUrl: `${explorerBase}/tx/${sentTx.hash}`,
      from: wallet.address,
      to: tx.to,
      network,
      status: "submitted",
      note: "Transaction submitted. Check explorerUrl to confirm it.",
      timestamp: new Date().toISOString(),
    };

    console.log(`[broadcast] tx submitted: ${sentTx.hash}`);
    res.json(response);
  } catch (err: any) {
    console.error("[broadcast] error:", err.message);

    let userMessage = "failed to broadcast transaction";
    if (err.message?.includes("insufficient funds")) {
      userMessage = "insufficient ETH for gas fees";
    } else if (err.message?.includes("nonce")) {
      userMessage = "nonce conflict — a pending transaction may be stuck";
    } else if (err.message?.includes("invalid private key")) {
      userMessage = "invalid private key provided";
    }

    res.status(500).json({ error: userMessage, details: err.message });
  }
}