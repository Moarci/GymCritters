const LEVEL_IDS = ["closing", "class", "legday"];

function freezeObstacle(obstacle) {
  return Object.freeze({
    ...obstacle,
    position: Object.freeze([...obstacle.position]),
  });
}

function freezeLevel(spec) {
  return Object.freeze({
    ...spec,
    floor: Object.freeze({ ...spec.floor }),
    sign: Object.freeze({ ...spec.sign }),
    obstacles: Object.freeze(spec.obstacles.map(freezeObstacle)),
  });
}

/**
 * Reine Leveldaten ohne Babylon-Abhängigkeit.
 *
 * Die Positionen liegen bewusst nicht auf den Startpunkten oder den regulären
 * Ablagezonen. Blockierende Deko wird aus derselben Liste gebaut und als
 * Kollision registriert, damit sichtbare Welt und Spielphysik zusammenpassen.
 */
export const LEVEL_DECOR_SPECS = Object.freeze({
  closing: freezeLevel({
    label: "Feierabend",
    accent: "#a7f46a",
    secondary: "#ffbd73",
    sign: { phrase: "LETZTE RUNDE • LICHTER AUS", width: 6.4 },
    floor: { x: 0, z: -4.9, width: 13.8, depth: 3.15 },
    obstacles: [
      {
        id: "closing-service-cart",
        kind: "service-cart",
        position: [6.75, -6.35],
        halfX: 1.05,
        halfZ: 0.62,
      },
      {
        id: "closing-wet-floor",
        kind: "wet-floor-station",
        position: [-8.15, -4.15],
        halfX: 0.52,
        halfZ: 0.52,
      },
    ],
  }),
  class: freezeLevel({
    label: "Nach dem Kurs",
    accent: "#aa74d4",
    secondary: "#63b4ef",
    sign: { phrase: "RESET • REFILL • READY", width: 5.8 },
    floor: { x: 0, z: 2.55, width: 18.2, depth: 5.3 },
    obstacles: [
      [-6.2, 3.45],
      [-2.1, 3.45],
      [2.1, 3.45],
      [6.2, 3.45],
    ].map(([x, z], index) => ({
      id: `class-step-${index + 1}`,
      kind: "step-platform",
      position: [x, z],
      halfX: 0.96,
      halfZ: 0.48,
    })),
  }),
  legday: freezeLevel({
    label: "Leg Day Chaos",
    accent: "#ffad5c",
    secondary: "#d36b61",
    sign: { phrase: "LEG DAY • LOAD SMART", width: 5.9 },
    floor: { x: 0, z: 0.45, width: 17.4, depth: 6.5 },
    obstacles: [
      {
        id: "legday-plate-tree-left",
        kind: "plate-tree",
        position: [-3.75, -2.15],
        halfX: 0.68,
        halfZ: 0.68,
      },
      {
        id: "legday-plate-tree-right",
        kind: "plate-tree",
        position: [3.75, -2.15],
        halfX: 0.68,
        halfZ: 0.68,
      },
      {
        id: "legday-push-sled",
        kind: "push-sled",
        position: [0, 2.35],
        halfX: 1.28,
        halfZ: 0.68,
      },
    ],
  }),
});

export function getLevelObstacleDescriptors() {
  return LEVEL_IDS.flatMap((level) => LEVEL_DECOR_SPECS[level].obstacles.map((obstacle) => ({
    id: obstacle.id,
    level,
    x: obstacle.position[0],
    z: obstacle.position[1],
    halfX: obstacle.halfX,
    halfZ: obstacle.halfZ,
  })));
}

