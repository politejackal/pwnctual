// pwnctual frontend: a small router and three pages. Everything is static:
// level data comes from /levels/*.json (built by scripts/build-levels.mjs) and
// progress is kept in this browser's localStorage.

const PATHS = {
  c: { name: "C", logo: "/logos/c.svg", blurb: "Buffer overflows, format strings, integer bugs and other ways C programs go wrong." },
  python: { name: "Python", logo: "/logos/python.svg", blurb: "Injection, unsafe parsing, and logic bugs in Python code." },
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
// Language logos sit in identical tiles so the cards stay matched
const logo = src => `<span class="logo" aria-hidden="true"><img src="${src}" alt="" width="44" height="44"></span>`;

function errorBox(err) {
  return `<div class="card empty">Couldn't load this page (${esc(err.message)}). Try again in a moment.</div>`;
}
function loading(text) {
  return page(header({ title: "&nbsp;", below: `<div class="running"><span class="spinner"></span>${text}</div>` }));
}

// ---- pages ----
async function homePage() {
  setTitle("");
  markNav("home");
  let levels = [];
  try { levels = await getIndex(); } catch {}
  const solved = solvedSet();
  const pathCard = lang => {
    const p = PATHS[lang];
    const mine = levels.filter(l => l.language === lang);
    const status = mine.length ? `${mine.filter(l => solved.has(l.id)).length} of ${mine.length} solved` : "Levels on the way";
    return `<a class="card path" href="/${lang}" data-link>
      ${logo(p.logo)}
      <h3>${p.name}</h3>
      <p>${p.blurb}</p>
      <span class="status">${status}</span>
    </a>`;
  };
  app.innerHTML = page(
    header({
      above: `<div class="chips"><span class="chip">Free and open source</span></div>`,
      title: "Find the bug.<br>Fix the code.",
      lead: "Every level is a small program with a real security bug. Fix it in GitHub Codespaces, then run the included check to see if your fix holds up against attacks.",
      below: `<div class="actions"><a class="btn btn-filled" href="/c" data-link><span class="icon">arrow_forward</span>Start with C</a></div>`,
    }),
    `<section class="grid-3" aria-label="Paths">
      ${pathCard("c")}
      ${pathCard("python")}
      <div class="card path soon" aria-disabled="true">
        <span class="logo" aria-hidden="true"><span class="icon">database</span></span>
        <h3>SQL</h3>
        <p>Queries built from user input, and how to stop them being rewritten.</p>
        <span class="status">Coming soon</span>
      </div>
    </section>
    <section class="card" aria-label="How it works">
      <h2>How it works</h2>
      <ol class="steps row">
        <li><div><b class="title">Read the level</b><span class="muted">Each level tells you what the program is meant to do. The bug is somewhere in there.</span></div></li>
        <li><div><b class="title">Fix it</b><span class="muted">Open it in GitHub Codespaces: VS Code in your browser, with the compiler and every level already set up.</span></div></li>
        <li><div><b class="title">Run the check</b><span class="muted"><code>./check.sh</code> runs normal input and then attacks. C is built with AddressSanitizer, so memory bugs fail even when they don't crash.</span></div></li>
      </ol>
    </section>`
  );
}

async function pathPage(lang) {
  const p = PATHS[lang];
  setTitle(p.name);
  markNav(lang);
  const head = progress => header({ above: `<div class="chips">${progress}</div>`, title: p.name, lead: p.blurb });
  app.innerHTML = page(head(`<span class="chip">Loading</span>`));
  try {
    const levels = (await getIndex()).filter(l => l.language === lang);
    const solved = solvedSet();
    if (!levels.length) {
      app.innerHTML = page(head(`<span class="chip">No levels yet</span>`), `<div class="card empty">No ${p.name} levels yet. They're being written.</div>`);
      return;
    }
    const done = levels.filter(l => solved.has(l.id)).length;
    app.innerHTML = page(
      head(`<span class="chip${done === levels.length ? " ok" : ""}">${done} of ${levels.length} solved</span>`),
      `<nav class="list" aria-label="${p.name} levels">${levels.map((l, i) => {
        const isDone = solved.has(l.id);
        return `<a class="list-item ${isDone ? "solved" : ""}" href="/level/${esc(l.id)}" data-link>
          <span class="num">${isDone ? '<span class="icon">check</span>' : i + 1}</span>
          <span><span class="title">${esc(l.title)}</span><span class="meta">${esc(l.difficulty)}${isDone ? " · Solved" : ""}</span></span>
          <span class="icon go">chevron_right</span>
        </a>`;
      }).join("")}</nav>`
    );
  } catch (err) {
    app.innerHTML = page(head(""), errorBox(err));
  }
}

async function levelPage(id) {
  setTitle("");
  app.innerHTML = loading("Loading level");
  let level;
  try {
    level = await getJson(`/levels/${encodeURIComponent(id)}.json`);
  } catch (err) {
    app.innerHTML = err.status === 404
      ? page(header({ title: "No such level", below: `<div class="actions"><a class="btn btn-tonal" href="/" data-link>Go home</a></div>` }))
      : page(header({ title: "Something went wrong" }), errorBox(err));
    return;
  }
  const path = PATHS[level.language];
  setTitle(level.title);
  markNav(level.language);
  let hintsShown = 0;
  const solvedChip = `<span class="chip ok solved-chip"${solvedSet().has(level.id) ? "" : " hidden"}><span class="icon">check</span>Solved</span>`;

  app.innerHTML = page(
    header({
      above: `<div class="chips">
        <a class="chip" href="/${level.language}" data-link><span class="icon">arrow_back</span>${path.name}</a>
        <span class="chip">${esc(level.difficulty)}</span>
        ${solvedChip}
      </div>`,
      title: esc(level.title),
    }),
    `<section class="card">
      <h2>The task</h2>
      ${level.description.map(p => `<p>${p}</p>`).join("")}
    </section>

    <section class="card">
      <h2>How to solve it</h2>
      <ol class="steps">
        <li><div>Click <b>Open in Codespaces</b> and sign in with GitHub.</div></li>
        <li><div>Open a terminal, and run the following:
          <pre class="cmd"><code>cd ${esc(level.id)}
./check.sh "your input"</code></pre></div></li>
        <li><div><code>check.sh</code> will run the program using the arguments you pass it, and if the program sends the code to the wrong number, it gives you the flag!</div></li>
      </ol>
    </section>

    <div class="actions">
      <a class="btn btn-filled" href="${CODESPACES_URL}" target="_blank" rel="noopener"><span class="icon">terminal</span>Open in Codespaces</a>
    </div>

    <form class="card flag-card" autocomplete="off">
      <h2><label for="flag">Flag</label></h2>
      <div class="flag-row">
        <input id="flag" name="flag" type="text" spellcheck="false" autocapitalize="off" placeholder="pwnctual{...}" required>
        <button class="btn btn-tonal" type="submit"><span class="icon">flag</span>Submit flag</button>
      </div>
      <p class="flag-msg" aria-live="polite"></p>
    </form>

    <div class="hints"></div>
    <div class="actions">
      <button class="btn btn-text show-hint" type="button"><span class="icon">lightbulb</span>Show a hint</button>
    </div>`
  );

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
  const form = app.querySelector(".flag-card");
  const input = form.querySelector("input");
  const msg = form.querySelector(".flag-msg");
  const showSolved = () => {
    form.classList.add("solved");
    app.querySelector(".solved-chip").hidden = false;
    msg.innerHTML = `<span class="icon fill">check_circle</span>Solved. Saved in this browser.`;
  };
  if (solvedSet().has(level.id)) showSolved();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    form.classList.remove("wrong");
    const flag = input.value.trim();
    if (await sha256(flag) !== level.flagSha256) {
      form.classList.add("wrong");
      msg.textContent = `That's not the flag for this level. Copy the whole line check.sh prints after "You broke it!".`;
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
