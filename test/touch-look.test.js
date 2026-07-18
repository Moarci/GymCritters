import test from "node:test";
import assert from "node:assert/strict";
import { lookDelta, clampPitch, LOOK_SENSITIVITY } from "../src/input/touch-look.js";

test("lookDelta skaliert die Pixelbewegung mit der Grundempfindlichkeit", () => {
  const result = lookDelta(100, 0);
  assert.ok(Math.abs(result.deltaYaw - 100 * LOOK_SENSITIVITY) < 1e-12);
  assert.equal(result.deltaPitch, 0);
});

test("lookDelta multipliziert die Nutzereinstellung auf", () => {
  const normal = lookDelta(100, 50, 1);
  const fast = lookDelta(100, 50, 2);
  assert.ok(Math.abs(fast.deltaYaw - normal.deltaYaw * 2) < 1e-12);
  assert.ok(Math.abs(fast.deltaPitch - normal.deltaPitch * 2) < 1e-12);
});

test("lookDelta behält die Richtung der Bewegung", () => {
  const result = lookDelta(-30, -40);
  assert.ok(result.deltaYaw < 0);
  assert.ok(result.deltaPitch < 0);
});

test("lookDelta liefert bei Stillstand null", () => {
  const result = lookDelta(0, 0);
  assert.equal(result.deltaYaw, 0);
  assert.equal(result.deltaPitch, 0);
});

test("clampPitch hält den Winkel in den Kameragrenzen", () => {
  assert.equal(clampPitch(0.5, 1.1, 1.32), 1.1);
  assert.equal(clampPitch(9, 1.1, 1.32), 1.32);
  assert.equal(clampPitch(1.2, 1.1, 1.32), 1.2);
});
