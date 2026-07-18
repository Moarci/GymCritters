import test from "node:test";
import assert from "node:assert/strict";
import { impactStrength, squashAt, impactSound, SQUASH_DURATION } from "../src/impact.js";

test("impactStrength ordnet die Gewichtsklassen absteigend", () => {
  assert.ok(impactStrength("heavy") > impactStrength("bulky"));
  assert.ok(impactStrength("bulky") > impactStrength("light"));
});

test("impactStrength bleibt für jede Klasse im Bereich (0, 1]", () => {
  for (const weight of ["heavy", "bulky", "light"]) {
    const strength = impactStrength(weight);
    assert.ok(strength > 0 && strength <= 1, `${weight} lag bei ${strength}`);
  }
});

test("impactStrength fängt eine unbekannte Gewichtsklasse ab", () => {
  const strength = impactStrength("federleicht");
  assert.ok(strength > 0 && strength <= 1);
});

test("squashAt staucht zu Beginn: flacher und breiter", () => {
  const { scaleY, scaleXZ } = squashAt(0, 1);
  assert.ok(scaleY < 1, `scaleY war ${scaleY}`);
  assert.ok(scaleXZ > 1, `scaleXZ war ${scaleXZ}`);
});

test("squashAt ist am Ende praktisch wieder neutral", () => {
  const { scaleY, scaleXZ } = squashAt(1, 1);
  assert.ok(Math.abs(scaleY - 1) < 0.01, `scaleY war ${scaleY}`);
  assert.ok(Math.abs(scaleXZ - 1) < 0.01, `scaleXZ war ${scaleXZ}`);
});

test("squashAt federt nach — schwingt mindestens einmal über die Ruhelage", () => {
  let ueberschwungen = false;
  for (let t = 0.05; t < 1; t += 0.01) {
    if (squashAt(t, 1).scaleY > 1.001) { ueberschwungen = true; break; }
  }
  assert.ok(ueberschwungen, "die Zone federt nicht nach, sie zuckt nur");
});

test("squashAt skaliert mit der Wucht", () => {
  const schwach = squashAt(0, 0.4).scaleY;
  const stark = squashAt(0, 1).scaleY;
  assert.ok(stark < schwach, `stark ${stark} sollte tiefer stauchen als schwach ${schwach}`);
});

test("squashAt bei Wucht 0 verändert nichts", () => {
  const { scaleY, scaleXZ } = squashAt(0, 0);
  assert.equal(scaleY, 1);
  assert.equal(scaleXZ, 1);
});

test("impactSound gibt schweren Materialien einen tieferen Körper als leichten", () => {
  assert.ok(impactSound("dumbbell").body < impactSound("bottle").body);
  assert.ok(impactSound("kettlebell").body < impactSound("bottle").body);
});

test("impactSound gibt harten Materialien einen Anschlag, weichen nicht", () => {
  assert.ok(impactSound("dumbbell").click, "Hantel braucht einen metallischen Anschlag");
  assert.equal(impactSound("towel").click, null, "Handtuch darf nicht klicken");
});

test("impactSound hält das Handtuch am leisesten", () => {
  const handtuch = impactSound("towel").volume;
  for (const type of ["dumbbell", "kettlebell", "bottle", "mat", "medball"]) {
    assert.ok(handtuch <= impactSound(type).volume, `${type} war leiser als das Handtuch`);
  }
});

test("impactSound liefert für unbekannte Typen einen brauchbaren Rückfall", () => {
  const klang = impactSound("trampolin");
  assert.ok(klang.body > 0);
  assert.ok(klang.duration > 0);
  assert.ok(klang.volume > 0);
});

test("impactSound skaliert alle Frequenzen mit dem Tonhöhenfaktor", () => {
  const normal = impactSound("dumbbell");
  const hoch = impactSound("dumbbell", 1.5);
  assert.ok(Math.abs(hoch.body - normal.body * 1.5) < 1e-9);
  assert.ok(Math.abs(hoch.click - normal.click * 1.5) < 1e-9);
});

test("impactSound lässt Lautstärke und Dauer vom Tonhöhenfaktor unberührt", () => {
  const normal = impactSound("mat");
  const hoch = impactSound("mat", 1.5);
  assert.equal(hoch.volume, normal.volume);
  assert.equal(hoch.duration, normal.duration);
});

test("SQUASH_DURATION ist eine brauchbare Animationsdauer in Sekunden", () => {
  assert.ok(SQUASH_DURATION > 0.1 && SQUASH_DURATION < 1);
});
