import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultSave, migrateSave } from "../src/save.js";
import { SAVE_VERSION } from "../src/config.js";

test("V7-Default enthält levelweise Schichtoptionen und Rundenhistorie", () => {
  const save = createDefaultSave();
  assert.equal(save.version, 7);
  assert.equal(save.version, SAVE_VERSION);
  assert.deepEqual(Object.keys(save.levelSettings), ["closing", "class", "legday"]);
  assert.equal(save.levelSettings.closing.tripRisk, "standard");
  assert.deepEqual(save.roundHistory, []);
  assert.equal(save.stats.totalTrips, 0);
});

test("V6-Spielstände erhalten additive Standardoptionen ohne Fortschrittsverlust", () => {
  const migrated = migrateSave({
    version: 6,
    coins: 321,
    stats: { totalRounds: 9 },
    levelSettings: {
      closing: { itemAmount: "full", dynamics: "intense", tripRisk: "forgiving", guidance: "off" },
      class: { itemAmount: "unbekannt" },
    },
  });
  assert.equal(migrated.coins, 321);
  assert.equal(migrated.stats.totalRounds, 9);
  assert.equal(migrated.levelSettings.closing.itemAmount, "full");
  assert.equal(migrated.levelSettings.class.itemAmount, "standard");
  assert.equal(migrated.levelSettings.legday.guidance, "mode");
});

test("kaputte Historieneinträge werden bei der Migration verworfen", () => {
  const migrated = migrateSave({
    roundHistory: [
      { level: "closing", mode: "standard", timestamp: 1, totalItems: 10, delivered: 8 },
      { level: "nirgendwo", mode: "standard" },
    ],
  });
  assert.equal(migrated.roundHistory.length, 1);
  assert.equal(migrated.roundHistory[0].level, "closing");
});
