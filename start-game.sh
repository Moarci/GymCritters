#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 start_game.py
fi
if command -v python >/dev/null 2>&1; then
  exec python start_game.py
fi
if command -v node >/dev/null 2>&1; then
  exec node start_server.js
fi
printf 'Weder Python 3 noch Node.js wurde gefunden. Eine lokale Server-Laufzeit ist erforderlich.\n'
exit 1
