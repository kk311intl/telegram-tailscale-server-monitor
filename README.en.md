# Server Monitoring via the Tailscale API

[繁體中文](README.md) · [日本語](README.ja.md) · [English](README.en.md)

Version: `v1.0.0`

A Telegram bot using a Cloudflare Worker, D1, and the Tailscale Devices API to watch whether Tailnet devices are connected to the control plane. It does not check ports or application health.

## Requirements and setup

You need Node.js 22.13+, pnpm 11+, Cloudflare Workers/D1, a Telegram bot, and a Tailscale OAuth client with only `devices:core:read`. The webhook registration script requires PowerShell 7. An OAuth client secret is not a Tailscale auth key.

```powershell
pnpm install --frozen-lockfile
Copy-Item wrangler.jsonc.example wrangler.jsonc
pnpm exec wrangler login
pnpm exec wrangler d1 create tailscale-server-monitor
```

Put the returned D1 `database_id` in the ignored `wrangler.jsonc` and replace `ADMIN_USER_ID` with your numeric Telegram user ID. You may change the Worker and database names. `OFFLINE_AFTER` defaults to `2` (range 2–10); `TAILSCALE_TAILNET` defaults to `-` and usually needs no setting.

Create a Tailscale OAuth client under Devices → Core → Read. Obtain a Telegram Bot Token and generate a random webhook secret in a password manager. Do not put these values in config files or command arguments.

```powershell
pnpm exec wrangler d1 migrations apply STATUS_DB --remote --config wrangler.jsonc
pnpm exec wrangler secret put BOT_TOKEN --config wrangler.jsonc
pnpm exec wrangler secret put WEBHOOK_SECRET --config wrangler.jsonc
pnpm exec wrangler secret put TAILSCALE_CLIENT_ID --config wrangler.jsonc
pnpm exec wrangler secret put TAILSCALE_CLIENT_SECRET --config wrangler.jsonc
pnpm exec wrangler deploy --config wrangler.jsonc
pwsh -File ./tools/Register-TelegramWebhook.ps1 -WorkerUrl https://YOUR_WORKER.workers.dev
```

The last step securely prompts for the Bot Token and the same webhook secret, then registers `/webhook`, `/start`, and the Telegram menu. Replace the example with your actual Worker URL; register the webhook again if the URL changes. Keep production secrets in Cloudflare. Never commit `.dev.vars`, `wrangler.jsonc`, database exports, or logs.

## Usage and verification

In a private Telegram chat, `/start` shows the latest valid snapshot, `/status` syncs and shows the overview, `/list` shows devices, and `/device ID` shows details. Only `ADMIN_USER_ID` can operate the bot. The Worker syncs each minute; it confirms offline status after two valid offline observations at least 60 seconds apart. Temporary API failures do not mark devices offline, and devices tagged `tag:personal` are hidden.

```powershell
pnpm check
pnpm exec wrangler deploy --dry-run --config wrangler.jsonc
Invoke-RestMethod https://YOUR_WORKER.workers.dev/health
```

`/health` only confirms that the Worker responds; check the latest sync in the bot as well. D1 and secrets must be configured before going live. D1 stores device names, tags, Tailscale IPs, public endpoint IPs, status, and timestamps; public endpoint IPs may also be sent to Country.is for flag lookup. IPs are hidden in the bot UI, but this is not an anonymous monitoring tool. Notifications and time displays use UTC+9.

## Use with AI

Paste this prompt together with the repository into ChatGPT, Codex, or another coding agent:

> Read this repository before changing it. It is a Telegram device-status bot built with a Cloudflare Worker, D1 migrations, a one-minute Cron, and the Tailscale Devices API using an OAuth client with `devices:core:read`. Help me install, configure, deploy, troubleshoot, or make a small change. Required private values are the Telegram Bot Token, webhook secret, Telegram admin user ID, Tailscale OAuth client ID/secret, Cloudflare account access, and a D1 database ID. Keep secrets and private hostnames out of code, docs, tests, logs, and Git; use Wrangler secrets and the ignored `wrangler.jsonc`. Preserve the current monitoring behavior and architecture. Run `pnpm check` and a Wrangler dry-run before suggesting deployment, and ask only for missing values that are necessary.
