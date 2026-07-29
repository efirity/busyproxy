import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/01-onboarding.png" });

for (let i = 0; i < 3; i++) {
  const btn = page.getByRole("button", { name: /Continue|Generate secure/i });
  if (await btn.count()) await btn.first().click();
  await page.waitForTimeout(450);
}
await page.screenshot({ path: "/workspace/screenshots/02-home-stopped.png" });

await page.getByRole("button", { name: /Start proxy/i }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "/workspace/screenshots/03-home-running.png" });

await page.getByRole("button", { name: /^Activity$/i }).click();
await page.waitForTimeout(4000);
await page.screenshot({ path: "/workspace/screenshots/04-activity.png" });

await page.getByRole("button", { name: /^Settings$/i }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/05-settings.png" });

await page.getByRole("button", { name: /^Home$/i }).click();
await page.waitForTimeout(400);

const statusText = await page.locator("body").innerText();
console.log(JSON.stringify({
  errors,
  hasRunning: statusText.includes("RUNNING"),
  hasSocks: /SOCKS5|socks5/i.test(statusText),
  bodySnippet: statusText.slice(0, 500),
}, null, 2));

const startRes = await page.evaluate(async () => {
  const raw = localStorage.getItem("relay-proxy-v1");
  let password = "test";
  let username = "relay";
  let httpPort = 8888;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      password = parsed.state?.settings?.password ?? password;
      username = parsed.state?.settings?.username ?? username;
      httpPort = parsed.state?.settings?.httpPort ?? httpPort;
    } catch {}
  }
  const res = await fetch("/api/proxy/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username, password, httpPort, socksPort: 1080,
      bindMode: "lan", httpEnabled: true, socksEnabled: true, maxConnections: 128,
    }),
  });
  const data = await res.json();
  return { status: res.status, data, username, password, httpPort };
});
console.log("engine start", JSON.stringify(startRes, null, 2));

await browser.close();
process.exit(errors.length ? 1 : 0);
