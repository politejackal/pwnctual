#!/usr/bin/env bash
# Set up or update pwnctual on PythonAnywhere. In a PythonAnywhere Bash console:
#
#   git clone https://github.com/politejackal/pwnctual.git ~/pwnctual   # first time only
#   bash ~/pwnctual/deploy/pythonanywhere.sh
#
# On your own domain (needs a paid PythonAnywhere plan), say which one:
#
#   PWNCTUAL_DOMAIN=www.pwnctual.com bash ~/pwnctual/deploy/pythonanywhere.sh
#
# With an API token (Account page -> API token -> Create, then open a new console)
# it also creates and configures the web app, so there is nothing to click on the
# Web tab. Safe to re-run: it pulls the latest code, updates packages, keeps your
# .env and database, rewrites the WSGI file and reloads the site.
set -euo pipefail

PY="${PWNCTUAL_PYTHON:-}"
if [ -z "$PY" ]; then
  for v in python3.12 python3.13 python3.11 python3.10; do
    if command -v "$v" >/dev/null; then PY="$v"; break; fi
  done
fi
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$HOME/.virtualenvs/pwnctual"
DOMAIN="${PWNCTUAL_DOMAIN:-$USER.${PYTHONANYWHERE_DOMAIN:-pythonanywhere.com}}"
WSGI_FILE="/var/www/$(echo "$DOMAIN" | tr '.' '_')_wsgi.py"

cd "$APP_DIR"
git pull --ff-only || echo "!! git pull failed; continuing with the code already here"

if [ ! -d "$VENV" ]; then
  "$PY" -m venv "$VENV"
fi
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  secret="$("$VENV/bin/python" -c 'import secrets; print(secrets.token_hex(32))')"
  sed -i \
    -e "s|^PWNCTUAL_PUBLIC_URL=.*|PWNCTUAL_PUBLIC_URL=https://$DOMAIN|" \
    -e "s|^PWNCTUAL_SECRET=.*|PWNCTUAL_SECRET=$secret|" \
    .env
  echo "Created $APP_DIR/.env: add your GitHub/Google sign-in keys there."
elif [ -n "${PWNCTUAL_DOMAIN:-}" ]; then
  # moving to a new domain: sign-in callbacks and links must use it
  sed -i "s|^PWNCTUAL_PUBLIC_URL=.*|PWNCTUAL_PUBLIC_URL=https://$DOMAIN|" .env
  echo "Set PWNCTUAL_PUBLIC_URL=https://$DOMAIN in $APP_DIR/.env"
fi

if [ -n "${API_TOKEN:-}" ]; then
  "$VENV/bin/python" deploy/pa_webapp.py "$DOMAIN" "$(echo "$PY" | tr -d '.')" "$VENV" "$APP_DIR/pwnctual/static"
fi

if [ -f "$WSGI_FILE" ]; then
  cat > "$WSGI_FILE" <<WSGI
import sys
sys.path.insert(0, "$APP_DIR")
from wsgi import application  # noqa: E402,F401
WSGI
  echo "Updated $WSGI_FILE"
  if [ -n "${API_TOKEN:-}" ]; then
    "$VENV/bin/python" deploy/pa_webapp.py "$DOMAIN" reload
  else
    touch "$WSGI_FILE"
    echo "Press Reload on the Web tab to apply the changes."
  fi
else
  echo "!! $WSGI_FILE not found. Either create an API token (Account page -> API token ->"
  echo "   Create), open a NEW Bash console and run this script again, or create the web app"
  echo "   by hand (Web tab -> Add a new web app -> Manual configuration -> ${PY#python})."
fi

echo "Virtualenv: $VENV"
echo "Site: https://$DOMAIN"
