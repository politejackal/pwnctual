// Ranks: Common → Uncommon → Rare → Legendary → Mythic.
// Everybody starts Common. Finishing a chapter makes you Uncommon. The rest are a secret for now.
// Shown on profiles, around the avatar in the top bar, and as a big reveal when you rank up.
import { COURSE } from "./course-data.js";

export const RANKS = [
  { id: "common", name: "Common", need: "Where everybody starts", c: ["#f4f7fb", "#a9b4c4", "#56627a"] },
  { id: "uncommon", name: "Uncommon", need: "Finish a chapter", c: ["#d9ff9e", "#3ddc5a", "#0b7a34"] },
  { id: "rare", name: "Rare", need: null, c: ["#c9ecff", "#2f9bff", "#1238c4"] },
  { id: "legendary", name: "Legendary", need: null, c: ["#fff7b8", "#ffc81f", "#d06a00"] },
  { id: "mythic", name: "Mythic", need: null, c: ["#ffc2e2", "#ff2e63", "#8a00d4"] },
];

const keyOf = (c, m, l) => `${c.id}/${m.id}/${l.id}`;
const chapterKeys = (c) => c.modules.flatMap((m) => m.lessons.map((l) => keyOf(c, m, l)));
const chapterPct = (c, done) => {
  const keys = chapterKeys(c);
  return keys.length ? Math.round((keys.filter((k) => done.has(k)).length / keys.length) * 100) : 0;
};

// Which rank (an index into RANKS) this list of finished lessons earns
export function rankOf(done) {
  const set = done instanceof Set ? done : new Set(done);
  let r = 0;
  if (COURSE.some((c) => chapterPct(c, set) === 100)) r = 1;
  return r;
}

// What to do for the next rank: { rank, text, pct } (pct only when there's a bar to show)
export function nextStep(done) {
  const set = done instanceof Set ? done : new Set(done);
  const r = rankOf(set);
  const next = RANKS[r + 1];
  if (!next) return null;
  if (r === 0) {
    const best = COURSE.reduce((a, c) => (chapterPct(c, set) > chapterPct(a, set) ? c : a), COURSE[0]);
    const i = COURSE.indexOf(best);
    return { rank: next, text: `Finish Chapter ${i + 1} to rank up to ${next.name}.`, pct: chapterPct(best, set) };
  }
  return { rank: next, text: `How to reach ${next.name} is a secret. Keep going!` };
}

// ---- The emblem: a chunky shield that gets crazier with every rank ----

let uid = 0;
export function emblem(r, { mystery = false } = {}) {
  const k = RANKS[r];
  const id = `rk${++uid}`;
  const [c1, c2, c3] = mystery ? ["#3a3f4d", "#1b1f29", "#0b0d12"] : k.c;
  const ink = "#0b0d12";
  const shield = "M60 10 L102 26 V64 C102 88 82 104 60 112 C38 104 18 88 18 64 V26 Z";
  const inner = "M60 22 L91 34 V63 C91 81 77 93 60 99 C43 93 29 81 29 63 V34 Z";

  // Wings for Legendary and Mythic, horns too for Mythic
  const wing = (s) => `<g transform="translate(${s < 0 ? 120 : 0} 0) scale(${s} 1)">
      <path d="M22 40 C4 38 -2 52 2 66 C8 60 12 60 16 64 C6 70 6 82 12 90 C16 82 20 80 24 82 Z" fill="url(#${id}w)" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
    </g>`;
  const wings = !mystery && r >= 3 ? wing(1) + wing(-1) : "";
  const horns = !mystery && r >= 4
    ? `<path d="M38 18 C30 6 22 4 14 6 C24 10 28 18 30 26 Z M82 18 C90 6 98 4 106 6 C96 10 92 18 90 26 Z" fill="url(#${id}w)" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`
    : "";

  // The symbol in the middle: 1, 2, 3 chevrons, then a crown, then a crown with a star
  const chevron = (y) => `<path d="M40 ${y} L60 ${y + 12} L80 ${y}" fill="none" stroke="${ink}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 ${y} L60 ${y + 12} L80 ${y}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const crown = `<path d="M38 76 L34 48 L48 60 L60 42 L72 60 L86 48 L82 76 Z" fill="#fff" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="60" cy="66" r="5" fill="${c2}" stroke="${ink}" stroke-width="3"/>`;
  const star = `<path d="M60 26 L64 36 L75 36 L66 43 L69 54 L60 47 L51 54 L54 43 L45 36 L56 36 Z" fill="#fff" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
  let symbol;
  if (mystery) symbol = `<text x="60" y="80" text-anchor="middle" font-family="'Lilita One', sans-serif" font-size="52" fill="#fff" stroke="${ink}" stroke-width="5" paint-order="stroke">?</text>`;
  else if (r <= 2) symbol = [0, 1, 2].slice(0, r + 1).map((i) => chevron(64 - r * 9 + i * 18)).join("");
  else if (r === 3) symbol = crown;
  else symbol = crown.replace(/M38 76 L34 48 L48 60 L60 42 L72 60 L86 48 L82 76 Z/, "M38 84 L34 58 L48 70 L60 52 L72 70 L86 58 L82 84 Z").replace('cy="66"', 'cy="76"') + star;

  return `<svg class="emblem" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <clipPath id="${id}c"><path d="${shield}"/></clipPath>
    </defs>
    ${wings}${horns}
    <path d="${shield}" fill="url(#${id}g)" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>
    <g clip-path="url(#${id}c)">
      <path d="M0 0 H120 V46 C90 56 30 56 0 46 Z" fill="#fff" opacity=".22"/>
      <rect class="emblem-shine" x="-60" y="-10" width="26" height="140" fill="#fff" opacity=".45" transform="skewX(-20)"/>
    </g>
    <path d="${inner}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linejoin="round"/>
    ${symbol}
  </svg>`;
}

