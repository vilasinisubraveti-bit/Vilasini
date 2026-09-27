/* Encryption for private class links (Zoom / Teams).
   The website is public, so class details are stored ENCRYPTED in content.js:
   - each class invite is locked with its own random key, which only exists inside the invite link sent to students
   - the teacher's list of classes is locked with her private "classes PIN"                       */
window.ClassCrypto = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function key(pass, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function lock(obj, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pass, salt), enc.encode(JSON.stringify(obj)));
    return { s: b64(salt), i: b64(iv), d: b64(data) };
  }
  async function unlock(rec, pass) {
    const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(rec.i) }, await key(pass, unb64(rec.s)), unb64(rec.d));
    return JSON.parse(dec.decode(data));
  }
  const randomKey = () => b64(crypto.getRandomValues(new Uint8Array(18))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const randomId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const validLink = (u) => /^https:\/\/([\w-]+\.)*(zoom\.us|zoom\.com|teams\.microsoft\.com|teams\.live\.com|meet\.google\.com|call\.whatsapp\.com|chat\.whatsapp\.com|wa\.me)\//i.test(String(u || "").trim());
  const platformOf = (u) => /teams\./i.test(u) ? "Microsoft Teams" : /meet\.google/i.test(u) ? "Google Meet" : /whatsapp|wa\.me/i.test(u) ? "WhatsApp" : "Zoom";
  // All dates of a (possibly weekly) class
  const occurrences = (c) => Array.from({ length: Math.max(1, +c.weeks || 1) }, (_, k) => new Date(new Date(c.start).getTime() + k * 7 * 864e5));
  const nextOccurrence = (c, now = new Date()) => occurrences(c).find((d) => d.getTime() + (+c.duration || 60) * 6e4 > now.getTime()) || null;
  return { lock, unlock, randomKey, randomId, validLink, platformOf, occurrences, nextOccurrence };
})();
