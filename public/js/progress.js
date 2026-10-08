// Your progress lives in this browser's localStorage: { challengeSlug: secondsSinceEpoch }.
// Honor system: "I finished it" is all it takes, nothing is checked.
import { CHALLENGES } from "./course.js";

const KEY = "pwnctual:solved";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function write(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}

export const progress = {
  // only challenges that still exist count
  solved() {
    return Object.fromEntries(Object.entries(read()).filter(([slug]) => slug in CHALLENGES));
  },
  score() {
    return Object.keys(this.solved()).length;
  },
  set(slug, done) {
    const all = read();
    if (done) all[slug] ??= Date.now() / 1000;
    else delete all[slug];
    return write(all);
  },
  reset() {
    write({});
  },
};
