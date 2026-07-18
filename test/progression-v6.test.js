import test from "node:test";
import assert from "node:assert/strict";
import {
  betterRank,
  masteryLevelForXp,
  masteryProgress,
  masteryXpForRound,
  recordRoundProgress,
  totalMasteryLevels,
} from "../src/progression.js";
import { createDefaultSave } from "../src/save.js";

function finishedRound(overrides = {}) {
  return {
    level: "class",
    mode: "standard",
    character: "squirrel",
    completed: true,
    score: 2500,
    elapsed: 72,
    rank: "A",
    delivered: 10,
    deliveredByType: { towel: 6, bottle: 4 },
    droppedItems: 0,
    wrongPlacements: 0,
    maxCombo: 10,
    totalItems: 10,
    coinsEarned: 21,
    ...overrides,
  };
}

test("Meisterschaftsstufen folgen den deklarierten XP-Schwellen", () => {
  assert.equal(masteryLevelForXp(0), 1);
  assert.equal(masteryLevelForXp(249), 1);
  assert.equal(masteryLevelForXp(250), 2);
  assert.equal(masteryLevelForXp(2400), 5);
  assert.equal(masteryLevelForXp(999999), 5);
});

test("masteryProgress beschreibt Weg zur nächsten Stufe und Maximalstufe", () => {
  assert.deepEqual(masteryProgress(250), {
    level: 2,
    xp: 250,
    currentThreshold: 250,
    nextThreshold: 700,
    xpIntoLevel: 0,
    xpForNextLevel: 450,
    ratio: 0,
    maxed: false,
  });
  assert.equal(masteryProgress(2500).maxed, true);
  assert.equal(masteryProgress(2500).ratio, 1);
});

test("Meisterschafts-XP belohnt Abschluss, Punkte, sichere Pfoten und Perfektion", () => {
  assert.equal(masteryXpForRound(finishedRound()), 180);
  assert.equal(masteryXpForRound(finishedRound({ completed: false })), 50);
});

test("recordRoundProgress führt faire Bestwerte je Level × Modus", () => {
  const save = createDefaultSave();
  recordRoundProgress(save, finishedRound(), { date: "2026-07-18", now: 100 });
  assert.equal(save.levelModeStats.class.standard.highScore, 2500);
  assert.equal(save.levelModeStats.class.standard.bestTime, 72);
  assert.equal(save.levelModeStats.class.standard.bestRank, "A");
  assert.equal(save.levelModeStats.class.standard.rounds, 1);
  assert.equal(save.levelModeStats.closing.standard.highScore, 0);
  assert.equal(save.modeStats.standard.highScore, 2500, "alte Modus-Summe bleibt parallel erhalten");
});

test("eine schwächere Folgerunde überschreibt keine Bestwerte", () => {
  const save = createDefaultSave();
  recordRoundProgress(save, finishedRound(), { date: "2026-07-18" });
  recordRoundProgress(save, finishedRound({ score: 1000, elapsed: 95, rank: "B" }), { date: "2026-07-18" });
  const stats = save.levelModeStats.class.standard;
  assert.equal(stats.highScore, 2500);
  assert.equal(stats.bestTime, 72);
  assert.equal(stats.bestRank, "A");
  assert.equal(stats.rounds, 2);
});

test("recordRoundProgress aktualisiert globale Statistik und Karriere atomar", () => {
  const save = createDefaultSave();
  const result = recordRoundProgress(save, finishedRound(), { date: "2026-07-18" });
  assert.equal(save.stats.totalRounds, 1);
  assert.equal(save.stats.totalDelivered, 10);
  assert.deepEqual(save.stats.byType, { towel: 6, bottle: 4 });
  assert.equal(save.stats.perfectRounds, 1);
  assert.equal(save.stats.totalScore, 2500);
  assert.equal(save.coins >= 21, true);
  assert.equal(save.career.levels.class.xp, result.xpEarned);
  assert.equal(save.career.levels.class.completedRounds, 1);
  assert.equal(save.selectedCharacter, "squirrel");
});

test("Rangvergleich kennt die korrekte Reihenfolge", () => {
  assert.equal(betterRank("B", "A"), "A");
  assert.equal(betterRank("S", "A"), "S");
  assert.equal(betterRank(null, "C"), "C");
  assert.equal(betterRank("B", "X"), "B");
});

test("Gesamt-Meisterschaft zählt jede Levelstufe", () => {
  const save = createDefaultSave();
  save.career.levels.closing.xp = 250;
  save.career.levels.class.xp = 700;
  save.career.levels.legday.xp = 0;
  assert.equal(totalMasteryLevels(save), 2 + 3 + 1);
});

