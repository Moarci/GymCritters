import http from "node:http";

// localStorage ist an die vollständige Origin gebunden. Host und Port dürfen sich
// deshalb zwischen zwei Spielstarts nicht ändern.
export const GAME_HOST = "127.0.0.1";
export const GAME_PORT = 8347;
export const GAME_ORIGIN = `http://${GAME_HOST}:${GAME_PORT}`;
export const INSTANCE_PATH = "/.gym-critters-instance";
export const INSTANCE_TOKEN = "gym-critters-local-v1";

export function listenOnGamePort(server, port = GAME_PORT) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.removeListener("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve(server.address()?.port ?? port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, GAME_HOST);
  });
}

// Erlaubt Node- und Python-Launcher, eine bereits laufende Gym-Critters-Instanz
// sicher zu erkennen. Ein beliebiger anderer Dienst auf Port 8347 zählt nicht.
export function isGameServerRunning({
  host = GAME_HOST,
  port = GAME_PORT,
  timeoutMs = 700,
} = {}) {
  return new Promise((resolve) => {
    const request = http.get({
      host,
      port,
      path: INSTANCE_PATH,
      timeout: timeoutMs,
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        if (body.length <= INSTANCE_TOKEN.length) body += chunk;
      });
      response.on("end", () => {
        resolve(response.statusCode === 200 && body === INSTANCE_TOKEN);
      });
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(false));
  });
}
