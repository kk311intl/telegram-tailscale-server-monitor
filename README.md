# 基於 Tailscale API 的伺服器監測

[繁體中文](README.md) · [日本語](README.ja.md) · [English](README.en.md)

版本：`v1.0.0`

以 Cloudflare Worker、D1、Telegram Bot 和 Tailscale Devices API 監看 Tailnet 設備是否連接控制平面。這不是端口或應用服務健康檢查。

## 需求與設定

需要 Node.js 22.13+、pnpm 11+、Cloudflare Workers/D1、Telegram Bot，以及只授予 `devices:core:read` 的 Tailscale OAuth Client。註冊 Webhook 的腳本需要 PowerShell 7。OAuth Client Secret 不是 Tailscale Auth key。

```powershell
pnpm install --frozen-lockfile
Copy-Item wrangler.jsonc.example wrangler.jsonc
pnpm exec wrangler login
pnpm exec wrangler d1 create tailscale-server-monitor
```

在不提交的 `wrangler.jsonc` 填入 D1 `database_id`，並將 `ADMIN_USER_ID` 改為自己的 Telegram 數字 User ID。Worker 名稱、資料庫名稱可自行修改。`OFFLINE_AFTER` 預設為 `2`（範圍 2–10）；`TAILSCALE_TAILNET` 預設為 `-`，通常不用設定。

在 Tailscale Admin Console 建立 OAuth Client，權限只選 Devices → Core → Read。準備 Telegram Bot Token，另用密碼管理器產生隨機 Webhook Secret；不要把它們寫入設定檔或命令列參數。

```powershell
pnpm exec wrangler d1 migrations apply STATUS_DB --remote --config wrangler.jsonc
pnpm exec wrangler secret put BOT_TOKEN --config wrangler.jsonc
pnpm exec wrangler secret put WEBHOOK_SECRET --config wrangler.jsonc
pnpm exec wrangler secret put TAILSCALE_CLIENT_ID --config wrangler.jsonc
pnpm exec wrangler secret put TAILSCALE_CLIENT_SECRET --config wrangler.jsonc
pnpm exec wrangler deploy --config wrangler.jsonc
pwsh -File ./tools/Register-TelegramWebhook.ps1 -WorkerUrl https://YOUR_WORKER.workers.dev
```

最後一步會隱藏輸入 Bot Token 與同一個 Webhook Secret，向 Telegram 註冊 `/webhook`、`/start` 命令及選單。用實際 Worker 網址取代範例；若正式網址變更，需重新註冊 Webhook。正式 Secret 應保存在 Cloudflare，不要提交 `.dev.vars`、`wrangler.jsonc`、資料庫匯出或日誌。

## 使用與驗證

Telegram 私聊 `/start` 顯示最近的有效快照；`/status` 同步並顯示總覽，`/list` 顯示設備，`/device ID` 顯示詳情。只有 `ADMIN_USER_ID` 可操作。Worker 每分鐘同步；連續兩次有效離線觀察、且至少相隔 60 秒，才確認離線。短暫 API 故障不會把設備判成離線，`tag:personal` 設備會隱藏。

```powershell
pnpm check
pnpm exec wrangler deploy --dry-run --config wrangler.jsonc
Invoke-RestMethod https://YOUR_WORKER.workers.dev/health
```

`/health` 只證明 Worker 可回應；還需在 Bot 查看最新同步。上線前請確認 D1 和 Secrets 已設定。設備名稱、標籤、Tailscale IP、公開端點 IP、狀態與時間會存入 D1；公開端點 IP 也可能傳給 Country.is 推斷國旗。畫面不顯示 IP，但不應把本專案當作匿名監控工具。通知與時間顯示使用 UTC+9。

## 使用 AI

可將以下文字連同 repository 貼給 ChatGPT、Codex 或其他 coding agent：

> Read this repository before changing it. It is a Telegram device-status bot built with a Cloudflare Worker, D1 migrations, a one-minute Cron, and the Tailscale Devices API using an OAuth client with `devices:core:read`. Help me install, configure, deploy, troubleshoot, or make a small change. Required private values are the Telegram Bot Token, webhook secret, Telegram admin user ID, Tailscale OAuth client ID/secret, Cloudflare account access, and a D1 database ID. Keep secrets and private hostnames out of code, docs, tests, logs, and Git; use Wrangler secrets and the ignored `wrangler.jsonc`. Preserve the current monitoring behavior and architecture. Run `pnpm check` and a Wrangler dry-run before suggesting deployment, and ask only for missing values that are necessary.
