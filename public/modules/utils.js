export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

export const h = escapeHtml;

export function api(path, options = {}) {
  return fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }).catch(() => staticApi(path, options));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function riskRank(risk) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[risk] || 0;
}

let staticMarketCache;

async function loadStaticMarketCache() {
  if (!staticMarketCache) {
    const response = await fetch(new URL("../data/market-cache.json", import.meta.url));
    if (!response.ok) throw new Error(`Static market cache unavailable: ${response.status}`);
    staticMarketCache = await response.json();
  }
  return staticMarketCache;
}

async function staticApi(path, options = {}) {
  const cache = await loadStaticMarketCache();
  const url = new URL(path, window.location.origin);

  if (url.pathname === "/api/signals") {
    const mode = url.searchParams.get("mode") || "cache";
    return mode === "live"
      ? { ...cache.signals, notice: "Live OKX API is unavailable on GitHub Pages; showing curated signal cache." }
      : cache.signals;
  }

  if (url.pathname.startsWith("/api/dossier/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const token = findStaticToken(cache, id);
    return cache.dossiers[token.id] || buildStaticDossier(token);
  }

  if (url.pathname === "/api/quote") {
    const body = parseStaticBody(options.body);
    const token = findStaticToken(cache, body.tokenId);
    return buildStaticQuote(cache, token, Number(body.amount || 100));
  }

  throw new Error(`No static handler for ${url.pathname}`);
}

function findStaticToken(cache, id) {
  const requestedId = String(id || "");
  return cache.signals.items.find((item) => item.id === requestedId || item.address?.toLowerCase() === requestedId.toLowerCase()) || cache.signals.items[0];
}

function buildStaticDossier(token) {
  return {
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
      action: "review",
      scanState: "not-run",
      message: "Risk scan is not available yet.",
      labels: []
    },
    holders: [],
    traders: [],
    ai: [],
    audit: []
  };
}

function parseStaticBody(body) {
  if (!body) return {};
  try {
    return typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return {};
  }
}

function buildStaticQuote(cache, token, amount) {
  const quoteTemplate = cache.quotes[token.id];
  if (!quoteTemplate) {
    return {
      source: "signal-cache",
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
