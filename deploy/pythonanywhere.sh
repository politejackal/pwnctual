#!/usr/bin/env bash
# Set up or update pwnctual on PythonAnywhere. Run it from a PythonAnywhere Bash console:
#
#   git clone https://github.com/politejackal/pwnctual.git ~/pwnctual   # first time only
#   bash ~/pwnctual/deploy/pythonanywhere.sh
#
# Safe to re-run: it pulls the latest code, updates packages, keeps your .env and
# database, rewrites the WSGI file and reloads the site.
set -euo pipefail

PY="${PWNCTUAL_PYTHON:-python3.12}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$HOME/.virtualenvs/pwnctual"
DOMAIN="${PWNCTUAL_DOMAIN:-$USER.pythonanywhere.com}"
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
fi

if [ -f "$WSGI_FILE" ]; then
  cat > "$WSGI_FILE" <<WSGI
import sys
sys.path.insert(0, "$APP_DIR")
from wsgi import application  # noqa: E402,F401
WSGI
  touch "$WSGI_FILE"   # reloads the web app
  echo "Updated $WSGI_FILE and reloaded https://$DOMAIN"
else
  echo "!! $WSGI_FILE not found. Create the web app first (Web tab -> Add a new web app ->"
  echo "   Manual configuration -> ${PY#python}), then run this script again."
fi

echo "Virtualenv for the Web tab: $VENV"
