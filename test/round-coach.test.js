import test from "node:test";
import assert from "node:assert/strict";
import { roundCoaching } from "../src/round-coach.js";

const cleanRound = {
  completed: true,
  timed: true,
  totalItems: 10,
  delivered: 10,
  elapsed: 100,
  expectedSecondsPerItem: 12,
  wrongPlacements: 0,
  droppedItems: 0,
  trips: 0,
  maxCombo: 10,
};

test("unvollständige Runden priorisieren zuerst den Abschluss", () => {
  const coaching = roundCoaching({ ...cleanRound, completed: false, delivered: 7 });
  assert.match(coaching.title, /abschließen/i);
  assert.match(coaching.body, /3 Gegenstände/);
});

test("Sicherheit wird vor Tempo und Serie verbessert", () => {
  const coaching = roundCoaching({
    ...cleanRound,
    trips: 2,
    wrongPlacements: 3,
    maxCombo: 2,
  });
  assert.match(coaching.title, /Laufwege/i);
});

test("saubere Verbesserungen werden als vergleichbarer Trend sichtbar", () => {
  const coaching = roundCoaching(cleanRound, { status: "improved", delta: 6 });
  assert.equal(coaching.tone, "improved");
  assert.match(coaching.title, /\+6/);
  assert.equal(coaching.metrics.length, 3);
});
