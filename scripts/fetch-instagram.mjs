// Copies each Instagram post (caption + photo) onto the website so nothing links to Instagram.
// Sources: instagram-seed.json + content.js "instagramPosts". Output: instagram.json + assets/instagram/<code>.jpg
// Run by .github/workflows/instagram.yml
import fs from "node:fs";
import vm from "node:vm";

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const codeOf = (u) => (String(u).match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|tv)\/([\w-]{8,})/) || [])[1];
const dateOf = (code) => { let n = 0n; for (const ch of code.slice(0, 11)) n = n * 64n + BigInt(ABC.indexOf(ch)); return new Date(Number(n >> 23n) + 1314220021721).toISOString().slice(0, 10); };

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("content.js", "utf8"), ctx);
const S = ctx.window.SITE || {};
const seed = fs.existsSync("instagram-seed.json") ? JSON.parse(fs.readFileSync("instagram-seed.json", "utf8")) : [];
const hidden = new Set((S.instagramHidden || []).map(codeOf));
const previous = fs.existsSync("instagram.json") ? JSON.parse(fs.readFileSync("instagram.json", "utf8")) : [];
const prev = Object.fromEntries(previous.map((p) => [p.code, p]));

const posts = new Map();
for (const x of [...(S.instagramPosts || []), ...seed]) {
  const url = typeof x === "string" ? x : x?.url; const code = codeOf(url);
  if (code && !hidden.has(code) && !posts.has(code)) posts.set(code, { code, type: (typeof x === "object" && x.type) || "concert" });
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const decode = (t = "") => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const meta = (html, name) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))
  || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i")); return m ? decode(m[1]) : ""; };

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9", Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function inspect(code) {
  let caption = "", image = "";
  // 1) the public "embed" page usually has the full caption and the photo
  try {
    const html = await get(`https://www.instagram.com/p/${code}/embed/captioned/`);
    const cap = html.match(/<div class="Caption">([\s\S]*?)<div class="CaptionComments">/i) || html.match(/<div class="Caption">([\s\S]*?)<\/div>/i);
    if (cap) caption = decode(cap[1].replace(/<a[^>]*class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/i, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
    const img = html.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src="([^"]+)"/i) || html.match(/<img[^>]+src="([^"]+)"[^>]+class="EmbeddedMediaImage"/i);
    if (img) image = decode(img[1]);
    if (!caption) { const j = html.match(/"caption_title":"((?:[^"\\]|\\.)*)"/) || html.match(/"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:[^"\\]|\\.)*)"/); if (j) caption = JSON.parse(`"${j[1]}"`); }
    if (!image) { const j = html.match(/"display_url":"((?:[^"\\]|\\.)*)"/); if (j) image = JSON.parse(`"${j[1]}"`); }
  } catch (e) { console.log("  embed page:", e.message); }
  // 2) fall back to the post page's preview tags
  if (!caption || !image) {
    try {
      const html = await get(`https://www.instagram.com/p/${code}/`);
      if (!image) image = meta(html, "og:image");
      if (!caption) { const d = meta(html, "og:description"); const m = d.match(/:\s*["“]([\s\S]*)["”]\s*\.?$/); caption = (m ? m[1] : "").trim(); }
    } catch (e) { console.log("  post page:", e.message); }
  }
  return { caption, image };
}

fs.mkdirSync("assets/instagram", { recursive: true });
const out = [];
for (const [code, p] of posts) {
  const old = prev[code] || {};
  let { caption, image } = { caption: old.caption || "", image: "" };
  const localImg = `assets/instagram/${code}.jpg`;
  const haveImg = fs.existsSync(localImg);
  if (!old.caption || !haveImg) {
    const found = await inspect(code);
    caption = found.caption || caption;
    if (!haveImg && found.image) {
      try {
        const r = await fetch(found.image, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
        if (r.ok) fs.writeFileSync(localImg, Buffer.from(await r.arrayBuffer()));
      } catch (e) { console.log("  image download:", e.message); }
    }
    console.log(`${caption ? "✓" : "✗"} ${code}  caption:${caption ? "yes" : "no"}  photo:${fs.existsSync(localImg) ? "yes" : "no"}`);
  }
  out.push({ code, type: p.type, date: dateOf(code), caption, image: fs.existsSync(localImg) ? localImg : "" });
}
out.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync("instagram.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Saved ${out.length} posts.`);
