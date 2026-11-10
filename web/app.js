// pwnctual frontend: a small router and a few pages. Everything is static:
// lessons come from /lessons/ (built by scripts/build.mjs), and progress is
// kept in this browser's localStorage.

const SITE = { name: "C for hackers",
  blurb: "Learn C completely from a hacker's perspective. No prior knowledge needed at all." };

const app = document.getElementById("app");

// ---- progress (localStorage can be unavailable, e.g. some private windows) ----
const SOLVED_KEY = "pwnctual:solved";
function solvedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY)) ?? []); } catch { return new Set(); }
}
function setSolved(id, solved) {
  const set = solvedSet();
  solved ? set.add(id) : set.delete(id);
  try { localStorage.setItem(SOLVED_KEY, JSON.stringify([...set])); return true; } catch { return false; }
}

// ---- data ----
async function getJson(path) {
  const res = await fetch(path);
  // Unknown paths get index.html (for client-side routing), so treat non-JSON as missing
  const isJson = res.headers.get("content-type")?.includes("json");
  if (!res.ok || !isJson) {
    const status = res.ok ? 404 : res.status;
    throw Object.assign(new Error(`${path} returned ${status}`), { status });
  }
  return res.json();
}
let chaptersCache = null;
const getChapters = async () => (chaptersCache ??= await getJson("/lessons/chapters.json"));
const topicCount = chapters => chapters.reduce((n, c) => n + c.topics.length, 0);
// Completed topics are kept in the solved list under "lesson:<id>"
const topicKey = id => `lesson:${id}`;
const topicsDone = (chapters, solved) =>
  chapters.reduce((n, c) => n + c.topics.filter(t => solved.has(topicKey(t.id))).length, 0);
const topicsChip = (done, total) =>
  `<span class="chip${total && done === total ? " ok" : ""}">${done} of ${plural(total, "topic")} completed</span>`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ---- helpers ----
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function setTitle(t) {
  document.title = t ? `${t} · pwnctual` : "pwnctual: C for hackers";
  // Keep the canonical link on the page being shown
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", `https://pwnctual.com${location.pathname.replace(/\/+$/, "") || "/"}`);
}

// Every page is a centered header followed by cards, in the same column
function page(header, body = "") {
  return `<div class="page">${header}${body}</div>`;
}
function header({ above = "", title, lead = "", below = "" }) {
  return `<header class="page-header">
    ${above}
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ""}
    ${below}
  </header>`;
}

function errorBox(err) {
  return `<div class="card empty">Couldn't load this page (${esc(err.message)}). Try again in a moment.</div>`;
}
function loading(text) {
  return page(header({ title: "&nbsp;", below: `<div class="running"><span class="spinner"></span>${text}</div>` }));
}

// ---- pages ----
async function homePage() {
  setTitle("");
  const head = chip => header({
    above: `<div class="chips"><span class="chip">Free and open source</span>${chip}</div>`,
    title: SITE.name, lead: SITE.blurb });
  app.innerHTML = page(head(""));
  try {
    const chapters = await getChapters();
    const solved = solvedSet();
    app.innerHTML = page(head(topicsChip(topicsDone(chapters, solved), topicCount(chapters))),
      chapters.map((c, i) => chapterBlock(c, solved, chapters.slice(0, i).reduce((n, p) => n + p.topics.length, 0))).join(""));
  } catch (err) {
    app.innerHTML = page(head(""), errorBox(err));
  }
}

// A chapter of the C for hackers path: a header card joined to its topics.
// Topic numbers run on across chapters, so before is the count of topics in earlier chapters
function chapterBlock(c, solved, before) {
  return `<section class="chapter" aria-label="Chapter ${c.number}">
    <div class="card chapter-head">
      <span class="eyebrow">Chapter ${c.number}</span>
      <h2>${esc(c.title)}</h2>
    </div>
    <nav class="list">${c.topics.map((t, j) => {
      const isDone = solved.has(topicKey(t.id));
      return `<a class="list-item ${isDone ? "solved" : ""}" href="/learn/${esc(t.id)}" data-link>
      <span class="num">${isDone ? '<span class="icon">check</span>' : esc(t.id.replace("-", "."))}</span>
      <span><span class="title">${esc(t.title)}</span><span class="meta">Topic ${before + j + 1}${isDone ? " · Completed" : ""}</span></span>
      <span class="icon go">chevron_right</span>
    </a>`;
    }).join("")}</nav>
  </section>`;
}

