/* Classes & student portal manager — owner only (loaded from owner.js).
   Stores everything encrypted in content.js:
     classVault   — the teacher's full list (locked with her classes PIN)
     classPortal  — what students see via the portal link (locked with the portal key inside that link)
     classInvites — one entry per class (locked with the key inside that class's private link)        */
(() => {
  const CC = window.ClassCrypto, O = window.__owner;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fmtIST = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
  const istParts = (iso) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }; };
  const portalUrl = (k) => `${O.SITE_URL}students.html#p.${k}`;
  const inviteUrl = (s) => `${O.SITE_URL}students.html#c.${s.id}.${s.key}`;

  let site, vault, pin, ui;

  /* ---------- overlay ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .cm{position:fixed;inset:0;z-index:120;background:rgba(43,33,27,.55);display:grid;place-items:center;padding:12px;font-family:Inter,system-ui,sans-serif}
  .cm__box{background:#fbf7f1;color:#2b211b;width:min(760px,100%);max-height:92vh;overflow:auto;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
  .cm__head{position:sticky;top:0;background:#fbf7f1;border-bottom:1px solid #e7dccb;padding:14px 18px;display:flex;align-items:center;gap:10px;z-index:2}
  .cm__head h2{font-family:Fraunces,Georgia,serif;font-size:1.3rem;margin:0;flex:1}
  .cm__x{border:0;background:#fff;border:1px solid #e7dccb;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:1rem}
  .cm__body{padding:16px 18px 22px;display:grid;gap:14px}
  .cm__tabs{display:flex;gap:8px;flex-wrap:wrap}
  .cm__tabs button{border:1px solid #e7dccb;background:#fff;border-radius:999px;padding:.5em 1em;font:500 .9rem Inter,sans-serif;cursor:pointer;color:#2b211b}
  .cm__tabs button.on{background:#2b211b;color:#fff;border-color:#2b211b}
  .cm label{display:grid;gap:4px;font-size:.82rem;color:#6e6152;font-weight:500}
  .cm input,.cm select,.cm textarea{font:inherit;font-size:.95rem;color:#2b211b;background:#fff;border:1px solid #e7dccb;border-radius:10px;padding:.6em .75em;width:100%}
  .cm textarea{min-height:70px}
  .cm .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cm .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  @media(max-width:560px){.cm .g2,.cm .g3{grid-template-columns:1fr}}
  .cm .b{background:#9c2f24;color:#fff;border:0;border-radius:999px;padding:.6em 1.1em;font:600 .88rem Inter,sans-serif;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
  .cm .b.g{background:#fff;color:#2b211b;border:1px solid #e7dccb}.cm .b.w{background:#25d366}
  .cm .b:disabled{opacity:.5}
  .cm .card{background:#fff;border:1px solid #e7dccb;border-radius:14px;padding:14px;display:grid;gap:8px}
  .cm .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .cm .muted{color:#6e6152;font-size:.88rem;margin:0}
  .cm .tag{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:.15em .6em;border:1px solid #e7dccb;color:#6e6152}
  .cm .tag.priv{border-color:#9c2f24;color:#9c2f24}
  .cm h3{font-family:Fraunces,Georgia,serif;margin:4px 0 0;font-size:1.1rem}
  .cm .linkbox{font-family:ui-monospace,monospace;font-size:.8rem;background:#f4ece0;border-radius:8px;padding:8px;word-break:break-all}
  .cm .err{color:#9c2f24;font-size:.88rem;margin:0}`;
  document.head.appendChild(css);

  function shell(title) {
    ui?.remove();
    ui = document.createElement("div"); ui.className = "cm";
    ui.innerHTML = `<div class="cm__box" role="dialog" aria-modal="true"><div class="cm__head"><h2>${esc(title)}</h2><button class="cm__x" aria-label="Close">✕</button></div><div class="cm__body"></div></div>`;
    $(".cm__x", ui).onclick = () => ui.remove();
    ui.addEventListener("click", (e) => { if (e.target === ui) ui.remove(); });
    document.body.appendChild(ui);
    return $(".cm__body", ui);
  }
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); } catch { prompt("Copy this link:", text); return; }
    if (btn) { const t = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(() => (btn.textContent = t), 1600); }
  };
  const wa = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

  /* ---------- open: load + PIN ---------- */
  window.__openClasses = async () => {
    const body = shell("Classes & student portal");
    body.innerHTML = `<p class="muted">Loading…</p>`;
    try { site = await O.readContent(); } catch (e) { body.innerHTML = `<p class="err">Could not load: ${esc(e.message)}</p>`; return; }
    pin = store.get("class-pin");
    if (site.classVault && pin) { try { vault = await CC.unlock(site.classVault, pin); return main(); } catch { store.del("class-pin"); } }
    askPin(!site.classVault);
  };

  function askPin(isNew) {
    const body = shell(isNew ? "Set up your classes" : "Unlock your classes");
    body.innerHTML = `<p class="muted">${isNew
      ? "Choose a <b>classes PIN</b> (at least 6 characters). It locks your class links and student portal. Share it only with your brother, who also manages the site."
      : "Enter your <b>classes PIN</b>. You only need to do this once on this device."}</p>
      <form class="card"><label>Classes PIN<input name="p" type="password" minlength="6" required autocomplete="off"></label>
      ${isNew ? `<label>Type it again<input name="p2" type="password" minlength="6" required autocomplete="off"></label>` : ""}
      <button class="b">${isNew ? "Create" : "Unlock"}</button><p class="err" data-e></p></form>`;
    $("form", body).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (isNew && f.p.value !== f.p2.value) { $("[data-e]", body).textContent = "The two PINs don't match."; return; }
      pin = f.p.value;
      if (isNew) { vault = { sessions: [], availability: [], note: "", portalKey: CC.randomKey() }; store.set("class-pin", pin); await save("Set up classes"); return main(); }
      try { vault = await CC.unlock(site.classVault, pin); store.set("class-pin", pin); main(); }
      catch { $("[data-e]", body).textContent = "That PIN is not correct."; }
    };
  }

  /* ---------- save (encrypt + commit) ---------- */
  async function save(what) {
    O.msg("Saving…", "", 0);
    vault.portalKey ||= CC.randomKey();
    const A = site.artist || {}, soc = site.social || {};
    const pub = (s) => ({ id: s.id, title: s.title, start: s.start, duration: s.duration, weeks: s.weeks, link: s.link, platform: CC.platformOf(s.link), meetingId: s.meetingId, passcode: s.passcode, notes: s.notes });
    const portal = { teacher: A.name || "", photo: A.photo || "", whatsapp: soc.whatsapp || "", email: soc.email || "", note: vault.note || "",
      availability: vault.availability || [], sessions: vault.sessions.filter((s) => s.audience !== "private").map(pub), updated: new Date().toISOString() };
    const vaultRec = await CC.lock(vault, pin);
    const portalRec = await CC.lock(portal, vault.portalKey);
    const invites = {};
    for (const s of vault.sessions) invites[s.id] = await CC.lock({ ...pub(s), teacher: portal.teacher, photo: portal.photo, whatsapp: portal.whatsapp, email: portal.email }, s.key);
    try {
      await O.commit(what, (d) => { d.classVault = vaultRec; d.classPortal = portalRec; d.classInvites = invites; });
      O.msg("Saved ✓ — students see it in about a minute", "ok");
      return true;
    } catch (e) { O.msg("Could not save: " + e.message, "err", 10000); return false; }
  }

  /* ---------- main screen ---------- */
  let tab = "classes";
  function main() {
    const body = shell("Classes & student portal");
    body.innerHTML = `<div class="cm__tabs">
      <button data-t="classes">📅 Classes</button><button data-t="avail">🕒 Availability</button><button data-t="portal">🔗 Student portal link</button></div><div data-v></div>`;
    $$("[data-t]", body).forEach((b) => { b.classList.toggle("on", b.dataset.t === tab); b.onclick = () => { tab = b.dataset.t; main(); }; });
    const v = $("[data-v]", body);
    ({ classes: viewClasses, avail: viewAvailability, portal: viewPortal })[tab](v);
  }

  function viewClasses(v) {
    const now = new Date();
    const list = vault.sessions.map((s) => ({ s, next: CC.nextOccurrence(s, now) })).sort((a, b) => (a.next || 9e15) - (b.next || 9e15));
    v.innerHTML = `<div class="row" style="justify-content:space-between"><p class="muted">All times are Indian time (IST). Students see them in their own time zone.</p>
      <button class="b" data-new>+ Schedule a class</button></div><div data-list style="display:grid;gap:10px"></div>`;
    $("[data-new]", v).onclick = () => editForm(v, null);
    const L = $("[data-list]", v);
    if (!list.length) L.innerHTML = `<div class="card"><p class="muted">No classes yet. Tap <b>+ Schedule a class</b> to add one.</p></div>`;
    list.forEach(({ s, next }) => {
      const c = document.createElement("div"); c.className = "card";
      c.innerHTML = `<div class="row"><h3 style="flex:1">${esc(s.title)}</h3>
          <span class="tag ${s.audience === "private" ? "priv" : ""}">${s.audience === "private" ? "Private link only" : "On student portal"}</span></div>
        <p class="muted">${next ? "Next: <b>" + esc(fmtIST(next)) + " IST</b>" : "<b>Finished</b>"} · ${esc(s.duration)} min${(+s.weeks || 1) > 1 ? ` · weekly × ${esc(s.weeks)}` : ""} · ${esc(CC.platformOf(s.link))}</p>
        <div class="row"><button class="b g" data-copy>Copy invite link</button><a class="b w" target="_blank" rel="noopener" data-wa>WhatsApp invite</a>
          <a class="b g" href="${esc(s.link)}" target="_blank" rel="noopener">Start class ↗</a><button class="b g" data-edit>Edit</button><button class="b g" data-del>Delete</button></div>`;
      const text = `You're invited to "${s.title}"${next ? ` on ${fmtIST(next)} IST` : ""}. Open this link to see the time in your time zone and join: ${inviteUrl(s)}`;
      $("[data-wa]", c).href = wa(text);
      $("[data-copy]", c).onclick = (e) => copy(inviteUrl(s), e.target);
      $("[data-edit]", c).onclick = () => editForm(v, s);
      $("[data-del]", c).onclick = async () => { if (!confirm(`Delete "${s.title}"? Its invite link will stop working.`)) return; vault.sessions = vault.sessions.filter((x) => x !== s); if (await save("Delete class")) main(); };
      L.appendChild(c);
    });
  }

  function editForm(v, s) {
    const p = s ? istParts(s.start) : { date: new Date().toISOString().slice(0, 10), time: "18:00" };
    v.innerHTML = `<form class="card"><h3>${s ? "Edit class" : "Schedule a class"}</h3>
      <label>Class name<input name="title" required value="${esc(s?.title || "")}" placeholder="e.g. Beginners batch — Varnams"></label>
      <div class="g3"><label>Date<input name="date" type="date" required value="${esc(p.date)}"></label>
        <label>Start time (IST)<input name="time" type="time" required value="${esc(p.time)}"></label>
        <label>Length (minutes)<input name="duration" type="number" min="15" step="5" value="${esc(s?.duration || 60)}"></label></div>
      <div class="g2"><label>Repeat<select name="weeks">${[1, 2, 4, 8, 12, 24, 52].map((n) => `<option value="${n}" ${+(s?.weeks || 1) === n ? "selected" : ""}>${n === 1 ? "Just once" : `Every week × ${n}`}</option>`).join("")}</select></label>
        <label>Who can see it<select name="audience"><option value="all" ${s?.audience !== "private" ? "selected" : ""}>All students (on the portal)</option>
          <option value="private" ${s?.audience === "private" ? "selected" : ""}>Private — only people I send the link to</option></select></label></div>
      <label>Zoom or Microsoft Teams meeting link<input name="link" type="url" required value="${esc(s?.link || "")}" placeholder="https://us05web.zoom.us/j/…  or  https://teams.microsoft.com/l/meetup-join/…"></label>
      <div class="g2"><label>Meeting ID (optional)<input name="meetingId" value="${esc(s?.meetingId || "")}"></label>
        <label>Passcode (optional)<input name="passcode" value="${esc(s?.passcode || "")}"></label></div>
      <label>Notes for students (optional)<textarea name="notes" placeholder="e.g. Please keep your shruti box ready">${esc(s?.notes || "")}</textarea></label>
      <div class="row"><button class="b">${s ? "Save changes" : "Create class"}</button><button type="button" class="b g" data-back>Cancel</button></div><p class="err" data-e></p></form>`;
    $("[data-back]", v).onclick = () => main();
    $("form", v).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (!CC.validLink(f.link.value)) { $("[data-e]", v).textContent = "Please paste a Zoom (zoom.us) or Microsoft Teams (teams.microsoft.com / teams.live.com) meeting link."; return; }
      const rec = { title: f.title.value.trim(), start: new Date(`${f.date.value}T${f.time.value}:00+05:30`).toISOString(), duration: +f.duration.value || 60,
        weeks: +f.weeks.value || 1, audience: f.audience.value, link: f.link.value.trim(), meetingId: f.meetingId.value.trim(), passcode: f.passcode.value.trim(), notes: f.notes.value.trim() };
      if (s) Object.assign(s, rec); else vault.sessions.push({ id: CC.randomId(), key: CC.randomKey(), ...rec });
      $$("button", f).forEach((b) => (b.disabled = true));
      if (await save(s ? "Update class" : "Schedule class")) { tab = "classes"; main(); } else $$("button", f).forEach((b) => (b.disabled = false));
    };
  }

  function viewAvailability(v) {
    const rows = (vault.availability || []).map((a) => ({ ...a }));
    const draw = () => {
      v.innerHTML = `<div class="card"><p class="muted">When are you free to teach? Students see these slots in their own time zone and can request one. Times are IST.</p>
        <div data-rows style="display:grid;gap:8px"></div><div class="row"><button class="b g" data-add>+ Add a slot</button></div>
        <label>Message for students (optional)<textarea data-note placeholder="e.g. First trial class is free. Weekend slots fill up fast!">${esc(vault.note || "")}</textarea></label>
        <div class="row"><button class="b" data-save>Save availability</button></div></div>`;
      const R = $("[data-rows]", v);
      rows.forEach((r, i) => {
        const d = document.createElement("div"); d.className = "row";
        d.innerHTML = `<select style="max-width:110px">${DAYS.map((x) => `<option ${x === r.day ? "selected" : ""}>${x}</option>`).join("")}</select>
          <input type="time" value="${esc(r.from)}" style="max-width:140px"> to <input type="time" value="${esc(r.to)}" style="max-width:140px">
          <button class="b g" title="Remove">✕</button>`;
        const [sel, from, to] = [$("select", d), ...$$("input", d)];
        sel.onchange = () => (r.day = sel.value); from.onchange = () => (r.from = from.value); to.onchange = () => (r.to = to.value);
        $("button", d).onclick = () => { rows.splice(i, 1); draw(); };
        R.appendChild(d);
      });
      $("[data-add]", v).onclick = () => { rows.push({ day: "Sat", from: "10:00", to: "12:00" }); draw(); };
      $("[data-save]", v).onclick = async (e) => {
        vault.availability = rows.filter((r) => r.day && r.from && r.to);
        vault.note = $("[data-note]", v).value.trim();
        e.target.disabled = true; await save("Update availability"); e.target.disabled = false;
      };
    };
    draw();
  }

  function viewPortal(v) {
    const url = portalUrl(vault.portalKey);
    const text = `Namaste! Here is my student portal — my availability, upcoming classes and join links: ${url}`;
    v.innerHTML = `<div class="card"><h3>Your private student portal</h3>
      <p class="muted">Share this link only with your students. Anyone without it sees nothing — the class links are encrypted on the website.</p>
      <div class="linkbox">${esc(url)}</div>
      <div class="row"><button class="b" data-copy>Copy link</button><a class="b w" href="${esc(wa(text))}" target="_blank" rel="noopener">Share on WhatsApp</a>
        <a class="b g" href="${esc(url)}" target="_blank" rel="noopener">Preview as a student ↗</a></div></div>
      <div class="card"><h3>Reset the link</h3><p class="muted">If the link was shared with someone who should no longer have it, reset it. The old link stops working — send the new one to your current students.</p>
        <div class="row"><button class="b g" data-reset>Reset portal link</button></div></div>
      <div class="card"><h3>Classes PIN</h3><p class="muted">This device remembers your PIN. Use "Forget PIN" on shared computers.</p>
        <div class="row"><button class="b g" data-forget>Forget PIN on this device</button></div></div>`;
    $("[data-copy]", v).onclick = (e) => copy(url, e.target);
    $("[data-reset]", v).onclick = async () => { if (!confirm("Reset the portal link? The old link will stop working.")) return; vault.portalKey = CC.randomKey(); if (await save("Reset student portal link")) main(); };
    $("[data-forget]", v).onclick = () => { store.del("class-pin"); ui.remove(); O.msg("PIN forgotten on this device", "ok"); };
  }
})();
