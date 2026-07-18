import { tripRadius, tripRule } from "./trip-physics.js";

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

// Gefahren werden nur beim Laufen und erst in der Nähe sichtbar. So bleiben
// Bodengegenstände Teil der Welt, geben aber rechtzeitig lesbares Feedback,
// bevor die eigentliche Stolperkollision greift.
export function hazardCueIntensity({
  distance,
  speed,
  weight = "light",
  risk = "standard",
}) {
  const rule = tripRule(risk);
  const collisionRadius = tripRadius(weight, risk);
  const awarenessRadius = collisionRadius + (weight === "bulky" ? 2.15 : weight === "heavy" ? 1.9 : 1.65);
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeSpeed = Math.max(0, Number(speed) || 0);
  if (safeDistance >= awarenessRadius || safeSpeed < rule.minimumSpeed * 0.55) return 0;
  const proximity = clamp((awarenessRadius - safeDistance) / Math.max(0.01, awarenessRadius - collisionRadius));
  const movement = clamp((safeSpeed - rule.minimumSpeed * 0.55) / Math.max(0.5, rule.minimumSpeed * 1.35));
  return clamp((0.18 + proximity * 0.82) * movement);
}

export function comboFlowState(combo, timeRemaining, windowSeconds) {
  const count = Math.max(0, Math.floor(Number(combo) || 0));
  const ratio = clamp((Number(timeRemaining) || 0) / Math.max(1, Number(windowSeconds) || 1));
  const tier = count >= 8 ? 3 : count >= 5 ? 2 : count >= 3 ? 1 : 0;
  const labels = ["", "IM FLOW", "CREW FLOW", "MAX FLOW"];
  return {
    tier,
    label: labels[tier],
    ratio,
    intensity: tier ? clamp((0.34 + tier * 0.16) * (0.62 + ratio * 0.38)) : 0,
  };
}

export function courierBatchBonus(character = {}, deliveredItems = []) {
  const multiplier = Math.max(1, Number(character.lightBatchBonus) || 1);
  const active = multiplier > 1
    && deliveredItems.length >= 2
    && deliveredItems.every((item) => item?.weight === "light");
  return {
    active,
    multiplier: active ? multiplier : 1,
    percent: active ? Math.round((multiplier - 1) * 100) : 0,
  };
}
