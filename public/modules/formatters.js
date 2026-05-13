import { state } from "./state.js";

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

export function formatUsd(value) {
  return createCurrencyFormatter().format(value || 0);
}

export function formatNumber(value) {
  return createNumberFormatter().format(value || 0);
}
