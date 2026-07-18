export const QUALITY_LIMITS = {
  minScaling: 1,
  maxScaling: 2,
  step: 0.15,
  targetFps: 50,     // darunter wird heruntergeregelt
  upgradeFps: 58,    // darüber wird ein Hochstufversuch gewagt
  windowSize: 60,    // Frames pro Messfenster, etwa eine Sekunde
  warmupFrames: 120, // Shader-Kompilierung und Asset-Upload sind nicht repräsentativ
  maxFailedUpgrades: 2,
};

export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function createQualityState(overrides = {}) {
  const limits = { ...QUALITY_LIMITS, ...overrides };
  return {
    limits,
    samples: [],
    warmup: 0,
    scaling: limits.minScaling,
    tier: "high",
    failedUpgrades: 0,
    lastAction: "none",
  };
}

// Nimmt eine Frame-Dauer entgegen und gibt einen neuen Zustand zurück. Entschieden wird
// nur am Ende eines vollen Fensters; dazwischen werden ausschließlich Proben gesammelt.
export function stepQuality(state, frameMs) {
  const limits = state.limits;

  if (state.warmup < limits.warmupFrames) {
    return { ...state, warmup: state.warmup + 1 };
  }

  const samples = [...state.samples, frameMs];
  if (samples.length < limits.windowSize) {
    return { ...state, samples };
  }

  // Median statt Mittelwert: ein einzelner GC-Hänger soll die Qualität nicht drücken.
  const fps = 1000 / median(samples);
  const base = { ...state, samples: [] };

  if (fps < limits.targetFps) {
    // Erst der feine Regler, dann die grobe Stufe.
    const failedUpgrades = state.lastAction === "up"
      ? Math.min(limits.maxFailedUpgrades, state.failedUpgrades + 1)
      : state.failedUpgrades;

    if (state.scaling < limits.maxScaling) {
      const scaling = Math.min(limits.maxScaling, round2(state.scaling + limits.step));
      return { ...base, scaling, failedUpgrades, lastAction: "down" };
    }
    if (state.tier === "high") {
      return { ...base, tier: "low", failedUpgrades, lastAction: "down" };
    }
    return { ...base, failedUpgrades, lastAction: "down" };
  }

  if (fps > limits.upgradeFps && state.failedUpgrades < limits.maxFailedUpgrades) {
    // Rückwärts in der Reihenfolge des Abstiegs: erst die Stufe zurück, dann das Scaling.
    if (state.tier === "low") {
      return { ...base, tier: "high", lastAction: "up" };
    }
    if (state.scaling > limits.minScaling) {
      const scaling = Math.max(limits.minScaling, round2(state.scaling - limits.step));
      return { ...base, scaling, lastAction: "up" };
    }
  }

  return { ...base, lastAction: "none" };
}

// Hält das Scaling auf zwei Nachkommastellen, damit sich Fließkommareste nicht
// über viele Schritte zu sichtbaren Abweichungen aufsummieren.
function round2(value) {
  return Math.round(value * 100) / 100;
}
