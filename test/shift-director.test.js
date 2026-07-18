import test from "node:test";
import assert from "node:assert/strict";
import {
  shiftEvent,
  shiftEventMultiplier,
  shiftPhase,
  unlockedWave,
  waveForItem,
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
