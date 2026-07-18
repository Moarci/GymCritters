import test from "node:test";
import assert from "node:assert/strict";
import {
  createLevelSettings,
  itemCountForMode,
  modeDurationLabel,
  navigatorPolicy,
  normalizeShiftSettings,
} from "../src/shift-settings.js";

test("Level-Einstellungen werden vollständig und sicher normalisiert", () => {
  assert.deepEqual(normalizeShiftSettings({
    itemAmount: "full",
    dynamics: "kaputt",
    tripRisk: "forgiving",
    guidance: "off",
  }), {
    itemAmount: "full",
    dynamics: "standard",
    tripRisk: "forgiving",
    guidance: "off",
  });
});

test("jedes Level erhält eine unabhängige Standardkonfiguration", () => {
  const settings = createLevelSettings(["closing", "class"]);
  settings.closing.itemAmount = "full";
  assert.equal(settings.class.itemAmount, "standard");
});

test("Gegenstandsmenge skaliert die Modusbasis nachvollziehbar", () => {
  const mode = { itemCount: 10 };
  assert.equal(itemCountForMode(mode, "compact"), 8);
  assert.equal(itemCountForMode(mode, "standard"), 10);
  assert.equal(itemCountForMode(mode, "full"), 13);
});

test("Zielhilfe kann den Modus respektieren oder überschreiben", () => {
  const mode = { navigator: "carrying" };
  assert.equal(navigatorPolicy(mode, "mode"), "carrying");
  assert.equal(navigatorPolicy(mode, "full"), "always");
  assert.equal(navigatorPolicy(mode, "minimal"), "carrying");
  assert.equal(navigatorPolicy(mode, "off"), "off");
});

test("zeitloser Modus wird nicht als 00:00 dargestellt", () => {
  assert.equal(modeDurationLabel({ timed: false, seconds: null }), "Ohne Zeitlimit");
  assert.equal(modeDurationLabel({ timed: true, seconds: 90 }), "1:30");
});
