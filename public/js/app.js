// The whole site runs in the browser: the router below picks a page from pages.js for
// each URL and swaps it into <main>, with a view transition when the browser has them.
import { CHALLENGES, CHAPTER_BY_ID, CHAPTER_BY_SLUG, MODULE_BY_ID } from "./course.js";
import { pages } from "./pages.js";
import { progress } from "./progress.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const canTransition = () => !!document.startViewTransition && !reducedMotion();

// ------------------------------------------------------------------ routes

// Old module URLs -> current module id.
const RENAMED_MODULES = { "linux-the-very-basics": "linux-basics" };
// Pages that are gone: the old 30-day course, paths, Pro plan and CLI setup, and the
// ranks, leaderboard, accounts and progress pages. Their links go to the chapters.
const OLD_LEARN = /^\/(course|pricing|setup|workspace|paths(\/.*)?|ranks|leaderboard|login|progress|u\/.*)$/;

// -> { redirect } or a page { nav, title, html }
function resolve(path) {
  path = path.replace(/\/index\.html$/, "/").replace(/(.)\/+$/, "$1");
  if (path === "/") return pages.home();
  if (path === "/learn") return pages.learn();
  if (OLD_LEARN.test(path)) return { redirect: "/learn" };
  const m = path.match(/^\/learn\/([^/]+)$/);
  if (m) {
    // modules and chapters share /learn/<id>
    const id = decodeURIComponent(m[1]);
    if (MODULE_BY_ID[id]) return pages.modulePage(MODULE_BY_ID[id]);
    if (RENAMED_MODULES[id]) return { redirect: `/learn/${RENAMED_MODULES[id]}` };
    if (CHAPTER_BY_ID[id]) return { redirect: CHAPTER_BY_ID[id].url };  // chapters used to live at /learn/<name>
    if (CHAPTER_BY_SLUG[id]) return pages.chapterPage(CHAPTER_BY_SLUG[id]);
  }
  return pages.notFound();
}

// Follows redirects. -> { page, url } where url is where the page really lives.
function route(url) {
  url = new URL(url, location.href);
  for (let i = 0; i < 5; i++) {
    const page = resolve(url.pathname);
    if (!page.redirect) return { page, url };
    const next = new URL(page.redirect, location.origin);
    if (!next.hash) next.hash = url.hash;
    url = next;
  }
  return { page: pages.notFound(), url };
}

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

// Chapter 0's Chapter -1 button: there's nothing before Chapter 0, so a click only changes its tooltip
document.addEventListener("click", (e) => {
  const b = e.target.closest(".sleepy"); if (!b) return;
  b.dataset.tip = "Looks like you really want it...";
});

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

// ------------------------------------------------------------------ chapters
// honor system: "I finished it" is all it takes
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-done]"); if (!btn) return;
  const slug = btn.dataset.done, done = btn.getAttribute("aria-pressed") !== "true";
  const chal = CHALLENGES[slug]; if (!chal) return;
  if (!progress.set(slug, done)) { snack("Couldn't save your progress: this browser is blocking storage."); return; }
  const d = btn.closest(".chal");
  d.classList.toggle("solved", done);
  d.classList.toggle("just-solved", done);
  $(".state .material-symbols-rounded", d).textContent = done ? "check" : "flag";
  btn.setAttribute("aria-pressed", String(done));
  btn.classList.toggle("tertiary", done); btn.classList.toggle("tonal", !done);
  $(".material-symbols-rounded", btn).textContent = done ? "task_alt" : "check";
  $(".done-label", btn).textContent = done ? "Finished" : "I finished it";
  const solved = progress.solved();
  const chapterDone = $("#chapter-done");
  if (chapterDone) chapterDone.hidden = !chal.chapter.challenges.every((c) => c.slug in solved);
  if (done) snack(`<span class="material-symbols-rounded">flag</span>Nice work: ${$(".title-m", d).textContent} done`);
});

