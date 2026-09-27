// Builds press.json: for every article link (content.js "press" + press-seed.json)
// it reads the page's headline, picture, publication name and date.
// Run by .github/workflows/press.yml
import fs from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("content.js", "utf8"), ctx);
const fromSite = Array.isArray(ctx.window.SITE?.press) ? ctx.window.SITE.press : [];
const seed = fs.existsSync("press-seed.json") ? JSON.parse(fs.readFileSync("press-seed.json", "utf8")) : [];
const hidden = new Set((ctx.window.SITE?.pressHidden || []).map((u) => u.trim()));
const previous = fs.existsSync("press.json") ? JSON.parse(fs.readFileSync("press.json", "utf8")) : [];
const prevByUrl = Object.fromEntries(previous.map((p) => [p.url, p]));

const entries = [];
const seen = new Set();
for (const e of [...fromSite, ...seed]) {
  const url = (typeof e === "string" ? e : e.url || "").trim();
  if (!url || seen.has(url) || hidden.has(url)) continue;
  seen.add(url); entries.push(typeof e === "string" ? { url } : { ...e, url });
}

const decode = (t = "") => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, "’").replace(/&#8216;/g, "‘").replace(/&#8220;/g, "“").replace(/&#8221;/g, "”")
  .replace(/&#8211;/g, "–").replace(/&#8212;/g, "—").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
const meta = (html, ...names) => {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m) return decode(m[1]);
  }
  return "";
};

async function inspect(url) {
  const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; site-press-bot)", "Accept-Language": "en" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const base = r.url || url;
  let image = meta(html, "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  if (!image) { // first reasonably sized picture in the article
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[0]);
    const pick = imgs.find((t) => !/logo|icon|avatar|gravatar|emoji|pixel|spacer|feeds\.|badge/i.test(t) && !/width=["']?\d{1,2}["'\s]/i.test(t));
    if (pick) image = pick.match(/src=["']([^"']+)["']/i)[1];
  }
  if (image) try { image = new URL(image, base).href; } catch { image = ""; }
  const title = meta(html, "og:title", "twitter:title") || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const source = meta(html, "og:site_name", "application-name") || new URL(base).hostname.replace(/^www\./, "");
  let date = meta(html, "article:published_time", "datePublished", "date", "pubdate");
  if (!date) date = (html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1] || "";
  if (!date) { const m = base.match(/\/(20\d{2}|19\d{2})\/(\d{2})(?:\/(\d{2}))?\//); if (m) date = `${m[1]}-${m[2]}-${m[3] || "01"}`; }
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleanTitle = source ? title.replace(new RegExp(`\\s*[–—|:-]\\s*${esc(source)}\\s*$`, "i"), "") : title;
  return { title: cleanTitle, image, source, date: date ? date.slice(0, 10) : "" };
}

const out = [];
for (const e of entries) {
  let found = {};
  if (!/^https?:/i.test(e.url)) { found = {}; }                    // uploaded clipping photo — nothing to fetch
  else try { found = await inspect(e.url); console.log("✓", e.url); }
  catch (err) { console.log("✗", e.url, err.message, "(keeping previous details)"); found = prevByUrl[e.url] || {}; }
  // Anything typed in the editor wins over what was found on the page
  const pick = (k) => (e[k] && String(e[k]).trim()) || found[k] || "";
  out.push({ url: e.url, title: pick("title") || e.fallbackTitle || e.url, source: pick("source"), date: pick("date"), image: pick("image"), quote: e.quote || "" });
}
out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
fs.writeFileSync("press.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Saved ${out.length} press items.`);
