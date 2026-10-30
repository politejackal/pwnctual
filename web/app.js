// pwnctual frontend: a small router and three pages. Everything is static:
// level data comes from /levels/*.json (built by scripts/build-levels.mjs) and
// progress is kept in this browser's localStorage.

// The two paths. Their folders in the levels repo have the same names.
const PATHS = {
  learning: { name: "C For Hackers", url: "/learn", logo: "/logos/c.svg", empty: "Lessons and levels are on the way.",
    blurb: "Lessons and levels that teach C from the start, so you can read and write the programs in the other path." },
  finding: { name: "Find bugs", url: "/find", icon: "bug_report", empty: "Levels are on the way.",
    blurb: "C programs with a security bug in them. Find an input that breaks each one and submit the flag." },
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

function errorBox(err) {
  return `<div class="card empty">Couldn't load this page (${esc(err.message)}). Try again in a moment.</div>`;
}
function loading(text) {
  return page(header({ title: "&nbsp;", below: `<div class="running"><span class="spinner"></span>${text}</div>` }));
}

// ---- pages ----
function levelList(levels, solved, label) {
  return `<nav class="list" aria-label="${label}">${levels.map((l, i) => {
    const isDone = solved.has(l.id);
    return `<a class="list-item ${isDone ? "solved" : ""}" href="/level/${esc(l.id)}" data-link>
      <span class="num">${isDone ? '<span class="icon">check</span>' : i + 1}</span>
      <span><span class="title">${esc(l.title)}</span><span class="meta">${esc(l.difficulty)}${isDone ? " · Solved" : ""}</span></span>
      <span class="icon go">chevron_right</span>
    </a>`;
  }).join("")}</nav>`;
}
const progressChip = (done, total) =>
  `<span class="chip${total && done === total ? " ok" : ""}">${total ? `${done} of ${total} solved` : "Coming soon"}</span>`;
const pathIcon = p => `<span class="logo" aria-hidden="true">${p.logo
  ? `<img src="${p.logo}" alt="" width="44" height="44">`
  : `<span class="icon">${p.icon}</span>`}</span>`;

const HOW_FINDING = `<section class="card" aria-label="How it works">
  <h2>How it works</h2>
  <ol class="steps row">
    <li><div><b class="title">Read the level</b><span class="muted">Each level tells you what the program is meant to do. The bug is somewhere in there.</span></div></li>
    <li><div><b class="title">Break it</b><span class="muted">Open it in GitHub Codespaces and run <code>./check.sh</code> with your input. If the program breaks, it prints a flag.</span></div></li>
    <li><div><b class="title">Submit the flag</b><span class="muted">Enter the flag on the level page, then read the writeup to see why the program broke.</span></div></li>
  </ol>
</section>`;

async function homePage() {
  setTitle("");
  markNav("home");
  let levels = [];
  try { levels = await getIndex(); } catch {}
  const solved = solvedSet();
  const pathCard = key => {
    const p = PATHS[key];
    const mine = levels.filter(l => l.path === key);
    return `<a class="card path" href="${p.url}" data-link>
      ${pathIcon(p)}
      <h2>${p.name}</h2>
      <p>${p.blurb}</p>
      <span class="path-foot">${progressChip(mine.filter(l => solved.has(l.id)).length, mine.length)}<span class="icon go">arrow_forward</span></span>
    </a>`;
  };
  app.innerHTML = page(
    header({
      above: `<div class="chips"><span class="chip">Free and open source</span></div>`,
      title: "Learn C.<br>Then find bugs.",
      lead: "Start with the Learn C path, where lessons and levels teach you C from the very basics. Once you finish learning C from here or already know C, move on to the Find bugs path, where every level is a program, small or big, with a security bug intentionally in it. Analyze the code, find the bug and submit the flag using the respective check.sh file. And lastly, read the writeup to better understand why the code broke. It is encouraged to try to fix the program, to better understand how the stuff actually works.",
    }),
    `<section class="grid-2" aria-label="Paths">
      ${pathCard("learning")}
      ${pathCard("finding")}
    </section>`
  );
}

async function pathPage(key) {
  const p = PATHS[key];
  setTitle(p.name);
  markNav(key);
  const head = chip => header({ above: `<div class="chips">${chip}</div>`, title: p.name, lead: p.blurb });
  const intro = key === "finding" ? HOW_FINDING : "";
  app.innerHTML = page(head(`<span class="chip">Loading</span>`));
  try {
    const levels = (await getIndex()).filter(l => l.path === key);
    const solved = solvedSet();
    const done = levels.filter(l => solved.has(l.id)).length;
    app.innerHTML = page(
      head(progressChip(done, levels.length)),
      intro + (levels.length ? levelList(levels, solved, p.name) : `<div class="card empty">${p.empty}</div>`)
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
  setTitle(level.title);
  const path = PATHS[level.path];
  markNav(level.path);
  let hintsShown = 0;
  const solvedChip = `<span class="chip ok solved-chip"${solvedSet().has(level.id) ? "" : " hidden"}><span class="icon">check</span>Solved</span>`;

  app.innerHTML = page(
    header({
      above: `<div class="chips">
        <a class="chip" href="${path.url}" data-link><span class="icon">arrow_back</span>${path.name}</a>
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
          <pre class="cmd"><code>cd ${esc(level.path)}/${esc(level.id)}
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

    <section class="card writeup" hidden>
      <span class="eyebrow"><span class="icon fill">menu_book</span>Writeup</span>
      <h2>Why it broke</h2>
      ${level.writeup?.length ? level.writeup.join("") : `<p class="note">The writeup for this level is coming soon.</p>`}
    </section>

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
  // The writeup only shows once the level is solved
  const writeup = app.querySelector(".writeup");
  const showSolved = () => {
    form.classList.add("solved");
    app.querySelector(".solved-chip").hidden = false;
    writeup.hidden = false;
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
    writeup.scrollIntoView({ behavior: "smooth", block: "start" });
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
  if (p === "/learn") return pathPage("learning");
  // /c was the old address of the finding path
  if (p === "/find" || p === "/c") return pathPage("finding");
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
