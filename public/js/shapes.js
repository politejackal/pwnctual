// The hero art on the home page: Material 3 Expressive shapes that morph into each other.

// ------------------------------------------------------------------ shapes
// Material 3 Expressive shape library (cookie, clover, sunny, squircle...).
// Every shape is sampled with the same number of points from the same start
// angle, so any two can be morphed into each other with SVG <animate>.

const N = 240;

// round lobe tops, softly pinched joins (like M3's cookie / clover shapes)
const profile = (u) => 1 - (1 - u) ** 2;

function lobes(k, depth, invert = false, soft = 0.08) {
  return (t) => {
    const s = Math.abs(Math.sin((k * t) / 2));
    const u = (Math.sqrt(s * s + soft * soft) - soft) / (Math.sqrt(1 + soft * soft) - soft);
    const p = profile(u);
    return invert ? 1 - depth * p : 1 - depth * (1 - p);
  };
}

function squircle(n = 4) {
  return (t) => (Math.abs(Math.cos(t)) ** n + Math.abs(Math.sin(t)) ** n) ** (-1 / n) / 1.12;
}

const RADIAL = {
  circle: () => 1,
  cookie4: lobes(4, 0.12),
  cookie6: lobes(6, 0.11),
  cookie9: lobes(9, 0.10),
  cookie12: lobes(12, 0.07),
  clover4: lobes(4, 0.36),
  clover8: lobes(8, 0.22),
  sunny: lobes(8, 0.12, true, 0.25),
  verysunny: lobes(8, 0.22, true, 0.18),
  squircle: squircle(4),
};

function shapePath(name, cx, cy, size, rot = -90) {
  const f = RADIAL[name];
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (2 * Math.PI * i) / N;
    const r = f(t);
    const a = t + (rot * Math.PI) / 180;
    pts.push(`${(cx + (size / 2) * r * Math.cos(a)).toFixed(2)},${(cy + (size / 2) * r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

// Attributes for an <animate> that holds each shape, then morphs with an
// expressive (overshooting) spline to the next.
export function shapeAnimation(names, cx, cy, size, secondsPerShape = 3, rot = -90) {
  const seq = [...names, names[0]];
  const values = [], times = [], splines = [];
  const n = names.length;
  seq.forEach((name, i) => {
    const d = shapePath(name, cx, cy, size, rot);
    if (i === 0) { values.push(d); times.push(0); return; }
    values.push(values[values.length - 1]); times.push((i - 1) / n + 0.55 / n); splines.push("0 0 1 1");
    values.push(d); times.push(i / n); splines.push("0.2 0 0 1");
  });
  return {
    d: values[0], values: values.join(";"), dur: `${+(n * secondsPerShape).toFixed(3)}s`,
    keyTimes: times.map((t) => t.toFixed(4)).join(";"), keySplines: splines.join(";"),
  };
}