async function lessonPage(id) {
  const p = { name: SITE.name, url: "/" };
  setTitle("");
  // A ready-made topic page already shows the lesson, so keep it on screen while loading
  if ("prerendered" in app.dataset) delete app.dataset.prerendered;
  else app.innerHTML = loading("Loading lesson");
  let chapters;
  try { chapters = await getChapters(); } catch (err) {
    app.innerHTML = page(header({ title: "Something went wrong" }), errorBox(err));
    return;
  }
  // Every topic in order, so the page can link to the previous and next one
  const all = chapters.flatMap(c => c.topics.map(t => ({ ...t, chapter: c })));
  const i = all.findIndex(t => t.id === id);
  if (i < 0) {
    app.innerHTML = page(header({ title: "No such lesson", below: `<div class="actions"><a class="btn btn-tonal" href="${p.url}" data-link>${p.name}</a></div>` }));
    return;
  }
  const topic = all[i], prev = all[i - 1], next = all[i + 1];
  let body;
  try {
    const res = await fetch(`/lessons/${topic.file}`);
    if (!res.ok) throw new Error(`/lessons/${topic.file} returned ${res.status}`);
    body = await res.text();
  } catch (err) {
    body = errorBox(err);
  }
  const num = topic.id.replace("-", ".");
  setTitle(`${num} ${topic.title}`);
  const navLink = (t, dir) => `<a class="card lesson-nav ${dir}" href="/learn/${esc(t.id)}" data-link>
      <span class="meta">${dir === "prev" ? "Previous" : "Next"}</span>
      <span class="title">${esc(t.id.replace("-", "."))} ${esc(t.title)}</span>
    </a>`;
  app.innerHTML = page(
    header({
      above: `<div class="chips">
        <a class="chip" href="${p.url}" data-link><span class="icon">arrow_back</span>${p.name}</a>
        <span class="chip">Chapter ${topic.chapter.number}: ${esc(topic.chapter.title)}</span>
      </div>`,
      title: `<span class="topic-num">${num}</span> ${esc(topic.title)}`,
    }),
    // A lesson can mark where its challenge goes with <div class="challenge-slot"></div>;
    // without one, the challenge comes after the whole lesson
    `${body.split(CHALLENGE_SLOT).map(part => `<article class="lesson">${part}</article>`)
      .join(topic.challenge ? CHALLENGE_CARD : "")}
    ${topic.challenge && !body.includes(CHALLENGE_SLOT) ? CHALLENGE_CARD : ""}
    ${topic.challenge ? "" : MARK_CARD}
    <nav class="lesson-navs" aria-label="Topics">
      ${prev ? navLink(prev, "prev") : "<span></span>"}
      ${next ? navLink(next, "next") : `<a class="card lesson-nav next" href="${p.url}" data-link><span class="meta">Next</span><span class="title">More topics are on the way</span></a>`}
    </nav>`
  );
  app.querySelectorAll(".bits.toggle").forEach(startBits);
  app.querySelectorAll(".points").forEach(startPoints);
  app.querySelectorAll(".stack-play").forEach(startStackPlay);
  if (topic.challenge) startChallenge(app.querySelector(".challenge"), CHALLENGES[topic.challenge], topicKey(topic.id));
  else startMark(app.querySelector(".mark"), topicKey(topic.id));
}

