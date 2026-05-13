import { join } from "node:path";

export const root = process.cwd();
export const publicDir = join(root, "public");
export const dataPath = join(root, "data", "market-cache.json");
export const port = Number(process.env.PORT || 4173);
export const host = process.env.HOST || "127.0.0.1";
export const cliTimeout = Number(process.env.OKX_TIMEOUT_MS || 9000);
export const onchainosBin = process.env.OKX_ONCHAINOS_BIN || "onchainos";

export const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};
