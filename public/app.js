const savedLanguage = localStorage.getItem("txradar-language");
const demoScanIntervalMs = 10000;
const demoScanPulseMs = 8200;

const state = {
  mode: "cache",
  chain: "solana",
  view: "overview",
  language: savedLanguage === "en" ? "en" : "zh",
  signals: [],
  selectedId: null,
  dossier: null,
  quote: null,
  liveTrades: [],
  demoScan: {
    timer: null,
    kickTimer: null,
    pulseTimer: null,
    sequence: 0,
    scanning: false,
    latestIds: new Set(),
    lastScanAt: null
  }
};

const els = {
  workspace: document.querySelector(".workspace"),
  navButtons: [...document.querySelectorAll("[data-view-target]")],
  i18n: [...document.querySelectorAll("[data-i18n]")],
  radarVisual: document.querySelector("#radar-visual"),
  tokenContext: document.querySelector("#token-context"),
  languageToggle: document.querySelector("#language-toggle"),
  liveMode: document.querySelector("#live-mode"),
  refresh: document.querySelector("#refresh"),
  filters: [...document.querySelectorAll(".filter")],
  scanStatus: document.querySelector("#scan-status"),
  tradeTape: document.querySelector("#trade-tape"),
  signals: document.querySelector("#signals"),
  feedSource: document.querySelector("#feed-source"),
  notice: document.querySelector("#notice"),
  selectedToken: document.querySelector("#selected-token"),
  metrics: document.querySelector("#metrics"),
  holders: document.querySelector("#holders"),
  traders: document.querySelector("#traders"),
  aiNotes: document.querySelector("#ai-notes"),
  riskPanel: document.querySelector("#risk-panel"),
  riskBadge: document.querySelector("#risk-badge"),
  riskMessage: document.querySelector("#risk-message"),
  riskLabels: document.querySelector("#risk-labels"),
  audit: document.querySelector("#audit"),
  amount: document.querySelector("#amount"),
  quote: document.querySelector("#quote"),
  quoteCard: document.querySelector("#quote-card"),
  quoteMode: document.querySelector("#quote-mode")
};

