// Reine Logik für den Moment, in dem ein Gegenstand in seiner Zone landet.
// Die Babylon-Anwendung (Meshes stauchen, Ton abspielen) liegt in main.js/audio.js.

export const SQUASH_DURATION = 0.42;

const STRENGTH = { heavy: 1, bulky: 0.78, light: 0.42 };
const FALLBACK_STRENGTH = 0.6;

// Wucht des Aufschlags nach Gewichtsklasse.
export function impactStrength(weight) {
  return STRENGTH[weight] ?? FALLBACK_STRENGTH;
}

// Gedämpfte Schwingung: die Zone staucht, schwingt über die Ruhelage hinaus und
// pendelt sich ein. Das Nachfedern ist der Kern des Effekts — ein einmaliges
// Zucken liest sich nicht als Masse.
export function squashAt(t, strength = 1) {
  const offset = Math.exp(-5 * t) * Math.cos(3 * Math.PI * t);
  return {
    scaleY: 1 - offset * strength * 0.18,
    scaleXZ: 1 + offset * strength * 0.1,
  };
}

// Klangbeschreibung je Material. `body` trägt das Gewicht, `click` den harten
// Anschlag (nur bei Metall und Glas), beide in Hz.
const SOUNDS = {
  dumbbell:   { body: 96,  click: 2100, wave: "square",   duration: 0.16, volume: 0.075 },
  kettlebell: { body: 88,  click: 1850, wave: "square",   duration: 0.18, volume: 0.075 },
  bottle:     { body: 320, click: 1400, wave: "triangle", duration: 0.1,  volume: 0.05 },
  medball:    { body: 130, click: null, wave: "sine",     duration: 0.17, volume: 0.06 },
  mat:        { body: 150, click: null, wave: "sine",     duration: 0.14, volume: 0.055 },
  rope:       { body: 210, click: null, wave: "sine",     duration: 0.1,  volume: 0.04 },
  towel:      { body: 180, click: null, wave: "sine",     duration: 0.09, volume: 0.03 },
};
const FALLBACK_SOUND = { body: 190, click: null, wave: "sine", duration: 0.12, volume: 0.05 };

export function impactSound(itemType, pitchFactor = 1) {
  const sound = SOUNDS[itemType] ?? FALLBACK_SOUND;
  return {
    ...sound,
    body: sound.body * pitchFactor,
    click: sound.click === null ? null : sound.click * pitchFactor,
  };
}

// Eskalation über die Serie: jeder Aufschlag in ununterbrochener Folge klingt
// einen Halbton höher als der vorige. Gedeckelt bei einer Quinte, sonst wird
// eine lange Serie schrill statt belohnend.
const SEMITONE = Math.pow(2, 1 / 12);
const PITCH_CAP = Math.pow(2, 7 / 12);

export function deliveryPitch(combo) {
  return Math.min(PITCH_CAP, Math.pow(SEMITONE, Math.max(0, combo - 1)));
}

// Die Wucht wächst mit der Serie mit — bewusst moderat, damit der Unterschied
// zwischen Gewichtsklassen lesbar bleibt und nicht von der Combo überdeckt wird.
const IMPACT_SCALE_CAP = 1.35;

export function comboImpactScale(combo) {
  return Math.min(IMPACT_SCALE_CAP, 1 + Math.max(0, combo - 1) * 0.05);
}
