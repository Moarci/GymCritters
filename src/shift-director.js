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

export function shiftPhaseLabel(phase) {
  return {
    opening: "Auftakt",
    rush: "Rush",
    finale: "Finale",
  }[phase] || "Auftakt";
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

export function shiftEventMultiplier(event, item, dynamics = "standard") {
  if (!event || !item) return 1;
  const matches = event.types?.includes(item.type) || event.weights?.includes(item.weight);
  if (!matches) return 1;
  const intensity = dynamics === "calm" ? 0.65 : dynamics === "intense" ? 1.35 : 1;
  if (matches) return 1 + (event.multiplier - 1) * intensity;
  return 1;
}

export function shiftEventBonusPercent(event, dynamics = "standard") {
  if (!event) return 0;
  const intensity = dynamics === "calm" ? 0.65 : dynamics === "intense" ? 1.35 : 1;
  return Math.round(Math.max(0, event.multiplier - 1) * intensity * 100);
}

export function waveLayout(levelId, totalItems) {
  const total = Math.max(0, Math.floor(Number(totalItems) || 0));
  const desiredOpening = levelId === "class" ? 4 : levelId === "legday" ? 5 : Math.ceil(total * 0.6);
  const opening = Math.min(total, desiredOpening);
  const remaining = Math.max(0, total - opening);
  const rush = Math.ceil(remaining / 2);
  return {
    opening,
    rush,
    finale: remaining - rush,
  };
}

export function waveForItem(levelId, index, totalItems) {
  const layout = waveLayout(levelId, totalItems);
  if (index < layout.opening) return 0;
  return index < layout.opening + layout.rush ? 1 : 2;
}

export function waveUnlockThresholds(levelId, totalItems, dynamics = "standard") {
  const total = Math.max(0, Math.floor(Number(totalItems) || 0));
  const layout = waveLayout(levelId, total);
  const ratios = dynamics === "calm"
    ? [0.4, 0.72]
    : dynamics === "intense"
      ? [0.18, 0.46]
      : [0.26, 0.58];

  // Ein prozentualer Grenzwert darf niemals mehr Lieferungen verlangen, als
  // in den bisher sichtbaren Wellen überhaupt möglich sind. Das war zuvor
  // z. B. bei "Nach dem Kurs" + Volles Haus + Ruhig eine echte Sackgasse.
  const rush = layout.rush > 0
    ? Math.min(layout.opening, Math.max(1, Math.ceil(total * ratios[0])))
    : Infinity;
  const finale = layout.finale > 0
    ? Math.min(layout.opening + layout.rush, Math.max(rush, Math.ceil(total * ratios[1])))
    : Infinity;
  return { rush, finale };
}

export function unlockedWave(delivered, totalItems, dynamics = "standard", levelId = "closing") {
  const completed = Math.max(0, Math.floor(Number(delivered) || 0));
  const thresholds = waveUnlockThresholds(levelId, totalItems, dynamics);
  if (completed >= thresholds.finale) return 2;
  if (completed >= thresholds.rush) return 1;
  return 0;
}
