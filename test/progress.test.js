import test from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers/local-storage.js";
import { createDefaultSave, loadSave, achievementProgress, nextGoal, evaluateAchievements } from "../src/save.js";
import { ACHIEVEMENTS, SAVE_KEY, SAVE_VERSION } from "../src/config.js";

const ziel = (id) => ACHIEVEMENTS.find((eintrag) => eintrag.id === id);

test("neue Spielstände bringen einen leeren Typenzähler mit", () => {
  const save = createDefaultSave();
  assert.deepEqual(save.stats.byType, {});
});

test("Migration überträgt vorhandenen Hantel-Fortschritt in den Typenzähler", () => {
  installLocalStorage({
    [SAVE_KEY]: JSON.stringify({ version: 4, stats: { totalDumbbells: 7, totalDelivered: 20 } }),
  });
  const save = loadSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.stats.byType.dumbbell, 7, "der Fortschritt Richtung Schwerarbeiter darf nicht verlorengehen");
});

test("Migration fasst einen bereits migrierten Spielstand nicht an", () => {
  installLocalStorage({
    [SAVE_KEY]: JSON.stringify({
      version: 5,
      stats: { totalDumbbells: 7, byType: { dumbbell: 12, rope: 3 } },
    }),
  });
  const save = loadSave();
  assert.equal(save.stats.byType.dumbbell, 12, "der genauere Zählerstand gewinnt");
  assert.equal(save.stats.byType.rope, 3);
});

test("achievementProgress liefert nichts für Ja/Nein-Ziele", () => {
  const save = createDefaultSave();
  for (const id of ["sticky-paws", "perfect-order", "speed-cleaner"]) {
    assert.equal(achievementProgress(save, ziel(id)), null, `${id} darf keinen Balken bekommen`);
  }
});

test("achievementProgress zählt einen Gegenstandstyp", () => {
  const save = createDefaultSave();
  save.stats.byType.dumbbell = 6;
  assert.deepEqual(achievementProgress(save, ziel("heavy-lifter")), { aktuell: 6, ziel: 10 });
});

test("achievementProgress kommt mit einem noch leeren Zähler klar", () => {
  const save = createDefaultSave();
  assert.deepEqual(achievementProgress(save, ziel("heavy-lifter")), { aktuell: 0, ziel: 10 });
});

test("achievementProgress deckelt bei Übererfüllung auf das Ziel", () => {
  const save = createDefaultSave();
  save.stats.byType.dumbbell = 99;
  assert.deepEqual(achievementProgress(save, ziel("heavy-lifter")), { aktuell: 10, ziel: 10 });
});

test("achievementProgress zählt alle aufgeräumten Gegenstände", () => {
  const save = createDefaultSave();
  save.stats.totalDelivered = 31;
  assert.deepEqual(achievementProgress(save, ziel("gym-hero")), { aktuell: 31, ziel: 50 });
});

test("achievementProgress klammert die Startausrüstung aus", () => {
  const save = createDefaultSave();
  assert.deepEqual(achievementProgress(save, ziel("collector")), { aktuell: 0, ziel: 4 });
  save.owned.push("headband-red", "sunglasses");
  assert.deepEqual(achievementProgress(save, ziel("collector")), { aktuell: 2, ziel: 4 });
});

test("achievementProgress zählt für Vollsortiment nur wirklich gelieferte Typen", () => {
  const save = createDefaultSave();
  save.stats.byType = { dumbbell: 3, towel: 1, rope: 0 };
  assert.deepEqual(achievementProgress(save, ziel("full-range")), { aktuell: 2, ziel: 7 });
});

test("nextGoal wählt das anteilig am weitesten fortgeschrittene offene Ziel", () => {
  const save = createDefaultSave();
  save.stats.byType.dumbbell = 9;      // 90 %
  save.stats.totalDelivered = 5;       // 10 %
  const naechstes = nextGoal(save);
  assert.equal(naechstes.achievement.id, "heavy-lifter");
  assert.equal(naechstes.aktuell, 9);
  assert.equal(naechstes.ziel, 10);
  assert.equal(naechstes.rest, 1);
});

test("nextGoal überspringt bereits freigeschaltete Ziele", () => {
  const save = createDefaultSave();
  save.stats.byType.dumbbell = 9;
  save.achievements["heavy-lifter"] = Date.now();
  save.stats.totalDelivered = 5;
  assert.notEqual(nextGoal(save)?.achievement.id, "heavy-lifter");
});

test("nextGoal liefert nichts, wenn alle zählbaren Ziele erreicht sind", () => {
  const save = createDefaultSave();
  for (const eintrag of ACHIEVEMENTS) save.achievements[eintrag.id] = Date.now();
  assert.equal(nextGoal(save), null);
});

test("die neuen Ziele schalten bei erreichter Schwelle frei — und nur einmal", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.stats.byType = { kettlebell: 10, rope: 15, medball: 10 };
  const ersteAuswertung = evaluateAchievements(save);
  const ids = ersteAuswertung.map((eintrag) => eintrag.id);
  assert.ok(ids.includes("kettlebell-king"));
  assert.ok(ids.includes("rope-skipper"));
  assert.ok(ids.includes("ball-artist"));
  assert.equal(evaluateAchievements(save).length, 0, "beim zweiten Mal darf nichts erneut freischalten");
});

test("Vollsortiment verlangt wirklich alle sieben Typen", () => {
  installLocalStorage();
  const fast = createDefaultSave();
  fast.stats.byType = { dumbbell: 1, towel: 1, bottle: 1, mat: 1, kettlebell: 1, rope: 1 };
  assert.ok(!evaluateAchievements(fast).some((e) => e.id === "full-range"), "sechs Typen genügen nicht");

  const komplett = createDefaultSave();
  komplett.stats.byType = { dumbbell: 1, towel: 1, bottle: 1, mat: 1, kettlebell: 1, rope: 1, medball: 1 };
  assert.ok(evaluateAchievements(komplett).some((e) => e.id === "full-range"));
});
