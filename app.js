/* Site logic — you normally don't need to edit this file. Edit content.js instead. */
(function () {
  const S = window.SITE || {};
  const A = S.artist || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);

  /* ---------- simple text bindings ---------- */
  const bind = { name: A.name, tagline: A.tagline, heroLine: A.heroLine, location: A.location,
    platform: S.classes?.platform, classIntro: S.classes?.intro };
  $$("[data-bind]").forEach((el) => { const v = bind[el.dataset.bind]; if (v) el.textContent = v; });
  document.title = `${A.name || "Music"} · ${A.tagline || "Music"}`;
  $("[data-year]").textContent = new Date().getFullYear();

  /* ---------- social icons ---------- */
  const icons = {
    youtube: '<path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-4.8.5-4.8s0-3.2-.5-4.8ZM9.7 15V9l5.8 3-5.8 3Z" fill="currentColor"/>',
    instagram: '<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.6" cy="6.4" r="1.2" fill="currentColor"/>',
    spotify: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 9.5c3.5-1 7.5-.6 10.5 1M7.5 12.7c3-.8 6-.4 8.5 1M8 15.7c2.4-.6 4.6-.3 6.5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    facebook: '<path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v8h4v-8H16l.8-4h-3.3V8.9c0-.6.4-.9.9-.9Z" fill="currentColor"/>',
    whatsapp: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.7-.1 1.3Z" fill="currentColor"/>',
    email: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m3.5 6.5 8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="2"/>'
  };
  const soc = S.social || {};
  const socialHref = (k, v) => k === "whatsapp" ? `https://wa.me/${v}` : k === "email" ? `mailto:${v}` : v;
  const socialHTML = Object.entries(soc).filter(([k, v]) => v && icons[k])
    .map(([k, v]) => `<li><a href="${esc(socialHref(k, v))}" target="_blank" rel="noopener" aria-label="${k}"><svg viewBox="0 0 24 24">${icons[k]}</svg></a></li>`).join("");
  $$("[data-social]").forEach((ul) => (ul.innerHTML = socialHTML));
  const yt = $("[data-youtube-link]");
  if (soc.youtube) yt.href = soc.youtube; else yt.remove();

  /* ---------- stats ---------- */
  $("[data-stats]").innerHTML = (A.stats || []).map((s) =>
    `<div><div class="stat__v">${esc(s.value)}</div><div class="stat__l">${esc(s.label)}</div></div>`).join("");

  /* ---------- videos ----------
     Hand-picked videos in content.js come first (keep their category/featured).
     videos.json is refreshed daily from YouTube by the GitHub Action and adds the rest. */
  const manual = (S.videos || []).filter((v) => v.title || v.id);
  let videos = manual;
  const videoCard = (v, i, hero) => {
    const thumb = v.id
      ? `<img src="https://i.ytimg.com/vi/${esc(v.id)}/${hero ? "maxresdefault" : "hqdefault"}.jpg" alt="" loading="lazy" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg'">`
      : `<div class="video__ph">♪</div>`;
    return `<button class="video ${hero ? "video--hero" : ""}" data-video="${i}">
      <div class="video__thumb">${thumb}<span class="play" aria-hidden="true"></span></div>
      <div class="video__meta"><div class="video__cat">${esc(v.category)}</div><div class="video__title">${esc(v.title)}</div></div></button>`;
  };
  let activeCat = "All";
  const renderVideos = () => {
    $("[data-videos]").innerHTML = videos.map((v, i) => [v, i])
      .filter(([v]) => activeCat === "All" || v.category === activeCat)
      .map(([v, i]) => videoCard(v, i)).join("");
    observe && observe();
  };
  const setupVideos = () => {
    const featured = videos.find((v) => v.featured) || videos[0];
    $("[data-featured]").innerHTML = featured ? videoCard(featured, videos.indexOf(featured), true) : "";
    const cats = ["All", ...new Set(videos.map((v) => v.category).filter(Boolean))];
    activeCat = "All";
    $("[data-filters]").innerHTML = cats.length > 2 ? cats.map((c) =>
      `<button class="chip ${c === "All" ? "is-active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("") : "";
    renderVideos();
  };
  $("[data-filters]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    activeCat = b.dataset.cat;
    $$(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
    renderVideos();
  });
  setupVideos();
  fetch("videos.json", { cache: "no-cache" }).then((r) => r.ok ? r.json() : []).then((auto) => {
    if (!Array.isArray(auto) || !auto.length) return;
    const curated = manual.filter((v) => v.id);
    const seen = new Set(curated.map((v) => v.id));
    const extra = auto.filter((v) => v.id && !seen.has(v.id))
      .map((v) => ({ id: v.id, title: v.title, category: v.category || S.autoVideoCategory || "Latest" }));
    videos = [...curated, ...extra];
    setupVideos();
  }).catch(() => {});

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-video]"); if (!b) return;
    const v = videos[+b.dataset.video];
    if (!v.id) { openModal(`<div class="reader"><h2>${esc(v.title)}</h2><p class="muted">Video coming soon. (Add the YouTube id in content.js)</p></div>`); return; }
    openModal(`<div class="modal__video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?autoplay=1&rel=0" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`);
  });

  /* ---------- events ----------
     Sources: announcements in content.js + events.json (synced from her Google Calendar).
     Dates/times are Indian Standard Time. */
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let evs = [], upcoming = [], past = [], activeTab = "upcoming", cdTimer;
  const buildEvents = (list) => {
    const now = new Date();
    evs = list.filter((e) => e && e.date).map((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      const start = new Date(`${e.date}T${e.time || "00:00"}:00+05:30`);
      const endOfDay = new Date(`${e.date}T23:59:59+05:30`);
      return { ...e, y, m, day: d, d: start, isPast: endOfDay < now };
    });
    upcoming = evs.filter((e) => !e.isPast).sort((a, b) => a.d - b.d);
    past = evs.filter((e) => e.isPast).sort((a, b) => b.d - a.d);
  };
  // time "18:30" -> "6:30 PM"
  const t12 = (t) => { const m = String(t || "").match(/^(\d{1,2}):(\d{2})/); if (!m) return t || ""; let h = +m[1]; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; };
  const whenText = (e) => e.time ? `${t12(e.time)}${e.endTime ? " – " + t12(e.endTime) : ""} IST` : "";
  const placeText = (e) => [e.venue, e.address || e.city].filter(Boolean).join(", ");
  // accompanists: only lines that are filled in are shown
  const ARTISTS = [["violin", "Violin"], ["mridangam", "Mridangam"], ["ghatam", "Ghatam"], ["others", "Others"]];
  const artistLines = (e) => ARTISTS.filter(([k]) => e[k] && String(e[k]).trim()).map(([k, l]) => `<span class="event__artist"><b>${l}:</b> ${esc(e[k])}</span>`).join("");
  const eventHTML = (e, isPast) => {
    const idx = evs.indexOf(e);
    const place = placeText(e), when = whenText(e), artists = artistLines(e);
    const more = e.description && e.description.length;
    return `<article class="event ${isPast ? "event--past" : ""} reveal" ${e.code ? `data-code="${esc(e.code)}"` : ""}>
      <div class="event__date"><div class="event__day">${e.day}</div><div class="event__mon">${MON[e.m - 1]} ${e.y}</div></div>
      <div><span class="event__type">${esc(e.type || "Concert")}</span><h3>${esc(e.title)}</h3>
        ${when || place ? `<div class="event__where">${[when, esc(place)].filter(Boolean).join(" · ")}</div>` : ""}
        ${artists ? `<div class="event__artists">${artists}</div>` : ""}
        ${e.note ? `<p class="muted" style="margin:6px 0 0">${esc(e.note)}</p>` : ""}</div>
      <div class="event__actions">${!isPast ? `<button class="btn btn--ghost btn--small" data-ics="${idx}">+ Calendar</button>` : ""}
        ${!isPast && e.link ? `<a class="btn btn--small" href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.linkLabel || "Details")}</a>` : ""}
        ${more ? `<button class="btn btn--ghost btn--small" data-event-more="${idx}">Read more</button>` : ""}</div>
    </article>`;
  };
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-event-more]"); if (!b || document.body.classList.contains("is-editing")) return;
    const e = evs[+b.dataset.eventMore]; if (!e) return;
    const rows = [["Date", `${e.day} ${MON[e.m - 1]} ${e.y}`], ["Time", whenText(e)], ["Venue", e.venue], ["Place", e.address || e.city],
      ...ARTISTS.map(([k, l]) => [l, e[k]])].filter(([, v]) => v && String(v).trim());
    openModal(`<article class="reader"><p class="eyebrow">${esc(e.type || "Concert")}</p><h2>${esc(e.title)}</h2>
      <dl class="event-facts">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      ${(e.description || []).map((t) => `<p>${esc(t)}</p>`).join("")}</article>`);
  });
  const renderEvents = () => {
    const list = activeTab === "past" ? past : upcoming;
    const pastBtn = $('[data-events-tab="past"]'); if (pastBtn) pastBtn.textContent = `Past${past.length ? ` (${past.length})` : ""}`;
    $("[data-events]").innerHTML = list.length ? list.map((e) => eventHTML(e, activeTab === "past")).join("")
      : `<p class="empty">${activeTab === "past" ? "No past events yet." : "New dates announced soon — see past concerts in the Past tab."}</p>`;
    observe();
  };
  $$("[data-events-tab]").forEach((t) => t.addEventListener("click", () => {
    $$("[data-events-tab]").forEach((x) => x.classList.toggle("is-active", x === t));
    activeTab = t.dataset.eventsTab; renderEvents();
  }));

  // Next-up banner with countdown
  const renderNextUp = () => {
    const box = $("[data-nextup]"); clearInterval(cdTimer);
    const next = upcoming.find((e) => e.type !== "New venture") || upcoming[0];
    if (!next) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="wrap"><div><div class="nextup__label">Next up · ${esc(next.type || "Concert")}</div>
      <div class="nextup__title">${esc(next.title)}</div></div><div class="countdown" data-cd></div>
      <a href="#events" class="btn btn--small">Details</a></div>`;
    const tick = () => {
      const ms = Math.max(0, next.d - new Date());
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
      $("[data-cd]").innerHTML = `<div><b>${d}</b><span>days</span></div><div><b>${h}</b><span>hrs</span></div><div><b>${m}</b><span>min</span></div>`;
    };
    tick(); cdTimer = setInterval(tick, 30000);
  };
  const showEvents = (list) => { buildEvents(list); renderEvents(); renderNextUp(); };
  const manualEvents = S.announcements || [];
  showEvents(manualEvents);
  const getJSON = (f) => fetch(f, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const igReady = getJSON("instagram.json");
  Promise.all([getJSON("events.json"), igReady]).then(([cal, ig]) => {
    const key = (e) => `${e.date}|${String(e.title).trim().toLowerCase()}`;
    const seen = new Set(manualEvents.map(key));
    const calEv = (Array.isArray(cal) ? cal : []).filter((e) => !seen.has(key(e)));
    const FIELDS = ["venue", "address", "city", "time", "endTime", "violin", "mridangam", "ghatam", "others", "link", "linkLabel"];
    const pick = (o) => Object.fromEntries(FIELDS.filter((k) => o[k]).map((k) => [k, o[k]]));
    const igEv = igItems(ig, "concert").flatMap((x) => (x.events && x.events.length ? x.events : [{}]).map((sub) => ({
      type: "Concert", code: x.events && x.events.length ? "" : x.code, ...pick(x), ...pick(sub),
      title: sub.title || x.title, date: sub.date || x.date, description: sub.description || x.description })));
    showEvents([...manualEvents, ...calEv, ...igEv]);
  });

  // Add-to-calendar (.ics)
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ics]"); if (!b) return;
    const ev = evs[+b.dataset.ics];
    const utc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(ev.d.getTime() + 2 * 3600e3);
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//music-site//EN", "BEGIN:VEVENT",
      `UID:${Date.now()}@music-site`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(ev.d)}`, `DTEND:${utc(end)}`,
      `SUMMARY:${A.name} — ${ev.title}`, `LOCATION:${[ev.venue, ev.city].filter(Boolean).join(", ")}`,
      `DESCRIPTION:${ev.link || ""}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = ev.title.replace(/[^\w]+/g, "-") + ".ics"; a.click();
  });

  /* ---------- Instagram posts, copied onto the site (no links to Instagram) ----------
     instagram.json is built by a GitHub Action (caption + photo). Anything typed in the editor
     (content.js "instagramPosts": title, date, description, image, venue, city) wins over the copied text. */
  const IG_ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const igCode = (u) => (String(u).match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|tv)\/([\w-]{8,})/) || [])[1];
  const igDate = (code) => { try { let n = 0n; for (const ch of code.slice(0, 11)) n = n * 64n + BigInt(IG_ABC.indexOf(ch)); return new Date(Number(n >> 23n) + 1314220021721); } catch { return null; } };
  window.__ig = { igCode, igDate };
  // Caption -> { title: first line, paras: the rest as paragraphs }. Hashtags removed, @names kept as plain names.
  function parseCaption(text) {
    const lines = String(text || "").replace(/\r/g, "").replace(/\\n/g, "\n").split("\n")
      .map((l) => l.replace(/(^|\s)#[\w\u0900-\u0DFF]+/g, "").replace(/@([\w.]+)/g, "$1").replace(/\s{2,}/g, " ").trim());
    const idx = lines.findIndex((l) => /[\p{L}\p{N}]/u.test(l));
    let title = idx >= 0 ? lines[idx] : "", restLines = idx >= 0 ? lines.slice(idx + 1) : [];
    if (title.length > 90) { // long first line: cut at a sentence end (not after short abbreviations like "Sri.")
      const m = title.match(/^(.{25,90}?\w{4,}[.!?])\s/);
      const cut = m ? m[1] : title.slice(0, 80).replace(/\s+\S*$/, "") + "…";
      restLines = [title.slice(m ? m[1].length : 0).trim() && m ? title.slice(m[1].length).trim() : (m ? "" : title), ...restLines];
      title = cut.replace(/[.!]+$/, "");
    }
    const paras = []; let cur = [];
    restLines.forEach((l) => { if (!l) { if (cur.length) { paras.push(cur.join(" ")); cur = []; } } else cur.push(l); });
    if (cur.length) paras.push(cur.join(" "));
    return { title: title.replace(/[.!]+$/, ""), paras: paras.filter((x) => /[\p{L}\p{N}]/u.test(x)) };
  }
  function igItems(list, type) {
    const over = {}; (S.instagramPosts || []).forEach((x) => { const c = igCode(typeof x === "string" ? x : x?.url); if (c) over[c] = typeof x === "string" ? {} : x; });
    const hidden = new Set((S.instagramHidden || []).map(igCode));
    return (Array.isArray(list) ? list : []).filter((p) => p && p.code && !hidden.has(p.code) && ((over[p.code]?.type || p.type || "concert") === type))
      // hide posts that have no text and no picture yet (e.g. Instagram blocked the copy) — they appear once filled in
      .filter((p) => { const o = over[p.code] || {}; return p.caption || p.image || p.title || o.title || o.image || (o.description && o.description.length); })
      .map((p) => {
        const o = over[p.code] || {};
        const typed = o.description && o.description.length ? (Array.isArray(o.description) ? o.description : String(o.description).split(/\n\s*\n/)) : null;
        const saved = p.description && p.description.length ? p.description : null;
        const cap = parseCaption(p.caption);
        const filled = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length)));
        return { ...p, ...filled, code: p.code, date: o.date || p.date || (igDate(p.code) || new Date()).toISOString().slice(0, 10),
          title: o.title || p.title || cap.title || (type === "honour" ? "Chief guest" : "Concert"), description: typed || saved || cap.paras,
          image: o.image || p.image || "" };
      }).sort((a, b) => b.date.localeCompare(a.date));
  }
  // Accomplishments = chief guest & honours
  igReady.then((ig) => {
    const hon = igItems(ig, "honour");
    $("[data-acc-section]").hidden = !hon.length; const al = $("[data-acc-link]"); if (al) al.hidden = !hon.length;
    $("[data-honours]").innerHTML = hon.map((x, i) => `<button class="award reveal" data-honour="${i}" data-code="${esc(x.code)}">
      <div class="award__img"><span class="award__year">${esc(new Date(x.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}</span>
        <span class="award__emblem">🎖️</span>${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>
      <div class="award__body"><div class="award__title">${esc(x.title)}</div>
        ${x.description[0] ? `<p class="award__ex">${esc(x.description[0].length > 150 ? x.description[0].slice(0, 147) + "…" : x.description[0])}</p>` : ""}
        <span class="award__more">Read more →</span></div></button>`).join("");
    observe();
    document.addEventListener("click", (e) => {
      const c = e.target.closest("[data-honour]"); if (!c || document.body.classList.contains("is-editing")) return;
      const x = hon[+c.dataset.honour];
      openModal(`<article class="reader award-full"><p class="eyebrow">Chief guest · ${esc(new Date(x.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</p>
        <h2>${esc(x.title)}</h2>${x.image ? `<img class="award-full__img" src="${esc(x.image)}" alt="">` : ""}${x.description.map((t) => `<p>${esc(t)}</p>`).join("")}</article>`);
    });
  });

  /* ---------- classes (switch in content.js) ---------- */
  const C = S.classes || {};
  const preview = params.get("preview") === "classes";
  // Classes are by invitation only: fees & schedule live in the private student portal (students.html).
  // Invited students' browsers remember their access, so a "My classes" link appears for them (and for the owner).
  let hasPortal = false; try { hasPortal = !!(localStorage.getItem("student-portal") || localStorage.getItem("student-invites") || localStorage.getItem("student-self") || localStorage.getItem("editor-token")); } catch {}
  if (hasPortal) {
    const link = $("[data-classes-link]"); link.href = "students.html"; link.textContent = "My classes"; link.hidden = false;
    const cta = $("[data-classes-cta]"); cta.href = "students.html"; cta.textContent = "My classes"; cta.hidden = false;
  }
  if (C.public === true || preview) {
    $("[data-classes]").hidden = false;
    $$("[data-classes-link],[data-classes-cta]").forEach((el) => (el.hidden = false));
    $("[data-contact-cta]").hidden = true;
    const body = $("[data-classes-body]");
    const note = !C.enabled ? `<p class="preview-note">Preview mode — classes are switched OFF for the public. Set <code>enabled: true</code> in content.js to publish.</p>` : "";
    let cur = /(^|\b)(en-IN|hi|ta|te|kn|ml|mr|bn|gu)/i.test(navigator.language) ? "INR" : "USD";
    const money = (p) => cur === "INR" ? `₹${Number(p.priceINR).toLocaleString("en-IN")}` : `$${p.priceUSD}`;
    const renderPlans = () => {
      body.innerHTML = note + `<div class="currency" role="group" aria-label="Currency">
        <button data-cur="INR" class="${cur === "INR" ? "is-active" : ""}">₹ INR</button><button data-cur="USD" class="${cur === "USD" ? "is-active" : ""}">$ USD</button></div>
        <div class="plans">${(C.plans || []).map((p) => {
          const link = cur === "USD" && p.payLinkUSD ? p.payLinkUSD : p.payLink;
          return `<div class="plan ${p.featured ? "plan--featured" : ""}">${p.featured ? `<span class="plan__badge">Most popular</span>` : ""}
          <h3>${esc(p.name)}</h3><div class="muted">${esc(p.detail)}</div>
          <div class="plan__price">${money(p)}</div><div class="plan__alt">${cur === "INR" ? `approx. $${p.priceUSD}` : `₹${Number(p.priceINR).toLocaleString("en-IN")} in India`}</div>
          ${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Pay &amp; enrol</a>`
                 : `<a class="btn" href="#contact" data-enquire="${esc(p.name)}">Enquire to enrol</a>`}</div>`;
        }).join("")}</div>
        <h3 style="margin-bottom:20px">How it works</h3><ol class="steps">${(C.steps || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`;
    };
    const unlocked = () => !C.inviteOnly || sessionStorageGet("classes-ok") || params.get("code") === C.accessCode;
    const showGate = () => {
      body.innerHTML = note + `<div class="gate"><h3>Classes are by invitation</h3>
        <p class="muted">Enter the access code you received, or <a href="#contact" class="link-arrow">request an invite</a>.</p>
        <form data-gate><input placeholder="Access code" aria-label="Access code" required><button class="btn">Unlock</button></form>
        <p class="form__status" data-gate-msg></p></div>`;
      $("[data-gate]").addEventListener("submit", (e) => {
        e.preventDefault();
        if ($("input", e.target).value.trim().toUpperCase() === String(C.accessCode).toUpperCase()) {
          sessionStorageSet("classes-ok", "1"); renderPlans();
        } else $("[data-gate-msg]").textContent = "That code didn't match — please check and try again.";
      });
    };
    unlocked() ? renderPlans() : showGate();
    body.addEventListener("click", (e) => {
      const c = e.target.closest("[data-cur]"); if (c) { cur = c.dataset.cur; renderPlans(); }
      const q = e.target.closest("[data-enquire]");
      if (q) { $("[name=interest]").value = "Online classes"; $("[name=message]").value = `Hi, I'd like to join: ${q.dataset.enquire}.`; }
    });
  }
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch {} }

  /* ---------- articles ---------- */
  const arts = (S.articles || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!arts.length) { const sec = document.getElementById("articles"); if (sec) sec.hidden = true; document.querySelectorAll('a[href="#articles"]').forEach((l) => (l.hidden = true)); }
  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  $("[data-articles]").innerHTML = arts.map((a, i) => `<button class="article reveal" data-article="${i}">
    <div class="article__meta"><span class="article__tag">${esc(a.tag)}</span><span>${fmt(a.date)}</span>${a.readTime ? `<span>· ${esc(a.readTime)}</span>` : ""}</div>
    <h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p><span class="link-arrow">Read ${a.url ? "↗" : "→"}</span></button>`).join("");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-article]"); if (!b) return;
    const a = arts[+b.dataset.article];
    if (a.url) { window.open(a.url, "_blank", "noopener"); return; }
    openModal(`<article class="reader"><p class="eyebrow">${esc(a.tag)} · ${fmt(a.date)}</p><h2>${esc(a.title)}</h2>
      ${(a.body || []).map((p) => `<p>${esc(p)}</p>`).join("")}<p class="muted">— ${esc(A.name)}</p></article>`);
  });

  /* ---------- accomplishments: awards (content.js) + press (press.json) ---------- */
  const refreshAcc = () => {
    const has = !$("[data-press-wrap]").hidden;
    $("[data-press-section]").hidden = !has; const pl = $("[data-press-link]"); if (pl) pl.hidden = !has; observe();
  };
  /* Awards: rich cards (photo, year, conferred by, full write-up, link, video) */
  const achv = (S.achievements || []).filter((x) => x && x.title)
    .sort((a, b) => String(b.date || b.year || "").localeCompare(String(a.date || a.year || "")));
  const paras = (t) => (Array.isArray(t) ? t : String(t || "").split(/\n\s*\n|\n/)).map((x) => String(x).trim()).filter(Boolean);
  if (achv.length) {
    $("[data-awards-section]").hidden = false; const al = $("[data-awards-link]"); if (al) al.hidden = false;
    $("[data-achievements]").innerHTML = achv.map((x, i) => {
      const text = paras(x.description || x.detail);
      return `<button class="award reveal" data-award="${i}" data-key="${esc(x.title)}|${esc(x.year || "")}">
        <div class="award__img">${x.year ? `<span class="award__year">${esc(x.year)}</span>` : ""}<span class="award__emblem">🏆</span>${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>
        <div class="award__body">${x.by ? `<div class="award__by">${esc(x.by)}</div>` : ""}<div class="award__title">${esc(x.title)}</div>
          ${text[0] ? `<p class="award__ex">${esc(text[0].length > 140 ? text[0].slice(0, 137) + "…" : text[0])}</p>` : ""}
          <span class="award__more">Read more →</span></div></button>`;
    }).join("");
    document.addEventListener("click", (e) => {
      const c = e.target.closest("[data-award]"); if (!c || document.body.classList.contains("is-editing")) return;
      const x = achv[+c.dataset.award]; const text = paras(x.description || x.detail);
      const vid = (String(x.video || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(x.video || "") ? x.video : "");
      openModal(`<article class="reader award-full"><p class="eyebrow">${esc([x.year, x.by].filter(Boolean).join(" · "))}</p><h2>${esc(x.title)}</h2>
        ${x.image ? `<img class="award-full__img" src="${esc(x.image)}" alt="${esc(x.title)}">` : ""}
        ${text.map((t) => `<p>${esc(t)}</p>`).join("")}
        ${vid ? `<div class="award-full__video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(vid)}?rel=0" allowfullscreen allow="encrypted-media; picture-in-picture"></iframe></div>` : ""}
        ${x.link ? `<p><a class="btn" href="${esc(x.link)}" target="_blank" rel="noopener">More about this award ↗</a></p>` : ""}</article>`);
    });
  }
  const renderPress = (items) => {
    $("[data-press-wrap]").hidden = !items.length;
    const fmtD = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";
    $("[data-press]").innerHTML = items.map((p) => {
      const ph = `<div class="press-card__ph">${esc(p.source || "Press")}</div>`;
      const clip = !/^https?:/i.test(p.url);
      return `<a class="press-card reveal" data-url="${esc(p.url)}" ${clip ? `data-clip data-title="${esc(p.title || "")}"` : ""} href="${esc(p.url)}" target="_blank" rel="noopener">
        <div class="press-card__img">${ph}${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</div>
        <div class="press-card__body"><div class="press-card__meta">${esc([p.source, fmtD(p.date)].filter(Boolean).join(" · "))}</div>
          <h3 class="press-card__title">${esc(p.title || p.url)}</h3>${p.quote ? `<p class="press-card__quote">“${esc(p.quote)}”</p>` : ""}
          <span class="press-card__go">${clip ? "View clipping ⤢" : "Read article ↗"}</span></div></a>`;
    }).join("");
    refreshAcc();
  };
  const manualPress = (S.press || []).map((p) => (typeof p === "string" ? { url: p } : p)).filter((p) => p.url);
  renderPress(manualPress.filter((p) => p.title));
  fetch("press.json", { cache: "no-cache" }).then((r) => r.ok ? r.json() : []).then((auto) => {
    if (!Array.isArray(auto)) return;
    const byUrl = new Map(auto.map((p) => [p.url, p]));
    manualPress.forEach((p) => byUrl.set(p.url, { ...(byUrl.get(p.url) || {}), ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) }));
    const hidden = new Set(S.pressHidden || []);
    renderPress([...byUrl.values()].filter((p) => !hidden.has(p.url)).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
  }).catch(() => {});
  refreshAcc();

  /* ---------- newsletter ---------- */
  const NL = { enabled: true, heading: "Stay in tune", text: "Concert dates, new videos and class openings — straight to your inbox. No spam, unsubscribe anytime.",
    provider: "email", ...(S.newsletter || {}) };
  if (NL.enabled) {
    $("[data-newsletter]").hidden = false;
    $("[data-nl-heading]").textContent = NL.heading; $("[data-nl-text]").textContent = NL.text;
    const box = $("[data-nl-form]");
    const name = (NL.substack || "").replace(/^https?:\/\//, "").replace(/\.substack\.com.*$/, "").trim();
    if (NL.provider === "substack" && name) {
      box.innerHTML = `<iframe class="nl-embed" src="https://${esc(name)}.substack.com/embed" title="Subscribe" loading="lazy"></iframe>`;
    } else {
      const direct = NL.provider === "buttondown" && NL.buttondown ? `https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(NL.buttondown)}`
        : NL.provider === "form" && NL.formAction ? NL.formAction : "";
      const field = NL.provider === "form" ? (NL.emailField || "email") : "email";
      box.innerHTML = `<form class="nl-form" ${direct ? `action="${esc(direct)}" method="post" target="_blank"` : ""} data-nl>
        <input type="email" name="${esc(field)}" placeholder="Your email address" aria-label="Email address" required autocomplete="email">
        <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off">
        <button class="btn" type="submit">Subscribe</button><p class="nl-note" role="status" aria-live="polite"></p></form>`;
      const f = $("[data-nl]", box), note = $(".nl-note", f);
      f.addEventListener("submit", async (e) => {
        const email = f.querySelector("input[type=email]").value.trim();
        if (!f.checkValidity()) { e.preventDefault(); note.textContent = "Please enter a valid email address."; return; }
        if (direct) { note.textContent = "Almost done — please confirm in the window that opened."; return; }
        e.preventDefault();
        if (f.botcheck.checked) return;
        if (!S.contactFormKey) {
          location.href = `mailto:${soc.email}?subject=${encodeURIComponent("Newsletter: please add me")}&body=${encodeURIComponent("Please add " + email + " to your newsletter.")}`;
          return;
        }
        note.textContent = "Subscribing…";
        try {
          const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ access_key: S.contactFormKey, subject: "New newsletter subscriber", from_name: (A.name || "") + " website", email, message: `Newsletter signup: ${email}` }) });
          if ((await r.json()).success) { f.reset(); note.textContent = "Thank you! You're on the list."; } else throw 0;
        } catch { note.textContent = "Sorry, that didn't work — please try again later."; }
      });
    }
  }

  /* ---------- about ---------- */
  const ph = $("[data-photo]");
  const initial = (A.name || "♪").trim()[0];
  ph.innerHTML = `<div class="ph">${esc(initial)}</div>`;
  if (A.photo) { const img = new Image(); img.alt = A.name || ""; img.onload = () => { ph.innerHTML = ""; ph.appendChild(img); }; img.src = A.photo; }
  $("[data-bio]").innerHTML = (A.bio || []).map((p) => `<p>${esc(p)}</p>`).join("");
  $("[data-quotes]").innerHTML = (S.testimonials || []).map((t) =>
    `<blockquote class="quote reveal" style="margin:0"><p>“${esc(t.quote)}”</p><cite>— ${esc(t.name)}${t.place ? ", " + esc(t.place) : ""}</cite></blockquote>`).join("");
  const fi = S.featuredIn || [];
  if (fi.length) $("[data-featured-in]").innerHTML = `<p class="eyebrow">Featured in &amp; collaborations</p>` + fi.map((f) => `<span>${esc(f)}</span>`).join("");
  else $("[data-featured-in]").remove();

  /* ---------- contact ---------- */
  const quick = [];
  if (soc.whatsapp) quick.push(`<a class="btn" href="https://wa.me/${esc(soc.whatsapp)}?text=${encodeURIComponent("Hi! I found you through your website.")}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18">${icons.whatsapp}</svg> Chat on WhatsApp</a>`);
  if (soc.email) quick.push(`<a class="link-arrow" href="mailto:${esc(soc.email)}">${esc(soc.email)}</a>`);
  if (soc.address) quick.push(`<a class="link-arrow" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(soc.address)}" target="_blank" rel="noopener">📍 ${esc(soc.address)}</a>`);
  $("[data-quick]").innerHTML = quick.join("");

  const form = $("[data-form]"), status = $(".form__status", form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { status.textContent = "Please fill in your name, a valid email and a message."; return; }
    const data = Object.fromEntries(new FormData(form));
    if (data.botcheck) return;
    if (!S.contactFormKey) {
      const body = `${data.message}\n\n— ${data.name} (${data.email})${data.country ? ", " + data.country : ""}`;
      location.href = `mailto:${soc.email}?subject=${encodeURIComponent("Website: " + data.interest)}&body=${encodeURIComponent(body)}`;
      return;
    }
    status.textContent = "Sending…";
    try {
      const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: S.contactFormKey, subject: `Website enquiry: ${data.interest}`, from_name: A.name + " website", ...data }) });
      const j = await r.json();
      if (j.success) { form.reset(); status.textContent = "Thank you! Your message has been sent — I'll reply soon."; }
      else throw new Error(j.message);
    } catch { status.textContent = "Sorry, something went wrong. Please use WhatsApp or email instead."; }
  });

  /* ---------- modal ---------- */
  const modal = $("[data-modal]"), mc = $("[data-modal-content]");
  let lastFocus;
  function openModal(html) { lastFocus = document.activeElement; mc.innerHTML = html; modal.hidden = false; document.body.style.overflow = "hidden"; $(".modal__close").focus(); }
  function closeModal() { modal.hidden = true; mc.innerHTML = ""; document.body.style.overflow = ""; lastFocus && lastFocus.focus(); }
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  /* ---------- nav ---------- */
  const nav = $(".nav"), tog = $(".nav__toggle");
  tog.addEventListener("click", () => { const o = nav.classList.toggle("is-open"); tog.setAttribute("aria-expanded", o); });
  $$(".nav__links a").forEach((a) => a.addEventListener("click", () => { nav.classList.remove("is-open"); tog.setAttribute("aria-expanded", false); }));
  addEventListener("scroll", () => nav.classList.toggle("is-scrolled", scrollY > 10), { passive: true });

  /* ---------- SEO structured data ---------- */
  const ld = { "@context": "https://schema.org", "@type": "Person", name: A.name, jobTitle: A.tagline, description: A.heroLine,
    address: A.location, sameAs: [soc.youtube, soc.instagram, soc.spotify, soc.facebook].filter(Boolean),
    performerIn: upcoming.filter((e) => e.type === "Concert").map((e) => ({ "@type": "MusicEvent", name: e.title, startDate: e.date,
      location: { "@type": "Place", name: e.venue || e.city, address: e.city } })) };
  const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s);

  /* ---------- "Edit site" button: only on devices where she has signed in to the editor ---------- */
  let isOwner = false; try { isOwner = !!localStorage.getItem("editor-token"); } catch {}
  if (isOwner || params.get("edit") === "1") { $("[data-edit-fab]").hidden = false; $("[data-edit-link]").hidden = false; }
  // Newspaper clippings open large on the page
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-clip]"); if (!c || document.body.classList.contains("is-editing")) return;
    e.preventDefault();
    openModal(`<div class="reader"><h2>${esc(c.dataset.title)}</h2><img src="${esc(c.getAttribute("href"))}" alt="${esc(c.dataset.title)}" style="width:100%;border-radius:12px"></div>`);
  });
  // Owner tools (inline editing) load only on signed-in devices
  window.__site = { openModal, esc };
  if (isOwner) { const t = document.createElement("script"); t.src = "owner.js?v=" + Date.now(); document.body.appendChild(t); }

  /* ---------- reveal on scroll ---------- */
  var io;
  function observe() {
    if (!("IntersectionObserver" in window)) { $$(".reveal").forEach((el) => el.classList.add("is-in")); return; }
    io = io || new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { threshold: 0.12 });
    $$(".reveal:not(.is-in)").forEach((el) => io.observe(el));
  }
  observe();
})();
