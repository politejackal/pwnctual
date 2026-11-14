// Builds every page under /learn from the course data, plus the reader's progress.
import { COURSE } from "./course-data.js";
import { account, saveProgress, submitFlag } from "./account.js";

const KEY = "pwnctual:done";
const loadDone = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
};
const saveDone = (set) => {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
};
let done = loadDone();
let signedIn = false;

// Lessons that were renamed: carry saved progress over to the new id
const RENAMED = {
  "chapter-1/computational-thinking/the-computers-language": "chapter-1/binary-and-data-representation/reading-the-computers-language",
  "chapter-1/computational-thinking/the-computers-language-part-2": "chapter-1/binary-and-data-representation/writing-the-computers-language",
  "chapter-1/computational-thinking/reading-the-computers-language": "chapter-1/binary-and-data-representation/reading-the-computers-language",
  "chapter-1/computational-thinking/writing-the-computers-language": "chapter-1/binary-and-data-representation/writing-the-computers-language",
  "chapter-1/computational-thinking/how-is-binary-used": "chapter-1/binary-and-data-representation/how-is-binary-used",
};
for (const [from, to] of Object.entries(RENAMED)) {
  if (done.has(from)) { done.delete(from); done.add(to); saveDone(done); }
}

const chapterUrl = (c) => `/learn/${c.id}`;
const moduleUrl = (c, m) => `/learn/${c.id}/${m.id}`;
const lessonUrl = (c, m, l) => `/learn/${c.id}/${m.id}/${l.id}`;
const lessonKey = (c, m, l) => `${c.id}/${m.id}/${l.id}`;

// Every lesson in course order, for percentages and previous / next
const allLessons = COURSE.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => ({ c, m, l }))));
const percent = (items) => {
  if (!items.length) return 0;
  return Math.round((items.filter((x) => done.has(lessonKey(x.c, x.m, x.l))).length / items.length) * 100);
};
const moduleLessons = (c, m) => allLessons.filter((x) => x.m === m);
const chapterLessons = (c) => allLessons.filter((x) => x.c === c);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid);
  }
  return el;
}

// Small line icons: a page for reading lessons, a flag for lessons with a challenge
const ICONS = {
  page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
};
const icon = (name, cls = "icon") => {
  const el = h("span", { class: cls, "aria-hidden": "true" });
  el.innerHTML = ICONS[name];
  return el;
};

function bar(pct) {
  return h("div", { class: "progress" },
    h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct },
      h("span", { style: `width:${pct}%` })),
    h("span", { class: "pct" }, `${pct}%`));
}

function topbar(backHref, crumbs) {
  return h("nav", { class: "topbar", "aria-label": "Breadcrumb" },
    h("a", { class: "back", href: backHref }, h("span", { "aria-hidden": "true" }, "←"), " Back"),
    h("ol", { class: "crumbs" },
      crumbs.map(([label, href]) =>
        h("li", href ? null : { "aria-current": "page" }, href ? h("a", { href }, label) : label))));
}

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The title block at the top of /learn, a chapter and a module
function hero(eyebrow, title, desc, meta, pct) {
  return h("header", { class: "hero" },
    eyebrow && h("p", { class: "eyebrow" }, eyebrow),
    h("h1", null, title),
    desc && h("p", { class: "desc" }, desc),
    h("div", { class: "stats" }, meta && h("p", { class: "meta" }, meta), bar(pct)));
}

function chapterCard(c, i, big) {
  const lessons = chapterLessons(c);
  return h("a", { class: `card${big ? " big" : ""}`, href: chapterUrl(c) },
    h("p", { class: "eyebrow" }, `Chapter ${i + 1}`),
    h("h2", null, c.title),
    c.description && h("p", null, c.description),
    h("div", { class: "foot" },
      h("p", { class: "meta" }, `${count(c.modules.length, "module")} · ${count(lessons.length, "lesson")}`),
      bar(percent(lessons))));
}

function moduleCard(c, m, i) {
  return h("a", { class: "card", href: moduleUrl(c, m) },
    h("span", { class: "num" }, String(i + 1).padStart(2, "0")),
    h("p", { class: "eyebrow" }, `Module ${i + 1}`),
    h("h3", null, m.title),
    h("div", { class: "foot" },
      h("p", { class: "meta" }, count(m.lessons.length, "lesson")),
      bar(percent(moduleLessons(c, m)))));
}

function commandBox(command) {
  const copy = h("button", { class: "copy", type: "button" }, "Copy");
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(command); copy.textContent = "Copied"; } catch { copy.textContent = "Copy"; }
    setTimeout(() => (copy.textContent = "Copy"), 1500);
  });
  return h("div", { class: "command" }, h("code", null, command), copy);
}

function commandGroup(command, note) {
  return h("div", { class: "cmd-group" }, commandBox(command), h("p", { class: "cmd-note" }, note));
}

// A challenge description paragraph: text in `backticks` shows as code
function descParagraph(text) {
  return h("p", { class: "challenge-desc" }, text.split("`").map((part, i) => (i % 2 ? h("code", null, part) : part)));
}

