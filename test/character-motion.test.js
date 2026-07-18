import test from "node:test";
import assert from "node:assert/strict";
import {
  dominantWeight, carryPose, gaitParams, curveLean, idleMotion, squirrelTailSpec, LEAN_CAP,
} from "../src/character-motion.js";

test("dominantWeight wählt die schwerste Klasse aus der Liste", () => {
  assert.equal(dominantWeight(["light", "heavy", "bulky"]), "heavy");
  assert.equal(dominantWeight(["light", "bulky"]), "bulky");
  assert.equal(dominantWeight(["light", "light"]), "light");
});

test("dominantWeight liefert null für leere Pfoten", () => {
  assert.equal(dominantWeight([]), null);
});

test("carryPose unterscheidet die drei Gewichtsklassen sichtbar", () => {
  const schwer = carryPose("heavy");
  const sperrig = carryPose("bulky");
  const leicht = carryPose("light");
  assert.ok(schwer.armX > leicht.armX, "schwere Last hängt tiefer als leichte (weniger angewinkelt)");
  assert.ok(sperrig.armZ > schwer.armZ, "sperrige Last spreizt die Arme weiter");
  assert.ok(sperrig.armZ > leicht.armZ);
});

test("carryPose lehnt nur bei schwerer Last zurück", () => {
  assert.ok(carryPose("heavy").torsoLean < 0, "Rücklage ist eine negative x-Rotation");
  assert.equal(carryPose("light").torsoLean, 0);
  assert.equal(carryPose("bulky").torsoLean, 0);
});

test("carryPose fällt bei unbekannter Klasse auf die leichte Haltung zurück", () => {
  assert.deepEqual(carryPose("federleicht"), carryPose("light"));
});

test("gaitParams liefert ohne Last exakt die bisherige Optik", () => {
  const gehen = gaitParams(null, false, true);
  assert.equal(gehen.frequency, 9);
  assert.equal(gehen.intensity, 0.78);
  assert.equal(gehen.armSwing, 1);
  const sprint = gaitParams(null, true, true);
  assert.equal(sprint.frequency, 13);
  assert.equal(sprint.intensity, 1.1);
  const stillstand = gaitParams(null, false, false);
  assert.equal(stillstand.frequency, 2.2);
  assert.equal(stillstand.intensity, 0.12);
});

test("gaitParams macht schwere Last langsamer und stampfender", () => {
  const schwer = gaitParams("heavy", false, true);
  const leicht = gaitParams("light", false, true);
  assert.ok(schwer.frequency < leicht.frequency, "schwer schreitet langsamer");
  assert.ok(schwer.bob > leicht.bob, "schwer stampft stärker");
  assert.equal(schwer.armSwing, 0, "die Arme sind belegt");
});

test("gaitParams ordnet die Klassen konsistent: heavy < bulky < light in der Frequenz", () => {
  const f = (w) => gaitParams(w, false, true).frequency;
  assert.ok(f("heavy") < f("bulky"));
  assert.ok(f("bulky") < f("light"));
  assert.ok(f("light") < f(null));
});

test("curveLean ist bei Geradeauslauf null", () => {
  assert.equal(curveLean(0), 0);
});

test("curveLean folgt der Drehrichtung im Vorzeichen", () => {
  assert.ok(curveLean(2) > 0);
  assert.ok(curveLean(-2) < 0);
  assert.equal(curveLean(2), -curveLean(-2), "symmetrisch");
});

test("curveLean kippt nie um — harter Deckel in beiden Richtungen", () => {
  for (const omega of [5, 50, 500]) {
    assert.ok(curveLean(omega) <= LEAN_CAP + 1e-12);
    assert.ok(curveLean(-omega) >= -LEAN_CAP - 1e-12);
  }
  assert.ok(Math.abs(curveLean(500)) > LEAN_CAP * 0.99, "der Deckel wird auch erreicht");
});

test("idleMotion atmet beschränkt und periodisch", () => {
  let min = Infinity, max = -Infinity;
  for (let t = 0; t < 30; t += 0.05) {
    const { breath } = idleMotion(t);
    min = Math.min(min, breath); max = Math.max(max, breath);
  }
  assert.ok(max <= 0.02 + 1e-9, `Atmen zu stark: ${max}`);
  assert.ok(min >= -0.02 - 1e-9, `Atmen zu stark: ${min}`);
  assert.ok(max > 0.005, "Atmen muss sichtbar sein");
});

test("idleMotion zuckt selten, aber deutlich — kein Dauerzittern", () => {
  const proben = [];
  for (let t = 0; t < 30; t += 0.05) proben.push(idleMotion(t).tailFlick);
  const ruhig = proben.filter((f) => Math.abs(f) < 0.02).length / proben.length;
  const spitze = Math.max(...proben.map(Math.abs));
  assert.ok(ruhig > 0.6, `der Schwanz muss meist ruhig sein, war es nur zu ${Math.round(ruhig * 100)} %`);
  assert.ok(spitze > 0.1, "aber gelegentlich sichtbar zucken");
});

test("idleMotion ist deterministisch — gleiche Zeit, gleiches Ergebnis", () => {
  assert.deepEqual(idleMotion(7.3), idleMotion(7.3));
});

test("squirrelTailSpec liefert acht streng verjüngte Segmente", () => {
  const spec = squirrelTailSpec();
  assert.equal(spec.length, 8);
  for (let i = 1; i < spec.length; i++) {
    assert.ok(spec[i].diameter < spec[i - 1].diameter, `Segment ${i} verjüngt sich nicht`);
  }
  const taper = 1 - spec.at(-1).diameter / spec[0].diameter;
  assert.ok(taper >= 0.4, `Verjüngung nur ${Math.round(taper * 100)} %, gefordert sind 40`);
});

test("squirrelTailSpec bleibt unter der Kopfoberkante und hinter der Figur kompakt", () => {
  // tailRoot sitzt auf 0,72; die Kopfoberkante liegt bei ~1,93.
  for (const segment of squirrelTailSpec()) {
    const [x, y, z] = segment.position;
    assert.ok(y <= 1.21, `Segment zu hoch: ${y}`);
    assert.ok(z <= 0.78, `Segment zu tief: ${z}`);
    assert.ok(Math.abs(x) <= 0.1, `Segment pendelt zu weit: ${x}`);
    assert.ok(y >= 0 && z >= 0, "der Bogen läuft nach oben-hinten, nie unter die Wurzel");
  }
});

test("squirrelTailSpec rollt sich ein — die Zuwächse werden zum Ende kleiner", () => {
  const spec = squirrelTailSpec();
  const ersterSchritt = spec[1].position[1] - spec[0].position[1];
  const letzterSchritt = spec.at(-1).position[1] - spec.at(-2).position[1];
  assert.ok(letzterSchritt < ersterSchritt * 0.6, "ohne Einrollen wächst der Schwanz linear aus der Figur");
});

test("squirrelTailSpec ist deterministisch", () => {
  assert.deepEqual(squirrelTailSpec(), squirrelTailSpec());
});
