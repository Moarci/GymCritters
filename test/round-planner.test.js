import test from "node:test";
import assert from "node:assert/strict";
import { ITEM_TYPES, LEVELS } from "../src/config.js";
import {
  buildRoundTypes,
  coreTypesForLevel,
  planSpawnPositions,
} from "../src/round-planner.js";
import { getLevelObstacleDescriptors } from "../src/environment/level-decor-specs.js";

function sequenceRng(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("Runden behalten ihre Level-Identität und gültige Gegenstandstypen", () => {
  for (const [levelId, level] of Object.entries(LEVELS)) {
    const types = buildRoundTypes({
      levelId,
      desired: 16,
      itemWeights: level.itemWeights,
      rng: sequenceRng([0.01, 0.91, 0.35, 0.73, 0.22]),
    });
    assert.equal(types.length, 16);
    coreTypesForLevel(levelId).forEach((type) => assert.ok(types.includes(type), `${levelId} enthält ${type}`));
    types.forEach((type) => assert.ok(ITEM_TYPES[type]));
    for (let index = 2; index < types.length; index += 1) {
      assert.ok(!(types[index] === types[index - 1] && types[index] === types[index - 2]));
    }
  }
});

test("Rundenplanung ist mit injiziertem Zufall reproduzierbar", () => {
  const options = {
    levelId: "class",
    desired: 12,
    itemWeights: LEVELS.class.itemWeights,
  };
  const first = buildRoundTypes({ ...options, rng: sequenceRng([0.2, 0.8, 0.4, 0.6]) });
  const second = buildRoundTypes({ ...options, rng: sequenceRng([0.2, 0.8, 0.4, 0.6]) });
  assert.deepEqual(first, second);
});

test("Spawnplanung bevorzugt freie, eindeutige und verteilte Positionen", () => {
  const pool = [[0, 0], [1, 0], [3, 0], [6, 0], [0, 6], [6, 6]];
  const planned = planSpawnPositions({
    pool,
    count: 3,
    start: [0, 0],
    obstacles: [{ x: 3, z: 0, halfX: 0.5, halfZ: 0.5 }],
    avoidAreas: [{ position: [6, 0], radius: 0.8 }],
    rng: sequenceRng([0.3, 0.7, 0.1]),
  });
  assert.equal(planned.length, 3);
  assert.equal(new Set(planned.map((point) => point.join(","))).size, 3);
  assert.ok(!planned.some(([x, z]) => x === 3 && z === 0));
  assert.ok(!planned.some(([x, z]) => x === 6 && z === 0));
  assert.ok(!planned.some(([x, z]) => x === 0 && z === 0));
});

test("alle maximalen Levelrunden passen ohne doppelte Spawnpositionen in ihren Pool", () => {
  const obstacles = getLevelObstacleDescriptors();
  for (const [levelId, level] of Object.entries(LEVELS)) {
    const planned = planSpawnPositions({
      pool: level.spawnPool,
      count: 16,
      start: level.start,
      obstacles,
      levelId,
      rng: sequenceRng([0.11, 0.87, 0.42, 0.66]),
    });
    assert.equal(planned.length, 16);
    assert.equal(new Set(planned.map((point) => point.join(","))).size, 16);
  }
});
