// Reads her private "Classes" Google Calendar (anything she adds by hand) and publishes:
//   busy.json             — only start/end times (no names, no links) → students see "Not available"
//   private-calendar.json — full details, ENCRYPTED with the classes PIN → only the teacher's Classes manager can read it
// Secrets needed (GitHub → Settings → Secrets → Actions): GOOGLE_CLASSES_ICS, CLASS_PIN
// Run by .github/workflows/private-calendar.yml
import fs from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const url = (process.env.GOOGLE_CLASSES_ICS || "").trim();
const pin = (process.env.CLASS_PIN || "").trim();
if (!url || !pin) { console.log("GOOGLE_CLASSES_ICS or CLASS_PIN secret not set — skipping."); process.exit(0); }

const res = await fetch(url.replace(/^webcal:/, "https:"));
if (!res.ok) { console.error("Calendar download failed:", res.status); process.exit(1); }
const raw = (await res.text()).replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
const unesc = (t = "") => t.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

// wall-clock time in a time zone -> real instant
function zoned(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    return new Date(guess - (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - guess));
  } catch { return new Date(guess - 5.5 * 36e5); }
}
function parseDT(line) {
  if (!line) return null;
  const params = line.slice(0, line.indexOf(":")), v = line.slice(line.indexOf(":") + 1).trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/); if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", , z] = m;
  if (!m[4]) return { date: zoned(+y, +mo, +d, 0, 0, "Asia/Kolkata"), allDay: true };
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)), allDay: false };
  return { date: zoned(+y, +mo, +d, +h, +mi, (params.match(/TZID=([^;:]+)/) || [])[1] || "Asia/Kolkata"), allDay: false };
}

const now = Date.now(), from = now - 7 * 864e5, horizon = now + 180 * 864e5;
const events = [];
for (const [, block] of raw.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
  if (/^STATUS:CANCELLED/m.test(block)) continue;
  const get = (k) => (block.match(new RegExp(`^${k}(?:;[^:\\r\\n]*)?:.*$`, "m")) || [])[0];
  const val = (k) => { const l = get(k); return l ? unesc(l.slice(l.indexOf(":") + 1).trim()) : ""; };
  const st = parseDT(get("DTSTART")); if (!st) continue;
  const en = parseDT(get("DTEND"));
  const dur = en ? en.date - st.date : (st.allDay ? 864e5 : 36e5);
  const base = { title: val("SUMMARY") || "Busy", where: val("LOCATION"), notes: val("DESCRIPTION").slice(0, 500), allDay: st.allDay,
    classId: (val("DESCRIPTION").match(/Class ID:\s*([\w-]+)/) || [])[1] || "" };
  // repeating events (weekly / daily) — expanded for the next 6 months
  const rr = val("RRULE"); const starts = [st.date.getTime()];
  if (rr) {
    const f = (rr.match(/FREQ=(\w+)/) || [])[1], every = +((rr.match(/INTERVAL=(\d+)/) || [])[1] || 1);
    const count = +((rr.match(/COUNT=(\d+)/) || [])[1] || 0), until = rr.match(/UNTIL=(\d{8}(?:T\d{6}Z?)?)/);
    const untilMs = until ? parseDT("X:" + until[1]).date.getTime() : Infinity;
    const step = f === "DAILY" ? 864e5 * every : f === "WEEKLY" ? 7 * 864e5 * every : 0;
    if (step) for (let t = st.date.getTime() + step, n = 1; t <= Math.min(untilMs, horizon) && (!count || n < count); t += step, n++) starts.push(t);
  }
  const ex = new Set([...block.matchAll(/^EXDATE[^:]*:(.+)$/gm)].flatMap((m) => m[1].split(",")).map((x) => parseDT("X:" + x.trim())?.date.getTime()));
  for (const t of starts) if (!ex.has(t) && t + dur > from && t < horizon) events.push({ ...base, start: new Date(t).toISOString(), end: new Date(t + dur).toISOString() });
}
events.sort((a, b) => a.start.localeCompare(b.start));

// busy.json — times only
fs.writeFileSync("busy.json", JSON.stringify(events.map((e) => ({ s: e.start, e: e.end })), null, 0) + "\n");

// only re-encrypt when something changed (otherwise every run would create a new commit)
const { createHash } = await import("node:crypto");
const hash = createHash("sha256").update(pin + JSON.stringify(events)).digest("hex").slice(0, 16);
try { if (JSON.parse(fs.readFileSync("private-calendar.json", "utf8")).h === hash) { console.log("No changes."); process.exit(0); } } catch {}

// private-calendar.json — same encryption as the Classes manager (PBKDF2 + AES-GCM, classes PIN)
const enc = new TextEncoder(), b64 = (b) => Buffer.from(b).toString("base64");
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const baseKey = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify({ updated: new Date().toISOString(), events })));
fs.writeFileSync("private-calendar.json", JSON.stringify({ s: b64(salt), i: b64(iv), d: b64(data), h: hash }) + "\n");
console.log(`Saved ${events.length} busy times from the Classes calendar.`);
