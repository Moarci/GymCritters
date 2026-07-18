import { ACHIEVEMENTS, MODES, SAVE_KEY, SAVE_VERSION } from "./config.js";

function emptyModeStats() {
  return Object.fromEntries(Object.keys(MODES).map((mode) => [mode, {
    highScore: 0,
    bestTime: null,
    bestRank: null,
    rounds: 0,
  }]));
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
    owned: ["raccoon", "headband-lime"],
    equipped: {
      head: "headband-lime",
      wrist: null,
      face: null,
      trail: null,
    },
    modeStats: emptyModeStats(),
    stats: {
      totalRounds: 0,
      totalDelivered: 0,
      totalDumbbells: 0,
      maxCombo: 0,
      perfectRounds: 0,
      totalCoinsEarned: 0,
    },
    achievements: {},
    settings: {
      cameraSensitivity: 1,
      joystickScale: 1,
      quality: "high",
      vibration: true,
    },
  };
}

function mergeModeStats(value = {}) {
  const defaults = emptyModeStats();
  for (const key of Object.keys(defaults)) {
    defaults[key] = { ...defaults[key], ...(value[key] || {}) };
  }
  return defaults;
}

export function loadSave() {
  const defaults = createDefaultSave();
  try {
    const legacy = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    const migrated = {
      ...defaults,
      ...legacy,
      version: SAVE_VERSION,
      owned: Array.from(new Set([...(defaults.owned || []), ...(legacy.owned || [])])),
      equipped: { ...defaults.equipped, ...(legacy.equipped || {}) },
      settings: { ...defaults.settings, ...(legacy.settings || {}) },
      stats: {
        ...defaults.stats,
        ...(legacy.stats || {}),
        totalRounds: legacy.stats?.totalRounds ?? legacy.totalRounds ?? defaults.stats.totalRounds,
        totalDelivered: legacy.stats?.totalDelivered ?? legacy.totalDelivered ?? defaults.stats.totalDelivered,
      },
      modeStats: mergeModeStats(legacy.modeStats),
      achievements: { ...defaults.achievements, ...(legacy.achievements || {}) },
    };

    // V3 migration: one global high score and separate best times.
    if (legacy.highScore && !Object.values(migrated.modeStats).some((entry) => entry.highScore > 0)) {
      migrated.modeStats[legacy.lastMode || "standard"].highScore = legacy.highScore;
    }
    if (legacy.bestTimes) {
      for (const [mode, bestTime] of Object.entries(legacy.bestTimes)) {
        if (migrated.modeStats[mode]) migrated.modeStats[mode].bestTime = bestTime;
      }
    }
    if (!migrated.owned.includes(migrated.selectedCharacter)) migrated.selectedCharacter = "raccoon";
    return migrated;
  } catch (error) {
    console.warn("Spielstand konnte nicht gelesen werden", error);
    return defaults;
  }
}

export function persistSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (error) {
    console.warn("Spielstand konnte nicht gespeichert werden", error);
  }
}

export function owns(save, id) {
  return save.owned.includes(id);
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

export function evaluateAchievements(save, round = null) {
  const unlocked = [];
  const unlock = (id) => {
    if (save.achievements[id]) return;
    save.achievements[id] = Date.now();
    const definition = ACHIEVEMENTS.find((entry) => entry.id === id);
    if (definition) unlocked.push(definition);
  };

  if (save.stats.totalRounds >= 1) unlock("first-shift");
  if (save.stats.totalDumbbells >= 10) unlock("heavy-lifter");
  if (save.stats.totalDelivered >= 50) unlock("gym-hero");
  if (save.owned.filter((id) => !["raccoon", "headband-lime"].includes(id)).length >= 4) unlock("collector");

  if (round?.completed) {
    if (round.droppedItems === 0) unlock("sticky-paws");
    if (round.maxCombo >= round.totalItems && round.wrongPlacements === 0) unlock("perfect-order");
    if (round.mode === "standard" && round.elapsed <= 75) unlock("speed-cleaner");
  }

  persistSave(save);
  return unlocked;
}
