// Ranks: Common → Uncommon → Rare → Legendary → Mythic.
// Everybody starts Common. Finishing the first chapter makes you Uncommon. The rest are a secret for now.
// Once earned, a rank stays. The rules are in rank-rules.js.
// Shown on profiles, around the avatar in the top bar, and as a big reveal when you rank up.
import { COURSE } from "./course-data.js";
import { rankOf, chapterPct } from "./rank-rules.js";
export { rankOf };

export const RANKS = [
  { id: "common", name: "Common", need: "Where everybody starts", c: ["#f4f7fb", "#a9b4c4", "#56627a"] },
  { id: "uncommon", name: "Uncommon", need: "Finish first chapter", c: ["#d9ff9e", "#3ddc5a", "#0b7a34"] },
  { id: "rare", name: "Rare", need: null, c: ["#c9ecff", "#2f9bff", "#1238c4"] },
  { id: "legendary", name: "Legendary", need: null, c: ["#fff7b8", "#ffc81f", "#d06a00"] },
  { id: "mythic", name: "Mythic", need: null, c: ["#ffc2e2", "#ff2e63", "#8a00d4"] },
];

// What to do for the next rank, for someone at rank r: { rank, text, pct } (pct only when there's a bar)
export function nextStep(done, r) {
  const set = done instanceof Set ? done : new Set(done);
  const next = RANKS[r + 1];
  if (!next) return null;
  if (r === 0) return { rank: next, text: `Finish Chapter 1 to rank up to ${next.name}.`, pct: chapterPct(COURSE[0], set) };
  return { rank: next, text: `How to reach ${next.name} is a secret. Keep going!` };
}

// ---- The emblem: a different character for every rank ----
// Common: an old computer with a blinking cursor. Uncommon: a hooded hacker, code raining in the hood.
// Rare: a cyborg with a scanning visor. Legendary: a crowned skull on fire, with wings.
// Mythic: a giant horned eye in a spinning portal that looks around and blinks.

