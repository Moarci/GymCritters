import test from "node:test";
import assert from "node:assert/strict";
import { joystickVector, JOYSTICK_DEADZONE } from "../src/input/joystick.js";

test("joystickVector liefert in der Mitte keinen Ausschlag", () => {
  const result = joystickVector(0, 0, 40);
  assert.equal(result.x, 0);
  assert.equal(result.z, 0);
  assert.equal(result.knobX, 0);
  assert.equal(result.knobY, 0);
});

test("joystickVector unterdrückt Bewegung innerhalb der Deadzone", () => {
  const inside = JOYSTICK_DEADZONE * 40 * 0.5;
  const result = joystickVector(inside, 0, 40);
  assert.equal(result.x, 0);
  assert.equal(result.z, 0);
  // Der Knob folgt dem Daumen trotzdem, sonst wirkt die Steuerung tot.
  assert.ok(result.knobX > 0);
});

test("joystickVector erreicht am Rand die volle Magnitude", () => {
  const result = joystickVector(0, -40, 40);
  assert.ok(Math.abs(result.z - 1) < 1e-9, `erwartet z=1, war ${result.z}`);
  assert.equal(result.x, 0);
});

test("joystickVector klemmt jenseits des Radius auf den Radius", () => {
  const result = joystickVector(400, 0, 40);
  assert.ok(Math.abs(result.x - 1) < 1e-9);
  assert.ok(Math.abs(result.knobX - 40) < 1e-9, `Knob darf den Ring nicht verlassen, war ${result.knobX}`);
});

test("joystickVector dreht die Bildschirmachse in die Weltachse", () => {
  // Bildschirm y nach unten heißt in der Welt rückwärts.
  const result = joystickVector(0, 40, 40);
  assert.ok(result.z < 0, `erwartet rückwärts, war ${result.z}`);
});

test("joystickVector überschreitet diagonal nicht die Magnitude 1", () => {
  const result = joystickVector(40, -40, 40);
  const magnitude = Math.hypot(result.x, result.z);
  assert.ok(magnitude <= 1 + 1e-9, `Diagonale war ${magnitude}`);
});

test("joystickVector steigt hinter der Deadzone bei null an", () => {
  const justOutside = JOYSTICK_DEADZONE * 40 + 0.001;
  const result = joystickVector(justOutside, 0, 40);
  assert.ok(result.x < 0.01, `direkt hinter der Schwelle darf kaum Tempo anliegen, war ${result.x}`);
});

test("joystickVector verträgt einen Radius von null", () => {
  const result = joystickVector(10, 10, 0);
  assert.equal(result.x, 0);
  assert.equal(result.z, 0);
});
