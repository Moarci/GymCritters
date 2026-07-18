// Reine Logik für die Charakterbewegung: Tragehaltung, Gang, Kurvenneigung,
// Leerlauf. Die Anwendung auf Babylon-Meshes liegt in main.js.

const WEIGHT_RANK = { heavy: 3, bulky: 2, light: 1 };

// Schwerste Klasse aus den getragenen Gegenständen — sie bestimmt Haltung und Gang.
export function dominantWeight(weights) {
  let dominant = null;
  for (const weight of weights) {
    if ((WEIGHT_RANK[weight] || 0) > (WEIGHT_RANK[dominant] || 0)) dominant = weight;
  }
  return dominant;
}

// Drei klar unterscheidbare Silhouetten. armX ist die Beugung nach vorn.
// Die Figur schaut lokal nach -Z; bei einem nach -Y hängenden Arm bedeutet
// deshalb eine positive X-Rotation „nach vorn“. armZ steuert die Spreizung,
// torsoLean die Rücklage des Körpers als Gegengewicht zur schweren Last.
// elbowX beugt den Unterarm am Ellbogengelenk — erst dadurch sehen die
// Haltungen nach Halten aus statt nach steif vorgestreckten Stangen.
const POSES = {
  // Die Figuren schauen lokal nach -Z. Da die Arme nach -Y zeigen, dreht eine
  // positive X-Rotation Schulter und Ellbogen nach vorn; negativ wäre rückwärts.
  heavy: { armX: 0.25, armZ: 0.12, elbowX: 1.0, torsoLean: -0.12 },
  bulky: { armX: 0.6, armZ: 0.6, elbowX: 0.45, torsoLean: 0 },
  light: { armX: 0.85, armZ: 0.3, elbowX: 0.35, torsoLean: 0 },
};

export function carryPose(weight) {
  return POSES[weight] ?? POSES.light;
}

// Frequenz-/Wucht-Faktoren je Last. Ohne Last bleiben exakt die bisherigen
// Werte erhalten — die Optik einer unbeladenen Figur ändert sich nicht.
const GAIT = {
  heavy: { frequency: 0.8, bob: 1.5, armSwing: 0 },
  bulky: { frequency: 0.85, bob: 1.2, armSwing: 0 },
  light: { frequency: 0.95, bob: 1, armSwing: 0.4 },
};

export function gaitParams(weight, sprinting, moving) {
  const base = moving
    ? (sprinting ? { frequency: 13, intensity: 1.1 } : { frequency: 9, intensity: 0.78 })
    : { frequency: 2.2, intensity: 0.12 };
  const load = GAIT[weight] ?? { frequency: 1, bob: 1, armSwing: 1 };
  return {
    frequency: base.frequency * load.frequency,
    intensity: base.intensity,
    armSwing: load.armSwing,
    bob: load.bob,
  };
}

// Seitliche Neigung beim Richtungswechsel. tanh statt Clamp, damit die Neigung
// weich in den Deckel läuft statt hart anzuschlagen — die Figur legt sich in
// die Kurve, kippt aber nie um.
export const LEAN_CAP = 0.18;

export function curveLean(angularVelocity) {
  return LEAN_CAP * Math.tanh(angularVelocity * 0.35);
}

// Fibis Schwanz als Bogen statt als Rohr: Die Sinus-Kurven lassen die Zuwächse
// zum Ende hin schrumpfen — der Schwanz rollt sich ein, statt linear aus der
// Figur zu wachsen. Der Scheitel (rel. ~1,2 über der Wurzel auf 0,72) bleibt
// knapp unter der Kopfoberkante (~1,93). Die starke Verjüngung (0,46 -> 0,25)
// macht aus der Wurst eine Feder.
export function squirrelTailSpec() {
  const segments = [];
  for (let i = 0; i < 8; i++) {
    segments.push({
      diameter: 0.46 - i * 0.03,
      position: [
        0.1 * Math.sin(i * 0.42),
        1.2 * Math.sin(i * 0.26),
        0.72 * Math.sin(i * 0.24),
      ],
    });
  }
  return segments;
}

// Roccos Ringelschwanz: acht dicht überlappende Kapseln entlang eines Bogens, jede tangential
// zur Kurve gedreht — der Schwanz rollt sich nach oben auf, statt als
// waagerechte Kette aus der Figur zu ragen. rotationX = PI/2 heißt "zeigt
// gerade nach hinten"; zur Spitze hin dreht der Bogen Richtung senkrecht.
export function raccoonTailSpec() {
  const segments = [];
  for (let i = 0; i < 8; i++) {
    const t = i * 0.22;
    const dy = 0.72 * 0.3 * Math.sin(t);
    const dz = 1.05 * 0.3 * Math.cos(t);
    segments.push({
      radius: 0.2 - i * 0.011,
      position: [
        0.04 * Math.sin(i * 0.8),
        0.72 * (1 - Math.cos(t)),
        1.05 * Math.sin(t),
      ],
      rotationX: Math.PI / 2 - Math.atan2(dy, dz),
    });
  }
  return segments;
}

// Leerlauf: Atmen plus gelegentliches Schwanzzucken. Bewusst deterministisch
// aus der Zeit berechnet — kein Math.random() im Render-Loop, damit das
// Verhalten reproduzierbar und testbar bleibt. Die achte Potenz macht aus der
// Sinuswelle seltene, kurze Spitzen statt eines Dauerzitterns.
export function idleMotion(t) {
  const pulse = Math.max(0, Math.sin(t * 0.9)) ** 8;
  return {
    breath: 0.015 * Math.sin(t * 2.6),
    tailFlick: pulse * 0.35 * Math.sin(t * 14),
  };
}

// Punkt auf einem achsenparallelen Ellipsoid entlang einer Richtung, plus
// optionalem Versatz entlang derselben Normale nach außen. Damit sitzen
// Gesichtsteile AUF der Kopfoberfläche statt an per Augenmaß geratenen
// z-Werten — und ein Stapel (Fleck, Auge, Pupille, Glanzlicht) liegt sauber
// geschichtet auf demselben Strahl.
export function surfacePoint(radii, dir, out = 0) {
  const laenge = Math.hypot(dir[0], dir[1], dir[2]);
  const d = [dir[0] / laenge, dir[1] / laenge, dir[2] / laenge];
  const t = 1 / Math.sqrt((d[0] / radii[0]) ** 2 + (d[1] / radii[1]) ** 2 + (d[2] / radii[2]) ** 2);
  return [d[0] * (t + out), d[1] * (t + out), d[2] * (t + out)];
}

// Euler-Winkel [pitchX, yawY], die die lokale +z-Achse eines Meshes auf die
// Richtung ausrichten — flachgedrückte Kugeln schmiegen sich damit an die
// Oberfläche, statt schräg im Raum zu hängen.
export function facingRotation(dir) {
  const laenge = Math.hypot(dir[0], dir[1], dir[2]);
  return [-Math.asin(dir[1] / laenge), Math.atan2(dir[0] / laenge, dir[2] / laenge)];
}
