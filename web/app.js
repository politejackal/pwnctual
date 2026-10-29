// pwnctual frontend: a small router and three pages. Everything is static:
// level data comes from /levels/*.json (built by scripts/build-levels.mjs) and
// progress is kept in this browser's localStorage.

const PATHS = {
  c: { name: "C", blurb: "Buffer overflows, format strings, integer bugs and other ways C programs go wrong." },
  python: { name: "Python", blurb: "Injection, unsafe parsing, and logic bugs in Python code." },
};

// One shared repo with every level. quickstart=1 offers to reopen an existing
// codespace instead of always making a new one.
const CODESPACES_URL = "https://codespaces.new/politejackal/pwnctual-levels?quickstart=1";

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
let indexCache = null;
const getIndex = async () => (indexCache ??= await getJson("/levels/index.json"));

// ---- helpers ----
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function setTitle(t) { document.title = t ? `${t} · pwnctual` : "pwnctual"; }

function markNav(tab) {
  document.querySelectorAll(".topnav a, .bottomnav a").forEach(a => {
    const match = (a.dataset.tab ?? a.getAttribute("href").slice(1)) === tab;
    if (match) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function errorBox(err) {
  return `<div class="empty">Couldn't load this page (${esc(err.message)}). Try again in a moment.</div>`;
}

// ---- pages ----
async function homePage() {
  setTitle("");
  markNav("home");
  let levels = [];
  try { levels = await getIndex(); } catch {}
  const solved = solvedSet();
  const pathCard = (lang, cls, icon) => {
    const mine = levels.filter(l => l.language === lang);
    const status = mine.length ? `${mine.filter(l => solved.has(l.id)).length} of ${mine.length} solved` : "Levels on the way";
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
      <p>Every level is a small program with a real security bug. Fix it in GitHub Codespaces, then run the included check to see if your fix holds up against attacks. Free and open source.</p>
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
      <div><span class="num">1</span><b>Read the level</b><p>Each level tells you what the program is meant to do. The bug is somewhere in there.</p></div>
      <div><span class="num">2</span><b>Fix it</b><p>Open it in GitHub Codespaces: VS Code in your browser, with the compiler and every level already set up.</p></div>
      <div><span class="num">3</span><b>Run the check</b><p><code>./check.sh</code> runs normal input and then attacks. C is built with AddressSanitizer, so memory bugs fail even when they don't crash.</p></div>
    </section>`;
}

async function pathPage(lang) {
  setTitle(PATHS[lang].name);
  markNav(lang);
  app.innerHTML = `<div class="page-head"><h1>${PATHS[lang].name}</h1><p>${PATHS[lang].blurb}</p></div><div class="level-list" aria-busy="true"></div>`;
  const host = app.querySelector(".level-list");
  try {
    const levels = (await getIndex()).filter(l => l.language === lang);
    const solved = solvedSet();
    host.removeAttribute("aria-busy");
    if (!levels.length) {
      host.innerHTML = `<div class="empty">No ${PATHS[lang].name} levels yet. They're being written.</div>`;
      return;
    }
    host.innerHTML = `<div class="levels">${levels.map((l, i) => {
      const done = solved.has(l.id);
      return `<a class="level-row ${done ? "solved" : ""}" href="/level/${esc(l.id)}" data-link>
        <span class="num">${done ? '<span class="icon">check</span>' : i + 1}</span>
        <span><span class="title">${esc(l.title)}</span><br><span class="meta">${esc(l.difficulty)}${done ? " · Solved" : ""}</span></span>
        <span class="icon go">chevron_right</span>
      </a>`;
    }).join("")}</div>`;
  } catch (err) {
    host.outerHTML = errorBox(err);
  }
}

async function levelPage(id) {
  setTitle("");
  app.innerHTML = `<div class="page-head"><div class="running"><span class="spinner"></span>Loading level</div></div>`;
  let level;
  try {
    level = await getJson(`/levels/${encodeURIComponent(id)}.json`);
  } catch (err) {
    app.innerHTML = err.status === 404 ? `<div class="page-head"><h1>No such level</h1></div>` : errorBox(err);
    return;
  }
  const path = PATHS[level.language];
  setTitle(level.title);
  markNav(level.language);
  let hintsShown = 0;

  app.innerHTML = `
    <div class="crumbs"><a href="/${level.language}" data-link>← ${path.name}</a></div>
    <article class="level">
      <div class="chips">
        <span class="chip">${esc(level.difficulty)}</span>
      </div>
      <h1>${esc(level.title)}</h1>
      ${level.description.map(p => `<p>${p}</p>`).join("")}

      <div class="howto">
        <h2>How to solve it</h2>
        <ol>
          <li>Click <b>Open in Codespaces</b> and sign in with GitHub. The first start takes a minute or two.</li>
          <li>Open <code>${esc(level.id)}/${esc(level.sourceName)}</code> in the file list and fix it.</li>
          <li>Open a terminal (<b>Terminal → New Terminal</b>) and run the check:
            <pre class="cmd"><code>cd ${esc(level.id)}
./check.sh</code></pre>
          </li>
          <li>When it prints <b>PASS</b>, it also gives you a flag. Enter it below.</li>
        </ol>
        <p class="note">Nothing to install. It runs on your GitHub account's free Codespaces hours. Clicking the button again takes you back to the same codespace with your changes.</p>
      </div>

      <div class="actions">
        <a class="btn btn-filled" href="${CODESPACES_URL}" target="_blank" rel="noopener"><span class="icon">terminal</span>Open in Codespaces</a>
      </div>

      <form class="flag-form" autocomplete="off">
        <label for="flag">Flag</label>
        <div class="flag-row">
          <input id="flag" name="flag" type="text" spellcheck="false" autocapitalize="off" placeholder="pwnctual{...}" required>
          <button class="btn btn-tonal" type="submit"><span class="icon">flag</span>Submit flag</button>
        </div>
        <p class="flag-msg" aria-live="polite"></p>
      </form>

      <div class="hints"></div>
      <button class="btn btn-text show-hint" type="button"><span class="icon">lightbulb</span>Show a hint</button>
    </article>`;

  const hintsEl = app.querySelector(".hints");
  const hintBtn = app.querySelector(".show-hint");
  hintBtn.hidden = !level.hints.length;
  hintBtn.addEventListener("click", () => {
    if (hintsShown >= level.hints.length) return;
    hintsEl.insertAdjacentHTML("beforeend", `<div class="hint">${level.hints[hintsShown++]}</div>`);
    if (hintsShown >= level.hints.length) hintBtn.hidden = true;
    else hintBtn.lastChild.textContent = "Show another hint";
  });

  // The page only knows the flag's SHA-256, so the flag itself isn't in the site's code
  const form = app.querySelector(".flag-form");
  const input = form.querySelector("input");
  const msg = form.querySelector(".flag-msg");
  const showSolved = () => {
    form.classList.add("solved");
    msg.innerHTML = `<span class="icon fill">check_circle</span>Solved. Saved in this browser.`;
  };
  if (solvedSet().has(level.id)) showSolved();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    form.classList.remove("wrong");
    const flag = input.value.trim();
    if (await sha256(flag) !== level.flagSha256) {
      form.classList.add("wrong");
      msg.textContent = "That's not the flag for this level. Copy the whole line check.sh prints after PASS.";
      return;
    }
    if (!setSolved(level.id, true)) {
      msg.textContent = "Right flag, but your browser is blocking local storage, so it can't be saved.";
      return;
    }
    showSolved();
  });
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
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
