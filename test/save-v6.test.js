import test from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers/local-storage.js";
import {
  createDefaultSave,
  evaluateAchievements,
  loadSave,
  migrateSave,
  parseSaveImport,
  serializeSaveExport,
} from "../src/save.js";
import { SAVE_KEY, SAVE_VERSION } from "../src/config.js";

test("V6-Default enthält Level-Bestwerte, Karriere und Tagesverträge", () => {
  const save = createDefaultSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.levelModeStats.closing.standard.highScore, 0);
  assert.equal(save.career.levels.closing.level, 1);
  assert.deepEqual(save.contracts.active, []);
});

test("V5-Modusbestwerte bleiben erhalten und werden dem letzten Level zugeordnet", () => {
  const save = migrateSave({
    version: 5,
    lastLevel: "legday",
    modeStats: { standard: { highScore: 4321, bestTime: 61, bestRank: "S", rounds: 8 } },
  });
  assert.equal(save.modeStats.standard.highScore, 4321);
  assert.equal(save.levelModeStats.legday.standard.highScore, 4321);
  assert.equal(save.levelModeStats.legday.standard.migratedFromModeStats, true);
  assert.equal(save.levelModeStats.class.standard.highScore, 0);
});

test("Migration ergänzt neue Felder, ohne vorhandene V6-Karriere zu verlieren", () => {
  const save = migrateSave({
    version: 6,
    career: { levels: { closing: { xp: 715, rounds: 9, completedRounds: 7, bestRank: "A" } } },
    stats: { totalScore: 12345, completedContracts: 3 },
  });
  assert.equal(save.career.levels.closing.xp, 715);
  assert.equal(save.career.levels.closing.level, 3);
  assert.equal(save.career.levels.closing.rounds, 9);
  assert.equal(save.stats.totalScore, 12345);
  assert.equal(save.stats.completedContracts, 3);
});

test("manipulierte Vertragsbelohnungen werden beim Laden aus Config rekonstruiert", () => {
  const save = migrateSave({
    version: 6,
    contracts: {
      dayKey: "2026-07-18",
      active: [{
        definitionId: "delivery-dozen",
        progress: 2,
        target: 1,
        reward: 999999,
        completed: false,
      }],
    },
  });
  assert.equal(save.contracts.active[0].target, 12);
  assert.equal(save.contracts.active[0].reward, 35);
});

test("Export und Import liefern einen validierten, migrierten Roundtrip", () => {
  const save = createDefaultSave();
  save.coins = 777;
  save.career.levels.class.xp = 800;
  const json = serializeSaveExport(save, { pretty: false, exportedAt: "2026-07-18T12:00:00.000Z" });
  const parsed = parseSaveImport(json);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.format, "gym-critters-save");
  assert.equal(parsed.save.coins, 777);
  assert.equal(parsed.save.career.levels.class.xp, 800);
});

test("Import akzeptiert alte rohe Save-JSONs", () => {
  const parsed = parseSaveImport(JSON.stringify({ version: 3, coins: 12, highScore: 900, lastMode: "blitz" }));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.format, "legacy-json");
  assert.equal(parsed.save.version, SAVE_VERSION);
  assert.equal(parsed.save.modeStats.blitz.highScore, 900);
});

test("Import weist leere, fremde und zukünftige Dateien verständlich ab", () => {
  assert.equal(parseSaveImport("").ok, false);
  assert.equal(parseSaveImport("{kaputt").ok, false);
  assert.equal(parseSaveImport("{}").ok, false);
  assert.equal(parseSaveImport(JSON.stringify({ format: "fremdes-spiel", save: {} })).ok, false);
  assert.equal(parseSaveImport(JSON.stringify({ version: SAVE_VERSION + 1 })).ok, false);
});

test("loadSave bewahrt einen bereits gespeicherten V6-Levelrekord", () => {
  installLocalStorage({
    [SAVE_KEY]: JSON.stringify({
      version: 6,
      levelModeStats: { class: { blitz: { highScore: 5555, bestRank: "A", rounds: 2 } } },
    }),
  });
  assert.equal(loadSave().levelModeStats.class.blitz.highScore, 5555);
});

test("neue Karriere-Achievements verwenden Vertrag, Meisterschaft und Münzsumme", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.contracts.completedTotal = 10;
  save.stats.totalCoinsEarned = 1500;
  for (const level of Object.values(save.career.levels)) level.xp = 1400;
  const unlocked = evaluateAchievements(save).map((entry) => entry.id);
  assert.ok(unlocked.includes("contract-pro"));
  assert.ok(unlocked.includes("master-of-the-gym"));
  assert.ok(unlocked.includes("coin-earner"));
});
