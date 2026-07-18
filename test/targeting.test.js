import test from "node:test";
import assert from "node:assert/strict";
import { scoreTarget } from "../src/targeting.js";

test("außerhalb der Reichweite ist kein gültiges Ziel", () => {
  assert.equal(scoreTarget(3.0, 0, 2.18), Infinity);
});

test("bei gleicher Blickrichtung gewinnt der nähere Gegenstand", () => {
  assert.ok(scoreTarget(1.0, 0, 2.18) < scoreTarget(1.5, 0, 2.18));
});

test("ein anvisierter Gegenstand schlägt einen etwas näheren hinter dem Rücken", () => {
  const vornWeiter = scoreTarget(1.6, 0, 2.18);
  const hintenNaeher = scoreTarget(1.4, Math.PI, 2.18);
  assert.ok(vornWeiter < hintenNaeher);
});

test("die Blickrichtungs-Strafe ist symmetrisch nach links und rechts", () => {
  assert.equal(scoreTarget(1.0, 0.9, 2.18), scoreTarget(1.0, -0.9, 2.18));
});

test("ein direkt anvisierter Gegenstand wird nicht bestraft", () => {
  assert.equal(scoreTarget(1.0, 0, 2.18), 1.0);
});

test("ein deutlich näherer Gegenstand gewinnt trotz schlechter Blickrichtung", () => {
  const sehrNahHinten = scoreTarget(0.4, Math.PI, 2.18);
  const weitVorn = scoreTarget(2.0, 0, 2.18);
  assert.ok(sehrNahHinten < weitVorn);
});
