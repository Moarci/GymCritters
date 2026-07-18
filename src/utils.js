export function shuffle(values) {
  const result = values.map((value) => Array.isArray(value) ? [...value] : value);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function lerpAngle(current, target, amount) {
  let difference = (target - current + Math.PI) % (Math.PI * 2) - Math.PI;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return current + difference * amount;
}

// Babylon rechnet linkshändig: rotation.y = yaw dreht die Modellfront (lokal -Z) auf
// (-sin yaw, 0, -cos yaw). Die rechtshändige Variante (sin yaw, ...) spiegelt die Figur
// an der Z-Achse, was beim Vorwärts- und Rückwärtslaufen unsichtbar bleibt und erst
// seitwärts auffällt. Diese drei Helfer sind die einzige Stelle, die das Vorzeichen kennt.
export function forwardFromYaw(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function yawTowards(x, z) {
  return Math.atan2(-x, -z);
}

// Blickrichtung einer ArcRotateCamera ist (-cos alpha, 0, -sin alpha). Damit sie der
// Figur über die Schulter schaut, muss alpha gegenläufig zum yaw laufen.
export function cameraAlphaBehind(yaw) {
  return Math.PI / 2 - yaw;
}

// Umkehrung von cameraAlphaBehind: der yaw, in den die Kamera gerade blickt. Die Formel
// ist dieselbe, weil die Abbildung ihre eigene Umkehrung ist -- getrennt benannt, damit
// an der Aufrufstelle lesbar bleibt, in welche Richtung gerechnet wird.
export function cameraYaw(alpha) {
  return Math.PI / 2 - alpha;
}

export function rankValue(rank) {
  return ({ D: 1, C: 2, B: 3, A: 4, S: 5 })[rank] || 0;
}

export function comboMultiplier(combo) {
  return Math.min(2.2, 1 + Math.max(0, combo - 1) * 0.15);
}
