import {
  ACHIEVEMENTS,
  CONTRACT_DEFINITIONS,
  LEVELS,
  MODES,
  SAVE_KEY,
  SAVE_VERSION,
  SHOP_ITEMS,
} from "./config.js";
import { createContractState } from "./challenges.js";
import {
  createCareerState,
  createLevelModeStats,
  emptyResultStats,
  masteryLevelForXp,
  totalMasteryLevels,
} from "./progression.js";

export const SAVE_EXPORT_FORMAT = "gym-critters-save";
export const SAVE_EXPORT_VERSION = 1;
const MAX_IMPORT_LENGTH = 1_000_000;
const STARTER_KIT = ["raccoon", "headband-lime"];
const RANKS = ["D", "C", "B", "A", "S"];
const EQUIPMENT_SLOTS = ["head", "wrist", "face", "trail"];

function emptyModeStats() {
  return Object.fromEntries(Object.keys(MODES).map((mode) => [mode, emptyResultStats()]));
}

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    soundEnabled: true,
    tutorialCompleted: false,
    lastMode: "standard",
    lastLevel: "closing",
    selectedCharacter: "raccoon",
    owned: [...STARTER_KIT],
    equipped: {
      head: "headband-lime",
      wrist: null,
      face: null,
      trail: null,
    },
    modeStats: emptyModeStats(),
    levelModeStats: createLevelModeStats(),
    career: createCareerState(),
    contracts: createContractState(),
    stats: {
      totalRounds: 0,
      totalDelivered: 0,
      totalDumbbells: 0,
      byType: {},
      maxCombo: 0,
      perfectRounds: 0,
      totalCoinsEarned: 0,
      totalScore: 0,
      completedContracts: 0,
    },
    achievements: {},
    settings: {
      cameraSensitivity: 1,
      joystickScale: 1,
      quality: "auto",
      vibration: true,
      masterVolume: 0.8,
      reducedMotion: false,
    },
  };
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function finiteNumber(value, fallback = 0, minimum = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
}

function clampedNumber(value, fallback, minimum, maximum) {
  return Math.min(maximum, finiteNumber(value, fallback, minimum));
}

function nullableTime(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mergeResultStats(value = {}) {
  const source = record(value);
  return {
    highScore: finiteNumber(source.highScore),
    bestTime: nullableTime(source.bestTime),
    bestRank: RANKS.includes(source.bestRank) ? source.bestRank : null,
    rounds: finiteNumber(source.rounds),
  };
}

function mergeModeStats(value = {}) {
  const source = record(value);
  return Object.fromEntries(Object.keys(MODES).map((mode) => [mode, mergeResultStats(source[mode])]));
}

function mergeLevelModeStats(value = {}, legacyModeStats = null, lastLevel = "closing") {
  const defaults = createLevelModeStats();
  const source = record(value);
  for (const level of Object.keys(defaults)) {
    const levelSource = record(source[level]);
    for (const mode of Object.keys(defaults[level])) {
      defaults[level][mode] = mergeResultStats(levelSource[mode]);
    }
  }

  // Vor V6 gab es keine Level-Zuordnung. Der zuletzt gewählte Level ist die
  // einzige belastbare Näherung; modeStats selbst bleibt vollständig erhalten.
  if (!Object.keys(source).length && legacyModeStats && defaults[lastLevel]) {
    for (const mode of Object.keys(defaults[lastLevel])) {
      defaults[lastLevel][mode] = {
        ...mergeResultStats(legacyModeStats[mode]),
        migratedFromModeStats: true,
      };
    }
  }
  return defaults;
}

function mergeCareer(value = {}) {
  const defaults = createCareerState();
  const levels = record(record(value).levels);
  for (const level of Object.keys(defaults.levels)) {
    const entry = record(levels[level]);
    const xp = finiteNumber(entry.xp);
    defaults.levels[level] = {
      xp,
      level: masteryLevelForXp(xp),
      rounds: finiteNumber(entry.rounds),
      completedRounds: finiteNumber(entry.completedRounds),
      bestRank: RANKS.includes(entry.bestRank) ? entry.bestRank : null,
    };
  }
  defaults.totalMasteryXp = Object.values(defaults.levels).reduce((sum, entry) => sum + entry.xp, 0);
  return defaults;
}

function mergeContracts(value = {}) {
  const defaults = createContractState();
  const source = record(value);
  const definitions = new Map(CONTRACT_DEFINITIONS.map((entry) => [entry.id, entry]));
  const dayKey = typeof source.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.dayKey)
    ? source.dayKey
    : null;
  const active = Array.isArray(source.active) && dayKey
    ? source.active.flatMap((raw) => {
      const item = record(raw);
      const definition = definitions.get(item.definitionId);
      if (!definition) return [];
      const progress = Math.min(definition.target, finiteNumber(item.progress));
      const completed = item.completed === true && progress >= definition.target;
      return [{
        id: `${dayKey}:${definition.id}`,
        definitionId: definition.id,
        progress,
        target: definition.target,
        reward: definition.reward,
        completed,
        completedAt: completed ? finiteNumber(item.completedAt, null) : null,
      }];
    })
    : [];
  const history = Array.isArray(source.history)
    ? source.history.slice(-31).flatMap((raw) => {
      const item = record(raw);
      if (typeof item.dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.dayKey)) return [];
      return [{
        dayKey: item.dayKey,
        completed: Array.isArray(item.completed)
          ? item.completed.filter((id) => definitions.has(id))
          : [],
      }];
    })
    : [];
  return {
    ...defaults,
    dayKey,
    seed: dayKey ? finiteNumber(source.seed) : null,
    active,
    completedTotal: finiteNumber(source.completedTotal),
    history,
  };
}

