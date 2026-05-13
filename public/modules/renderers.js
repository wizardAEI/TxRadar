import { els } from "./dom.js";
import { formatNumber, formatUsd } from "./formatters.js";
import { displaySource, t, translateRiskLevel, translateWalletType, tt, viewLabelKey } from "./i18n.js";
import { isBlocked, selectedSignal, state } from "./state.js";
import { h, riskRank } from "./utils.js";

let selectSignalHandler = () => {};

export function setRenderHandlers({ onSelectSignal }) {
  selectSignalHandler = onSelectSignal || selectSignalHandler;
}

export function setView(view) {
  state.view = view;
  els.workspace.dataset.view = view;
  els.navButtons.forEach((button) => {
    const active = button.dataset.viewTarget === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

export function applyLanguage() {
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

export function renderScanStatus() {
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

export function renderTradeTape() {
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

export function renderSignals() {
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
    card.addEventListener("click", () => selectSignalHandler(card.dataset.id));
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

export function renderRadarVisual() {
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
    button.addEventListener("click", () => selectSignalHandler(button.dataset.id));
  });
}

export function renderDossier() {
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

export function renderTokenContext() {
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

export function renderQuote(quote) {
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
