# 💀 pwnctual

An open-source place to learn hacking from zero, for free.

pwnctual is a plain static website: HTML, CSS and JavaScript in [`public/`](public), with no
server and no build step.

- The course (modules, chapters, challenges) is in [`public/js/course.js`](public/js/course.js).
  To add a chapter, add it to a module there.
- Every page is drawn in the browser by [`public/js/app.js`](public/js/app.js) from
  [`public/js/pages.js`](public/js/pages.js), so the host must answer any unknown path with
  `index.html` (a "single-page app" fallback).
- Progress is saved in the browser. Signing in is optional: with GitHub (through [Supabase](https://supabase.com))
  it keeps your progress on every device and puts you on the leaderboard. The browser talks to Supabase directly.

## Run it locally

```
npx wrangler dev
```

then open http://localhost:8787. Any static server with a single-page-app fallback works too,
e.g. `npx serve -s public`.

## Accounts (Supabase + GitHub)

Without this the site still works: progress stays in the browser and there's no leaderboard.

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. GitHub sign-in: in GitHub, **Settings → Developer settings → OAuth Apps**, create an app (or edit the
   existing one). *Homepage URL* `https://pwnctual.com`; *Authorization callback URL*
   `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows this exact URL on its GitHub
   provider page). Generate a client secret. Then in Supabase, **Authentication → Sign In / Providers → GitHub**:
   turn it on and paste the client ID and secret.
4. **Authentication → URL Configuration**: set *Site URL* to `https://pwnctual.com` and add
   `https://pwnctual.com/**` and `http://localhost:8787/**` to *Redirect URLs*.
5. **Project Settings → API**: copy the *Project URL* and the *anon public* key into
   [`public/js/config.js`](public/js/config.js). Both are safe to publish; the rules in
   `schema.sql` are what stop people touching anyone else's data.

Your name on the leaderboard is your GitHub username.

## Deploy

Pushes to `main` deploy `public/` to Cloudflare (see [`wrangler.toml`](wrangler.toml) and
[`.github/workflows/cloudflare.yml`](.github/workflows/cloudflare.yml)).
