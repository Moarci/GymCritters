import test from "node:test";
import assert from "node:assert/strict";
import {
  FLOW_SHIELD,
  chargeFlowShield,
  createFlowShieldState,
  hasFlowShield,
  spendFlowShield,
} from "../src/flow-shield.js";

test("frischer Zustand hat keinen Schild und keine Ladung", () => {
  const state = createFlowShieldState();
  assert.deepEqual(state, { charge: 0, shields: 0 });
  assert.equal(hasFlowShield(state), false);
});

test("nur gehaltener Spitzenflow lädt den Schild", () => {
  let state = createFlowShieldState();
  // Zu niedriger Flow lädt nichts.
  state = chargeFlowShield(state, { tier: 2, dt: 1 });
  assert.equal(state.charge, 0);
  assert.equal(state.shields, 0);
  // MAX FLOW (Stufe 3) lädt den Fortschritt.
  state = chargeFlowShield(state, { tier: 3, dt: 1 });
  assert.ok(state.charge > 0 && state.charge < 1);
  assert.equal(state.shields, 0);
});

test("nach der Ladezeit wird genau ein Schild gebankt", () => {
  let state = createFlowShieldState();
  let earnedFrames = 0;
  for (let i = 0; i < 6; i++) {
    state = chargeFlowShield(state, { tier: 3, dt: FLOW_SHIELD.chargeSeconds / 3 });
    if (state.earned) earnedFrames += 1;
  }
  assert.equal(state.shields, 1);
  assert.equal(earnedFrames, 1, "earned meldet nur die eine Frame des Freischaltens");
  assert.equal(hasFlowShield(state), true);
});

test("ein voller Speicher lädt keinen zweiten Schild und behält den ersten", () => {
  let state = { charge: 0, shields: FLOW_SHIELD.maxShields };
  state = chargeFlowShield(state, { tier: 3, dt: FLOW_SHIELD.chargeSeconds * 2 });
  assert.equal(state.shields, FLOW_SHIELD.maxShields);
  assert.equal(state.charge, 0);
  assert.equal(state.earned, false);
});

test("unter Spitzenflow zerfällt die Ladung langsam statt sofort", () => {
  let state = chargeFlowShield(createFlowShieldState(), { tier: 3, dt: 1 });
  const geladen = state.charge;
  const nachAbfall = chargeFlowShield(state, { tier: 0, dt: 1 });
  assert.ok(nachAbfall.charge < geladen, "Fortschritt sinkt");
  assert.ok(nachAbfall.charge > 0, "aber ein kurzer Aussetzer löscht ihn nicht");
});

test("ein gebankter Schild absorbiert genau einen Bruch", () => {
  const banked = { charge: 0.4, shields: 1 };
  const first = spendFlowShield(banked);
  assert.equal(first.absorbed, true);
  assert.equal(first.state.shields, 0);
  assert.equal(first.state.charge, 0.4, "Ladefortschritt bleibt beim Verbrauch erhalten");
  const second = spendFlowShield(first.state);
  assert.equal(second.absorbed, false);
  assert.equal(second.state.shields, 0);
});

test("ohne Schild rettet nichts die Serie", () => {
  const result = spendFlowShield(createFlowShieldState());
  assert.equal(result.absorbed, false);
});
