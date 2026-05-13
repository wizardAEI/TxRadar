export function riskActionForLevel(riskLevel, fallback = "review") {
  const level = String(riskLevel || "UNKNOWN").toUpperCase();
  if (level === "CRITICAL") return "block";
  if (level === "HIGH" || level === "MEDIUM") return "warn";
  if (level === "LOW") return "allow";
  return fallback || "review";
}

export function isRiskBlocked(risk) {
  return risk?.action === "block" || String(risk?.riskLevel || "").toUpperCase() === "CRITICAL";
}

export function blockedQuote(token, amount, message = "Risk Gate blocked buy-side preview creation for this token.") {
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
