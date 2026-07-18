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

export function rankValue(rank) {
  return ({ D: 1, C: 2, B: 3, A: 4, S: 5 })[rank] || 0;
}

export function comboMultiplier(combo) {
  return Math.min(2.2, 1 + Math.max(0, combo - 1) * 0.15);
}
