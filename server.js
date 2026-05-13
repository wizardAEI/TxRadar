import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const publicDir = join(root, "public");
const dataPath = join(root, "data", "market-cache.json");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const cliTimeout = Number(process.env.OKX_TIMEOUT_MS || 9000);
const onchainosBin = process.env.OKX_ONCHAINOS_BIN || "onchainos";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

let marketCache;
const liveSignalCache = new Map();
const liveRiskCache = new Map();

async function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  const content = await readFile(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

async function getMarketCache() {
  if (!marketCache) {
    marketCache = JSON.parse(await readFile(dataPath, "utf8"));
  }
  return marketCache;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function normalizeError(error) {
  if (!error) return "Unknown OKX CLI error";
  const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
  try {
    const payload = JSON.parse(output);
    if (payload?.error) return payload.error;
    if (payload?.msg) return payload.msg;
  } catch {
    // keep the text fallback below
  }
  if (/not found|ENOENT/i.test(output)) return "onchainos CLI is not installed";
  if (/50125|80001|region/i.test(output)) return "OKX DEX service is not available in this region";
  if (/rate|quota|429/i.test(output)) return "OKX API quota or rate limit reached";
  if (/Invalid OK-ACCESS-KEY/i.test(output)) return "Invalid OKX API key. Configure OKX_API_KEY, OKX_SECRET_KEY and OKX_PASSPHRASE in .env.";
  return output.split("\n").slice(0, 2).join(" ");
}

async function runOkx(args) {
  const { stdout } = await execFileAsync(onchainosBin, args, {
    timeout: cliTimeout,
    maxBuffer: 1024 * 1024
  });
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: trimmed };
  }
}

function extractItems(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.list)) return payload.list;
  if (payload.data && Array.isArray(payload.data.list)) return payload.data.list;
  if (payload.result && Array.isArray(payload.result.list)) return payload.result.list;
  return [];
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && !Array.isArray(payload.data) && typeof payload.data === "object") return payload.data;
  if (payload.result && !Array.isArray(payload.result) && typeof payload.result === "object") return payload.result;
  return payload;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function cacheLiveSignal(signal) {
  if (!signal?.id) return;
  liveSignalCache.set(signal.id, signal);
  if (signal.address) liveSignalCache.set(signal.address.toLowerCase(), signal);
}

function riskActionForLevel(riskLevel, fallback = "review") {
  const level = String(riskLevel || "UNKNOWN").toUpperCase();
  if (level === "CRITICAL") return "block";
  if (level === "HIGH" || level === "MEDIUM") return "warn";
  if (level === "LOW") return "allow";
  return fallback || "review";
}

function isRiskBlocked(risk) {
  return risk?.action === "block" || String(risk?.riskLevel || "").toUpperCase() === "CRITICAL";
}

function blockedQuote(token, amount, message = "Risk Gate blocked buy-side preview creation for this token.") {
  return {
    source: token.source === "okx-live" ? "okx-live" : "signal-cache",
    inputSymbol: "USDC",
    outputSymbol: token.symbol || "TOKEN",
    inputAmount: amount,
    estimatedOutput: 0,
    minOutput: 0,
    priceImpact: 0,
    gasUsd: 0,
    route: [],
    expiresInSec: 0,
    mode: "blocked",
    message,
    updatedAt: new Date().toISOString()
  };
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

async function getLiveSignals(chain) {
  const payload = await runOkx(["signal", "list", "--chain", chain, "--limit", "20"]);
  const items = extractItems(payload).map(mapSignal);
  items.forEach(cacheLiveSignal);
  return {
    source: "okx-live",
    requestTime: payload?.requestTime || Date.now(),
    items
  };
}

async function getLiveTokenDossier(token) {
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

async function getLiveRisk(token) {
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

async function findToken(id, mode, marketCache) {
  const requestedId = String(id || "");
  const cachedToken = marketCache.signals.items.find((item) => item.id === requestedId || item.address?.toLowerCase() === requestedId.toLowerCase());
  if (mode === "live") {
    const liveToken = liveSignalCache.get(requestedId) || liveSignalCache.get(requestedId.toLowerCase());
    if (liveToken) return liveToken;
  }
  return cachedToken || marketCache.signals.items[0];
}

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

async function getSignals(url) {
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

async function getDossier(url, id) {
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

async function getQuote(request, response) {
  const body = await readRequestBody(request);
  const marketCache = await getMarketCache();
  const token = await findToken(body.tokenId, body.mode, marketCache);
  const amount = Number(body.amount || 100);
  const cachedQuote = buildCachedQuote(marketCache, token, amount);

  if (cachedQuote.mode === "blocked") {
    sendJson(response, 200, cachedQuote);
    return;
  }

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
      if (isRiskBlocked(risk)) {
        sendJson(response, 200, blockedQuote(token, amount, risk.message));
        return;
      }

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
      sendJson(response, 200, {
        ...buildLiveQuote(payload, token, amount, cachedQuote),
        risk,
        notice: riskNotice || undefined
      });
      return;
    } catch (error) {
      sendJson(response, 200, { ...cachedQuote, source: "market-cache", notice: normalizeError(error) });
      return;
    }
  }

  sendJson(response, 200, cachedQuote);
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

await loadDotEnv();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        app: "TxRadar",
        onchainos: existsSync("/Users/wangdejiang/.local/bin/onchainos") ? "available" : "path-or-not-installed"
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/signals") {
      sendJson(response, 200, await getSignals(url));
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/dossier/")) {
      sendJson(response, 200, await getDossier(url, decodeURIComponent(url.pathname.split("/").pop() || "")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/quote") {
      await getQuote(request, response);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(url.pathname, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, { error: normalizeError(error) });
  }
});

server.listen(port, host, () => {
  console.log(`TxRadar running at http://${host}:${port}`);
});
