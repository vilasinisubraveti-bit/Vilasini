/* Owner tools — loaded ONLY on devices where the editor key is saved (signed in via admin.html).
   Visitors never download or see this. Lets the owner edit the page in place. */
(() => {
  const token = (() => { try { return localStorage.getItem("editor-token"); } catch { return null; } })();
  if (!token) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = window.__site?.esc || ((v) => String(v ?? ""));

  const host = location.hostname.match(/^([^.]+)\.github\.io$/i);
  const OWNER = host ? host[1] : "vilasinisubraveti-bit";
  const REPO = host ? (location.pathname.split("/").filter(Boolean)[0] || `${OWNER}.github.io`) : "Vilasini";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
  const SITE_URL = host ? `${location.origin}/${REPO}/` : location.href.replace(/[^/]*$/, "");

  /* ---------- GitHub helpers ---------- */
  const b64encode = (str) => { const b = new TextEncoder().encode(str); let s = ""; b.forEach((x) => (s += String.fromCharCode(x))); return btoa(s); };
  const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  async function gh(path, opts = {}) {
    const r = await fetch(API + path + (opts.method ? "" : `?ref=main&t=${Date.now()}`), {
      ...opts, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!r.ok) { const e = new Error((await r.json().catch(() => ({}))).message || r.statusText); e.status = r.status; throw e; }
    return r.json();
  }
  const serialize = (data) => `/* =====================================================================
   CONTENT.JS — all website text lives here.
   Easiest way to edit: open the website on your signed-in device and tap "Edit page",
   or use ${SITE_URL}admin.html
   ===================================================================== */

window.SITE = ${JSON.stringify(data, null, 2)};
`;
  // Load the latest content.js, change it, save it back
  async function commit(message, mutate) {
    const f = await gh("content.js");
    const data = new Function("window", b64decode(f.content) + "\n;return window.SITE;")({});
    mutate(data);
    await gh("content.js", { method: "PUT", body: JSON.stringify({ message: message + " (on-page editor)", branch: "main", content: b64encode(serialize(data)), sha: f.sha }) });
    return data;
  }
  async function uploadImage(path, file, maxSide) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    let sha; try { sha = (await gh(path)).sha; } catch {}
    await gh(path, { method: "PUT", body: JSON.stringify({ message: "Upload image (on-page editor)", branch: "main", content: dataUrl.split(",")[1], ...(sha ? { sha } : {}) }) });
    return dataUrl;
  }

  /* ---------- toolbar ---------- */
  const fab = $("[data-edit-fab]"); if (fab) fab.hidden = true;
  const bar = document.createElement("div"); bar.className = "owner-bar";
  bar.innerHTML = `<span class="owner-bar__msg" data-msg>Only you can see this</span>
    <button class="owner-btn owner-btn--ghost" data-classes-btn>🎓 Classes</button>
    <a class="owner-btn owner-btn--ghost" href="admin.html">All settings</a>
    <button class="owner-btn" data-toggle>✎ Edit page</button>
    <button class="owner-btn owner-btn--ghost" data-cancel hidden>Cancel</button>
    <button class="owner-btn owner-btn--save" data-save hidden>Save changes</button>`;
  document.body.appendChild(bar);
  let msgTimer;
  const msg = (t, kind = "", ms = 6000) => { const m = $("[data-msg]", bar); m.textContent = t; m.dataset.kind = kind; clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => { m.textContent = document.body.classList.contains("is-editing") ? "Editing — tap any dotted text" : "Only you can see this"; m.dataset.kind = ""; }, ms); };

  let editing = false, dirty = false;
  const TEXT = { name: "artist.name", tagline: "artist.tagline", heroLine: "artist.heroLine", location: "artist.location" };
  const editableTextEls = () => $$("[data-bind]").filter((el) => TEXT[el.dataset.bind] && !el.closest(".nav, .footer"));
  const plainPaste = (e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); };

  function enterEdit() {
    editing = true; dirty = false; document.body.classList.add("is-editing");
    $("[data-toggle]", bar).hidden = true; $("[data-save]", bar).hidden = false; $("[data-cancel]", bar).hidden = false;
    msg("Editing — tap any dotted text", "", 0);
    // Text: name, tagline, headline, location
    editableTextEls().forEach((el) => {
      el.contentEditable = "true"; el.spellcheck = true; el.addEventListener("paste", plainPaste);
      el.oninput = () => { dirty = true; $$(`[data-bind="${el.dataset.bind}"]`).forEach((o) => { if (o !== el && !o.isContentEditable) o.textContent = el.textContent; }); };
    });
    // Bio
    const bio = $("[data-bio]"); bio.contentEditable = "true"; bio.addEventListener("paste", plainPaste); bio.oninput = () => (dirty = true);
    if (!bio.textContent.trim()) bio.innerHTML = "<p>Write about yourself here…</p>";
    // Numbers (years of training, concerts, countries…)
    const stats = $("[data-stats]");
    const wireStat = (div) => {
      $$(".stat__v, .stat__l", div).forEach((x) => { x.contentEditable = "true"; x.addEventListener("paste", plainPaste); x.oninput = () => (dirty = true); });
      if (!$(".owner-x", div)) { const x = document.createElement("button"); x.className = "owner-x"; x.title = "Remove"; x.textContent = "✕";
        x.onclick = () => { div.remove(); dirty = true; }; div.appendChild(x); }
    };
    [...stats.children].forEach(wireStat);
    const add = document.createElement("button"); add.className = "owner-add"; add.textContent = "+ Add number";
    add.onclick = () => { const d = document.createElement("div"); d.innerHTML = `<div class="stat__v">10+</div><div class="stat__l">New highlight</div>`;
      stats.insertBefore(d, add); wireStat(d); dirty = true; };
    stats.appendChild(add);
    // Photo
    const photo = $("[data-photo]");
    const pbtn = document.createElement("label"); pbtn.className = "owner-photo";
    pbtn.innerHTML = `📷 Change photo<input type="file" accept="image/*" hidden>`;
    $("input", pbtn).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        msg("Uploading photo…", "", 0);
        const url = await uploadImage("assets/portrait.jpg", f, 1400);
        photo.querySelectorAll("img").forEach((i) => i.remove());
        const img = new Image(); img.src = url; photo.prepend(img);
        await commit("Update photo", (d) => { d.artist ??= {}; d.artist.photo = `assets/portrait.jpg?v=${Date.now()}`; });
        msg("Photo saved ✓ — live in about a minute", "ok");
      } catch (err) { msg("Photo upload failed: " + err.message, "err", 9000); }
    };
    photo.appendChild(pbtn);
    decorateAccomplishments();
    socialEditor();
  }

  /* ---------- Social links & address (owner only) ---------- */
  function socialEditor() {
    const ul = $(".hero [data-social]"); if (!ul) return;
    const btn = document.createElement("button"); btn.className = "owner-btn owner-social-btn"; btn.type = "button"; btn.textContent = "✎ Edit links";
    ul.after(btn);
    btn.onclick = async () => {
      if ($(".owner-social")) { $(".owner-social").remove(); return; }
      const panel = document.createElement("form"); panel.className = "owner-panel owner-social";
      panel.innerHTML = `<b>Social links & contact</b><p class="owner-hint">Leave a box empty to hide that icon.</p>
        ${[["youtube", "YouTube link"], ["instagram", "Instagram link"], ["facebook", "Facebook link"], ["spotify", "Spotify link"],
           ["whatsapp", "WhatsApp number (country code + number, e.g. 919876543210)"], ["email", "Email address"], ["address", "Address (optional, shown in Contact)"]]
          .map(([k, l]) => `<label class="owner-hint" style="display:grid;gap:4px;flex-basis:100%">${l}<input name="${k}"></label>`).join("")}
        <button class="owner-btn">Save links</button>`;
      btn.after(panel);
      const cur = { ...(window.SITE?.social || {}) };
      $$("input", panel).forEach((i) => (i.value = cur[i.name] || ""));
      panel.onsubmit = async (e) => {
        e.preventDefault(); const vals = Object.fromEntries($$("input", panel).map((i) => [i.name, i.value.trim()]));
        vals.whatsapp = vals.whatsapp.replace(/[^\d]/g, "");
        $$("button,input", panel).forEach((x) => (x.disabled = true)); msg("Saving links…", "", 0);
        try { await commit("Update social links", (d) => { d.social = { ...(d.social || {}), ...vals }; });
          window.SITE.social = { ...cur, ...vals }; panel.remove(); msg("Links saved ✓ — live in about a minute", "ok"); }
        catch (err) { msg("Could not save: " + err.message, "err", 10000); $$("button,input", panel).forEach((x) => (x.disabled = false)); }
      };
    };
  }

  function exitEdit(reload) {
    if (reload) { location.reload(); return; }
    editing = false; document.body.classList.remove("is-editing");
    $$("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
    $$(".owner-x, .owner-add, .owner-photo, .owner-panel, .owner-social-btn").forEach((el) => el.remove());
    $("[data-toggle]", bar).hidden = false; $("[data-save]", bar).hidden = true; $("[data-cancel]", bar).hidden = true;
    msg("Only you can see this", "", 0);
  }

  async function saveText() {
    const btn = $("[data-save]", bar); btn.disabled = true; msg("Saving…", "", 0);
    const get = (key) => { const el = editableTextEls().find((e) => e.dataset.bind === key); return el ? el.textContent.replace(/\s+/g, " ").trim() : undefined; };
    const bio = $("[data-bio]").innerText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const stats = [...$("[data-stats]").children].filter((d) => $(".stat__v", d))
      .map((d) => ({ value: $(".stat__v", d).textContent.trim(), label: $(".stat__l", d).textContent.trim() })).filter((s) => s.value || s.label);
    try {
      await commit("Update about & details", (d) => {
        d.artist ??= {};
        for (const [k, path] of Object.entries(TEXT)) { const v = get(k); if (v !== undefined) d.artist[path.split(".")[1]] = v; }
        d.artist.bio = bio; d.artist.stats = stats;
      });
      dirty = false; msg("Saved ✓ — live for everyone in about a minute", "ok");
      exitEdit(false);
    } catch (err) { msg("Could not save: " + err.message, "err", 10000); }
    finally { btn.disabled = false; }
  }

  $("[data-toggle]", bar).onclick = enterEdit;
  $("[data-save]", bar).onclick = saveText;
  $("[data-cancel]", bar).onclick = () => { if (!dirty || confirm("Discard your changes?")) exitEdit(true); };
  addEventListener("beforeunload", (e) => { if (editing && dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Accomplishments: add link / newspaper photo / award, remove items ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  function decorateAccomplishments() {
    const sec = $("[data-acc-section]"); sec.hidden = false;
    $("[data-achievements-wrap]").hidden = false; $("[data-press-wrap]").hidden = false;
    // remove buttons
    $$("[data-achievements] .achv").forEach((card) => addRemove(card, async () => {
      const [title, year] = card.dataset.key.split("|");
      await commit("Remove achievement", (d) => { d.achievements = (d.achievements || []).filter((x) => !(x.title === title && String(x.year || "") === year)); });
    }));
    $$("[data-press] .press-card").forEach((card) => addRemove(card, async () => {
      const url = card.dataset.url;
      await commit("Remove press item", (d) => {
        d.press = (d.press || []).filter((p) => (typeof p === "string" ? p : p.url) !== url);
        d.pressHidden = [...new Set([...(d.pressHidden || []), url])];
      });
    }));
    // add panel
    const panel = document.createElement("div"); panel.className = "owner-panel";
    panel.innerHTML = `<div class="owner-tabs">
        <button data-tab="link" class="is-on">🔗 Paste a link</button>
        <button data-tab="photo">📷 Newspaper photo</button>
        <button data-tab="award">🏆 Award</button></div>
      <form data-form="link"><input name="url" type="url" placeholder="Paste the article or video link" required>
        <input name="date" type="date" title="Date (optional — found automatically)"><button class="owner-btn">Add</button>
        <p class="owner-hint">Headline, picture and date are fetched automatically. Items are sorted newest first.</p></form>
      <form data-form="photo" hidden><input name="file" type="file" accept="image/*" capture="environment" required>
        <input name="title" placeholder="Headline, e.g. 'A voice of rare depth'" required>
        <input name="source" placeholder="Newspaper, e.g. The Hindu">
        <input name="date" type="date" value="${today()}" required><button class="owner-btn">Upload</button>
        <p class="owner-hint">On a phone this opens the camera — photograph the clipping flat, in good light.</p></form>
      <form data-form="award" hidden><input name="year" placeholder="Year" inputmode="numeric" required style="max-width:110px">
        <input name="title" placeholder="Award / achievement" required><input name="detail" placeholder="Given by / details">
        <input name="link" type="url" placeholder="Link (optional)"><button class="owner-btn">Add</button></form>`;
    sec.querySelector(".section__head").after(panel);
    $$("[data-tab]", panel).forEach((b) => (b.onclick = () => {
      $$("[data-tab]", panel).forEach((x) => x.classList.toggle("is-on", x === b));
      $$("[data-form]", panel).forEach((f) => (f.hidden = f.dataset.form !== b.dataset.tab));
    }));
    const busy = (f, on) => $$("button, input", f).forEach((x) => (x.disabled = on));

    $("[data-form=link]", panel).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; const url = f.url.value.trim(); const date = f.date.value;
      busy(f, true); msg("Adding link…", "", 0);
      try {
        await commit("Add press link", (d) => {
          const list = (d.press ||= []);
          if (!list.some((p) => (typeof p === "string" ? p : p.url) === url)) list.unshift({ url, title: "", source: "", date, quote: "", image: "" });
          d.pressHidden = (d.pressHidden || []).filter((u) => u !== url);
        });
        f.reset(); msg("Added ✓ — headline & picture appear in 2–5 minutes", "ok", 9000);
        prependPress({ url, title: "Fetching headline…", source: new URL(url).hostname.replace(/^www\./, ""), date });
      } catch (err) { msg("Could not add: " + err.message, "err", 10000); }
      finally { busy(f, false); }
    };
    $("[data-form=photo]", panel).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; const file = f.file.files[0]; if (!file) return;
      const item = { title: f.title.value.trim(), source: f.source.value.trim(), date: f.date.value };
      busy(f, true); msg("Uploading clipping…", "", 0);
      try {
        const slug = (item.title || "clipping").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "");
        const path = `assets/press/${item.date || today()}-${slug}-${Date.now().toString(36)}.jpg`;
        const dataUrl = await uploadImage(path, file, 2000);
        await commit("Add newspaper clipping", (d) => { (d.press ||= []).unshift({ url: path, image: path, quote: "", ...item }); });
        f.reset(); f.date.value = today(); msg("Clipping added ✓ — live in about a minute", "ok");
        prependPress({ url: path, image: dataUrl, ...item, clip: true });
      } catch (err) { msg("Upload failed: " + err.message, "err", 10000); }
      finally { busy(f, false); }
    };
    $("[data-form=award]", panel).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const item = { year: f.year.value.trim(), title: f.title.value.trim(), detail: f.detail.value.trim(), link: f.link.value.trim() };
      busy(f, true); msg("Adding award…", "", 0);
      try {
        await commit("Add achievement", (d) => { (d.achievements ||= []).unshift(item); });
        f.reset(); msg("Award added ✓ — live in about a minute", "ok");
        const card = document.createElement("div"); card.className = "achv is-in"; card.dataset.key = `${item.title}|${item.year}`;
        card.innerHTML = `<div class="achv__year">${esc(item.year)}</div><div class="achv__title">${esc(item.title)}</div>${item.detail ? `<div class="achv__detail">${esc(item.detail)}</div>` : ""}`;
        $("[data-achievements]").prepend(card); addRemove(card, async () => {
          await commit("Remove achievement", (d) => { d.achievements = (d.achievements || []).filter((x) => !(x.title === item.title && String(x.year || "") === item.year)); });
        });
      } catch (err) { msg("Could not add: " + err.message, "err", 10000); }
      finally { busy(f, false); }
    };
  }

  function prependPress(p) {
    const a = document.createElement("a"); a.className = "press-card is-in"; a.dataset.url = p.url; a.href = p.url; a.target = "_blank";
    a.innerHTML = `<div class="press-card__img"><div class="press-card__ph">${esc(p.source || "Press")}</div>${p.image ? `<img src="${esc(p.image)}" alt="">` : ""}</div>
      <div class="press-card__body"><div class="press-card__meta">${esc([p.source, p.date].filter(Boolean).join(" · "))}</div>
      <h3 class="press-card__title">${esc(p.title)}</h3><span class="press-card__go">New</span></div>`;
    $("[data-press]").prepend(a);
    addRemove(a, async () => {
      await commit("Remove press item", (d) => { d.press = (d.press || []).filter((x) => (typeof x === "string" ? x : x.url) !== p.url); });
    });
  }

  function addRemove(card, action) {
    if ($(".owner-x", card)) return;
    const x = document.createElement("button"); x.className = "owner-x owner-x--card"; x.title = "Remove from website"; x.textContent = "✕";
    x.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm("Remove this from the website?")) return;
      msg("Removing…", "", 0);
      try { await action(); card.remove(); msg("Removed ✓ — updates for everyone in about a minute", "ok"); }
      catch (err) { msg("Could not remove: " + err.message, "err", 10000); }
    };
    card.appendChild(x);
  }

  /* ---------- Classes & student portal (separate file, owner only) ---------- */
  async function readContent() { const f = await gh("content.js"); return new Function("window", b64decode(f.content) + "\n;return window.SITE;")({}); }
  window.__owner = { commit, readContent, msg, SITE_URL };
  const loadScript = (src) => new Promise((ok, fail) => { const t = document.createElement("script"); t.src = src + "?v=" + Date.now(); t.onload = ok; t.onerror = fail; document.body.appendChild(t); });
  $("[data-classes-btn]", bar).onclick = async () => {
    try {
      if (!window.ClassCrypto) await loadScript("classcrypto.js");
      if (!window.__openClasses) await loadScript("owner-classes.js");
      window.__openClasses();
    } catch { msg("Could not open classes — check your connection", "err"); }
  };

  // While editing, links inside the page shouldn't navigate away
  document.addEventListener("click", (e) => {
    if (!editing) return;
    const a = e.target.closest("a"); if (a && !a.closest(".owner-bar") && !e.target.closest(".owner-x")) e.preventDefault();
  }, true);
})();
