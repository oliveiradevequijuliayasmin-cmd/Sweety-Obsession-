import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
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
const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
p.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:${port}/`);
await p.waitForFunction(() => window.__GAME_READY__, null, { timeout: 20000 });
await p.keyboard.press("Space");
await p.waitForTimeout(1200);
await p.keyboard.press("KeyP");
await p.waitForTimeout(700);
console.log("ptabs:", await p.evaluate(() => [...document.querySelectorAll(".ptab")].map((b) => b.textContent).join(",")));
await p.evaluate(() => [...document.querySelectorAll(".ptab")].find((b) => b.textContent === "Mapa")?.click());
await p.waitForTimeout(400);
console.log("map?", await p.evaluate(() => !!document.querySelector(".school-map")));
await p.screenshot({ path: "verification-shots/map-debug.png" });
await browser.close(); server.close();
