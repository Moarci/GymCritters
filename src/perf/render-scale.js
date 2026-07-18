// Babylons Hardware-Scaling: Renderauflösung = Canvasgröße / Level. Level 1 ist
// die CSS-Pixel-Auflösung; die native Schärfe eines High-DPI-Displays liegt bei
// 1/DPR. Werte ÜBER 1 rendern unterhalb der CSS-Auflösung — dorthin darf nur die
// Lastregelung führen, nie der Startwert.

// Wo die Regelung anfängt. Hochauflösende Touch-Displays starten bei nativ/1.45:
// deutlich schärfer als CSS-Auflösung, aber mit Luft für schwache GPUs.
export function deviceScalingFloor({ touch, devicePixelRatio }) {
  return touch && devicePixelRatio > 1.5 ? 1.45 / devicePixelRatio : 1;
}

// Feste Qualitätswahl aus den Einstellungen. "low" fällt auf Handys höchstens
// auf CSS-Auflösung zurück — Level über 1 sähe dort nach Pixelbrei aus.
export function fixedQualityScaling(quality, device) {
  if (quality === "low") {
    return device.touch && device.devicePixelRatio > 1.5 ? 1 : 1.35;
  }
  return deviceScalingFloor(device);
}
