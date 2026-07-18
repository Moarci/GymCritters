import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";

import {
  GAME_HOST,
  GAME_ORIGIN,
  GAME_PORT,
  INSTANCE_PATH,
  INSTANCE_TOKEN,
  isGameServerRunning,
  listenOnGamePort,
} from "../server-ports.js";

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, GAME_HOST, () => resolve(server.address().port));
  });
}

test("verwendet genau eine feste Origin für dauerhaften localStorage", () => {
  assert.equal(GAME_HOST, "127.0.0.1");
  assert.equal(GAME_PORT, 8347);
  assert.equal(GAME_ORIGIN, "http://127.0.0.1:8347");
});

test("bindet den angeforderten Port", async () => {
  const server = http.createServer(() => {});
  try {
    const port = await listenOnGamePort(server, 0);
    assert.ok(port > 0);
    assert.equal(server.address().port, port);
  } finally {
    await closeServer(server);
  }
});

test("weicht bei belegtem Spiel-Port nicht auf eine andere Origin aus", async () => {
  const blocker = http.createServer(() => {});
  const server = http.createServer(() => {});
  try {
    const occupiedPort = await listenOnGamePort(blocker, 0);
    await assert.rejects(
      () => listenOnGamePort(server, occupiedPort),
      (error) => error.code === "EADDRINUSE",
    );
  } finally {
    if (server.listening) await closeServer(server);
    await closeServer(blocker);
  }
});

test("erkennt eine bereits laufende Gym-Critters-Instanz", async () => {
  const existing = http.createServer((request, response) => {
    if (request.url === INSTANCE_PATH) {
      response.writeHead(200).end(INSTANCE_TOKEN);
      return;
    }
    response.writeHead(404).end();
  });
  const port = await listen(existing);
  try {
    assert.equal(await isGameServerRunning({ port }), true);
  } finally {
    await closeServer(existing);
  }
});

test("verwechselt einen fremden Dienst nicht mit Gym Critters", async () => {
  const foreign = http.createServer((_request, response) => {
    response.writeHead(200).end("anderer lokaler Dienst");
  });
  const port = await listen(foreign);
  try {
    assert.equal(await isGameServerRunning({ port }), false);
  } finally {
    await closeServer(foreign);
  }
});
