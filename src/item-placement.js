export const MEDBALL_DIAMETER = 0.82;

const MAT_COLUMNS = 4;
const MAT_ROWS = 4;
const MAX_DISPLAY_ITEMS = 16;

function safeSlot(index) {
  return Math.max(0, Math.floor(Number(index) || 0)) % MAX_DISPLAY_ITEMS;
}

function placement(x, y, z, scale, rotationX = 0, rotationY = 0, rotationZ = 0) {
  return { x, y, z, scale, rotationX, rotationY, rotationZ };
}

/**
 * Liefert einen eindeutigen Platz im Mattenregal. Die 4 × 4 Anordnung nutzt
 * Breite und Tiefe des Regals, statt ab der fünften Matte dieselbe Position
 * erneut zu verwenden.
 */
export function matRackSlot(index) {
  const slot = safeSlot(index);
  const column = slot % MAT_COLUMNS;
  const row = Math.floor(slot / MAT_COLUMNS);
  return placement(
    (column - (MAT_COLUMNS - 1) / 2) * 0.38,
    0.61,
    (row - (MAT_ROWS - 1) / 2) * 0.31,
    0.54,
    0,
    0,
    Math.PI / 2,
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
    const column = shelfSlot % 3;
    const lane = Math.floor(shelfSlot / 3);
    return placement((column - 1) * 0.65, 0.53 + shelf * 0.6, lane ? 0.25 : -0.25, 0.5);
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
    return placement(-0.2 - layer * 0.045, 1.19 - layer * 0.012, (hook - 1) * 0.42, 0.58, 0, -Math.PI / 2);
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
