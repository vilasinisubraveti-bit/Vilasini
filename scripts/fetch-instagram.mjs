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
  const entry = { ...old, code, type: old.type || p.type, date: old.date || dateOf(code) };   // keep every detail already saved
  const ext = /\.webp(\?|$)/i.test(old.imageSrc || "") ? "webp" : "jpg";
  const localImg = [`assets/instagram/${code}.jpg`, `assets/instagram/${code}.webp`].find((f) => fs.existsSync(f)) || `assets/instagram/${code}.${ext}`;
  let imgUrl = old.imageSrc || "";
  // only visit Instagram when we have neither text nor details for this post
  if (!old.caption && !old.title) {
    const found = await inspect(code);
    if (found.caption) entry.caption = found.caption;
    if (found.image) imgUrl = found.image;
  }
  if (!fs.existsSync(localImg) && imgUrl) {
    try {
      const r = await fetch(imgUrl, { headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" }, signal: AbortSignal.timeout(30000) });
      if (r.ok) fs.writeFileSync(localImg, Buffer.from(await r.arrayBuffer())); else console.log(`  photo ${code}: HTTP ${r.status}`);
    } catch (e) { console.log(`  photo ${code}:`, e.message); }
  }
  entry.image = fs.existsSync(localImg) ? localImg : (entry.image || "");
  console.log(`${entry.caption || entry.title ? "✓" : "✗"} ${code}  text:${entry.caption || entry.title ? "yes" : "no"}  photo:${entry.image ? "yes" : "no"}`);
  out.push(entry);
}
out.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync("instagram.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Saved ${out.length} posts.`);
