export const MEDBALL_DIAMETER = 0.82;

const MAX_DISPLAY_ITEMS = 16;

export const ROPE_ITEM_LAYOUT = Object.freeze({
  cableRadius: 0.028,
  handleX: 0.44,
  handleY: 0.09,
  handleCenterZ: -0.38,
  handleLength: 0.38,
  handleDiameter: 0.13,
  path: Object.freeze([
    Object.freeze([-0.44, 0.09, -0.19]),
    Object.freeze([-0.54, 0.07, 0.08]),
    Object.freeze([-0.47, 0.055, 0.42]),
    Object.freeze([-0.2, 0.05, 0.6]),
    Object.freeze([0, 0.048, 0.64]),
    Object.freeze([0.2, 0.05, 0.6]),
    Object.freeze([0.47, 0.055, 0.42]),
    Object.freeze([0.54, 0.07, 0.08]),
    Object.freeze([0.44, 0.09, -0.19]),
  ]),
});

export const DUMBBELL_RACK_LAYOUT = Object.freeze({
  width: 2.52,
  depth: 0.86,
  postX: 1.19,
  postWidth: 0.12,
  shelfCenters: Object.freeze([0.45, 1.05, 1.65]),
  shelfHeight: 0.13,
  columns: Object.freeze([-0.68, 0, 0.68]),
  lanes: Object.freeze([-0.2, 0.2]),
  itemScale: 0.5,
});

export const MAT_RACK_LAYOUT = Object.freeze({
  width: 2.2,
  depth: 1.32,
  sideX: 1.07,
  sideWidth: 0.1,
  baseTop: 0.155,
  upperShelfTop: 0.715,
  columns: Object.freeze([-0.5, 0.5]),
  lanes: Object.freeze([-0.45, -0.15, 0.15, 0.45]),
  itemScale: 0.52,
});

function safeSlot(index) {
  return Math.max(0, Math.floor(Number(index) || 0)) % MAX_DISPLAY_ITEMS;
}

function placement(x, y, z, scale, rotationX = 0, rotationY = 0, rotationZ = 0) {
  return { x, y, z, scale, rotationX, rotationY, rotationZ };
}

/**
 * Zwei offene Regalebenen nehmen jeweils acht liegende, gerollte Matten auf.
 * Die Matte ist im Mesh bereits waagerecht gedreht; eine weitere Root-Drehung
 * würde ihren Mittelpunkt in den seitlichen Rahmen verschieben.
 */
export function matRackSlot(index) {
  const slot = safeSlot(index);
  const tier = Math.floor(slot / 8);
  const tierSlot = slot % 8;
  const column = tierSlot % MAT_RACK_LAYOUT.columns.length;
  const lane = Math.floor(tierSlot / MAT_RACK_LAYOUT.columns.length);
  return placement(
    MAT_RACK_LAYOUT.columns[column],
    tier === 0 ? MAT_RACK_LAYOUT.baseTop : MAT_RACK_LAYOUT.upperShelfTop,
    MAT_RACK_LAYOUT.lanes[lane],
    MAT_RACK_LAYOUT.itemScale,
  );
}

/**
 * Relative Ablagepositionen für alle sichtbaren Gegenstände. Jede Zone besitzt
 * bis zur maximalen Rundengröße 16 eindeutige Slots, die auf die tatsächlichen
 * Abmessungen ihrer Ablage abgestimmt sind.
 */
export function itemDisplaySlot(zoneId, index) {
  const slot = safeSlot(index);

  if (zoneId === "rack") {
    const shelf = Math.floor(slot / 6);
    const shelfSlot = slot % 6;
    const column = shelfSlot % DUMBBELL_RACK_LAYOUT.columns.length;
    const lane = Math.floor(shelfSlot / DUMBBELL_RACK_LAYOUT.columns.length);
    const shelfTop = DUMBBELL_RACK_LAYOUT.shelfCenters[shelf]
      + DUMBBELL_RACK_LAYOUT.shelfHeight / 2;
    // Die Scheibenunterkante liegt im lokalen Mesh bei y = -0,03.
    const rootY = shelfTop + 0.03 * DUMBBELL_RACK_LAYOUT.itemScale;
    return placement(
      DUMBBELL_RACK_LAYOUT.columns[column],
      rootY,
      DUMBBELL_RACK_LAYOUT.lanes[lane],
      DUMBBELL_RACK_LAYOUT.itemScale,
    );
  }

  if (zoneId === "laundry") {
    const layer = Math.floor(slot / 4);
    const layerSlot = slot % 4;
    return placement(
      (layerSlot % 2 ? 1 : -1) * 0.23,
      1.37 + layer * 0.048,
      (Math.floor(layerSlot / 2) ? 1 : -1) * 0.18,
      0.45,
      0,
      (layerSlot - 1.5) * 0.07,
    );
  }

  if (zoneId === "bottles") {
    const column = slot % 4;
    const row = Math.floor(slot / 4);
    return placement((column - 1.5) * 0.33, 1.185, (row - 1.5) * 0.22, 0.56, 0, slot * 0.19);
  }

  if (zoneId === "mats") return matRackSlot(slot);

  if (zoneId === "kettlebells") {
    const tier = Math.floor(slot / 8);
    const tierSlot = slot % 8;
    const column = tierSlot % 4;
    const row = Math.floor(tierSlot / 4);
    return placement((column - 1.5) * 0.34, 0.13 + tier * 0.64, row ? 0.16 : -0.16, 0.56);
  }

  if (zoneId === "ropes") {
    const hook = slot % 3;
    const layer = Math.floor(slot / 3);
    const scale = 0.54;
    const handleAtHookY = 1.35;
    const rootY = handleAtHookY + ROPE_ITEM_LAYOUT.handleCenterZ * scale;
    return placement(
      -0.25 - layer * 0.04,
      rootY - layer * 0.008,
      (hook - 1) * 0.6,
      scale,
      Math.PI / 2,
      -Math.PI / 2,
    );
  }

  if (zoneId === "medballs") {
    const layer = Math.floor(slot / 4);
    const layerSlot = slot % 4;
    return placement(
      (layerSlot % 2 ? 1 : -1) * 0.28,
      0.13 + layer * 0.55,
      (Math.floor(layerSlot / 2) ? 1 : -1) * 0.28,
      0.65,
      0,
      layerSlot * 0.4,
    );
  }

  return placement(0, 0.12, 0, 0.72);
}