const copy = {
  en: {
    appEyebrow: "OKX OnchainOS / Intelligence Console",
    overview: "Overview",
    signalFeed: "Signal Feed",
    tokenDossier: "Token Dossier",
    riskGate: "Risk Gate",
    actionQuote: "Action Quote",
    liveMode: "Live Market Data",
    refresh: "Refresh",
    holderCluster: "Holder Cluster",
    topTraders: "Top Traders",
    aiResearchNotes: "AI Research Notes",
    auditTrail: "Audit Trail",
    usdcSize: "USDC Size",
    quote: "Quote",
    loading: "loading",
    signalLoading: "Scanning OKX signal channels...",
    sourceUnknown: "unknown",
    metricPrice: "Price",
    metricMarketCap: "Market Cap",
    metricLiquidity: "Liquidity",
    metricVolume: "24h Volume",
    metricHolders: "Holders",
    metricChange: "24h Change",
    statAmount: "Amount",
    statWallets: "Wallets",
    statSold: "Sold",
    liveSignalFallback: "Live OKX signal loaded. Open dossier for structured research.",
    riskFallback: "Risk scan is not available yet.",
    blockedQuote: "Risk Gate blocked buy-side quote creation.",
    input: "Input",
    estimatedOutput: "Est. Output",
    minOutput: "Min. Output",
    impactGas: "Impact / Gas",
    unsignedPrepared: "Unsigned quote prepared.",
    quoteExpiry: "Expires in {seconds}s. Final execution remains under user confirmation.",
    currentToken: "Current Token",
    selectedSignal: "Selected Signal",
    signalScore: "Signal Score",
    chainWallet: "Chain / Wallet",
    tokenAddress: "Address",
    source: "Source",
    radarTitle: "Signal Radar",
    radarSubtitle: "Real-time target map for smart-money, whale and KOL activity.",
    radarSweep: "SCAN",
    radarTargets: "Targets",
    radarSelected: "Selected Target",
    radarRoute: "Decision Route",
    demoScanIdle: "Demo scanner armed",
    demoScanActive: "Sweeping latest signal trades...",
    demoScanFound: "Latest signal trade",
    demoScanCadence: "10s cadence",
    demoTradeEmpty: "Waiting for next signal trade...",
    demoNow: "now",
    newSignal: "NEW",
    buy: "Buy",
    sell: "Sell",
    languageToggle: "中文",
    walletSmartMoney: "Smart Money",
    walletWhale: "Whale",
    walletKol: "KOL",
    riskLOW: "LOW",
    riskMEDIUM: "MEDIUM",
    riskHIGH: "HIGH",
    riskCRITICAL: "CRITICAL",
    riskUNKNOWN: "UNKNOWN"
  },
  zh: {
    appEyebrow: "OKX OnchainOS / 智能交易雷达",
    overview: "总览",
    signalFeed: "信号流",
    tokenDossier: "代币档案",
    riskGate: "风险门禁",
    actionQuote: "行动报价",
    liveMode: "实时市场数据",
    refresh: "刷新",
    holderCluster: "持有人结构",
    topTraders: "顶级交易者",
    aiResearchNotes: "AI 研究笔记",
    auditTrail: "审计轨迹",
    usdcSize: "USDC 数量",
    quote: "报价",
    loading: "加载中",
    signalLoading: "正在扫描 OKX 信号频道...",
    sourceUnknown: "未知",
    metricPrice: "价格",
    metricMarketCap: "市值",
    metricLiquidity: "流动性",
    metricVolume: "24h 成交量",
    metricHolders: "持有人",
    metricChange: "24h 涨跌",
    statAmount: "金额",
    statWallets: "钱包",
    statSold: "卖出",
    liveSignalFallback: "已加载 OKX 实时信号。打开代币档案查看结构化研究。",
    riskFallback: "风险扫描暂不可用。",
    blockedQuote: "风险门禁已阻止买入侧报价创建。",
    input: "输入",
    estimatedOutput: "预计输出",
    minOutput: "最低输出",
    impactGas: "影响 / Gas",
    unsignedPrepared: "未签名报价已准备好。",
    quoteExpiry: "{seconds} 秒后过期。最终执行仍由用户确认。",
    currentToken: "当前代币",
    selectedSignal: "已选信号",
    signalScore: "信号分",
    chainWallet: "链 / 钱包",
    tokenAddress: "地址",
    source: "来源",
    radarTitle: "信号雷达",
    radarSubtitle: "把聪明钱、巨鲸和 KOL 活动映射成实时交易目标图。",
    radarSweep: "扫描",
    radarTargets: "目标",
    radarSelected: "当前目标",
    radarRoute: "决策路径",
    demoScanIdle: "演示扫描已就绪",
    demoScanActive: "正在扫描最新信号交易...",
    demoScanFound: "最新信号交易",
    demoScanCadence: "每 10 秒",
    demoTradeEmpty: "等待下一笔信号交易...",
    demoNow: "刚刚",
    newSignal: "新信号",
    buy: "买入",
    sell: "卖出",
    languageToggle: "EN",
    walletSmartMoney: "聪明钱",
    walletWhale: "巨鲸",
    walletKol: "KOL",
    riskLOW: "低",
    riskMEDIUM: "中",
    riskHIGH: "高",
    riskCRITICAL: "严重",
    riskUNKNOWN: "未知"
  }
};

