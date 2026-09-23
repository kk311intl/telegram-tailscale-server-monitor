# Telegram 伺服器監控 Bot（基於 Tailscale API）

[中文](#zh-tw) · [日本語](#ja) · [English](#en) · [AI 提示詞 / AI プロンプト / AI prompts](#ai-prompts)

版本 / バージョン / Version：`v1.1.0`

<a id="ai-prompts"></a>
## AI 提示詞 / AI プロンプト / AI prompts

### 中文

```text
先閱讀這個 repository，再協助我安裝、設定、部署、排錯或小幅修改。這首先是一個 Telegram 伺服器監控 Bot：Cloudflare Worker 處理 Telegram Webhook、每分鐘 Cron 與 D1，並以只讀 OAuth（devices:core:read）查詢 Tailscale Devices API 判斷設備是否連接控制平面。介面與通知支援中文、日文、英文，部署時以 BOT_LANGUAGE 指定，顯示時區由 TIME_ZONE 指定。必要的私人設定包括 Telegram Bot Token、Webhook Secret、管理者 Telegram User ID、Tailscale OAuth Client ID/Secret、Cloudflare 存取權限及 D1 database ID。不要將 Token、密碼、私人 IP、域名或路徑寫入程式、文件、測試、日誌或 Git；用 Wrangler secrets 和被忽略的 wrangler.jsonc。保留現有架構與監控邏輯，先指出真正需要修改的檔案，避免增加無用依賴或文件。修改後執行 pnpm check 和 Wrangler dry-run，只詢問確實缺少的必要值。
```

### 日本語

```text
まず repository を読み、インストール、設定、デプロイ、障害調査、または小さな変更を手伝ってください。これは第一に Telegram のサーバー監視 Bot です。Cloudflare Worker が Telegram Webhook、毎分の Cron、D1 を扱い、読み取り専用 OAuth（devices:core:read）で Tailscale Devices API を参照して端末のコントロールプレーン接続を判定します。画面と通知は中国語・日本語・英語に対応し、デプロイ時に BOT_LANGUAGE と TIME_ZONE を指定します。必要な非公開設定は Telegram Bot Token、Webhook Secret、管理者の Telegram User ID、Tailscale OAuth Client ID/Secret、Cloudflare へのアクセス権、D1 database ID です。Token、パスワード、非公開 IP・ドメイン・パスをコード、文書、テスト、ログ、Git に入れないでください。Wrangler secrets と Git 対象外の wrangler.jsonc を使います。既存の構成と監視ロジックを保ち、変更が必要なファイルだけを先に特定し、不要な依存関係や文書を増やさないでください。変更後は pnpm check と Wrangler dry-run を実行し、本当に必要な不足情報だけ質問してください。
```

### English

```text
Read this repository first, then help me install, configure, deploy, troubleshoot, or make a small change. This is primarily a Telegram server-monitoring bot: a Cloudflare Worker handles the Telegram webhook, a one-minute Cron, and D1, while read-only OAuth (devices:core:read) queries the Tailscale Devices API for control-plane connectivity. The UI and alerts support Chinese, Japanese, and English through deployment-time BOT_LANGUAGE; TIME_ZONE controls displayed times. Required private values are the Telegram Bot Token, webhook secret, admin Telegram user ID, Tailscale OAuth client ID/secret, Cloudflare account access, and a D1 database ID. Never put tokens, passwords, private IPs, domains, or paths in code, docs, tests, logs, or Git; use Wrangler secrets and the ignored wrangler.jsonc. Preserve the current architecture and monitoring logic, identify only the files that need changing, and avoid unnecessary dependencies or docs. Run pnpm check and a Wrangler dry-run after changes; ask only for missing values that are actually required.
```

<a id="zh-tw"></a>
## 中文

這是透過 Telegram 查看狀態與接收通知的伺服器監控 Bot。它以 Cloudflare Worker、D1 和 Tailscale Devices API 監看 Tailnet 設備是否連接控制平面；**不檢查端口或應用服務健康**。

README、AI 提示詞與 Bot 介面／通知皆支援中文、日文、英文；在 Worker 部署設定以 `BOT_LANGUAGE` 指定，預設 `zh`。

授權：本專案採用 [GNU GPL v3.0（僅此版本）](LICENSE)。Copyright (C) 2026 kk311intl。

### 需求與設定

需要 Node.js 22.13+、pnpm 11+、Cloudflare Workers/D1、Telegram Bot，以及只授予 `devices:core:read` 的 Tailscale OAuth Client。註冊 Webhook 的腳本需要 PowerShell 7。OAuth Client Secret 不是 Tailscale Auth key。

```powershell
pnpm install --frozen-lockfile
Copy-Item wrangler.jsonc.example wrangler.jsonc
pnpm exec wrangler login
pnpm exec wrangler d1 create tailscale-server-monitor
```

在不提交的 `wrangler.jsonc` 填入 D1 `database_id`，並將 `ADMIN_USER_ID` 改為自己的 Telegram 數字 User ID。Worker 名稱、資料庫名稱可自行修改。`OFFLINE_AFTER` 預設為 `2`（範圍 2–10）；`BOT_LANGUAGE` 可設 `zh`、`ja` 或 `en`，預設 `zh`；`TIME_ZONE` 預設為 `Asia/Tokyo`，可填 IANA 時區名稱；`TAILSCALE_TAILNET` 預設為 `-`，通常不用設定。

日後更改 `BOT_LANGUAGE` 時，重新執行 Webhook 註冊腳本以同步 Telegram `/start` 命令說明。

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

最後一步會隱藏輸入 Bot Token 與同一個 Webhook Secret，向 Telegram 註冊 `/webhook`、`/start` 命令及選單。用實際 Worker 網址取代範例；正式網址變更後需重新註冊 Webhook。正式 Secret 應保存在 Cloudflare，不要提交 `.dev.vars`、`wrangler.jsonc`、資料庫匯出或日誌。

### 使用與驗證

Telegram 私聊 `/start` 顯示最近的有效快照；`/status` 同步並顯示總覽，`/list` 顯示設備，`/device ID` 顯示詳情。只有 `ADMIN_USER_ID` 可操作。Worker 每分鐘同步；連續兩次有效離線觀察、且至少相隔 60 秒，才確認離線。短暫 API 故障不會把設備判成離線，`tag:personal` 設備會隱藏。

```powershell
pnpm check
pnpm exec wrangler deploy --dry-run --config wrangler.jsonc
Invoke-RestMethod https://YOUR_WORKER.workers.dev/health
```

`/health` 只證明 Worker 可回應；還需在 Bot 查看最新同步。D1 會保存設備名稱、標籤、Tailscale IP、公開端點 IP、狀態與時間；公開端點 IP 也可能傳給 Country.is 推斷國旗。Bot 畫面不顯示 IP，但這不是匿名監控工具。通知與詳細頁使用 `TIME_ZONE`（預設 `Asia/Tokyo`）格式化時間，UTC 位移依日期顯示；無效時區回退至預設值。離線通知顯示「最後在線」，恢復通知顯示恢復前快照的「最後上線」。

<a id="ja"></a>
## 日本語

Telegram で状態を確認し、通知を受け取るサーバー監視 Bot です。Cloudflare Worker、D1、Tailscale Devices API を使って Tailnet の端末がコントロールプレーンに接続しているかを監視します。**ポートやアプリケーションの稼働確認ではありません。**

README、AI プロンプト、Bot の画面と通知は中国語・日本語・英語に対応します。Worker の `BOT_LANGUAGE` で指定し、既定値は `zh` です。

ライセンス：本プロジェクトは [GNU GPL v3.0（このバージョンのみ）](LICENSE) です。Copyright (C) 2026 kk311intl。

### 要件と設定

Node.js 22.13+、pnpm 11+、Cloudflare Workers/D1、Telegram Bot、`devices:core:read` のみを許可した Tailscale OAuth クライアントが必要です。Webhook 登録スクリプトには PowerShell 7 を使います。OAuth Client Secret は Tailscale の Auth key ではありません。

```powershell
pnpm install --frozen-lockfile
Copy-Item wrangler.jsonc.example wrangler.jsonc
pnpm exec wrangler login
pnpm exec wrangler d1 create tailscale-server-monitor
```

返された D1 の `database_id` を Git 対象外の `wrangler.jsonc` に入力し、`ADMIN_USER_ID` を自分の Telegram ユーザー ID（数字）に変更します。Worker 名とデータベース名は変更できます。`OFFLINE_AFTER` は既定で `2`（2～10）、`BOT_LANGUAGE` は `zh`・`ja`・`en` から選択（既定 `zh`）、`TIME_ZONE` は既定で `Asia/Tokyo`（IANA タイムゾーン名）、`TAILSCALE_TAILNET` は既定で `-` なので通常は追加設定不要です。

後で `BOT_LANGUAGE` を変更した場合、Webhook 登録スクリプトを再実行して Telegram の `/start` コマンド説明も更新してください。

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

### 使い方と確認

Telegram の個人チャットで `/start` は有効な最新スナップショット、`/status` は同期と概要、`/list` は端末一覧、`/device ID` は詳細を表示します。操作できるのは `ADMIN_USER_ID` のみです。Worker は毎分同期し、60 秒以上離れた有効なオフライン観測が 2 回続くとオフラインと判定します。一時的な API 障害ではオフラインにせず、`tag:personal` の端末は非表示にします。

```powershell
pnpm check
pnpm exec wrangler deploy --dry-run --config wrangler.jsonc
Invoke-RestMethod https://YOUR_WORKER.workers.dev/health
```

`/health` は Worker の応答だけを確認します。Bot 側でも最新の同期を確認してください。D1 には端末名、タグ、Tailscale IP、公開エンドポイント IP、状態と時刻が保存され、国旗の判定に公開エンドポイント IP を Country.is へ送る場合もあります。Bot の画面では IP を隠しますが、匿名監視ツールではありません。通知と詳細画面の時刻は `TIME_ZONE`（既定 `Asia/Tokyo`）で表示し、UTC オフセットは日付に合わせて変わります。無効なタイムゾーンは既定値に戻します。オフライン通知は最終オンライン時刻、復旧通知は直前のオフライン記録にある最終接続時刻を表示します。

<a id="en"></a>
## English

A Telegram bot for viewing server status and receiving alerts. It uses a Cloudflare Worker, D1, and the Tailscale Devices API to watch whether Tailnet devices are connected to the control plane. **It does not check ports or application health.**

The README, AI prompts, bot UI, and alerts support Chinese, Japanese, and English. Set `BOT_LANGUAGE` in the Worker configuration; the default is `zh`.

License: This project is licensed under [GNU GPL v3.0 only](LICENSE). Copyright (C) 2026 kk311intl.

### Requirements and setup

You need Node.js 22.13+, pnpm 11+, Cloudflare Workers/D1, a Telegram bot, and a Tailscale OAuth client with only `devices:core:read`. The webhook registration script requires PowerShell 7. An OAuth client secret is not a Tailscale auth key.

```powershell
pnpm install --frozen-lockfile
Copy-Item wrangler.jsonc.example wrangler.jsonc
pnpm exec wrangler login
pnpm exec wrangler d1 create tailscale-server-monitor
```

Put the returned D1 `database_id` in the ignored `wrangler.jsonc` and replace `ADMIN_USER_ID` with your numeric Telegram user ID. You may change the Worker and database names. `OFFLINE_AFTER` defaults to `2` (range 2–10); `BOT_LANGUAGE` accepts `zh`, `ja`, or `en` (default `zh`); `TIME_ZONE` defaults to `Asia/Tokyo` and accepts an IANA time zone; `TAILSCALE_TAILNET` defaults to `-` and usually needs no setting.

If you change `BOT_LANGUAGE` later, rerun the webhook registration script to update Telegram's `/start` command description.

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

### Usage and verification

In a private Telegram chat, `/start` shows the latest valid snapshot, `/status` syncs and shows the overview, `/list` shows devices, and `/device ID` shows details. Only `ADMIN_USER_ID` can operate the bot. The Worker syncs each minute; it confirms offline status after two valid offline observations at least 60 seconds apart. Temporary API failures do not mark devices offline, and devices tagged `tag:personal` are hidden.

```powershell
pnpm check
pnpm exec wrangler deploy --dry-run --config wrangler.jsonc
Invoke-RestMethod https://YOUR_WORKER.workers.dev/health
```

`/health` only confirms that the Worker responds; check the latest sync in the bot as well. D1 stores device names, tags, Tailscale IPs, public endpoint IPs, status, and timestamps; public endpoint IPs may also be sent to Country.is for flag lookup. IPs are hidden in the bot UI, but this is not an anonymous monitoring tool. Notifications and device details use `TIME_ZONE` (default `Asia/Tokyo`), with the UTC offset calculated for each date; invalid time zones fall back to the default. Offline alerts show the last online time; recovery alerts show the last online time from the preceding offline snapshot.
