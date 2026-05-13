import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cliTimeout, onchainosBin } from "./config.js";

const execFileAsync = promisify(execFile);

export function normalizeError(error) {
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

export async function runOkx(args) {
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

export function extractItems(payload) {
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

export function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && !Array.isArray(payload.data) && typeof payload.data === "object") return payload.data;
  if (payload.result && !Array.isArray(payload.result) && typeof payload.result === "object") return payload.result;
  return payload;
}

export function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

export function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}
