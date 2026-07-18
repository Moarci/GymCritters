import test from "node:test";
import assert from "node:assert/strict";
import { createQualityState, stepQuality, median, QUALITY_LIMITS } from "../src/perf/adaptive-quality.js";

// Speist n Frames mit konstanter Dauer ein und gibt den Endzustand zurück.
function feed(state, frameMs, count) {
  let current = state;
  for (let i = 0; i < count; i++) current = stepQuality(current, frameMs);
  return current;
}

const SMOOTH = 1000 / 60;
const SLOW = 1000 / 30;

test("median liefert den mittleren Wert und ignoriert Ausreißer", () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([16, 16, 16, 16, 900]), 16);
});

test("stepQuality verändert den übergebenen Zustand nicht", () => {
  const state = createQualityState();
  const before = JSON.stringify(state);
  stepQuality(state, SMOOTH);
  assert.equal(JSON.stringify(state), before);
});

test("stepQuality verändert den Zustand mitten im Fenster nicht", () => {
  // Anders als beim Warmlauf-Test hat samples hier bereits Einträge; ein
  // push() statt einer Kopie würde diese Probe direkt am Original erwischen.
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize / 2);
  const before = JSON.stringify(state);
  stepQuality(state, SMOOTH);
  assert.equal(JSON.stringify(state), before);
});

test("stepQuality verändert den Zustand beim fensterabschließenden Herunterregeln nicht", () => {
  // Genau der Frame, der das Fenster voll macht und eine Entscheidung samt
  // samples-Reset auslöst, darf den übergebenen Zustand nicht mutieren.
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SLOW, QUALITY_LIMITS.windowSize - 1);
  const before = JSON.stringify(state);
  stepQuality(state, SLOW);
  assert.equal(JSON.stringify(state), before);
});

test("stepQuality regelt während der Warmlaufphase nicht", () => {
  const state = createQualityState();
  const warm = feed(state, SLOW, QUALITY_LIMITS.warmupFrames - 1);
  assert.equal(warm.scaling, 1);
  assert.equal(warm.tier, "high");
});

test("stepQuality erhöht das Scaling bei zu niedriger Bildrate", () => {
  const ready = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  const loaded = feed(ready, SLOW, QUALITY_LIMITS.windowSize);
  assert.ok(loaded.scaling > 1, `erwartet hochgeregeltes Scaling, war ${loaded.scaling}`);
  assert.equal(loaded.tier, "high", "die Stufe kippt erst nach dem Scaling");
});

test("stepQuality kippt die Stufe erst, wenn das Scaling ausgereizt ist", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  for (let round = 0; round < 40; round++) state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  assert.equal(state.scaling, QUALITY_LIMITS.maxScaling);
  assert.equal(state.tier, "low");
});

test("stepQuality kippt die Stufe zurück, bevor das Scaling zu sinken beginnt", () => {
  // Voll ausgereizter Zustand: Scaling am Maximum, Stufe bereits "low".
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  for (let round = 0; round < 40; round++) state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  assert.equal(state.scaling, QUALITY_LIMITS.maxScaling);
  assert.equal(state.tier, "low");

  // Genau ein glattes Fenster: laut Reihenfolge "erst die Stufe zurück, dann
  // das Scaling" muss tier bereits kippen, während scaling noch am Maximum steht.
  const flipped = feed(state, SMOOTH, QUALITY_LIMITS.windowSize);
  assert.equal(flipped.tier, "high", "die Stufe muss vor dem Scaling zurückkippen");
  assert.equal(flipped.scaling, QUALITY_LIMITS.maxScaling, "das Scaling darf in diesem Schritt noch nicht sinken");
});

test("stepQuality überschreitet die Grenzen nicht", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  for (let round = 0; round < 80; round++) state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  assert.equal(state.scaling, QUALITY_LIMITS.maxScaling);
  let recovered = state;
  for (let round = 0; round < 80; round++) recovered = feed(recovered, SMOOTH, QUALITY_LIMITS.windowSize);
  assert.equal(recovered.scaling, QUALITY_LIMITS.minScaling, "nach voller Erholung muss das Scaling wieder am Minimum stehen");
  assert.equal(recovered.tier, "high", "nach voller Erholung muss die Stufe wieder auf high stehen");
});

test("stepQuality regelt bei viel Luft wieder herunter", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  const loaded = state.scaling;
  state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize);
  assert.ok(state.scaling < loaded, `erwartet Erholung, war ${state.scaling}`);
});

test("stepQuality zählt ein erfolgreiches und gehaltenes Hochregeln nicht als Fehlversuch", () => {
  // Einmal herunterregeln, dann dauerhaft glatt bleiben: das Hochregeln
  // gelingt und hält, failedUpgrades darf dabei nicht anspringen. Eine
  // Implementierung, die bei JEDEM Herunterregeln failedUpgrades erhöht
  // (statt nur nach einem gescheiterten Hochstufversuch), würde hier bereits
  // nach dem ersten Fenster von 0 abweichen.
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  assert.ok(state.scaling > 1, "das einzelne langsame Fenster muss das Scaling anheben");
  state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize * 5);
  assert.equal(state.failedUpgrades, 0, "ein gehaltenes Hochregeln ist kein Fehlversuch");
});

test("stepQuality gibt nach zwei erfolglosen Versuchen das Hochregeln auf", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  // Abwechselnd Luft und Last: jeder Hochstufversuch wird sofort wieder kassiert.
  for (let round = 0; round < 6; round++) {
    state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize);
    state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  }
  assert.equal(state.failedUpgrades, QUALITY_LIMITS.maxFailedUpgrades);
  const settled = state.scaling;
  state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize);
  assert.equal(state.scaling, settled, "nach der Sperre darf nicht mehr hochgeregelt werden");
});

test("stepQuality lässt sich einen einzelnen Ruckler nicht anmerken", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize - 1);
  state = stepQuality(state, 900);
  assert.equal(state.scaling, 1, "ein GC-Hänger darf nicht herunterregeln");
});
