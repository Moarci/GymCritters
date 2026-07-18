// Bewertet Aufnahme-Kandidaten: kleiner ist besser, Infinity = außer Reichweite.
// Ein Gegenstand direkt in Blickrichtung behält seine rohe Distanz, einer genau
// hinter der Figur wird mit FACING_PENALTY multipliziert. Der Faktor ist bewusst
// moderat, damit Nähe weiterhin gewinnt, wenn etwas direkt vor den Füßen liegt.
const FACING_PENALTY = 1.6;

export function scoreTarget(distance, angleDelta, maxDistance) {
  if (distance > maxDistance) return Infinity;
  return distance * (1 + (Math.abs(angleDelta) / Math.PI) * FACING_PENALTY);
}