let uid = 0;
const INK = "#0b0d12";
const pt = (r, deg) => [60 + r * Math.cos((deg * Math.PI) / 180), 60 + r * Math.sin((deg * Math.PI) / 180)];
function skull(id, r, eye) {
  const glow = r >= 1;
  const eyes = glow
    ? `<g filter="url(#${id}f)"><ellipse class="e-eye" cx="50" cy="60" rx="6.5" ry="7.5" fill="${eye}"/><ellipse class="e-eye" cx="70" cy="60" rx="6.5" ry="7.5" fill="${eye}"/></g>
       <ellipse cx="50" cy="60" rx="2.6" ry="3" fill="#fff"/><ellipse cx="70" cy="60" rx="2.6" ry="3" fill="#fff"/>`
    : `<ellipse cx="50" cy="60" rx="6.5" ry="7.5" fill="${INK}"/><ellipse cx="70" cy="60" rx="6.5" ry="7.5" fill="${INK}"/>`;
  const horns = r >= 4
    ? `<path d="M41 50 C30 42 26 28 32 14 C36 28 44 36 52 40 Z M79 50 C90 42 94 28 88 14 C84 28 76 36 68 40 Z" fill="url(#${id}h)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    : "";
  const crown = r >= 3
    ? `<path d="M44 40 L41 22 L51 31 L60 17 L69 31 L79 22 L76 40 Z" fill="url(#${id}w)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
       <circle cx="60" cy="31" r="3.4" fill="#fff" stroke="${INK}" stroke-width="2"/>
       <circle cx="49" cy="35" r="2.4" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="71" cy="35" r="2.4" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`
    : "";
  const third = r >= 4
    ? `<path filter="url(#${id}f)" class="e-eye" d="M60 44 L64 49 L60 54 L56 49 Z" fill="${eye}"/><path d="M60 46 L62 49 L60 52 L58 49 Z" fill="#fff"/>`
    : "";
  return `${horns}
    <path d="M60 36 C45 36 36 46 36 58 C36 66 40 71 44 73 L44 81 C44 83.5 46 85 48 85 L72 85 C74 85 76 83.5 76 81 L76 73 C80 71 84 66 84 58 C84 46 75 36 60 36 Z" fill="#f4f6fa" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M44 50 C46 42 54 39 60 39" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    ${eyes}
    <path d="M60 66 L56 73 L64 73 Z" fill="${INK}"/>
    <path d="M53 77 V85 M60 77 V85 M67 77 V85" stroke="${INK}" stroke-width="2.6"/>
    ${third}${crown}`;
}

const bones = (fill) => [-38, 38].map((a) => `<g transform="rotate(${a} 60 64)">
      <rect x="20" y="59" width="80" height="10" rx="5" fill="${fill}" stroke="${INK}" stroke-width="4"/>
      <circle cx="20" cy="59" r="6" fill="${fill}" stroke="${INK}" stroke-width="4"/><circle cx="20" cy="69" r="6" fill="${fill}" stroke="${INK}" stroke-width="4"/>
      <circle cx="100" cy="59" r="6" fill="${fill}" stroke="${INK}" stroke-width="4"/><circle cx="100" cy="69" r="6" fill="${fill}" stroke="${INK}" stroke-width="4"/>
      <rect x="20" y="60.5" width="80" height="7" rx="3.5" fill="${fill}"/>
    </g>`).join("");

// Flames licking up around the badge
function flames(id, outer, inner) {
  const one = (deg, len, w, fill) => {
    const [bx1, by1] = pt(40, deg - w);
    const [bx2, by2] = pt(40, deg + w);
    const [tx, ty] = pt(40 + len, deg);
    const [c1x, c1y] = pt(40 + len * 0.55, deg - w * 1.6);
    const [c2x, c2y] = pt(40 + len * 0.55, deg + w * 1.6);
    return `<path d="M${bx1.toFixed(1)} ${by1.toFixed(1)} Q${c1x.toFixed(1)} ${c1y.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} Q${c2x.toFixed(1)} ${c2y.toFixed(1)} ${bx2.toFixed(1)} ${by2.toFixed(1)} Z" fill="${fill}"/>`;
  };
  const angles = [-162, -138, -114, -90, -66, -42, -18];
  const lens = [16, 30, 42, 54, 42, 30, 16];
  return `<g class="e-flame" stroke="${INK}" stroke-width="4" stroke-linejoin="round">${angles.map((a, i) => one(a, lens[i], 15, outer)).join("")}</g>
    <g class="e-flame e-flame2">${angles.map((a, i) => one(a, lens[i] * 0.6, 8, inner)).join("")}</g>`;
}

function wings(id) {
  const feathers = `
    <path d="M26 42 C10 18 -10 10 -18 16 C-8 28 2 42 18 58 Z"/>
    <path d="M20 56 C0 46 -16 52 -20 62 C-6 66 6 68 20 70 Z"/>
    <path d="M22 70 C4 76 -10 92 -8 102 C4 94 16 86 30 80 Z"/>`;
  const side = (flip) => `<g ${flip ? 'transform="translate(120 0) scale(-1 1)" ' : ""}fill="url(#${id}w)" stroke="${INK}" stroke-width="4" stroke-linejoin="round">${feathers}</g>`;
  return `<g class="e-wings">${side(false)}${side(true)}</g>`;
}

const sparkle = (x, y, n) => `<path class="e-twinkle" style="animation-delay:${n * 0.25}s" d="M${x} ${y - 7} L${x + 1.8} ${y - 1.8} L${x + 7} ${y} L${x + 1.8} ${y + 1.8} L${x} ${y + 7} L${x - 1.8} ${y + 1.8} L${x - 7} ${y} L${x - 1.8} ${y - 1.8} Z" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;

export function emblem(r, { mystery = false } = {}) {
  const id = `rk${++uid}`;
  const [c1, c2, c3] = mystery ? ["#3a3f4d", "#1b1f29", "#0b0d12"] : RANKS[r].c;
  const defs = `<defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${c1}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
      <radialGradient id="${id}d" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="${c2}"/><stop offset=".65" stop-color="${c3}"/><stop offset="1" stop-color="${INK}"/></radialGradient>
      <radialGradient id="${id}i" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${c1}"/><stop offset=".7" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></radialGradient>
      <filter id="${id}f" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
  const wrap = (body, box = "-20 -20 160 160") => `<svg class="emblem" viewBox="${box}" aria-hidden="true">${defs}${body}</svg>`;
  const shine = (shape) => `<clipPath id="${id}c">${shape}</clipPath>
    <g clip-path="url(#${id}c)">
      <path d="M-20 -20 H140 V44 C100 54 20 54 -20 44 Z" fill="#fff" opacity=".2"/>
      <rect class="emblem-shine" x="-60" y="-20" width="26" height="170" fill="#fff" opacity=".4" transform="skewX(-20)"/>
    </g>`;

  if (mystery) {
    const shield = "M60 6 L106 23 V62 C106 90 85 106 60 116 C35 106 14 90 14 62 V23 Z";
    return wrap(`<path d="${shield}" fill="url(#${id}g)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      ${shine(`<path d="${shield}"/>`)}
      <text x="60" y="82" text-anchor="middle" font-family="'Lilita One', sans-serif" font-size="58" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">?</text>`, "-2 -2 124 124");
  }

  if (r === 0) {
    // Common: an old computer, a cursor blinking on its screen
    const body = `<rect x="10" y="14" width="100" height="78" rx="16"/>`;
    return wrap(`<rect x="44" y="88" width="32" height="14" fill="url(#${id}d)" stroke="${INK}" stroke-width="5"/>
      <rect x="26" y="98" width="68" height="14" rx="7" fill="url(#${id}g)" stroke="${INK}" stroke-width="6"/>
      <rect x="10" y="14" width="100" height="78" rx="16" fill="url(#${id}g)" stroke="${INK}" stroke-width="7"/>
      ${shine(body)}
      <rect x="22" y="25" width="76" height="54" rx="9" fill="#0d1118" stroke="${INK}" stroke-width="4"/>
      <path d="M22 34 H98 M22 44 H98 M22 54 H98 M22 64 H98 M22 74 H98" stroke="#fff" stroke-opacity=".05" stroke-width="3"/>
      <path d="M34 40 L48 52 L34 64" fill="none" stroke="${c1}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect class="e-blink" x="54" y="59" width="22" height="6.5" rx="2" fill="${c1}"/>
      <circle cx="96" cy="86" r="3" fill="#7dff8a" stroke="${INK}" stroke-width="1.5"/>`, "-2 -2 124 124");
  }

  if (r === 1) {
    // Uncommon: a hooded hacker. Glowing eyes, code raining inside the hood.
    const hood = "M60 4 C90 4 110 30 110 62 L110 98 C110 110 102 116 90 116 L30 116 C18 116 10 110 10 98 L10 62 C10 30 30 4 60 4 Z";
    const face = "M60 26 C80 26 92 44 92 64 C92 86 78 102 60 104 C42 102 28 86 28 64 C28 44 40 26 60 26 Z";
    const col = (x, d, text) => `<text class="e-rain" style="animation-delay:${d}s" x="${x}" y="0" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="${c2}" writing-mode="tb" letter-spacing="1">${text}</text>`;
    return wrap(`<path d="${hood}" fill="url(#${id}g)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      ${shine(`<path d="${hood}"/>`)}
      <path d="M22 50 C26 30 40 16 60 14 M98 50 C94 30 80 16 60 14 M18 96 C22 84 26 76 30 72 M102 96 C98 84 94 76 90 72" fill="none" stroke="${c3}" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
      <path d="${face}" fill="#05070a" stroke="${INK}" stroke-width="5"/>
      <clipPath id="${id}r"><path d="${face}"/></clipPath>
      <g clip-path="url(#${id}r)" opacity=".55">${col(36, 0, "10110100")}${col(48, -0.9, "01001101")}${col(60, -0.4, "11010010")}${col(72, -1.3, "00101101")}${col(84, -0.7, "10011010")}</g>
      <g class="e-lid" filter="url(#${id}f)">
        <path d="M40 60 L56 65 L54 71 L41 67 Z" fill="${c1}"/>
        <path d="M80 60 L64 65 L66 71 L79 67 Z" fill="${c1}"/>
      </g>
      <path d="M48 104 V112 M72 104 V112" stroke="#f4f6fa" stroke-width="3" stroke-linecap="round"/>
      <circle cx="48" cy="113" r="3" fill="#f4f6fa" stroke="${INK}" stroke-width="1.5"/><circle cx="72" cy="113" r="3" fill="#f4f6fa" stroke="${INK}" stroke-width="1.5"/>`, "-2 -2 124 124");
  }

  if (r === 2) {
    // Rare: a cyborg. Scanning visor, sparking antenna, lightning out the sides.
    const head = "M26 34 Q26 16 44 16 H76 Q94 16 94 34 V74 Q94 86 82 88 V104 H38 V88 Q26 86 26 74 Z";
    const bolt = `<path d="M-4 28 L14 28 L6 50 L20 50 L-10 92 L0 60 L-14 60 Z" fill="#fff6a8" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    const ear = (x) => `<circle cx="${x}" cy="54" r="10" fill="url(#${id}w)" stroke="${INK}" stroke-width="5"/><path d="M${x - 4} 54 H${x + 4} M${x} 50 V58" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
    return wrap(`${bolt}<g transform="translate(120 0) scale(-1 1)">${bolt}</g>
      <path d="M60 16 V-2" stroke="${INK}" stroke-width="5"/>
      <circle class="e-spark" cx="60" cy="-4" r="6.5" fill="#fff6a8" stroke="${INK}" stroke-width="3" filter="url(#${id}f)"/>
      ${ear(22)}${ear(98)}
      <path d="${head}" fill="url(#${id}g)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      ${shine(`<path d="${head}"/>`)}
      <circle cx="40" cy="26" r="2.6" fill="${INK}"/><circle cx="80" cy="26" r="2.6" fill="${INK}"/>
      <rect x="32" y="38" width="56" height="22" rx="11" fill="#06091a" stroke="${INK}" stroke-width="4"/>
      <clipPath id="${id}v"><rect x="34" y="40" width="52" height="18" rx="9"/></clipPath>
      <g clip-path="url(#${id}v)">
        <rect x="34" y="40" width="52" height="18" fill="${c2}" opacity=".35"/>
        <rect class="e-scan" x="34" y="38" width="14" height="22" fill="${c1}" filter="url(#${id}f)"/>
      </g>
      <circle cx="47" cy="49" r="4" fill="#fff"/><circle cx="73" cy="49" r="4" fill="#fff"/>
      <rect x="40" y="68" width="40" height="16" rx="4" fill="#06091a" stroke="${INK}" stroke-width="4"/>
      <path d="M48 70 V82 M56 70 V82 M64 70 V82 M72 70 V82" stroke="${c1}" stroke-width="2.5" opacity=".8"/>
      <path d="M38 96 H82" stroke="${INK}" stroke-width="3" opacity=".5"/>`);
  }

  if (r === 3) {
    // Legendary: a crowned skull, on fire, with wings
    return wrap(`${flames(id, "#ff8a00", "#fff4b0")}
      ${wings(id)}
      <circle cx="60" cy="60" r="45" fill="url(#${id}g)" stroke="${INK}" stroke-width="6"/>
      ${shine(`<circle cx="60" cy="60" r="45"/>`)}
      <circle cx="60" cy="62" r="36" fill="url(#${id}d)" stroke="${INK}" stroke-width="3"/>
      ${bones("#fff8d6")}${skull(id, r, "#fff27a")}`);
  }

  // Mythic: a giant eye in a spinning portal, with horns. It looks around. It blinks.
  const orbit = `<g class="e-orbit">${sparkle(60, -14, 0)}${sparkle(134, 60, 1)}${sparkle(60, 134, 2)}${sparkle(-14, 60, 3)}</g>
      <g class="e-orbit rev">${sparkle(118, 2, 4)}${sparkle(2, 118, 5)}</g>`;
  const eye = "M8 62 C30 28 90 28 112 62 C90 96 30 96 8 62 Z";
  const swirl = Array.from({ length: 6 }, (_, i) => `<path transform="rotate(${i * 60} 60 60)" d="M60 60 C74 40 98 44 106 66" fill="none" stroke="${i % 2 ? c1 : c2}" stroke-width="7" stroke-linecap="round" opacity=".75"/>`).join("");
  const lash = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  return wrap(`<path d="M34 30 C12 14 4 -6 12 -18 C20 0 36 10 50 18 Z M86 30 C108 14 116 -6 108 -18 C100 0 84 10 70 18 Z" fill="url(#${id}h)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="60" cy="60" r="56" fill="url(#${id}d)" stroke="${INK}" stroke-width="7"/>
      <g class="e-spin">${swirl}</g>
      ${shine(`<circle cx="60" cy="60" r="56"/>`)}
      <g class="e-blinkeye">
        ${lash(30, 40, 24, 28)}${lash(45, 34, 42, 20)}${lash(60, 32, 60, 17)}${lash(75, 34, 78, 20)}${lash(90, 40, 96, 28)}
        <path d="${eye}" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
        <clipPath id="${id}e"><path d="${eye}"/></clipPath>
        <g clip-path="url(#${id}e)">
          <path d="M14 66 C24 64 28 70 34 68 M106 58 C96 60 92 54 86 56" fill="none" stroke="${c2}" stroke-width="1.6" opacity=".6"/>
          <g class="e-look">
            <circle cx="60" cy="62" r="22" fill="url(#${id}i)" stroke="${INK}" stroke-width="4"/>
            <circle cx="60" cy="62" r="14" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 4"/>
            <ellipse cx="60" cy="62" rx="5.5" ry="15" fill="${INK}"/>
            <circle cx="67" cy="54" r="4.5" fill="#fff"/>
          </g>
        </g>
      </g>
      ${orbit}`);
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

// Call after progress changes: shows the reveal when the rank went up since last time.
// kept is the rank the server says this person already has (0 when not signed in).
export function checkRankUp(done, kept = 0) {
  const r = Math.max(rankOf(done), kept);
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