const textTranslations = {
  "Coordinated buys from profitable wallets while sold ratio remains low.": "盈利钱包正在协同买入，同时卖出比例仍然较低。",
  "Whale accumulation is real, but holder concentration needs attention.": "巨鲸确实在累积，但持有人集中度需要重点关注。",
  "Signal is loud, but liquidity and token-scan verdict block buy-side action.": "信号很强，但流动性和代币扫描结论会阻止买入侧动作。",
  "High quality liquidity and repeat buyers; less explosive but more institution-like.": "流动性质量高，重复买家多；爆发力较低，但更接近机构型信号。",
  "No blocking token labels detected. Continue with protected trade preview.": "未检测到阻断性代币标签，可继续进入受保护交易预览。",
  "Quote is available, but holder concentration and whale dominance require caution.": "可以生成报价，但持有人集中和巨鲸主导需要谨慎对待。",
  "Buy action blocked. Liquidity is below safety threshold and token-scan detected critical labels.": "买入动作已阻止。流动性低于安全阈值，且代币扫描发现严重标签。",
  "No blocking risk detected; protected trade preview is available.": "未发现阻断性风险，可以使用受保护交易预览。",
  "Signal quality is strong because trigger wallet count and still-holding ratio agree.": "触发钱包数量和继续持有比例相互印证，因此信号质量较强。",
  "Liquidity is enough for a small exploratory quote, but route and price impact still matter.": "流动性足以支持小额探索性报价，但路由和价格影响仍然重要。",
  "This is a research assistant verdict, not an automated execution instruction.": "这是研究助手判断，不是自动执行指令。",
  "The signal is tradable only as a watchlist candidate until concentration improves.": "在集中度改善前，这个信号只适合作为观察名单候选。",
  "A quote can be generated, but UX should make the warning impossible to miss.": "可以生成报价，但界面必须让警告足够醒目。",
  "TxRadar explains the signal while preserving the block on buy-side action.": "TxRadar 会解释信号，同时保留对买入侧动作的阻断。",
  "A strong social or KOL signal does not override the security verdict.": "强社交或 KOL 信号不能覆盖安全扫描结论。",
  "Higher liquidity lowers execution risk, but upside may be slower than early-stage signals.": "更高流动性降低执行风险，但上涨弹性可能慢于早期信号。",
  "Good candidate for a conservative quote-size preset.": "适合使用更保守的报价金额预设。",
  "OKX signal intelligence loaded": "已加载 OKX 信号情报",
  "Token dossier assembled from price, holders, top traders and trades": "已从价格、持有人、顶级交易者和交易记录组装代币档案",
  "Security token-scan completed with LOW risk": "安全代币扫描完成，风险为低",
  "Action panel unlocked in protected preview mode": "行动面板已在受保护预览模式下解锁",
  "OKX signal intelligence loaded": "已加载 OKX 信号情报",
  "Risk Gate returned MEDIUM": "风险门禁返回中等风险",
  "Action panel remains enabled with warning state": "行动面板保持启用，并显示警告状态",
  "Security token-scan completed with CRITICAL risk": "安全代币扫描完成，风险为严重",
  "Action panel disabled": "行动面板已禁用",
  "User can inspect rationale but cannot create a buy quote": "用户可以查看原因，但不能创建买入报价",
  "Token dossier generated": "代币档案已生成",
  "Risk Gate returned LOW": "风险门禁返回低风险",
  "Protected preview flow enabled": "受保护预览流程已启用",
  "Unsigned quote prepared. Execution requires a separate user-confirmed wallet action.": "未签名报价已准备好。执行需要用户在钱包中单独确认。",
  "Warning quote prepared. Review Risk Gate before any wallet action.": "警告报价已准备好。任何钱包操作前请先复核风险门禁。",
  "Risk Gate blocked buy-side preview creation for this token.": "风险门禁已阻止该代币的买入侧预览创建。",
  "Unsigned quote prepared. Ethereum gas is the main execution cost.": "未签名报价已准备好。以太坊 Gas 是主要执行成本。",
  "verified liquidity": "流动性已验证",
  "distributed holders": "持有人分布较分散",
  "low sell tax": "低卖出税",
  "holder concentration": "持有人集中",
  "recent contract owner activity": "近期合约所有者活动",
  "low liquidity": "低流动性",
  "suspicious ownership": "所有权可疑",
  "sell restriction risk": "卖出限制风险",
  "deep liquidity": "深度流动性",
  "recognized market": "成熟市场",
  "low concentration": "低集中度",
  "Top 10": "前 10 名",
  "Smart Money": "聪明钱",
  "Fresh Wallets": "新钱包",
  "OKX DEX Aggregator": "OKX DEX 聚合器",
  "Base route": "Base 路由",
  "Uniswap-compatible route": "兼容 Uniswap 路由"
};