const KNOWN_OWNED = new Set(STARTER_KIT.concat(SHOP_ITEMS.map((item) => item.id)));

function mergeEquipment(value, owned) {
  const defaults = {
    head: "headband-lime",
    wrist: null,
    face: null,
    trail: null,
  };
  const source = record(value);
  for (const slot of EQUIPMENT_SLOTS) {
    const id = source[slot];
    if (id === null && slot !== "head") {
      defaults[slot] = null;
      continue;
    }
    if (typeof id !== "string" || !owned.includes(id)) continue;
    if (SHOP_ITEMS.some((candidate) => candidate.id === id && candidate.slot === slot)) defaults[slot] = id;
  }
  return defaults;
}

// Reine, additive Migration. Sie wird sowohl für localStorage als auch für
// importierte Backups benutzt, damit beide Wege identisch validiert werden.
export function migrateSave(value) {
  const defaults = createDefaultSave();
  const legacy = record(value);
  const legacyStats = record(legacy.stats);
  const legacySettings = record(legacy.settings);
  const lastLevel = LEVELS[legacy.lastLevel] ? legacy.lastLevel : defaults.lastLevel;
  const lastMode = MODES[legacy.lastMode] ? legacy.lastMode : defaults.lastMode;
  const modeStats = mergeModeStats(legacy.modeStats);
  const owned = Array.from(new Set([
    ...defaults.owned,
    ...(Array.isArray(legacy.owned) ? legacy.owned.filter((id) => KNOWN_OWNED.has(id)) : []),
  ]));
  const migrated = {
    ...defaults,
    version: SAVE_VERSION,
    coins: finiteNumber(legacy.coins),
    soundEnabled: legacy.soundEnabled !== false,
    tutorialCompleted: legacy.tutorialCompleted === true,
    lastMode,
    lastLevel,
    selectedCharacter: typeof legacy.selectedCharacter === "string" ? legacy.selectedCharacter : defaults.selectedCharacter,
    owned,
    equipped: mergeEquipment(legacy.equipped, owned),
    settings: {
      ...defaults.settings,
      cameraSensitivity: clampedNumber(legacySettings.cameraSensitivity, defaults.settings.cameraSensitivity, 0.6, 1.8),
      joystickScale: clampedNumber(legacySettings.joystickScale, defaults.settings.joystickScale, 0.8, 1.3),
      quality: ["auto", "high", "low"].includes(legacySettings.quality) ? legacySettings.quality : defaults.settings.quality,
      vibration: legacySettings.vibration !== false,
      masterVolume: clampedNumber(legacySettings.masterVolume, defaults.settings.masterVolume, 0, 1),
      reducedMotion: legacySettings.reducedMotion === true,
    },
    stats: {
      ...defaults.stats,
      totalRounds: finiteNumber(legacyStats.totalRounds ?? legacy.totalRounds),
      totalDelivered: finiteNumber(legacyStats.totalDelivered ?? legacy.totalDelivered),
      totalDumbbells: finiteNumber(legacyStats.totalDumbbells),
      byType: Object.fromEntries(Object.entries(record(legacyStats.byType))
        .map(([type, count]) => [type, finiteNumber(count)])),
      maxCombo: finiteNumber(legacyStats.maxCombo),
      perfectRounds: finiteNumber(legacyStats.perfectRounds),
      totalCoinsEarned: finiteNumber(legacyStats.totalCoinsEarned),
      totalScore: finiteNumber(legacyStats.totalScore),
      completedContracts: finiteNumber(legacyStats.completedContracts),
    },
    modeStats,
    levelModeStats: mergeLevelModeStats(
      legacy.levelModeStats,
      Object.keys(record(legacy.modeStats)).length ? modeStats : null,
      lastLevel,
    ),
    career: mergeCareer(legacy.career),
    contracts: mergeContracts(legacy.contracts),
    achievements: Object.fromEntries(Object.entries(record(legacy.achievements))
      .filter(([id, timestamp]) => ACHIEVEMENTS.some((entry) => entry.id === id) && Number.isFinite(Number(timestamp)))
      .map(([id, timestamp]) => [id, Number(timestamp)])),
  };

  // V3: ein globaler Highscore und separate Bestzeiten.
  if (finiteNumber(legacy.highScore) && !Object.values(migrated.modeStats).some((entry) => entry.highScore > 0)) {
    const highScore = finiteNumber(legacy.highScore);
    migrated.modeStats[lastMode].highScore = highScore;
    if (!Object.keys(record(legacy.levelModeStats)).length) {
      migrated.levelModeStats[lastLevel][lastMode].highScore = highScore;
      migrated.levelModeStats[lastLevel][lastMode].migratedFromModeStats = true;
    }
  }
  for (const [mode, bestTime] of Object.entries(record(legacy.bestTimes))) {
    if (!migrated.modeStats[mode]) continue;
    migrated.modeStats[mode].bestTime = nullableTime(bestTime);
    if (!Object.keys(record(legacy.levelModeStats)).length) {
      migrated.levelModeStats[lastLevel][mode].bestTime = nullableTime(bestTime);
      migrated.levelModeStats[lastLevel][mode].migratedFromModeStats = true;
    }
  }
  // V4: der Hantel-Sonderzähler wandert in den genaueren Typenzähler.
  if (migrated.stats.byType.dumbbell === undefined && migrated.stats.totalDumbbells > 0) {
    migrated.stats.byType.dumbbell = migrated.stats.totalDumbbells;
  }
  if (!migrated.owned.includes(migrated.selectedCharacter)) migrated.selectedCharacter = "raccoon";
  return migrated;
}

