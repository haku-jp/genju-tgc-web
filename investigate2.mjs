import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "investigate-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const W = 1280, H = 800;
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/L-1-menu.png` });

await page.mouse.click(W / 2, H * 0.6);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/L-2-battle.png` });

// Drag a hand card up to a legal summon cell to see the overlap + feel.
await page.mouse.move(W / 2, H - 60);
await page.mouse.down();
await page.waitForTimeout(60);
await page.mouse.move(W / 2, H * 0.6, { steps: 14 });
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/L-3-dragging.png` });
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/L-4-afterdrop.png` });

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
