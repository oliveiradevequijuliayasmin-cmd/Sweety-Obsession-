import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const DIST = process.cwd() + "/dist";
const server = createServer(async (req, res) => {
  try {
    const f = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
    const d = await readFile(f);
    res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    res.end(d);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ headless: false, args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });

async function newPage(width, height, touch) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e).slice(0, 300)));
  p.on("console", (m) => { if (m.type() === "error") p.errors.push(m.text().slice(0, 300)); });
  await p.goto(`http://127.0.0.1:${port}/`);
  await p.waitForFunction(() => window.__GAME_READY__, null, { timeout: 20000 });
  return p;
}

/* ---- desktop ---- */
const d = await newPage(1280, 720, false);
await d.keyboard.press("Space");
await d.waitForTimeout(1500);
await d.screenshot({ path: "verification-shots/v2-courtyard.png" });
// walk to sakura tree area
await d.keyboard.down("KeyW");
await d.waitForTimeout(1800);
await d.keyboard.up("KeyW");
await d.waitForTimeout(500);
await d.screenshot({ path: "verification-shots/v3-walk.png" });
// start dialogue with whoever is near, then leave via "Ir embora"
await d.keyboard.press("KeyE");
await d.waitForTimeout(1200);
const hasDlg = await d.evaluate(() => !!document.querySelector(".dialogue"));
console.log("dialogue open:", hasDlg);
if (hasDlg) {
  await d.screenshot({ path: "verification-shots/v4-dialogue.png" });
  await d.evaluate(() => [...document.querySelectorAll(".dlg-choice")].find((b) => b.textContent.includes("Ir embora"))?.click()
    ?? [...document.querySelectorAll(".dlg-choice")].at(-1)?.click());
  await d.waitForTimeout(500);
  // possibly a second node; press E to advance until dialogue closes
  for (let i = 0; i < 5 && (await d.evaluate(() => !!document.querySelector(".dialogue"))); i++) {
    await d.keyboard.press("KeyE");
    await d.waitForTimeout(500);
  }
}
// phone UI
await d.keyboard.press("KeyP");
await d.waitForTimeout(900);
await d.screenshot({ path: "verification-shots/v5-phone.png" });
await d.evaluate(() => [...document.querySelectorAll(".ptab")].find((b) => b.textContent === "Mapa")?.click());
await d.waitForTimeout(400);
await d.screenshot({ path: "verification-shots/v6-map.png" });
await d.keyboard.press("Escape");
await d.waitForTimeout(300);
// explore: walk into school via corridor — turn around and go north
await d.keyboard.down("KeyW");
await d.waitForTimeout(3500);
await d.keyboard.up("KeyW");
await d.waitForTimeout(400);
await d.screenshot({ path: "verification-shots/v7-inside.png" });
const loc = await d.evaluate(() => document.querySelector(".hud-loc")?.textContent);
console.log("location now:", loc);
console.log("desktop errors:", d.errors.slice(0, 6));
await d.context().close();

/* ---- mobile portrait ---- */
const m = await newPage(390, 844, true);
await m.waitForTimeout(800);
await m.screenshot({ path: "verification-shots/m1-title.png" });
await m.tap(".btn-title");
await m.waitForTimeout(1500);
await m.screenshot({ path: "verification-shots/m2-gameplay.png" });
// open phone via touch button
const phoneBtn = await m.evaluate(() => [...document.querySelectorAll(".tbtn")].find((b) => b.textContent === "☎"));
if (phoneBtn) { await m.tap(".touch-controls .tbtn:last-child"); await m.waitForTimeout(800); }
await m.screenshot({ path: "verification-shots/m3-phone.png" });
console.log("mobile errors:", m.errors.slice(0, 6));
await m.context().close();

await browser.close();
server.close();
console.log("DONE");
