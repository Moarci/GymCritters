import test from "node:test";
import assert from "node:assert/strict";
import {
  shiftEvent,
  shiftEventBonusPercent,
  shiftEventMultiplier,
  shiftPhase,
  shiftPhaseLabel,
  unlockedWave,
  waveLayout,
  waveForItem,
  waveUnlockThresholds,
} from "../src/shift-director.js";

test("eine Schicht hat klar getrennte drei Phasen", () => {
  assert.equal(shiftPhase(0, 10), "opening");
  assert.equal(shiftPhase(4, 10), "rush");
  assert.equal(shiftPhase(8, 10), "finale");
});

test("jedes Level wechselt im Verlauf sein Ereignis", () => {
  for (const level of ["closing", "class", "legday"]) {
    assert.notEqual(shiftEvent(level, 0, 10).id, shiftEvent(level, 8, 10).id);
  }
});

test("nur passende Gegenstände erhalten den Ereignisbonus", () => {
  const event = shiftEvent("legday", 0, 10);
  assert.ok(shiftEventMultiplier(event, { type: "dumbbell", weight: "heavy" }) > 1);
  assert.equal(shiftEventMultiplier(event, { type: "towel", weight: "light" }), 1);
});

test("Wellen öffnen sich nur mit dem Rundenfortschritt", () => {
  assert.equal(unlockedWave(0, 10), 0);
  assert.equal(unlockedWave(3, 10), 1);
  assert.equal(unlockedWave(6, 10), 2);
  assert.equal(waveForItem("class", 0, 10), 0);
  assert.ok(waveForItem("class", 9, 10) > 0);
});

test("Schichtdynamik verschiebt Wellen und skaliert passende Boni", () => {
  assert.equal(unlockedWave(2, 10, "intense"), 1);
  assert.equal(unlockedWave(2, 10, "calm"), 0);
  const event = shiftEvent("closing", 0, 10);
  const item = { type: "towel", weight: "light" };
  assert.ok(shiftEventMultiplier(event, item, "intense") > shiftEventMultiplier(event, item, "standard"));
  assert.ok(shiftEventMultiplier(event, item, "calm") < shiftEventMultiplier(event, item, "standard"));
  assert.equal(shiftEventBonusPercent(event, "standard"), 20);
  assert.equal(shiftEventBonusPercent(event, "calm"), 13);
  assert.equal(shiftEventBonusPercent(event, "intense"), 27);
});

test("Schichtphasen haben kurze deutsche HUD-Bezeichnungen", () => {
  assert.equal(shiftPhaseLabel("opening"), "Auftakt");
  assert.equal(shiftPhaseLabel("rush"), "Rush");
  assert.equal(shiftPhaseLabel("finale"), "Finale");
});

test("jede Welle kann die nächste Welle ohne Sackgasse freischalten", () => {
  for (const level of ["closing", "class", "legday"]) {
    for (const dynamics of ["calm", "standard", "intense"]) {
      for (let total = 8; total <= 16; total += 1) {
        const layout = waveLayout(level, total);
        const thresholds = waveUnlockThresholds(level, total, dynamics);
        if (layout.rush > 0) {
          assert.ok(thresholds.rush <= layout.opening, `${level}/${dynamics}/${total}: Rush ist erreichbar`);
          assert.ok(unlockedWave(layout.opening, total, dynamics, level) >= 1);
        }
        if (layout.finale > 0) {
          assert.ok(thresholds.finale <= layout.opening + layout.rush, `${level}/${dynamics}/${total}: Finale ist erreichbar`);
          assert.equal(unlockedWave(layout.opening + layout.rush, total, dynamics, level), 2);
        }
      }
    }
  }
});

test("Wellenlayout weist jeden Gegenstand genau einer sichtbaren Welle zu", () => {
  for (const level of ["closing", "class", "legday"]) {
    for (let total = 1; total <= 18; total += 1) {
      const layout = waveLayout(level, total);
      assert.equal(layout.opening + layout.rush + layout.finale, total);
      const counts = [0, 0, 0];
      for (let index = 0; index < total; index += 1) counts[waveForItem(level, index, total)] += 1;
      assert.deepEqual(counts, [layout.opening, layout.rush, layout.finale]);
    }
  }
});
