#!/usr/bin/env python3
"""pwnctual CLI: link your computer, fetch challenges, check solutions.

Download it from the Setup page and run it with Python 3:  python pwnctual.py login
Only uses the Python standard library.
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import time
import urllib.error
import urllib.request
import webbrowser

VERSION = "1.0.0"
CONFIG_DIR = os.path.join(os.environ.get("XDG_CONFIG_HOME") or os.path.expanduser("~/.config"), "pwnctual")
CONFIG_PATH = os.path.join(CONFIG_DIR, "config.json")
DEFAULT_URL = "http://localhost:5000"  # the site fills in its own address when you download this file
CMD = "python pwnctual.py"

USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None
if os.name == "nt":
    os.system("")  # enable ANSI escapes on Windows terminals
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def c(code, s):
    return f"\033[{code}m{s}\033[0m" if USE_COLOR else s


BOLD, DIM, RED, GREEN, YELLOW, PURPLE, CYAN = "1", "2", "91", "92", "93", "95", "96"

SKULL = r"""
      .-''''-.
     /  _  _  \
    |  (o)(o)  |
     \   /\   /
      '-.__.-'
       |'||'|
"""

GHOST = r"""
      .-'''-.
     / () () \
    |    o    |
    |         |
    '^'^'^'^'^'
