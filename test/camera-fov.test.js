import test from "node:test";
import assert from "node:assert/strict";
import { fovModeForViewport } from "../src/camera-fov.js";

test("Querformat fixiert das vertikale FOV (Babylon-Standardverhalten)", () => {
  assert.equal(fovModeForViewport(1920, 1080), "vertical");
});

test("Hochformat fixiert das horizontale FOV, damit die Halle seitlich sichtbar bleibt", () => {
  assert.equal(fovModeForViewport(390, 844), "horizontal");
});

test("quadratischer Viewport bleibt beim Standard (vertikal)", () => {
  assert.equal(fovModeForViewport(800, 800), "vertical");
});
