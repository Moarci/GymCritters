import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../style.css", import.meta.url), "utf8");
const worker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));

test("die App-Shell enthält keine doppelten IDs", () => {
  const ids = [...index.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("Dialoge haben zugängliche Namen und modales Verhalten", () => {
  const dialogIds = [
    ["pauseScreen", "pauseTitle"],
    ["resultScreen", "resultTitle"],
    ["shopScreen", "shopTitle"],
    ["achievementsScreen", "achievementsTitle"],
    ["statsScreen", "statsTitle"],
    ["settingsScreen", "settingsTitle"],
  ];

  for (const [id, labelId] of dialogIds) {
    assert.match(
      index,
      new RegExp(`id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="${labelId}"`),
    );
    assert.match(index, new RegExp(`id="${labelId}"`));
  }
});

test("Accessibility- und Einstellungs-Hooks bleiben stabil", () => {
  for (const id of [
    "gameAnnouncements",
    "masterVolume",
    "reducedMotionSetting",
    "exportSaveButton",
    "importSaveButton",
    "importSaveInput",
    "contractHud",
    "contractTitle",
    "contractProgress",
    "contractProgressBar",
    "resultContracts",
    "masteryResult",
    "masteryLevel",
    "masteryProgressText",
    "masteryProgressBar",
    "itemAmountSetting",
    "shiftDynamicsSetting",
    "tripRiskSetting",
    "navigatorSetting",
    "shiftPreviewCard",
    "trendSummary",
    "trendChart",
    "recentRounds",
    "statsLevelFilter",
    "statsModeFilter",
  ]) {
    assert.match(index, new RegExp(`id="${id}"`));
  }
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("Manifest und Service Worker bilden eine offlinefähige App-Shell", () => {
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.length > 0);

  for (const asset of [
    "./index.html",
    "./style.css",
    "./ui-accessibility.js",
    "./src/main.js",
    "./src/challenges.js",
    "./src/progression.js",
    "./src/shift-director.js",
    "./src/shift-settings.js",
    "./src/trip-physics.js",
    "./src/environment/index.js",
    "./src/environment/level-decor-specs.js",
  ]) {
    assert.ok(worker.includes(`"${asset}"`), `${asset} fehlt im lokalen Cache`);
  }
  assert.match(worker, /cdn\.babylonjs\.com/);
  assert.match(worker, /cdn\.jsdelivr\.net/);
  assert.match(index, /navigator\.serviceWorker\.register\("\.\/service-worker\.js"/);
});
