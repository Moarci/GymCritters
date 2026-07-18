import test from "node:test";
import assert from "node:assert/strict";
import { deviceScalingFloor, fixedQualityScaling } from "../src/perf/render-scale.js";

// Babylon: Renderauflösung = Canvasgröße / Level. Level 1 = CSS-Pixel,
// native Schärfe = 1/DPR. Werte über 1 liegen UNTER der CSS-Auflösung.

test("High-DPI-Touchgerät startet schärfer als CSS-Auflösung, nicht darunter", () => {
  const floor = deviceScalingFloor({ touch: true, devicePixelRatio: 3 });
  assert.equal(floor, 1.45 / 3);
  assert.ok(floor < 1, "Floor über 1 hieße: gröber als CSS-Auflösung — genau der Pixelbrei-Bug");
});

test("Touchgerät mit niedrigem DPR bleibt bei CSS-Auflösung", () => {
  assert.equal(deviceScalingFloor({ touch: true, devicePixelRatio: 1 }), 1);
  assert.equal(deviceScalingFloor({ touch: true, devicePixelRatio: 1.5 }), 1);
});

test("Desktop bleibt unabhängig vom DPR bei CSS-Auflösung", () => {
  assert.equal(deviceScalingFloor({ touch: false, devicePixelRatio: 3 }), 1);
  assert.equal(deviceScalingFloor({ touch: false, devicePixelRatio: 1 }), 1);
});

test("feste Stufe 'high' entspricht dem Geräteboden", () => {
  assert.equal(fixedQualityScaling("high", { touch: true, devicePixelRatio: 3 }), 1.45 / 3);
  assert.equal(fixedQualityScaling("high", { touch: false, devicePixelRatio: 1 }), 1);
});

test("feste Stufe 'low' rendert grob, aber nie unterhalb der CSS-Auflösung auf Handys", () => {
  // Vorher: Math.max(1.35, DPR) — auf einem DPR-3-Handy Level 3, also 1/3 der
  // CSS-Auflösung. Neu: Handys fallen höchstens auf CSS-Auflösung zurück.
  assert.equal(fixedQualityScaling("low", { touch: true, devicePixelRatio: 3 }), 1);
  assert.equal(fixedQualityScaling("low", { touch: false, devicePixelRatio: 1 }), 1.35);
});
