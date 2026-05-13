import { readFile } from "node:fs/promises";
import { dataPath } from "./config.js";

let marketCache;

export async function getMarketCache() {
  if (!marketCache) {
    marketCache = JSON.parse(await readFile(dataPath, "utf8"));
  }
  return marketCache;
}
