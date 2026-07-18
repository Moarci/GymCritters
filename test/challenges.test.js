import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRoundToContracts,
  contractDefinition,
  contractRoundProgress,
  dailyContractSet,
  deterministicSeed,
  ensureDailyContracts,
  localDayKey,
} from "../src/challenges.js";
import { CONTRACT_DEFINITIONS } from "../src/config.js";
import { createDefaultSave } from "../src/save.js";

test("localDayKey bildet das lokale Kalenderdatum stabil als YYYY-MM-DD ab", () => {
  assert.equal(localDayKey(new Date(2026, 6, 18, 23, 45)), "2026-07-18");
});

test("Tages-Seed und Vertragsauswahl sind deterministisch", () => {
  assert.equal(deterministicSeed("2026-07-18"), deterministicSeed("2026-07-18"));
  assert.notEqual(deterministicSeed("2026-07-18"), deterministicSeed("2026-07-19"));
  assert.deepEqual(dailyContractSet("2026-07-18"), dailyContractSet("2026-07-18"));
});

test("jeder Tag enthält genau einen Vertrag je ausgewogener Gruppe", () => {
  const contracts = dailyContractSet("2026-07-18");
  assert.equal(contracts.length, 3);
  const groups = contracts.map((entry) => contractDefinition(entry).group).sort();
  assert.deepEqual(groups, ["delivery", "shift", "skill"]);
});

test("ensureDailyContracts bewahrt Fortschritt am selben Tag", () => {
  const save = createDefaultSave();
  const first = ensureDailyContracts(save, "2026-07-18");
  first.contracts[0].progress = 4;
  const second = ensureDailyContracts(save, "2026-07-18");
  assert.equal(second.changed, false);
  assert.equal(second.contracts[0].progress, 4);
});

test("ein neuer Tag archiviert den vorherigen und beginnt frisch", () => {
  const save = createDefaultSave();
  const old = ensureDailyContracts(save, "2026-07-18");
  old.contracts[0].progress = old.contracts[0].target;
  old.contracts[0].completed = true;
  const next = ensureDailyContracts(save, "2026-07-19");
  assert.equal(next.changed, true);
  assert.equal(save.contracts.history.length, 1);
  assert.deepEqual(save.contracts.history[0].completed, [old.contracts[0].definitionId]);
  assert.ok(next.contracts.every((entry) => entry.progress === 0));
});

test("Zurückstellen der lokalen Uhr zahlt erledigte Verträge nicht doppelt aus", () => {
  const save = createDefaultSave();
  const old = ensureDailyContracts(save, "2026-07-18");
  old.contracts[0].progress = old.contracts[0].target;
  old.contracts[0].completed = true;
  ensureDailyContracts(save, "2026-07-19");
  const restored = ensureDailyContracts(save, "2026-07-18");
  assert.equal(restored.contracts[0].completed, true);
  assert.equal(restored.contracts[0].progress, restored.contracts[0].target);
});

test("itemTypes zählt nur die deklarierten schweren Typen", () => {
  const definition = CONTRACT_DEFINITIONS.find((entry) => entry.id === "heavy-duty");
  const update = contractRoundProgress(definition, {
    deliveredByType: { dumbbell: 2, kettlebell: 3, towel: 8 },
  });
  assert.deepEqual(update, { amount: 5, strategy: "add" });
});

test("maxCombo verwendet den Tageshöchststand statt Werte zu addieren", () => {
  const definition = CONTRACT_DEFINITIONS.find((entry) => entry.id === "combo-eight");
  assert.deepEqual(contractRoundProgress(definition, { maxCombo: 6 }), { amount: 6, strategy: "max" });
});

test("Vertragsbelohnung wird beim Erreichen sofort und genau einmal gebucht", () => {
  const save = createDefaultSave();
  const day = "2026-07-18";
  ensureDailyContracts(save, day);
  const contract = save.contracts.active[0];
  const definition = contractDefinition(contract);
  contract.progress = contract.target - 1;
  const round = {};
  switch (definition.progress.kind) {
    case "delivered": round.delivered = 1; break;
    case "itemType": round.deliveredByType = { [definition.progress.type]: 1 }; break;
    case "itemTypes": round.deliveredByType = { [definition.progress.types[0]]: 1 }; break;
    default: throw new Error("Der erste Vertrag muss aus der Delivery-Gruppe kommen");
  }

  const first = applyRoundToContracts(save, round, day, 12345);
  assert.equal(first.completed.length, 1);
  assert.equal(first.coinsEarned, contract.reward);
  assert.equal(save.coins, contract.reward);
  assert.equal(save.contracts.completedTotal, 1);
  assert.equal(save.stats.completedContracts, 1);
  assert.equal(save.stats.totalCoinsEarned, contract.reward);

  const second = applyRoundToContracts(save, round, day, 23456);
  assert.equal(second.completed.length, 0);
  assert.equal(second.coinsEarned, 0);
  assert.equal(save.coins, contract.reward);
});
