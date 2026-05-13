import { state } from "./state.js";

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

export function t(key, values = {}) {
  let template = copy[state.language][key] || copy.en[key] || key;
  for (const [name, value] of Object.entries(values)) {
    template = template.replace(`{${name}}`, value);
  }
  return template;
}

export function tt(value) {
  if (state.language === "en" || typeof value !== "string") return value;
  return textTranslations[value] || value;
}

export function translateWalletType(value) {
  if (value === "Smart Money") return t("walletSmartMoney");
  if (value === "Whale") return t("walletWhale");
  if (value === "KOL") return t("walletKol");
  return value;
}

export function translateRiskLevel(value) {
  return t(`risk${value || "UNKNOWN"}`);
}

export function displaySource(value) {
  const sourceMap = {
    "signal-cache": "Signal Cache",
    "market-cache": "Market Cache",
    "demo-live": "Demo Live",
    "okx-live": "OKX Live",
    "protected-preview": "Protected Preview",
    blocked: "Blocked"
  };
  return sourceMap[value] || value || t("sourceUnknown");
}

export function viewLabelKey(view) {
  return {
    overview: "overview",
    feed: "signalFeed",
    dossier: "tokenDossier",
    risk: "riskGate",
    action: "actionQuote"
  }[view] || "overview";
}
