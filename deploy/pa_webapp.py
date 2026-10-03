"""Create and configure the pwnctual web app through the PythonAnywhere API.

    pa_webapp.py DOMAIN PYTHON_VERSION VENV STATIC_DIR    create/configure
    pa_webapp.py DOMAIN reload                            full reload

Run by deploy/pythonanywhere.sh inside a PythonAnywhere console. It does what the
Web tab would: create the web app (manual config), set the virtualenv, map /static/,
force HTTPS and reload. Needs an API token: Account page -> API token -> Create.
Consoles opened after that have it in $API_TOKEN.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

user = os.environ["USER"]
token = os.environ.get("API_TOKEN", "")
domain = sys.argv[1]
host = os.environ.get("PYTHONANYWHERE_SITE", "www." + os.environ.get("PYTHONANYWHERE_DOMAIN", "pythonanywhere.com"))
base = f"https://{host}/api/v0/user/{user}/webapps/"


def call(method, endpoint="", **data):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(base + endpoint, data=body, method=method,
                                 headers={"Authorization": f"Token {token}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        text = r.read().decode()
        return json.loads(text) if text.strip() else None


if not token:
    sys.exit("no API token: open the Account page -> API token -> Create, then open a NEW Bash console and rerun")

if sys.argv[2:] == ["reload"]:
    # Virtualenv and static mappings only take effect on a full reload;
    # touching the WSGI file restarts the workers without applying them.
    try:
        call("POST", f"{domain}/reload/")
    except urllib.error.HTTPError as e:
        sys.exit(f"PythonAnywhere API error {e.code}: {e.read().decode()[:300]}")
    print(f"reloaded https://{domain}")
    sys.exit()

python_version, venv, static_dir = sys.argv[2:5]
try:
    existing = {w["domain_name"] for w in call("GET")}
    if domain not in existing:
        call("POST", domain_name=domain, python_version=python_version)
        print(f"created web app {domain}")
    # Your own domain has no HTTPS certificate until you create one on the Web tab,
    # and forcing HTTPS before that would break the site, so it's left to you there.
    own_domain = not domain.endswith(".pythonanywhere.com")
    call("PATCH", f"{domain}/", virtualenv_path=venv, **({} if own_domain else {"force_https": "true"}))
    statics = call("GET", f"{domain}/static_files/")
    if not any(s["url"] == "/static/" for s in statics):
        call("POST", f"{domain}/static_files/", url="/static/", path=static_dir)
    print("web app configured: virtualenv, /static/ mapping" + ("" if own_domain else ", HTTPS"))
    if own_domain:
        cname = next((w.get("cname") for w in call("GET") if w["domain_name"] == domain), None)
        print(f"DNS: add a CNAME record for {domain} pointing to {cname or 'the value on the Web tab'}")
        print("Then on the Web tab: create a Let's Encrypt certificate, and turn on Force HTTPS")
except urllib.error.HTTPError as e:
    sys.exit(f"PythonAnywhere API error {e.code}: {e.read().decode()[:300]}")
