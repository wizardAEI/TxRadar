const savedLanguage = localStorage.getItem("txradar-language");

export const demoScanIntervalMs = 10000;
export const demoScanPulseMs = 8200;

export const state = {
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

export function selectedSignal() {
  return state.signals.find((signal) => signal.id === state.selectedId) || null;
}

export function isBlocked() {
  return state.dossier?.risk?.action === "block" || state.dossier?.risk?.riskLevel === "CRITICAL";
}
