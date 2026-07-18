// Radiant pro Pixel Wischbewegung. Kalibriert so, dass ein Wisch über die halbe
// Bildschirmbreite die Kamera etwa eine Vierteldrehung bewegt.
export const LOOK_SENSITIVITY = 0.0042;

// Wandelt eine Pointer-Bewegung in Winkel-Deltas. Bewusst ohne Kamerabezug: welche
// Achse in welche Richtung addiert wird, entscheidet der Aufrufer.
export function lookDelta(dx, dy, sensitivity = 1) {
  return {
    deltaYaw: dx * LOOK_SENSITIVITY * sensitivity,
    deltaPitch: dy * LOOK_SENSITIVITY * sensitivity,
  };
}

// Die ArcRotateCamera begrenzt beta selbst nur beim eigenen Input-Handling; da wir
// alpha und beta direkt schreiben, klemmen wir hier.
export function clampPitch(beta, min, max) {
  return Math.min(max, Math.max(min, beta));
}
