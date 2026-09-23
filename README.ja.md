# Tailscale API によるサーバー監視

[繁體中文](README.md) · [日本語](README.ja.md) · [English](README.en.md)

バージョン：`v1.0.0`

Cloudflare Worker、D1、Telegram Bot、Tailscale Devices API を使い、Tailnet の端末がコントロールプレーンに接続しているかを監視します。ポートやアプリケーションの稼働確認ではありません。

## 要件と設定

Node.js 22.13+、pnpm 11+、Cloudflare Workers/D1、Telegram Bot、`devices:core:read` のみを許可した Tailscale OAuth クライアントが必要です。Webhook 登録スクリプトには PowerShell 7 を使います。OAuth Client Secret は Tailscale の Auth key ではありません。

```powershell
pnpm install --frozen-lockfile
Copy-Item wrangler.jsonc.example wrangler.jsonc
pnpm exec wrangler login
pnpm exec wrangler d1 create tailscale-server-monitor
```

返された D1 の `database_id` を Git 対象外の `wrangler.jsonc` に入力し、`ADMIN_USER_ID` を自分の Telegram ユーザー ID（数字）に変更します。Worker 名とデータベース名は変更できます。`OFFLINE_AFTER` は既定で `2`（2～10）、`TAILSCALE_TAILNET` は既定で `-` なので通常は追加設定不要です。

Tailscale Admin Console で Devices → Core → Read の OAuth クライアントを作成します。Telegram Bot Token を用意し、パスワードマネージャーでランダムな Webhook Secret を生成してください。設定ファイルやコマンド引数に秘密値を書かないでください。

```powershell
pnpm exec wrangler d1 migrations apply STATUS_DB --remote --config wrangler.jsonc
pnpm exec wrangler secret put BOT_TOKEN --config wrangler.jsonc
pnpm exec wrangler secret put WEBHOOK_SECRET --config wrangler.jsonc
pnpm exec wrangler secret put TAILSCALE_CLIENT_ID --config wrangler.jsonc
pnpm exec wrangler secret put TAILSCALE_CLIENT_SECRET --config wrangler.jsonc
pnpm exec wrangler deploy --config wrangler.jsonc
pwsh -File ./tools/Register-TelegramWebhook.ps1 -WorkerUrl https://YOUR_WORKER.workers.dev
```

最後の手順では Bot Token と同じ Webhook Secret を非表示で入力し、`/webhook`、`/start`、Telegram メニューを登録します。URL を実際の Worker URL に置き換えてください。URL を変えた場合は再登録が必要です。運用用の Secret は Cloudflare に保存し、`.dev.vars`、`wrangler.jsonc`、データベースのエクスポートやログをコミットしないでください。

## 使い方と確認

Telegram の個人チャットで `/start` は有効な最新スナップショット、`/status` は同期と概要、`/list` は端末一覧、`/device ID` は詳細を表示します。操作できるのは `ADMIN_USER_ID` のみです。Worker は毎分同期し、60 秒以上離れた有効なオフライン観測が 2 回続くとオフラインと判定します。一時的な API 障害ではオフラインにせず、`tag:personal` の端末は非表示にします。

```powershell
pnpm check
pnpm exec wrangler deploy --dry-run --config wrangler.jsonc
Invoke-RestMethod https://YOUR_WORKER.workers.dev/health
```

`/health` は Worker の応答だけを確認します。Bot 側でも最新の同期を確認してください。運用前に D1 と Secret の設定が必要です。D1 には端末名、タグ、Tailscale IP、公開エンドポイント IP、状態と時刻が保存されます。国旗の判定に公開エンドポイント IP を Country.is へ送る場合もあります。Bot の画面では IP を隠しますが、匿名監視ツールではありません。通知と時刻表示は UTC+9 です。

## AI で使う

次の文を repository と一緒に ChatGPT、Codex などの coding agent に渡せます。

> Read this repository before changing it. It is a Telegram device-status bot built with a Cloudflare Worker, D1 migrations, a one-minute Cron, and the Tailscale Devices API using an OAuth client with `devices:core:read`. Help me install, configure, deploy, troubleshoot, or make a small change. Required private values are the Telegram Bot Token, webhook secret, Telegram admin user ID, Tailscale OAuth client ID/secret, Cloudflare account access, and a D1 database ID. Keep secrets and private hostnames out of code, docs, tests, logs, and Git; use Wrangler secrets and the ignored `wrangler.jsonc`. Preserve the current monitoring behavior and architecture. Run `pnpm check` and a Wrangler dry-run before suggesting deployment, and ask only for missing values that are necessary.
