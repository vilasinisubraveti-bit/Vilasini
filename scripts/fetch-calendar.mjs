// Reads her Google Calendar (iCal address stored as the GOOGLE_CALENDAR_ICS secret)
// and writes events.json for the "Concerts & announcements" section.
// Run by .github/workflows/calendar.yml
//
// How she writes events in Google Calendar:
//   Title:       "Concert: Margazhi Recital"  (prefix sets the label; no prefix = Concert)
//                On her main Gmail calendar the prefix (or "#website") is REQUIRED,
//                otherwise the event is treated as personal and ignored.
//   Location:    "Narada Gana Sabha, Chennai" (last part after a comma = city)
//   Description: any text is shown as a note; the first link becomes a button
//                ("Tickets: https://..." -> "Get tickets" button)
import fs from "node:fs";

const url = (process.env.GOOGLE_CALENDAR_ICS || "").trim();
if (!url) { console.log("GOOGLE_CALENDAR_ICS secret not set — skipping."); process.exit(0); }

// Her main Gmail calendar also holds personal events, so from it we only take events
// whose title starts with a tag like "Concert:" or contains "#website".
// (A separate "Concerts" calendar shares everything.)
const decodedUrl = decodeURIComponent(url);
const ONLY_TAGGED = process.env.CALENDAR_ALL_EVENTS === "true" ? false
  : (/@gmail\.com|@googlemail\.com/i.test(decodedUrl) || process.env.CALENDAR_ONLY_TAGGED === "true");
console.log(ONLY_TAGGED ? "Main Gmail calendar: using only tagged events (e.g. 'Concert: ...' or '#website')." : "Dedicated calendar: using all events.");

const res = await fetch(url.replace(/^webcal:/, "https:"));
if (!res.ok) { console.error("Calendar download failed:", res.status); process.exit(1); }
const raw = (await res.text()).replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, ""); // unfold lines

const unesc = (t = "") => t.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
const TYPES = ["Concert", "Online", "Workshop", "Masterclass", "Class", "Festival", "Album", "Release", "Announcement", "New venture"];
const IST = "Asia/Kolkata";

// Convert a wall-clock time in timezone `tz` to a real instant
function zonedToDate(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const asTz = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asTz - guess));
}
function toIST(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: IST, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
function parseStart(line) {
  if (!line) return null;
  const [params, value] = [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()];
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h) return { date: `${y}-${mo}-${d}`, time: "" };                       // all-day event
  if (z) return toIST(new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)));           // UTC time
  const tz = (params.match(/TZID=([^;:]+)/) || [])[1] || IST;                    // local time in a zone
  try { return toIST(zonedToDate(+y, +mo, +d, +h, +mi, tz)); }
  catch { return toIST(zonedToDate(+y, +mo, +d, +h, +mi, IST)); }
}

const events = [];
for (const [, block] of raw.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
  const get = (k) => (block.match(new RegExp(`^${k}(?:;[^:\\r\\n]*)?:.*$`, "m")) || [])[0];
  const val = (k) => { const l = get(k); return l ? unesc(l.slice(l.indexOf(":") + 1).trim()) : ""; };
  if (/^STATUS:CANCELLED/m.test(block) || /^RECURRENCE-ID/m.test(block)) continue;
  if (/^CLASS:(PRIVATE|CONFIDENTIAL)/m.test(block)) continue;               // "Private" events stay off the site
  const start = parseStart(get("DTSTART"));
  if (!start) continue;

  let title = val("SUMMARY").trim(), type = "Concert", tagged = false;
  if (/#website\b/i.test(title)) { tagged = true; title = title.replace(/#website\b/ig, "").trim(); }
  const pre = title.match(/^\[?([A-Za-z ]{3,20})\]?\s*[:\-–|]\s*(.+)$/);
  if (pre) {
    const t = TYPES.find((x) => x.toLowerCase() === pre[1].trim().toLowerCase());
    if (t) { type = t; title = pre[2].trim(); tagged = true; }
  }
  if (ONLY_TAGGED && !tagged) continue;                                     // personal events stay private

  const loc = val("LOCATION").split(",").map((s) => s.trim()).filter(Boolean);
  const city = loc.length > 1 ? loc[loc.length - 1] : "";
  const venue = loc.length > 1 ? loc.slice(0, -1).join(", ") : (loc[0] || "");

  let desc = val("DESCRIPTION").replace(/<br\s*\/?>/gi, "\n").replace(/<a [^>]*href="([^"]+)"[^>]*>.*?<\/a>/gi, " $1 ").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  const links = desc.match(/https?:\/\/[^\s<>"')]+/g) || [];
  const link = links[0] || val("URL") || "";
  const linkLabel = !link ? "" : /ticket/i.test(desc) ? "Get tickets" : /youtube\.com|youtu\.be/.test(link) ? "Watch on YouTube"
    : /zoom\.us|meet\.google/.test(link) ? "Join online" : /regist|book|enrol/i.test(desc) ? "Register" : "Details";
  const note = desc.replace(/https?:\/\/\S+/g, "").replace(/\b(tickets?|register|link|details)\s*:\s*/gi, "")
    .split("\n").map((s) => s.trim()).filter(Boolean).join(" ").slice(0, 220);

  events.push({ type, title, date: start.date, time: start.time, venue, city, link, linkLabel, note, source: "calendar" });
}

// Keep the last 2 years of past events and everything upcoming
const cutoff = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);
const out = events.filter((e) => e.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync("events.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Saved ${out.length} events.`);
