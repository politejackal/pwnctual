// Every page of the site, rendered from the course data, your progress and (signed in) your account.
import { CHALLENGES, CHAPTERS, INTRO, MODULES, TOTAL_CHALLENGES } from "./course.js";
import { LADDER, emblem, rankFor, shapeAnimation } from "./art.js";
import { account } from "./account.js";
import { progress } from "./progress.js";

const TONES = ["primary", "tertiary", "secondary"];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const plural = (n, word, many) => (n === 1 ? word : many || `${word}s`);
const icon = (name, style = "") => `<span class="material-symbols-rounded"${style ? ` style="${style}"` : ""}>${name}</span>`;
const pad2 = (n) => String(n).padStart(2, "0");
const pct = (done, total) => (total ? Math.round((100 * done) / total) : 0);
const countDone = (challenges, solved) => challenges.filter((c) => c.slug in solved).length;

export const myRank = () => rankFor(progress.score());

// ------------------------------------------------------------------ pieces

const wavy = (p) => `<div class="wavy-host" data-p="${p.toFixed(4)}"></div>`;

function rankCard(rank, big = true) {
  const t = rank.tier;
  return `<div class="rank-card">
  ${emblem(t, big ? 140 : 96)}
  <div class="stack" style="min-width:0">
    <div class="label">Current rank</div>
    <div class="display-s ${t.key === "ghost" ? "ghost-name" : ""}">${t.label}</div>
    <div class="muted">${t.motto}</div>
    ${wavy(rank.progress)}
    <div class="row muted" style="font-size:14px">
      <span><b style="color:var(--on-surface)">${rank.score}</b> ${plural(rank.score, "challenge")} completed</span>
      <span class="spacer"></span>
      ${rank.next ? `<span>${rank.toNext} to <b style="color:var(--on-surface)">${rank.next.label}</b></span>`
        : "<span>Apex reached. Nothing left to haunt.</span>"}
    </div>
  </div>
</div>`;
}

// "Stuck?" button: opens the help dialog for this chapter's video (and challenge, if given).
function stuckButton(ch, challenge = null, cls = "btn tonal") {
  return `<button type="button" class="${cls}" data-stuck data-video="${esc(ch.helpVideoUrl)}" data-video-id="${esc(ch.helpVideoId)}"
  data-chapter="Chapter ${ch.number}: ${esc(ch.title)}"${challenge ? ` data-challenge="${esc(challenge.title)}"` : ""}>
  ${icon("help")}Stuck?</button>`;
}

function stuckCard(ch) {
  return `<div class="live-card stuck-card">
  <span class="live-icon">${icon("psychology_alt")}</span>
  <div>
    <div class="label">Stuck?</div>
    <h2 class="headline">Getting stuck is learning</h2>
    <p class="muted">Everyone in this field gets stuck, all the time. Don't go looking for a walkthrough: it hands you the answer and takes
      away the lesson. Instead, <b>comment on the lecture video on YouTube</b> with the challenge you're on and exactly where you're stuck.
      We'll reply with a nudge that keeps the challenge yours to solve.</p>
  </div>
  ${stuckButton(ch, null, "btn lg")}
</div>`;
}

const metaRow = (left, right = "") =>
  `<div class="row" style="font-size:14px;font-weight:650"><span>${left}</span>${right ? `<span class="spacer"></span><span>${right}</span>` : ""}</div>`;

function chapterCard(ch, tone, solved) {
  const total = ch.challenges.length, done = countDone(ch.challenges, solved);
  let meta = "";
  if (total) {
    meta = metaRow(ch.videoId || !ch.hasLecture ? "" : "Lecture coming soon", `${done}/${total}`) +
      `<div class="progress-line"><i style="width:${pct(done, total)}%"></i></div>`;
  } else if (ch.number === 0) {
    meta = metaRow("Start here");
  } else if (ch.hasLecture && !ch.videoId) {
    meta = metaRow("Lecture coming soon");
  }
  return `<a class="card path-card tone-${tone}" href="${ch.url}">
    <div class="top">
      ${icon(total ? "flag" : ch.number === 0 ? "map" : "menu_book", "font-size:40px")}
      <span class="num" aria-hidden="true">${pad2(ch.number)}</span>
    </div>
    <div class="label" style="color:inherit;opacity:.8;margin-top:16px">Chapter ${ch.number}</div>
    <div class="headline">${esc(ch.title)}</div>
    ${ch.summary ? `<div style="opacity:.8">${esc(ch.summary)}</div>` : ""}
    <div class="meta">${meta}</div>
  </a>`;
}

