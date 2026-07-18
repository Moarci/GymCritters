import { LEVELS, LEVEL_MASTERY, MODES } from "./config.js";
import { applyRoundToContracts } from "./challenges.js";

const RANKS = ["D", "C", "B", "A", "S"];

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
  if (round.completed === true && Number.isFinite(elapsed) && elapsed >= 0) {
    entry.bestTime = entry.bestTime === null || entry.bestTime === undefined
      ? elapsed
      : Math.min(entry.bestTime, elapsed);
  }
  entry.bestRank = betterRank(entry.bestRank, round.rank);
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

  const contracts = applyRoundToContracts(save, { ...round, level, mode, delivered, deliveredByType }, date, now);
  return {
    level,
    mode,
    modeStats: save.modeStats[mode],
    levelModeStats: save.levelModeStats[level][mode],
    xpEarned,
    masteryBefore: before,
    masteryAfter: masteryProgress(levelCareer.xp),
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

