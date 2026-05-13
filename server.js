import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const publicDir = join(root, "public");
const dataPath = join(root, "data", "demo-data.json");
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

let demoCache;

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

async function getDemoData() {
  if (!demoCache) {
    demoCache = JSON.parse(await readFile(dataPath, "utf8"));
  }
  return demoCache;
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
  return {
    source: "okx-live",
    requestTime: payload?.requestTime || Date.now(),
    items
  };
}

async function getLiveTokenDossier(token) {
  const address = token.address || token.id;
  const [priceInfo, liquidity, topTrader, trades] = await Promise.allSettled([
    runOkx(["token", "price-info", "--address", address]),
    runOkx(["token", "liquidity", "--address", address]),
    runOkx(["token", "top-trader", "--address", address, "--limit", "5"]),
    runOkx(["token", "trades", "--address", address, "--limit", "8"])
  ]);

  return {
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    chain: token.chain,
    address: token.address,
    signal: token,
    price: priceInfo.status === "fulfilled" ? priceInfo.value : null,
    liquidity: liquidity.status === "fulfilled" ? liquidity.value : null,
    topTraders: topTrader.status === "fulfilled" ? extractItems(topTrader.value) : [],
    trades: trades.status === "fulfilled" ? extractItems(trades.value) : [],
    source: "okx-live",
    updatedAt: new Date().toISOString()
  };
}

async function getLiveRisk(token) {
  const address = token.address || token.id;
  const payload = await runOkx(["security", "token-scan", "--chain", token.chain, "--address", address]);
  return {
    riskLevel: payload?.riskLevel || payload?.data?.riskLevel || "UNKNOWN",
    action: payload?.action || payload?.data?.action || "review",
    labels: payload?.labels || payload?.data?.labels || payload?.riskItems || [],
    source: "okx-live",
    updatedAt: new Date().toISOString()
  };
}

async function getSignals(url) {
  const demo = await getDemoData();
  const mode = url.searchParams.get("mode") || "demo";
  const chain = url.searchParams.get("chain") || "solana";
  if (mode === "live") {
    try {
      const live = await getLiveSignals(chain);
      if (live.items.length) return live;
      return { ...demo.signals, notice: "OKX returned no live signals; showing demo snapshot." };
    } catch (error) {
      return { ...demo.signals, notice: normalizeError(error) };
    }
  }
  return demo.signals;
}

async function getDossier(url, id) {
  const demo = await getDemoData();
  const token = demo.signals.items.find((item) => item.id === id) || demo.signals.items[0];
  const mode = url.searchParams.get("mode") || "demo";
  const dossier = demo.dossiers[token.id] || demo.dossiers[demo.signals.items[0].id];

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
  const demo = await getDemoData();
  const token = demo.signals.items.find((item) => item.id === body.tokenId) || demo.signals.items[0];
  const amount = Number(body.amount || 100);
  const quoteTemplate = demo.quotes[token.id];
  const quoteScale = quoteTemplate?.inputAmount ? amount / quoteTemplate.inputAmount : 1;
  const demoQuote = {
    ...quoteTemplate,
    inputAmount: amount,
    estimatedOutput: Number(((quoteTemplate?.estimatedOutput || 0) * quoteScale).toFixed(6)),
    minOutput: Number(((quoteTemplate?.minOutput || 0) * quoteScale).toFixed(6)),
    priceImpact: Number(((quoteTemplate?.priceImpact || 0) * Math.max(1, Math.sqrt(quoteScale))).toFixed(3)),
    updatedAt: new Date().toISOString()
  };

  if (body.mode === "live") {
    try {
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
      sendJson(response, 200, { ...demoQuote, raw: payload, source: "okx-live" });
      return;
    } catch (error) {
      sendJson(response, 200, { ...demoQuote, source: "demo-fallback", notice: normalizeError(error) });
      return;
    }
  }

  sendJson(response, 200, demoQuote);
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
  console.log(`TxRadar MVP running at http://${host}:${port}`);
});
