// The course structure and the reader's progress. Every page under /learn is built from this.
// To add a chapter, module or lesson, add it here (a lesson also needs its page).
const COURSE = [
  {
    id: "chapter-1",
    title: "Introduction to computer science",
    description: "Teaches how a computer works, C & Python.",
    modules: [
      {
        id: "binary-and-data-representation",
        title: "Binary & data representation",
        lessons: [
          {
            id: "reading-the-computers-language",
            title: "Reading the computer's language",
            challenge: {
              command: "docker run --rm -it ghcr.io/pwnctual/reading-the-computers-language",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/reading-the-computers-language",
              flagHash: "fcb17f702f3271783e441b2d6f67bdec42b7cbbd4657abb981f39bb41878e009", // SHA-256 of the flag
            },
          },
          {
            id: "writing-the-computers-language",
            title: "Writing the computer's language",
            challenge: {
              command: "docker run --rm -it ghcr.io/pwnctual/writing-the-computers-language",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/writing-the-computers-language",
              flagHash: "3270c971f083d1775a3167dcd7b04ff711c4e299e780ce5af00e871bdaa2a5eb", // SHA-256 of the flag
            },
          },
          {
            id: "how-is-binary-used",
            title: "How data is represented",
          },
        ],
      },
      {
        id: "computational-thinking",
        title: "Computational thinking",
        lessons: [
          {
            id: "thinking-like-a-computer",
            title: "Thinking like a computer",
          },
          {
            id: "algorithms",
            title: "Algorithms",
          },
        ],
      },
    ],
  },
];

const KEY = "pwnctual:done";
const loadDone = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
};
const saveDone = (set) => {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
};
let done = loadDone();

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

