// skills/price.ts
// fetches real token prices
// primary: CoinGecko (free, no key)
// fallback: CoinCap (free, no key) — kicks in if CoinGecko blocks us

import type { Request, Response } from "express";

// ── Token Maps ────────────────────────────────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  CBETH: "coinbase-wrapped-staked-eth",
  USDC: "usd-coin",
  DAI: "dai",
  USDT: "tether",
};

const COINCAP_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum", // CoinCap doesn't have WETH separately, use ETH price
  CBETH: "ethereum", // same fallback
  USDC: "usd-coin",
  DAI: "multi-collateral-dai",
  USDT: "tether",
};

// ── Headers ───────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PinionSignalAgent/1.0)",
  "Accept": "application/json",
};

// ── CoinGecko Fetch ───────────────────────────────────────────────────────────

async function fetchFromCoinGecko(
  symbol: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const geckoId = COINGECKO_IDS[symbol.toUpperCase()];
    if (!geckoId) return null;

    const url =
      `https://api.coingecko.com/api/v3/simple/price` +
      `?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[price] CoinGecko returned ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    const entry = data[geckoId];

    if (!entry?.usd) return null;

    return {
      priceUSD: entry.usd,
      change24h: entry.usd_24h_change || 0,
    };
  } catch (err: any) {
    console.warn(`[price] CoinGecko failed for ${symbol}: ${err.message}`);
    return null;
  }
}

// ── CoinCap Fallback ──────────────────────────────────────────────────────────

async function fetchFromCoinCap(
  symbol: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const capId = COINCAP_IDS[symbol.toUpperCase()];
    if (!capId) return null;

    const url = `https://api.coincap.io/v2/assets/${capId}`;

    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[price] CoinCap returned ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    const asset = data?.data;

    if (!asset?.priceUsd) return null;

    return {
      priceUSD: parseFloat(asset.priceUsd),
      change24h: parseFloat(asset.changePercent24Hr || "0"),
    };
  } catch (err: any) {
    console.warn(`[price] CoinCap failed for ${symbol}: ${err.message}`);
    return null;
  }
}

// ── CoinGecko by Contract Address ─────────────────────────────────────────────

async function fetchByAddress(
  address: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/token_price/base` +
      `?contract_addresses=${address}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[address.toLowerCase()];
    if (!entry?.usd) return null;

    return {
      priceUSD: entry.usd,
      change24h: entry.usd_24h_change || 0,
    };
  } catch {
    return null;
  }
}

// ── Main Fetch With Fallback ──────────────────────────────────────────────────

export async function fetchPrice(symbol: string): Promise<{
  priceUSD: number;
  change24h: number;
  source: string;
  symbol: string;
} | null> {
  const upper = symbol.toUpperCase();

  // handle contract address directly
  if (symbol.startsWith("0x")) {
    const result = await fetchByAddress(symbol);
    if (result) {
      return { ...result, source: "coingecko", symbol };
    }
    return null;
  }

  // try CoinGecko first
  console.log(`[price] fetching ${upper} from CoinGecko...`);
  const geckoResult = await fetchFromCoinGecko(upper);
  if (geckoResult) {
    console.log(
      `[price] ${upper} from CoinGecko — $${geckoResult.priceUSD.toFixed(2)}`
    );
    return { ...geckoResult, source: "coingecko", symbol: upper };
  }

  // fallback to CoinCap
  console.log(`[price] CoinGecko failed, trying CoinCap for ${upper}...`);
  const capResult = await fetchFromCoinCap(upper);
  if (capResult) {
    console.log(
      `[price] ${upper} from CoinCap — $${capResult.priceUSD.toFixed(2)}`
    );
    return { ...capResult, source: "coincap", symbol: upper };
  }

  console.error(`[price] both sources failed for ${upper}`);
  return null;
}

// ── HTTP Handler ──────────────────────────────────────────────────────────────

export async function priceHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const token = (req.params.token as string).toUpperCase().trim();

    const result = await fetchPrice(token);

    if (!result) {
      res.status(404).json({
        error: `price not available for ${token}`,
        supported: Object.keys(COINGECKO_IDS),
        note: "also accepts Base contract addresses starting with 0x",
      });
      return;
    }

    res.json({
      token: result.symbol,
      priceUSD: result.priceUSD,
      change24h: `${result.change24h >= 0 ? "+" : ""}${result.change24h.toFixed(2)}%`,
      source: result.source,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[price] handler error:", err.message);
    res.status(500).json({
      error: "failed to fetch price",
      details: err.message,
    });
  }
}
