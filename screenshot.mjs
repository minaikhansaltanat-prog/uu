import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "temporary screenshots");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const url = process.argv[2] || "http://localhost:3001";
const label = process.argv[3] || "";
const width = Number(process.argv[4]) || 1440;
const height = Number(process.argv[5]) || 900;

function nextIndex() {
  const files = fs.readdirSync(outDir).filter((f) => f.startsWith("screenshot-"));
  const nums = files.map((f) => Number((f.match(/screenshot-(\d+)/) || [])[1] || 0));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 300));

// Scroll through the full page so IntersectionObserver-driven reveals fire
// before the full-page screenshot is captured.
await page.evaluate(async () => {
  const step = Math.max(window.innerHeight * 0.6, 300);
  const total = document.body.scrollHeight;
  for (let y = 0; y < total; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 260));
  }
  window.scrollTo(0, 0);
});
await new Promise((r) => setTimeout(r, 600));

const idx = nextIndex();
const fileName = `screenshot-${idx}${label ? "-" + label : ""}.png`;
const filePath = path.join(outDir, fileName);
await page.screenshot({ path: filePath, fullPage: true });

await browser.close();
console.log("Saved:", filePath);
