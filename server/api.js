import { getMarketCache } from "./cache.js";
import { findToken, getLiveRisk, getLiveSignals, getLiveTokenDossier } from "./live.js";
import { normalizeError } from "./okx.js";
import { riskActionForLevel } from "./risk.js";

export async function getSignals(url) {
  const marketCache = await getMarketCache();
  const mode = url.searchParams.get("mode") || "cache";
  const chain = url.searchParams.get("chain") || "solana";
  if (mode === "live") {
    try {
      const live = await getLiveSignals(chain);
      if (live.items.length) return live;
      return { ...marketCache.signals, notice: "OKX returned no live signals; showing curated signal cache." };
    } catch (error) {
      return { ...marketCache.signals, notice: normalizeError(error) };
    }
  }
  return marketCache.signals;
}

export async function getDossier(url, id) {
  const marketCache = await getMarketCache();
  const mode = url.searchParams.get("mode") || "cache";
  const token = await findToken(id, mode, marketCache);
  const dossier = marketCache.dossiers[token.id] || {
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    chain: token.chain,
    address: token.address,
    source: token.source || "signal-cache",
    market: {
      price: 0,
      marketCap: token.marketCap || 0,
      liquidity: token.liquidity || 0,
      volume24h: 0,
      holders: 0,
      change24h: token.change24h || 0
    },
    risk: {
      riskLevel: token.riskLevel || "UNKNOWN",
      action: riskActionForLevel(token.riskLevel),
      scanState: "not-run",
      message: "Risk scan is not available yet.",
      labels: []
    },
    holders: [],
    traders: [],
    ai: [],
    audit: []
  };

  if (mode === "live") {
    try {
      const [liveDossier, risk] = await Promise.allSettled([getLiveTokenDossier(token), getLiveRisk(token)]);
      return {
        ...dossier,
        ...(liveDossier.status === "fulfilled" ? liveDossier.value : {}),
        risk: risk.status === "fulfilled" ? risk.value : { ...dossier.risk, scanState: "failed", message: normalizeError(risk.reason) },
        fallback: liveDossier.status === "rejected" ? normalizeError(liveDossier.reason) : null
      };
    } catch (error) {
      return { ...dossier, fallback: normalizeError(error) };
    }
  }

  return dossier;
}