// The challenge box (or the "Mark as complete" button) under a lesson
function lessonActions(c, m, l, onChange) {
  const key = lessonKey(c, m, l);
  const toggle = h("button", { class: "complete", type: "button" });
  const paint = () => {
    const isDone = done.has(key);
    toggle.classList.toggle("done", isDone);
    toggle.setAttribute("aria-pressed", isDone);
    toggle.textContent = isDone ? "✓ Completed" : "Mark as complete";
  };
  const changed = () => { paint(); onChange && onChange(); };
  paint();

  if (!l.challenge) {
    toggle.addEventListener("click", async () => {
      done = loadDone();
      const on = !done.has(key);
      on ? done.add(key) : done.delete(key);
      saveDone(done);
      changed();
      if (!signedIn) return;
      try {
        await saveProgress(on ? [key] : [], on ? [] : [key]);
      } catch {
        // Not saved on the server: put it back the way it was
        done = loadDone();
        on ? done.delete(key) : done.add(key);
        saveDone(done);
        changed();
      }
    });
    return h("div", { class: "complete-row" }, toggle);
  }

  const input = h("input", { class: "flag-input", type: "text", name: "flag", placeholder: "pwnctual{...}", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Flag" });
  const msg = h("p", { class: "flag-msg", "aria-live": "polite" });
  const form = h("form", { class: "flag-form" }, input, h("button", { class: "button", type: "submit" }, "Submit"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let correct;
    if (signedIn) {
      try { correct = await submitFlag(key, input.value); } catch { msg.textContent = "Couldn't check the flag, try again"; return; }
    } else {
      const bytes = new TextEncoder().encode(input.value.trim());
      const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
      correct = hex === l.challenge.flagHash;
    }
    if (correct) {
      done = loadDone();
      done.add(key);
      saveDone(done);
      msg.textContent = "";
      form.hidden = true;
      toggle.hidden = false;
      changed();
    } else {
      msg.textContent = "Wrong flag";
    }
  });
  form.hidden = done.has(key);
  toggle.hidden = !done.has(key);
  toggle.disabled = true;
  toggle.classList.add("static");
  const title = h("p", { class: "challenge-title" }, icon("flag", "flag-icon"), "Challenge");
  return h("div", { class: "challenge" },
    title,
    [].concat(l.challenge.description || []).map(descParagraph),
    commandGroup(l.challenge.command, "This installs the challenge files on your computer."),
    commandGroup(l.challenge.leave, "This exits the challenge, so you can run the next command."),
    commandGroup(l.challenge.cleanup, "This deletes the challenge files from your computer. Run this after finishing the challenge to save up space."),
    form, msg, toggle);
}

// Lesson text lives in each lesson's own page; the module page pulls it in
const lessonText = new Map();
async function loadLessonText(c, m, l) {
  const url = lessonUrl(c, m, l);
  if (!lessonText.has(url)) {
    lessonText.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then((html) => new DOMParser().parseFromString(html, "text/html").querySelector("main")));
  }
  const main = await lessonText.get(url);
  return document.importNode(main, true);
}

// One lesson on the module page: a row that opens in place
function lessonItem(c, m, l, i, j, onChange) {
  const key = lessonKey(c, m, l);
  const status = h("span", { class: "status" });
  const li = h("li", { class: "item", id: l.id });
  const paint = () => {
    const isDone = done.has(key);
    li.classList.toggle("done", isDone);
    status.classList.toggle("done", isDone);
    status.textContent = isDone ? (l.challenge ? "Solved" : "Completed") : "";
  };
  paint();
  const body = h("div", { class: "item-body", id: `${l.id}-body`, hidden: true });
  const head = h("button", { class: "item-head", type: "button", "aria-expanded": "false", "aria-controls": `${l.id}-body` },
    icon(l.challenge ? "flag" : "page"),
    h("span", { class: "item-name" }, l.title),
    h("span", { class: "item-no" }, `${i + 1}.${j + 1}`),
    status,
    icon("chev", "chev"));

  let filled = false;
  const fill = async () => {
    if (filled) return;
    filled = true;
    body.replaceChildren(h("p", { class: "loading" }, "Loading…"));
    let text;
    try { text = await loadLessonText(c, m, l); } catch { text = null; }
    body.replaceChildren(
      text || h("p", { class: "loading" }, "Couldn't load this lesson."),
      lessonActions(c, m, l, () => { paint(); onChange(); }),
      h("a", { class: "open-page", href: lessonUrl(c, m, l) }, "Open as a page →"));
  };
  li.open = (on, scroll) => {
    li.classList.toggle("open", on);
    head.setAttribute("aria-expanded", on);
    body.hidden = !on;
    if (on) {
      fill();
      history.replaceState(null, "", `#${l.id}`);
      if (scroll) li.scrollIntoView({ block: "start" });
    }
  };
  head.addEventListener("click", () => {
    const on = !li.classList.contains("open");
    if (on) li.parentElement.querySelectorAll(".item.open").forEach((x) => x !== li && x.open(false));
    else history.replaceState(null, "", location.pathname);
    li.open(on);
  });
  li.paint = paint;
  li.append(head, body);
  return li;
}

function render() {
  const d = document.body.dataset;
  const top = document.getElementById("top");
  const headEl = document.getElementById("head");
  const list = document.getElementById("list");
  const chapter = COURSE.find((c) => c.id === d.chapter);
  const mod = chapter && chapter.modules.find((m) => m.id === d.module);
  const lesson = mod && mod.lessons.find((l) => l.id === d.lesson);
  const ci = chapter ? COURSE.indexOf(chapter) : -1;
  const mi = mod ? chapter.modules.indexOf(mod) : -1;
  const li = lesson ? mod.lessons.indexOf(lesson) : -1;

  if (d.page === "learn") {
    top.replaceChildren(topbar("/", [["Home", "/"], ["Learn"]]));
    headEl.replaceChildren(hero(null, "Chapters", null, `${count(COURSE.length, "chapter")} · ${count(allLessons.length, "lesson")}`, percent(allLessons)));
    list.replaceChildren(h("div", { class: "grid" }, COURSE.map((c, i) => chapterCard(c, i, COURSE.length === 1))));
  } else if (d.page === "chapter") {
    const lessons = chapterLessons(chapter);
    top.replaceChildren(topbar("/learn", [["Home", "/"], ["Learn", "/learn"], [chapter.title]]));
    headEl.replaceChildren(hero(`Chapter ${ci + 1}`, chapter.title, chapter.description,
      `${count(chapter.modules.length, "module")} · ${count(lessons.length, "lesson")}`, percent(lessons)));
    list.replaceChildren(
      h("h2", { class: "section-title" }, "Modules"),
      h("div", { class: "grid" }, chapter.modules.map((m, i) => moduleCard(chapter, m, i))));
  } else if (d.page === "module") {
    top.replaceChildren(topbar(chapterUrl(chapter), [["Home", "/"], ["Learn", "/learn"], [chapter.title, chapterUrl(chapter)], [mod.title]]));
    const paintHead = () => headEl.replaceChildren(hero(`Chapter ${ci + 1} · Module ${mi + 1}`, mod.title, null,
      count(mod.lessons.length, "lesson"), percent(moduleLessons(chapter, mod))));
    paintHead();
    const items = mod.lessons.map((l, j) => lessonItem(chapter, mod, l, mi, j, paintHead));
    list.replaceChildren(h("h2", { class: "section-title" }, "Lessons"), h("ol", { class: "items" }, items));
    const want = items.find((x) => `#${x.id}` === location.hash);
    if (want) want.open(true, true);
    // Progress changed in another tab: repaint without closing what's open
    refresh = () => { paintHead(); items.forEach((x) => x.paint()); };
  } else if (d.page === "lesson") {
    top.replaceChildren(topbar(moduleUrl(chapter, mod), [["Home", "/"], ["Learn", "/learn"], [chapter.title, chapterUrl(chapter)], [mod.title, moduleUrl(chapter, mod)], [lesson.title]]));
    headEl.replaceChildren(h("header", { class: "page-head" },
      h("p", { class: "eyebrow" }, `Chapter ${ci + 1} · Module ${mi + 1} · Lesson ${li + 1}`),
      h("h1", null, lesson.title)));

    const at = allLessons.findIndex((x) => x.l === lesson);
    const side = (item, label, cls) => item
      ? h("a", { class: `lesson-nav-btn ${cls}`, href: lessonUrl(item.c, item.m, item.l) },
          h("span", { class: "dir" }, label), h("span", { class: "to" }, item.l.title))
      : h("span", { class: `lesson-nav-btn ${cls}`, "aria-disabled": "true" }, h("span", { class: "dir" }, label));
    list.replaceChildren(
      lessonActions(chapter, mod, lesson),
      h("nav", { class: "lesson-nav", "aria-label": "Lessons" },
        side(allLessons[at - 1], "Previous", "prev"),
        side(allLessons[at + 1], "Next", "next")));
  }
}

let refresh = render;
render();

// Signed in: progress lives on the server. The first time someone signs in on a browser,
// the lessons they finished there before signing in are brought over to their account.
// Challenges aren't: on the server they only count with the right flag.
const OWNER = "pwnctual:user";
account.then(async (a) => {
  if (!a) return;
  signedIn = true;
  let list = a.done;
  let owner = null;
  try { owner = localStorage.getItem(OWNER); } catch {}
  if (owner !== a.user.login) {
    const server = new Set(a.done);
    const missing = [...loadDone()].filter((k) => !server.has(k));
    try {
      if (missing.length) list = (await saveProgress(missing, [])).done;
      localStorage.setItem(OWNER, a.user.login);
    } catch {}
  }
  done = new Set(list);
  saveDone(done);
  refresh();
});
// Progress can change in another tab
window.addEventListener("storage", (e) => {
  if (e.key === KEY) { done = loadDone(); refresh(); }
});
