import { extractItems, firstNumber, firstString, runOkx, unwrapPayload } from "./okx.js";
import { isRiskBlocked, riskActionForLevel } from "./risk.js";

export const liveSignalCache = new Map();
export const liveRiskCache = new Map();

function cacheLiveSignal(signal) {
  if (!signal?.id) return;
  liveSignalCache.set(signal.id, signal);
  if (signal.address) liveSignalCache.set(signal.address.toLowerCase(), signal);
}

function mapSignal(item, index) {
  const token = item.token || item.baseToken || item.tokenInfo || {};
  const symbol = item.symbol || token.symbol || item.tokenSymbol || `TOKEN-${index + 1}`;
  const address = (item.tokenAddress || token.address || item.address || "").toLowerCase();
  const walletType = String(item.walletType || item.wallet_type || item.type || "");
  const walletLabel = walletType === "1" ? "Smart Money" : walletType === "2" ? "KOL" : walletType === "3" ? "Whale" : item.walletLabel || "Smart Money";

  return {
    id: address || `okx-signal-${index}`,
    symbol,
    name: item.name || token.name || symbol,
    chain: item.chain || item.chainName || token.chain || "solana",
    address,
    walletType: walletLabel,
    amountUsd: Number(item.amountUsd || item.amountUSD || item.volumeUsd || item.volume || 0),
    triggerWallets: Number(item.addressCount || item.walletCount || item.triggerWalletCount || 1),
    soldRatioPercent: Number(item.soldRatioPercent || item.soldRatio || 0),
    liquidity: Number(item.liquidity || token.liquidity || 0),
    marketCap: Number(item.marketCap || token.marketCap || 0),
    change24h: Number(item.change24h || item.priceChange24h || 0),
    riskLevel: "UNKNOWN",
    source: "okx-live"
  };
}

export async function getLiveSignals(chain) {
  const payload = await runOkx(["signal", "list", "--chain", chain, "--limit", "20"]);
  const items = extractItems(payload).map(mapSignal);
  items.forEach(cacheLiveSignal);
  return {
    source: "okx-live",
    requestTime: payload?.requestTime || Date.now(),
    items
  };
}

export async function getLiveTokenDossier(token) {
  const address = token.address || token.id;
  const [priceInfo, liquidity, holders, topTrader, trades] = await Promise.allSettled([
    runOkx(["token", "price-info", "--address", address]),
    runOkx(["token", "liquidity", "--address", address]),
    runOkx(["token", "holders", "--address", address, "--limit", "5"]),
    runOkx(["token", "top-trader", "--address", address, "--limit", "5"]),
    runOkx(["token", "trades", "--address", address, "--limit", "8"])
  ]);
  const price = priceInfo.status === "fulfilled" ? unwrapPayload(priceInfo.value) : {};
  const liquidityInfo = liquidity.status === "fulfilled" ? unwrapPayload(liquidity.value) : {};
  const holderItems = holders.status === "fulfilled" ? extractItems(holders.value) : [];
  const traderItems = topTrader.status === "fulfilled" ? extractItems(topTrader.value) : [];
  const tradeItems = trades.status === "fulfilled" ? extractItems(trades.value) : [];
  const liquidityItems = extractItems(liquidity.value);

  return {
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    chain: token.chain,
    address: token.address,
    signal: token,
    market: {
      price: firstNumber(price.price, price.tokenPrice, price.usdPrice, token.price),
      marketCap: firstNumber(price.marketCap, price.marketCapUsd, token.marketCap),
      liquidity: firstNumber(price.liquidity, price.liquidityUsd, liquidityInfo.liquidity, liquidityInfo.liquidityUsd, liquidityItems[0]?.liquidity, token.liquidity),
      volume24h: firstNumber(price.volume24h, price.volume24hUsd, price.vol24h, price.volumeUsd24h),
      holders: firstNumber(price.holders, price.holderCount, price.holderCnt),
      change24h: firstNumber(price.change24h, price.priceChange24h, price.change24hPercent, token.change24h)
    },
    holders: holderItems.slice(0, 5).map((item, index) => ({
      label: firstString(item.label, item.tag, item.walletType, item.address, item.walletAddress, `Holder ${index + 1}`),
      value: firstNumber(item.percent, item.percentage, item.holdingPercent, item.ratio, item.amountPercent)
    })),
    traders: traderItems.slice(0, 5).map((item) => ({
      wallet: firstString(item.wallet, item.walletAddress, item.address, item.ownerAddress, "--"),
      pnl: firstNumber(item.pnl, item.profit, item.realizedPnl, item.totalProfitUsd),
      winRate: firstNumber(item.winRate, item.winRatio, item.winRatePercent),
      volume: firstNumber(item.volume, item.volumeUsd, item.totalVolumeUsd)
    })),
    trades: tradeItems,
    ai: [
      "Live OKX signal loaded. Open dossier for structured research.",
      "This is a research assistant verdict, not an automated execution instruction."
    ],
    audit: [
      "OKX signal intelligence loaded",
      "Token dossier assembled from price, holders, top traders and trades"
    ],
    source: "okx-live",
    updatedAt: new Date().toISOString()
  };
}

export async function getLiveRisk(token) {
  const address = token.address || token.id;
  const payload = await runOkx(["security", "token-scan", "--chain", token.chain, "--address", address]);
  const data = unwrapPayload(payload);
  const riskLevel = String(data.riskLevel || data.level || data.riskControlLevel || "UNKNOWN").toUpperCase();
  const action = data.action || riskActionForLevel(riskLevel);
  const labels = data.labels || data.riskLabels || data.riskItems || data.riskItemDetail || [];
  const risk = {
    riskLevel,
    action,
    scanState: "completed",
    message: data.message || (isRiskBlocked({ riskLevel, action }) ? "Risk Gate blocked buy-side quote creation for this token." : "Security token-scan completed."),
    labels,
    source: "okx-live",
    updatedAt: new Date().toISOString()
  };
  if (token.id) liveRiskCache.set(token.id, risk);
  if (address) liveRiskCache.set(address.toLowerCase(), risk);
  return risk;
}

export async function findToken(id, mode, marketCache) {
  const requestedId = String(id || "");
  const cachedToken = marketCache.signals.items.find((item) => item.id === requestedId || item.address?.toLowerCase() === requestedId.toLowerCase());
  if (mode === "live") {
    const liveToken = liveSignalCache.get(requestedId) || liveSignalCache.get(requestedId.toLowerCase());
    if (liveToken) return liveToken;
  }
  return cachedToken || marketCache.signals.items[0];
}