// ---- end-of-topic challenges ----
// Answer a few questions in a row. One wrong answer starts it again with new questions.
// make() returns the questions; each has html, a prompt, an inputmode, check(answer) and the right answer.
const bin8 = n => n.toString(2).padStart(8, "0");
const hex2 = n => n.toString(16).toUpperCase().padStart(2, "0");
const showByte = n => `<div class="byte" aria-label="${bin8(n)}">${[...bin8(n)].map(b => `<span class="bit">${b}</span>`).join("")}</div>`;
const showHex = n => `<div class="hex-q"><code>0x${hex2(n)}</code></div>`;
const showDec = n => `<div class="hex-q dec"><code>${n}</code></div>`;
const randomBytes = count => {
  const set = new Set();
  while (set.size < count) set.add(Math.floor(Math.random() * 256));
  return [...set];
};
// Answers are compared loosely: any case, spaces ignored, 0x optional for hex
const clean = a => a.replace(/\s+/g, "").toLowerCase();
const QUESTION = {
  binToDec: n => ({ html: showByte(n), prompt: "What is this byte in decimal?", mode: "numeric",
    check: a => /^\d+$/.test(clean(a)) && Number(clean(a)) === n, answer: `<code>${bin8(n)}</code> is ${n}` }),
  binToHex: n => ({ html: showByte(n), prompt: "What is this byte in hex?", mode: "text",
    check: a => /^(0x)?[0-9a-f]{1,2}$/.test(clean(a)) && parseInt(clean(a).replace(/^0x/, ""), 16) === n,
    answer: `<code>${bin8(n)}</code> is <code>0x${hex2(n)}</code>` }),
  hexToBin: n => ({ html: showHex(n), prompt: "What is this byte in binary? Write all 8 bits.", mode: "numeric",
    check: a => clean(a) === bin8(n), answer: `<code>0x${hex2(n)}</code> is <code>${bin8(n)}</code>` }),
  decToBin: n => ({ html: showDec(n), prompt: "What is this number in binary? Write all 8 bits.", mode: "numeric",
    check: a => clean(a) === bin8(n), answer: `${n} is <code>${bin8(n)}</code>` }),
  decToHex: n => ({ html: showDec(n), prompt: "What is this number in hex?", mode: "text",
    check: a => /^(0x)?[0-9a-f]{1,2}$/.test(clean(a)) && parseInt(clean(a).replace(/^0x/, ""), 16) === n,
    answer: `${n} is <code>0x${hex2(n)}</code>` }),
  hexToDec: n => ({ html: showHex(n), prompt: "What is this byte in decimal?", mode: "numeric",
    check: a => /^\d+$/.test(clean(a)) && Number(clean(a)) === n, answer: `<code>0x${hex2(n)}</code> is ${n}` }),
  // bytes is a value, most significant byte first. Answers can be written ef be ad de, efbeadde, 0xefbeadde, ef | be | ad | de or \xef\xbe\xad\xde
  littleEndian: bytes => {
    const stored = [...bytes].reverse().map(hex2).join(" ").toLowerCase();
    const value = `0x${bytes.map(hex2).join("").toLowerCase()}`;
    return { html: `<div class="hex-q wide"><code>${value}</code></div>`,
      prompt: `How is this value stored in memory on a little endian CPU? Write all ${bytes.length} bytes.`, mode: "text",
      check: a => clean(a).replace(/\||,|\\x|0x/g, "") === stored.replace(/ /g, ""),
      answer: `<code>${value}</code> is stored as <code>${stored}</code>` };
  },
  // bytes is RAX, most significant byte first. One answer box each for EAX, AX and AL
  subRegisters: bytes => {
    const hex = bs => `0x${bs.map(hex2).join("").toLowerCase()}`;
    const parts = [["EAX", bytes.slice(4)], ["AX", bytes.slice(6)], ["AL", bytes.slice(7)]];
    const same = (a, bs) => /^(0x)?[0-9a-f]+$/.test(clean(a)) && parseInt(clean(a).replace(/^0x/, ""), 16) === parseInt(hex(bs), 16);
    return { html: `<div class="hex-q wide"><code>${hex(bytes)}</code></div>`,
      prompt: "If RAX holds this value, what exact value is inside EAX (32-bit), AX (16-bit), and AL (8-bit)?", mode: "text",
      fields: parts.map(([name]) => name),
      check: answers => parts.every(([, bs], i) => same(answers[i], bs)),
      answer: `RAX <code>${hex(bytes)}</code> has ${parts.map(([name, bs]) => `${name} <code>${hex(bs)}</code>`).join(", ")}` };
  },
};