const chapterRange = (m) => {
  const n = m.chapters.length;
  return `${n} ${plural(n, "chapter")} · ${n === 1 ? `Chapter ${m.chapters[0].number}` : `Chapters ${m.chapters[0].number}–${m.chapters[n - 1].number}`}`;
};

function moduleCard(m, solved) {
  const total = m.challenges.length, done = countDone(m.challenges, solved);
  return `<a class="card path-card tone-${m.tone}" href="/learn/${m.id}">
    <div class="top">
      ${icon(total && done === total ? "check_circle" : "terminal", "font-size:40px")}
      <span class="num" aria-hidden="true">M${m.number}</span>
    </div>
    <div class="label" style="color:inherit;opacity:.8;margin-top:16px">Module ${m.number}</div>
    <div class="headline">${esc(m.title)}</div>
    <div style="opacity:.8">${esc(m.summary)}</div>
    <div class="meta">
      ${metaRow(chapterRange(m), `${done}/${total}`)}
      <div class="progress-line"><i style="width:${pct(done, total)}%"></i></div>
    </div>
  </a>`;
}

const comingSoon = (what) => `<div class="card outlined path-card">
    ${icon("hourglass_top", "font-size:40px;color:var(--on-surface-variant)")}
    <div class="headline" style="margin-top:16px">Next ${what}</div>
    <div class="muted">New ${what}s are on the way.</div>
  </div>`;

const courseCards = (solved) => `<div class="grid grid-2">
  ${INTRO ? chapterCard(INTRO, TONES[0], solved) : ""}
  ${MODULES.map((m) => moduleCard(m, solved)).join("")}
  ${comingSoon("module")}
</div>`;

const rotatorHeadline = `<span class="sr-only">Learn to hack computers, the web, networks, binaries, kernels and browsers.</span><span aria-hidden="true">Learn to hack<br><em><span class="rotator" data-words="computers,the web,networks,binaries,kernels,browsers"><span class="rot-word">computers</span></span>.</em></span>`;

// ------------------------------------------------------------------ pages

let hero = null;
function heroArt() {
  hero ||= {
    big: shapeAnimation(["cookie9", "clover4", "verysunny", "squircle", "cookie6"], 230, 180, 300, 3.2),
    accent: shapeAnimation(["clover8", "circle", "sunny", "cookie4"], 330, 330, 120, 2.6),
    small: shapeAnimation(["squircle", "cookie12", "clover4", "circle"], 72, 318, 96, 2.9),
  };
  const morph = (a, fill) => `<path fill="${fill}" d="${a.d}"><animate attributeName="d" values="${a.values}" dur="${a.dur}"
          keyTimes="${a.keyTimes}" keySplines="${a.keySplines}" calcMode="spline" repeatCount="indefinite"/></path>`;
  return `<div class="hero-art" aria-hidden="true">
    <svg viewBox="0 0 400 400">
      ${morph(hero.big, "var(--primary-container)")}
      <text x="230" y="180" class="hero-glyph" fill="var(--on-primary-container)" font-size="150">skull</text>
      ${morph(hero.accent, "var(--tertiary)")}
      <text x="330" y="330" class="hero-glyph" fill="var(--on-tertiary)" font-size="56">terminal</text>
      ${morph(hero.small, "var(--secondary-container)")}
      <text x="72" y="318" class="hero-glyph" fill="var(--on-secondary-container)" font-size="44">code</text>
    </svg>
  </div>`;
}

