# TxRadar MVP

TxRadar is a local OKX OnchainOS MVP for watching high-signal token activity and
turning it into a quote-only decision workflow.

It was shaped from the InfiniMind project `TxRadar Feature MVP` and keeps the
first product loop intentionally small:

```text
Signal Feed -> Token Dossier -> Risk Gate -> Action Quote
```

The app runs as a dependency-free Node static server, ships with demo data, and
can optionally call a local `onchainos` CLI when OKX credentials are configured.

## What It Does

| Surface | Purpose |
| --- | --- |
| Signal Feed | Tracks smart-money, whale, and KOL buy signals across supported chains. |
| Token Dossier | Summarizes price, liquidity, holders, top traders, trades, and research notes. |
| Risk Gate | Applies a token-scan verdict before any quote is shown. |
| Action Quote | Produces unsigned swap previews only. No execution path is included. |

## MVP Principles

- **Fast to inspect:** open the app locally and review a complete demo snapshot.
- **Live when possible:** switch to OKX CLI mode when credentials and region
  access are available.
- **Safe by default:** risk checks sit before quote creation, and the MVP never
  signs, approves, broadcasts, or executes transactions.
- **Small enough to replace:** the demo data, CLI adapters, and UI surfaces are
  deliberately easy to swap as the product direction sharpens.

## Quick Start

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

Useful scripts:

```bash
npm run dev
npm run check
```

## Live OKX Mode

Demo mode works out of the box. To try live OKX CLI calls, apply for credentials:

```text
https://web3.okx.com/onchain-os/dev-portal
```

Create a local `.env` file:

```bash
cp .env.example .env
```

Fill in:

```bash
OKX_API_KEY="your-api-key"
OKX_SECRET_KEY="your-secret-key"
OKX_PASSPHRASE="your-passphrase"
```

Restart the server after editing `.env`, then toggle **Live OKX CLI** in the UI.

If the CLI is missing, rate-limited, region-blocked, or returns no usable data,
TxRadar keeps the MVP reviewable by falling back to `data/demo-data.json`.

## OKX Skill Mapping

| TxRadar area | OKX OnchainOS skill |
| --- | --- |
| Signal Feed | `okx-dex-signal` via `signal list` |
| Token Dossier | `okx-dex-token` via `price-info`, `liquidity`, `top-trader`, and `trades` |
| Risk Gate | `okx-security` via `security token-scan` |
| Action Quote | `okx-dex-swap` via `swap quote` |

## Project Layout

```text
.
├── data/demo-data.json      # bundled demo snapshot
├── public/index.html        # app shell
├── public/app.js            # client-side state and rendering
├── public/styles.css        # dark terminal-style UI
├── server.js                # static server and OKX CLI adapter
└── package.json
```

## Safety Boundary

TxRadar is quote-only. It does not sign, broadcast, force, approve, or execute
transactions.

Any future execution path must preserve the OKX confirmation rules:

- require explicit user confirmation;
- run the security scan first;
- never bypass high-risk verdicts;
- keep the audit trail visible before action.
