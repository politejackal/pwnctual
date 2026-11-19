// How you earn each badge. Read by the site and by the server, so it can't touch the page.
// Starters have no badges. A badge is proof you finished something, and once earned it stays.
import { COURSE } from "./course-data.js";

const keyOf = (c, m, l) => `${c.id}/${m.id}/${l.id}`;
const chapterKeys = (c) => c.modules.flatMap((m) => m.lessons.map((l) => keyOf(c, m, l)));

// How much of a chapter is done, 0 to 100
export function chapterPct(c, done) {
  const keys = chapterKeys(c);
  return keys.length ? Math.round((keys.filter((k) => done.has(k)).length / keys.length) * 100) : 0;
}

// id: saved with the person, so it never changes
export const BADGE_RULES = [
  { id: "hello-world", earned: (done) => chapterPct(COURSE[0], done) === 100 }, // Finish Chapter 1
];

// The ids of the badges this list of finished lessons earns right now
export function badgesOf(done) {
  const set = done instanceof Set ? done : new Set(done);
  return BADGE_RULES.filter((b) => b.earned(set)).map((b) => b.id);
}
