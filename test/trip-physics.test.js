import test from "node:test";
import assert from "node:assert/strict";
import { horizontalSpeed, selectTripHazard, tripRadius, tripRule } from "../src/trip-physics.js";

test("Stolperrisiko besitzt abgestufte Reichweiten und Geschwindigkeiten", () => {
  assert.ok(tripRadius("bulky", "chaotic") > tripRadius("light", "standard"));
  assert.ok(tripRule("forgiving").minimumSpeed > tripRule("chaotic").minimumSpeed);
  assert.ok(tripRule("forgiving").cooldown > tripRule("chaotic").cooldown);
});

test("nur ein aktiver Bodengegenstand im Laufweg löst Stolpern aus", () => {
  const hazard = selectTripHazard({
    position: { x: 0, z: 0 },
    velocity: { x: 0, z: 3 },
    items: [
      { id: "held", position: { x: 0, z: 0.1 }, weight: "heavy", held: true },
      { id: "floor", position: { x: 0.2, z: 0.1 }, weight: "light", active: true },
      { id: "far", position: { x: 2, z: 0 }, weight: "bulky", active: true },
    ],
  });
  assert.equal(hazard.id, "floor");
});

test("Stillstand, Cooldown und abgelieferte Gegenstände verhindern Stolpern", () => {
  const base = {
    position: { x: 0, z: 0 },
    items: [{ id: "floor", position: { x: 0.1, z: 0 }, weight: "heavy" }],
  };
  assert.equal(selectTripHazard({ ...base, velocity: { x: 0.1, z: 0 } }), null);
  assert.equal(selectTripHazard({ ...base, velocity: { x: 3, z: 0 }, cooldown: 0.2 }), null);
  assert.equal(selectTripHazard({
    ...base,
    velocity: { x: 3, z: 0 },
    items: [{ ...base.items[0], delivered: true }],
  }), null);
});

test("horizontalSpeed ignoriert die Höhe", () => {
  assert.equal(horizontalSpeed({ x: 3, y: 99, z: 4 }), 5);
});
