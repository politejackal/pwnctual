# 💀 pwnctual

An open-source place to learn hacking from zero, for free.

pwnctual is a plain static website: HTML, CSS and JavaScript in [`public/`](public), with no
server and no build step.

- The course (modules, chapters, challenges) is in [`public/js/course.js`](public/js/course.js).
  To add a chapter, add it to a module there.
- Every page is drawn in the browser by [`public/js/app.js`](public/js/app.js) from
  [`public/js/pages.js`](public/js/pages.js), so the host must answer any unknown path with
  `index.html` (a "single-page app" fallback).
- Progress is saved in the browser. Signing in with Google (through [Supabase](https://supabase.com))
  keeps it on every device and puts you on the leaderboard; the browser talks to Supabase directly.

## Run it locally

```
npx wrangler dev
```

then open http://localhost:8787. Any static server with a single-page-app fallback works too,
e.g. `npx serve -s public`.

## Accounts (Supabase + Google)

Without this the site still works: progress stays in the browser and there's no leaderboard.

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Google sign-in: in [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** (type *Web application*). Under *Authorized redirect URIs* add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows this exact URL on the
   Google provider page). Then in Supabase, **Authentication → Sign In / Providers → Google**:
   turn it on and paste the client ID and secret.
4. **Authentication → URL Configuration**: set *Site URL* to `https://pwnctual.com` and add
   `https://pwnctual.com/**` and `http://localhost:8787/**` to *Redirect URLs*.
5. **Project Settings → API**: copy the *Project URL* and the *anon public* key into
   [`public/js/config.js`](public/js/config.js). Both are safe to publish; the rules in
   `schema.sql` are what stop people touching anyone else's data.

New accounts get a random name like `hacker-1a2b3c`, so nobody's Google name or email is shown;
people change it on their profile page.

## Deploy

Pushes to `main` deploy `public/` to Cloudflare (see [`wrangler.toml`](wrangler.toml) and
[`.github/workflows/cloudflare.yml`](.github/workflows/cloudflare.yml)).
