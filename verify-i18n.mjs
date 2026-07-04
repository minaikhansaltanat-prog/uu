// Dev utility: verifies i18n completeness.
// 1. Every key in kk.json (source of truth) exists, non-empty, in ru/en/zh/uz/ky.json.
// 2. No language file has extra/orphaned keys not present in kk.json.
// 3. Every data-i18n* key referenced in the HTML exists in kk.json (catches typos).
import fs from "node:fs";
import puppeteer from "puppeteer";

const LANGS = ["ru", "en", "zh", "uz", "ky"];
const pages = [
  "index", "about", "khorgos", "international", "membership",
  "services", "directions", "people", "reviews", "contact",
];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

let hasError = false;

const kk = flatten(JSON.parse(fs.readFileSync("assets/i18n/kk.json", "utf-8")));
const kkKeys = new Set(Object.keys(kk));
console.log(`kk.json: ${kkKeys.size} keys (source of truth)\n`);

for (const lang of LANGS) {
  const dict = flatten(JSON.parse(fs.readFileSync(`assets/i18n/${lang}.json`, "utf-8")));
  const dictKeys = new Set(Object.keys(dict));

  const missing = [...kkKeys].filter((k) => !dictKeys.has(k));
  const empty = [...kkKeys].filter((k) => dictKeys.has(k) && String(dict[k]).trim() === "");
  const extra = [...dictKeys].filter((k) => !kkKeys.has(k));

  if (missing.length || empty.length || extra.length) {
    hasError = true;
    console.log(`--- ${lang}.json ---`);
    if (missing.length) console.log(`  MISSING (${missing.length}):`, missing);
    if (empty.length) console.log(`  EMPTY (${empty.length}):`, empty);
    if (extra.length) console.log(`  EXTRA/ORPHANED (${extra.length}):`, extra);
  } else {
    console.log(`${lang}.json: OK (${dictKeys.size} keys, full parity with kk.json)`);
  }
}

// Check every data-i18n* key referenced in the live DOM actually exists in kk.json
console.log("\nChecking HTML for orphaned data-i18n keys (keys used but not in kk.json)...");
const browser = await puppeteer.launch({ headless: "new" });
const usedKeys = new Set();
for (const p of pages) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:3001/${p}.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 250));
  const keys = await page.evaluate(() => {
    const attrs = ["data-i18n", "data-i18n-html", "data-i18n-ph", "data-i18n-content", "data-i18n-aria"];
    const out = [];
    attrs.forEach((attr) => {
      document.querySelectorAll(`[${attr}]`).forEach((el) => out.push(el.getAttribute(attr)));
    });
    return out;
  });
  keys.forEach((k) => usedKeys.add(k));
  await page.close();
}
await browser.close();

const orphanedInHtml = [...usedKeys].filter((k) => !kkKeys.has(k));
if (orphanedInHtml.length) {
  hasError = true;
  console.log("  ORPHANED HTML KEYS (referenced but missing from kk.json):", orphanedInHtml);
} else {
  console.log(`  OK — all ${usedKeys.size} referenced keys exist in kk.json`);
}

console.log(hasError ? "\nRESULT: FAILED — issues found above." : "\nRESULT: ALL CHECKS PASSED.");
process.exit(hasError ? 1 : 0);
