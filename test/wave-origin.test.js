import test from "node:test";
import assert from "node:assert/strict";
import { WAVE_SOURCES, waveArcPoint, waveSourceFor } from "../src/wave-origin.js";

test("jede Quelle liegt am Hallenrand innerhalb der Grenzen", () => {
  for (const [levelId, source] of Object.entries(WAVE_SOURCES)) {
    const [x, z] = source.position;
    assert.ok(Math.abs(x) <= 12.3, `${levelId}: x in der Halle`);
    assert.ok(Math.abs(z) <= 8.7, `${levelId}: z in der Halle`);
    assert.ok(source.emitY > 0);
    assert.ok(Math.abs(x) > 8 || Math.abs(z) > 4, `${levelId}: sitzt wirklich am Rand`);
  }
});

test("unbekannte Level fallen auf die Feierabend-Quelle zurück", () => {
  assert.equal(waveSourceFor("legday"), WAVE_SOURCES.legday);
  assert.equal(waveSourceFor("unbekannt"), WAVE_SOURCES.closing);
});

test("der Bogen beginnt an der Quelle und endet am Ziel", () => {
  const from = { x: 10, y: 0.95, z: -6 };
  const to = { x: 2, y: 0.12, z: 3 };
  const near = (point, target) => {
    assert.ok(Math.abs(point.x - target.x) < 1e-9);
    assert.ok(Math.abs(point.y - target.y) < 1e-9);
    assert.ok(Math.abs(point.z - target.z) < 1e-9);
  };
  near(waveArcPoint(from, to, 0), from);
  near(waveArcPoint(from, to, 1), to);
});

test("in der Mitte hebt der Bogen über die reine Interpolation hinaus an", () => {
  const from = { x: 0, y: 1, z: 0 };
  const to = { x: 4, y: 0.2, z: 2 };
  const mid = waveArcPoint(from, to, 0.5, 1.4);
  assert.ok(Math.abs(mid.x - 2) < 1e-9);
  assert.ok(Math.abs(mid.z - 1) < 1e-9);
  const flatMidY = (from.y + to.y) / 2;
  assert.ok(Math.abs(mid.y - (flatMidY + 1.4)) < 1e-9, "Scheitel = Mittelhöhe + Lift");
});

test("t außerhalb von 0..1 wird geklemmt", () => {
  const from = { x: 0, y: 0, z: 0 };
  const to = { x: 10, y: 0, z: 0 };
  const below = waveArcPoint(from, to, -1);
  const above = waveArcPoint(from, to, 5);
  assert.ok(Math.abs(below.x - 0) < 1e-9 && Math.abs(below.y) < 1e-9);
  assert.ok(Math.abs(above.x - 10) < 1e-9 && Math.abs(above.y) < 1e-9);
});
