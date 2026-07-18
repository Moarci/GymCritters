// Babylon-freie Rundenplanung: Sie hält die Level-Identität sichtbar, begrenzt
// zufällige Häufungen und verteilt Gegenstände mit Abstand zu Start, Ablagen,
// Hindernissen und zueinander.

const LEVEL_CORE_TYPES = Object.freeze({
  closing: Object.freeze(["towel", "bottle", "dumbbell", "kettlebell"]),
  class: Object.freeze(["mat", "rope", "towel", "bottle"]),
  legday: Object.freeze(["dumbbell", "kettlebell", "medball", "towel"]),
});

function safeRandom(rng) {
  return Math.min(0.999999, Math.max(0, Number(rng?.()) || 0));
}

function weightedPick(entries, rng) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = safeRandom(rng) * Math.max(1, total);
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.type;
  }
  return entries.at(-1)?.type;
}

function shuffled(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(safeRandom(rng) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function spreadTriples(types) {
  const result = [...types];
  for (let index = 2; index < result.length; index += 1) {
    if (result[index] !== result[index - 1] || result[index] !== result[index - 2]) continue;
    const replacement = result.findIndex((type, candidate) => candidate > index && type !== result[index]);
    if (replacement >= 0) [result[index], result[replacement]] = [result[replacement], result[index]];
  }
  return result;
}

export function coreTypesForLevel(levelId) {
  return [...(LEVEL_CORE_TYPES[levelId] || LEVEL_CORE_TYPES.closing)];
}

export function buildRoundTypes({
  levelId,
  desired,
  itemWeights,
  rng = Math.random,
}) {
  const count = Math.max(0, Math.floor(Number(desired) || 0));
  const available = Object.entries(itemWeights || {})
    .filter(([, weight]) => Number(weight) > 0)
    .map(([type, weight]) => ({ type, weight: Number(weight) }));
  if (!count || !available.length) return [];

  const availableTypes = new Set(available.map(({ type }) => type));
  const selected = coreTypesForLevel(levelId)
    .filter((type) => availableTypes.has(type))
    .slice(0, count);
  const maximumPerType = Math.max(2, Math.ceil(count * 0.42));

  while (selected.length < count) {
    const counts = Object.fromEntries(available.map(({ type }) => [
      type,
      selected.filter((selectedType) => selectedType === type).length,
    ]));
    let candidates = available.filter(({ type }) => counts[type] < maximumPerType);
    if (!candidates.length) candidates = available;
    const last = selected.at(-1);
    const previous = selected.at(-2);
    const weighted = candidates.map((entry) => ({
      ...entry,
      weight: last === entry.type && previous === entry.type
        ? entry.weight * 0.08
        : last === entry.type
          ? entry.weight * 0.45
          : entry.weight,
    }));
    selected.push(weightedPick(weighted, rng));
  }

  return spreadTriples(shuffled(selected, rng));
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function blocksPoint(point, obstacle, levelId, clearance) {
  if (obstacle.level && obstacle.level !== levelId) return false;
  return Math.abs(point[0] - obstacle.x) < Math.max(0, Number(obstacle.halfX) || 0) + clearance
    && Math.abs(point[1] - obstacle.z) < Math.max(0, Number(obstacle.halfZ) || 0) + clearance;
}

function overlapsAvoidedArea(point, area, clearance) {
  const position = Array.isArray(area.position)
    ? area.position
    : [Number(area.x) || 0, Number(area.z) || 0];
  return distance(point, position) < Math.max(0, Number(area.radius) || 0) + clearance;
}

export function planSpawnPositions({
  pool,
  count,
  start = [0, 0],
  obstacles = [],
  avoidAreas = [],
  levelId = "closing",
  rng = Math.random,
  clearance = 0.58,
}) {
  const desired = Math.min(
    Math.max(0, Math.floor(Number(count) || 0)),
    Array.isArray(pool) ? pool.length : 0,
  );
  const candidates = shuffled(
    (pool || []).map((point, index) => ({
      index,
      point: [Number(point[0]) || 0, Number(point[1]) || 0],
    })),
    rng,
  );
  const selected = [];

  while (selected.length < desired && candidates.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    candidates.forEach((candidate, index) => {
      const point = candidate.point;
      const obstacleBlocked = obstacles.some((obstacle) => blocksPoint(point, obstacle, levelId, clearance));
      const zoneBlocked = avoidAreas.some((area) => overlapsAvoidedArea(point, area, clearance * 0.75));
      const startDistance = distance(point, start);
      const separation = selected.length
        ? Math.min(...selected.map((entry) => distance(point, entry)))
        : startDistance;
      const safetyPenalty = (obstacleBlocked ? 10000 : 0)
        + (zoneBlocked ? 5000 : 0)
        + (startDistance < 1.8 ? 2500 : 0);
      const score = separation * 1.35 + Math.min(5, startDistance) * 0.18 - safetyPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    selected.push(candidates.splice(bestIndex, 1)[0].point);
  }

  return selected;
}
