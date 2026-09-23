import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchTailscaleDevices } from "../src/index.js";

const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const translations = readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
const updateLifecycle = readFileSync(new URL("../src/update-lifecycle.js", import.meta.url), "utf8");
const config = readFileSync(new URL("../wrangler.jsonc.example", import.meta.url), "utf8");
const devVars = readFileSync(new URL("../.dev.vars.example", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");

test("webhook requires Telegram secret and claims update IDs", () => {
  assert.match(source, /X-Telegram-Bot-Api-Secret-Token/);
  assert.match(source, /secureEqual/);
  assert.match(updateLifecycle, /INSERT INTO processed_updates\(update_id, processed_at, status, lease_token, lease_until\)/);
  assert.match(source, /status: 503/);
  assert.match(source, /completeUpdate/);
  assert.match(source, /releaseUpdate/);
});

test("all UI paths enforce the configured owner and private chat", () => {
  assert.match(source, /String\(message\.from\.id\) !== String\(env\.ADMIN_USER_ID\)/);
  assert.match(source, /String\(query\.from\.id\) !== String\(env\.ADMIN_USER_ID\)/);
  assert.match(source, /message\.chat\?\.type !== "private"/);
  assert.match(source, /query\?\.message\?\.chat\?\.type === "private"/);
});

test("monitor uses only Tailscale OAuth and Devices API", () => {
  assert.match(source, /\/oauth\/token/);
  assert.match(source, /\/tailnet\/\$\{tailnet\}\/devices/);
  assert.match(source, /authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(source, /cloudflare:sockets|checkPort|新增伺服器|confirm-delete/);
  assert.match(config, /"crons": \["\* \* \* \* \*"\]/);
});

test("personal devices are excluded and GeoIP work is bounded", () => {
  assert.match(source, /filter\(\(device\) => !isPersonalDevice\(device\)\)/);
  assert.match(source, /const GEOIP_CACHE_SECONDS = 7 \* 86400/);
  assert.match(source, /const GEOIP_RETRY_SECONDS = 6 \* 3600/);
  assert.match(source, /const GEOIP_LOOKUPS_PER_SYNC = 5/);
  assert.match(source, /candidates\.slice\(0, GEOIP_LOOKUPS_PER_SYNC\)/);
  assert.match(source, /GeoIP lookup failed/);
  assert.match(source, /s\.enabled = 1/);
});

test("Telegram UI keeps Tailscale wording only in the main title", () => {
  assert.match(source, /ServerStatus via Tailscale/);
  assert.match(translations, /deviceList: "設備列表"/);
  assert.match(translations, /refresh: "更新狀態"/);
  assert.match(source, /ServerStatus via Tailscale/);
  assert.doesNotMatch(source, /從 Tailscale 更新|Tailscale 設備列表|Tailscale 設備離線|Tailscale 設備恢復|Tailscale IP/);
});

test("Telegram UI hides IP addresses while sorting rows by address", () => {
  assert.match(source, /sort\(compareDeviceRows\)/);
  assert.match(source, /compareTailscaleAddresses/);
  assert.doesNotMatch(source, /ORDER BY status ASC/);
  assert.doesNotMatch(source, /設備 IP：|Tailscale IP：|無 IP/);
});

test("device rows hide API age and details hide observation counters", () => {
  assert.doesNotMatch(source, /· \$\{formatAge\(row\.last_checked_at\)\}/);
  assert.doesNotMatch(source, /連續離線：|連續在線：/);
});

test("Telegram UI hides the tailnet name and recovery uses the previous offline snapshot", () => {
  assert.doesNotMatch(source, /payload\.device\.name \|\| payload\.device\.id/);
  assert.doesNotMatch(source, /device\.name \|\| device\.id \|\| row\.host/);
  assert.match(source, /previousLastSeen: previousDevice\.lastSeen \|\| ""/);
  assert.match(source, /observation\.event === "recovered" \? previousDevice\.lastSeen : device\.lastSeen/);
  assert.match(source, /offline \? "lastOnline" : "lastSeen"/);
  assert.match(source, /formatTailscaleTime\(lastSeen, env\.TIME_ZONE, env\.BOT_LANGUAGE\)/);
  assert.match(translations, /lastOnline: "最後在線"/);
  assert.match(translations, /lastSeen: "最後上線"/);
});

test("API failure occurs before any device mutation", () => {
  const sync = source.slice(source.indexOf("export async function syncTailscaleDevices"));
  assert.ok(sync.indexOf("await fetchTailscaleDevices(env)") < sync.indexOf("persistTailscaleDevice"));
});

test("removed API devices are hidden without deleting legacy data", () => {
  assert.match(source, /UPDATE servers SET enabled = 0/);
  assert.match(source, /ports = 'tailscale'/);
  assert.doesNotMatch(source, /DELETE FROM servers/);
});

test("only Tailscale notifications are drained", () => {
  assert.match(source, /JOIN servers s ON s\.id = n\.server_id/);
  assert.match(source, /s\.ports = 'tailscale'/);
  assert.match(source, /notificationFailurePlan/);
});

test("Tailscale and Telegram requests have bounded timeouts", () => {
  assert.match(source, /const API_TIMEOUT_MS = 10000/);
  assert.match(source, /requestJson/);
});

test("local secret material stays ignored", () => {
  assert.match(gitignore, /^private-credentials\/$/m);
  assert.match(gitignore, /^private-backups\/$/m);
  assert.match(gitignore, /^\.dev\.vars$/m);
  assert.match(gitignore, /^wrangler\.jsonc$/m);
});

test("development variables contain the active OAuth settings only", () => {
  assert.match(devVars, /^TAILSCALE_CLIENT_ID=$/m);
  assert.match(devVars, /^TAILSCALE_CLIENT_SECRET=$/m);
  assert.match(devVars, /^TAILSCALE_TAILNET=-$/m);
  assert.match(devVars, /^OFFLINE_AFTER=2$/m);
  assert.match(source, /clampInteger\(env\.OFFLINE_AFTER, 2, 10, 2\)/);
  assert.doesNotMatch(devVars, /CHECK_BATCH_SIZE|MAX_SERVERS/);
});

test("Devices API uses a short-lived OAuth bearer token", async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    if (String(url).endsWith("/oauth/token")) {
      return new Response(JSON.stringify({ access_token: "short-lived", expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({ devices: [{
      id: "node-1", hostname: "nas", name: "nas.example.ts.net", addresses: ["100.64.0.1"],
      tags: [], clientConnectivity: { endpoints: ["8.8.8.8:41641"] },
      os: "linux", connectedToControl: true, lastSeen: null
    }] }), { status: 200 });
  };
  const devices = await fetchTailscaleDevices({
    TAILSCALE_CLIENT_ID: "client-id",
    TAILSCALE_CLIENT_SECRET: "client-secret",
    TAILSCALE_TAILNET: "-"
  }, fakeFetch);
  assert.equal(devices[0].displayName, "nas");
  assert.equal(devices[0].connectedToControl, true);
  assert.equal(devices[0].publicIp, "8.8.8.8");
  assert.equal(calls.length, 2);
  assert.match(calls[0].init.body, /grant_type=client_credentials/);
  assert.equal(calls[1].init.headers.authorization, "Bearer short-lived");
  assert.match(calls[1].url, /\/tailnet\/-\/devices\?fields=all$/);
});
