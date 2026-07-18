import test from "node:test";
import assert from "node:assert/strict";
import {
  dominantWeight, carryPose, gaitParams, curveLean, idleMotion, squirrelTailSpec, raccoonTailSpec,
  surfacePoint, facingRotation, LEAN_CAP,
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

test("raccoonTailSpec liefert acht verjüngte Ringel-Segmente", () => {
  const spec = raccoonTailSpec();
  assert.equal(spec.length, 8);
  for (let i = 1; i < spec.length; i++) {
    assert.ok(spec[i].radius < spec[i - 1].radius, `Segment ${i} verjüngt sich nicht`);
  }
  const taper = 1 - spec.at(-1).radius / spec[0].radius;
  assert.ok(taper >= 0.3, `Verjüngung nur ${Math.round(taper * 100)} %`);
});

test("raccoonTailSpec rollt nach oben statt waagerecht herauszuragen", () => {
  const spec = raccoonTailSpec();
  for (let i = 1; i < spec.length; i++) {
    assert.ok(spec[i].position[1] > spec[i - 1].position[1], `Segment ${i} steigt nicht`);
  }
  for (const segment of spec) {
    assert.ok(segment.position[2] <= 1.1, `zu tief hinter der Figur: ${segment.position[2]}`);
    assert.ok(segment.position[1] <= 0.75, `zu hoch über der Wurzel: ${segment.position[1]}`);
  }
});

test("raccoonTailSpec dreht die Segmente tangential — Bogen statt Knick", () => {
  const spec = raccoonTailSpec();
  assert.ok(Math.abs(spec[0].rotationX - Math.PI / 2) < 0.1, "der Ansatz liegt waagerecht");
  for (let i = 1; i < spec.length; i++) {
    assert.ok(spec[i].rotationX < spec[i - 1].rotationX, `Segment ${i} dreht nicht weiter auf`);
  }
  assert.ok(spec.at(-1).rotationX < 0.5, "die Spitze zeigt fast senkrecht nach oben");
});

test("raccoonTailSpec ist deterministisch", () => {
  assert.deepEqual(raccoonTailSpec(), raccoonTailSpec());
});

test("carryPose beugt den Ellbogen — am stärksten unter schwerer Last", () => {
  const schwer = carryPose("heavy");
  const leicht = carryPose("light");
  assert.ok(schwer.elbowX < 0, "der Ellbogen beugt nach innen (negativ)");
  assert.ok(Math.abs(schwer.elbowX) > Math.abs(leicht.elbowX), "schwere Last verlangt die stärkste Beugung");
  assert.ok(Math.abs(carryPose("bulky").elbowX) > 0, "auch sperrige Last beugt");
});

test("surfacePoint trifft entlang der Achsen exakt den Radius", () => {
  const radii = [0.4, 0.35, 0.3];
  assert.deepEqual(surfacePoint(radii, [1, 0, 0]).map((v) => +v.toFixed(6)), [0.4, 0, 0]);
  assert.deepEqual(surfacePoint(radii, [0, 1, 0]).map((v) => +v.toFixed(6)), [0, 0.35, 0]);
  assert.deepEqual(surfacePoint(radii, [0, 0, -1]).map((v) => +v.toFixed(6)), [0, 0, -0.3]);
});

test("surfacePoint schiebt mit out entlang der Richtung weiter hinaus", () => {
  const innen = surfacePoint([0.4, 0.4, 0.4], [0, 0, -1]);
  const aussen = surfacePoint([0.4, 0.4, 0.4], [0, 0, -1], 0.05);
  assert.ok(Math.abs(aussen[2] - (innen[2] - 0.05)) < 1e-9, "out wirkt entlang der Normale nach außen");
});

test("surfacePoint normalisiert die Richtung selbst", () => {
  const a = surfacePoint([0.4, 0.35, 0.3], [2, 0, 0]);
  const b = surfacePoint([0.4, 0.35, 0.3], [1, 0, 0]);
  assert.deepEqual(a, b);
});

test("surfacePoint bleibt auf der Ellipsoid-Oberfläche, auch diagonal", () => {
  const [x, y, z] = surfacePoint([0.41, 0.377, 0.394], [0.4, 0.15, -1]);
  const wert = (x / 0.41) ** 2 + (y / 0.377) ** 2 + (z / 0.394) ** 2;
  assert.ok(Math.abs(wert - 1) < 1e-9, `liegt nicht auf der Oberfläche: ${wert}`);
});

test("facingRotation richtet die lokale z-Achse auf die Richtung aus", () => {
  assert.deepEqual(facingRotation([0, 0, 1]).map((v) => +v.toFixed(6)), [0, 0]);
  const [pitchX] = facingRotation([0, 1, 0]);
  assert.ok(Math.abs(pitchX + Math.PI / 2) < 1e-9, "senkrecht nach oben heißt Pitch -90 Grad");
  const [, yawSeite] = facingRotation([1, 0, 0]);
  assert.ok(Math.abs(yawSeite - Math.PI / 2) < 1e-9, "seitlich heißt Yaw 90 Grad");
});

test("facingRotation ist von der Länge der Richtung unabhängig", () => {
  assert.deepEqual(facingRotation([0.3, 0.2, -0.9]), facingRotation([0.6, 0.4, -1.8]));
});
