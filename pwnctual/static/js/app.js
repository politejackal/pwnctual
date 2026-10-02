(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canTransition = () => !!document.startViewTransition && !reducedMotion();

  // ------------------------------------------------------------------ theme
  const syncIcon = () => {
    const icon = $("#theme-icon");
    if (icon) icon.textContent = root.dataset.theme === "light" ? "dark_mode" : "light_mode";
  };
  syncIcon();
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#theme-toggle"); if (!btn) return;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    const apply = () => { root.dataset.theme = next; store.set("theme", next); syncIcon(); };
    if (!canTransition()) return apply();
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-anim");
    const t = document.startViewTransition(apply);
    t.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: "cubic-bezier(.2, 0, 0, 1)", pseudoElement: "::view-transition-new(root)" },
    )).catch(() => {});
    t.finished.finally(() => root.classList.remove("theme-anim"));
  });

  // ------------------------------------------------------------------ top bar elevation
  const bar = $(".topbar");
  const onScroll = () => bar?.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });

  // ------------------------------------------------------------------ snackbar + copy
  let snackTimer;
  function snack(html) {
    const el = $("#snackbar"); if (!el) return;
    el.innerHTML = html; el.classList.add("show");
    clearTimeout(snackTimer); snackTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest(".copy"); if (!b) return;
    e.preventDefault();
    try { await navigator.clipboard.writeText(b.dataset.copy); snack('<span class="material-symbols-rounded">check</span>Copied'); }
    catch { snack("Copy failed. Select the text manually."); }
  });

  // ------------------------------------------------------------------ M3 Expressive wavy progress
  function drawWavy(host) {
    const p = Math.max(0, Math.min(1, parseFloat(host.dataset.p) || 0));
    const w = host.clientWidth || 300, h = 16, mid = h / 2, amp = 3, wl = 24, gap = 8;
    const fillEnd = p * w;
    const id = `c${w}${Math.round(p * 1e4)}`;
    let d = `M0 ${mid}`;
    for (let x = 0; x <= fillEnd + wl; x += 2) d += ` L${x} ${(mid + amp * Math.sin((x / wl) * Math.PI * 2)).toFixed(2)}`;
    host.innerHTML = `<svg class="wavy" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs><clipPath id="${id}"><rect x="0" y="0" width="${Math.max(0, fillEnd)}" height="${h}"/></clipPath></defs>
      ${p < 1 ? `<path class="track" d="M${Math.min(w, fillEnd + (p > 0 ? gap : 0))} ${mid} L${w - 3} ${mid}"/>` : ""}
      ${p < 1 ? `<circle class="stop" cx="${w - 3}" cy="${mid}" r="2.5"/>` : ""}
      ${p > 0 ? `<g clip-path="url(#${id})"><path class="fill" d="${d}"/></g>` : ""}
    </svg>`;
  }
  addEventListener("resize", () => $$(".wavy-host").forEach(drawWavy));

  // ------------------------------------------------------------------ challenge deep links
  const openHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const d = id && document.getElementById(id);
    if (d?.tagName !== "DETAILS") return false;
    d.open = true;
    d.scrollIntoView({ block: "start", behavior: "instant" });
    return true;
  };
  addEventListener("hashchange", openHash);

  // ------------------------------------------------------------------ rank-up celebration
  function rankUp(index, label, key) {
    const dlg = document.createElement("div");
    dlg.className = "rankup";
    dlg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">
      <div class="label">Rank up</div>
      <img class="emblem" src="/emblem/${index}.svg" alt="">
      <div class="display-s ${key === "ghost" ? "ghost-name" : ""}">${label}</div>
      <p class="muted">${key === "ghost" ? "You cleared everything. You are a Ghost." : "Keep climbing."}</p>
      <button class="btn lg" style="width:100%">Let's go</button></div>`;
    document.body.append(dlg);
    requestAnimationFrame(() => dlg.classList.add("show"));
    const close = () => { dlg.classList.remove("show"); setTimeout(() => dlg.remove(), 400); };
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("button")) close(); });
  }
  function checkRankUp() {
    if (body.dataset.rank === "" || body.dataset.rank === undefined) return;
    const key = `rank:${body.dataset.user}`;
    const seen = store.get(key);
    const cur = parseInt(body.dataset.rank, 10);
    if (seen !== null && cur > parseInt(seen, 10)) rankUp(cur, body.dataset.rankLabel, body.dataset.rankKey);
    store.set(key, String(cur));
  }

  // ------------------------------------------------------------------ lesson challenges: mark done / stuck
  document.addEventListener("click", async (e) => {
    const stuck = e.target.closest(".stuck-toggle");
    if (stuck) {
      const panel = $(".stuck", stuck.closest(".body"));
      panel.hidden = !panel.hidden;
      stuck.setAttribute("aria-expanded", String(!panel.hidden));
      return;
    }
    const b = e.target.closest("[data-done]"); if (!b || b.disabled) return;
    const list = $("#challenges");
    b.disabled = true;
    try {
      const r = await fetch(`/api/challenges/${encodeURIComponent(b.dataset.done)}/done`, { method: "POST", credentials: "same-origin",
        headers: { "X-CSRF-Token": list.dataset.csrf, Accept: "application/json" } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const d = b.closest(".chal");
      d.classList.add("solved", "just-solved");
      $(".state .material-symbols-rounded", d).textContent = "check";
      $(".lbl", b).textContent = "Done";
      snack(`<span class="material-symbols-rounded">flag</span>+${data.points} points: ${$(".title-m", d).textContent}`);
      if (data.promoted) {
        store.set(`rank:${body.dataset.user}`, String(data.rank_index));
        rankUp(data.rank_index, data.rank, data.rank_key);
      }
      const next = d.nextElementSibling;
      if (next?.matches(".chal:not(.solved)")) { d.open = false; next.open = true; }
    } catch {
      b.disabled = false;
      snack("Couldn't save that. Please try again.");
    }
  });

  // ------------------------------------------------------------------ hero word rotator
  let rotTimer = null;
  function startRotator() {
    clearInterval(rotTimer); rotTimer = null;
    const rot = $(".rotator");
    if (!rot) return;
    const words = rot.dataset.words.split(",");
    let i = 0;
    // start clean: exactly one word, natural width (a restored page can carry a half-finished swap)
    const first = document.createElement("span");
    first.className = "rot-word";
    first.textContent = words[0];
    rot.replaceChildren(first);
    rot.style.width = "";
    rotTimer = setInterval(() => {
      if (document.hidden || !rot.isConnected) return;
      i = (i + 1) % words.length;
      // drop any word a stalled animation left behind, keeping only the current one
      const all = $$(".rot-word", rot);
      all.slice(0, -1).forEach((w) => w.remove());
      const old = all[all.length - 1];
      if (reducedMotion() || !old.animate) { old.textContent = words[i]; return; }
      const next = document.createElement("span");
      next.className = "rot-word";
      next.textContent = words[i];
      rot.style.width = `${rot.getBoundingClientRect().width}px`;  // freeze current width
      Object.assign(old.style, { position: "absolute", left: "0", bottom: "0" });
      rot.append(next);
      const target = next.getBoundingClientRect().width;
      requestAnimationFrame(() => { rot.style.width = `${target}px`; });
      const ease = "cubic-bezier(.2, 0, 0, 1)";
      old.animate([{ transform: "none", opacity: 1, filter: "blur(0)" },
                   { transform: "translateY(-45%)", opacity: 0, filter: "blur(8px)" }],
                  { duration: 380, easing: ease, fill: "forwards" }).finished.then(() => old.remove(), () => old.remove());
      setTimeout(() => old.remove(), 600);  // animations can stall in a background window
      next.animate([{ transform: "translateY(45%)", opacity: 0, filter: "blur(8px)" },
                    { transform: "none", opacity: 1, filter: "blur(0)" }],
                   { duration: 520, delay: 90, easing: "cubic-bezier(.38, 1.21, .22, 1)", fill: "backwards" });
      // back to natural width so the headline still reflows on resize
      setTimeout(() => { if (rot.isConnected) rot.style.width = ""; }, 700);
    }, 2600);
  }

  // ------------------------------------------------------------------ live class scheduler
  // Slots arrive as UTC epoch seconds; everything is formatted in the timezone
  // the learner picks (their browser's by default).
  let classesTimer = null;
  function initClasses() {
    clearInterval(classesTimer); classesTimer = null;
    const app = $("#classes-app");
    if (!app) return;
    const sheet = $("#book-sheet"), scrim = $("#book-scrim"), select = $("#tz-select");
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    let tz = store.get("classes-tz") || browserTz;
    let data = null, day = null, picked = null, busy = false;

    const fmt = (t, opts, zone = tz) => new Intl.DateTimeFormat(undefined, { timeZone: zone, ...opts }).format(t * 1000);
    const timeOf = (t, zone) => fmt(t, { hour: "numeric", minute: "2-digit" }, zone);
    const dayKey = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(t * 1000);
    const hourOf = (t, zone = tz) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }).format(t * 1000));
    const minuteOf = (t, zone) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: zone, minute: "2-digit" }).format(t * 1000));
    const offsetOf = (zone) => {
      try { return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(Date.now()).find((p) => p.type === "timeZoneName")?.value || ""; }
      catch { return ""; }
    };
    const range = (t, zone = tz) => `${timeOf(t, zone)} – ${timeOf(t + data.slot_minutes * 60, zone)}`;
    const longDay = (t, zone = tz) => fmt(t, { weekday: "long", day: "numeric", month: "long" }, zone);
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

    // timezone picker: every IANA zone the browser knows, labelled with its UTC offset
    let zones = [];
    try { zones = Intl.supportedValuesOf("timeZone"); } catch {}
    if (!zones.length) zones = ["UTC", "Europe/London", "Europe/Berlin", "Asia/Riyadh", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "America/New_York", "America/Chicago", "America/Los_Angeles"];
    for (const z of [browserTz, tz]) if (!zones.includes(z)) zones.unshift(z);
    // some browsers still list a few cities under old names; show the current ones
    const renamed = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho Chi Minh", "Asia/Katmandu": "Asia/Kathmandu",
      "Asia/Rangoon": "Asia/Yangon", "Europe/Kiev": "Europe/Kyiv", "Atlantic/Faeroe": "Atlantic/Faroe", "America/Godthab": "America/Nuuk" };
    const zoneName = (z) => (renamed[z] || z).replaceAll("_", " ");
    select.innerHTML = "";
    for (const z of zones) {
      const o = el("option", null, `${zoneName(z)} (${offsetOf(z)})${z === browserTz ? " · detected" : ""}`);
      o.value = z; select.append(o);
    }
    select.value = tz;
    select.onchange = () => { tz = select.value; store.set("classes-tz", tz); day = null; render(); };

    function openSheet(t) {
      picked = t;
      $("#book-title").textContent = `${longDay(t)} · ${range(t)}`;
      const mentorTz = data.mentor_tz;
      $("#book-mentor").textContent = mentorTz === tz ? "15-minute call in your timezone."
        : `15-minute call · that's ${longDay(t, mentorTz)}, ${range(t, mentorTz)} for your mentor (${zoneName(mentorTz)}).`;
      const note = $("#book-note"); if (note) note.value = "";
      const confirm = $("#book-confirm");
      if (confirm) {
        const full = data.mine.length >= data.max_upcoming;
        confirm.disabled = full;
        confirm.lastChild.textContent = full ? "You already have a call booked" : "Book this time";
      }
      sheet.hidden = scrim.hidden = false;
      requestAnimationFrame(() => { sheet.classList.add("open"); scrim.classList.add("open"); });
      $$(".slot", app).forEach((b) => b.classList.toggle("sel", Number(b.dataset.t) === t));
    }
    function closeSheet() {
      sheet.classList.remove("open"); scrim.classList.remove("open");
      setTimeout(() => { sheet.hidden = scrim.hidden = true; }, 250);
      picked = null; $$(".slot.sel", app).forEach((b) => b.classList.remove("sel"));
    }
    scrim.onclick = closeSheet;
    $$("[data-close-sheet]", sheet).forEach((b) => (b.onclick = closeSheet));

    async function post(url, body) {
      const r = await fetch(url, { method: "POST", credentials: "same-origin", body: JSON.stringify(body || {}),
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-Token": app.dataset.csrf } });
      let j = {}; try { j = await r.json(); } catch {}
      if (!r.ok) throw new Error(j.error || "Something went wrong. Please refresh and try again.");
      return j;
    }

    const confirmBtn = $("#book-confirm");
    if (confirmBtn) confirmBtn.onclick = async () => {
      if (busy || picked == null) return;
      busy = true; confirmBtn.disabled = true;
      const t = picked;
      try {
        await post("/api/classes/book", { t, note: $("#book-note")?.value || "" });
        closeSheet();
        snack(`<span class="material-symbols-rounded">event_available</span>Booked for ${fmt(t, { weekday: "short", day: "numeric", month: "short" })}, ${timeOf(t, tz)}`);
      } catch (err) { snack(err.message); }
      busy = false; confirmBtn.disabled = false;
      load();
    };

    function renderMine() {
      const box = $("#my-classes"), list = $("#my-list");
      box.hidden = !data.mine.length;
      list.innerHTML = "";
      for (const b of data.mine) {
        const card = el("div", "my-class");
        const icon = el("span", "plan-icon"); icon.append(el("span", "material-symbols-rounded", "video_call"));
        const info = el("div", "my-info");
        info.append(el("div", "title-m", `${longDay(b.t)} · ${range(b.t)}`));
        if (data.mentor_tz !== tz) info.append(el("div", "muted", `${timeOf(b.t, data.mentor_tz)} for your mentor`));
        if (b.note) info.append(el("div", "muted my-note", `“${b.note}”`));
        const actions = el("div", "row");
        if (b.meet_url) {
          const join = el("a", "btn sm"); join.href = b.meet_url; join.target = "_blank"; join.rel = "noopener";
          join.append(el("span", "material-symbols-rounded", "videocam"), document.createTextNode("Join call"));
          actions.append(join);
        } else if (!data.can_book) {
          const renew = el("a", "btn sm", "Renew Pro to join"); renew.href = "/pricing";
          actions.append(renew);
        }
        const cancel = el("button", "btn text sm", "Cancel booking"); cancel.type = "button";
        cancel.onclick = async () => {
          if (!confirm("Cancel this call?")) return;
          try { await post(`/api/classes/${b.id}/cancel`); snack("Booking cancelled"); } catch (err) { snack(err.message); }
          load();
        };
        actions.append(cancel);
        card.append(icon, info, actions);
        list.append(card);
      }
    }

    function render() {
      if (!data) return;
      // mentor hours, translated into the chosen timezone
      const open = data.slots.find((s) => hourOf(s.t, data.mentor_tz) === 8 && minuteOf(s.t, data.mentor_tz) === 0);
      const hours = $("#tz-hours");
      if (open && data.mentor_tz !== tz) {
        hours.textContent = `Mentor hours are 8:00 AM – 12:00 AM in ${zoneName(data.mentor_tz)}, which is ${timeOf(open.t, tz)} – ${timeOf(open.t + 16 * 3600, tz)} for you.`;
      } else {
        hours.textContent = `Mentor hours: 8:00 AM – 12:00 AM (${zoneName(data.mentor_tz)}).`;
      }
      renderMine();
      const hasCall = data.mine.length >= data.max_upcoming;
      const banner = $("#one-call-banner");
      banner.hidden = !hasCall;
      if (hasCall) {
        const b = data.mine[0];
        $("#one-call-text").textContent = `You already have a call booked for ${longDay(b.t)}, ${timeOf(b.t, tz)}. `
          + "You can have one call at a time, so cancel it above to choose a different time.";
      }

      // days, in the chosen timezone
      const byDay = new Map();
      for (const s of data.slots) { const k = dayKey(s.t); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(s); }
      const keys = [...byDay.keys()];
      if (!day || !byDay.has(day)) day = keys.find((k) => byDay.get(k).some((s) => !s.taken)) || keys[0];
      const strip = $("#day-strip"); strip.innerHTML = "";
      for (const k of keys) {
        const slots = byDay.get(k), first = slots[0].t, free = slots.filter((s) => !s.taken).length;
        const b = el("button", `day-chip${k === day ? " on" : ""}`);
        b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", k === day);
        b.append(el("span", "dc-week", fmt(first, { weekday: "short" })), el("span", "dc-date", fmt(first, { day: "numeric", month: "short" })),
                 el("span", "dc-count", free ? `${free} open` : "Full"));
        b.disabled = !free;
        b.onclick = () => { day = k; render(); };
        strip.append(b);
      }

      // slots for the chosen day, grouped by time of day
      const groups = [["Early hours", 0, 5], ["Morning", 5, 12], ["Afternoon", 12, 17], ["Evening", 17, 21], ["Night", 21, 24]];
      const box = $("#slot-groups"); box.innerHTML = "";
      for (const [name, from, to] of groups) {
        const slots = (byDay.get(day) || []).filter((s) => { const h = hourOf(s.t); return h >= from && h < to; });
        if (!slots.length) continue;
        const g = el("div", "slot-group");
        g.append(el("div", "label", name));
        const grid = el("div", "slots");
        for (const s of slots) {
          const b = el("button", `slot${s.taken ? " taken" : ""}${hasCall && !s.taken ? " locked" : ""}${s.t === picked ? " sel" : ""}`, timeOf(s.t, tz));
          b.type = "button"; b.dataset.t = s.t; b.disabled = s.taken || hasCall;
          b.setAttribute("aria-label", `${longDay(s.t)}, ${range(s.t)}${s.taken ? ", taken" : ""}`);
          b.onclick = () => openSheet(s.t);
          grid.append(b);
        }
        g.append(grid); box.append(g);
      }
      if (!box.children.length) box.append(el("div", "muted", "No times left on this day."));
    }

    async function load() {
      try {
        const r = await fetch("/api/classes/slots", { headers: { Accept: "application/json" }, credentials: "same-origin" });
        data = await r.json();
        render();
      } catch { $("#slot-groups").textContent = "Couldn't load times. Please refresh."; }
    }
    load();
    classesTimer = setInterval(() => { if (!document.hidden && app.isConnected && sheet.hidden) load(); }, 60000);
  }

  // admin: cancel a learner's booking
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-admin-cancel]"); if (!b) return;
    if (!confirm("Cancel this learner's call?")) return;
    const r = await fetch(`/api/classes/${b.dataset.adminCancel}/cancel`, { method: "POST", credentials: "same-origin",
      headers: { "X-CSRF-Token": $("#admin-csrf").value, Accept: "application/json" } });
    if (r.ok) { b.closest(".admin-booking").remove(); snack("Booking cancelled"); } else snack("Couldn't cancel that booking.");
  });

  // ------------------------------------------------------------------ per-page setup
  function initPage() {
    initClasses();
    startRotator();
    $$(".wavy-host").forEach(drawWavy);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    $$(".ago").forEach((el) => {
      const s = (parseFloat(el.dataset.t) * 1000 - Date.now()) / 1000;
      for (const [u, sec] of units) if (Math.abs(s) >= sec || u === "second") { el.textContent = rtf.format(Math.round(s / sec), u); break; }
    });
    checkRankUp();
    onScroll();
  }

  // ------------------------------------------------------------------ in-place navigation
  // Internal links swap <main> instead of reloading, so the header never
  // re-renders and every navigation (including the first) animates.
  const cache = new Map();
  const PREFETCH_TTL = 10000;

  function eligible(a, e) {
    if (!a || !a.href || a.hasAttribute("download") || a.dataset.reload !== undefined) return false;
    if (a.target && a.target !== "_self") return false;
    if (e && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return false;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return false;
    if (/^\/(auth|api|static|emblem)\//.test(u.pathname)) return false;
    return true;
  }

  function fetchPage(url) {
    const key = url.split("#")[0];
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < PREFETCH_TTL) return hit.p;
    const p = fetch(key, { headers: { Accept: "text/html" }, credentials: "same-origin" }).then(async (r) => {
      if (!(r.headers.get("content-type") || "").includes("text/html")) throw new Error("not html");
      return { url: r.url, html: await r.text() };
    });
    p.catch(() => cache.delete(key));
    cache.set(key, { t: Date.now(), p });
    return p;
  }

  function syncIndicator(navSel, indClass, newDoc) {
    const links = $$(`${navSel} a`);
    const newLinks = $$(`${navSel} a`, newDoc);
    const idx = newLinks.findIndex((a) => a.classList.contains("active"));
    let ind = $(`.${indClass}`);
    links.forEach((a, i) => {
      a.classList.toggle("active", i === idx);
      if (i === idx) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (idx < 0) { ind?.remove(); return; }
    if (!ind) {
      // A brand-new indicator would get a transition layer painted above every
      // tab (new-only layers go on top) and hide the tab it lands on, so it
      // joins the header's layer and simply fades in with it this time.
      ind = document.createElement("span");
      ind.className = `${indClass} vt-plain`;
      ind.setAttribute("aria-hidden", "true");
    }
    const host = indClass === "bnav-ind" ? $(".pill", links[idx]) : links[idx];
    host.prepend(ind);
  }

  function applyDoc(doc) {
    document.title = doc.title;
    for (const [k, v] of Object.entries(doc.body.dataset)) body.dataset[k] = v;
    syncIndicator(".navgroup", "nav-ind", doc);
    syncIndicator(".bottomnav", "bnav-ind", doc);
    const acts = $(".topbar .actions"), newActs = $(".topbar .actions", doc);
    if (acts && newActs && acts.textContent.trim() !== newActs.textContent.trim()) acts.replaceWith(newActs);
    $("main").replaceWith(document.adoptNode($("main", doc)));
  }

  let navToken = 0;
  async function go(url, { push = true, scroll = null, load = null, fallback = null } = {}) {
    const token = ++navToken;
    const bail = fallback || (() => { location.href = url; });
    let page;
    try { page = await (load ? load() : fetchPage(url)); } catch { bail(); return; }
    if (token !== navToken) return;  // a newer click won
    cache.delete(url.split("#")[0]);
    const doc = new DOMParser().parseFromString(page.html, "text/html");
    if (!$("main", doc) || !$(".topbar", doc)) { bail(); return; }
    // a deploy changed the CSS/JS: do a real load so the new assets apply
    const assets = (d) => $$('link[rel="stylesheet"][href*="/static/"], script[src*="/static/"]', d).map((el) => el.getAttribute("href") || el.getAttribute("src")).join("|");
    if (assets(doc) !== assets(document)) { location.href = page.url; return; }
    const target = new URL(page.url);
    target.hash = new URL(url, location.href).hash;

    let swapped = false;
    const swap = () => {
      if (swapped) return;
      swapped = true;
      if (push) {
        history.replaceState({ ...(history.state || {}), scroll: scrollY }, "");
        history.pushState({ scroll: 0 }, "", target.href);
      }
      applyDoc(doc);
      currentPage = pageKey();
      initPage();
      if (!(target.hash && openHash())) scrollTo({ top: scroll ?? 0, behavior: "instant" });
    };
    if (!canTransition()) { swap(); $$(".vt-plain").forEach((el) => el.classList.remove("vt-plain")); return; }
    // An indicator that is about to disappear (going to a page with no tab,
    // like Sign in) fades out with the header instead of lingering on its own layer.
    for (const [sel, cls] of [[".navgroup", "nav-ind"], [".bottomnav", "bnav-ind"]]) {
      if (!$$(`${sel} a`, doc).some((a) => a.classList.contains("active"))) $(`.${cls}`)?.classList.add("vt-plain");
    }
    const t = document.startViewTransition(swap);
    t.ready.catch(() => {});
    t.finished.finally(() => $$(".vt-plain").forEach((el) => el.classList.remove("vt-plain")));
    // never let an animation hold up navigation (e.g. a tab that isn't painting)
    setTimeout(() => { if (!swapped) { t.skipTransition(); swap(); } }, 800);
  }

  history.scrollRestoration = "manual";
  const pageKey = () => location.pathname + location.search;
  let currentPage = pageKey();
  addEventListener("popstate", (e) => {
    if (pageKey() === currentPage) { openHash(); return; }  // hash-only history entry
    go(location.href, { push: false, scroll: e.state?.scroll ?? 0 });
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (e.defaultPrevented || !eligible(a, e)) return;
    const u = new URL(a.href, location.href);
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return;  // same-page anchor
    e.preventDefault();
    go(u.href);
  });

  // forms (sign in, sign out) submit in the background
  // and swap the page the same way, so the header cross-fades instead of
  // cutting when it changes from "Sign in" to your rank.
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (e.defaultPrevented || form.dataset.reload !== undefined || (form.method || "get").toLowerCase() !== "post") return;
    const action = new URL(form.getAttribute("action") || location.href, location.href);
    if (action.origin !== location.origin) return;
    e.preventDefault();
    const data = new FormData(form);
    if (e.submitter?.name) data.append(e.submitter.name, e.submitter.value);
    cache.clear();  // pages fetched before this may belong to the old session
    const load = () => fetch(action.href, { method: "POST", body: data, credentials: "same-origin", headers: { Accept: "text/html" } })
      .then(async (r) => {
        if (!(r.headers.get("content-type") || "").includes("text/html")) throw new Error("not html");
        return { url: r.url, html: await r.text() };
      });
    const fallback = () => { form.dataset.reload = ""; HTMLFormElement.prototype.submit.call(form); };
    go(action.href, { load, fallback });
  });

  // prefetch on hover / touch / keyboard focus so the click feels instant
  const prefetch = (e) => {
    const a = e.target.closest?.("a[href]");
    if (eligible(a)) fetchPage(new URL(a.href, location.href).href).catch(() => {});
  };
  document.addEventListener("pointerover", prefetch, { passive: true });
  document.addEventListener("touchstart", prefetch, { passive: true });
  document.addEventListener("focusin", prefetch);

  initPage();
  if (location.hash) requestAnimationFrame(openHash);
})();
