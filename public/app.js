const state = {
  mode: "demo",
  chain: "solana",
  signals: [],
  selectedId: null,
  dossier: null
};

const els = {
  liveMode: document.querySelector("#live-mode"),
  refresh: document.querySelector("#refresh"),
  filters: [...document.querySelectorAll(".filter")],
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

const formatUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2
});

const formatNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2
});

function api(path, options = {}) {
  return fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  }).then((response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  });
}

function riskRank(risk) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[risk] || 0;
}

function isBlocked() {
  return state.dossier?.risk?.action === "block" || state.dossier?.risk?.riskLevel === "CRITICAL";
}

async function loadSignals() {
  els.signals.innerHTML = `<div class="notice">Scanning OKX signal channels...</div>`;
  const payload = await api(`/api/signals?mode=${state.mode}&chain=${state.chain}`);
  state.signals = payload.items || [];
  els.feedSource.textContent = payload.source || "unknown";

  if (payload.notice) {
    els.notice.textContent = payload.notice;
    els.notice.classList.remove("hidden");
  } else {
    els.notice.classList.add("hidden");
  }

  if (!state.selectedId || !state.signals.some((item) => item.id === state.selectedId)) {
    state.selectedId = state.signals[0]?.id || null;
  }

  renderSignals();
  if (state.selectedId) await loadDossier(state.selectedId);
}

function renderSignals() {
  els.signals.innerHTML = state.signals
    .map((signal) => {
      const active = signal.id === state.selectedId ? " active" : "";
      return `
        <article class="signal-card${active}" data-id="${signal.id}">
          <div class="signal-main">
            <div>
              <div class="symbol">${signal.symbol}</div>
              <div class="chain">${signal.chain} / ${signal.walletType}</div>
            </div>
            <div class="score">${signal.score || Math.max(20, 100 - riskRank(signal.riskLevel) * 13)}</div>
          </div>
          <div class="signal-stats">
            <div class="stat"><span>Amount</span><strong>${formatUsd.format(signal.amountUsd || 0)}</strong></div>
            <div class="stat"><span>Wallets</span><strong>${signal.triggerWallets || 0}</strong></div>
            <div class="stat"><span>Sold</span><strong>${signal.soldRatioPercent || 0}%</strong></div>
          </div>
          <p class="thesis">${signal.thesis || "Live OKX signal loaded. Open dossier for structured research."}</p>
        </article>
      `;
    })
    .join("");

  els.signals.querySelectorAll(".signal-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.id;
      renderSignals();
      loadDossier(state.selectedId);
    });
  });
}

async function loadDossier(id) {
  els.selectedToken.textContent = "loading";
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
    ["Price", `$${Number(market.price || 0).toLocaleString("en-US", { maximumSignificantDigits: 4 })}`],
    ["Market Cap", formatUsd.format(market.marketCap || 0)],
    ["Liquidity", formatUsd.format(market.liquidity || 0)],
    ["24h Volume", formatUsd.format(market.volume24h || 0)],
    ["Holders", formatNumber.format(market.holders || 0)],
    ["24h Change", `${market.change24h || 0}%`]
  ]
    .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  els.holders.innerHTML = (dossier.holders || [])
    .map((item) => `
      <div class="bar-item">
        <span>${item.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(item.value, 100)}%"></div></div>
        <strong>${item.value}%</strong>
      </div>
    `)
    .join("");

  els.traders.innerHTML = (dossier.traders || [])
    .map((item) => `
      <div class="compact-item">
        <span>${item.wallet}</span>
        <strong>${formatUsd.format(item.pnl || 0)} / ${item.winRate || 0}%</strong>
      </div>
    `)
    .join("");

  els.aiNotes.innerHTML = (dossier.ai || [])
    .map((note) => `<div class="note">${note}</div>`)
    .join("");

  const riskLevel = risk.riskLevel || "UNKNOWN";
  els.riskPanel.dataset.risk = riskLevel;
  els.riskBadge.dataset.risk = riskLevel;
  els.riskBadge.textContent = riskLevel;
  els.riskMessage.textContent = risk.message || "Risk scan is not available yet.";
  els.riskLabels.innerHTML = (risk.labels || [])
    .map((label) => `<span class="tag">${typeof label === "string" ? label : label.label || JSON.stringify(label)}</span>`)
    .join("");
  els.audit.innerHTML = (dossier.audit || [])
    .map((item) => `<li>${item}</li>`)
    .join("");
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
  renderQuote(payload);
}

function renderQuote(quote) {
  const blocked = isBlocked() || quote.mode === "blocked";
  els.quote.disabled = blocked;
  els.quoteMode.textContent = quote.source || quote.mode || "quote-only";

  if (blocked) {
    els.quoteCard.innerHTML = `
      <div class="blocked">Risk Gate blocked buy-side quote creation.</div>
      <p class="risk-message">${quote.message || state.dossier?.risk?.message || ""}</p>
    `;
    return;
  }

  els.quoteCard.innerHTML = `
    <div class="quote-grid">
      <div class="metric"><span>Input</span><strong>${quote.inputAmount} ${quote.inputSymbol}</strong></div>
      <div class="metric"><span>Est. Output</span><strong>${formatNumber.format(quote.estimatedOutput || 0)} ${quote.outputSymbol}</strong></div>
      <div class="metric"><span>Min. Output</span><strong>${formatNumber.format(quote.minOutput || 0)} ${quote.outputSymbol}</strong></div>
      <div class="metric"><span>Impact / Gas</span><strong>${quote.priceImpact}% / ${formatUsd.format(quote.gasUsd || 0)}</strong></div>
    </div>
    <div class="route">${(quote.route || []).map((step) => `<span>${step}</span>`).join("")}</div>
    <p class="risk-message">${quote.message || "Unsigned quote prepared."}</p>
    <p class="risk-message">Expires in ${quote.expiresInSec || 0}s. TxRadar helps you decide; it does not decide for you.</p>
    ${quote.notice ? `<div class="notice">${quote.notice}</div>` : ""}
  `;
}

els.liveMode.addEventListener("change", () => {
  state.mode = els.liveMode.checked ? "live" : "demo";
  loadSignals();
});

els.refresh.addEventListener("click", loadSignals);
els.quote.addEventListener("click", loadQuote);
els.amount.addEventListener("change", loadQuote);

els.filters.forEach((button) => {
  button.addEventListener("click", () => {
    els.filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.chain = button.dataset.chain;
    loadSignals();
  });
});

loadSignals();
