import { LEVELS, LEVEL_MASTERY, MODES } from "./config.js";
import { applyRoundToContracts } from "./challenges.js";

const RANKS = ["D", "C", "B", "A", "S"];
export const MAX_ROUND_HISTORY = 120;

export function emptyResultStats() {
  return {
    highScore: 0,
    bestTime: null,
    bestRank: null,
    rounds: 0,
  };
}

export function createLevelModeStats() {
  return Object.fromEntries(Object.keys(LEVELS).map((level) => [
    level,
    Object.fromEntries(Object.keys(MODES).map((mode) => [mode, emptyResultStats()])),
  ]));
}

export function createCareerState() {
  return {
    totalMasteryXp: 0,
    levels: Object.fromEntries(Object.keys(LEVELS).map((level) => [level, {
      xp: 0,
      level: 1,
      rounds: 0,
      completedRounds: 0,
      bestRank: null,
    }])),
  };
}

export function masteryLevelForXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let index = 0; index < LEVEL_MASTERY.thresholds.length; index += 1) {
    if (safeXp >= LEVEL_MASTERY.thresholds[index]) level = index + 1;
  }
  return Math.min(LEVEL_MASTERY.maxLevel, level);
}

export function masteryProgress(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = masteryLevelForXp(safeXp);
  const currentThreshold = LEVEL_MASTERY.thresholds[level - 1] || 0;
  const nextThreshold = LEVEL_MASTERY.thresholds[level] ?? currentThreshold;
  const maxed = level >= LEVEL_MASTERY.maxLevel;
  const span = Math.max(1, nextThreshold - currentThreshold);
  return {
    level,
    xp: safeXp,
    currentThreshold,
    nextThreshold: maxed ? null : nextThreshold,
    xpIntoLevel: safeXp - currentThreshold,
    xpForNextLevel: maxed ? 0 : nextThreshold - safeXp,
    ratio: maxed ? 1 : Math.min(1, (safeXp - currentThreshold) / span),
    maxed,
  };
}

function isPerfectRound(round) {
  return round.completed === true
    && (Number(round.wrongPlacements) || 0) === 0
    && (Number(round.maxCombo) || 0) >= Math.max(1, Number(round.totalItems) || 0);
}

export function masteryXpForRound(round = {}) {
  const scoreBonus = Math.min(
    LEVEL_MASTERY.xp.maxScoreBonus,
    Math.floor(Math.max(0, Number(round.score) || 0) / LEVEL_MASTERY.xp.scoreDivisor),
  );
  let xp = scoreBonus;
  if (round.completed === true) xp += LEVEL_MASTERY.xp.completedRound;
  if (round.completed === true && (Number(round.droppedItems) || 0) === 0) xp += LEVEL_MASTERY.xp.noDropBonus;
  if (isPerfectRound(round)) xp += LEVEL_MASTERY.xp.perfectBonus;
  return xp;
}

export function betterRank(current, candidate) {
  if (!RANKS.includes(candidate)) return current || null;
  if (!RANKS.includes(current)) return candidate;
  return RANKS.indexOf(candidate) > RANKS.indexOf(current) ? candidate : current;
}