function home() {
  const solved = progress.solved();
  const rank = myRank();
  const first = CHAPTERS[0];
  const next = CHAPTERS.find((ch) => ch.challenges.some((c) => !(c.slug in solved)));
  const intro = account.user || rank.score
    ? `<div class="label">Welcome back${account.user ? `, ${esc(account.user.login)}` : ""}</div>
    <h1 class="display-l" style="margin-top:12px">${rotatorHeadline}</h1>
    <div class="card filled" style="margin-top:32px;max-width:720px">${rankCard(rank)}</div>
    <div class="row" style="margin-top:24px">
      ${next ? `<a class="btn lg" href="${next.url}">${icon("play_arrow")}Continue: Chapter ${next.number}</a>` : ""}
      <a class="btn lg tonal" href="/learn">${icon("school")}All chapters</a>
    </div>`
    : `<a class="free-badge" href="/learn">${icon("redeem")}Free forever</a>
    <h1 class="display-l">${rotatorHeadline}</h1>
    <p class="lede">Watch a lecture, read the writeup (either one of these may or may not be there, depending on the
      difficulty of the topics!), then go and do the challenges yourself. If you don't do it yourself at the end of each
      chapter, you didn't learn anything. Feel free to ask me any questions, even if it is stupid; that's called learning.
      You can ask in the video comments or on Discord.</p>
    <div class="row">
      ${first ? `<a class="btn lg" href="${first.url}">${icon("play_arrow")}Start with chapter 0</a>` : ""}
      <a class="btn lg outlined" href="/learn">Browse chapters</a>
    </div>`;
  return {
    nav: "index",
    html: `<section class="wrap hero">
  ${heroArt()}
  ${intro}
</section>

<section class="wrap section">
  <h2 class="headline" style="margin-bottom:20px">How it works</h2>
  <div class="grid grid-3 steps">
    <div class="card step"><div class="title-l">Watch the lecture</div>
      <p class="muted">Almost every chapter starts with a video lesson. You can watch it right on the chapter page. Sometimes you might not find the video. Don't panic; it is intentional.</p></div>
    <div class="card step"><div class="title-l">Read the writeup</div>
      <p class="muted">Important hints or explanations: you must read these when you see them. Sometimes you might not find this; it is intentional too!</p></div>
    <div class="card step"><div class="title-l">Play real challenges</div>
      <p class="muted">Each chapter ends with a real challenge with real value. Every challenge accumulates for the course. You must not skip this, even if it looks easy or hard; it gives you muscle memory.</p></div>
  </div>
</section>

${first ? `<section class="wrap section">${stuckCard(first)}</section>` : ""}

<section class="section">
  <div class="wrap row" style="margin-bottom:16px">
    <h2 class="headline">The ladder</h2><span class="spacer"></span>
    <a class="btn text" href="/ranks">All ranks${icon("arrow_forward")}</a>
  </div>
  <div class="wrap rank-row">
    ${LADDER.map((t) => `<a class="rank-step ${t.key === "ghost" ? "apex" : ""}" href="/ranks">
        ${emblem(t, 120)}
        <span class="title-m ${t.key === "ghost" ? "ghost-name" : ""}">${t.name}</span>
        <span class="muted" style="font-size:13px">${t.min} ${plural(t.min, "challenge")}</span>
      </a>`).join("")}
  </div>
</section>

<section class="wrap section">
  <div class="row" style="margin-bottom:20px">
    <h2 class="headline">Modules</h2><span class="spacer"></span>
    <a class="btn text" href="/learn">The course${icon("arrow_forward")}</a>
  </div>
  ${courseCards(solved)}
</section>`,
  };
}

