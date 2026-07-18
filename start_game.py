#!/usr/bin/env python3
"""Start Gym Critters on its stable local origin and open the browser."""

from __future__ import annotations

import contextlib
import errno
import http.server
import os
from pathlib import Path
import socketserver
import threading
import urllib.error
import urllib.request
import webbrowser

GAME_HOST = "127.0.0.1"
GAME_PORT = 8347
GAME_ORIGIN = f"http://{GAME_HOST}:{GAME_PORT}"
INSTANCE_PATH = "/.gym-critters-instance"
INSTANCE_TOKEN = b"gym-critters-local-v1"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == INSTANCE_PATH:
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(INSTANCE_TOKEN)
            return
        super().do_GET()

    def log_message(self, format: str, *args: object) -> None:
        print(f"[Webserver] {format % args}")


class ReusableThreadingServer(socketserver.ThreadingTCPServer):
    # Exklusiv binden, damit ein zweiter Start sicher die bestehende Instanz
    # erkennt, statt unter Windows denselben Port parallel zu übernehmen.
    allow_reuse_address = False
    daemon_threads = True


def existing_game_running() -> bool:
    try:
        with urllib.request.urlopen(
            f"{GAME_ORIGIN}{INSTANCE_PATH}",
            timeout=0.7,
        ) as response:
            return response.status == 200 and response.read() == INSTANCE_TOKEN
    except (OSError, urllib.error.URLError):
        return False


def open_game(delay: bool = True) -> None:
    if not delay:
        webbrowser.open(f"{GAME_ORIGIN}/", new=2)
        return
    timer = threading.Timer(0.6, lambda: webbrowser.open(f"{GAME_ORIGIN}/", new=2))
    timer.daemon = True
    timer.start()


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    os.chdir(project_dir)

    try:
        server = ReusableThreadingServer((GAME_HOST, GAME_PORT), QuietHandler)
    except OSError as error:
        if error.errno == errno.EADDRINUSE and existing_game_running():
            print(f"Gym Critters läuft bereits unter:\n{GAME_ORIGIN}/")
            print("Die bestehende Instanz wird geöffnet.")
            open_game(delay=False)
            return
        if error.errno == errno.EADDRINUSE:
            raise SystemExit(
                f"Der feste Spiel-Port {GAME_HOST}:{GAME_PORT} ist durch ein anderes Programm belegt.\n"
                "Beende dieses Programm und starte Gym Critters erneut. Ein Ausweichport wird "
                "bewusst nicht verwendet, damit der Spielstand erhalten bleibt."
            ) from error
        raise

    with server:
        print("Gym Critters läuft unter:")
        print(f"{GAME_ORIGIN}/")
        print("Dieses Fenster zum Beenden mit Strg+C schließen.")

        open_game()

        with contextlib.suppress(KeyboardInterrupt):
            server.serve_forever()


if __name__ == "__main__":
    main()