const CHALLENGES = {
  "binary-to-decimal": {
    title: "Convert 3 bytes in a row",
    intro: "Convert each byte from binary to decimal. Get one wrong and it starts again with new bytes.",
    make: () => randomBytes(3).map(QUESTION.binToDec),
  },
  "hex-mix": {
    title: "Convert 2 bytes in a row",
    intro: "Convert each byte from hex to decimal. Get one wrong and it starts again with new bytes.",
    make: () => randomBytes(2).map(QUESTION.hexToDec),
  },
  "little-endian": {
    title: "Convert 2 values in a row",
    intro: "Write each 8-byte value the way a little endian CPU stores it in memory. Get one wrong and it starts again with new values.",
    make: () => [0, 1].map(() => QUESTION.littleEndian(randomBytes(8))),
  },
  "register-anatomy": {
    title: "Register anatomy",
    intro: "Find what is inside EAX, AX and AL for 2 values of RAX in a row. Get one wrong and it starts again with new values.",
    make: () => [0, 1].map(() => QUESTION.subRegisters([0x00, 0x00, 0x7f, 0xff, ...randomBytes(4)])),
  },
};

const CHALLENGE_SLOT = '<div class="challenge-slot"></div>';
const CHALLENGE_CARD = `<section class="card challenge" aria-label="Challenge">
  <span class="eyebrow"><span class="icon fill">bolt</span>Challenge</span>
  <h2></h2>
  <p class="intro"></p>
  <div class="rounds" aria-hidden="true"></div>
  <form class="challenge-form" autocomplete="off">
    <div class="question"></div>
    <label class="prompt" for="challenge-answer"></label>
    <div class="fields" hidden></div>
    <div class="flag-row">
      <input id="challenge-answer" type="text" spellcheck="false" autocapitalize="off" required>
      <button class="btn btn-filled" type="submit"><span class="icon">check</span>Check</button>
    </div>
  </form>
  <p class="challenge-msg" aria-live="polite"></p>
  <div class="actions again" hidden><button class="btn btn-tonal" type="button"><span class="icon">replay</span>Practice again</button></div>
</section>`;

function startChallenge(card, c, key) {
  const form = card.querySelector("form");
  const input = card.querySelector("input");
  const fields = card.querySelector(".fields");
  const msg = card.querySelector(".challenge-msg");
  const again = card.querySelector(".again");
  card.querySelector("h2").textContent = c.title;
  card.querySelector(".intro").textContent = c.intro;
  let questions, round;

  const showRound = () => {
    const q = questions[round];
    card.querySelector(".rounds").innerHTML = questions
      .map((_, i) => `<span class="${i < round ? "done" : i === round ? "now" : ""}"></span>`).join("");
    card.querySelector(".question").innerHTML = q.html;
    card.querySelector(".prompt").textContent = q.prompt;
    input.inputMode = q.mode;
    input.value = "";
    // A question with several answers gets a labeled box for each, in place of the single box
    fields.innerHTML = (q.fields || []).map(name =>
      `<label><code>${name}</code><input type="text" spellcheck="false" autocapitalize="off" required aria-label="${name}"></label>`).join("");
    fields.hidden = !q.fields;
    input.hidden = input.disabled = !!q.fields;
  };
  const focus = () => (fields.querySelector("input") || input).focus();
  const answer = () => questions[round].fields ? [...fields.querySelectorAll("input")].map(i => i.value) : input.value;
  const restart = () => { questions = c.make(); round = 0; showRound(); };
  const complete = (fresh) => {
    card.classList.add("completed");
    form.hidden = true;
    again.hidden = false;
    card.querySelector(".rounds").innerHTML = "";
    msg.innerHTML = `<span class="icon fill">check_circle</span><span>${fresh ? `All ${questions.length} right. ` : ""}Topic completed. Saved in this browser.</span>`;
  };

  form.addEventListener("submit", e => {
    e.preventDefault();
    const q = questions[round];
    if (q.check(answer())) {
      msg.textContent = "";
      card.classList.remove("wrong");
      if (++round < questions.length) return showRound();
      const saved = setSolved(key, true);
      complete(true);
      if (!saved) msg.textContent = `All ${questions.length} right, but your browser is blocking local storage, so it can't be saved.`;
      return;
    }
    card.classList.remove("wrong");
    void card.offsetWidth; // restart the shake animation
    card.classList.add("wrong");
    msg.innerHTML = `Not quite: ${q.answer}. Starting again with new bytes.`;
    restart();
    focus();
  });
  again.querySelector("button").addEventListener("click", () => {
    card.classList.remove("completed", "wrong");
    form.hidden = false;
    again.hidden = true;
    msg.textContent = "";
    restart();
    focus();
  });

  restart();
  if (solvedSet().has(key)) complete(false);
}