function t(key, values = {}) {
  let template = copy[state.language][key] || copy.en[key] || key;
  for (const [name, value] of Object.entries(values)) {
    template = template.replace(`{${name}}`, value);
  }
  return template;
}

function tt(value) {
  if (state.language === "en" || typeof value !== "string") return value;
  return textTranslations[value] || value;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

const h = escapeHtml;

function translateWalletType(value) {
  if (value === "Smart Money") return t("walletSmartMoney");
  if (value === "Whale") return t("walletWhale");
  if (value === "KOL") return t("walletKol");
  return value;
}

function translateRiskLevel(value) {
  return t(`risk${value || "UNKNOWN"}`);
}

function displaySource(value) {
  const sourceMap = {
    "signal-cache": state.language === "zh" ? "Signal Cache" : "Signal Cache",
    "market-cache": state.language === "zh" ? "Market Cache" : "Market Cache",
    "demo-live": state.language === "zh" ? "Demo Live" : "Demo Live",
    "okx-live": state.language === "zh" ? "OKX Live" : "OKX Live",
    "protected-preview": state.language === "zh" ? "Protected Preview" : "Protected Preview",
    blocked: state.language === "zh" ? "Blocked" : "Blocked"
  };
  return sourceMap[value] || value || t("sourceUnknown");
}

function viewLabelKey(view) {
  return {
    overview: "overview",
    feed: "signalFeed",
    dossier: "tokenDossier",
    risk: "riskGate",
    action: "actionQuote"
  }[view] || "overview";
}

function createCurrencyFormatter() {
  return new Intl.NumberFormat(state.language === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2
  });
}

