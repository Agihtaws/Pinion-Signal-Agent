// skills/tx.ts
// fetches and decodes transaction details from Base Sepolia RPC

import type { Request, Response } from "express";
import type { TxSkillData } from "../shared/types";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_MAINNET_RPC = "https://mainnet.base.org";

async function rpcCall(
  rpcUrl: string,
  method: string,
  params: any[]
): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { error?: { message: string }; result: any };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

export async function txHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const hash = (req.params.hash as string).trim();

    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      res.status(400).json({
        error: "invalid transaction hash",
        note: "hash must be 0x followed by 64 hex characters",
      });
      return;
    }

    const network = process.env.PINION_NETWORK || "base-sepolia";
    const rpcUrl = network === "base" ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC;

    console.log(`[tx] fetching ${hash.slice(0, 18)}... on ${network}`);

    // fetch tx and receipt in parallel
    const [tx, receipt] = await Promise.all([
      rpcCall(rpcUrl, "eth_getTransactionByHash", [hash]),
      rpcCall(rpcUrl, "eth_getTransactionReceipt", [hash]),
    ]);

    if (!tx) {
      res.status(404).json({
        error: "transaction not found",
        hash,
        note: "transaction may not exist or may not be indexed yet",
      });
      return;
    }

    const valueEth = (parseInt(tx.value, 16) / 1e18).toFixed(6);
    const gasUsed = receipt
      ? parseInt(receipt.gasUsed, 16).toString()
      : "pending";
    const status = receipt
      ? receipt.status === "0x1" ? "success" : "reverted"
      : "pending";
    const blockNumber = tx.blockNumber
      ? parseInt(tx.blockNumber, 16)
      : null;

    const explorerBase = network === "base"
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

    const response: TxSkillData & { explorerUrl: string } = {
      hash: tx.hash,
      network,
      from: tx.from,
      to: tx.to,
      value: valueEth + " ETH",
      gasUsed,
      status,
      blockNumber,
      explorerUrl: `${explorerBase}/tx/${hash}`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[tx] ${hash.slice(0, 18)}... status: ${status}`);
    res.json(response);
  } catch (err: any) {
    console.error("[tx] error:", err.message);
    res.status(500).json({
      error: "failed to fetch transaction",
      details: err.message,
    });
  }
}

// standalone fetcher used by agent internally
export async function fetchTx(hash: string): Promise<TxSkillData | null> {
  try {
    const network = process.env.PINION_NETWORK || "base-sepolia";
    const rpcUrl = network === "base" ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC;

    const [tx, receipt] = await Promise.all([
      rpcCall(rpcUrl, "eth_getTransactionByHash", [hash]),
      rpcCall(rpcUrl, "eth_getTransactionReceipt", [hash]),
    ]);

    if (!tx) return null;

    return {
      hash: tx.hash,
      network,
      from: tx.from,
      to: tx.to,
      value: (parseInt(tx.value, 16) / 1e18).toFixed(6) + " ETH",
      gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : "pending",
      status: receipt
        ? receipt.status === "0x1" ? "success" : "reverted"
        : "pending",
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}