# pwnctual

A static site: everything is in `public/` (HTML, CSS, ES modules). No server, no build step, no Python.
See README.md for how it's laid out and how accounts (Supabase + Google) are set up.

- Course content: `public/js/course.js`. Pages: `public/js/pages.js`. Router and behaviour: `public/js/app.js`.
- Check changes in a browser before shipping: serve `public/` with a single-page-app fallback
  (`npx wrangler dev`, or any static server that answers unknown paths with `index.html`).

## Shipping

The site deploys to pwnctual.com only when `main` changes (`.github/workflows/cloudflare.yml`).
The owner wants every finished change live: after pushing a branch, open a PR to `main` and merge it
yourself, without asking first. Then check that the Deploy workflow run succeeded.
