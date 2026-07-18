import test from "node:test";
import assert from "node:assert/strict";
import {
  comboFlowState,
  courierBatchBonus,
  hazardCueIntensity,
} from "../src/game-feel.js";

test("Gefahrenhinweis erscheint nur beim Laufen und wird zum Gegenstand stärker", () => {
  assert.equal(hazardCueIntensity({ distance: 0.6, speed: 0, weight: "heavy" }), 0);
  assert.equal(hazardCueIntensity({ distance: 5, speed: 6, weight: "heavy" }), 0);
  const far = hazardCueIntensity({ distance: 2.1, speed: 4.5, weight: "heavy" });
  const near = hazardCueIntensity({ distance: 0.8, speed: 4.5, weight: "heavy" });
  assert.ok(far > 0);
  assert.ok(near > far);
});

test("sperrige Gegenstände werden aus größerer Entfernung lesbar", () => {
  const light = hazardCueIntensity({ distance: 2.25, speed: 5, weight: "light" });
  const bulky = hazardCueIntensity({ distance: 2.25, speed: 5, weight: "bulky" });
  assert.equal(light, 0);
  assert.ok(bulky > 0);
});

test("Combo-Flow besitzt drei klar getrennte Eskalationsstufen", () => {
  assert.equal(comboFlowState(2, 10, 14).tier, 0);
  assert.equal(comboFlowState(3, 10, 14).label, "IM FLOW");
  assert.equal(comboFlowState(5, 10, 14).tier, 2);
  assert.equal(comboFlowState(8, 10, 14).label, "MAX FLOW");
  assert.ok(comboFlowState(5, 12, 14).intensity > comboFlowState(5, 3, 14).intensity);
});

test("Kurierbonus gilt nur für mindestens zwei leichte Gegenstände", () => {
  const fibi = { lightBatchBonus: 1.15 };
  assert.equal(courierBatchBonus(fibi, [{ weight: "light" }]).multiplier, 1);
  assert.equal(courierBatchBonus(fibi, [{ weight: "light" }, { weight: "heavy" }]).multiplier, 1);
  assert.deepEqual(
    courierBatchBonus(fibi, [{ weight: "light" }, { weight: "light" }]),
    { active: true, multiplier: 1.15, percent: 15 },
  );
  assert.equal(courierBatchBonus({ lightBatchBonus: 1 }, [{ weight: "light" }, { weight: "light" }]).active, false);
});
