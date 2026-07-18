const MAT_COLUMNS = 4;
const MAT_ROWS = 4;

/**
 * Liefert einen eindeutigen Platz im Mattenregal. Die 4 × 4 Anordnung nutzt
 * Breite und Tiefe des Regals, statt ab der fünften Matte dieselbe Position
 * erneut zu verwenden. Dadurch liegen keine verschiedenfarbigen Meshes mehr
 * pixelgenau ineinander.
 */
export function matRackSlot(index) {
  const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
  const layerSize = MAT_COLUMNS * MAT_ROWS;
  const slot = safeIndex % layerSize;
  const column = slot % MAT_COLUMNS;
  const row = Math.floor(slot / MAT_COLUMNS);
  const layer = Math.floor(safeIndex / layerSize);

  return {
    x: (column - (MAT_COLUMNS - 1) / 2) * 0.38,
    y: 0.61 + layer * 0.98,
    z: (row - (MAT_ROWS - 1) / 2) * 0.31,
    rotationZ: Math.PI / 2,
    scale: 0.54,
  };
}