function applyResult(entry, round) {
  entry.highScore = Math.max(Number(entry.highScore) || 0, Math.max(0, Number(round.score) || 0));
  entry.rounds = (Number(entry.rounds) || 0) + 1;
  const elapsed = Number(round.elapsed);
  if (round.completed === true && round.timed !== false && Number.isFinite(elapsed) && elapsed >= 0) {
    entry.bestTime = entry.bestTime === null || entry.bestTime === undefined
      ? elapsed
      : Math.min(entry.bestTime, elapsed);
  }
  entry.bestRank = betterRank(entry.bestRank, round.rank);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

// Vergleichbarer 0–100-Leistungswert statt bloßer Highscores: Abschluss,
// Fehlerfreiheit, Combo und Tempo werden je Gegenstand normalisiert. Dadurch
// lassen sich auch unterschiedliche Gegenstandsmengen sinnvoll vergleichen.
export function performanceIndex(round = {}) {
  const totalItems = Math.max(1, Number(round.totalItems) || 0);
  const delivered = clamp(Number(round.delivered) || 0, 0, totalItems);
  const completionRatio = delivered / totalItems;
  const mistakes = Math.max(0, Number(round.wrongPlacements) || 0)
    + Math.max(0, Number(round.droppedItems) || 0) * 0.65
    + Math.max(0, Number(round.trips) || 0) * 0.8;
  const accuracyRatio = clamp(1 - mistakes / totalItems, 0, 1);
  const comboRatio = clamp((Number(round.maxCombo) || 0) / totalItems, 0, 1);
  const elapsed = Math.max(0, Number(round.elapsed) || 0);
  const secondsPerItem = delivered > 0 ? elapsed / delivered : Infinity;
  const paceBenchmark = MODES[round.mode]?.expectedSecondsPerItem || 14;
  const paceRatio = Number.isFinite(secondsPerItem)
    ? clamp(paceBenchmark / Math.max(1, secondsPerItem), 0, 1)
    : 0;

  return Math.round(
    completionRatio * 30
    + accuracyRatio * 25
    + comboRatio * 25
    + paceRatio * 20,
  );
}

export function sanitizeRoundHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_ROUND_HISTORY).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const level = LEVELS[entry.level] ? entry.level : null;
    const mode = MODES[entry.mode] ? entry.mode : null;
    if (!level || !mode) return [];
    const round = {
      id: typeof entry.id === "string" ? entry.id : `${Number(entry.timestamp) || 0}-${level}-${mode}`,
      timestamp: Math.max(0, Number(entry.timestamp) || 0),
      level,
      mode,
      character: typeof entry.character === "string" ? entry.character : "raccoon",
      completed: entry.completed === true,
      timed: entry.timed !== false,
      score: Math.max(0, Number(entry.score) || 0),
      elapsed: Math.max(0, Number(entry.elapsed) || 0),
      delivered: Math.max(0, Number(entry.delivered) || 0),
      totalItems: Math.max(1, Number(entry.totalItems) || 1),
      maxCombo: Math.max(0, Number(entry.maxCombo) || 0),
      wrongPlacements: Math.max(0, Number(entry.wrongPlacements) || 0),
      droppedItems: Math.max(0, Number(entry.droppedItems) || 0),
      trips: Math.max(0, Number(entry.trips) || 0),
      performance: clamp(Number(entry.performance) || performanceIndex(entry), 0, 100),
      shiftSettings: entry.shiftSettings && typeof entry.shiftSettings === "object"
        ? { ...entry.shiftSettings }
        : null,
    };
    return [round];
  });
}

