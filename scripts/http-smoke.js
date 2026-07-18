import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const absolute = path.resolve(root, relative);
  const rootBoundary = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (absolute !== root && !absolute.startsWith(rootBoundary)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(absolute);
    const type = contentTypes[path.extname(absolute)] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    }).end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const checks = [
  ["/", "text/html", "id=\"gameCanvas\""],
  ["/style.css", "text/css", "prefers-reduced-motion"],
  ["/src/main.js", "text/javascript", "createScene"],
  ["/ui-accessibility.js", "text/javascript", "syncScreenState"],
  ["/service-worker.js", "text/javascript", "cdn.babylonjs.com"],
  ["/manifest.webmanifest", "application/manifest+json", "\"Gym Critters\""],
  ["/favicon.svg", "image/svg+xml", "<svg"],
];

const failures = [];
try {
  for (const [pathname, contentType, marker] of checks) {
    const response = await fetch(`${origin}${pathname}`);
    const body = await response.text();
    if (!response.ok) failures.push(`${pathname}: HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.startsWith(contentType)) {
      failures.push(`${pathname}: unerwarteter Content-Type ${response.headers.get("content-type")}`);
    }
    if (!body.includes(marker)) failures.push(`${pathname}: Marker ${marker} fehlt`);
  }

  const missing = await fetch(`${origin}/does-not-exist.js`);
  if (missing.status !== 404) failures.push(`/does-not-exist.js: HTTP ${missing.status} statt 404`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(`HTTP-Smoke-Test fehlgeschlagen:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Statische App-Shell erfolgreich über HTTP geprüft (${checks.length} Assets).`);
}
