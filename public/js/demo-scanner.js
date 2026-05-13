import { els } from "./dom.js";
import { displaySource } from "./i18n.js";
import { demoScanIntervalMs, demoScanPulseMs, state } from "./state.js";
import { api, riskRank, sleep } from "./utils.js";
import { renderRadarVisual, renderScanStatus, renderSignals, renderTradeTape } from "./renderers.js";

export function stopDemoScanner() {
  if (state.demoScan.timer) window.clearInterval(state.demoScan.timer);
  if (state.demoScan.kickTimer) window.clearTimeout(state.demoScan.kickTimer);
  if (state.demoScan.pulseTimer) window.clearTimeout(state.demoScan.pulseTimer);
  state.demoScan.timer = null;
  state.demoScan.kickTimer = null;
  state.demoScan.pulseTimer = null;
  state.demoScan.scanning = false;
  state.demoScan.latestIds.clear();
}

export function startDemoScanner() {
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
