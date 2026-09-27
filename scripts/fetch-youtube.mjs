// Reads youtubeChannelId from content.js, downloads the channel's public feed,
// and writes videos.json (latest ~15 uploads). Run by .github/workflows/youtube.yml
import fs from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("content.js", "utf8"), ctx);
const id = (ctx.window.SITE?.youtubeChannelId || "").trim();
if (!id) { console.log("No youtubeChannelId set in content.js — skipping."); process.exit(0); }

// Accept an @handle and look up the real channel ID (UC...) from the channel page
let channelId = id;
if (!/^UC[\w-]{22}$/.test(id)) {
  const handle = id.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/^@?/, "@").split(/[/?]/)[0];
  const page = await (await fetch(`https://www.youtube.com/${handle}`, { headers: { "Accept-Language": "en", Cookie: "CONSENT=YES+1" } })).text();
  channelId = (page.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/) || page.match(/channel\/(UC[\w-]{22})/) || [])[1];
  if (!channelId) { console.error(`Could not find channel ID for ${handle}`); process.exit(1); }
  console.log(`${handle} -> ${channelId}`);
}
const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
if (!res.ok) { console.error("YouTube feed error", res.status); process.exit(1); }
const xml = await res.text();

const decode = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
  id: (e.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1],
  title: decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ""),
  published: (e.match(/<published>(.*?)<\/published>/) || [])[1]
})).filter((v) => v.id);

fs.writeFileSync("videos.json", JSON.stringify(videos, null, 2) + "\n");
console.log(`Saved ${videos.length} videos.`);