export function loadSave() {
  const defaults = createDefaultSave();
  try {
    return migrateSave(JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"));
  } catch (error) {
    console.warn("Spielstand konnte nicht gelesen werden", error);
    return defaults;
  }
}

export function persistSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (error) {
    console.warn("Spielstand konnte nicht gespeichert werden", error);
    return false;
  }
}

// JSON-Backup mit kleiner Hülle, damit fremde Dateien sicher abgewiesen werden
// können. exportedAt ist für reproduzierbare Tests optional überschreibbar.
export function serializeSaveExport(save, { pretty = true, exportedAt = new Date().toISOString() } = {}) {
  const envelope = {
    format: SAVE_EXPORT_FORMAT,
    exportVersion: SAVE_EXPORT_VERSION,
    exportedAt,
    save: migrateSave(save),
  };
  return JSON.stringify(envelope, null, pretty ? 2 : 0);
}

// Kein Throw an der UI-Grenze: Importdialoge können Fehler direkt anzeigen.
// Auch rohe ältere Save-JSONs werden akzeptiert und additiv migriert.
export function parseSaveImport(text) {
  try {
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Die Datei ist leer." };
    if (text.length > MAX_IMPORT_LENGTH) return { ok: false, error: "Die Datei ist zu groß." };
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Die Datei enthält keinen Spielstand." };
    }
    const envelope = parsed.format !== undefined;
    if (envelope && parsed.format !== SAVE_EXPORT_FORMAT) {
      return { ok: false, error: "Das ist kein Gym-Critters-Spielstand." };
    }
    if (envelope && finiteNumber(parsed.exportVersion) > SAVE_EXPORT_VERSION) {
      return { ok: false, error: "Das Backup stammt aus einer neueren Spielversion." };
    }
    const rawSave = envelope ? parsed.save : parsed;
    if (!rawSave || typeof rawSave !== "object" || Array.isArray(rawSave)) {
      return { ok: false, error: "Im Backup fehlt der Spielstand." };
    }
    const recognizable = ["version", "coins", "highScore", "modeStats", "owned", "stats"]
      .some((key) => Object.hasOwn(rawSave, key));
    if (!recognizable) {
      return { ok: false, error: "Die Datei enthält keinen erkennbaren Spielstand." };
    }
    if (finiteNumber(rawSave.version) > SAVE_VERSION) {
      return { ok: false, error: "Der Spielstand stammt aus einer neueren Spielversion." };
    }
    return {
      ok: true,
      save: migrateSave(rawSave),
      sourceVersion: finiteNumber(rawSave.version),
      format: envelope ? SAVE_EXPORT_FORMAT : "legacy-json",
    };
  } catch {
    return { ok: false, error: "Die Datei enthält kein gültiges JSON." };
  }
}

