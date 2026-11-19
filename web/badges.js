// Badges: proof you finished something. Starters have none.
// The rules are in badge-rules.js. Shown on profiles, and as a big reveal the moment you earn one.
import { COURSE } from "./course-data.js";
import { badgesOf, chapterPct } from "./badge-rules.js";
export { badgesOf };

export const BADGES = {
  "hello-world": { name: "Hello, World", for: "Finished Chapter 1: Introduction to computer science" },
};

// What to do for the first badge, for someone with none: { text, pct }
export function firstBadgeHint(done) {
  const set = done instanceof Set ? done : new Set(done);
  return { text: `Finish Chapter 1 to earn your first badge: ${BADGES["hello-world"].name}.`, pct: chapterPct(COURSE[0], set) };
}

// ---- The Hello, World badge: 1-bit pixel art, like the first computer screens. A globe on a medal, with ribbons. ----
// Black and white only: ink is the text color, paper the background, so it flips with dark mode.

const W = 33;
const H = 44;
const C = 16; // center of the medal

// The "?" shown before the badge is opened
const QUESTION = [
  ".#####.",
  "##...##",
  "##...##",
  ".....##",
  "...###.",
  "...##..",
  "...##..",
  ".......",
  "...##..",
];

// What each pixel is: "i" ink, "p" paper, or null (nothing)
function pixel(x, y, mystery) {
  const dx = x - C;
  const dy = y - C;
  const d = Math.hypot(dx, dy);
  if (d <= 15.6) {
    if (d > 14) return "i"; // outer ring
    if (d > 12.6) return "p";
    if (d > 10.8) return "i"; // the medal's face
    if (mystery) {
      const qx = dx + 3;
      const qy = dy + 4;
      return QUESTION[qy]?.[qx] === "#" ? "i" : "p";
    }
    // The globe: equator, two latitude lines, the middle meridian and one ring of longitude
    if (dy === 0 || Math.abs(dy) === 5 || dx === 0) return "i";
    if (Math.abs(dy) < 10 && Math.abs(Math.abs(dx) - Math.round(5.5 * Math.sqrt(1 - (dy / 10.6) ** 2))) === 0) return "i";
    return "p";
  }
  // Two ribbons hanging below, notched at the bottom, a stripe down each
  if (y >= 26 && y <= 43) {
    const spread = Math.round((y - 26) / 4);
    for (const mid of [12 - spread, 20 + spread]) {
      const off = Math.abs(x - mid);
      if (off <= 2 && !(y >= 42 && off <= y - 42)) return off === 0 && y < 41 ? "p" : "i";
    }
  }
  return null;
}

export function emblem(badge, { mystery = false } = {}) {
  let ink = "";
  let paper = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = pixel(x, y, mystery);
      if (p === "i") ink += `M${x} ${y}h1v1h-1z`;
      else if (p === "p") paper += `M${x} ${y}h1v1h-1z`;
    }
  }
  return `<svg class="emblem" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">
    <path class="px-paper" d="${paper}"/><path class="px-ink" d="${ink}"/></svg>`;
}

// ---- Badge unlocked! ----

const SEEN = "pwnctual:badges";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Call after progress changes: shows the reveal for a badge earned since last time.
// kept is the badges the server says this person already has ([{ id }], empty when not signed in).
export function checkNewBadges(done, kept = []) {
  const earned = new Set([...badgesOf(done), ...kept.map((b) => b.id)]);
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN) || "[]"); } catch {}
  const fresh = [...earned].filter((b) => !seen.includes(b) && BADGES[b]);
  if (!fresh.length) return;
  try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seen, ...earned])])); } catch {}
  showUnlock(fresh[0]);
}

// Sounds made on the spot: a thud for each tap, then a big chord when it opens
let audio;
function sound(kind, r) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const a = audio;
    const now = a.currentTime;
    const out = a.createGain();
    out.gain.value = 0.18;
    out.connect(a.destination);
    if (kind === "tap") {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(180 + r * 40, now);
      o.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      o.connect(g).connect(out);
      o.start(now);
      o.stop(now + 0.15);
      return;
    }
    // Boom
    const boom = a.createOscillator();
    const bg = a.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(140, now);
    boom.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    bg.gain.setValueAtTime(1, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    boom.connect(bg).connect(out);
    boom.start(now);
    boom.stop(now + 0.6);
    // A big chord, then sparkles
    const root = 261.63 * Math.pow(2, r / 6);
    [0, 4, 7, 12, 16].forEach((st, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = i % 2 ? "triangle" : "sawtooth";
      o.frequency.value = root * Math.pow(2, st / 12);
      const t = now + 0.08 + i * 0.07;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 1.5);
    });
    for (let i = 0; i < 8 + r * 3; i++) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.frequency.value = 1500 + Math.random() * 2500;
      const t = now + 0.5 + Math.random() * 0.9;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.2);
    }
  } catch {}
}

// The full screen reveal. Like opening a drop: tap it a few times and it bursts open.
export function showUnlock(badge) {
  document.querySelector(".unlock")?.remove();
  const b = BADGES[badge];
  const el = document.createElement("div");
  el.className = "unlock";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", `Badge unlocked: ${b.name}`);
  el.tabIndex = -1;
  const n = 60;
  const confetti = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 180 + Math.random() * 320;
    const size = 6 + Math.random() * 12;
    const color = "#fff";
    return `<i style="--x:${Math.cos(angle) * dist}px;--y:${Math.sin(angle) * dist}px;--s:${Math.round(size)}px;--r:${Math.random() * 720 - 360}deg;--d:${(Math.random() * 0.25).toFixed(2)}s;background:${color}"></i>`;
  }).join("");
  el.innerHTML = `
    <div class="ul-bg"></div>
    <div class="ul-confetti">${confetti}</div>
    <div class="ul-flash"></div>
    <div class="ul-stage">
      <button class="ul-drop" type="button" aria-label="Tap to open">
        <span class="ul-mystery">${emblem(badge, { mystery: true })}</span>
        <span class="ul-emblem">${emblem(badge)}</span>
      </button>
      <p class="ul-hint">Tap to open!</p>
      <p class="ul-kicker">Badge unlocked!</p>
      <p class="ul-name">${b.name}</p>
      <p class="ul-for">${b.for}</p>
      <p class="ul-tap">Tap anywhere to continue</p>
    </div>`;
  document.body.append(el);
  document.body.classList.add("unlock-open");
  el.focus();

  const drop = el.querySelector(".ul-drop");
  let taps = 0;
  let opened = false;
  const need = reduced() ? 1 : 3;
  const close = () => {
    el.classList.add("closing");
    document.body.classList.remove("unlock-open");
    setTimeout(() => el.remove(), 350);
  };
  el.addEventListener("click", () => {
    if (!opened) {
      taps++;
      sound("tap", taps);
      el.dataset.taps = String(Math.min(taps, 3));
      drop.classList.remove("hit");
      void drop.offsetWidth;
      drop.classList.add("hit");
      if (taps >= need) {
        opened = true;
        sound("open", 1);
        el.classList.add("opened");
        setTimeout(() => el.classList.add("done"), reduced() ? 0 : 1400);
      }
      return;
    }
    if (el.classList.contains("done")) close();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); el.click(); }
  });
}

// See the reveal: add ?badge=hello-world to a page's address
const preview = new URLSearchParams(location.search).get("badge");
if (preview && BADGES[preview]) addEventListener("load", () => showUnlock(preview));
