import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

import {
  GAME_HOST,
  GAME_ORIGIN,
  GAME_PORT,
  INSTANCE_PATH,
  INSTANCE_TOKEN,
  isGameServerRunning,
  listenOnGamePort,
} from "./server-ports.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requested = new URL(request.url || "/", GAME_ORIGIN).pathname;
  if (requested === INSTANCE_PATH) {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    }).end(INSTANCE_TOKEN);
    return;
  }
  const relative = requested === "/" ? "index.html" : requested.replace(/^\//, "");
  const filePath = path.resolve(root, relative);
  // Der WHATWG-URL-Parser oben entfernt bereits alle ".."-Segmente, dieser Guard ist
  // die zweite Verteidigungslinie. Auf eine echte Verzeichnisgrenze prüfen statt auf
  // reinen String-Präfix: sonst würde ein Nachbarordner wie "GymCritters-evil" den
  // Test bestehen, sollte die Pfadnormalisierung oben je wegfallen.
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (filePath !== root && !filePath.startsWith(rootWithSep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(data);
  });
});

function openGame(url) {
  const command = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  setTimeout(() => exec(command, () => {}), 500);
}

// Eine einzige feste Origin statt Zufalls- oder Ausweichports. Nur dadurch greift
// der Browser bei jedem Start wieder auf exakt denselben localStorage zu.
listenOnGamePort(server).then(() => {
  const url = `${GAME_ORIGIN}/`;
  console.log(`Gym Critters läuft unter:\n${url}\nMit Strg+C beenden.`);
  openGame(url);
}).catch(async (error) => {
  if (error.code === "EADDRINUSE" && await isGameServerRunning()) {
    const url = `${GAME_ORIGIN}/`;
    console.log(`Gym Critters läuft bereits unter:\n${url}\nDie bestehende Instanz wird geöffnet.`);
    openGame(url);
    return;
  }
  if (error.code === "EADDRINUSE") {
    console.error(
      `Der feste Spiel-Port ${GAME_HOST}:${GAME_PORT} ist durch ein anderes Programm belegt.\n` +
      "Beende dieses Programm und starte Gym Critters erneut. Ein Ausweichport wird bewusst nicht verwendet, damit der Spielstand erhalten bleibt.",
    );
    process.exitCode = 1;
    return;
  }
  console.error(error.message);
  process.exitCode = 1;
});
