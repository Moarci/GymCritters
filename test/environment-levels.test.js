import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/config.js";
import { LEVEL_DECOR_SPECS, getLevelObstacleDescriptors } from "../src/environment/level-decor-specs.js";

const LEVEL_IDS = ["closing", "class", "legday"];

test("jedes spielbare Level besitzt ein eigenes, nicht leeres Dekorkonzept", () => {
  assert.deepEqual(Object.keys(LEVEL_DECOR_SPECS), LEVEL_IDS);
  for (const id of LEVEL_IDS) {
    const spec = LEVEL_DECOR_SPECS[id];
    assert.equal(spec.label, LEVELS[id].label);
    assert.match(spec.accent, /^#[0-9a-f]{6}$/i);
    assert.ok(spec.sign.phrase.length >= 10);
    assert.ok(spec.floor.width > 0 && spec.floor.depth > 0);
    assert.ok(spec.obstacles.length > 0, `${id} benötigt mindestens ein sichtbares Hindernis`);
  }
});

test("Levelhindernisse tragen eindeutige IDs und gültige Kollisionsmaße", () => {
  const obstacles = getLevelObstacleDescriptors();
  assert.equal(obstacles.length, new Set(obstacles.map(({ id }) => id)).size);

  for (const obstacle of obstacles) {
    assert.ok(LEVEL_IDS.includes(obstacle.level));
    for (const key of ["x", "z", "halfX", "halfZ"]) {
      assert.ok(Number.isFinite(obstacle[key]), `${obstacle.id}.${key} muss endlich sein`);
    }
    assert.ok(obstacle.halfX > 0 && obstacle.halfZ > 0);
  }
});

test("Levelhindernisse blockieren keinen Startpunkt", () => {
  for (const obstacle of getLevelObstacleDescriptors()) {
    const [startX, startZ] = LEVELS[obstacle.level].start;
    const blocksStart = Math.abs(startX - obstacle.x) <= obstacle.halfX + 0.65
      && Math.abs(startZ - obstacle.z) <= obstacle.halfZ + 0.65;
    assert.equal(blocksStart, false, `${obstacle.id} liegt auf dem Startpunkt`);
  }
});

test("Gegenstände spawnen nicht in levelgebundener Dekoration", () => {
  for (const obstacle of getLevelObstacleDescriptors()) {
    for (const [x, z] of LEVELS[obstacle.level].spawnPool) {
      const overlapsSpawn = Math.abs(x - obstacle.x) <= obstacle.halfX + 0.5
        && Math.abs(z - obstacle.z) <= obstacle.halfZ + 0.5;
      assert.equal(overlapsSpawn, false, `${obstacle.id} überlappt Spawn (${x}, ${z})`);
    }
  }
});
