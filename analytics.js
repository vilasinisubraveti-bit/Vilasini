/* Visitor analytics — GoatCounter (free, no cookies, no personal data, so no consent banner needed).
   Dashboard: https://<CODE>.goatcounter.com  (sign in with her Gmail)
   Counts: page visits, country, device, where visitors came from (Google, Instagram, YouTube…),
   plus these clicks/views: videos played, concert details, awards, press articles, sections scrolled to,
   outbound links (YouTube, Instagram…), contact form, newsletter sign-ups, class requests.
   Visits from signed-in owner devices (editor key) are NOT counted, so your own checks don't inflate numbers. */
(() => {
  const CODE = "smvilasini";                       // <- the GoatCounter code chosen at sign-up
  // Open the site once with ?notrack on any personal phone/laptop to stop counting that device (?track undoes it)
  try { if (/[?&]notrack\b/.test(location.search)) localStorage.setItem("no-analytics", "1"); if (/[?&]track\b/.test(location.search)) localStorage.removeItem("no-analytics"); } catch {}
  let owner = false; try { owner = !!localStorage.getItem("editor-token") || localStorage.getItem("no-analytics") === "1"; } catch {}
  if (!CODE || owner || /^(localhost|127\.)/.test(location.hostname)) return;

  const s = document.createElement("script");
  s.async = true; s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  document.head.appendChild(s);

  const queue = [];
  const send = (path, title) => {
    const ev = { path: String(path).slice(0, 180), title: String(title || path).slice(0, 180), event: true };
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(ev); else queue.push(ev);
  };
  s.onload = () => { while (queue.length) window.goatcounter.count(queue.shift()); };
  window.__track = send;                             // other scripts can call __track("name")

  const txt = (el, sel) => ((sel ? el.querySelector(sel) : el)?.textContent || "").trim().replace(/\s+/g, " ");
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("is-editing")) return;
    const t = e.target;
    let el;
    if ((el = t.closest("[data-video]")))       return send("video: " + txt(el, ".video__title"), "Video played");
    if ((el = t.closest("[data-event-more]")))  return send("concert details: " + txt(el.closest("article") || el, "h3"), "Concert details opened");
    if ((el = t.closest("[data-award]")))       return send("award: " + txt(el, "h3"), "Award opened");
    if ((el = t.closest("[data-article]")))     return send("article: " + txt(el, "h3"), "Article opened");
    if ((el = t.closest(".press-card")))        return send("press: " + txt(el, ".press-card__title"), "Press article opened");
    if ((el = t.closest("[data-events-tab]")))  return send("concerts tab: " + txt(el), "Concerts tab");
    if ((el = t.closest("a[href]"))) {
      const href = el.getAttribute("href") || "";
      if (/^mailto:/i.test(href)) return send("email link", "Email link clicked");
      if (/wa\.me|whatsapp/i.test(href)) return send(/students/.test(location.pathname) ? "class request (whatsapp)" : "whatsapp link", "WhatsApp clicked");
      if (/^https?:/i.test(href) && !href.startsWith(location.origin)) {
        let host = ""; try { host = new URL(href).hostname.replace(/^www\./, ""); } catch {}
        return send("outbound: " + host, "Link to " + host);
      }
    }
  }, true);
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.matches("[data-form]")) send("contact form sent", "Contact form");
    else if (f.matches("[data-nl]")) send("newsletter sign-up", "Newsletter sign-up");
    else if (f.matches("[data-req]")) send("class request (form)", "Class request");
  }, true);

  // Which sections people actually scroll to (once per visit each)
  const seen = new Set();
  const watch = () => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const id = en.target.id; if (!en.isIntersecting || seen.has(id)) return;
      seen.add(id); io.unobserve(en.target); send("section: " + id, "Section viewed: " + id);
    }), { threshold: 0.35 });
    document.querySelectorAll("section[id]").forEach((sec) => { if (!sec.hidden) io.observe(sec); });
  };
  if (document.readyState === "complete") setTimeout(watch, 1500); else addEventListener("load", () => setTimeout(watch, 1500));
})();
