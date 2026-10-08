# 💀 pwnctual

An open-source place to learn hacking from zero, for free.

pwnctual is a plain static website: HTML, CSS and JavaScript in [`public/`](public), with no
server, no build step and no accounts. Your progress is saved in your own browser.

- The course (modules, chapters, challenges) is in [`public/js/course.js`](public/js/course.js).
  To add a chapter, add it to a module there.
- Every page is drawn in the browser by [`public/js/app.js`](public/js/app.js) from
  [`public/js/pages.js`](public/js/pages.js), so the host must answer any unknown path with
  `index.html` (a "single-page app" fallback).

## Run it locally

```
npx wrangler dev
```

then open http://localhost:8787. Any static server with a single-page-app fallback works too,
e.g. `npx serve -s public`.

## Deploy

Pushes to `main` deploy `public/` to Cloudflare (see [`wrangler.toml`](wrangler.toml) and
[`.github/workflows/cloudflare.yml`](.github/workflows/cloudflare.yml)).