function learn() {
  return {
    nav: "learn",
    title: "Chapters",
    html: `<div class="wrap">
  <header class="learn-head">
    <div class="label">The course</div>
    <h1 class="display-s">Learn to hack.<br><em>Slow and steady wins the race.</em></h1>
    <p class="lede muted">The course is split into modules. Open one to see its chapters: each is a lecture
      on YouTube (generally), a writeup (generally too 🙂), and a real hands-on challenge. When you finish a challenge, mark it done and we'll take your word for it.</p>
    ${account.user ? "" : `<div class="banner info" style="margin-top:24px">${icon("info")}
      <span>No account needed: your progress is saved in this browser. ${account.enabled
        ? `<a href="/login?next=/learn">Sign in with Google</a> to keep it on every device and climb the leaderboard.`
        : `See it on <a href="/progress">your progress page</a>.`}</span></div>`}
  </header>
  ${courseCards(progress.solved())}
</div>`,
  };
}

function modulePage(m) {
  const solved = progress.solved();
  const total = m.challenges.length, done = countDone(m.challenges, solved);
  const n = m.chapters.length;
  return {
    nav: "learn",
    title: `Module ${m.number}: ${m.title}`,
    html: `<div class="wrap">
  <div class="crumbs">
    <a href="/learn">Learn</a>${icon("chevron_right")}
    <span>${esc(m.title)}</span>
  </div>
  <header class="learn-head" style="padding-top:0">
    <div class="label">Module ${m.number}</div>
    <h1 class="display-s">${esc(m.title)}</h1>
    <p class="lede muted">${esc(m.summary)}</p>
    <div class="row" style="gap:8px">
      <span class="chip">${n} ${plural(n, "chapter")}</span>
      <span class="chip ${total && done === total ? "good" : ""}">${done}/${total} challenges completed</span>
    </div>
  </header>
  <div class="grid grid-2">
    ${m.chapters.map((ch) => chapterCard(ch, TONES[ch.number % 3], solved)).join("")}
    ${m === MODULES[MODULES.length - 1] ? comingSoon("chapter") : ""}
  </div>
</div>`,
  };
}

