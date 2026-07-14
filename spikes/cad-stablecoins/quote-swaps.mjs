#!/usr/bin/env node

// Real depth-at-price quotes for CAD stablecoins on Base.
//
// Dexscreener "liquidity" is pool TVL, not depth. This script asks the
// KyberSwap aggregator (keyless public API) for executable routes across all
// Base DEX liquidity: what you'd actually receive selling or buying
// C$100 / C$1,000 / C$10,000, and price impact relative to a C$1 marginal
// probe. Note the main pools are Aerodrome Slipstream (concentrated
// liquidity), so depth depends on where LPs have ranged — TVL overstates it.
//
// Usage: node quote-swaps.mjs

const USDC = { symbol: "USDC", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6 };

const TOKENS = [
  { symbol: "CADC", address: "0x043eb4b75d0805c43d7c834902e335621983cf03", decimals: 18 },
  { symbol: "CADD", address: "0x16f93ebc5320c89efc8701577efe49d14a276a06", decimals: 18 },
];

const CAD_SIZES = [100n, 1_000n, 10_000n];

async function kyberQuote(tokenIn, tokenOut, amountIn) {
  const url =
    `https://aggregator-api.kyberswap.com/base/api/v1/routes` +
    `?tokenIn=${tokenIn.address}&tokenOut=${tokenOut.address}&amountIn=${amountIn}`;
  const res = await fetch(url, { headers: { "user-agent": "commonality-cad-stablecoin-spike/1.0" } });
  if (!res.ok) throw new Error(`Kyber HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`Kyber: ${json.message}`);
  const s = json.data.routeSummary;
  const pools = [...new Set(s.route.flat().map((h) => h.pool))];
  return { amountOut: BigInt(s.amountOut), pools };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUnits = (v, d) => Number(v) / 10 ** d;

for (const token of TOKENS) {
  console.log(`\n## ${token.symbol} (${token.address})`);

  const oneCad = 10n ** BigInt(token.decimals);
  const probe = await kyberQuote(token, USDC, oneCad);
  const marginal = toUnits(probe.amountOut, USDC.decimals);
  console.log(`- Marginal price (C$1 probe): 1 ${token.symbol} -> ${marginal.toFixed(6)} USDC`);

  console.log(`- Sell ${token.symbol} for USDC:`);
  for (const size of CAD_SIZES) {
    await sleep(600);
    try {
      const { amountOut, pools } = await kyberQuote(token, USDC, size * oneCad);
      const avg = toUnits(amountOut, USDC.decimals) / Number(size);
      const impact = (1 - avg / marginal) * 100;
      console.log(
        `  - C$${size.toLocaleString()} -> ${toUnits(amountOut, USDC.decimals).toFixed(2)} USDC ` +
          `(avg ${avg.toFixed(6)}, impact ${impact.toFixed(2)}%, ${pools.length} pool(s))`,
      );
    } catch (e) {
      console.log(`  - C$${size.toLocaleString()}: ERROR ${e.message}`);
    }
  }

  console.log(`- Buy ${token.symbol} with USDC (US$ equivalent at marginal price):`);
  for (const size of CAD_SIZES) {
    await sleep(600);
    try {
      const usdcIn = size * probe.amountOut; // probe.amountOut = USDC (6dp) per C$1
      const { amountOut, pools } = await kyberQuote(USDC, token, usdcIn);
      const cadOut = toUnits(amountOut, token.decimals);
      const avg = toUnits(usdcIn, USDC.decimals) / cadOut;
      const impact = (avg / marginal - 1) * 100;
      console.log(
        `  - US$${toUnits(usdcIn, USDC.decimals).toFixed(2)} -> ${cadOut.toFixed(2)} ${token.symbol} ` +
          `(avg ${avg.toFixed(6)}, impact ${impact.toFixed(2)}%, ${pools.length} pool(s))`,
      );
    } catch (e) {
      console.log(`  - ~C$${size.toLocaleString()}: ERROR ${e.message}`);
    }
  }
}
