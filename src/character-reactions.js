// Reine Logik für charaktereigene Reaktionen und Leerlaufgesten. Die Szene
// liefert nur Zeit, Reaktionstyp und Dauer; welche Kanäle (Drehung, Skalierung,
// Höhe) eine Reaktion bespielt und wie stark, bleibt hier Babylon-frei und
// testbar. So bekommen Rocco und Fibi spürbar eigene Persönlichkeiten, ohne
// dass main.js pro Charakter Sonderfälle sammelt.
//
// Rocco (raccoon): kräftig und geerdet — ruhiger Griff, schweres Kopfschütteln,
// ein wuchtiger Stolperer, der beim Aufsetzen nachsackt, und ein solides
// Doppel-Pumpen zum Sieg.
// Fibi (squirrel): flink und federnd — ein hoher Pop beim Greifen, zappeliges
// Zucken, ein leichter Stolperer, der elastisch zurückfedert, und ein
// energiegeladener Siegesdreh.

export const REACTION_PROFILES = Object.freeze({
  raccoon: Object.freeze({
    pickup: Object.freeze({ pop: 0.06, anticipation: 0.05 }),
    wrong: Object.freeze({ amplitude: 0.13, frequency: 20 }),
    trip: Object.freeze({ lean: 0.56, drop: 0.11, sideTilt: 0.18, recovery: "heavy" }),
    celebrate: Object.freeze({ spin: 0.28, hop: 0.11, frequency: 7 }),
    idle: Object.freeze({ sway: 0.05, twitch: 0.06, frequency: 0.5 }),
  }),
  squirrel: Object.freeze({
    pickup: Object.freeze({ pop: 0.11, anticipation: 0.08 }),
    wrong: Object.freeze({ amplitude: 0.17, frequency: 30 }),
    trip: Object.freeze({ lean: 0.44, drop: 0.075, sideTilt: 0.2, recovery: "elastic" }),
    celebrate: Object.freeze({ spin: 0.44, hop: 0.18, frequency: 9.5 }),
    idle: Object.freeze({ sway: 0.09, twitch: 0.11, frequency: 1.15 }),
  }),
});

export function reactionProfile(characterId) {
  return REACTION_PROFILES[characterId] || REACTION_PROFILES.raccoon;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

// Eine Reaktion bespielt nur die Kanäle, die ihr gehören; alle anderen bleiben
// `null`, damit die Szene den vom Gang gesetzten Wert (z. B. die Tragehaltung)
// nicht überschreibt. `offsetY` ist der Höhenversatz zur Ruhelage.
function emptyPose() {
  return { rotationX: null, rotationY: null, rotationZ: null, scale: null, offsetY: null };
}

export function reactionPose({ type, elapsed = 0, duration = 1, side = 1, profile = REACTION_PROFILES.raccoon }) {
  const dur = Math.max(1e-4, Number(duration) || 1e-4);
  const seconds = Math.max(0, Number(elapsed) || 0);
  const t = clamp01(seconds / dur);
  const sideSign = side >= 0 ? 1 : -1;
  const pose = emptyPose();

  if (type === "pickup") {
    const cfg = profile.pickup;
    // Antizipation: kurz ducken (Skalierung < 1), dann der eigentliche Pop.
    const antic = t < 0.3 ? -Math.sin((t / 0.3) * Math.PI) * cfg.anticipation : 0;
    const pop = Math.sin(t * Math.PI) * cfg.pop;
    pose.scale = 1 + pop + antic;
    return pose;
  }

  if (type === "wrong") {
    const cfg = profile.wrong;
    // Schnelles Kopfschütteln, das zum Ende hin sauber ausläuft.
    pose.rotationZ = Math.sin(seconds * cfg.frequency) * cfg.amplitude * (1 - 0.25 * t);
    return pose;
  }

  if (type === "trip") {
    const cfg = profile.trip;
    const stumble = Math.sin(t * Math.PI); // 0 an beiden Enden, Spitze in der Mitte
    let lean = cfg.lean * stumble;
    let drop = -cfg.drop * stumble;
    if (cfg.recovery === "elastic") {
      // Überschwingen: in der zweiten Hälfte negativ, an beiden Enden null.
      // Fibi kippt zuerst kräftig, federt dann über die Senkrechte zurück.
      const overshoot = Math.sin(t * 2 * Math.PI);
      lean += cfg.lean * 0.85 * overshoot;
      drop -= cfg.drop * 0.5 * overshoot;
    } else if (cfg.recovery === "heavy") {
      // Rocco sackt beim Aufsetzen kurz nach (zweite kleine Senke), kippt aber
      // nie nach vorn über die Senkrechte.
      const sag = t > 0.62 ? Math.sin(((t - 0.62) / 0.38) * Math.PI) : 0;
      drop -= cfg.drop * 0.25 * sag;
    }
    pose.rotationX = lean;
    pose.rotationZ = sideSign * cfg.sideTilt * stumble;
    pose.offsetY = drop;
    return pose;
  }

  if (type === "celebrate") {
    const cfg = profile.celebrate;
    pose.rotationY = Math.sin(seconds * cfg.frequency) * cfg.spin;
    pose.offsetY = Math.abs(Math.sin(seconds * cfg.frequency)) * cfg.hop;
    return pose;
  }

  return pose;
}

// Leerlaufgeste als sanftes Wiegen des gesamten Körpers — bewusst NICHT nur des
// Kopfes, weil Gesicht, Ohren und Nase eigenständig an der Figur hängen und ein
// isoliertes Kopfdrehen sie abkoppeln würde. Rocco wiegt langsam und
// nachdenklich, Fibi zuckt schnell und wach. Deterministisch aus der Zeit, kein
// Zufall im Render-Loop.
export function idleGesture(profile, t) {
  const cfg = profile.idle;
  const seconds = Math.max(0, Number(t) || 0);
  const pulse = Math.max(0, Math.sin(seconds * cfg.frequency)) ** 6;
  return {
    swayY: Math.sin(seconds * cfg.frequency * 1.6) * cfg.sway * (0.35 + 0.65 * pulse),
    swayZ: pulse * cfg.twitch * Math.sin(seconds * cfg.frequency * 4.5),
  };
}
