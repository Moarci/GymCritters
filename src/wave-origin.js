// Reine Logik für die sichtbare Herkunft neuer Wellen. Statt einfach zu
// erscheinen, kommen Rush- und Finale-Gegenstände aus einer Nachschubquelle am
// Hallenrand und fliegen in einem Bogen an ihren Platz. Die Szene fragt nur die
// Quellposition und die Bogenpunkte ab; Platzierung und Flugkurve bleiben
// Babylon-frei und dadurch deterministisch testbar.
//
// Die Positionen liegen bewusst am Rand, abseits von Startpunkt, Ablagen,
// aktiven Hindernissen und den Spawn-Feldern der Gegenstände. Die Quelle ist ein
// reines Rand-Prop (wie Poster oder Fenster) und keine Laufkollision — sie soll
// die Herkunft erzählen, nicht den knapp getunten Laufraum verengen.

export const WAVE_SOURCES = Object.freeze({
  closing: Object.freeze({ position: [10.4, -6.9], emitY: 0.95, label: "Nachschubwagen" }),
  class: Object.freeze({ position: [-10.5, 4.9], emitY: 0.95, label: "Kursraumtür" }),
  legday: Object.freeze({ position: [10.4, 4.6], emitY: 0.95, label: "Geräte-Palette" }),
});

export function waveSourceFor(levelId) {
  return WAVE_SOURCES[levelId] || WAVE_SOURCES.closing;
}

// Ein Punkt auf der Wurfparabel von `from` nach `to` bei Fortschritt t (0..1):
// waagerecht linear interpoliert, in der Höhe ein Sinus-Bogen obendrauf. Bei
// t=0 exakt an der Quelle, bei t=1 exakt am Ziel.
export function waveArcPoint(from, to, t, lift = 1.4) {
  const clamped = Math.min(1, Math.max(0, Number(t) || 0));
  const fx = Number(from?.x) || 0;
  const fy = Number(from?.y) || 0;
  const fz = Number(from?.z) || 0;
  const tx = Number(to?.x) || 0;
  const ty = Number(to?.y) || 0;
  const tz = Number(to?.z) || 0;
  return {
    x: fx + (tx - fx) * clamped,
    y: fy + (ty - fy) * clamped + Math.sin(clamped * Math.PI) * lift,
    z: fz + (tz - fz) * clamped,
  };
}
