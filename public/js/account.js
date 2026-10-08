// Accounts: Google sign-in through Supabase, which also stores everyone's progress.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const toSeconds = (iso) => Date.parse(iso) / 1000;

export const account = {
  enabled: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
  client: null,
  user: null,  // your profile, { id, login }, while signed in

  // Picks up the session (finishing a sign-in that just came back from Google).
  // onChange runs when you sign in or out later, e.g. in another tab.
  async init(onChange) {
    if (!this.enabled) return;
    try {
      const { createClient } = await import(SUPABASE_JS);
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: "pkce" } });
      const { data: { session } } = await this.client.auth.getSession();
      await this.load(session);
      this.client.auth.onAuthStateChange((event, session) => {
        if ((session?.user.id ?? null) === (this.user?.id ?? null)) return;
        // Supabase asks that the callback not wait on its own calls, so load afterwards.
        setTimeout(async () => {
          try { await this.load(session); } catch (e) { console.error(e); this.user = null; }
          onChange();
        });
      });
    } catch (e) {
      console.error("pwnctual: couldn't reach Supabase", e);
      this.client = null;
      this.user = null;
    }
  },

  async load(session) {
    if (!session) { this.user = null; return; }
    const { data, error } = await this.client.from("profiles").select("id, login").eq("id", session.user.id).maybeSingle();
    if (error) throw error;
    this.user = data;
  },

  signIn(next = "/") {
    return this.client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + next } });
  },

  async signOut() {
    this.user = null;
    await this.client.auth.signOut();
  },

  // -> "" when done, or what's wrong with the new login
  async rename(login) {
    if (!/^[A-Za-z0-9_-]{2,32}$/.test(login)) return "Use 2 to 32 letters, numbers, - or _.";
    const { error } = await this.client.from("profiles").update({ login }).eq("id", this.user.id);
    if (error) return error.code === "23505" ? "That name is taken." : "Couldn't change it. Please try again.";
    this.user = { ...this.user, login };
    return "";
  },

  async profile(login) {
    const { data, error } = await this.client.from("profiles").select("id, login, created_at").eq("login", login).maybeSingle();
    if (error) throw error;
    return data;
  },

  // -> { slug: seconds }
  async solvesOf(userId) {
    const { data, error } = await this.client.from("solves").select("slug, solved_at").eq("user_id", userId);
    if (error) throw error;
    return Object.fromEntries(data.map((r) => [r.slug, toSeconds(r.solved_at)]));
  },

  // solved: { slug: seconds }; ones already marked keep their time
  async addSolves(solved) {
    const rows = Object.entries(solved).map(([slug, t]) => ({ user_id: this.user.id, slug, solved_at: new Date(t * 1000).toISOString() }));
    if (!rows.length) return;
    const { error } = await this.client.from("solves").upsert(rows, { onConflict: "user_id,slug", ignoreDuplicates: true });
    if (error) throw error;
  },

  // slug omitted: all of them
  async removeSolves(slug) {
    let q = this.client.from("solves").delete().eq("user_id", this.user.id);
    if (slug) q = q.eq("slug", slug);
    const { error } = await q;
    if (error) throw error;
  },

  // -> [{ login, score, last }], best first
  async leaderboard(known) {
    const { data, error } = await this.client.rpc("leaderboard", { known });
    if (error) throw error;
    return data.map((r) => ({ login: r.login, score: Number(r.score), last: toSeconds(r.last_solved) }));
  },
};
