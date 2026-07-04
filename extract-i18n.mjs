// Dev utility: walks the live DOM of every page (after header/footer partials
// load) and extracts data-i18n / data-i18n-html / data-i18n-ph / data-i18n-content
// / data-i18n-aria values into assets/i18n/kk.json — the single source of truth
// for the Kazakh strings that all other language files must mirror key-for-key.
import puppeteer from "puppeteer";
import fs from "node:fs";

const pages = [
  "index", "about", "khorgos", "international", "membership",
  "services", "directions", "people", "reviews", "contact",
];
const base = "http://localhost:3001/";

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const flat = {};
const conflicts = [];

const browser = await puppeteer.launch({ headless: "new" });
for (const p of pages) {
  const page = await browser.newPage();
  await page.goto(base + p + ".html", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 300));
  const entries = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("[data-i18n]").forEach((el) =>
      out.push([el.getAttribute("data-i18n"), el.textContent.trim()])
    );
    document.querySelectorAll("[data-i18n-html]").forEach((el) =>
      out.push([el.getAttribute("data-i18n-html"), el.innerHTML.trim()])
    );
    document.querySelectorAll("[data-i18n-ph]").forEach((el) =>
      out.push([el.getAttribute("data-i18n-ph"), el.getAttribute("placeholder") || ""])
    );
    document.querySelectorAll("[data-i18n-content]").forEach((el) =>
      out.push([el.getAttribute("data-i18n-content"), el.getAttribute("content") || ""])
    );
    document.querySelectorAll("[data-i18n-aria]").forEach((el) =>
      out.push([el.getAttribute("data-i18n-aria"), el.getAttribute("aria-label") || ""])
    );
    return out;
  });
  for (const [key, value] of entries) {
    if (flat[key] !== undefined && flat[key] !== value) {
      conflicts.push({ key, existing: flat[key], incoming: value, page: p });
    }
    flat[key] = value;
  }
  await page.close();
}
await browser.close();

if (conflicts.length) {
  console.log("CONFLICTS (same key, different text) — review these:");
  conflicts.forEach((c) =>
    console.log(` - ${c.key} on ${c.page}.html:\n     kept:     ${c.existing}\n     ignored:  ${c.incoming}`)
  );
} else {
  console.log("No key conflicts found.");
}

const nested = {};
Object.keys(flat)
  .sort()
  .forEach((k) => setPath(nested, k, flat[k]));

fs.mkdirSync("assets/i18n", { recursive: true });
fs.writeFileSync("assets/i18n/kk.json", JSON.stringify(nested, null, 2), "utf-8");
console.log("Wrote assets/i18n/kk.json with", Object.keys(flat).length, "keys");
