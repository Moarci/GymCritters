import test from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers/local-storage.js";
import { createDefaultSave, owns, buyOrEquip } from "../src/save.js";
import { SAVE_VERSION } from "../src/config.js";

test("createDefaultSave startet auf der aktuellen Version mit Startausrüstung", () => {
  const save = createDefaultSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.coins, 0);
  assert.ok(save.owned.includes("raccoon"));
  assert.ok(save.owned.includes("headband-lime"));
  assert.equal(save.selectedCharacter, "raccoon");
});

test("buyOrEquip verweigert einen Kauf ohne ausreichend Münzen", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 10;
  const result = buyOrEquip(save, { id: "sunglasses", cost: 120, slot: "face" });
  assert.deepEqual(result, { ok: false, reason: "coins" });
  assert.equal(save.coins, 10);
  assert.ok(!owns(save, "sunglasses"));
});

test("buyOrEquip zieht Münzen ab, merkt Besitz und rüstet den Slot aus", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 200;
  const result = buyOrEquip(save, { id: "sunglasses", cost: 120, slot: "face" });
  assert.equal(result.ok, true);
  assert.equal(save.coins, 80);
  assert.ok(owns(save, "sunglasses"));
  assert.equal(save.equipped.face, "sunglasses");
});

test("ein gekaufter Charakter wird ausgewählt statt in einen Ausrüstungsslot gelegt", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 300;
  buyOrEquip(save, { id: "squirrel", cost: 250, slot: "character" });
  assert.equal(save.selectedCharacter, "squirrel");
  assert.equal(save.coins, 50);
});

test("erneutes Ausrüsten eines Nicht-Kopf-Cosmetics schaltet es ab, ohne doppelt zu kassieren", () => {
  installLocalStorage();
  const save = createDefaultSave();
  save.coins = 200;
  const item = { id: "sunglasses", cost: 120, slot: "face" };
  buyOrEquip(save, item);
  assert.equal(save.equipped.face, "sunglasses");
  buyOrEquip(save, item);
  assert.equal(save.equipped.face, null);
  assert.equal(save.coins, 80);
});
