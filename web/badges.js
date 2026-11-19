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

// ---- The Hello, World badge: a medal with a glowing wireframe globe, ribbons and a banner. It doesn't move. ----

let uid = 0;
const INK = "#0b0d12";
export function emblem(badge, { mystery = false } = {}) {
  const id = `bd${++uid}`;
  const defs = `<defs>
      <linearGradient id="${id}gold" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff5c4"/><stop offset=".45" stop-color="#f5c542"/><stop offset="1" stop-color="#a86a12"/></linearGradient>
      <radialGradient id="${id}space" cx=".42" cy=".36" r=".75"><stop offset="0" stop-color="#173a5c"/><stop offset=".7" stop-color="#0b1a2e"/><stop offset="1" stop-color="#050a14"/></radialGradient>
      <radialGradient id="${id}globe" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#1f8f6a"/><stop offset=".6" stop-color="#0b4a3d"/><stop offset="1" stop-color="#062a24"/></radialGradient>
      <linearGradient id="${id}rib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c3a6"/><stop offset="1" stop-color="#0e6e60"/></linearGradient>
      <clipPath id="${id}g"><circle cx="80" cy="74" r="33"/></clipPath>
      <filter id="${id}f" x="-.3" y="-.3" width="1.6" height="1.6"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
  const svg = (body) => `<svg class="emblem" viewBox="0 0 160 180" aria-hidden="true">${defs}${body}</svg>`;

  if (mystery) {
    return svg(`<circle cx="80" cy="80" r="60" fill="#1b1f29" stroke="${INK}" stroke-width="7"/>
      <circle cx="80" cy="80" r="47" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>
      <text x="80" y="102" text-anchor="middle" font-family="'Lilita One', sans-serif" font-size="66" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">?</text>`);
  }

  const green = "#7dffc8";
  // The globe: lines of longitude and latitude, glowing like a terminal
  const lon = [33, 22, 10].map((rx) => `<ellipse cx="80" cy="74" rx="${rx}" ry="33"/>`).join("");
  const lat = [-22, -11, 0, 11, 22].map((dy) => {
    const half = Math.sqrt(33 * 33 - dy * dy);
    return `<ellipse cx="80" cy="${74 + dy}" rx="${half.toFixed(1)}" ry="${(half * 0.16).toFixed(1)}"/>`;
  }).join("");
  return svg(`
    <path d="M52 112 L36 172 L50 162 L60 176 L74 118 Z" fill="url(#${id}rib)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M108 112 L124 172 L110 162 L100 176 L86 118 Z" fill="url(#${id}rib)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="80" cy="74" r="62" fill="url(#${id}gold)" stroke="${INK}" stroke-width="7"/>
    <circle cx="80" cy="74" r="53" fill="none" stroke="#fff6cf" stroke-opacity=".7" stroke-width="2" stroke-dasharray="2 5"/>
    <circle cx="80" cy="74" r="47" fill="url(#${id}space)" stroke="${INK}" stroke-width="5"/>
    <circle cx="58" cy="44" r="1.4" fill="#fff"/><circle cx="108" cy="50" r="1.1" fill="#fff"/><circle cx="104" cy="98" r="1.3" fill="#fff" opacity=".7"/><circle cx="54" cy="96" r="1" fill="#fff" opacity=".7"/>
    <circle cx="80" cy="74" r="33" fill="url(#${id}globe)" stroke="${INK}" stroke-width="3.5"/>
    <g clip-path="url(#${id}g)" fill="none" stroke="${green}" stroke-width="1.6" filter="url(#${id}f)">${lon}${lat}</g>
    <path d="M60 52 C66 46 74 44 80 44" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="80" cy="74" rx="50" ry="13" transform="rotate(-18 80 74)" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="70 12" opacity=".85"/>
    <circle cx="124" cy="58" r="4.5" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    <path d="M20 112 L30 104 L130 104 L140 112 L130 120 L30 120 Z" fill="#0d1118" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M24 104 L14 98 L22 112 L14 126 L28 120" fill="url(#${id}gold)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M136 104 L146 98 L138 112 L146 126 L132 120" fill="url(#${id}gold)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M30 104 L130 104 L136 108 L24 108 Z" fill="#f5c542"/>
    <path d="M24 116 L136 116 L130 120 L30 120 Z" fill="#f5c542"/>
    <text x="80" y="116.5" text-anchor="middle" font-family="'Google Sans Code', ui-monospace, monospace" font-size="12.5" font-weight="700" fill="${green}">Hello, World!</text>`);
}

// The chunky reveal font, loaded the first time the reveal shows
let fontLoaded = false;
function revealFont() {
  if (fontLoaded) return;
  fontLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Lilita+One&display=swap";
  document.head.append(link);
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
  revealFont();
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
    const color = ["#f5c542", "#7dffc8", "#fff", "#22c3a6"][i % 4];
    return `<i style="--x:${Math.cos(angle) * dist}px;--y:${Math.sin(angle) * dist}px;--s:${size}px;--r:${Math.random() * 720 - 360}deg;--d:${(Math.random() * 0.25).toFixed(2)}s;background:${color}"></i>`;
  }).join("");
  el.innerHTML = `
    <div class="ul-bg"></div>
    <div class="ul-rays"></div>
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