function createNumberFormatter() {
  return new Intl.NumberFormat(state.language === "zh" ? "zh-CN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  });
}

function formatUsd(value) {
  return createCurrencyFormatter().format(value || 0);
}

function formatNumber(value) {
  return createNumberFormatter().format(value || 0);
}

function api(path, options = {}) {
  return fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function riskRank(risk) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[risk] || 0;
}

function isBlocked() {
  return state.dossier?.risk?.action === "block" || state.dossier?.risk?.riskLevel === "CRITICAL";
}

function selectedSignal() {
  return state.signals.find((signal) => signal.id === state.selectedId) || null;
}

function setView(view) {
  state.view = view;
  els.workspace.dataset.view = view;
  els.navButtons.forEach((button) => {
    const active = button.dataset.viewTarget === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyLanguage() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  els.i18n.forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  els.languageToggle.textContent = t("languageToggle");
  els.navButtons.forEach((button) => {
    const label = t(viewLabelKey(button.dataset.viewTarget));
    button.title = label;
    button.setAttribute("aria-label", label);
  });
  if (state.signals.length) renderSignals();
  renderRadarVisual();
  renderScanStatus();
  renderTradeTape();
  if (state.dossier) renderDossier();
  if (state.quote) renderQuote(state.quote);
  renderTokenContext();
}

function scanStatusText() {
  if (state.demoScan.scanning) return t("demoScanActive");
  if (state.liveTrades[0]) return `${t("demoScanFound")}: ${state.liveTrades[0].symbol}`;
  return t("demoScanIdle");
}

function renderScanStatus() {
  if (!els.scanStatus) return;
  const demoEnabled = state.mode === "cache";
  els.scanStatus.classList.toggle("hidden", !demoEnabled);
  els.scanStatus.dataset.scanning = String(state.demoScan.scanning);
  if (!demoEnabled) return;

  els.scanStatus.innerHTML = `
    <span class="scan-dot" aria-hidden="true"></span>
    <span>${h(scanStatusText())}</span>
    <strong>${t("demoScanCadence")}</strong>
  `;
}

function renderTradeTape() {
  if (!els.tradeTape) return;
  const demoEnabled = state.mode === "cache";
  els.tradeTape.classList.toggle("hidden", !demoEnabled);
  if (!demoEnabled) return;

  if (!state.liveTrades.length) {
    els.tradeTape.innerHTML = `<div class="trade-tape-empty">${t("demoTradeEmpty")}</div>`;
    return;
  }

  els.tradeTape.innerHTML = state.liveTrades
    .map((trade) => {
      const sideKey = String(trade.side || "").toLowerCase() === "sell" ? "sell" : "buy";
      return `
        <div class="trade-tick" data-side="${sideKey}">
          <span class="trade-side">${t(sideKey)}</span>
          <strong>${h(trade.symbol)}</strong>
          <span>${h(trade.wallet)}</span>
          <span>${formatUsd(trade.amount)}</span>
          <em>${h(trade.time === "demoNow" ? t("demoNow") : trade.time)}</em>
        </div>
      `;
    })
    .join("");
}

function stopDemoScanner() {
  if (state.demoScan.timer) window.clearInterval(state.demoScan.timer);
  if (state.demoScan.kickTimer) window.clearTimeout(state.demoScan.kickTimer);
  if (state.demoScan.pulseTimer) window.clearTimeout(state.demoScan.pulseTimer);
  state.demoScan.timer = null;
  state.demoScan.kickTimer = null;
  state.demoScan.pulseTimer = null;
  state.demoScan.scanning = false;
  state.demoScan.latestIds.clear();
}

function startDemoScanner() {
  stopDemoScanner();
  if (state.mode !== "cache" || !state.signals.length) {
    renderScanStatus();
    renderTradeTape();
    return;
  }

  state.demoScan.timer = window.setInterval(runDemoSignalScan, demoScanIntervalMs);
  state.demoScan.kickTimer = window.setTimeout(runDemoSignalScan, 1200);
  renderScanStatus();
  renderTradeTape();
}

function demoSignalScore(signal) {
  const baseScore = signal.score || Math.max(20, 100 - riskRank(signal.riskLevel) * 13);
  return Math.min(99, baseScore + ((state.demoScan.sequence % 3) + 1));
}

async function runDemoSignalScan() {
  if (state.mode !== "cache" || !state.signals.length || state.demoScan.scanning) return;

  state.demoScan.scanning = true;
  state.demoScan.lastScanAt = new Date();
  renderScanStatus();
  renderRadarVisual();

  await sleep(700);

  const index = state.demoScan.sequence % state.signals.length;
  const signal = state.signals[index];
  let trade = null;
  try {
    const dossier = await api(`/api/dossier/${encodeURIComponent(signal.id)}?mode=cache`);
    const trades = dossier.trades || [];
    trade = trades[state.demoScan.sequence % Math.max(trades.length, 1)] || null;
  } catch {
    trade = null;
  }

  const freshSignal = {
    ...signal,
    amountUsd: Number(signal.amountUsd || 0) * (1 + (state.demoScan.sequence % 4) * 0.018),
    score: demoSignalScore(signal)
  };

  state.demoScan.sequence += 1;
  state.demoScan.scanning = false;
  state.demoScan.latestIds = new Set([freshSignal.id]);
  state.signals = [freshSignal, ...state.signals.filter((item) => item.id !== freshSignal.id)];

  state.liveTrades = [
    {
      id: `${freshSignal.id}-${Date.now()}`,
      signalId: freshSignal.id,
      symbol: freshSignal.symbol,
      wallet: trade?.wallet || "demo...feed",
      amount: Number(trade?.amount || freshSignal.amountUsd || 0),
      side: trade?.side || "Buy",
      time: "demoNow"
    },
    ...state.liveTrades
  ].slice(0, 5);

  if (state.demoScan.pulseTimer) window.clearTimeout(state.demoScan.pulseTimer);
  state.demoScan.pulseTimer = window.setTimeout(() => {
    state.demoScan.latestIds.clear();
    renderSignals();
    renderRadarVisual();
  }, demoScanPulseMs);

  els.feedSource.textContent = displaySource("demo-live");
  renderScanStatus();
  renderTradeTape();
  renderSignals();
  renderRadarVisual();
}

async function loadSignals() {
  els.signals.innerHTML = `<div class="notice">${t("signalLoading")}</div>`;
  const payload = await api(`/api/signals?mode=${state.mode}&chain=${state.chain}`);
  state.signals = payload.items || [];
  els.feedSource.textContent = displaySource(payload.source);

  if (payload.notice) {
    els.notice.textContent = tt(payload.notice);
    els.notice.classList.remove("hidden");
  } else {
    els.notice.classList.add("hidden");
  }

  if (!state.selectedId || !state.signals.some((item) => item.id === state.selectedId)) {
    state.selectedId = state.signals[0]?.id || null;
  }

  renderSignals();
  renderRadarVisual();
  startDemoScanner();
  if (state.selectedId) await loadDossier(state.selectedId);
}

function renderSignals() {
  els.signals.innerHTML = state.signals
    .map((signal) => {
      const active = signal.id === state.selectedId ? " active" : "";
      const fresh = state.demoScan.latestIds.has(signal.id) ? " fresh" : "";
      return `
        <article class="signal-card${active}${fresh}" data-id="${h(signal.id)}">
          <div class="signal-main">
            <div>
              <div class="symbol-row">
                <div class="symbol">${h(signal.symbol)}</div>
                ${fresh ? `<span class="new-badge">${t("newSignal")}</span>` : ""}
              </div>
              <div class="chain">${h(signal.chain)} / ${h(translateWalletType(signal.walletType))}</div>
            </div>
            <div class="score">${signal.score || Math.max(20, 100 - riskRank(signal.riskLevel) * 13)}</div>
          </div>
          <div class="signal-stats">
            <div class="stat"><span>${t("statAmount")}</span><strong>${formatUsd(signal.amountUsd)}</strong></div>
            <div class="stat"><span>${t("statWallets")}</span><strong>${signal.triggerWallets || 0}</strong></div>
            <div class="stat"><span>${t("statSold")}</span><strong>${signal.soldRatioPercent || 0}%</strong></div>
          </div>
          <p class="thesis">${h(tt(signal.thesis) || t("liveSignalFallback"))}</p>
        </article>
      `;
    })
    .join("");

  els.signals.querySelectorAll(".signal-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.id;
      renderSignals();
      renderRadarVisual();
      loadDossier(state.selectedId);
    });
  });
}

