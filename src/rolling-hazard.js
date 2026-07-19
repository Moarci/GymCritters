// Reine Logik für eine rollende Bodengefahr — den Medizinball aus dem Audit,
// der ein Schichtereignis von einer reinen Punktzahl zu einer echten
// mechanischen Konsequenz macht. Die Szene liefert nur dt und die flache
// Spielerposition; Bahn, Abprall und Treffererkennung bleiben Babylon-frei und
// dadurch deterministisch testbar.
//
// Jede Bahn rollt entlang einer Achse zwischen zwei Enden hin und her und quert
// einen offenen Laufweg. Der Spieler muss die Überquerung timen oder außen
// herumlaufen — die Gefahr entsteht aus Bewegung, nicht aus einem Multiplikator.

export const ROLLING_HAZARD_LANES = Object.freeze({
  // Feierabend: quert den Eingangsstreifen zur Haupthalle.
  closing: Object.freeze({ axis: "x", fixed: -3.4, from: -7.2, to: 7.2, radius: 0.6, speed: 4.4, phases: ["rush", "finale"] }),
  // Nach dem Kurs: rollt durch den mittleren Gang zwischen den Reihen.
  class: Object.freeze({ axis: "x", fixed: -0.4, from: -7.4, to: 7.4, radius: 0.55, speed: 4, phases: ["rush", "finale"] }),
  // Leg Day: schwerer, schneller Ball quer durch den zentralen Korridor.
  legday: Object.freeze({ axis: "x", fixed: 0.4, from: -8, to: 8, radius: 0.72, speed: 5.2, phases: ["rush", "finale"] }),
});

export function laneFor(levelId, lanes = ROLLING_HAZARD_LANES) {
  return lanes[levelId] || null;
}

// Ob in dieser Levelphase eine rollende Gefahr aktiv ist. Bewusst erst ab dem
// Rush: der Auftakt bleibt ruhig lesbar, danach heizt sich die Schicht auf.
export function rollingHazardActive(levelId, phase, lanes = ROLLING_HAZARD_LANES) {
  const lane = laneFor(levelId, lanes);
  return Boolean(lane && lane.phases.includes(phase));
}

export function createRollingHazard(lane) {
  return { pos: lane.from, dir: 1, lane };
}

// Schreibt die Bahn für eine Frame fort. Pingpong-Reflexion an beiden Enden;
// bei extrem großem dt wird zusätzlich hart geklemmt, damit die Kugel niemals
// aus ihrer Bahn springt.
export function stepRollingHazard(state, dt) {
  const lane = state.lane;
  let dir = state.dir >= 0 ? 1 : -1;
  let pos = state.pos + dir * lane.speed * Math.max(0, Number(dt) || 0);
  if (pos > lane.to) {
    pos = lane.to - (pos - lane.to);
    dir = -1;
  } else if (pos < lane.from) {
    pos = lane.from + (lane.from - pos);
    dir = 1;
  }
  pos = Math.max(lane.from, Math.min(lane.to, pos));
  return { pos, dir, lane };
}

export function rollingHazardPoint(state) {
  const lane = state.lane;
  return lane.axis === "x"
    ? { x: state.pos, z: lane.fixed }
    : { x: lane.fixed, z: state.pos };
}

// Trifft die Kugel den Spieler? Kreis-gegen-Kreis im Grundriss. Anders als eine
// Bodenstolperfalle knockt der rollende Ball auch eine stehende Figur um — er
// kommt zu ihr, nicht sie zu ihm.
export function rollingHazardHit(state, player, playerRadius = 0.5) {
  const point = rollingHazardPoint(state);
  const dx = (Number(player?.x) || 0) - point.x;
  const dz = (Number(player?.z) || 0) - point.z;
  const reach = state.lane.radius + Math.max(0, Number(playerRadius) || 0);
  return dx * dx + dz * dz <= reach * reach;
}