"""


# ------------------------------------------------------------------ config & http

def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_config(cfg):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)
    try:
        os.chmod(CONFIG_PATH, 0o600)
    except OSError:
        pass


def server_url(cfg):
    return (os.environ.get("PWNCTUAL_URL") or cfg.get("url") or DEFAULT_URL).rstrip("/")


class ApiError(Exception):
    pass


def api(method, path, body=None, token=None, url=None):
    cfg = load_config()
    base = url or server_url(cfg)
    token = token if token is not None else cfg.get("token")
    headers = {"Accept": "application/json", "User-Agent": f"pwnctual-cli/{VERSION}"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            payload = json.load(e)
        except ValueError:
            payload = {}
        if e.code == 410 and "error" not in payload:
            return payload
        raise ApiError(payload.get("error") or f"HTTP {e.code}")
    except urllib.error.URLError as e:
        raise ApiError(f"can't reach {base} ({e.reason}). Is PWNCTUAL_URL right?")


def die(msg):
    print(c(RED, "✗ ") + msg, file=sys.stderr)
    sys.exit(1)


# ------------------------------------------------------------------ commands

def cmd_login(args):
    cfg = load_config()
    if args.url:
        cfg["url"] = args.url.rstrip("/")
    base = server_url(cfg)
    if args.token:
        me = api("GET", "/api/cli/me", token=args.token, url=base)
        cfg["token"] = args.token
        save_config(cfg)
        print(c(GREEN, "✓ ") + f"Logged in as {c(BOLD, me['login'])}")
        return

    start = api("POST", "/api/cli/device", body={}, token="", url=base)
    print()
    print("  Open   " + c(CYAN, start["verify_url_complete"]))
    print("  Code   " + c(BOLD + ";" + PURPLE, start["user_code"]))
    print()
    try:
        webbrowser.open(start["verify_url_complete"])
    except Exception:
        pass
    print(c(DIM, "  Waiting for approval (Ctrl+C to cancel)"), end="", flush=True)
    deadline = time.time() + start.get("expires_in", 600)
    while time.time() < deadline:
        time.sleep(start.get("interval", 3))
        print(c(DIM, "."), end="", flush=True)
        res = api("POST", "/api/cli/device/poll", body={"device_code": start["device_code"]}, token="", url=base)
        if res.get("status") == "ok":
            cfg["token"] = res["token"]
            save_config(cfg)
            print("\n\n" + c(GREEN, "✓ ") + f"Linked as {c(BOLD, res['login'])}. Happy hunting.")
            return
        if res.get("error"):
            break
    die(f"\ncode expired, run `{CMD} login` again")


def cmd_logout(_args):
    cfg = load_config()
    cfg.pop("token", None)
    save_config(cfg)
    print("Logged out.")


def rank_line(rank):
    label = rank["label"]
    s = c(BOLD + ";" + PURPLE, label) + c(DIM, f"  {rank['score']} points")
    if rank["next"]:
        s += c(DIM, f"  ·  {rank['to_next']} to {rank['next']}")
    return s


def cmd_whoami(_args):
    me = api("GET", "/api/cli/me")
    print(c(DIM, SKULL if me["rank"]["key"] != "ghost" else GHOST))
    print(f"  {c(BOLD, me['login'])}  ·  {me['solved']}/{me['total']} solved")
    print("  " + rank_line(me["rank"]))
    print("  " + c(DIM, me["rank"]["motto"]))


def cmd_list(_args):
    data = api("GET", "/api/cli/challenges")
    module = None
    for ch in data["challenges"]:
        if ch["module"] != module:
            module = ch["module"]
            print("\n" + c(BOLD, f"{ch['path']} › {module}"))
        mark = c(GREEN, "✓") if ch["solved"] else (c(YELLOW, "◆") if ch.get("locked") else c(DIM, "·"))
        tag = c(YELLOW, "  PRO") if ch.get("locked") else ""
        print(f"  {mark} {c(DIM, ch['number']):<14} {ch['slug']:<22} {ch['title']}  {c(DIM, str(ch['points']) + ' points')}{tag}")
    if any(ch.get("locked") for ch in data["challenges"]):
        print("\n  " + c(YELLOW, "◆ PRO") + c(DIM, " challenges need pwnctual Pro. Week 1 is free."))
    print()


def cmd_show(args):
    ch = api("GET", f"/api/cli/challenges/{args.slug}")
    print(c(BOLD, f"\n{ch['number']}  {ch['title']}") + c(DIM, f"  ({ch['points']} points)\n"))
    print(textwrap.indent(ch["description"], "  "))
    print("\n  " + c(DIM, ch["url"]) + "\n")


def cmd_new(args):
    ch = api("GET", f"/api/cli/challenges/{args.slug}")
    path = args.file or f"{args.slug}.py"
    if os.path.exists(path) and not args.force:
        die(f"{path} already exists (use --force to overwrite)")
    header = "\n".join("# " + line if line else "#" for line in ch["description"].splitlines())
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# pwnctual :: {ch['number']} {ch['title']}\n#\n{header}\n#\n"
                f"# check it with:  {CMD} check {args.slug}\n\n{ch.get('starter') or ''}")
    print(c(GREEN, "✓ ") + f"created {c(BOLD, path)}  ·  edit it, then run {c(CYAN, f'{CMD} check {args.slug}')}")


def run_case(script, case, timeout):
    with tempfile.TemporaryDirectory(prefix="pwnctual-") as tmp:
        for name, content in (case.get("files") or {}).items():
            target = os.path.join(tmp, os.path.basename(name))
            if isinstance(content, dict) and "b64" in content:
                with open(target, "wb") as f:
                    f.write(base64.b64decode(content["b64"]))
            else:
                with open(target, "w", newline="", encoding="utf-8") as f:
                    f.write(content)
        try:
            p = subprocess.run([sys.executable, script, *case.get("args", [])], input=case.get("stdin", ""),
                               capture_output=True, text=True, timeout=timeout, cwd=tmp,
                               env={**os.environ, "PYTHONIOENCODING": "utf-8"})
            out = {"stdout": p.stdout, "stderr": p.stderr, "exit_code": p.returncode}
        except subprocess.TimeoutExpired as e:
            out = {"stdout": (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or ""),
                   "stderr": f"timed out after {timeout}s (waiting for input you never get?)", "exit_code": None}
        files = {}
        for name in case.get("collect", []):
            try:
                with open(os.path.join(tmp, os.path.basename(name)), encoding="utf-8") as f:
                    files[name] = f.read()
            except OSError:
                files[name] = None
        if files:
            out["files"] = files
        return out


def show_block(title, text, color=None):
    print("  " + c(DIM, title))
    text = text if isinstance(text, str) else json.dumps(text, indent=2)
    body = text.rstrip("\n") or c(DIM, "(nothing)")
    for line in body.split("\n")[:40]:
        print("    " + (c(color, line) if color else line))
    print()


def cmd_check(args):
    script = os.path.abspath(args.file or f"{args.slug}.py")
    if not os.path.exists(script):
        die(f"no such file: {script}\n  create one with: {CMD} new {args.slug}")
    att = api("POST", "/api/cli/attempts", body={"slug": args.slug})
    print(c(BOLD, f"\n  {att['title']}") + c(DIM, f"  ·  running {len(att['cases'])} randomized test(s)\n"))
    outputs = []
    for i, case in enumerate(att["cases"], 1):
        print(c(DIM, f"  [{i}/{len(att['cases'])}] "), end="", flush=True)
        out = run_case(script, case, att.get("timeout", 10))
        outputs.append(out)
        print(c(DIM, "ran") + (c(YELLOW, f" (exit {out['exit_code']})") if out["exit_code"] not in (0, None) else ""))
    res = api("POST", f"/api/cli/attempts/{att['attempt']}", body={"outputs": outputs})
    print()
    if not res.get("ok"):
        if res.get("error"):
            die(res["error"])
        f = res["failed"]
        print(c(RED + ";" + BOLD, f"  ✗ Test {f['index'] + 1}/{f['total']} failed\n"))
        if f.get("stdin"):
            show_block("input (stdin)", f["stdin"])
        if f.get("files"):
            show_block("input files", ", ".join(f["files"]))
        show_block("expected", f["expected"], GREEN)
        show_block("your output", f["got"], RED)
        if f.get("stderr"):
            show_block("stderr", f["stderr"], YELLOW)
        sys.exit(1)

    art = GHOST if res["rank"]["key"] == "ghost" else SKULL
    print(c(GREEN, textwrap.indent(art.strip("\n"), "  ")))
    print()
    print(c(GREEN + ";" + BOLD, "  ✓ PWNED") + ("" if res["first_solve"] else c(DIM, "  (already solved)")))
    print("  flag   " + c(BOLD, res["flag"]))
    if res["first_solve"]:
        print("  points " + c(PURPLE, f"+{res['points']}"))
    print("  rank   " + rank_line(res["rank"]))
    if res.get("promoted"):
        print("\n  " + c(BOLD + ";" + PURPLE, f"▲ RANK UP → {res['rank']['label'].upper()}"))
        print("  " + c(DIM, res["rank"]["motto"]))
    print()


def main():
    ap = argparse.ArgumentParser(prog="pwnctual", description="pwnctual: learn to hack, from zero")
    ap.add_argument("--version", action="version", version=VERSION)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("login", help="link this computer to your pwnctual account")
    p.add_argument("--token", help="use an access token instead of the browser flow")
    p.add_argument("--url", help="pwnctual server URL")
    p.set_defaults(fn=cmd_login)
    sub.add_parser("logout", help="forget the saved token").set_defaults(fn=cmd_logout)
    sub.add_parser("whoami", help="show your account and rank").set_defaults(fn=cmd_whoami)
    sub.add_parser("list", aliases=["ls"], help="list challenges").set_defaults(fn=cmd_list)
    p = sub.add_parser("show", help="print a challenge description")
    p.add_argument("slug")
    p.set_defaults(fn=cmd_show)
    p = sub.add_parser("new", help="create a starter file for a challenge")
    p.add_argument("slug")
    p.add_argument("file", nargs="?")
    p.add_argument("--force", action="store_true")
    p.set_defaults(fn=cmd_new)
    p = sub.add_parser("check", help="run your solution against the checker")
    p.add_argument("slug")
    p.add_argument("file", nargs="?", help="defaults to <slug>.py")
    p.set_defaults(fn=cmd_check)

    args = ap.parse_args()
    try:
        args.fn(args)
    except ApiError as e:
        die(str(e))
    except KeyboardInterrupt:
        print()
        sys.exit(130)


if __name__ == "__main__":
    main()
