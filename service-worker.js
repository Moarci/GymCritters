const CACHE_VERSION = "gym-critters-v5-2026-07-18-r2";
const LOCAL_CACHE = `${CACHE_VERSION}-local`;
const ENGINE_CACHE = `${CACHE_VERSION}-engine`;
const APP_SCOPE = new URL("./", self.location.href);

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./ui-accessibility.js",
  "./src/audio.js",
  "./src/babylon.js",
  "./src/camera-fov.js",
  "./src/challenges.js",
  "./src/character-motion.js",
  "./src/config.js",
  "./src/impact.js",
  "./src/main.js",
  "./src/materials.js",
  "./src/progression.js",
  "./src/save.js",
  "./src/shift-director.js",
  "./src/targeting.js",
  "./src/utils.js",
  "./src/environment/decor.js",
  "./src/environment/index.js",
  "./src/environment/level-decor-specs.js",
  "./src/environment/structure.js",
  "./src/environment/textures.js",
  "./src/input/index.js",
  "./src/input/joystick.js",
  "./src/input/touch-look.js",
  "./src/perf/adaptive-quality.js",
  "./src/perf/render-scale.js"
].map((path) => new URL(path, APP_SCOPE).href);

const ENGINE_HOSTS = new Set([
  "cdn.babylonjs.com",
  "cdn.jsdelivr.net"
]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(LOCAL_CACHE);
    const results = await Promise.allSettled(
      CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" }))),
    );
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) {
      console.warn(`${failed.length} lokale Assets konnten nicht vorab gespeichert werden.`);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const currentCaches = new Set([LOCAL_CACHE, ENGINE_CACHE]);
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("gym-critters-") && !currentCaches.has(name))
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

async function cacheSuccessfulResponse(cacheName, request, response) {
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstEngine(request) {
  const cache = await caches.open(ENGINE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  return cacheSuccessfulResponse(ENGINE_CACHE, request, response);
}

async function networkFirstLocal(request) {
  try {
    const response = await fetch(request);
    return cacheSuccessfulResponse(LOCAL_CACHE, request, response);
  } catch (error) {
    const cache = await caches.open(LOCAL_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (request.mode === "navigate") {
      const fallback = await cache.match(new URL("./index.html", APP_SCOPE).href);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (ENGINE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirstEngine(request));
    return;
  }

  if (url.origin === self.location.origin && url.href.startsWith(APP_SCOPE.href)) {
    event.respondWith(networkFirstLocal(request));
  }
});