// The chunky rank font, loaded the first time a rank is drawn
let fontLoaded = false;
export function rankFont() {
  if (fontLoaded) return;
  fontLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Lilita+One&display=swap";
  document.head.append(link);
}

// The colors of a rank, as CSS variables on an element
export function paint(el, r) {
  const [c1, c2, c3] = RANKS[r].c;
  el.style.setProperty("--c1", c1);
  el.style.setProperty("--c2", c2);
  el.style.setProperty("--c3", c3);
  el.classList.add(`r-${RANKS[r].id}`);
}

// ---- Rank up! ----

const SEEN = "pwnctual:rank";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Call after progress changes: shows the reveal when the rank went up since last time
export function checkRankUp(done) {
  const r = rankOf(done);
  let seen = 0;
  try { seen = Number(localStorage.getItem(SEEN)) || 0; } catch {}
  if (r > seen) {
    try { localStorage.setItem(SEEN, String(r)); } catch {}
    showRankUp(r);
  }
}

// Sounds made on the spot: a rising rumble while it charges, then a big chord when it opens
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
    // A chord that climbs higher with every rank, then sparkles
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
export function showRankUp(r) {
  rankFont();
  document.querySelector(".rankup")?.remove();
  const k = RANKS[r];
  const el = document.createElement("div");
  el.className = "rankup";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", `Rank up: ${k.name}`);
  el.tabIndex = -1;
  paint(el, r);
  const confetti = Array.from({ length: 36 + r * 14 }, (_, i) => {
    const angle = (i / (36 + r * 14)) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 180 + Math.random() * 320;
    const size = 6 + Math.random() * 12;
    const color = ["var(--c1)", "var(--c2)", "#fff"][i % 3];
    return `<i style="--x:${Math.cos(angle) * dist}px;--y:${Math.sin(angle) * dist}px;--s:${size}px;--r:${Math.random() * 720 - 360}deg;--d:${(Math.random() * 0.25).toFixed(2)}s;background:${color}"></i>`;
  }).join("");
  el.innerHTML = `
    <div class="ru-bg"></div>
    <div class="ru-rays"></div>
    <div class="ru-confetti">${confetti}</div>
    <div class="ru-flash"></div>
    <div class="ru-stage">
      <button class="ru-drop" type="button" aria-label="Tap to open">
        <span class="ru-mystery">${emblem(r, { mystery: true })}</span>
        <span class="ru-emblem">${emblem(r)}</span>
      </button>
      <p class="ru-hint">Tap to open!</p>
      <p class="ru-kicker">Rank up!</p>
      <p class="ru-name">${k.name}</p>
      <p class="ru-tap">Tap anywhere to continue</p>
    </div>`;
  document.body.append(el);
  document.body.classList.add("rankup-open");
  el.focus();

  const drop = el.querySelector(".ru-drop");
  let taps = 0;
  let opened = false;
  const need = reduced() ? 1 : 3;
  const close = () => {
    el.classList.add("closing");
    document.body.classList.remove("rankup-open");
    setTimeout(() => el.remove(), 350);
  };
  const open = () => {
    opened = true;
    sound("open", r);
    el.classList.add("opened");
    setTimeout(() => el.classList.add("done"), reduced() ? 0 : 1300);
  };
  el.addEventListener("click", (e) => {
    if (!opened) {
      taps++;
      sound("tap", taps);
      el.dataset.taps = String(Math.min(taps, 3));
      drop.classList.remove("hit");
      void drop.offsetWidth;
      drop.classList.add("hit");
      if (taps >= need) open();
      return;
    }
    if (el.classList.contains("done")) close();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); el.click(); }
  });
}

// See the reveal for any rank: add ?rankup=mythic (or any rank) to a page's address
const preview = new URLSearchParams(location.search).get("rankup");
if (preview) {
  const r = RANKS.findIndex((k) => k.id === preview.toLowerCase());
  if (r >= 0) addEventListener("load", () => showRankUp(r));
}
