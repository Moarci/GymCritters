#!/usr/bin/env python3
"""Start Gym Critters on a free local port and open the browser."""

from __future__ import annotations

import contextlib
import http.server
import os
from pathlib import Path
import socketserver
import threading
import webbrowser


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        print(f"[Webserver] {format % args}")


class ReusableThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    os.chdir(project_dir)

    with ReusableThreadingServer(("127.0.0.1", 0), QuietHandler) as server:
        port = server.server_address[1]
        url = f"http://127.0.0.1:{port}/"
        print("Gym Critters läuft unter:")
        print(url)
        print("Dieses Fenster zum Beenden mit Strg+C schließen.")

        timer = threading.Timer(0.6, lambda: webbrowser.open(url, new=2))
        timer.daemon = True
        timer.start()

        with contextlib.suppress(KeyboardInterrupt):
            server.serve_forever()


if __name__ == "__main__":
    main()
