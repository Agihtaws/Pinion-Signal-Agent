// skills/price.ts
// price fetcher with 4 sources in order of reliability on Render
// 1. Binance (most reliable, no rate limits for basic prices)
// 2. Kraken (very reliable, no key needed)
// 3. CoinGecko (sometimes rate limits on free servers)
// 4. CoinCap (fallback)

import type { Request, Response } from "express";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PinionSignalAgent/1.0)",
  "Accept": "application/json",
};

// ── Binance Symbol Map ────────────────────────────────────────────────────────

const BINANCE_SYMBOLS: Record<string, string> = {
  ETH: "ETHUSDT",
  WETH: "ETHUSDT",   // WETH tracks ETH price
  CBETH: "ETHUSDT",  // approximate — CBETH tracks ETH closely
  USDC: "USDCUSDT",
  DAI: "DAIUSDT",
  USDT: "USDTUSDT",
};

// ── Kraken Symbol Map ─────────────────────────────────────────────────────────

const KRAKEN_SYMBOLS: Record<string, string> = {
  ETH: "XETHZUSD",
  WETH: "XETHZUSD",
  CBETH: "XETHZUSD",
  USDC: "USDCUSD",
  DAI: "DAIUSD",
  USDT: "USDTZUSD",
};

// ── CoinGecko ID Map ──────────────────────────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  CBETH: "coinbase-wrapped-staked-eth",
  USDC: "usd-coin",
  DAI: "dai",
  USDT: "tether",
};

// ── CoinCap ID Map ────────────────────────────────────────────────────────────

const COINCAP_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  CBETH: "ethereum",
  USDC: "usd-coin",
  DAI: "multi-collateral-dai",
  USDT: "tether",
};

// ── Source 1: Binance ─────────────────────────────────────────────────────────

async function fetchFromBinance(
  symbol: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const pair = BINANCE_SYMBOLS[symbol];
    if (!pair) return null;

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[price] Binance returned ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    const price = parseFloat(data.lastPrice);
    const change = parseFloat(data.priceChangePercent);

    if (!price) return null;

    return { priceUSD: price, change24h: change };
  } catch (err: any) {
    console.warn(`[price] Binance failed for ${symbol}: ${err.message}`);
    return null;
  }
}

// ── Source 2: Kraken ──────────────────────────────────────────────────────────

async function fetchFromKraken(
  symbol: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const pair = KRAKEN_SYMBOLS[symbol];
    if (!pair) return null;

    const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[price] Kraken returned ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    if (data.error?.length > 0) return null;

    const result = data.result?.[pair] || data.result?.[Object.keys(data.result)[0]];
    if (!result) return null;

    const price = parseFloat(result.c[0]);   // last trade price
    const open = parseFloat(result.o);        // opening price (24h)
    const change = open > 0 ? ((price - open) / open) * 100 : 0;

    if (!price) return null;

    return { priceUSD: price, change24h: change };
  } catch (err: any) {
    console.warn(`[price] Kraken failed for ${symbol}: ${err.message}`);
    return null;
  }
}

// ── Source 3: CoinGecko ───────────────────────────────────────────────────────

async function fetchFromCoinGecko(
  symbol: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const geckoId = COINGECKO_IDS[symbol];
    if (!geckoId) return null;

    const url =
      `https://api.coingecko.com/api/v3/simple/price` +
      `?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
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

// ── Source 4: CoinCap ─────────────────────────────────────────────────────────

async function fetchFromCoinCap(
  symbol: string
): Promise<{ priceUSD: number; change24h: number } | null> {
  try {
    const capId = COINCAP_IDS[symbol];
    if (!capId) return null;

    const url = `https://api.coincap.io/v2/assets/${capId}`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

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

// ── Main Fetch — Tries All 4 Sources ─────────────────────────────────────────

export async function fetchPrice(symbol: string): Promise<{
  priceUSD: number;
  change24h: number;
  source: string;
  symbol: string;
} | null> {
  const upper = symbol.toUpperCase();

  // handle contract address
  if (symbol.startsWith("0x")) {
    const result = await fetchFromCoinGecko(symbol);
    if (result) return { ...result, source: "coingecko", symbol };
    return null;
  }

  // 1. Binance — most reliable on cloud servers
  console.log(`[price] fetching ${upper} from Binance...`);
  const binance = await fetchFromBinance(upper);
  if (binance) {
    console.log(`[price] ${upper} ✓ Binance — $${binance.priceUSD.toFixed(2)}`);
    return { ...binance, source: "binance", symbol: upper };
  }

  // 2. Kraken
  console.log(`[price] trying Kraken for ${upper}...`);
  const kraken = await fetchFromKraken(upper);
  if (kraken) {
    console.log(`[price] ${upper} ✓ Kraken — $${kraken.priceUSD.toFixed(2)}`);
    return { ...kraken, source: "kraken", symbol: upper };
  }

  // 3. CoinGecko
  console.log(`[price] trying CoinGecko for ${upper}...`);
  const gecko = await fetchFromCoinGecko(upper);
  if (gecko) {
    console.log(`[price] ${upper} ✓ CoinGecko — $${gecko.priceUSD.toFixed(2)}`);
    return { ...gecko, source: "coingecko", symbol: upper };
  }

  // 4. CoinCap
  console.log(`[price] trying CoinCap for ${upper}...`);
  const cap = await fetchFromCoinCap(upper);
  if (cap) {
    console.log(`[price] ${upper} ✓ CoinCap — $${cap.priceUSD.toFixed(2)}`);
    return { ...cap, source: "coincap", symbol: upper };
  }

  console.error(`[price] all 4 sources failed for ${upper}`);
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
