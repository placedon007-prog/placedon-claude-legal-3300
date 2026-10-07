// Phase 6 captures. Usage: node shots.mjs <outDir> live|dead
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const exe = "/Users/nishantsingh/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const [out, mode] = process.argv.slice(2);
const BASE = "http://localhost:3311";
const WIDTHS = [1440, 1024, 390];
const HEIGHT = { 1440: 900, 1024: 768, 390: 844 };
const Q = {
  s96: "What is the time limit for holding an annual general meeting under section 96?",
  sebi: "What is the SEBI LODR deadline for disclosing a material event to the stock exchange?",
  mixed: "Under section 96 and the SEBI LODR, when must a listed company hold its annual general meeting?",
  vague: "hello there, can you help me out",
};
const SCREENS = ["vault", "document-check", "contracts", "documents", "tables", "drafts", "calendar", "runs"];

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
const axe = [];
const log = [];

async function fresh(w, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT[w] }, ...extra });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => log.push(`pageerror ${w}: ${e}`));
  return { ctx, p };
}
async function dismissConsent(p) {
  await p.getByRole("button", { name: "Decline" }).click({ timeout: 3000 }).catch(() => {});
}
async function shot(p, name, w, full = false) {
  await p.waitForTimeout(350);
  await p.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: full });
}
async function scan(p, name, w) {
  if (w !== 1440 && w !== 390) return;
  const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  for (const v of r.violations) axe.push({ name, w, id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, target: v.nodes[0]?.target });
}
async function ask(p, q) {
  const box = p.getByRole("textbox", { name: "Your question" });
  await box.fill(q);
  await box.press("Enter");
  await p.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 180000 });
}

if (mode === "live") {
  for (const w of WIDTHS) {
    const { ctx, p } = await fresh(w);
    await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await dismissConsent(p);
    await shot(p, "ask-empty", w); await scan(p, "ask-empty", w);

    await ask(p, Q.s96);
    if (w >= 1024) await p.waitForSelector("text=Re-read just now", { timeout: 60000 });
    await shot(p, "ask-answered", w); await scan(p, "ask-answered", w);
    if (w < 1024) {
      await p.getByRole("button", { name: /^Source 1/ }).first().click();
      await p.waitForSelector("text=Re-read just now", { timeout: 60000 });
      await shot(p, "ask-source-sheet", w); await scan(p, "ask-source-sheet", w);
      await p.getByRole("button", { name: "Close source" }).click();
    } else {
      await p.getByRole("button", { name: "Close source" }).click();
      await shot(p, "ask-panel-closed", w);
    }

    await ask(p, Q.sebi);
    await shot(p, "ask-abstained", w); await scan(p, "ask-abstained", w);
    await ask(p, Q.mixed);
    log.push(`mixed ${w}: ${await p.locator("section[aria-labelledby^=q-]").last().locator("p").first().innerText()}`);
    await shot(p, "ask-mixed", w);
    await ask(p, Q.vague);
    log.push(`vague ${w}: ${await p.locator("section[aria-labelledby^=q-]").last().locator("p").first().innerText()}`);
    await shot(p, "ask-clarify", w);
    await shot(p, "ask-thread-full", w, true);

    if (w === 1440) {
      await p.getByRole("button", { name: "Tools", exact: true }).click();
      await shot(p, "composer-tools", w);
      await p.keyboard.press("Escape");
    }
    // Sidebar expanded (desktop) / navigation sheet (phone).
    if (w >= 768) {
      await p.getByRole("button", { name: "Expand sidebar" }).click();
      await shot(p, "sidebar-expanded", w); await scan(p, "sidebar-expanded", w);
      await p.getByRole("button", { name: "Collapse sidebar" }).click();
    } else {
      await p.getByRole("button", { name: "Open navigation" }).click();
      await shot(p, "nav-sheet", w); await scan(p, "nav-sheet", w);
      await p.keyboard.press("Escape");
    }

    for (const s of SCREENS) {
      await p.goto(`${BASE}/app/${s}`, { waitUntil: "networkidle" });
      await shot(p, `screen-${s}`, w, true); await scan(p, `screen-${s}`, w);
    }
    await ctx.close();
  }

  // Reduced motion: the pending dot and panel must render their end state.
  {
    const { ctx, p } = await fresh(1440, { reducedMotion: "reduce" });
    await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await dismissConsent(p);
    await ask(p, Q.s96);
    const anim = await p.evaluate(() =>
      [...document.querySelectorAll(".console *, [data-slot]")].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.animationName !== "none" && cs.animationDuration !== "0s";
      }).length,
    );
    log.push(`reduced-motion: ${anim} element(s) still animating`);
    await shot(p, "ask-reduced-motion", 1440);
    await ctx.close();
  }

  // Keyboard-only walkthrough of the Ask screen: tab order and visible focus.
  {
    const { ctx, p } = await fresh(1440);
    await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await dismissConsent(p);
    await ask(p, Q.s96);
    const steps = [];
    await p.keyboard.press("Escape");
    await p.evaluate(() => document.activeElement?.blur());
    for (let i = 0; i < 30; i++) {
      await p.keyboard.press("Tab");
      steps.push(await p.evaluate(() => {
        const el = document.activeElement;
        const cs = el ? getComputedStyle(el) : null;
        const name = el?.getAttribute("aria-label") || el?.textContent?.trim().slice(0, 40) || el?.tagName;
        const visible = cs && (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px");
        return `${el?.tagName.toLowerCase()} "${name}" focus-visible:${visible ? "yes" : "NO"}`;
      }));
    }
    fs.writeFileSync(`${out}/keyboard-walkthrough.txt`, steps.map((s, i) => `${i + 1}. ${s}`).join("\n") + "\n");
    await ctx.close();
  }
} else {
  for (const w of WIDTHS) {
    const { ctx, p } = await fresh(w);
    await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await dismissConsent(p);
    await ask(p, Q.s96);
    await shot(p, "ask-did-not-arrive", w); await scan(p, "ask-did-not-arrive", w);
    await ctx.close();
  }
}

fs.writeFileSync(`${out}/axe-${mode}.json`, JSON.stringify(axe, null, 1));
console.log(log.join("\n"));
console.log(`axe: ${axe.length} violation groups; serious/critical: ${axe.filter((v) => v.impact === "serious" || v.impact === "critical").length}`);
await browser.close();
