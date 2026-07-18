import test from "node:test";
import assert from "node:assert/strict";
import { MODES } from "../src/config.js";
import { recordRoundProgress } from "../src/progression.js";
import { createDefaultSave } from "../src/save.js";

test("Zen ist ein echter Modus ohne Zeitlimit", () => {
  assert.equal(MODES.zen.timed, false);
  assert.equal(MODES.zen.seconds, null);
  assert.equal(MODES.zen.navigator, "always");
  assert.ok(MODES.zen.itemCount > 0);
});

test("Zen-Runden führen bewusst keine Bestzeit", () => {
  const save = createDefaultSave();
  recordRoundProgress(save, {
    level: "closing",
    mode: "zen",
    character: "raccoon",
    completed: true,
    timed: false,
    score: 1000,
    elapsed: 999,
    delivered: 10,
    totalItems: 10,
    maxCombo: 4,
    droppedItems: 0,
    wrongPlacements: 0,
    trips: 0,
    coinsEarned: 8,
  });
  assert.equal(save.levelModeStats.closing.zen.bestTime, null);
  assert.equal(save.levelModeStats.closing.zen.rounds, 1);
  assert.equal(save.roundHistory[0].elapsed, 999, "die Entwicklung darf das tatsächliche Tempo trotzdem kennen");
});
