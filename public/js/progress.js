// Which challenges you've finished: { challengeSlug: secondsSinceEpoch }.
// Signed out, it lives in this browser's localStorage; signed in, in your account.
// Honor system: "I finished it" is all it takes, nothing is checked.
import { account } from "./account.js";
import { CHALLENGES } from "./course.js";

const KEY = "pwnctual:solved";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function writeLocal(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}

// only challenges that still exist count
const known = (all) => Object.fromEntries(Object.entries(all).filter(([slug]) => slug in CHALLENGES));

let cloud = null;  // your account's solves while signed in

export const progress = {
  solved() {
    return known(cloud ?? readLocal());
  },
  score() {
    return Object.keys(this.solved()).length;
  },

  // Call after signing in or out. Signing in moves this browser's progress into the account.
  async sync() {
    cloud = null;
    if (!account.user) return;
    const local = known(readLocal());
    if (Object.keys(local).length) {
      await account.addSolves(local);
      writeLocal({});
    }
    cloud = await account.solvesOf(account.user.id);
  },

  async set(slug, done) {
    const now = Date.now() / 1000;
    if (cloud) {
      if (done) await account.addSolves({ [slug]: now });
      else await account.removeSolves(slug);
      if (done) cloud[slug] ??= now; else delete cloud[slug];
      return;
    }
    const all = readLocal();
    if (done) all[slug] ??= now; else delete all[slug];
    if (!writeLocal(all)) throw new Error("Couldn't save your progress: this browser is blocking storage.");
  },

  async reset() {
    if (cloud) { await account.removeSolves(); cloud = {}; }
    else writeLocal({});
  },
};
