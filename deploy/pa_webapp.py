"""Create and configure the pwnctual web app through the PythonAnywhere API.

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
domain, python_version, venv, static_dir = sys.argv[1:5]
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

try:
    existing = {w["domain_name"] for w in call("GET")}
    if domain not in existing:
        call("POST", domain_name=domain, python_version=python_version)
        print(f"created web app {domain}")
    call("PATCH", f"{domain}/", virtualenv_path=venv, force_https="true")
    statics = call("GET", f"{domain}/static_files/")
    if not any(s["url"] == "/static/" for s in statics):
        call("POST", f"{domain}/static_files/", url="/static/", path=static_dir)
    print("web app configured: virtualenv, /static/ mapping, HTTPS")
except urllib.error.HTTPError as e:
    sys.exit(f"PythonAnywhere API error {e.code}: {e.read().decode()[:300]}")
