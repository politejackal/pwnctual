// A public profile at /u/<github username>: who they are and what they've finished
import { COURSE } from "./course-data.js";
import { account, signOut } from "./account.js";

const root = document.getElementById("profile");
const login = decodeURIComponent(location.pathname.split("/")[2] || "");

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kids.flat().filter((k) => k != null && k !== false));
  return el;
}

function bar(pct) {
  return h("div", { class: "progress" },
    h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct },
      h("span", { style: `width:${pct}%` })),
    h("span", { class: "pct" }, `${pct}%`));
}

const date = (ms) => new Date(ms).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0);

async function show() {
  const res = await fetch(`/api/users/${encodeURIComponent(login)}`).catch(() => null);
  if (!res || !res.ok) {
    document.title = "Not found · pwnctual";
    root.replaceChildren(h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, "Profile"), h("h1", null, "Not found")));
    return;
  }
  const { user, done } = await res.json();
  const doneAt = new Map(done.map((d) => [d.lesson, d.at]));
  document.title = `${user.login} · pwnctual`;

  const all = COURSE.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => ({ c, m, l, key: `${c.id}/${m.id}/${l.id}` }))));
  const solved = all.filter((x) => x.l.challenge && doneAt.has(x.key)).sort((a, b) => doneAt.get(b.key) - doneAt.get(a.key));
  const finished = all.filter((x) => doneAt.has(x.key)).length;

  const head = h("header", { class: "page-head profile-head" },
    user.avatar && h("img", { class: "avatar", src: `${user.avatar}${user.avatar.includes("?") ? "&" : "?"}s=192`, alt: "", width: 96, height: 96 }),
    h("div", null,
      h("p", { class: "eyebrow" }, "Profile"),
      h("h1", null, user.login),
      user.name && user.name !== user.login && h("p", { class: "profile-name" }, user.name),
      h("p", { class: "meta" },
        `Joined ${date(user.joined)} · `,
        h("a", { href: `https://github.com/${encodeURIComponent(user.login)}`, target: "_blank", rel: "noopener" }, "GitHub"))));

  const stats = h("section", { class: "profile-section" },
    h("h2", { class: "section-title" }, "Progress",
      h("span", { class: "meta" }, `${finished} of ${all.length} lessons · ${solved.length} challenge${solved.length === 1 ? "" : "s"} solved`)),
    bar(pct(finished, all.length)),
    h("ul", { class: "profile-chapters" }, COURSE.map((c, i) => {
      const lessons = all.filter((x) => x.c === c);
      const n = lessons.filter((x) => doneAt.has(x.key)).length;
      return h("li", null,
        h("a", { href: `/learn/${c.id}` }, `Chapter ${i + 1}: ${c.title}`),
        bar(pct(n, lessons.length)));
    })));

  const challenges = h("section", { class: "profile-section" },
    h("h2", { class: "section-title" }, "Solved challenges"),
    solved.length
      ? h("ol", { class: "solved" }, solved.map((x) =>
          h("li", null,
            h("a", { href: `/learn/${x.c.id}/${x.m.id}/${x.l.id}` }, x.l.title),
            h("span", { class: "meta" }, date(doneAt.get(x.key))))))
      : h("p", { class: "meta" }, "None yet."));

  root.replaceChildren(head, stats, challenges);

  // Your own profile: a sign out button
  const me = await account;
  if (me && me.user.login.toLowerCase() === user.login.toLowerCase()) {
    const out = h("button", { class: "button signout", type: "button" }, "Sign out");
    out.addEventListener("click", signOut);
    root.append(h("div", { class: "profile-section" }, out));
  }
}

show();
