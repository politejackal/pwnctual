// How you earn each rank. Read by the site and by the server, so it can't touch the page.
// Ranks: 0 Common, 1 Uncommon, 2 Rare, 3 Legendary, 4 Mythic. Once earned, a rank stays:
// the server keeps everyone's highest rank, and the browser does too for people not signed in.
import { COURSE } from "./course-data.js";

const keyOf = (c, m, l) => `${c.id}/${m.id}/${l.id}`;
const chapterKeys = (c) => c.modules.flatMap((m) => m.lessons.map((l) => keyOf(c, m, l)));

// How much of a chapter is done, 0 to 100
export function chapterPct(c, done) {
  const keys = chapterKeys(c);
  return keys.length ? Math.round((keys.filter((k) => done.has(k)).length / keys.length) * 100) : 0;
}

// The rank this list of finished lessons earns right now
export function rankOf(done) {
  const set = done instanceof Set ? done : new Set(done);
  let r = 0;
  if (chapterPct(COURSE[0], set) === 100) r = 1; // Uncommon: finish the first chapter
  return r;
}