export function owns(save, id) {
  return Array.isArray(save.owned) && save.owned.includes(id);
}

export function buyOrEquip(save, item) {
  if (!owns(save, item.id)) {
    if (save.coins < item.cost) return { ok: false, reason: "coins" };
    save.coins -= item.cost;
    save.owned.push(item.id);
  }

  if (item.slot === "character") {
    save.selectedCharacter = item.id;
  } else {
    save.equipped[item.slot] = save.equipped[item.slot] === item.id && item.slot !== "head" ? null : item.id;
  }
  persistSave(save);
  return { ok: true };
}

function countedFor(save, progress) {
  const byType = save.stats?.byType || {};
  switch (progress.kind) {
    case "itemType": return byType[progress.type] || 0;
    case "distinctTypes": return Object.values(byType).filter((count) => count > 0).length;
    case "totalDelivered": return save.stats?.totalDelivered || 0;
    case "ownedExtras": return (save.owned || []).filter((id) => !STARTER_KIT.includes(id)).length;
    case "totalRounds": return save.stats?.totalRounds || 0;
    case "completedContracts": return save.contracts?.completedTotal || save.stats?.completedContracts || 0;
    case "masteryLevels": return totalMasteryLevels(save);
    case "coinsEarned": return save.stats?.totalCoinsEarned || 0;
    default: return 0;
  }
}

export function achievementProgress(save, achievement) {
  if (!achievement?.progress) return null;
  const { target } = achievement.progress;
  return { aktuell: Math.min(target, countedFor(save, achievement.progress)), ziel: target };
}

export function nextGoal(save) {
  let best = null;
  for (const achievement of ACHIEVEMENTS) {
    if (save.achievements[achievement.id]) continue;
    const progress = achievementProgress(save, achievement);
    if (!progress) continue;
    const ratio = progress.aktuell / progress.ziel;
    if (!best || ratio > best.anteil) {
      best = {
        achievement,
        aktuell: progress.aktuell,
        ziel: progress.ziel,
        rest: progress.ziel - progress.aktuell,
        anteil: ratio,
      };
    }
  }
  return best;
}

export function evaluateAchievements(save, round = null) {
  const unlocked = [];
  const unlock = (id) => {
    if (save.achievements[id]) return;
    save.achievements[id] = Date.now();
    const definition = ACHIEVEMENTS.find((entry) => entry.id === id);
    if (definition) unlocked.push(definition);
  };

  if (save.stats.totalRounds >= 1) unlock("first-shift");
  for (const achievement of ACHIEVEMENTS) {
    const progress = achievementProgress(save, achievement);
    if (progress && progress.aktuell >= progress.ziel) unlock(achievement.id);
  }

  if (round?.completed) {
    if (round.droppedItems === 0) unlock("sticky-paws");
    if (round.maxCombo >= round.totalItems && round.wrongPlacements === 0) unlock("perfect-order");
    if (round.mode === "standard" && round.elapsed <= 75) unlock("speed-cleaner");
  }

  persistSave(save);
  return unlocked;
}