function radarPosition(index, total) {
  const angle = -35 + index * (300 / Math.max(total, 1));
  const distance = 26 + (index % 3) * 14;
  const radians = (angle * Math.PI) / 180;
  const x = 50 + Math.cos(radians) * distance;
  const y = 50 + Math.sin(radians) * distance;

  return {
    x: Math.max(12, Math.min(88, x)),
    y: Math.max(16, Math.min(84, y))
  };
}

function renderRadarVisual() {
  if (!state.signals.length) {
    els.radarVisual.innerHTML = `
      <div class="radar-copy">
        <span class="panel-kicker">${t("radarSweep")}</span>
        <h2>${t("radarTitle")}</h2>
        <p>${t("signalLoading")}</p>
      </div>
      <div class="radar-scope is-loading"></div>
    `;
    return;
  }

  const selected = selectedSignal() || state.signals[0];
  const risk = state.dossier?.risk?.riskLevel || selected.riskLevel || "UNKNOWN";
  const market = state.dossier?.market || selected;
  const blips = state.signals
    .map((signal, index) => {
      const pos = radarPosition(index, state.signals.length);
      const active = signal.id === state.selectedId ? " active" : "";
      const fresh = state.demoScan.latestIds.has(signal.id) ? " fresh" : "";
      const level = signal.riskLevel || "UNKNOWN";
      return `
        <button
          class="radar-blip${active}${fresh}"
          data-id="${h(signal.id)}"
          data-risk="${h(level)}"
          style="--x:${pos.x}%; --y:${pos.y}%; --delay:${index * 0.55}s"
          aria-label="${h(signal.symbol)}"
          type="button"
        >
          <span>${h(signal.symbol)}</span>
        </button>
      `;
    })
    .join("");

  els.radarVisual.innerHTML = `
    <div class="radar-copy">
      <span class="panel-kicker">${t("radarSweep")}</span>
      <h2>${t("radarTitle")}</h2>
      <p>${t("radarSubtitle")}</p>
      <div class="radar-stats">
        <div><span>${t("radarTargets")}</span><strong>${state.signals.length}</strong></div>
        <div><span>${t("radarSelected")}</span><strong>${h(selected.symbol)}</strong></div>
        <div><span>${t("riskGate")}</span><strong>${translateRiskLevel(risk)}</strong></div>
      </div>
      <div class="radar-route">
        <span>${t("signalFeed")}</span>
        <span>${t("tokenDossier")}</span>
        <span>${t("riskGate")}</span>
        <span>${t("actionQuote")}</span>
      </div>
    </div>
    <div class="radar-scope${state.demoScan.scanning ? " scanning" : ""}">
      <div class="radar-gridlines"></div>
      <div class="radar-sweep"></div>
      <div class="radar-core">
        <strong>${h(selected.symbol)}</strong>
        <span>${translateRiskLevel(risk)}</span>
      </div>
      ${blips}
      <div class="radar-readout">
        <span>${h(selected.chain)} / ${h(translateWalletType(selected.walletType))}</span>
        <strong>${formatUsd(market.liquidity || selected.liquidity)}</strong>
      </div>
    </div>
  `;

  els.radarVisual.querySelectorAll(".radar-blip").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      renderSignals();
      renderRadarVisual();
      loadDossier(state.selectedId);
    });
  });
}

