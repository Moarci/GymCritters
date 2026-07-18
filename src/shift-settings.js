export const DEFAULT_SHIFT_SETTINGS = Object.freeze({
  itemAmount: "standard",
  dynamics: "standard",
  tripRisk: "standard",
  guidance: "mode",
});

export const SHIFT_SETTING_OPTIONS = Object.freeze({
  itemAmount: Object.freeze([
    Object.freeze({ id: "compact", label: "Kompakt", description: "20 % weniger Gegenstände", multiplier: 0.8 }),
    Object.freeze({ id: "standard", label: "Standard", description: "Ausgewogene Gegenstandsmenge", multiplier: 1 }),
    Object.freeze({ id: "full", label: "Volles Haus", description: "30 % mehr Gegenstände", multiplier: 1.3 }),
  ]),
  dynamics: Object.freeze([
    Object.freeze({ id: "calm", label: "Ruhig", description: "Neue Chaos-Wellen erscheinen später." }),
    Object.freeze({ id: "standard", label: "Lebendig", description: "Der vorgesehene Schichtablauf." }),
    Object.freeze({ id: "intense", label: "Intensiv", description: "Frühere Wellen und stärkere Bonusphasen." }),
  ]),
  tripRisk: Object.freeze([
    Object.freeze({ id: "forgiving", label: "Nachsichtig", description: "Stolpern vor allem beim schnellen Laufen." }),
    Object.freeze({ id: "standard", label: "Realistisch", description: "Bodengegenstände verlangen Aufmerksamkeit." }),
    Object.freeze({ id: "chaotic", label: "Slapstick", description: "Schon kleine Berührungen können reichen." }),
  ]),
  guidance: Object.freeze([
    Object.freeze({ id: "mode", label: "Nach Modus", description: "Zielhilfe folgt der gewählten Schwierigkeit." }),
    Object.freeze({ id: "full", label: "Immer", description: "Navigator zeigt jederzeit das nächste Ziel." }),
    Object.freeze({ id: "minimal", label: "Nur getragen", description: "Navigator erscheint erst mit Gegenstand." }),
    Object.freeze({ id: "off", label: "Aus", description: "Keine Navigationshilfe." }),
  ]),
});

function validOption(group, value) {
  return SHIFT_SETTING_OPTIONS[group].some((option) => option.id === value);
}

export function normalizeShiftSettings(value = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_SHIFT_SETTINGS).map(([group, fallback]) => [
    group,
    validOption(group, value?.[group]) ? value[group] : fallback,
  ]));
}

export function createLevelSettings(levelIds) {
  return Object.fromEntries(levelIds.map((level) => [level, normalizeShiftSettings()]));
}

export function optionFor(group, id) {
  return SHIFT_SETTING_OPTIONS[group].find((option) => option.id === id)
    || SHIFT_SETTING_OPTIONS[group].find((option) => option.id === DEFAULT_SHIFT_SETTINGS[group]);
}

export function itemCountForMode(mode, amount = "standard") {
  const base = Math.max(4, Number(mode?.itemCount) || 8);
  return Math.max(4, Math.round(base * optionFor("itemAmount", amount).multiplier));
}

export function navigatorPolicy(mode, guidance = "mode") {
  if (guidance === "full") return "always";
  if (guidance === "minimal") return "carrying";
  if (guidance === "off") return "off";
  return mode?.navigator || "always";
}

export function modeDurationLabel(mode) {
  if (mode?.timed === false || !Number.isFinite(mode?.seconds)) return "Ohne Zeitlimit";
  const minutes = Math.floor(mode.seconds / 60);
  const seconds = String(mode.seconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