// A bit table with class "toggle": click a bit in the byte row to switch it,
// and the example above the table and the explanation under it follow
function startBits(table) {
  const tds = row => [...row.querySelectorAll("td")];
  const [places, cells] = [...table.rows].map(tds);
  const card = table.closest(".card");
  const example = card.querySelector(".bits-example");
  const out = card.querySelector(".bits-out");
  cells.forEach((td, i) => {
    td.innerHTML = `<button type="button" aria-label="Bit worth ${places[i].textContent}">${td.textContent.trim()}</button>`;
    td.firstChild.addEventListener("click", () => {
      const on = td.firstChild.textContent === "0";
      td.firstChild.textContent = on ? "1" : "0";
      td.classList.toggle("on", on);
      places[i].classList.toggle("on", on);
      show();
    });
  });
  const show = () => {
    const byte = cells.map(td => td.textContent).join("");
    const n = parseInt(byte, 2);
    const onValues = cells.map((td, i) => td.textContent === "1" ? places[i].textContent : null).filter(Boolean);
    const columns = onValues.length > 1 ? `${onValues.slice(0, -1).join(", ")} and ${onValues.at(-1)}` : onValues[0];
    example.textContent = byte;
    out.innerHTML = (
      onValues.length === 0 ? "<p>No bits are ON, so there is nothing to add.</p>"
      : onValues.length === 1 ? `<p>Only the ${columns} column is ON, so there is nothing else to add.</p>`
      : `<p>The ${columns} columns are ON.</p><p class="calc">${onValues.join(" + ")} = ${n}</p>`
    ) + `<p>So <code>${byte}</code> in binary is <b>${n}</b> in decimal.</p>`;
  };
  show();
}

// Each letter lights up the row of the byte that holds it
function startPoints(table) {
  const rows = [...table.tBodies[0].rows];
  const word = document.createElement("div");
  word.className = "word";
  word.innerHTML = rows.map(r => `<button type="button">${esc(r.cells[2].textContent)}</button>`).join("");
  table.closest(".table-wrap").before(word);
  [...table.rows].forEach(r => [2, 1].forEach(i => {
    const cell = document.createElement(r.parentNode === table.tHead ? "th" : "td");
    cell.className = "arrow";
    cell.setAttribute("aria-hidden", "true");
    if (r.parentNode !== table.tHead) cell.innerHTML = "<span></span>";
    r.insertBefore(cell, r.cells[i]);
  }));
  const letters = [...word.children];
  const pick = (i) => {
    rows.forEach((r, j) => r.classList.toggle("on", i === j));
    letters.forEach((b, j) => b.setAttribute("aria-pressed", i === j));
  };
  rows.forEach((r, i) => {
    r.addEventListener("click", () => pick(i));
    letters[i].addEventListener("click", () => pick(i));
  });
  const hint = document.createElement("p");
  hint.className = "bits-hint";
  hint.textContent = "Click a letter to see which address it lives at.";
  table.closest(".table-wrap").after(hint);
  pick(0);
}