function challengeItem(c, ch, isSolved) {
  return `<details class="chal ${isSolved ? "solved" : ""}" id="${esc(c.slug)}" data-slug="${esc(c.slug)}">
    <summary>
      <span class="state">${icon(isSolved ? "check" : "flag")}</span>
      <span><span class="title-m">${esc(c.title)}</span><br><span class="muted mono" style="font-size:13px">${esc(c.platform)}</span></span>
      <span class="material-symbols-rounded chev">expand_more</span>
    </summary>
    <div class="body">
      <p style="margin-top:0">${esc(c.brief)}</p>
      ${c.details ? `<div class="prose">${c.details}</div>` : ""}
      <div class="row" style="gap:8px">
        ${c.url ? `<a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">${icon("open_in_new")}Open on ${esc(c.platform)}</a>` : ""}
        <button type="button" class="btn ${isSolved ? "tertiary" : "tonal"}" data-done="${esc(c.slug)}" aria-pressed="${isSolved}">
          ${icon(isSolved ? "task_alt" : "check")}<span class="done-label">${isSolved ? "Finished" : "I finished it"}</span></button>
        ${stuckButton(ch, c, "btn text")}
      </div>
    </div>
  </details>`;
}

function chapterPage(ch) {
  const solved = progress.solved();
  const i = CHAPTERS.indexOf(ch);
  const prev = CHAPTERS[i - 1] || null, nxt = CHAPTERS[i + 1] || null;
  const allDone = ch.challenges.every((c) => c.slug in solved);
  // The next chapter opens a different module: say so, so nobody crosses over without noticing.
  const newModule = nxt && nxt.module && nxt.module !== ch.module ? nxt.module : null;
  const prevBtn = (cls = "") => prev
    ? `<a class="btn outlined ${cls}" href="${prev.url}">${icon("arrow_back")}Chapter ${prev.number}</a>`
    // nothing comes before Chapter 0, but it's fun to try
    : `<span class="prev sleepy" data-tip="Do you want it?"><button type="button" class="btn outlined">${icon("arrow_back")}Chapter -1</button></span>`;

  let lecture = "";
  if (ch.hasLecture) {
    lecture = `<section class="lecture" aria-labelledby="lecture-title">
    <h2 class="headline" id="lecture-title">Lecture</h2>
    ${ch.videoId ? `<div class="video-frame">
      <iframe id="lecture-player" src="https://www.youtube.com/embed/${esc(ch.videoId)}?rel=0&playsinline=1"
        title="Chapter ${ch.number} lecture: ${esc(ch.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
    <div class="row lecture-foot">
      <a class="btn outlined sm" href="${ch.videoUrl}" target="_blank" rel="noopener">${icon("open_in_new")}Watch on YouTube</a>
      ${ch.challenges.length ? stuckButton(ch, null, "btn tonal sm") : ""}
      <span class="spacer"></span>
      <span class="muted lecture-note">Watching here counts as a view on YouTube, and that keeps pwnctual free. If it helped, a like and a sub go a long way.</span>
    </div>` : `<div class="lock-card">
      ${icon("videocam")}
      <div>
        <div class="title-m">The lecture for this chapter is coming soon</div>
        <div class="muted">You don't have to wait: the writeup below has everything you need${ch.challenges.length
          ? `, and the ${ch.challenges.length === 1 ? "challenge is" : "challenges are"} open` : ""}.</div>
      </div>
    </div>`}
  </section>`;
  }

  const notes = ch.notes ? `<section class="notes" id="notes" aria-labelledby="notes-title">
      <h2 class="headline" id="notes-title">Writeup</h2>
      ${ch.notesOptional ? '<p class="muted notes-optional">(Reading the writeup is optional for this chapter; you can go to the next chapter.)</p>' : ""}
      <div class="prose">${ch.notes}</div>
    </section>` : "";

  let doneText;
  if (newModule) {
    doneText = `${ch.module ? `That's the end of ${esc(ch.module.title)}. ` : ""}Next up is a new module: <a href="/learn/${newModule.id}">Module ${newModule.number}: ${esc(newModule.title)}</a>.`;
  } else if (nxt) {
    doneText = `On to <a href="${nxt.url}">Chapter ${nxt.number}: ${esc(nxt.title)}</a>.`;
  } else {
    doneText = "The next chapter is on its way. Keep your notes handy: it picks up where this one ends.";
  }

  const challenges = ch.challenges.length ? `<section id="challenges" aria-labelledby="challenges-title">
      <h2 class="headline" id="challenges-title" style="margin:48px 0 20px">${plural(ch.challenges.length, "Challenge")}</h2>
      ${ch.challenges.map((c) => challengeItem(c, ch, c.slug in solved)).join("")}
      <div class="banner ok chapter-done" id="chapter-done"${allDone ? "" : " hidden"} style="margin-top:20px">
        ${icon("celebration")}
        <span><b>Chapter ${ch.number} complete.</b> ${doneText}</span>
      </div>
    </section>` : "";

  // a new module's card holds the chapter buttons itself, so it replaces the usual row
  const nav = newModule ? `<section class="card tone-${newModule.tone} next-module" aria-labelledby="next-module-title">
    <div class="top">
      <div>
        <div class="label">Up next · New module</div>
        <h2 class="headline" id="next-module-title"><a class="stretch" href="/learn/${newModule.id}">Module ${newModule.number}: ${esc(newModule.title)}</a></h2>
        <div class="summary">${esc(newModule.summary)}</div>
      </div>
      <span class="num" aria-hidden="true">M${newModule.number}</span>
    </div>
    <div class="next-module-nav">
      ${prevBtn("prev")}
      <a class="btn outlined see" href="/learn/${newModule.id}">See the module</a>
      <a class="btn next" href="${newModule.chapters[0].url}">Chapter ${newModule.chapters[0].number}${icon("arrow_forward")}</a>
    </div>
  </section>` : `<div class="row chapter-nav">
    ${prev ? prevBtn() : ""}
    ${nxt ? `<a class="btn next" href="${nxt.url}">Chapter ${nxt.number}${icon("arrow_forward")}</a>` : ""}
  </div>`;

  return {
    nav: "learn",
    title: `Chapter ${ch.number}: ${ch.title}`,
    html: `<div class="narrow chapter" id="chapter" data-chapter="${esc(ch.id)}">
  <div class="crumbs">
    <a href="/learn">Learn</a>${icon("chevron_right")}
    ${ch.module ? `<a href="/learn/${ch.module.id}">${esc(ch.module.title)}</a>${icon("chevron_right")}` : ""}
    <span>Chapter ${ch.number}</span>
  </div>
  <div class="label">${ch.module ? `${esc(ch.module.title)} · ` : ""}Chapter ${ch.number}</div>
  <h1 class="display-s" style="margin:8px 0 4px">${esc(ch.title)}</h1>
  ${ch.summary ? `<div class="muted" style="font-size:18px">${esc(ch.summary)}</div>` : ""}
  ${lecture}
  <div class="after-lecture" id="after-lecture">
    ${notes}
    ${challenges}
  </div>
  ${ch.challenges.length ? `<section style="margin-top:48px">${stuckCard(ch)}</section>` : ""}
  ${nav}
</div>`,
  };
}

function ranks() {
  const rank = myRank();
  const cur = rank.tier.index;
  return {
    nav: "ranks",
    title: "Ranks",
    html: `<div class="narrow">
  <h1 class="display-s" style="margin:40px 0 8px">Ranked</h1>
  <p class="muted" style="font-size:18px;max-width:640px">Every challenge you complete counts. Complete enough and you climb through five ranks:
    Noob, Shadow, Demon, Reaper and, at the very top, Ghost. Shadow takes 100 challenges, Demon 500, Reaper 2,500, and
    <b class="ghost-name">Ghost</b> 10,000.</p>

  <div class="card filled" style="margin:32px 0">${rankCard(rank)}</div>

  <div class="ladder" style="margin-top:32px">
    ${[...LADDER].reverse().map((t) => {
      const here = t.index === cur;
      return `<div class="ladder-rank ${here ? "current" : ""} ${cur < t.index ? "locked" : ""} ${t.key === "ghost" ? "apex" : ""}">
        <div style="display:grid;place-items:center">${emblem(t, 132)}</div>
        <div class="stack">
          <div class="row"><span class="headline ${t.key === "ghost" ? "ghost-name" : ""}">${t.name}</span>
            ${here ? `<span class="chip good">${icon("my_location")}You are here</span>` : ""}</div>
          <div class="${here ? "" : "muted"}">${t.motto}</div>
          <div class="ladder-divs">
            <span class="div-pill ${here ? "here" : t.index < cur ? "reached" : ""}">${t.min} ${plural(t.min, "challenge")}</span>
          </div>
        </div>
      </div>`;
    }).join("")}
  </div>
</div>`,
  };
}

const avatar = (login, size = 40) =>
  `<span class="avatar" style="width:${size}px;height:${size}px">${esc(login.slice(0, 1).toUpperCase())}</span>`;

// Rank, stats, per-chapter progress and recent finishes: the body of a profile or the progress page.
function progressSections(solved, mine) {
  const rank = rankFor(Object.keys(solved).length);
  const recent = Object.entries(solved).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const modules = MODULES.map((m, mi) => {
    const rows = m.chapters.filter((ch) => ch.challenges.length).map((ch) => {
      const d = countDone(ch.challenges, solved), total = ch.challenges.length, full = d === total;
      return `<a class="card module-row ${full ? "done" : ""}" href="${ch.url}">
        <span class="badge">${full ? icon("check") : ch.number}</span>
        <div class="info">
          <div class="title-m">Chapter ${ch.number}: ${esc(ch.title)}</div>
          <div class="progress-line"><i style="width:${pct(d, total)}%"></i></div>
        </div>
        <span class="end">
          <span class="chip ${full ? "good" : ""}">${d}/${total}</span>
          <span class="material-symbols-rounded go">arrow_forward</span>
        </span>
      </a>`;
    }).join("");
    return `<div class="label" style="margin:${mi ? "24px" : "0"} 0 12px">${esc(m.title)}</div>
  <div class="module-list">${rows || `<p class="muted" style="margin:0">No challenges in this module yet.</p>`}</div>`;
  }).join("");

  return `<div class="card filled">${rankCard(rank)}</div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card tone-primary"><div class="label" style="color:inherit;opacity:.8">Challenges completed</div><div class="display-s">${rank.score}<span style="font-size:22px;opacity:.7"> / ${TOTAL_CHALLENGES}</span></div></div>
    <div class="card tone-secondary"><div class="label" style="color:inherit;opacity:.8">Ladder</div><div class="display-s">#${rank.tier.index + 1}<span style="font-size:22px;opacity:.7"> / ${LADDER.length}</span></div></div>
  </div>

  <h2 class="headline" style="margin:40px 0 16px">Progress</h2>
  ${modules}

  ${recent.length ? `<h2 class="headline" style="margin:40px 0 16px">Recently finished</h2>
  <div class="lb">
    ${recent.map(([slug, t]) => {
      const c = CHALLENGES[slug];
      return `<a class="lb-row recent" href="${c.chapter.url}#${esc(c.slug)}">
        <span class="avatar" style="background:var(--tertiary);color:var(--on-tertiary)">${icon("flag")}</span>
        <span><b>${esc(c.title)}</b><br><span class="muted mono" style="font-size:13px"><span class="ago" data-t="${t}"></span></span></span>
        <span class="material-symbols-rounded" style="color:var(--tertiary)">check</span>
      </a>`;
    }).join("")}
  </div>` : ""}

  ${mine && rank.score ? `<div class="row" style="margin-top:40px"><button type="button" class="btn outlined sm" data-reset>${icon("restart_alt")}Start over</button></div>` : ""}`;
}

// Your progress while signed out (signed in, /progress goes to your profile).
function progressPage() {
  if (account.user) return { redirect: `/u/${encodeURIComponent(account.user.login)}` };
  return {
    nav: "",
    title: "Your progress",
    html: `<div class="narrow">
  <h1 class="display-s" style="margin:40px 0 8px">Your progress</h1>
  ${account.enabled
    ? `<div class="banner info" style="margin:0 0 24px">${icon("info")}
      <span>This is saved in this browser only. <a href="/login?next=/progress">Sign in with Google</a> to keep it on every device and get on the leaderboard: it comes along with you.</span></div>`
    : `<p class="muted" style="margin:0 0 24px">Saved in this browser. Clearing your browser data clears it too.</p>`}
  ${progressSections(progress.solved(), true)}
</div>`,
  };
}

async function profilePage(login) {
  const mine = account.user?.login === login;
  let solved;
  if (mine) {
    solved = progress.solved();
  } else {
    if (!account.client) return notFound();
    const user = await account.profile(login);
    if (!user) return notFound();
    solved = Object.fromEntries(Object.entries(await account.solvesOf(user.id)).filter(([slug]) => slug in CHALLENGES));
  }
  return {
    nav: "",
    title: login,
    html: `<div class="narrow">
  <div class="row profile-head" style="margin:40px 0 24px;gap:16px">
    ${avatar(login, 64)}
    <div><h1 class="headline">${esc(login)}</h1>${mine ? '<span class="muted">That\'s you</span>' : ""}</div>
    ${mine ? `<span class="spacer"></span>
      <button type="button" class="btn outlined sm" data-signout>${icon("logout")}Sign out</button>` : ""}
  </div>
  ${mine ? `<form class="row" data-rename style="gap:8px;margin:0 0 24px;align-items:flex-end">
    <div class="field" style="flex:1;min-width:200px"><label class="label" for="new-login">Your name on the leaderboard</label>
      <input id="new-login" name="login" value="${esc(login)}" required minlength="2" maxlength="32" pattern="[A-Za-z0-9_\\-]+" autocomplete="off" spellcheck="false"></div>
    <button class="btn tonal">Save</button>
  </form>` : ""}
  ${progressSections(solved, mine)}
</div>`,
  };
}

async function leaderboard() {
  let body;
  if (!account.client) {
    body = `<div class="card outlined" style="text-align:center;padding:48px">
      ${icon("cloud_off", "font-size:48px;color:var(--on-surface-variant)")}
      <div class="title-l" style="margin-top:12px">The leaderboard is offline</div>
      <p class="muted">${account.enabled ? "Couldn't reach it right now. Please try again later." : "Accounts aren't set up on this site yet."}</p>
    </div>`;
  } else {
    const rows = await account.leaderboard(Object.keys(CHALLENGES));
    body = rows.length ? `<div class="lb">
    ${rows.map((r, i) => {
      const t = rankFor(r.score).tier;
      return `<a class="lb-row ${i < 3 ? `top${i + 1}` : ""}" href="/u/${encodeURIComponent(r.login)}">
        <span class="pos">${i + 1}</span>
        ${emblem(t, 48)}
        <span class="row who" style="gap:12px">${avatar(r.login, 36)}<span style="min-width:0"><b>${esc(r.login)}</b><br>
          <span class="${t.key === "ghost" ? "ghost-name" : "muted"}" style="font-size:13px">${t.label}</span></span></span>
        <span class="score">${r.score} <span class="muted" style="font-weight:400;font-size:13px">completed</span></span>
      </a>`;
    }).join("")}
  </div>` : `<div class="card outlined" style="text-align:center;padding:48px">
      ${icon("skull", "font-size:48px;color:var(--on-surface-variant)")}
      <div class="title-l" style="margin-top:12px">Why does this look like a graveyard?</div>
      <p class="muted">Be the first to finish a challenge.</p>
    </div>`;
  }
  return {
    nav: "leaderboard",
    title: "Leaderboard",
    html: `<div class="narrow">
  <h1 class="display-s" style="margin:40px 0 32px">Leaderboard</h1>
  ${body}
</div>`,
  };
}

function loginPage(next) {
  if (account.user) return { redirect: next };
  return {
    nav: "",
    title: "Sign in",
    html: `<div class="narrow" style="max-width:480px;padding-top:48px">
  <div class="card filled" style="padding:40px;text-align:center;border-radius:var(--shape-xxl)">
    <span class="avatar" style="width:72px;height:72px;margin:0 auto;background:var(--primary);color:var(--on-primary);border-radius:24px">
      ${icon("skull", "font-size:40px")}</span>
    <h1 class="headline" style="margin:20px 0 8px">Sign in to pwnctual</h1>
    <p class="muted">Keep your progress on every device and climb the leaderboard. What you've finished in this browser comes along.</p>
    ${account.client ? `<button type="button" class="btn lg" style="width:100%;margin-top:20px" data-google data-next="${esc(next)}">
      <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Continue with Google</button>
    <p class="muted" style="font-size:13px;margin:16px 0 0">You'll get a random name like hacker-1a2b3c. Change it on your profile: it's what the leaderboard shows, never your Google name or email.</p>`
    : `<div class="banner info" style="margin-top:16px;text-align:left">${icon("info")}
      <span>${account.enabled ? "Sign-in is unavailable right now. Please try again later." : "Sign-in isn't set up on this site yet. Your progress is still saved in this browser."}</span></div>`}
  </div>
</div>`,
  };
}

function offline() {
  return {
    nav: "",
    title: "Couldn't load",
    html: `<div class="narrow" style="text-align:center;padding-top:96px">
  ${icon("cloud_off", "font-size:96px;color:var(--primary)")}
  <h1 class="display-s">Couldn't load this page</h1>
  <p class="muted" style="font-size:18px">Check your connection and try again.</p>
  <a class="btn" href="/">Back home</a>
</div>`,
  };
}

function notFound() {
  return {
    nav: "",
    title: "Not found",
    html: `<div class="narrow" style="text-align:center;padding-top:96px">
  ${icon("skull", "font-size:96px;color:var(--primary)")}
  <h1 class="display-l">404</h1>
  <p class="muted" style="font-size:18px">Nothing haunts this page.</p>
  <a class="btn" href="/">Back home</a>
</div>`,
  };
}

export const pages = { home, learn, modulePage, chapterPage, ranks, progressPage, profilePage, leaderboard, loginPage, offline, notFound };
