import test from "node:test";
import assert from "node:assert/strict";
import {
  shuffle, formatTime, horizontalDistance, normalizeAngle, lerpAngle, rankValue, comboMultiplier,
} from "../src/utils.js";

test("formatTime füllt Minuten und Sekunden auf und klemmt bei null", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(75), "01:15");
  assert.equal(formatTime(-5), "00:00");
});

test("horizontalDistance ignoriert die Höhenachse", () => {
  assert.equal(horizontalDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 99, z: 4 }), 5);
});

test("normalizeAngle wickelt in den Bereich -PI..PI", () => {
  assert.ok(Math.abs(normalizeAngle(3 * Math.PI) - Math.PI) < 1e-9);
  assert.ok(Math.abs(normalizeAngle(0)) < 1e-9);
});

test("lerpAngle nimmt den kurzen Weg über den Kreis", () => {
  const result = lerpAngle(3.0, -3.0, 0.5);
  assert.ok(Math.abs(result) > 3.0, `erwartet Weg über PI, war ${result}`);
});

test("shuffle liefert eine Permutation und verändert die Eingabe nicht", () => {
  const input = [1, 2, 3, 4, 5];
  const output = shuffle(input);
  assert.deepEqual([...output].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});

test("shuffle kopiert verschachtelte Spawn-Koordinaten statt sie zu teilen", () => {
  const input = [[1, 2], [3, 4]];
  const output = shuffle(input);
  output[0][0] = 999;
  assert.ok(input.every(([first]) => first !== 999));
});

test("rankValue ordnet die Ränge aufsteigend und kennt Unbekanntes nicht", () => {
  assert.ok(rankValue("S") > rankValue("A"));
  assert.ok(rankValue("A") > rankValue("D"));
  assert.equal(rankValue("Z"), 0);
});

test("comboMultiplier startet bei 1 und deckelt bei 2,2", () => {
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(1), 1);
  assert.ok(Math.abs(comboMultiplier(3) - 1.3) < 1e-9);
  assert.equal(comboMultiplier(999), 2.2);
});