async function loadDossier(id) {
  els.selectedToken.textContent = t("loading");
  state.dossier = await api(`/api/dossier/${encodeURIComponent(id)}?mode=${state.mode}`);
  renderDossier();
  await loadQuote();
}

function renderDossier() {
  const dossier = state.dossier;
  const market = dossier.market || {};
  const risk = dossier.risk || {};
  els.selectedToken.textContent = `${dossier.symbol} / ${dossier.chain}`;

  els.metrics.innerHTML = [
    [t("metricPrice"), `$${Number(market.price || 0).toLocaleString(state.language === "zh" ? "zh-CN" : "en-US", { maximumSignificantDigits: 4 })}`],
    [t("metricMarketCap"), formatUsd(market.marketCap)],
    [t("metricLiquidity"), formatUsd(market.liquidity)],
    [t("metricVolume"), formatUsd(market.volume24h)],
    [t("metricHolders"), formatNumber(market.holders)],
    [t("metricChange"), `${market.change24h || 0}%`]
  ]
    .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  els.holders.innerHTML = (dossier.holders || [])
    .map((item) => `
      <div class="bar-item">
        <span>${h(tt(item.label))}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(Number(item.value) || 0, 100)}%"></div></div>
        <strong>${formatNumber(item.value)}%</strong>
      </div>
    `)
    .join("");

  els.traders.innerHTML = (dossier.traders || [])
    .map((item) => `
      <div class="compact-item">
        <span>${h(item.wallet)}</span>
        <strong>${formatUsd(item.pnl)} / ${item.winRate || 0}%</strong>
      </div>
    `)
    .join("");

  els.aiNotes.innerHTML = (dossier.ai || [])
    .map((note) => `<div class="note">${h(tt(note))}</div>`)
    .join("");

  const riskLevel = risk.riskLevel || "UNKNOWN";
  els.riskPanel.dataset.risk = riskLevel;
  els.riskBadge.dataset.risk = riskLevel;
  els.riskBadge.textContent = translateRiskLevel(riskLevel);
  els.riskMessage.textContent = tt(risk.message) || t("riskFallback");
  els.riskLabels.innerHTML = (risk.labels || [])
    .map((label) => {
      const value = typeof label === "string" ? label : label.label || JSON.stringify(label);
      return `<span class="tag">${h(tt(value))}</span>`;
    })
    .join("");
  els.audit.innerHTML = (dossier.audit || [])
    .map((item) => `<li>${h(tt(item))}</li>`)
    .join("");
  renderRadarVisual();
  renderTokenContext();
}

