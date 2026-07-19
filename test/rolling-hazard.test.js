import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLLING_HAZARD_LANES,
  createRollingHazard,
  laneFor,
  rollingHazardActive,
  rollingHazardHit,
  rollingHazardPoint,
  stepRollingHazard,
} from "../src/rolling-hazard.js";

test("jedes Level besitzt eine Bahn innerhalb der Raumgrenzen", () => {
  for (const [levelId, lane] of Object.entries(ROLLING_HAZARD_LANES)) {
    assert.ok(laneFor(levelId) === lane);
    assert.ok(lane.from < lane.to, `${levelId}: from < to`);
    assert.ok(Math.abs(lane.from) <= 12.8 && Math.abs(lane.to) <= 12.8, `${levelId}: x in der Halle`);
    assert.ok(Math.abs(lane.fixed) <= 9.2, `${levelId}: z in der Halle`);
    assert.ok(lane.speed > 0 && lane.radius > 0);
  }
});

test("die Gefahr ist erst ab dem Rush aktiv, nicht im Auftakt", () => {
  assert.equal(rollingHazardActive("legday", "opening"), false);
  assert.equal(rollingHazardActive("legday", "rush"), true);
  assert.equal(rollingHazardActive("legday", "finale"), true);
  assert.equal(rollingHazardActive("unbekannt", "finale"), false);
});

test("die Kugel rollt vorwärts und prallt an den Enden ab", () => {
  const lane = { axis: "x", fixed: 0, from: -2, to: 2, radius: 0.5, speed: 1, phases: ["rush"] };
  let state = createRollingHazard(lane);
  assert.equal(state.pos, -2);
  assert.equal(state.dir, 1);
  state = stepRollingHazard(state, 1); // -1
  assert.equal(state.pos, -1);
  // Über das obere Ende hinaus schlägt die Richtung um.
  state = { pos: 1.8, dir: 1, lane };
  state = stepRollingHazard(state, 1); // würde 2.8 -> reflektiert auf 1.2, dir -1
  assert.equal(state.dir, -1);
  assert.ok(state.pos > lane.from && state.pos < lane.to);
});

test("selbst ein sehr großer Zeitschritt hält die Kugel in der Bahn", () => {
  const lane = { axis: "x", fixed: 0, from: -3, to: 3, radius: 0.5, speed: 100, phases: ["rush"] };
  const state = stepRollingHazard(createRollingHazard(lane), 5);
  assert.ok(state.pos >= lane.from && state.pos <= lane.to);
});

test("der Bahnpunkt folgt der gewählten Achse", () => {
  const xLane = { axis: "x", fixed: -3.4, from: -7, to: 7, radius: 0.6, speed: 4, phases: ["rush"] };
  const zLane = { axis: "z", fixed: 2, from: -5, to: 5, radius: 0.6, speed: 4, phases: ["rush"] };
  assert.deepEqual(rollingHazardPoint({ pos: 1.5, dir: 1, lane: xLane }), { x: 1.5, z: -3.4 });
  assert.deepEqual(rollingHazardPoint({ pos: 1.5, dir: 1, lane: zLane }), { x: 2, z: 1.5 });
});

test("ein Treffer erkennt Nähe, aber verschont entfernte Spieler", () => {
  const lane = { axis: "x", fixed: 0, from: -5, to: 5, radius: 0.7, speed: 4, phases: ["rush"] };
  const state = { pos: 0, dir: 1, lane };
  assert.equal(rollingHazardHit(state, { x: 0, z: 0 }, 0.5), true);
  assert.equal(rollingHazardHit(state, { x: 1.1, z: 0 }, 0.5), true, "gerade noch in Reichweite (0.7+0.5=1.2)");
  assert.equal(rollingHazardHit(state, { x: 2.5, z: 0 }, 0.5), false);
  assert.equal(rollingHazardHit(state, { x: 0, z: 3 }, 0.5), false);
});
