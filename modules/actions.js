import { els } from "./dom.js";
import { displaySource, t, tt } from "./i18n.js";
import { state } from "./state.js";
import { api } from "./utils.js";
import { startDemoScanner } from "./demo-scanner.js";
import { renderDossier, renderQuote, renderRadarVisual, renderSignals, renderTokenContext } from "./renderers.js";

export async function loadSignals() {
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

export async function selectSignal(id) {
  state.selectedId = id;
  renderSignals();
  renderRadarVisual();
  await loadDossier(state.selectedId);
}

export async function loadDossier(id) {
  els.selectedToken.textContent = t("loading");
  state.dossier = await api(`/api/dossier/${encodeURIComponent(id)}?mode=${state.mode}`);
  renderDossier();
  await loadQuote();
}

export async function loadQuote() {
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