function bar(pct, cls = "") {
  return h("div", { class: `progress ${cls}`.trim() },
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

function head(eyebrow, title) {
  return h("header", { class: "page-head" },
    eyebrow && h("p", { class: "eyebrow" }, eyebrow),
    h("h1", null, title));
}

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Chapter: the big banner. A link on /learn, the page header on its own page.
function chapterBanner(c, i, asLink) {
  const lessons = chapterLessons(c);
  return h(asLink ? "a" : "div", { class: "chapter", href: asLink ? chapterUrl(c) : null },
    h("span", { class: "chapter-no", "aria-hidden": "true" }, String(i + 1).padStart(2, "0")),
    h("div", { class: "chapter-body" },
      h("p", { class: "eyebrow" }, `Chapter ${i + 1}`),
      h(asLink ? "h2" : "h1", null, c.title),
      c.description && h("p", { class: "chapter-desc" }, c.description),
      h("p", { class: "meta" }, `${count(c.modules.length, "module")} · ${count(lessons.length, "lesson")}`),
      bar(percent(lessons))));
}

// Module: a panel that holds its lessons
function modulePanel(c, m, i, asLink, eyebrow = `Module ${i + 1}`) {
  return h("section", { class: "module" },
    h("header", { class: "module-head" },
      h("div", { class: "module-title" },
        h("p", { class: "eyebrow" }, eyebrow),
        h(asLink ? "h2" : "h1", null, asLink ? h("a", { href: moduleUrl(c, m) }, m.title) : m.title)),
      bar(percent(moduleLessons(c, m)), "small")),
    h("ol", { class: "lessons" }, m.lessons.map((l, j) => lessonRow(c, m, l, i, j))));
}

// Lesson: a slim row
function lessonRow(c, m, l, i, j) {
  const isDone = done.has(lessonKey(c, m, l));
  return h("li", null,
    h("a", { class: "lesson-row", href: lessonUrl(c, m, l) },
      h("span", { class: `status${isDone ? " done" : ""}`, role: "img", "aria-label": isDone ? "Completed" : "Not completed" },
        isDone ? "✓" : ""),
      h("span", { class: "lesson-no" }, `${i + 1}.${j + 1}`),
      h("span", { class: "lesson-name" }, l.title),
      h("span", { class: "go", "aria-hidden": "true" }, "→")));
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
    headEl.replaceChildren(
      head(null, "Chapters"),
      h("div", { class: "overall" }, h("span", { class: "overall-label" }, "Overall"), bar(percent(allLessons))));
    list.replaceChildren(h("div", { class: "chapters" }, COURSE.map((c, i) => chapterBanner(c, i, true))));
  } else if (d.page === "chapter") {
    top.replaceChildren(topbar("/learn", [["Home", "/"], ["Learn", "/learn"], [chapter.title]]));
    headEl.replaceChildren(chapterBanner(chapter, ci, false));
    list.replaceChildren(h("div", { class: "modules" }, chapter.modules.map((m, i) => modulePanel(chapter, m, i, true))));
  } else if (d.page === "module") {
    top.replaceChildren(topbar(chapterUrl(chapter), [["Home", "/"], ["Learn", "/learn"], [chapter.title, chapterUrl(chapter)], [mod.title]]));
    headEl.replaceChildren();
    list.replaceChildren(h("div", { class: "modules" }, modulePanel(chapter, mod, mi, false, `Chapter ${ci + 1} · Module ${mi + 1}`)));
  } else if (d.page === "lesson") {
    top.replaceChildren(topbar(moduleUrl(chapter, mod), [["Home", "/"], ["Learn", "/learn"], [chapter.title, chapterUrl(chapter)], [mod.title, moduleUrl(chapter, mod)], [lesson.title]]));
    headEl.replaceChildren(head(`Chapter ${ci + 1} · Module ${mi + 1} · Lesson ${li + 1}`, lesson.title));

    const key = lessonKey(chapter, mod, lesson);
    const toggle = h("button", { class: "complete", type: "button" });
    const paint = () => {
      const isDone = done.has(key);
      toggle.classList.toggle("done", isDone);
      toggle.setAttribute("aria-pressed", isDone);
      toggle.textContent = isDone ? "✓ Completed" : "Mark as complete";
    };
    toggle.addEventListener("click", () => {
      done = loadDone();
      done.has(key) ? done.delete(key) : done.add(key);
      saveDone(done);
      paint();
    });
    paint();

    let action = h("div", { class: "complete-row" }, toggle);
    if (lesson.challenge) {
      const input = h("input", { class: "flag-input", type: "text", name: "flag", placeholder: "pwnctual{...}", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Flag" });
      const msg = h("p", { class: "flag-msg", "aria-live": "polite" });
      const form = h("form", { class: "flag-form" }, input, h("button", { class: "button", type: "submit" }, "Submit"));
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const bytes = new TextEncoder().encode(input.value.trim());
        const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (hex === lesson.challenge.flagHash) {
          done = loadDone();
          done.add(key);
          saveDone(done);
          paint();
          msg.textContent = "";
          form.hidden = true;
          toggle.hidden = false;
        } else {
          msg.textContent = "Wrong flag";
        }
      });
      if (done.has(key)) form.hidden = true;
      toggle.disabled = true;
      toggle.classList.add("static");
      action = h("div", { class: "challenge" },
        commandGroup(lesson.challenge.command, "This installs the challenge files on your computer."),
        commandGroup(lesson.challenge.leave, "This exits the challenge, so you can run the next command."),
        commandGroup(lesson.challenge.cleanup, "This deletes the challenge files from your computer. Run this after finishing the challenge to save up space."),
        form, msg, toggle);
      toggle.hidden = !done.has(key);
    }

    const at = allLessons.findIndex((x) => x.l === lesson);
    const side = (item, label, cls) => item
      ? h("a", { class: `lesson-nav-btn ${cls}`, href: lessonUrl(item.c, item.m, item.l) },
          h("span", { class: "dir" }, label), h("span", { class: "to" }, item.l.title))
      : h("span", { class: `lesson-nav-btn ${cls}`, "aria-disabled": "true" }, h("span", { class: "dir" }, label));
    list.replaceChildren(
      action,
      h("nav", { class: "lesson-nav", "aria-label": "Lessons" },
        side(allLessons[at - 1], "Previous", "prev"),
        side(allLessons[at + 1], "Next", "next")));
  }
}

render();
// Progress can change in another tab
window.addEventListener("storage", (e) => {
  if (e.key === KEY) { done = loadDone(); render(); }
});
