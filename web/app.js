// pwnctual frontend: a small router, three pages, and calls to the API.
import { createEditor } from "./vendor/editor.js";

// In production the API is on the same origin under /api. Locally it runs on its own port.
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = LOCAL ? `http://${location.hostname}:8787` : "";

const PATHS = {
  c: { name: "C", file: "main.c", blurb: "Buffer overflows, format strings, integer bugs and other ways C programs go wrong." },
  python: { name: "Python", file: "main.py", blurb: "Injection, unsafe parsing, and logic bugs in Python code." },
};

const app = document.getElementById("app");

// ---- storage (can be unavailable in private windows, so never rely on it) ----
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// ---- API ----
async function session() {
  let token = store.get("pwnctual:token");
  if (!token) {
    const res = await fetch(`${API}/api/session`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start a session");
    token = data.token;
    store.set("pwnctual:token", token);
  }
  return token;
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  const token = auth ? await session() : store.get("pwnctual:token");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && auth) {
    // The token is unknown to the server (e.g. a reset database). Get a new one once.
    store.del("pwnctual:token");
    if (!api.retried) { api.retried = true; try { return await api(path, { method, body, auth }); } finally { api.retried = false; } }
  }
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

// ---- helpers ----
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function setTitle(t) { document.title = t ? `${t} · pwnctual` : "pwnctual"; }

function markNav(tab) {
  document.querySelectorAll(".topnav a, .bottomnav a").forEach(a => {
    const match = (a.dataset.tab ?? a.getAttribute("href").slice(1)) === tab;
    a.toggleAttribute("aria-current", match);
    if (match) a.setAttribute("aria-current", "page");
  });
}

function errorBox(err) {
  return `<div class="empty">Couldn't load this page: ${esc(err.message)}. ${LOCAL ? "Is the API running on port 8787?" : "Try again in a moment."}</div>`;
}

let levelsCache = null;
async function getLevels() {
  levelsCache ??= await api("/api/levels");
  return levelsCache;
}

// ---- pages ----
async function homePage() {
  setTitle("");
  markNav("home");
  let levels = [];
  try { levels = await getLevels(); } catch {}
  const count = lang => levels.filter(l => l.language === lang).length;
  const solved = lang => levels.filter(l => l.language === lang && l.solved).length;
  const pathCard = (lang, cls, icon) => {
    const n = count(lang);
    const status = n ? `${solved(lang)} of ${n} solved` : "Levels on the way";
    return `<a class="path ${cls}" href="/${lang}" data-link>
      <span class="icon">${icon}</span>
      <h2>${PATHS[lang].name}</h2>
      <p>${PATHS[lang].blurb}</p>
      <p style="margin-top:12px;font-weight:600">${status}</p>
    </a>`;
  };
  app.innerHTML = `
    <section class="hero">
      <h1>Find the bug.<br>Fix the code.</h1>
      <p>Every level is a small program with a real security bug. Fix it and submit. The server compiles your code and runs it against normal input and against attacks. Free and open source, no sign-up.</p>
    </section>
    <section class="paths" aria-label="Paths">
      ${pathCard("c", "c-blue", "memory")}
      ${pathCard("python", "c-yellow", "code")}
      <div class="path soon" aria-disabled="true">
        <span class="badge">Coming soon</span>
        <h2>SQL</h2>
        <p>Queries built from user input, and how to stop them being rewritten.</p>
      </div>
    </section>
    <section class="how" aria-label="How it works">
      <div><span class="num">1</span><b>Read the code</b><p>Each level tells you what the program is meant to do. The bug is somewhere in there.</p></div>
      <div><span class="num">2</span><b>Fix it</b><p>Edit the code in the browser. Keep it working for normal input.</p></div>
      <div><span class="num">3</span><b>Submit</b><p>Your fix runs against hidden tests: normal input first, then inputs built to break it. C is compiled with AddressSanitizer, so memory bugs count even when they don't crash.</p></div>
    </section>`;
}

async function pathPage(lang) {
  setTitle(PATHS[lang].name);
  markNav(lang);
  app.innerHTML = `<div class="page-head"><h1>${PATHS[lang].name}</h1><p>${PATHS[lang].blurb}</p></div><div class="levels" aria-busy="true"></div>`;
  const list = app.querySelector(".levels");
  try {
    const levels = (await getLevels()).filter(l => l.language === lang);
    list.removeAttribute("aria-busy");
    if (!levels.length) {
      list.outerHTML = `<div class="empty">No ${PATHS[lang].name} levels yet. They're being written.</div>`;
      return;
    }
    list.innerHTML = levels.map((l, i) => `
      <a class="level-row ${l.solved ? "solved" : ""}" href="/level/${esc(l.id)}" data-link>
        <span class="num">${l.solved ? '<span class="icon">check</span>' : i + 1}</span>
        <span><span class="title">${esc(l.title)}</span><br><span class="meta">${esc(l.difficulty)}${l.solved ? " · Solved" : ""}</span></span>
        <span class="icon go">chevron_right</span>
      </a>`).join("");
  } catch (err) {
    list.outerHTML = errorBox(err);
  }
}

let editor = null;

async function levelPage(id) {
  setTitle("");
  app.innerHTML = `<div class="page-head"><div class="running"><span class="spinner"></span>Loading level</div></div>`;
  let level;
  try {
    level = await api(`/api/levels/${encodeURIComponent(id)}`);
  } catch (err) {
    app.innerHTML = err.status === 404 ? `<div class="page-head"><h1>No such level</h1></div>` : errorBox(err);
    return;
  }
  const path = PATHS[level.language];
  setTitle(level.title);
  markNav(level.language);
  const draftKey = `pwnctual:code:${level.id}`;
  let hintsShown = 0;

  app.innerHTML = `
    <div class="crumbs"><a href="/${level.language}" data-link>← ${path.name}</a></div>
    <div class="level">
      <section class="brief">
        <div class="chips">
          <span class="chip">${esc(level.difficulty)}</span>
          <span class="chip ok solved-chip" ${level.solved ? "" : "hidden"}><span class="icon" style="font-size:16px">check</span>Solved</span>
        </div>
        <h1>${esc(level.title)}</h1>
        ${level.description.map(p => `<p>${p}</p>`).join("")}
        <div class="hints"></div>
        <button class="btn btn-text show-hint" type="button"><span class="icon">lightbulb</span>Show a hint</button>
      </section>
      <section class="workbench">
        <div class="editor-card">
          <div class="bar">
            <span class="file">${path.file}</span>
            <button class="btn btn-text reset" type="button" style="--h:36px"><span class="icon">restart_alt</span>Reset</button>
          </div>
          <div class="editor-host"></div>
        </div>
        <div class="actions">
          <button class="btn btn-filled submit" type="button"><span class="icon">send</span>Submit fix</button>
        </div>
        <div class="results-host" aria-live="polite"></div>
      </section>
    </div>`;

  // Hints: one at a time, so they don't give everything away
  const hintsEl = app.querySelector(".hints");
  const hintBtn = app.querySelector(".show-hint");
  hintBtn.hidden = !level.hints.length;
  hintBtn.addEventListener("click", () => {
    hintsEl.insertAdjacentHTML("beforeend", `<div class="hint">${level.hints[hintsShown++]}</div>`);
    if (hintsShown >= level.hints.length) hintBtn.hidden = true;
    else hintBtn.lastChild.textContent = "Show another hint";
  });

  editor?.destroy();
  editor = createEditor(app.querySelector(".editor-host"), {
    value: store.get(draftKey) ?? level.source,
    language: level.language,
    onChange: text => store.set(draftKey, text),
  });

  app.querySelector(".reset").addEventListener("click", () => {
    if (editor.value !== level.source && !confirm("Throw away your changes and start from the original code?")) return;
    editor.value = level.source;
    store.del(draftKey);
  });

  const submitBtn = app.querySelector(".submit");
  const resultsEl = app.querySelector(".results-host");
  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    resultsEl.innerHTML = `<div class="results"><div class="running"><span class="spinner"></span>Compiling and running the tests…</div></div>`;
    try {
      const result = await api(`/api/levels/${encodeURIComponent(level.id)}/submit`, {
        method: "POST", body: { code: editor.value }, auth: true,
      });
      resultsEl.innerHTML = renderResult(result);
      if (result.passed) {
        app.querySelector(".solved-chip").hidden = false;
        levelsCache = null;
      }
    } catch (err) {
      resultsEl.innerHTML = `<div class="results"><h2><span class="icon">error</span>Not submitted</h2><p class="note">${esc(err.message)}</p></div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function renderResult(r) {
  if (r.compileError !== undefined) {
    return `<div class="results"><h2><span class="icon">build</span>Doesn't compile</h2><pre>${esc(r.compileError || "No compiler output")}</pre></div>`;
  }
  const row = (label, c) => `
    <div class="row">
      <span class="icon ${c.passed === c.total ? "ok" : "bad"}">${c.passed === c.total ? "check_circle" : "cancel"}</span>
      <span class="label">${label}</span>
      <span class="count">${c.passed}/${c.total}</span>
    </div>
    ${c.failures.length ? `<ul>${c.failures.map(f => `<li>Test ${f.test}: ${esc(f.reason)}</li>`).join("")}</ul>` : ""}`;
  return `<div class="results ${r.passed ? "pass" : ""}">
    <h2><span class="icon fill">${r.passed ? "verified" : "shield"}</span>${r.passed ? "Level solved" : "Not fixed yet"}</h2>
    ${row("Normal input", r.functional)}
    ${row("Attacks", r.attack)}
    <p class="note">${r.passed
      ? "Your fix survived every attack and still does its job."
      : "The tests are hidden on purpose. Read the failures, then look at the code again."}</p>
  </div>`;
}

// ---- router ----
function render() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  const level = p.match(/^\/level\/([a-z0-9-]+)$/);
  window.scrollTo(0, 0);
  if (p === "/") return homePage();
  if (p === "/c" || p === "/python") return pathPage(p.slice(1));
  if (level) return levelPage(level[1]);
  setTitle("Not found");
  markNav("");
  app.innerHTML = `<div class="page-head"><h1>Page not found</h1><p><a href="/" data-link>Go home</a></p></div>`;
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
