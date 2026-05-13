import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { getDossier, getSignals } from "./server/api.js";
import { host, port } from "./server/config.js";
import { loadDotEnv } from "./server/env.js";
import { readRequestBody, sendJson, serveStatic } from "./server/http.js";
import { normalizeError } from "./server/okx.js";
import { getQuotePayload } from "./server/quotes.js";

await loadDotEnv();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        app: "TxRadar",
        onchainos: existsSync("/Users/wangdejiang/.local/bin/onchainos") ? "available" : "path-or-not-installed"
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/signals") {
      sendJson(response, 200, await getSignals(url));
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/dossier/")) {
      sendJson(response, 200, await getDossier(url, decodeURIComponent(url.pathname.split("/").pop() || "")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/quote") {
      sendJson(response, 200, await getQuotePayload(await readRequestBody(request)));
      return;
    }

    if (request.method === "GET") {
      await serveStatic(url.pathname, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, { error: normalizeError(error) });
  }
});

server.listen(port, host, () => {
  console.log(`TxRadar running at http://${host}:${port}`);
});
