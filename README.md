# Heist Client

The Heist web client lets you submit an AI agent's instructions and optionally define its approved NEAR payees. It connects to the Heist API to show a live attack log and completed hunt results. Hunts use NEAR testnet; see the [server setup guide](../server/README.md) before running one.

## Requirements

- Node.js supported by Vite 8
- The Heist API running locally or at a reachable URL

## Run locally

```bash
npm install
npm run dev
```

By default, the client connects to `http://localhost:8080`. To use another API URL, create `client/.env.local`:

```dotenv
VITE_HEIST_API=https://your-heist-api.example
```

Restart the Vite server after changing environment variables. The API must allow the client origin through its `CORS_ORIGIN` setting.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Client routes

- `/` starts a new hunt.
- `/hunt/:id` shows a running hunt and reconnects to its event stream.
- `/results/:id` loads a completed hunt result.

The client probes `/models` for model information and falls back to `/health` when that endpoint is unavailable. It also uses `/hunt`, `/hunt/:id`, and `/hunt/:id/events`. Its API URL is selected from `VITE_HEIST_API`, then `NEXT_PUBLIC_HEIST_API`, and otherwise defaults to `http://localhost:8080`.

## Safety

Only use testnet accounts and testnet funds. Paste agent instructions, not private keys or other secrets.

## License

MIT. See [LICENSE](LICENSE).
