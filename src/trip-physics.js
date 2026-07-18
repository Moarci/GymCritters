// Reine Stolperlogik ohne Babylon-Abhängigkeit. Die Szene liefert nur flache
// Positionen und Geschwindigkeiten; dadurch bleibt das Balancing reproduzierbar.

export const TRIP_RISK = Object.freeze({
  forgiving: Object.freeze({
    id: "forgiving",
    label: "Nachsichtig",
    description: "Kleiner Stolperbereich und längere Erholung.",
    radiusScale: 0.78,
    minimumSpeed: 2.35,
    cooldown: 2.25,
    stumbleDuration: 0.58,
  }),
  standard: Object.freeze({
    id: "standard",
    label: "Realistisch",
    description: "Gegenstände auf dem Laufweg werden zur echten Gefahr.",
    radiusScale: 1,
    minimumSpeed: 1.45,
    cooldown: 1.65,
    stumbleDuration: 0.7,
  }),
  chaotic: Object.freeze({
    id: "chaotic",
    label: "Slapstick",
    description: "Großer Stolperbereich und kurze Verschnaufpause.",
    radiusScale: 1.16,
    minimumSpeed: 0.85,
    cooldown: 1.15,
    stumbleDuration: 0.82,
  }),
});

const BASE_RADIUS = Object.freeze({
  light: 0.48,
  heavy: 0.58,
  bulky: 0.65,
});

export function tripRule(risk = "standard") {
  return TRIP_RISK[risk] || TRIP_RISK.standard;
}

export function tripRadius(weight, risk = "standard") {
  return (BASE_RADIUS[weight] || BASE_RADIUS.light) * tripRule(risk).radiusScale;
}

export function horizontalSpeed(velocity = {}) {
  return Math.hypot(Number(velocity.x) || 0, Number(velocity.z) || 0);
}

// Gibt den zuerst berührten, nächstgelegenen Bodengegenstand zurück.
// Inaktive, getragene oder bereits abgelieferte Gegenstände sind keine Gefahr.
export function selectTripHazard({
  position,
  velocity,
  items = [],
  risk = "standard",
  cooldown = 0,
}) {
  const rule = tripRule(risk);
  if ((Number(cooldown) || 0) > 0 || horizontalSpeed(velocity) < rule.minimumSpeed) return null;

  let nearest = null;
  let nearestDistance = Infinity;
  for (const item of items) {
    if (!item || item.active === false || item.delivered || item.held) continue;
    const itemPosition = item.position || item;
    const distance = Math.hypot(
      (Number(position?.x) || 0) - (Number(itemPosition?.x) || 0),
      (Number(position?.z) || 0) - (Number(itemPosition?.z) || 0),
    );
    if (distance > tripRadius(item.weight, risk) || distance >= nearestDistance) continue;
    nearest = item;
    nearestDistance = distance;
  }
  return nearest;
}
