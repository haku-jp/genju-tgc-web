import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "investigate-shots";
mkdirSync(OUT, { recursive: true });

const sizes = [
  { name: "landscape", width: 1280, height: 800 },
  { name: "portrait", width: 390, height: 844 },
];

for (const size of sizes) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${size.name}-1-menu.png` });

  // Click "対戦開始" — Phaser canvas, button centered at w/2, h*0.6
  await page.mouse.click(size.width / 2, size.height * 0.6);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${size.name}-2-battle.png` });

  // Probe the battle scene state + layout via a debug hook if present.
  const info = await page.evaluate(() => {
    const out = {};
    out.dpr = window.devicePixelRatio;
    out.inner = { w: window.innerWidth, h: window.innerHeight };
    const canvas = document.querySelector("canvas");
    out.canvas = canvas ? { w: canvas.width, h: canvas.height, cssW: canvas.clientWidth, cssH: canvas.clientHeight } : null;
    return out;
  });

  // Drag the center-ish hand card upward toward a board cell (real trusted drag).
  // Hand center card sits near (w/2, ~h*0.84) in portrait / overlapping board in landscape.
  const startX = size.width / 2;
  const startY = size.height - 70;
  const boardCellX = size.width / 2;
  const boardCellY = size.height * 0.55;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.move(boardCellX, boardCellY, { steps: 12 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/${size.name}-3-dragging.png` });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${size.name}-4-afterdrop.png` });

  console.log(JSON.stringify({ size: size.name, info, errors }, null, 2));
  await browser.close();
}