// A box of books to put on and take off the top, one at a time
function startStackPlay(el) {
  const MAX = 6;
  const colors = ["blue", "yellow", "green", "red"];
  el.innerHTML = `<div class="box"></div>
    <p class="stack-msg" aria-live="polite"></p>
    <div class="actions">
      <button class="btn btn-filled" type="button"><span class="icon">add</span>Add a book</button>
      <button class="btn btn-tonal" type="button"><span class="icon">remove</span>Remove a book</button>
    </div>`;
  const box = el.querySelector(".box");
  const msg = el.querySelector(".stack-msg");
  const [addBtn, removeBtn] = el.querySelectorAll("button");
  const books = [];
  let count = 0;
  const markTop = () => books.forEach((b, i) => {
    const top = i === books.length - 1;
    b.el.classList.toggle("top", top);
    b.el.querySelector(".tag").textContent = top ? "Top" : "";
  });
  const add = () => {
    if (!books.length) count = 0;
    const name = `Book ${++count}`;
    const book = document.createElement("div");
    book.className = `book ${colors[(count - 1) % colors.length]}${count % 2 ? "" : " shift"}`;
    book.innerHTML = `<span>${name}</span><span class="tag"></span>`;
    box.append(book);
    books.push({ name, el: book });
    markTop();
    return name;
  };
  addBtn.addEventListener("click", () => {
    if (books.length === MAX) { msg.textContent = "The box is full! Remove a book first."; return; }
    msg.textContent = `${add()} is now at the top of the stack.`;
  });
  removeBtn.addEventListener("click", () => {
    const book = books.pop();
    if (!book) { msg.textContent = "The stack is empty. There is nothing to remove."; return; }
    book.el.classList.remove("top");
    book.el.querySelector(".tag").textContent = "";
    book.el.classList.add("out");
    setTimeout(() => book.el.remove(), 250);
    markTop();
    msg.textContent = books.length
      ? `${book.name} came off the top. It went in after ${books.at(-1).name}, so it comes out first.`
      : `${book.name} went in first, so it came out last. The box is empty now.`;
  });
  add(); add(); add();
  msg.textContent = "Book 3 went in last, so it's at the top.";
}

// A topic without a challenge is completed with a button instead
const MARK_CARD = `<section class="card challenge mark" aria-label="Progress">
  <span class="eyebrow"><span class="icon fill">flag</span>Done reading?</span>
  <p class="challenge-msg" aria-live="polite"></p>
  <div class="actions"><button class="btn btn-filled" type="button"></button></div>
</section>`;

function startMark(card, key) {
  const msg = card.querySelector(".challenge-msg");
  const btn = card.querySelector("button");
  const show = (done) => {
    card.classList.toggle("completed", done);
    btn.className = `btn ${done ? "btn-tonal" : "btn-filled"}`;
    btn.innerHTML = done ? '<span class="icon">undo</span>Mark not completed' : '<span class="icon">check</span>Mark completed';
    msg.innerHTML = done ? '<span class="icon fill">check_circle</span><span>Topic completed. Saved in this browser.</span>' : "";
  };
  btn.addEventListener("click", () => {
    const done = !solvedSet().has(key);
    if (!setSolved(key, done)) { msg.textContent = "Your browser is blocking local storage, so this can't be saved."; return; }
    show(done);
  });
  show(solvedSet().has(key));
}

// ---- theme: follows the system until the top bar button picks one ----
const THEME_KEY = "pwnctual:theme";
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => (document.documentElement.dataset.theme ?? (darkQuery.matches ? "dark" : "light")) === "dark";
const themeBtn = document.querySelector(".theme");
function showTheme() {
  const label = `Switch to ${isDark() ? "light" : "dark"} theme`;
  themeBtn.innerHTML = `<span class="icon">${isDark() ? "light_mode" : "dark_mode"}</span>`;
  themeBtn.setAttribute("aria-label", label);
  themeBtn.title = label;
  // The browser bar color follows the page
  const color = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = color);
}
themeBtn.addEventListener("click", () => {
  const t = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch {}
  showTheme();
});
darkQuery.addEventListener("change", showTheme);
showTheme();

// ---- router ----
function render() {
  let p = location.pathname.replace(/\/+$/, "") || "/";
  // Old addresses: /learn was the lesson list; /find, /c and /level/* were the
  // levels, which are gone
  if (p === "/learn" || p === "/find" || p === "/c" || p.startsWith("/level/")) {
    history.replaceState(null, "", "/");
    p = "/";
  }
  const lesson = p.match(/^\/learn\/(\d+-\d+)$/);
  window.scrollTo(0, 0);
  if (p === "/") return homePage();
  if (lesson) return lessonPage(lesson[1]);
  setTitle("Not found");
  app.innerHTML = page(header({ title: "Page not found", below: `<div class="actions"><a class="btn btn-tonal" href="/" data-link>Go home</a></div>` }));
}

document.addEventListener("click", e => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  if (a.getAttribute("href") !== location.pathname) history.pushState(null, "", a.getAttribute("href"));
  render();
});
addEventListener("popstate", render);
render();
