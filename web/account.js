// Who is signed in. Fills the "Sign in" / profile button in the top bar on every page.
const signInUrl = () => `/auth/github?return=${encodeURIComponent(location.pathname + location.hash)}`;

// { user, done } when signed in, null when not (or when the server can't be reached)
export const account = fetch("/api/me", { credentials: "same-origin" })
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => (d && d.user ? d : null))
  .catch(() => null);

async function post(path, body) {
  const r = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

// Save lessons as done / not done. Returns the full done list from the server.
export const saveProgress = (add, remove) => post("/api/progress", { add, remove });
// Check a flag on the server. Returns true when it's right.
export const submitFlag = (lesson, flag) => post("/api/submit", { lesson, flag }).then((d) => d.correct === true);

export async function signOut() {
  try { await post("/auth/logout", {}); } catch {}
  try { localStorage.removeItem("pwnctual:done"); localStorage.removeItem("pwnctual:user"); } catch {}
  location.href = "/";
}

account.then((a) => {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  const link = document.createElement("a");
  if (a) {
    link.className = "nav-user";
    link.href = `/u/${encodeURIComponent(a.user.login)}`;
    if (location.pathname.toLowerCase() === link.pathname.toLowerCase()) link.setAttribute("aria-current", "page");
    if (a.user.avatar) {
      const img = document.createElement("img");
      img.src = `${a.user.avatar}${a.user.avatar.includes("?") ? "&" : "?"}s=48`;
      img.alt = "";
      img.width = img.height = 24;
      link.append(img);
    }
    link.append(a.user.login);
  } else {
    link.className = "nav-signin";
    link.href = signInUrl();
    link.textContent = "Sign in";
    link.addEventListener("click", () => { link.href = signInUrl(); });
  }
  nav.append(link);
});
