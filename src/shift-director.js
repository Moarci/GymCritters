// Reine Logik für den Ablauf einer Schicht. Die Szene fragt nur ab, welche
// Welle und welches Ereignis aktiv sind; Balancing bleibt Babylon-unabhängig.

const LEVEL_EVENTS = {
  closing: [
    {
      id: "closing-front",
      at: 0,
      title: "Eingangsbereich schließen",
      description: "Flaschen und Handtücher bringen jetzt 20 % Bereichsbonus.",
      types: ["bottle", "towel"],
      multiplier: 1.2,
    },
    {
      id: "closing-weights",
      at: 0.5,
      title: "Letzte Geräte kontrollieren",
      description: "Schwere Geräte bringen im Endspurt 25 % Bonus.",
      weights: ["heavy", "bulky"],
      multiplier: 1.25,
    },
  ],
  class: [
    {
      id: "class-soft",
      at: 0,
      title: "Kursmaterial einsammeln",
      description: "Matten, Seile und Handtücher zählen 20 % mehr.",
      types: ["mat", "rope", "towel"],
      multiplier: 1.2,
    },
    {
      id: "class-hydration",
      at: 0.5,
      title: "Verlorenes aus der letzten Reihe",
      description: "Flaschen und Medizinbälle zählen 25 % mehr.",
      types: ["bottle", "medball"],
      multiplier: 1.25,
    },
  ],
  legday: [
    {
      id: "legday-iron",
      at: 0,
      title: "Schwere Bahn freiräumen",
      description: "Hanteln und Kettlebells zählen 20 % mehr.",
      types: ["dumbbell", "kettlebell"],
      multiplier: 1.2,
    },
    {
      id: "legday-finish",
      at: 0.55,
      title: "Power-Finish",
      description: "Alle schweren und sperrigen Lasten zählen 30 % mehr.",
      weights: ["heavy", "bulky"],
      multiplier: 1.3,
    },
  ],
};

export function shiftPhase(delivered, totalItems) {
  const ratio = delivered / Math.max(1, totalItems);
  if (ratio >= 0.72) return "finale";
  if (ratio >= 0.34) return "rush";
  return "opening";
}

export function shiftEvent(levelId, delivered, totalItems) {
  const events = LEVEL_EVENTS[levelId] || LEVEL_EVENTS.closing;
  const ratio = delivered / Math.max(1, totalItems);
  let current = events[0];
  for (const event of events) {
    if (ratio >= event.at) current = event;
  }
  return current;
}

export function shiftEventMultiplier(event, item) {
  if (!event || !item) return 1;
  if (event.types?.includes(item.type)) return event.multiplier;
  if (event.weights?.includes(item.weight)) return event.multiplier;
  return 1;
}

export function waveForItem(levelId, index, totalItems) {
  const firstWave = levelId === "class" ? 4 : levelId === "legday" ? 5 : Math.ceil(totalItems * 0.6);
  if (index < firstWave) return 0;
  const remaining = Math.max(1, totalItems - firstWave);
  return index < firstWave + Math.ceil(remaining / 2) ? 1 : 2;
}

export function unlockedWave(delivered, totalItems) {
  const ratio = delivered / Math.max(1, totalItems);
  if (ratio >= 0.58) return 2;
  if (ratio >= 0.26) return 1;
  return 0;
}