export function appendRoundHistory(save, round, now = Date.now()) {
  save.roundHistory = sanitizeRoundHistory(save.roundHistory);
  const historyEntry = {
    ...round,
    id: `${now}-${round.level}-${round.mode}-${save.roundHistory.length}`,
    timestamp: now,
    performance: performanceIndex(round),
  };
  const [sanitized] = sanitizeRoundHistory([historyEntry]);
  save.roundHistory.push(sanitized);
  if (save.roundHistory.length > MAX_ROUND_HISTORY) {
    save.roundHistory.splice(0, save.roundHistory.length - MAX_ROUND_HISTORY);
  }
  return sanitized;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function filteredRoundHistory(history, { level = "all", mode = "all" } = {}) {
  return sanitizeRoundHistory(history).filter((entry) => (
    (level === "all" || entry.level === level)
    && (mode === "all" || entry.mode === mode)
  ));
}

export function roundTrend(history, filters = {}) {
  const comparable = filteredRoundHistory(history, filters).slice(-10);
  if (comparable.length < 4) {
    return {
      status: "insufficient",
      delta: 0,
      recentAverage: comparable.length ? Math.round(average(comparable.map(({ performance }) => performance))) : 0,
      previousAverage: 0,
      sampleSize: comparable.length,
    };
  }
  const split = Math.floor(comparable.length / 2);
  const previous = comparable.slice(0, split);
  const recent = comparable.slice(split);
  const previousAverage = average(previous.map(({ performance }) => performance));
  const recentAverage = average(recent.map(({ performance }) => performance));
  const delta = Math.round(recentAverage - previousAverage);
  return {
    status: delta >= 3 ? "improved" : delta <= -3 ? "declined" : "stable",
    delta,
    recentAverage: Math.round(recentAverage),
    previousAverage: Math.round(previousAverage),
    sampleSize: comparable.length,
  };
}

function ensureRoundContainers(save, level, mode) {
  save.modeStats ||= {};
  save.modeStats[mode] ||= emptyResultStats();
  save.levelModeStats ||= createLevelModeStats();
  save.levelModeStats[level] ||= {};
  save.levelModeStats[level][mode] ||= emptyResultStats();
  save.career ||= createCareerState();
  save.career.levels ||= {};
  save.career.levels[level] ||= createCareerState().levels[level] || {
    xp: 0, level: 1, rounds: 0, completedRounds: 0, bestRank: null,
  };
  save.stats ||= {};
  save.stats.byType ||= {};
  save.roundHistory ||= [];
}

// Der zentrale Abschlussweg für eine echte Spielrunde. Er aktualisiert sowohl
// die alten Modus-Summen (Abwärtskompatibilität) als auch die fairen Bestwerte
// je Level × Modus, Karriere, Tagesverträge und globale Statistiken.
export function recordRoundProgress(save, round, { date = new Date(), now = Date.now() } = {}) {
  const level = LEVELS[round.level] ? round.level : "closing";
  const mode = MODES[round.mode] ? round.mode : "standard";
  ensureRoundContainers(save, level, mode);

  applyResult(save.modeStats[mode], round);
  applyResult(save.levelModeStats[level][mode], round);

  const deliveredByType = round.deliveredByType || round.byType || {};
  const delivered = Number.isFinite(round.delivered)
    ? Math.max(0, round.delivered)
    : Object.values(deliveredByType).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const coinsEarned = Math.max(0, Number(round.coinsEarned) || 0);
  save.coins = (Number(save.coins) || 0) + coinsEarned;
  save.stats.totalRounds = (Number(save.stats.totalRounds) || 0) + 1;
  save.stats.totalDelivered = (Number(save.stats.totalDelivered) || 0) + delivered;
  save.stats.totalDumbbells = (Number(save.stats.totalDumbbells) || 0) + Math.max(0, Number(deliveredByType.dumbbell) || 0);
  for (const [type, count] of Object.entries(deliveredByType)) {
    save.stats.byType[type] = (Number(save.stats.byType[type]) || 0) + Math.max(0, Number(count) || 0);
  }
  save.stats.maxCombo = Math.max(Number(save.stats.maxCombo) || 0, Math.max(0, Number(round.maxCombo) || 0));
  save.stats.totalCoinsEarned = (Number(save.stats.totalCoinsEarned) || 0) + coinsEarned;
  save.stats.totalScore = (Number(save.stats.totalScore) || 0) + Math.max(0, Number(round.score) || 0);
  save.stats.totalTrips = (Number(save.stats.totalTrips) || 0) + Math.max(0, Number(round.trips) || 0);
  if (isPerfectRound(round)) save.stats.perfectRounds = (Number(save.stats.perfectRounds) || 0) + 1;

  const levelCareer = save.career.levels[level];
  const before = masteryProgress(levelCareer.xp);
  const xpEarned = masteryXpForRound(round);
  levelCareer.xp = (Number(levelCareer.xp) || 0) + xpEarned;
  levelCareer.level = masteryLevelForXp(levelCareer.xp);
  levelCareer.rounds = (Number(levelCareer.rounds) || 0) + 1;
  if (round.completed === true) levelCareer.completedRounds = (Number(levelCareer.completedRounds) || 0) + 1;
  levelCareer.bestRank = betterRank(levelCareer.bestRank, round.rank);
  save.career.totalMasteryXp = (Number(save.career.totalMasteryXp) || 0) + xpEarned;

  save.lastMode = mode;
  save.lastLevel = level;
  if (round.character) save.selectedCharacter = round.character;

  const historyEntry = appendRoundHistory(save, { ...round, level, mode }, now);
  const contracts = applyRoundToContracts(save, { ...round, level, mode, delivered, deliveredByType }, date, now);
  return {
    level,
    mode,
    modeStats: save.modeStats[mode],
    levelModeStats: save.levelModeStats[level][mode],
    xpEarned,
    masteryBefore: before,
    masteryAfter: masteryProgress(levelCareer.xp),
    historyEntry,
    trend: roundTrend(save.roundHistory, { level, mode }),
    contracts,
    coinsEarned: coinsEarned + contracts.coinsEarned,
  };
}

export function totalMasteryLevels(save) {
  return Object.values(save.career?.levels || {}).reduce(
    (sum, entry) => sum + masteryLevelForXp(entry?.xp),
    0,
  );
}
