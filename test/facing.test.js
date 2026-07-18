import test from "node:test";
import assert from "node:assert/strict";
import { yawTowards, forwardFromYaw, cameraAlphaBehind, cameraYaw, normalizeAngle } from "../src/utils.js";

// Die Referenzwerte stammen aus einer Babylon-NullEngine-Sonde: ein TransformNode mit
// gesetztem rotation.y, dessen lokale Vorderseite (0,0,-1) in den Weltraum transformiert
// wird. Babylon rechnet linkshändig, deshalb ist die Front (-sin yaw, 0, -cos yaw) und
// nicht (sin yaw, 0, -cos yaw). Genau diese Verwechslung hat die Figur gespiegelt.
const BABYLON_FACING = [
  { yaw: 0, x: 0, z: -1 },
  { yaw: Math.PI / 2, x: -1, z: 0 },
  { yaw: Math.PI, x: 0, z: 1 },
  { yaw: -Math.PI / 2, x: 1, z: 0 },
];

const close = (a, b) => Math.abs(a - b) < 1e-9;

test("forwardFromYaw entspricht Babylons linkshändiger Rotation", () => {
  for (const { yaw, x, z } of BABYLON_FACING) {
    const forward = forwardFromYaw(yaw);
    assert.ok(close(forward.x, x), `yaw ${yaw}: x war ${forward.x}, erwartet ${x}`);
    assert.ok(close(forward.z, z), `yaw ${yaw}: z war ${forward.z}, erwartet ${z}`);
  }
});

test("yawTowards richtet die Figur in die Bewegungsrichtung, nicht dagegen", () => {
  for (const { yaw, x, z } of BABYLON_FACING) {
    // Über sin/cos vergleichen, nicht über den Rohwert: atan2(-0, -1) ergibt in
    // JavaScript -PI statt +PI, obwohl es derselbe Winkel ist.
    const actual = yawTowards(x, z);
    assert.ok(close(Math.sin(actual), Math.sin(yaw)) && close(Math.cos(actual), Math.cos(yaw)),
      `Richtung (${x},${z}) erwartet yaw ${yaw}, war ${actual}`);
  }
});

test("Seitwärtslaufen dreht die Figur nicht um 180 Grad", () => {
  // Der Regressionsfall: nach rechts laufen (Weltrichtung -X bei Standardkamera) muss
  // eine Front ergeben, die mit der Laufrichtung übereinstimmt. Die alte Formel
  // atan2(x, -z) lieferte hier das exakte Gegenteil.
  for (const direction of [{ x: -1, z: 0 }, { x: 1, z: 0 }, { x: 0.6, z: -0.8 }, { x: -0.6, z: -0.8 }]) {
    const forward = forwardFromYaw(yawTowards(direction.x, direction.z));
    const dot = forward.x * direction.x + forward.z * direction.z;
    assert.ok(dot > 0.999, `Richtung (${direction.x},${direction.z}) zeigte weg, dot=${dot}`);
  }
});

test("cameraAlphaBehind setzt die Kamera in die Blickrichtung der Figur", () => {
  for (const { yaw } of BABYLON_FACING) {
    const alpha = cameraAlphaBehind(yaw);
    // Kamera-Blickrichtung laut ArcRotateCamera-Geometrie, in main.js identisch benutzt.
    const cameraForward = { x: -Math.cos(alpha), z: -Math.sin(alpha) };
    const facing = forwardFromYaw(yaw);
    assert.ok(close(cameraForward.x, facing.x) && close(cameraForward.z, facing.z),
      `yaw ${yaw}: Kamera schaute (${cameraForward.x},${cameraForward.z}) statt (${facing.x},${facing.z})`);
  }
});

test("der Navigator-Pfeil zeigt auf die Seite, auf der das Ziel wirklich liegt", () => {
  // Der Pfeil ist ein nach oben zeigendes Zeichen, CSS rotate() dreht im Uhrzeigersinn.
  // Ein Ziel rechts im Bild muss also einen positiven Winkel ergeben.
  const alpha = Math.PI / 2; // Standardkamera, blickt entlang -Z
  const right = { x: -1, z: 0 }; // Bildschirm-rechts bei dieser Kamera, siehe cameraRight in main.js
  const angle = normalizeAngle(yawTowards(right.x, right.z) - cameraYaw(alpha));
  assert.ok(angle > 0, `Ziel rechts erwartet positiven Winkel, war ${angle}`);

  const ahead = { x: 0, z: -1 };
  assert.ok(Math.abs(normalizeAngle(yawTowards(ahead.x, ahead.z) - cameraYaw(alpha))) < 1e-9, "Ziel geradeaus erwartet 0");
});

test("cameraYaw kehrt cameraAlphaBehind um", () => {
  for (const yaw of [0, 0.7, -1.9, Math.PI]) {
    assert.ok(close(normalizeAngle(cameraYaw(cameraAlphaBehind(yaw)) - yaw), 0), `yaw ${yaw} kam nicht zurück`);
  }
});
