import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ROUND_HISTORY,
  appendRoundHistory,
  performanceIndex,
  roundTrend,
  sanitizeRoundHistory,
} from "../src/progression.js";

function round(performanceOverrides = {}) {
  return {
    level: "closing",
    mode: "standard",
    character: "raccoon",
    completed: true,
    timed: true,
    score: 1500,
    elapsed: 100,
    delivered: 10,
    totalItems: 10,
    maxCombo: 8,
    wrongPlacements: 0,
    droppedItems: 0,
    trips: 0,
    ...performanceOverrides,
  };
}

test("Leistungsindex belohnt Abschluss, saubere Ablagen, Combo und Tempo", () => {
  const clean = performanceIndex(round());
  const messy = performanceIndex(round({
    completed: false,
    delivered: 6,
    maxCombo: 2,
    wrongPlacements: 2,
    droppedItems: 2,
    trips: 2,
    elapsed: 115,
  }));
  assert.ok(clean > messy);
  assert.ok(clean >= 0 && clean <= 100);
  assert.ok(messy >= 0 && messy <= 100);
});

test("Rundenhistorie ist begrenzt und speichert einen stabilen Leistungswert", () => {
  const save = { roundHistory: [] };
  for (let index = 0; index < MAX_ROUND_HISTORY + 5; index += 1) {
    appendRoundHistory(save, round({ score: index }), 1000 + index);
  }
  assert.equal(save.roundHistory.length, MAX_ROUND_HISTORY);
  assert.ok(save.roundHistory.every((entry) => Number.isFinite(entry.performance)));
  assert.equal(save.roundHistory.at(-1).timestamp, 1000 + MAX_ROUND_HISTORY + 4);
});

test("Trend vergleicht die neuere mit der vorherigen Hälfte", () => {
  const history = [42, 44, 43, 45, 67, 70, 72, 74].map((performance, index) => ({
    ...round(),
    id: String(index),
    timestamp: index + 1,
    performance,
  }));
  const trend = roundTrend(history, { level: "closing", mode: "standard" });
  assert.equal(trend.status, "improved");
  assert.ok(trend.delta > 20);
  assert.equal(trend.sampleSize, 8);
});

test("Trend meldet bei zu wenig Daten ehrlich eine unzureichende Basis", () => {
  assert.equal(roundTrend([round(), round()]).status, "insufficient");
});

test("Migration verwirft fremde Historieneinträge", () => {
  assert.deepEqual(sanitizeRoundHistory([{ level: "unbekannt", mode: "standard" }]), []);
});