// ------------------------------------------------------------------ "Stuck?" dialog
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-stuck]"); if (!b) return;
  const dlg = $("#stuck-dialog"); if (!dlg) return;
  const where = b.dataset.challenge || b.dataset.chapter;
  const text = `Stuck on: ${where}${b.dataset.challenge ? ` (${b.dataset.chapter})` : ""}\nWhat I'm trying to do: \nWhat I tried: \nWhat happened: `;
  $("#stuck-where").textContent = where;
  $("#stuck-template").textContent = text;
  $("#stuck-copy").dataset.copy = text;
  $("#stuck-video").href = b.dataset.video;
  $("#stuck-comment").href = b.dataset.video;
  $("#stuck-thumb").src = `https://i.ytimg.com/vi/${encodeURIComponent(b.dataset.videoId)}/hqdefault.jpg`;
  dlg.showModal();
});
document.addEventListener("click", (e) => {
  const dlg = e.target.closest?.("#stuck-dialog");
  if (dlg && e.target === dlg) {  // a click on the dialog box itself is padding; outside it is the backdrop
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  }
  const copy = e.target.closest("#stuck-copy");
  if (copy) {  // the snackbar sits under the dialog, so confirm on the button itself
    const label = copy.lastChild;
    label.textContent = "Copied";
    setTimeout(() => { label.textContent = "Copy"; }, 2000);
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
  rotTimer = setInterval(() => {
    if (document.hidden || !rot.isConnected) return;
    i = (i + 1) % words.length;
    const old = $(".rot-word", rot);
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
    next.animate([{ transform: "translateY(45%)", opacity: 0, filter: "blur(8px)" },
                  { transform: "none", opacity: 1, filter: "blur(0)" }],
                 { duration: 520, delay: 90, easing: "cubic-bezier(.38, 1.21, .22, 1)", fill: "backwards" });
    // back to natural width so the headline still reflows on resize
    setTimeout(() => { if (rot.isConnected) rot.style.width = ""; }, 700);
  }, 2600);
}

// ------------------------------------------------------------------ rendering a page

// Moves the active tab's indicator to the tab for `key` ("" for none).
function setActiveNav(navSel, indClass, key) {
  const links = $$(`${navSel} a`);
  const idx = links.findIndex((a) => a.dataset.nav === key);
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

function show(page) {
  document.title = page.title ? `${page.title} · pwnctual` : "pwnctual";
  setActiveNav(".navgroup", "nav-ind", page.nav);
  setActiveNav(".bottomnav", "bnav-ind", page.nav);
  $("main").innerHTML = page.html;
  startRotator();
  onScroll();
}

// ------------------------------------------------------------------ in-place navigation
// Internal links render the next page into <main> instead of loading a new
// document, so the header never re-renders and every navigation animates.

function eligible(a, e) {
  if (!a || !a.href || a.hasAttribute("download") || a.dataset.reload !== undefined) return false;
  if (a.target && a.target !== "_self") return false;
  if (e && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return false;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin) return false;
  if (/\.[a-z0-9]+$/i.test(u.pathname)) return false;  // a file, not a page
  return true;
}

// push: add a history entry (otherwise the current one is replaced)
function navigate(url, { push = true, scroll = null, animate = true } = {}) {
  const { page, url: target } = route(url);
  const swap = () => {
    if (push) {
      history.replaceState({ ...(history.state || {}), scroll: scrollY }, "");
      history.pushState({ scroll: 0 }, "", target.href);
    } else {
      history.replaceState(history.state, "", target.href);
    }
    show(page);
    shownPage = pageKey();
    if (!(location.hash && openHash())) scrollTo({ top: scroll ?? 0, behavior: "instant" });
  };
  if (!animate || !canTransition()) { swap(); $$(".vt-plain").forEach((el) => el.classList.remove("vt-plain")); return; }
  // An indicator that is about to disappear (going to a page with no tab,
  // like a 404) fades out with the header instead of lingering on its own layer.
  if (!page.nav) $$(".nav-ind, .bnav-ind").forEach((el) => el.classList.add("vt-plain"));
  const t = document.startViewTransition(swap);
  t.ready.catch(() => {});
  t.finished.finally(() => $$(".vt-plain").forEach((el) => el.classList.remove("vt-plain")));
}

history.scrollRestoration = "manual";
const pageKey = () => location.pathname + location.search;
let shownPage = null;
addEventListener("popstate", (e) => {
  if (pageKey() === shownPage) { openHash(); return; }  // hash-only history entry
  navigate(location.href, { push: false, scroll: e.state?.scroll ?? 0 });
});

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (e.defaultPrevented || !eligible(a, e)) return;
  const u = new URL(a.href, location.href);
  if (u.pathname === location.pathname && u.search === location.search && u.hash) return;  // same-page anchor
  e.preventDefault();
  navigate(u.href);
});

// ------------------------------------------------------------------ start
navigate(location.href, { push: false, scroll: 0, animate: false });
if (location.hash) requestAnimationFrame(openHash);
