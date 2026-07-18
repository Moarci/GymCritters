import test from "node:test";
import assert from "node:assert/strict";
import { hasClearLineOfSight, scoreTarget } from "../src/targeting.js";

test("außerhalb der Reichweite ist kein gültiges Ziel", () => {
  assert.equal(scoreTarget(3.0, 0, 2.18), Infinity);
});

test("ein Hindernis zwischen Figur und Gegenstand blockiert die Aufnahme", () => {
  const obstacles = [{ x: 1, z: 0, halfX: 0.25, halfZ: 0.5 }];
  assert.equal(hasClearLineOfSight({ x: 0, z: 0 }, { x: 2, z: 0 }, obstacles), false);
  assert.equal(hasClearLineOfSight({ x: 0, z: 1.2 }, { x: 2, z: 1.2 }, obstacles), true);
});

test("Sichtprüfung ignoriert Dekoration eines inaktiven Levels", () => {
  const obstacles = [{ x: 1, z: 0, halfX: 0.25, halfZ: 0.5, level: "legday" }];
  assert.equal(hasClearLineOfSight({ x: 0, z: 0 }, { x: 2, z: 0 }, obstacles, "closing"), true);
  assert.equal(hasClearLineOfSight({ x: 0, z: 0 }, { x: 2, z: 0 }, obstacles, "legday"), false);
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
