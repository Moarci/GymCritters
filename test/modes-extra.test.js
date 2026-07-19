import test from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers/local-storage.js";
import { MODES } from "../src/config.js";
import { itemCountForMode, navigatorPolicy, modeDurationLabel } from "../src/shift-settings.js";
import { recordRoundProgress } from "../src/progression.js";
import { createDefaultSave, evaluateAchievements } from "../src/save.js";

const VALID_NAVIGATORS = new Set(["always", "carrying", "off"]);

function baseRound(overrides = {}) {
  return {
    level: "closing",
    character: "raccoon",
    completed: true,
    score: 1500,
    delivered: 10,
    totalItems: 10,
    maxCombo: 4,
    droppedItems: 0,
    wrongPlacements: 0,
    trips: 0,
    coinsEarned: 8,
    ...overrides,
  };
}

test("jeder Modus besitzt vollständige, plausible Konfiguration", () => {
  for (const [id, mode] of Object.entries(MODES)) {
    assert.equal(typeof mode.label, "string", `${id}: label`);
    assert.equal(typeof mode.icon, "string", `${id}: icon`);
    assert.equal(typeof mode.description, "string", `${id}: description`);
    assert.ok(mode.itemCount > 0, `${id}: itemCount`);
    assert.ok(mode.scoreMultiplier > 0, `${id}: scoreMultiplier`);
    assert.ok(mode.expectedSecondsPerItem > 0, `${id}: expectedSecondsPerItem`);
    assert.ok(mode.comboWindow > 0, `${id}: comboWindow`);
    assert.ok(VALID_NAVIGATORS.has(mode.navigator), `${id}: navigator gültig`);
    if (mode.timed === false) {
      assert.equal(mode.seconds, null, `${id}: zeitlose Modi haben kein Limit`);
    } else {
      assert.ok(Number.isFinite(mode.seconds) && mode.seconds > 0, `${id}: seconds`);
    }
  }
});

test("die neuen Modi sind vorhanden und decken eigene Nischen ab", () => {
  for (const id of ["sprint", "marathon", "nightshift", "perfektionist", "flow"]) {
    assert.ok(MODES[id], `${id} fehlt`);
  }
  assert.ok(MODES.sprint.seconds < MODES.blitz.seconds, "Sprint ist kürzer als Blitz");
  assert.ok(MODES.marathon.itemCount > MODES.blitz.itemCount, "Marathon hat mehr Gegenstände");
  assert.equal(MODES.nightshift.navigator, "off", "Nachtschicht ohne Zielhilfe");
  assert.ok(MODES.perfektionist.scoreMultiplier >= 1.5, "Perfektionist belohnt am stärksten");
  assert.equal(MODES.flow.timed, false, "Flow ist zeitlos");
});

test("navigatorPolicy respektiert einen abgeschalteten Modus-Navigator", () => {
  assert.equal(navigatorPolicy(MODES.nightshift, "mode"), "off");
  assert.equal(navigatorPolicy(MODES.nightshift, "full"), "always");
  assert.equal(navigatorPolicy(MODES.sprint, "mode"), "carrying");
});

test("Umfang und Zeitanzeige der neuen Modi sind konsistent", () => {
  assert.equal(itemCountForMode(MODES.marathon, "standard"), 16);
  assert.equal(itemCountForMode(MODES.sprint, "compact"), Math.max(4, Math.round(6 * 0.8)));
  assert.equal(modeDurationLabel(MODES.sprint), "0:45");
  assert.equal(modeDurationLabel(MODES.marathon), "5:00");
  assert.equal(modeDurationLabel(MODES.flow), "Ohne Zeitlimit");
});

test("Flow verhält sich wie Zen und führt keine Bestzeit", () => {
  const save = createDefaultSave();
  recordRoundProgress(save, baseRound({ mode: "flow", timed: false, elapsed: 640 }));
  assert.equal(save.levelModeStats.closing.flow.bestTime, null);
  assert.equal(save.levelModeStats.closing.flow.rounds, 1);
  assert.equal(save.roundHistory[0].elapsed, 640, "die Entwicklung kennt das Tempo trotzdem");
});

test("die neuen Modi schalten ihre eigenen Achievements frei", () => {
  installLocalStorage();
  const sprintSave = createDefaultSave();
  evaluateAchievements(sprintSave, baseRound({ mode: "sprint", elapsed: 40 }));
  assert.ok(sprintSave.achievements["sprint-ace"], "Sprintass");

  const nightSave = createDefaultSave();
  evaluateAchievements(nightSave, baseRound({ mode: "nightshift", elapsed: 110 }));
  assert.ok(nightSave.achievements["night-owl"], "Nachteule");

  const marathonSave = createDefaultSave();
  evaluateAchievements(marathonSave, baseRound({ mode: "marathon", elapsed: 240 }));
  assert.ok(marathonSave.achievements["endurance-crew"], "Ausdauercrew");
});
