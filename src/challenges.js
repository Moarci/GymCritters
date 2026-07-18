import { CONTRACT_DEFINITIONS } from "./config.js";

const CONTRACT_GROUPS = ["delivery", "shift", "skill"];
const MAX_HISTORY_DAYS = 31;

export function localDayKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) throw new TypeError("Ungültiges Datum für Tagesverträge");
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// FNV-1a: klein, reproduzierbar und für eine lokale Tagesauswahl völlig
// ausreichend. Es wird ausdrücklich nicht als Sicherheits-Hash verwendet.
export function deterministicSeed(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function chooseForGroup(dayKey, group, definitions) {
  const candidates = definitions.filter((entry) => entry.group === group);
  if (!candidates.length) return null;
  const index = deterministicSeed(`${dayKey}:${group}`) % candidates.length;
  return candidates[index];
}

export function dailyContractSet(dayKey, definitions = CONTRACT_DEFINITIONS) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) throw new TypeError("Tages-Key muss YYYY-MM-DD entsprechen");
  return CONTRACT_GROUPS
    .map((group) => chooseForGroup(dayKey, group, definitions))
    .filter(Boolean)
    .map((definition) => ({
      id: `${dayKey}:${definition.id}`,
      definitionId: definition.id,
      progress: 0,
      target: definition.target,
      reward: definition.reward,
      completed: false,
      completedAt: null,
    }));
}

export function createContractState() {
  return {
    dayKey: null,
    seed: null,
    active: [],
    completedTotal: 0,
    history: [],
  };
}

function archivePreviousDay(contracts) {
  if (!contracts.dayKey || !contracts.active.length) return;
  const summary = {
    dayKey: contracts.dayKey,
    completed: contracts.active.filter((entry) => entry.completed).map((entry) => entry.definitionId),
  };
  const existing = contracts.history.findIndex((entry) => entry.dayKey === contracts.dayKey);
  if (existing >= 0) contracts.history.splice(existing, 1);
  contracts.history.push(summary);
  if (contracts.history.length > MAX_HISTORY_DAYS) {
    contracts.history.splice(0, contracts.history.length - MAX_HISTORY_DAYS);
  }
}

export function ensureDailyContracts(save, date = new Date()) {
  if (!save.contracts || typeof save.contracts !== "object") save.contracts = createContractState();
  const dayKey = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : localDayKey(date);
  if (save.contracts.dayKey === dayKey && Array.isArray(save.contracts.active) && save.contracts.active.length) {
    return { contracts: save.contracts.active, changed: false, dayKey };
  }

  archivePreviousDay(save.contracts);
  save.contracts.dayKey = dayKey;
  save.contracts.seed = deterministicSeed(dayKey);
  save.contracts.active = dailyContractSet(dayKey);
  // Wird die lokale Uhr zurückgestellt, bleiben an diesem Datum bereits
  // erledigte Verträge erledigt. So kann dieselbe Belohnung nicht erneut
  // eingesammelt werden, obwohl alles vollständig offline funktioniert.
  const archived = save.contracts.history.find((entry) => entry.dayKey === dayKey);
  if (archived) {
    for (const contract of save.contracts.active) {
      if (!archived.completed.includes(contract.definitionId)) continue;
      contract.progress = contract.target;
      contract.completed = true;
    }
  }
  return { contracts: save.contracts.active, changed: true, dayKey };
}

export function contractDefinition(contract, definitions = CONTRACT_DEFINITIONS) {
  return definitions.find((entry) => entry.id === contract?.definitionId) || null;
}

function deliveredByType(round) {
  return round.deliveredByType || round.byType || round.itemCounts || {};
}

function totalDelivered(round) {
  if (Number.isFinite(round.delivered)) return Math.max(0, round.delivered);
  return Object.values(deliveredByType(round)).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
}

export function contractRoundProgress(definition, round = {}) {
  const rule = definition?.progress;
  if (!rule) return { amount: 0, strategy: "add" };
  const completed = round.completed === true;
  const byType = deliveredByType(round);

  switch (rule.kind) {
    case "delivered":
      return { amount: totalDelivered(round), strategy: "add" };
    case "itemType":
      return { amount: Math.max(0, Number(byType[rule.type]) || 0), strategy: "add" };
    case "itemTypes":
      return {
        amount: rule.types.reduce((sum, type) => sum + Math.max(0, Number(byType[type]) || 0), 0),
        strategy: "add",
      };
    case "completedRounds":
      return { amount: completed ? 1 : 0, strategy: "add" };
    case "modeCompleted":
      return { amount: completed && round.mode === rule.mode ? 1 : 0, strategy: "add" };
    case "levelCompleted":
      return { amount: completed && round.level === rule.level ? 1 : 0, strategy: "add" };
    case "score":
      return { amount: Math.max(0, Number(round.score) || 0), strategy: "add" };
    case "cleanRounds":
      return { amount: completed && (Number(round.droppedItems) || 0) === 0 ? 1 : 0, strategy: "add" };
    case "maxCombo":
      return { amount: Math.max(0, Number(round.maxCombo) || 0), strategy: "max" };
    default:
      return { amount: 0, strategy: "add" };
  }
}

// Mutiert nur das übergebene Save-Objekt; Speichern und UI bleiben Aufgabe des
// Aufrufers. Belohnungen werden beim Erreichen sofort und exakt einmal gebucht.
export function applyRoundToContracts(save, round, date = new Date(), now = Date.now()) {
  const { contracts, dayKey } = ensureDailyContracts(save, date);
  const completed = [];
  let coinsEarned = 0;

  for (const contract of contracts) {
    if (contract.completed) continue;
    const definition = contractDefinition(contract);
    const update = contractRoundProgress(definition, round);
    const next = update.strategy === "max"
      ? Math.max(Number(contract.progress) || 0, update.amount)
      : (Number(contract.progress) || 0) + update.amount;
    contract.progress = Math.min(contract.target, Math.max(0, next));

    if (contract.progress < contract.target) continue;
    contract.completed = true;
    contract.completedAt = now;
    save.contracts.completedTotal = (Number(save.contracts.completedTotal) || 0) + 1;
    save.coins = (Number(save.coins) || 0) + contract.reward;
    if (save.stats) {
      save.stats.totalCoinsEarned = (Number(save.stats.totalCoinsEarned) || 0) + contract.reward;
      save.stats.completedContracts = (Number(save.stats.completedContracts) || 0) + 1;
    }
    coinsEarned += contract.reward;
    completed.push({ contract, definition });
  }

  return { dayKey, contracts, completed, coinsEarned };
}
