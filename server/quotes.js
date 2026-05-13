import { getMarketCache } from "./cache.js";
import { findToken, getLiveRisk, liveRiskCache } from "./live.js";
import { firstNumber, firstString, normalizeError, runOkx, unwrapPayload } from "./okx.js";
import { blockedQuote, isRiskBlocked } from "./risk.js";

function buildCachedQuote(marketCache, token, amount) {
  const quoteTemplate = marketCache.quotes[token.id];
  if (!quoteTemplate) {
    return {
      source: token.source === "okx-live" ? "okx-live" : "signal-cache",
      inputSymbol: "USDC",
      outputSymbol: token.symbol || "TOKEN",
      inputAmount: amount,
      estimatedOutput: 0,
      minOutput: 0,
      priceImpact: 0,
      gasUsd: 0,
      route: ["OKX DEX Aggregator"],
      expiresInSec: 30,
      mode: "protected-preview",
      message: "Unsigned quote prepared. Execution requires a separate user-confirmed wallet action.",
      updatedAt: new Date().toISOString()
    };
  }
  const quoteScale = quoteTemplate?.inputAmount ? amount / quoteTemplate.inputAmount : 1;
  return {
    ...quoteTemplate,
    inputAmount: amount,
    estimatedOutput: Number(((quoteTemplate?.estimatedOutput || 0) * quoteScale).toFixed(6)),
    minOutput: Number(((quoteTemplate?.minOutput || 0) * quoteScale).toFixed(6)),
    priceImpact: Number(((quoteTemplate?.priceImpact || 0) * Math.max(1, Math.sqrt(quoteScale))).toFixed(3)),
    updatedAt: new Date().toISOString()
  };
}

function buildLiveQuote(payload, token, amount, fallback) {
  const data = unwrapPayload(payload);
  const router = data.routerResult || data.route || data.dexRouterList || data.routes || data.path;
  const route = Array.isArray(router)
    ? router.map((step) => typeof step === "string" ? step : firstString(step.dexName, step.name, step.poolName, step.symbol, step.protocol))
    : fallback.route;
  return {
    ...fallback,
    source: "okx-live",
    inputAmount: amount,
    inputSymbol: firstString(data.fromTokenSymbol, data.fromSymbol, data.inputSymbol, fallback.inputSymbol, "USDC"),
    outputSymbol: firstString(data.toTokenSymbol, data.toSymbol, data.outputSymbol, token.symbol, fallback.outputSymbol),
    estimatedOutput: firstNumber(data.toTokenAmount, data.toAmount, data.outputAmount, data.estimatedOutput, data.amountOut, fallback.estimatedOutput),
    minOutput: firstNumber(data.minReceiveAmount, data.minOutput, data.minimumReceived, data.minAmountOut, fallback.minOutput),
    priceImpact: firstNumber(data.priceImpactPercentage, data.priceImpact, data.impact, fallback.priceImpact),
    gasUsd: firstNumber(data.estimateGasFeeUsd, data.gasUsd, data.gasFeeUsd, data.gasCostUsd, fallback.gasUsd),
    route: route.filter(Boolean).length ? route.filter(Boolean) : fallback.route,
    expiresInSec: firstNumber(data.expiresInSec, data.expireSec, fallback.expiresInSec) || 30,
    raw: payload,
    updatedAt: new Date().toISOString()
  };
}

export async function getQuotePayload(body) {
  const marketCache = await getMarketCache();
  const token = await findToken(body.tokenId, body.mode, marketCache);
  const amount = Number(body.amount || 100);
  const cachedQuote = buildCachedQuote(marketCache, token, amount);

  if (cachedQuote.mode === "blocked") return cachedQuote;

  if (body.mode === "live") {
    try {
      const cachedRisk = liveRiskCache.get(token.id) || liveRiskCache.get(String(token.address || "").toLowerCase());
      let risk = cachedRisk;
      let riskNotice = "";
      if (!risk) {
        try {
          risk = await getLiveRisk(token);
        } catch (error) {
          riskNotice = `Security scan could not be completed: ${normalizeError(error)}`;
        }
      }
      if (isRiskBlocked(risk)) return blockedQuote(token, amount, risk.message);

      const payload = await runOkx([
        "swap",
        "quote",
        "--from",
        body.from || "usdc",
        "--to",
        token.address,
        "--readable-amount",
        String(amount),
        "--chain",
        token.chain
      ]);
      return {
        ...buildLiveQuote(payload, token, amount, cachedQuote),
        risk,
        notice: riskNotice || undefined
      };
    } catch (error) {
      return { ...cachedQuote, source: "market-cache", notice: normalizeError(error) };
    }
  }

  return cachedQuote;
}