function renderTokenContext() {
  const dossier = state.dossier;
  const signal = selectedSignal();

  if (!dossier || !signal) {
    els.tokenContext.classList.add("hidden");
    els.tokenContext.innerHTML = "";
    return;
  }

  const riskLevel = dossier.risk?.riskLevel || "UNKNOWN";
  const market = dossier.market || {};
  els.tokenContext.classList.remove("hidden");
  els.tokenContext.innerHTML = `
    <div class="context-identity">
      <span class="panel-kicker">${t("currentToken")}</span>
      <div class="context-symbol">${h(dossier.symbol)}</div>
      <div class="context-subtitle">${h(dossier.name)} · ${h(dossier.chain)} / ${h(translateWalletType(signal.walletType))}</div>
    </div>
    <div class="context-metrics">
      <div class="context-metric"><span>${t("signalScore")}</span><strong>${signal.score || Math.max(20, 100 - riskRank(signal.riskLevel) * 13)}</strong></div>
      <div class="context-metric"><span>${t("metricMarketCap")}</span><strong>${formatUsd(market.marketCap)}</strong></div>
      <div class="context-metric"><span>${t("metricLiquidity")}</span><strong>${formatUsd(market.liquidity)}</strong></div>
      <div class="context-metric"><span>${t("riskGate")}</span><strong>${translateRiskLevel(riskLevel)}</strong></div>
    </div>
    <div class="context-address">
      <span>${t("tokenAddress")}</span>
      <strong>${h(dossier.address)}</strong>
    </div>
  `;
}

async function loadQuote() {
  const amount = Number(els.amount.value || 100);
  const payload = await api("/api/quote", {
    method: "POST",
    body: JSON.stringify({
      tokenId: state.selectedId,
      amount,
      mode: state.mode,
      from: "usdc"
    })
  });
  state.quote = payload;
  renderQuote(payload);
  renderTokenContext();
}

function renderQuote(quote) {
  const blocked = isBlocked() || quote.mode === "blocked";
  els.quote.disabled = blocked;
  els.quoteMode.textContent = displaySource(quote.source || quote.mode);

  if (blocked) {
    els.quoteCard.innerHTML = `
      <div class="blocked">${t("blockedQuote")}</div>
      <p class="risk-message">${h(tt(quote.message || state.dossier?.risk?.message || ""))}</p>
    `;
    return;
  }

  els.quoteCard.innerHTML = `
    <div class="quote-grid">
      <div class="metric"><span>${t("input")}</span><strong>${quote.inputAmount} ${h(quote.inputSymbol)}</strong></div>
      <div class="metric"><span>${t("estimatedOutput")}</span><strong>${formatNumber(quote.estimatedOutput)} ${h(quote.outputSymbol)}</strong></div>
      <div class="metric"><span>${t("minOutput")}</span><strong>${formatNumber(quote.minOutput)} ${h(quote.outputSymbol)}</strong></div>
      <div class="metric"><span>${t("impactGas")}</span><strong>${quote.priceImpact}% / ${formatUsd(quote.gasUsd)}</strong></div>
    </div>
    <div class="route">${(quote.route || []).map((step) => `<span>${h(tt(step))}</span>`).join("")}</div>
    <p class="risk-message">${h(tt(quote.message) || t("unsignedPrepared"))}</p>
    <p class="risk-message">${t("quoteExpiry", { seconds: quote.expiresInSec || 0 })}</p>
    ${quote.notice ? `<div class="notice">${h(tt(quote.notice))}</div>` : ""}
  `;
}

els.languageToggle.addEventListener("click", () => {
  state.language = state.language === "zh" ? "en" : "zh";
  localStorage.setItem("txradar-language", state.language);
  applyLanguage();
});

els.liveMode.addEventListener("change", () => {
  state.mode = els.liveMode.checked ? "live" : "cache";
  loadSignals();
});

els.refresh.addEventListener("click", loadSignals);
els.quote.addEventListener("click", loadQuote);
els.amount.addEventListener("change", loadQuote);

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewTarget));
});

els.filters.forEach((button) => {
  button.addEventListener("click", () => {
    els.filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.chain = button.dataset.chain;
    loadSignals();
  });
});

setView(state.view);
applyLanguage();
loadSignals();
