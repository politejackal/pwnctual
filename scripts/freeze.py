"""Render the public pages of pwnctual to static HTML for GitHub Pages.

    python scripts/freeze.py [OUT_DIR] [--base /repo-name]

Crawls the site from "/" with Flask's test client, saves every HTML page as
<path>/index.html (plus emblems and static files), and prefixes root-relative
URLs with --base so a project site at user.github.io/<repo>/ works.
Sign-in, the CLI API, bookings and other server features need the Flask app;
on the static copy they are links that go nowhere.
"""
import argparse
import os
import re
import shutil
import sys
import tempfile
from urllib.parse import urldefrag, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
# Throwaway DB and secret: the static copy shows the logged-out, empty-leaderboard site.
os.environ["PWNCTUAL_DB"] = os.path.join(tempfile.mkdtemp(), "freeze.db")
os.environ.setdefault("PWNCTUAL_SECRET", "static-build")
os.environ.pop("PWNCTUAL_DEV", None)

from pwnctual.app import app  # noqa: E402
from pwnctual.ranks import TIERS  # noqa: E402

SKIP = re.compile(r"^/(auth|api|static|link|workspace|u)(/|$)")
URL_ATTR = re.compile(r'((?:href|src|action)=")(/(?!/)[^"]*)"')
JS_URL = re.compile(r'((?:fetch\(\s*[`"])|src=")(/(?!/))')


def crawl(client):
    todo = ["/"] + [f"/emblem/{i}.svg" for i in range(len(TIERS))]
    pages, seen = {}, set(todo)
    while todo:
        path = todo.pop()
        resp = client.get(path)
        if resp.status_code != 200:
            print(f"skip {path} ({resp.status_code})")
            continue
        pages[path] = (resp.mimetype, resp.get_data())
        if resp.mimetype != "text/html":
            continue
        for _, url in URL_ATTR.findall(resp.get_data(as_text=True)):
            p = urlsplit(urldefrag(url)[0]).path
            if p and p not in seen and not SKIP.match(p):
                seen.add(p)
                todo.append(p)
    return pages


def rewrite(html, base):
    html = URL_ATTR.sub(lambda m: f'{m.group(1)}{base}{m.group(2)}"', html)
    return html


def out_file(out, path, mimetype):
    if mimetype == "text/html":
        return os.path.join(out, path.strip("/"), "index.html")
    return os.path.join(out, path.lstrip("/"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=os.path.join(ROOT, "_site"))
    ap.add_argument("--base", default="", help="URL prefix, e.g. /pwnctual")
    args = ap.parse_args()
    base = "/" + args.base.strip("/") if args.base.strip("/") else ""

    shutil.rmtree(args.out, ignore_errors=True)
    client = app.test_client()
    for path, (mimetype, data) in crawl(client).items():
        dest = out_file(args.out, path, mimetype)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if mimetype == "text/html":
            data = rewrite(data.decode(), base).encode()
        with open(dest, "wb") as f:
            f.write(data)
        print(f"page {path}")

    shutil.copytree(app.static_folder, os.path.join(args.out, "static"))
    js = os.path.join(args.out, "static", "js", "app.js")
    with open(js, encoding="utf-8") as f:
        src = f.read()
    src = JS_URL.sub(lambda m: m.group(1) + base + m.group(2), src)
    with open(js, "w", encoding="utf-8") as f:
        f.write(src)

    resp = client.get("/__missing__")
    with open(os.path.join(args.out, "404.html"), "w", encoding="utf-8") as f:
        f.write(rewrite(resp.get_data(as_text=True), base))
    open(os.path.join(args.out, ".nojekyll"), "w").close()


if __name__ == "__main__":
    main()
