import test from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers/local-storage.js";
import { createDefaultSave, owns, buyOrEquip, loadSave, evaluateAchievements } from "../src/save.js";
import { SAVE_KEY, SAVE_VERSION } from "../src/config.js";

test("createDefaultSave startet auf der aktuellen Version mit Startausrüstung", () => {
  const save = createDefaultSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.coins, 0);
  assert.ok(save.owned.includes("raccoon"));
  assert.ok(save.owned.includes("headband-lime"));
  assert.equal(save.selectedCharacter, "raccoon");
});

test("buyOrEquip verweigert einen Kauf ohne ausreichend Münzen", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 10;
  const result = buyOrEquip(save, { id: "sunglasses", cost: 120, slot: "face" });
  assert.deepEqual(result, { ok: false, reason: "coins" });
  assert.equal(save.coins, 10);
  assert.ok(!owns(save, "sunglasses"));
});

test("buyOrEquip zieht Münzen ab, merkt Besitz und rüstet den Slot aus", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 200;
  const result = buyOrEquip(save, { id: "sunglasses", cost: 120, slot: "face" });
  assert.equal(result.ok, true);
  assert.equal(save.coins, 80);
  assert.ok(owns(save, "sunglasses"));
  assert.equal(save.equipped.face, "sunglasses");
});

test("ein gekaufter Charakter wird ausgewählt statt in einen Ausrüstungsslot gelegt", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 300;
  buyOrEquip(save, { id: "squirrel", cost: 250, slot: "character" });
  assert.equal(save.selectedCharacter, "squirrel");
  assert.equal(save.coins, 50);
});

test("erneutes Ausrüsten eines Nicht-Kopf-Cosmetics schaltet es ab, ohne doppelt zu kassieren", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 200;
  const item = { id: "sunglasses", cost: 120, slot: "face" };
  buyOrEquip(save, item);
  assert.equal(save.equipped.face, "sunglasses");
  buyOrEquip(save, item);
  assert.equal(save.equipped.face, null);
  assert.equal(save.coins, 80);
});

test("loadSave fällt auf Defaults zurück, wenn nichts gespeichert ist", () => {
  installLocalStorage();
  const save = loadSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.coins, 0);
});

test("loadSave übersteht einen beschädigten Spielstand", () => {
  installLocalStorage({ [SAVE_KEY]: "{kein gültiges json" });
  const save = loadSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.coins, 0);
});

test("loadSave migriert den globalen V3-Highscore in den zuletzt gespielten Modus", () => {
  installLocalStorage({
    [SAVE_KEY]: JSON.stringify({ version: 3, highScore: 4200, lastMode: "blitz" }),
  });
  const save = loadSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.modeStats.blitz.highScore, 4200);
  assert.equal(save.modeStats.standard.highScore, 0);
});

test("loadSave migriert V3-Bestzeiten pro Modus", () => {
  installLocalStorage({
    [SAVE_KEY]: JSON.stringify({ version: 3, bestTimes: { standard: 88 } }),
  });
  const save = loadSave();
  assert.equal(save.modeStats.standard.bestTime, 88);
});

test("loadSave setzt einen nicht besessenen Charakter zurück", () => {
  installLocalStorage({
    [SAVE_KEY]: JSON.stringify({ version: 4, selectedCharacter: "squirrel", owned: ["raccoon"] }),
  });
  const save = loadSave();
  assert.equal(save.selectedCharacter, "raccoon");
});

test("die erste beendete Runde schaltet first-shift genau einmal frei", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.stats.totalRounds = 1;
  const first = evaluateAchievements(save);
  assert.ok(first.some((entry) => entry.id === "first-shift"));
  const second = evaluateAchievements(save);
  assert.ok(!second.some((entry) => entry.id === "first-shift"));
});

test("eine Runde ohne Fallenlassen schaltet sticky-paws frei", () => {
  installLocalStorage();
  const save = createDefaultSave();
  const unlocked = evaluateAchievements(save, {
    completed: true, droppedItems: 0, maxCombo: 0, totalItems: 10,
    wrongPlacements: 1, mode: "standard", elapsed: 100,
  });
  assert.ok(unlocked.some((entry) => entry.id === "sticky-paws"));
});

test("collector schaltet bei vier Artikeln über die Startausrüstung hinaus frei", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.owned.push("headband-red", "headband-blue", "wristbands", "sunglasses");
  const unlocked = evaluateAchievements(save);
  assert.ok(unlocked.some((entry) => entry.id === "collector"));
});

test("speed-cleaner verlangt Standard-Modus UND die Zeitgrenze", () => {
  installLocalStorage();
  const zuLangsam = createDefaultSave();
  assert.ok(!evaluateAchievements(zuLangsam, {
    completed: true, droppedItems: 1, maxCombo: 0, totalItems: 10,
    wrongPlacements: 0, mode: "standard", elapsed: 90,
  }).some((entry) => entry.id === "speed-cleaner"));

  const falscherModus = createDefaultSave();
  assert.ok(!evaluateAchievements(falscherModus, {
    completed: true, droppedItems: 1, maxCombo: 0, totalItems: 10,
    wrongPlacements: 0, mode: "blitz", elapsed: 60,
  }).some((entry) => entry.id === "speed-cleaner"));
});
