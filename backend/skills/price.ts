// skills/price.ts

import type { Request, Response } from "express";
import type { PriceSkillData } from "../shared/types";

// ── Token Maps ────────────────────────────────────────────────────────────────

// CoinGecko token ID mapping
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  CBETH: "coinbase-wrapped-staked-eth",
  USDC: "usd-coin",
  DAI: "dai",
  USDT: "tether",
};

// Base mainnet contract addresses for reference
const TOKEN_ADDRESSES: Record<string, string> = {
  ETH: "0x4200000000000000000000000000000000000006",
  WETH: "0x4200000000000000000000000000000000000006",
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  CBETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
};

// ── CoinGecko Fetcher ─────────────────────────────────────────────────────────

async function fetchCoinGeckoPrice(geckoId: string): Promise<{
  priceUSD: number;
  change24h: string | null;
} | null> {
  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/price` +
      `?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "pinion-signal-agent/1.0",
      },
    });

    if (!res.ok) {
      console.error(
        `[price] CoinGecko returned ${res.status} for ${geckoId}`
      );
      return null;
    }

    const data: any = await res.json();

    if (!data[geckoId] || !data[geckoId].usd) {
      console.error(`[price] no data for ${geckoId} in CoinGecko response`);
      return null;
    }

    const change = data[geckoId].usd_24h_change;

    return {
      priceUSD: data[geckoId].usd,
      change24h: change != null ? change.toFixed(2) + "%" : null,
    };
  } catch (err: any) {
    console.error(`[price] CoinGecko fetch error:`, err.message);
    return null;
  }
}

// ── Contract Address Fetcher (via CoinGecko contract endpoint) ────────────────

async function fetchPriceByAddress(address: string): Promise<{
  priceUSD: number;
  change24h: string | null;
} | null> {
  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/token_price/base` +
      `?contract_addresses=${address.toLowerCase()}` +
      `&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "pinion-signal-agent/1.0",
      },
    });

    if (!res.ok) {
      console.error(
        `[price] CoinGecko contract endpoint returned ${res.status}`
      );
      return null;
    }

    const data: any = await res.json();
    const key = address.toLowerCase();

    if (!data[key] || !data[key].usd) {
      console.error(`[price] no contract price data for ${address}`);
      return null;
    }

    const change = data[key].usd_24h_change;

    return {
      priceUSD: data[key].usd,
      change24h: change != null ? change.toFixed(2) + "%" : null,
    };
  } catch (err: any) {
    console.error(`[price] contract price fetch error:`, err.message);
    return null;
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export async function priceHandler(req: Request, res: Response): Promise<void> {
  try {
    const tokenInput = (req.params.token as string).trim();
    const tokenUpper = tokenInput.toUpperCase();

    // check if input is a contract address
    const isAddress = /^0x[0-9a-fA-F]{40}$/i.test(tokenInput);

    let priceData: { priceUSD: number; change24h: string | null } | null = null;
    let resolvedToken = tokenUpper;

    if (isAddress) {
      // fetch by contract address directly
      priceData = await fetchPriceByAddress(tokenInput);
      resolvedToken = tokenInput;
    } else {
      // fetch by symbol via CoinGecko ID
      const geckoId = COINGECKO_IDS[tokenUpper];

      if (!geckoId) {
        res.status(400).json({
          error: `unsupported token: ${tokenInput}`,
          supported: Object.keys(COINGECKO_IDS),
          note: "you can also pass any Base contract address (0x...)",
        });
        return;
      }

      priceData = await fetchCoinGeckoPrice(geckoId);
    }

    if (!priceData) {
      res.status(502).json({
        error: "price data unavailable",
        token: resolvedToken,
        note: "CoinGecko may be rate limiting. Try again in a moment.",
      });
      return;
    }

    const response: PriceSkillData = {
      token: resolvedToken,
      network: process.env.PINION_NETWORK || "base-sepolia",
      priceUSD: priceData.priceUSD,
      change24h: priceData.change24h,
      source: "coingecko",
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[price] ${resolvedToken} = USD ${priceData.priceUSD} ` +
      `(${priceData.change24h || "no change data"})`
    );

    res.json(response);
  } catch (err: any) {
    console.error("[price] unexpected error:", err.message);
    res.status(500).json({
      error: "failed to fetch price",
      details: err.message,
    });
  }
}

// ── Standalone Fetcher (used by agent internally) ─────────────────────────────
// agent calls this directly without going through HTTP

export async function fetchPrice(token: string): Promise<{
  priceUSD: number;
  change24h: string | null;
  source: string;
} | null> {
  const tokenUpper = token.toUpperCase();
  const isAddress = /^0x[0-9a-fA-F]{40}$/i.test(token);

  let result: { priceUSD: number; change24h: string | null } | null = null;

  if (isAddress) {
    result = await fetchPriceByAddress(token);
  } else {
    const geckoId = COINGECKO_IDS[tokenUpper];
    if (!geckoId) return null;
    result = await fetchCoinGeckoPrice(geckoId);
  }

  if (!result) return null;

  return {
    priceUSD: result.priceUSD,
    change24h: result.change24h,
    source: "coingecko",
  };
}

export { TOKEN_ADDRESSES, COINGECKO_IDS };
