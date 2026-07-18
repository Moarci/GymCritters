// Bewertet Aufnahme-Kandidaten: kleiner ist besser, Infinity = außer Reichweite.
// Ein Gegenstand direkt in Blickrichtung behält seine rohe Distanz, einer genau
// hinter der Figur wird mit FACING_PENALTY multipliziert. Der Faktor ist bewusst
// moderat, damit Nähe weiterhin gewinnt, wenn etwas direkt vor den Füßen liegt.
const FACING_PENALTY = 1.6;

export function scoreTarget(distance, angleDelta, maxDistance) {
  if (distance > maxDistance) return Infinity;
  return distance * (1 + (Math.abs(angleDelta) / Math.PI) * FACING_PENALTY);
}

// Prüft die Sichtlinie im Grundriss gegen dieselben Rechtecke wie die
// Spieler-Kollision. So lassen sich Gegenstände nicht durch Racks aufnehmen.
export function hasClearLineOfSight(from, to, obstacles, activeLevel = null, padding = 0.08) {
  return !obstacles.some((obstacle) => {
    if (obstacle.level && activeLevel && obstacle.level !== activeLevel) return false;
    return segmentIntersectsRect(
      from.x,
      from.z,
      to.x,
      to.z,
      obstacle.x - obstacle.halfX - padding,
      obstacle.x + obstacle.halfX + padding,
      obstacle.z - obstacle.halfZ - padding,
      obstacle.z + obstacle.halfZ + padding,
    );
  });
}

// Liang-Barsky-Clipping für eine Strecke gegen ein achsenparalleles Rechteck.
function segmentIntersectsRect(x0, z0, x1, z1, minX, maxX, minZ, maxZ) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  let near = 0;
  let far = 1;
  const clips = [
    [-dx, x0 - minX],
    [dx, maxX - x0],
    [-dz, z0 - minZ],
    [dz, maxZ - z0],
  ];
  for (const [p, q] of clips) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) near = Math.max(near, ratio);
    else far = Math.min(far, ratio);
    if (near > far) return false;
  }
  return far > 0.02 && near < 0.98;
}
