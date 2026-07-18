# Industrial-Loft-Gym-Umgebung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Spielumgebung von einem flachen, deckenlosen Raum ("Fläche im schwarzen Universum") zu einem geschlossenen Industrie-Loft-Gym mit Decke, Dachbindern, Sichtbeton-Wänden, Industriefenstern, Pegboard-Equipment, Rohren/Kabeltrassen und Wand-Mural umbauen.

**Architecture:** Die komplette Umgebungserstellung wird aus `src/main.js` in `src/environment/{textures,structure,decor,index}.js` ausgelagert. `main.js` ruft nur noch `buildEnvironment(scene, shadowGenerator, options)` auf und erhält `{ zones, obstacles }` zurück. Alle neuen Oberflächenstrukturen (Beton, Rost, Pegboard-Lochung, Dämmerungs-Glas, Mural) entstehen als `DynamicTexture`/Canvas-Code – keine Bilddateien.

**Tech Stack:** Babylon.js (per CDN, global `window.BABYLON`), Vanilla-ES-Module, kein Build-Schritt, kein Test-Framework im Projekt.

## Global Constraints

- Zero-Asset-Prinzip: keine neuen Bilddateien, keine neuen npm-Abhängigkeiten, kein Build-Schritt. Alle Texturen per `DynamicTexture`.
- Keine Gameplay-Änderungen: `CONFIG.roomHalfX/Z`, Item-/Zonen-Positionen (`config.js`), Charakterwerte, Spielablauf bleiben unverändert.
- `save.settings.quality === "low"` muss weiterhin respektiert werden: feinere Deko (Dachbinder-Streben, Dachkanal, Wandrohre, zusätzliche Schatten-Caster) wird dort übersprungen.
- Dateigröße: neue Module bleiben im ~150–300-Zeilen-Bereich (Projekt-Konvention: viele kleine Dateien statt einer großen).
- Kein automatisiertes Test-Setup vorhanden (kein `package.json`-Testscript, keine Testdateien) → Verifikation erfolgt manuell per Dev-Server + Browser/Playwright-Screenshot statt Unit-Tests.

---

## Datei-Übersicht

- Neu: `src/babylon.js` – zentraler `window.BABYLON`-Zugriff.
- Neu: `src/materials.js` – `createMaterial`, `createTexturedMaterial`.
- Neu: `src/environment/textures.js` – prozedurale Canvas-Texturen (Beton, Rost, Dämmerung, Mural).
- Neu: `src/environment/structure.js` – Boden, Wände (Sichtbeton), Fenster, Decke, Dachbinder, Pendelleuchten, Rohre/Kanäle, Mural-Anbringung.
- Neu: `src/environment/decor.js` – Zonen (Hantelregal, Wäschekorb, Flaschenbox, Mattenregal), Basis-/Level-Deko, Pegboard mit Equipment.
- Neu: `src/environment/index.js` – Orchestrator `buildEnvironment()`.
- Modifiziert: `src/main.js` – Imports, `material()`-Wrapper, `createScene()`-Wiring, Kamera-Limits, Entfernen der ausgelagerten Funktionen.

---

### Task 1: Shared Babylon-Zugriff & Material-Helper extrahieren

**Files:**
- Create: `src/babylon.js`
- Create: `src/materials.js`
- Modify: `src/main.js:13-14`, `src/main.js:81-87`

**Interfaces:**
- Produces: `export const B` (aus `src/babylon.js`), `export function createMaterial(scene, name, color, roughness = 0.85, metallic = 0)`, `export function createTexturedMaterial(scene, name, texture, { roughness = 0.9, metallic = 0 } = {})` (aus `src/materials.js`).

- [ ] **Step 1: `src/babylon.js` anlegen**

```js
export const B = window["BABYLON"];
if (!B) throw new Error("Babylon.js ist nicht verfügbar.");
```

- [ ] **Step 2: `src/materials.js` anlegen**

```js
import { B } from "./babylon.js";

export function createMaterial(scene, name, color, roughness = 0.85, metallic = 0) {
  const mat = new B.PBRMaterial(name, scene);
  mat.albedoColor = B.Color3.FromHexString(color);
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}

export function createTexturedMaterial(scene, name, texture, { roughness = 0.9, metallic = 0 } = {}) {
  const mat = new B.PBRMaterial(name, scene);
  mat.albedoTexture = texture;
  mat.albedoColor = B.Color3.White();
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}
```

- [ ] **Step 3: `src/main.js` auf die neuen Module umstellen**

Ersetze `src/main.js:13-14`:

```js
const B = window["BABYLON"];
if (!B) throw new Error("Babylon.js ist nicht verfügbar.");
```

durch:

```js
import { B } from "./babylon.js";
import { createMaterial } from "./materials.js";
```

(Import-Zeile ans Ende des bestehenden `import`-Blocks von `src/main.js:1-11` anhängen.)

Ersetze `src/main.js:81-87`:

```js
function material(name, color, roughness = 0.85, metallic = 0) {
  const mat = new B.PBRMaterial(name, scene);
  mat.albedoColor = B.Color3.FromHexString(color);
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}
```

durch:

```js
function material(name, color, roughness = 0.85, metallic = 0) {
  return createMaterial(scene, name, color, roughness, metallic);
}
```

Alle ~40 bestehenden Aufrufe von `material("name", "#hex", ...)` in `main.js` bleiben unverändert – reiner Wrapper.

- [ ] **Step 4: Regressionscheck starten**

```bash
python start_game.py
```

Im Browser öffnen, kurz spielen: Charaktere, Items, Zonen, Deko sehen exakt wie vorher aus (keine visuelle Änderung erwartet), keine Fehler in der Browser-Konsole.

- [ ] **Step 5: Commit**

```bash
git add src/babylon.js src/materials.js src/main.js
git commit -m "refactor: extract shared Babylon accessor and material helper"
```

---

### Task 2: Raumhülle – Decke, Dachbinder, Sichtbeton-Wände, Fenster, Rohre, Mural

**Files:**
- Create: `src/environment/textures.js`
- Create: `src/environment/structure.js`
- Modify: `src/main.js` (Import ergänzen, `createGym()`/`createWallSign()` entfernen, `createScene()` und `createCamera()` anpassen)

**Interfaces:**
- Consumes: `createMaterial(scene, name, color, roughness, metallic)`, `createTexturedMaterial(scene, name, texture, opts)` aus Task 1.
- Produces: `export function buildStructure(scene, shadowGenerator, { quality = "high" } = {})` (kein Rückgabewert; Task 3/4 brauchen ihn nicht). Texturfunktionen aus `textures.js`: `createConcreteTexture(scene, name, { base, joints, size })`, `createRustMetalTexture(scene, name, { base, rust, size })`, `createDuskGradientTexture(scene, name, { size })`, `createMuralTexture(scene, name, { width, height, phrase, accent })`.

- [ ] **Step 1: `src/environment/textures.js` anlegen**

```js
import { B } from "../babylon.js";

function shadeHex(hex, amount) {
  const c = B.Color3.FromHexString(hex);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const r = Math.round(clamp(c.r + amount / 255) * 255);
  const g = Math.round(clamp(c.g + amount / 255) * 255);
  const b = Math.round(clamp(c.b + amount / 255) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function createConcreteTexture(scene, name, { base = "#9a9d97", joints = "#5b5f59", size = 512 } = {}) {
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = shadeHex(base, Math.random() * 30 - 15);
    const w = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * size, Math.random() * size, w, w);
  }
  ctx.strokeStyle = joints;
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += size / 4) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  for (let y = 0; y <= size; y += size / 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  texture.update();
  texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
  return texture;
}

export function createRustMetalTexture(scene, name, { base = "#3a3f47", rust = "#8a4a2f", size = 512 } = {}) {
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = rust;
    const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 26;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 1500; i++) {
    ctx.strokeStyle = shadeHex(base, Math.random() * 40 - 20);
    ctx.lineWidth = 1;
    const y = Math.random() * size;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y + (Math.random() * 4 - 2)); ctx.stroke();
  }
  texture.update();
  return texture;
}

export function createDuskGradientTexture(scene, name, { size = 256 } = {}) {
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#1b1f3a");
  gradient.addColorStop(0.55, "#2a2750");
  gradient.addColorStop(1, "#4a3a63");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#f4e8b8";
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size, y = Math.random() * size * 0.6, r = Math.random() * 1.4;
    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  texture.update();
  return texture;
}

export function createMuralTexture(scene, name, { width = 2048, height = 768, phrase = "CLOSING CREW", accent = "#a7f46a" } = {}) {
  const texture = new B.DynamicTexture(name, { width, height }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = "#232823";
  ctx.fillRect(0, 0, width, height);
  const splatterColors = [accent, "#ffad5c", "#63b4ef"];
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = splatterColors[i % splatterColors.length];
    ctx.globalAlpha = 0.16 + Math.random() * 0.18;
    const x = Math.random() * width, y = Math.random() * height, r = 30 + Math.random() * 110;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  texture.update();
  texture.drawText(phrase, null, height * 0.62, `bold ${Math.round(height * 0.28)}px Arial`, "#f7f6f1", "transparent", true);
  return texture;
}
```

- [ ] **Step 2: `src/environment/structure.js` anlegen**

```js
import { B } from "../babylon.js";
import { createMaterial, createTexturedMaterial } from "../materials.js";
import { createConcreteTexture, createRustMetalTexture, createDuskGradientTexture, createMuralTexture } from "./textures.js";

const ROOM = { halfWidth: 13.5, halfDepth: 9.5, wallHeight: 4.7, ceilingThickness: 0.15 };

export function buildStructure(scene, shadowGenerator, { quality = "high" } = {}) {
  const detailed = quality !== "low";

  const floorMat = createMaterial(scene, "rubberFloor", "#252a34", 0.95);
  const seamMat = createMaterial(scene, "darkWall", "#303541", 0.92);
  const wallMat = createTexturedMaterial(scene, "wall", createConcreteTexture(scene, "wallConcrete", { base: "#9a9d97", joints: "#5b5f59" }), { roughness: 0.92 });
  const backWallMat = createTexturedMaterial(scene, "backWall", createConcreteTexture(scene, "darkConcrete", { base: "#4a4d4f", joints: "#25272a" }), { roughness: 0.92 });
  const trimMat = createTexturedMaterial(scene, "rustTrim", createRustMetalTexture(scene, "rustTrimTex"), { roughness: 0.6, metallic: 0.35 });
  const frameMat = createMaterial(scene, "windowFrame", "#20242b", 0.4, 0.6);
  const duskTex = createDuskGradientTexture(scene, "duskGlass");
  const glassMat = createTexturedMaterial(scene, "duskGlassMat", duskTex, { roughness: 0.2, metallic: 0.1 });
  glassMat.emissiveTexture = duskTex;
  glassMat.emissiveColor = new B.Color3(0.5, 0.46, 0.6);
  const muralTex = createMuralTexture(scene, "backWallMural", { phrase: "CLOSING CREW", accent: "#a7f46a" });
  const muralMat = createTexturedMaterial(scene, "mural", muralTex, { roughness: 0.75 });
  muralMat.emissiveTexture = muralTex;
  muralMat.emissiveColor = new B.Color3(0.18, 0.18, 0.18);

  buildFloor(scene, floorMat, seamMat);
  buildBackWall(scene, backWallMat, muralMat);
  buildSideWall(scene, -ROOM.halfWidth, wallMat, frameMat, glassMat, shadowGenerator, detailed);
  buildSideWall(scene, ROOM.halfWidth, wallMat, frameMat, glassMat, shadowGenerator, detailed);
  buildEntranceLips(scene, wallMat);
  buildCeiling(scene, backWallMat, trimMat, shadowGenerator, detailed);
}

function buildFloor(scene, floorMat, seamMat) {
  const floor = B.MeshBuilder.CreateGround("floor", { width: 27, height: 19 }, scene);
  floor.material = floorMat;
  floor.receiveShadows = true;
  for (let x = -12; x <= 12; x += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamX${x}`, { width: 0.025, height: 0.006, depth: 18.3 }, scene);
    seam.position.set(x, 0.006, 0);
    seam.material = seamMat;
  }
  for (let z = -8; z <= 8; z += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamZ${z}`, { width: 26.3, height: 0.006, depth: 0.025 }, scene);
    seam.position.set(0, 0.006, z);
    seam.material = seamMat;
  }
}

function buildBackWall(scene, wallMat, muralMat) {
  const wall = B.MeshBuilder.CreateBox("backWall", { width: 27, height: ROOM.wallHeight, depth: 0.35 }, scene);
  wall.position.set(0, ROOM.wallHeight / 2, 9.35);
  wall.material = wallMat;
  wall.receiveShadows = true;
  const mural = B.MeshBuilder.CreatePlane("backWallMural", { width: 14, height: 3.6 }, scene);
  mural.position.set(0, 2.6, 9.16);
  mural.rotation.y = Math.PI;
  mural.material = muralMat;
}

function buildSideWall(scene, x, wallMat, frameMat, glassMat, shadowGenerator, detailed) {
  const side = Math.sign(x);
  const zFrom = -ROOM.halfDepth + 0.15;
  const zTo = ROOM.halfDepth - 0.15;
  const windowWidth = 2.6;
  const windowCount = 3;
  const windowBottom = 1.5;
  const windowTop = 3.7;
  const totalSpan = zTo - zFrom;
  const gapCount = windowCount + 1;
  const gapWidth = (totalSpan - windowWidth * windowCount) / gapCount;

  const bottomBand = B.MeshBuilder.CreateBox("wallBottomBand", { width: 0.35, height: windowBottom, depth: totalSpan }, scene);
  bottomBand.position.set(x, windowBottom / 2, (zFrom + zTo) / 2);
  bottomBand.material = wallMat;
  bottomBand.receiveShadows = true;

  const topBand = B.MeshBuilder.CreateBox("wallTopBand", { width: 0.35, height: ROOM.wallHeight - windowTop, depth: totalSpan }, scene);
  topBand.position.set(x, windowTop + (ROOM.wallHeight - windowTop) / 2, (zFrom + zTo) / 2);
  topBand.material = wallMat;
  topBand.receiveShadows = true;

  let z = zFrom;
  for (let i = 0; i < gapCount; i++) {
    const pillar = B.MeshBuilder.CreateBox("wallPillar", { width: 0.35, height: windowTop - windowBottom, depth: gapWidth }, scene);
    pillar.position.set(x, (windowBottom + windowTop) / 2, z + gapWidth / 2);
    pillar.material = wallMat;
    pillar.receiveShadows = true;
    z += gapWidth;
    if (i < windowCount) {
      buildWindow(scene, x, z + windowWidth / 2, windowBottom, windowTop, windowWidth, frameMat, glassMat);
      z += windowWidth;
    }
  }

  if (detailed) buildWallPipe(scene, x);
}

function buildWindow(scene, x, z, bottom, top, width, frameMat, glassMat) {
  const side = Math.sign(x);
  const height = top - bottom;
  const glass = B.MeshBuilder.CreatePlane("windowGlass", { width, height }, scene);
  glass.position.set(x - side * 0.19, (bottom + top) / 2, z);
  glass.rotation.y = Math.PI / 2;
  glass.material = glassMat;

  [bottom, top].forEach((y) => {
    const bar = B.MeshBuilder.CreateBox("windowFrameBar", { width: 0.06, height: 0.1, depth: width + 0.16 }, scene);
    bar.position.set(x - side * 0.19, y, z);
    bar.rotation.y = Math.PI / 2;
    bar.material = frameMat;
  });
  for (let i = 0; i <= 2; i++) {
    const mullion = B.MeshBuilder.CreateBox("windowMullion", { width: 0.05, height, depth: 0.05 }, scene);
    mullion.position.set(x - side * 0.19, (bottom + top) / 2, z - width / 2 + (width / 2) * i);
    mullion.material = frameMat;
  }
}

function buildEntranceLips(scene, wallMat) {
  const left = B.MeshBuilder.CreateBox("frontLipLeft", { width: 9, height: 1.1, depth: 0.35 }, scene);
  left.position.set(-9, 0.55, -9.35);
  left.material = wallMat;
  left.receiveShadows = true;
  const right = B.MeshBuilder.CreateBox("frontLipRight", { width: 9, height: 1.1, depth: 0.35 }, scene);
  right.position.set(9, 0.55, -9.35);
  right.material = wallMat;
  right.receiveShadows = true;
}

function buildCeiling(scene, ceilingMat, trimMat, shadowGenerator, detailed) {
  const ceiling = B.MeshBuilder.CreateBox("ceiling", { width: 27.6, height: ROOM.ceilingThickness, depth: 19.6 }, scene);
  ceiling.position.set(0, ROOM.wallHeight + 0.2 + ROOM.ceilingThickness / 2, 0);
  ceiling.material = ceilingMat;
  ceiling.receiveShadows = true;

  const trussY = ROOM.wallHeight + 0.15;
  const trussZs = [-6, -2, 2, 6];
  trussZs.forEach((z) => buildTruss(scene, z, trussY, trimMat, shadowGenerator, detailed));

  const lightXs = [-7, 0, 7];
  trussZs.forEach((z) => lightXs.forEach((x) => buildPendantLight(scene, x, z, trussY - 0.25, shadowGenerator, detailed)));

  if (detailed) buildRoofDuct(scene, trussY - 0.05, trimMat, shadowGenerator);
}

function buildTruss(scene, z, y, trimMat, shadowGenerator, detailed) {
  const bottomChord = B.MeshBuilder.CreateBox("trussBottom", { width: 27, height: 0.1, depth: 0.12 }, scene);
  bottomChord.position.set(0, y - 0.3, z);
  bottomChord.material = trimMat;
  const topChord = B.MeshBuilder.CreateBox("trussTop", { width: 27, height: 0.1, depth: 0.12 }, scene);
  topChord.position.set(0, y, z);
  topChord.material = trimMat;
  if (detailed) {
    for (let x = -12; x <= 12; x += 2) {
      const strut = B.MeshBuilder.CreateBox("trussStrut", { width: 0.08, height: 0.34, depth: 0.08 }, scene);
      strut.position.set(x, y - 0.15, z);
      strut.rotation.z = (Math.abs(x) / 2) % 2 === 0 ? 0.5 : -0.5;
      strut.material = trimMat;
    }
    shadowGenerator.addShadowCaster(bottomChord);
    shadowGenerator.addShadowCaster(topChord);
  }
}

function buildPendantLight(scene, x, z, y, shadowGenerator, detailed) {
  const cable = B.MeshBuilder.CreateCylinder("pendantCable", { diameter: 0.03, height: 0.7 }, scene);
  cable.position.set(x, y - 0.35, z);
  cable.material = createMaterial(scene, "pendantCableMat", "#15171a", 0.5, 0.4);

  const cage = B.MeshBuilder.CreateCylinder("pendantCage", { diameterTop: 0.32, diameterBottom: 0.42, height: 0.3, tessellation: detailed ? 14 : 8 }, scene);
  cage.position.set(x, y - 0.72, z);
  cage.material = createMaterial(scene, "pendantCageMat", "#20242b", 0.4, 0.55);

  const bulb = B.MeshBuilder.CreateSphere("pendantBulb", { diameter: 0.22, segments: 10 }, scene);
  bulb.position.set(x, y - 0.72, z);
  const bulbMat = createMaterial(scene, "pendantBulbMat", "#f4f2df", 0.3);
  bulbMat.emissiveColor = new B.Color3(0.7, 0.66, 0.5);
  bulb.material = bulbMat;

  if (detailed) shadowGenerator.addShadowCaster(cage);
}

function buildRoofDuct(scene, y, trimMat, shadowGenerator) {
  const back = B.MeshBuilder.CreateCylinder("roofDuctBack", { diameter: 0.45, height: 26.6, tessellation: 12 }, scene);
  back.rotation.z = Math.PI / 2;
  back.position.set(0, y, 8.9);
  back.material = trimMat;
  shadowGenerator.addShadowCaster(back);

  [-12.9, 12.9].forEach((x) => {
    const branch = B.MeshBuilder.CreateCylinder("roofDuctBranch", { diameter: 0.22, height: 18, tessellation: 10 }, scene);
    branch.rotation.x = Math.PI / 2;
    branch.position.set(x, y, 0);
    branch.material = trimMat;
    const elbow = B.MeshBuilder.CreateSphere("ductElbow", { diameter: 0.42, segments: 10 }, scene);
    elbow.position.set(x, y, 8.9);
    elbow.material = trimMat;
  });
}

function buildWallPipe(scene, x) {
  const side = Math.sign(x);
  const pipeMat = createMaterial(scene, "wallPipeMat", "#3a3f47", 0.45, 0.4);
  const pipe = B.MeshBuilder.CreateCylinder("wallPipe", { diameter: 0.14, height: 18, tessellation: 10 }, scene);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(x - side * 0.28, ROOM.wallHeight - 0.4, 0);
  pipe.material = pipeMat;
  for (let z = -8; z <= 8; z += 4) {
    const bracket = B.MeshBuilder.CreateBox("pipeBracket", { width: 0.1, height: 0.14, depth: 0.05 }, scene);
    bracket.position.set(x - side * 0.15, ROOM.wallHeight - 0.4, z);
    bracket.material = pipeMat;
  }
}
```

- [ ] **Step 3: `main.js` verdrahten**

Import ergänzen (an bestehenden Import-Block anhängen):

```js
import { buildStructure } from "./environment/structure.js";
```

In `createScene()` (`src/main.js:104-136`) die Zeile `createGym();` entfernen (der Rest der Zonen-/Deko-Aufrufe bleibt vorerst unverändert, das übernimmt Task 3/4) und direkt davor einfügen:

```js
  buildStructure(scene, shadowGenerator, { quality: save.settings.quality });
```

Die Funktionen `createGym()` (`src/main.js:138-185`) und `createWallSign()` (`src/main.js:187-199`) komplett aus `main.js` löschen (sind jetzt in `structure.js`).

**Wichtig – Kamera-Limits anpassen:** Mit einer echten Decke bei y ≈ 4.9 kann die Kamera bei den bisherigen Limits (`lowerBetaLimit = 0.65`, `upperRadiusLimit = 9.2`) rechnerisch bis y ≈ 8.1 aufsteigen (`targetY + radius * cos(beta)`), also oberhalb/durch die neue Decke – man würde dann nur noch die Deckenoberseite von außen sehen. In `createCamera()` (`src/main.js:412-419`) die Limits so anpassen, dass die maximale Kamerahöhe sicher unter der Decke bleibt:

Ersetze in `src/main.js:414`:

```js
  camera.lowerRadiusLimit = 4.7; camera.upperRadiusLimit = 9.2; camera.lowerBetaLimit = 0.65; camera.upperBetaLimit = 1.32;
```

durch:

```js
  camera.lowerRadiusLimit = 4.7; camera.upperRadiusLimit = 6.1; camera.lowerBetaLimit = 0.9; camera.upperBetaLimit = 1.32;
```

(Maximale Kamerahöhe damit ≈ 0.78 + 6.1 × cos(0.9) ≈ 4.57 – deutlich unter der Deckenunterseite bei 4.9.)

- [ ] **Step 4: Visuelle Verifikation**

```bash
python start_game.py
```

Im Browser: Kamera mit Mausrad maximal rauszoomen und mit gedrückter Maustaste nach oben schauen (steilster erlaubter Winkel) – es darf **kein schwarzer Void** mehr sichtbar sein, stattdessen die neue Decke mit Dachbindern und Pendelleuchten. Seitenwände zeigen Sichtbeton-Textur, Fenster mit Dämmerungs-Glas sind sichtbar, Rückwand zeigt das neue Mural. Kamera darf nicht durch/über die Decke "springen" können.

- [ ] **Step 5: Commit**

```bash
git add src/environment/textures.js src/environment/structure.js src/main.js
git commit -m "feat: rebuild gym shell with closed ceiling, concrete walls and windows"
```

---

### Task 3: Zonen/Deko-Modul extrahieren + Pegboard mit Equipment

**Files:**
- Create: `src/environment/decor.js`
- Modify: `src/main.js` (Import ergänzen, betroffene Funktionen entfernen, `createScene()` anpassen)

**Interfaces:**
- Consumes: `createMaterial` aus Task 1; `ROOM`-Maße implizit über feste Koordinaten (keine Abhängigkeit zu `structure.js`).
- Produces: `export function buildDecor(scene, shadowGenerator, { quality = "high" } = {})` → gibt `{ zones, obstacles }` zurück (gleiche Form wie die bisherigen main.js-Module-Level-Arrays `zones`/`obstacles`). `export function setActiveLevelDecor(levelId)`.

- [ ] **Step 1: `src/environment/decor.js` anlegen**

Verschiebe `addZone`, `createDumbbellRack`, `createLaundryZone`, `createBottleZone`, `createMatZone`, `createBaseDecor`, `createLevelDecor` fast unverändert aus `main.js:201-274` und `main.js:428-492` hierher (Original-Zeilennummern), ergänzt um Pegboard-Requisiten und einen Modul-Wrapper:

```js
import { B } from "../babylon.js";
import { createMaterial } from "../materials.js";

let scene;
let shadowGenerator;
let zones = [];
let obstacles = [];
let levelDecor = {};

function material(name, color, roughness = 0.85, metallic = 0) {
  return createMaterial(scene, name, color, roughness, metallic);
}

export function buildDecor(sceneArg, shadowGeneratorArg, { quality = "high" } = {}) {
  scene = sceneArg;
  shadowGenerator = shadowGeneratorArg;
  zones = [];
  obstacles = [];
  const detailed = quality !== "low";

  createZones();
  createBaseDecor();
  createLevelDecor();
  createPegboards(detailed);

  return { zones, obstacles };
}

function addZone(id, label, type, position, radius, color) {
  const marker = B.MeshBuilder.CreateCylinder(`zone-${id}`, { diameter: radius * 1.65, height: 0.035, tessellation: 40 }, scene);
  marker.position.copyFrom(position);
  marker.position.y = 0.035;
  const mat = material(`zoneMat-${id}`, color, 0.7);
  mat.alpha = 0.25;
  mat.emissiveColor = B.Color3.FromHexString(color).scale(0.18);
  marker.material = mat;
  marker.isPickable = false;
  const beacon = B.MeshBuilder.CreatePolyhedron(`beacon-${id}`, { type: 1, size: 0.38 }, scene);
  beacon.position.copyFrom(position);
  beacon.position.y = 2.45;
  const beaconMat = material(`beaconMat-${id}`, color, 0.5);
  beaconMat.emissiveColor = B.Color3.FromHexString(color).scale(0.55);
  beacon.material = beaconMat;
  beacon.setEnabled(false);
  zones.push({ id, label, type, position: position.clone(), radius, marker, beacon, deliveredCount: 0 });
}

function createZones() {
  createDumbbellRack(new B.Vector3(-9.8, 0, 6.7));
  createLaundryZone(new B.Vector3(9.8, 0, 6.6));
  createBottleZone(new B.Vector3(10.1, 0, -5.8));
  createMatZone(new B.Vector3(-10.1, 0, -5.8));
}

function createDumbbellRack(pos) {
  const metal = material("rackMetal", "#393f49", 0.43, 0.45);
  const accent = material("rackAccent", "#a7f46a", 0.75);
  for (const x of [-1.05, 1.05]) {
    const post = B.MeshBuilder.CreateBox("rackPost", { width: 0.16, height: 2.05, depth: 0.32 }, scene);
    post.position.set(pos.x + x, 1.02, pos.z); post.material = metal; shadowGenerator.addShadowCaster(post);
  }
  for (const y of [0.45, 1.05, 1.65]) {
    const beam = B.MeshBuilder.CreateBox("rackBeam", { width: 2.3, height: 0.13, depth: 0.42 }, scene);
    beam.position.set(pos.x, y, pos.z); beam.material = metal; shadowGenerator.addShadowCaster(beam);
  }
  const sign = B.MeshBuilder.CreateBox("rackSign", { width: 1.2, height: 0.18, depth: 0.48 }, scene);
  sign.position.set(pos.x, 2.1, pos.z); sign.material = accent;
  addZone("rack", "Hantelregal", "dumbbell", pos, 2.0, "#a7f46a");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 1.4, halfZ: 0.55 });
}

function createLaundryZone(pos) {
  const basket = B.MeshBuilder.CreateCylinder("laundryBasket", { diameterTop: 1.35, diameterBottom: 1.05, height: 1.35, tessellation: 20 }, scene);
  basket.position.set(pos.x, 0.68, pos.z); basket.material = material("basket", "#f0bd72", 0.9); shadowGenerator.addShadowCaster(basket);
  const hole = B.MeshBuilder.CreateCylinder("laundryHole", { diameter: 1.05, height: 0.04, tessellation: 24 }, scene);
  hole.position.set(pos.x, 1.37, pos.z); hole.material = material("basketHole", "#302c29", 1);
  addZone("laundry", "Wäschekorb", "towel", pos, 1.8, "#ffbd73");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.7, halfZ: 0.7 });
}

function createBottleZone(pos) {
  const box = B.MeshBuilder.CreateBox("bottleCrate", { width: 1.7, height: 1.15, depth: 1.25 }, scene);
  box.position.set(pos.x, 0.58, pos.z); box.material = material("lostBox", "#5da9df", 0.88); shadowGenerator.addShadowCaster(box);
  const top = B.MeshBuilder.CreateBox("crateTop", { width: 1.42, height: 0.05, depth: 0.92 }, scene);
  top.position.set(pos.x, 1.17, pos.z); top.material = material("crateDark", "#24364b", 0.9);
  addZone("bottles", "Flaschenbox", "bottle", pos, 1.85, "#63b4ef");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.9, halfZ: 0.7 });
}

function createMatZone(pos) {
  const rackMat = material("matRack", "#d97f6c", 0.88);
  const metal = material("matMetal", "#404650", 0.45, 0.4);
  const base = B.MeshBuilder.CreateBox("matRackBase", { width: 2.2, height: 0.15, depth: 1.25 }, scene);
  base.position.set(pos.x, 0.08, pos.z); base.material = metal;
  for (const x of [-0.8, 0, 0.8]) {
    const guide = B.MeshBuilder.CreateBox("matGuide", { width: 0.08, height: 1.55, depth: 0.8 }, scene);
    guide.position.set(pos.x + x, 0.78, pos.z); guide.material = rackMat;
  }
  addZone("mats", "Mattenregal", "mat", pos, 2.0, "#ed8c78");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 1.25, halfZ: 0.7 });
}

function createBaseDecor() {
  const metal = material("machineMetal", "#474e59", 0.38, 0.5);
  const pad = material("machinePad", "#16191f", 0.86);
  const lime = material("machineLime", "#a7f46a", 0.8);
  for (const [x, z, rot] of [[-4, 6.7, 0], [4.2, 6.7, 0], [-7, -1.5, Math.PI / 2]]) {
    const root = new B.TransformNode("bench", scene); root.position.set(x, 0, z); root.rotation.y = rot;
    const seat = B.MeshBuilder.CreateBox("benchSeat", { width: 2.3, height: 0.24, depth: 0.72 }, scene);
    seat.parent = root; seat.position.y = 0.62; seat.material = pad;
    for (const sx of [-0.78, 0.78]) {
      const leg = B.MeshBuilder.CreateBox("benchLeg", { width: 0.15, height: 0.62, depth: 0.55 }, scene);
      leg.parent = root; leg.position.set(sx, 0.31, 0); leg.material = metal;
    }
    root.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
    const swap = Math.abs(Math.sin(rot)) > 0.5;
    obstacles.push({ x, z, halfX: swap ? 0.55 : 1.3, halfZ: swap ? 1.3 : 0.55 });
  }

  const rack = new B.TransformNode("squatRack", scene); rack.position.set(0, 0, 7.3);
  for (const x of [-1.25, 1.25]) {
    const post = B.MeshBuilder.CreateBox("squatPost", { width: 0.18, height: 2.7, depth: 0.22 }, scene);
    post.parent = rack; post.position.set(x, 1.35, 0); post.material = metal;
  }
  const top = B.MeshBuilder.CreateBox("squatTop", { width: 2.7, height: 0.18, depth: 0.22 }, scene);
  top.parent = rack; top.position.y = 2.62; top.material = lime;
  rack.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
  obstacles.push({ x: 0, z: 7.3, halfX: 1.55, halfZ: 0.45 });

  for (const [x, z] of [[-11.8, 8], [11.8, 8]]) {
    const pot = B.MeshBuilder.CreateCylinder("pot", { diameterTop: 0.65, diameterBottom: 0.5, height: 0.72, tessellation: 18 }, scene);
    pot.position.set(x, 0.36, z); pot.material = material(`potMat${x}`, "#bc7658", 0.95);
    const plantMat = material(`plantMat${x}`, "#4c8a5c", 0.95);
    for (let i = 0; i < 5; i++) {
      const leaf = B.MeshBuilder.CreateSphere("leaf", { diameter: 0.72, segments: 10 }, scene);
      leaf.position.set(x + Math.sin(i * 2.1) * 0.3, 1 + (i % 2) * 0.27, z + Math.cos(i * 2.1) * 0.28);
      leaf.scaling.set(0.55, 1, 0.35); leaf.rotation.z = Math.sin(i) * 0.5; leaf.material = plantMat;
      shadowGenerator.addShadowCaster(leaf);
    }
    obstacles.push({ x, z, halfX: 0.5, halfZ: 0.5 });
  }
}

function createLevelDecor() {
  levelDecor = { closing: new B.TransformNode("closingDecor", scene), class: new B.TransformNode("classDecor", scene), legday: new B.TransformNode("legdayDecor", scene) };

  const classMat = material("classMat", "#76519c", 0.9);
  for (const [x, z] of [[-5.8, 3.7], [-2.8, 3.7], [0.2, 3.7], [3.2, 3.7], [6.2, 3.7]]) {
    const platform = B.MeshBuilder.CreateBox("stepPlatform", { width: 1.7, height: 0.22, depth: 0.72 }, scene);
    platform.parent = levelDecor.class; platform.position.set(x, 0.11, z); platform.material = classMat;
  }

  const plateMat = material("legPlate", "#d36b61", 0.82);
  for (const [x, z] of [[-4.5, 0.5], [4.5, 0.5]]) {
    const tree = new B.TransformNode("plateTree", scene); tree.parent = levelDecor.legday; tree.position.set(x, 0, z);
    const post = B.MeshBuilder.CreateCylinder("platePost", { diameter: 0.16, height: 1.6, tessellation: 14 }, scene);
    post.parent = tree; post.position.y = 0.8; post.material = material(`post${x}`, "#414852", 0.4, 0.45);
    for (let i = 0; i < 3; i++) {
      const plate = B.MeshBuilder.CreateTorus("plate", { diameter: 0.9, thickness: 0.18, tessellation: 22 }, scene);
      plate.parent = tree; plate.position.y = 0.35 + i * 0.42; plate.rotation.x = Math.PI / 2; plate.material = plateMat;
    }
  }
}

export function setActiveLevelDecor(levelId) {
  Object.entries(levelDecor).forEach(([id, root]) => root.setEnabled(id === levelId));
}

function createPegboards(detailed) {
  buildPegboard(-13.1, 8.0, detailed);
  buildPegboard(13.1, 8.0, detailed);
}

function buildPegboard(x, z, detailed) {
  const side = Math.sign(x);
  const panel = B.MeshBuilder.CreateBox("pegboardPanel", { width: 0.06, height: 2.0, depth: 2.2 }, scene);
  panel.position.set(x - side * 0.31, 1.9, z);
  panel.material = material("pegboardFrame", "#2c313a", 0.7, 0.3);
  shadowGenerator.addShadowCaster(panel);

  const hookMat = material("pegHook", "#8a8f97", 0.4, 0.6);
  [[-0.7, 2.5], [0, 2.5], [0.7, 2.5], [-0.35, 1.3], [0.35, 1.3]].forEach(([dz, y]) => {
    const hook = B.MeshBuilder.CreateCylinder("pegHook", { diameter: 0.05, height: 0.22, tessellation: 8 }, scene);
    hook.rotation.x = Math.PI / 2;
    hook.position.set(x - side * 0.42, y, z + dz);
    hook.material = hookMat;
  });

  buildKettlebell(x - side * 0.5, 2.5, z - 0.7, detailed);
  buildKettlebell(x - side * 0.5, 2.5, z + 0.7, detailed);
  buildResistanceBand(x - side * 0.45, 2.5, z);
  buildJumpRope(x - side * 0.42, 1.3, z - 0.35);
  buildJumpRope(x - side * 0.42, 1.3, z + 0.35);
}

function buildKettlebell(x, y, z, detailed) {
  const metal = material(`kettlebellMetal${x}${z}`, "#2b2e33", 0.35, 0.55);
  const body = B.MeshBuilder.CreateSphere(`kettlebellBody${x}${z}`, { diameter: 0.34, segments: detailed ? 14 : 8 }, scene);
  body.position.set(x, y - 0.32, z); body.material = metal;
  const handle = B.MeshBuilder.CreateTorus(`kettlebellHandle${x}${z}`, { diameter: 0.2, thickness: 0.035, tessellation: 12 }, scene);
  handle.position.set(x, y - 0.1, z); handle.rotation.x = Math.PI / 2; handle.material = metal;
  if (detailed) shadowGenerator.addShadowCaster(body);
}

function buildResistanceBand(x, y, z) {
  const band = B.MeshBuilder.CreateTorus("resistanceBand", { diameter: 0.26, thickness: 0.03, tessellation: 16 }, scene);
  band.position.set(x, y, z);
  band.material = material("resistanceBandMat", "#e16862", 0.6);
}

function buildJumpRope(x, y, z) {
  const rope = B.MeshBuilder.CreateTorus("jumpRope", { diameter: 0.22, thickness: 0.018, tessellation: 16 }, scene);
  rope.position.set(x, y, z);
  rope.material = material("jumpRopeMat", "#f4f2df", 0.5);
}
```

- [ ] **Step 2: `main.js` verdrahten**

Import ergänzen:

```js
import { buildDecor, setActiveLevelDecor } from "./environment/decor.js";
```

In `createScene()` (`src/main.js:104-136`) ersetze die Zeilen

```js
  createZones();
  createBaseDecor();
  createLevelDecor();
```

durch:

```js
  const decor = buildDecor(scene, shadowGenerator, { quality: save.settings.quality });
  zones = decor.zones;
  obstacles = decor.obstacles;
```

Die Funktionen `createZones`, `addZone`, `createDumbbellRack`, `createLaundryZone`, `createBottleZone`, `createMatZone`, `createBaseDecor`, `createLevelDecor`, `setActiveLevelDecor` aus `main.js` (`main.js:201-274`, `main.js:428-492`) löschen – `zones`/`obstacles`/`levelDecor` als `let`-Deklarationen in `main.js` bleiben bestehen (werden weiterhin von `resolvePlayerPosition` etc. gelesen), nur die Befüllung passiert jetzt über `buildDecor()`.

`setActiveLevelDecor` wird an den bestehenden Aufrufstellen (`main.js:134`, `~1128`, `~1294`) unverändert weiterverwendet – jetzt aus dem Import statt lokal definiert.

- [ ] **Step 3: Visuelle & funktionale Verifikation**

```bash
python start_game.py
```

- Alle vier Zonen (Hantelregal, Wäschekorb, Flaschenbox, Mattenregal) an gewohnter Position, Beacon/Highlight funktioniert weiterhin.
- Neue Pegboards mit Kettlebells/Resistance-Band/Springseilen an beiden hinteren Seitenwänden sichtbar, ohne Fenster zu überlappen.
- Alle drei Level (`closing`, `class`, `legday`) kurz anspielen: Level-Deko schaltet korrekt um, keine Kollisions-/Bewegungsauffälligkeiten.
- `quality: "low"` in den Spiel-Einstellungen aktivieren, neu laden: Kettlebell-Segmente gröber, keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/environment/decor.js src/main.js
git commit -m "feat: extract zone/decor module and add pegboard equipment props"
```

---

### Task 4: Environment-Orchestrator + Aufräumen

**Files:**
- Create: `src/environment/index.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `buildStructure` (Task 2), `buildDecor` + `setActiveLevelDecor` (Task 3).
- Produces: `export function buildEnvironment(scene, shadowGenerator, options)` → `{ zones, obstacles }`; `export { setActiveLevelDecor }`.

- [ ] **Step 1: `src/environment/index.js` anlegen**

```js
import { buildStructure } from "./structure.js";
import { buildDecor, setActiveLevelDecor } from "./decor.js";

export { setActiveLevelDecor };

export function buildEnvironment(scene, shadowGenerator, options) {
  buildStructure(scene, shadowGenerator, options);
  return buildDecor(scene, shadowGenerator, options);
}
```

- [ ] **Step 2: `main.js` auf den Orchestrator umstellen**

Ersetze die drei separaten Imports aus Task 2/3:

```js
import { buildStructure } from "./environment/structure.js";
import { buildDecor, setActiveLevelDecor } from "./environment/decor.js";
```

durch:

```js
import { buildEnvironment, setActiveLevelDecor } from "./environment/index.js";
```

In `createScene()` die beiden separaten Aufrufe

```js
  buildStructure(scene, shadowGenerator, { quality: save.settings.quality });
  ...
  const decor = buildDecor(scene, shadowGenerator, { quality: save.settings.quality });
  zones = decor.zones;
  obstacles = decor.obstacles;
```

zusammenfassen zu:

```js
  const environment = buildEnvironment(scene, shadowGenerator, { quality: save.settings.quality });
  zones = environment.zones;
  obstacles = environment.obstacles;
```

- [ ] **Step 3: Vollständiger Smoke-Test**

```bash
python start_game.py
```

- Start-Bildschirm → Charakter/Level/Modus wählen → Runde starten.
- Laufen, Item aufnehmen (`E`), zur richtigen Zone tragen, ablegen – Punktestand/Combo aktualisiert sich.
- Kamera zurücksetzen (`C`), Pause (`Esc`), Fortsetzen – keine Fehler in der Konsole.
- Level wechseln (Hauptmenü), erneut kurz anspielen.
- `quality: "low"` umschalten, neu laden, erneut kurz anspielen.

- [ ] **Step 4: Commit**

```bash
git add src/environment/index.js src/main.js
git commit -m "feat: wire up environment orchestrator module"
```

---

## Self-Review-Notizen (bereits eingearbeitet)

- **Spec-Abdeckung:** Decke/Dachbinder/Pendelleuchten (Task 2), Sichtbeton-Wände (Task 2), Industriefenster (Task 2), Pegboard+Equipment (Task 3), Rohre/Kabelkanäle (Task 2), Mural (Task 2), Code-Organisation (alle Tasks) – alle Spec-Abschnitte sind abgedeckt.
- **Zusätzlich identifiziert (nicht in der Spec, aber notwendige Konsequenz):** Die neue geschlossene Decke erfordert eine Anpassung der Kamera-Zoom-/Neigungslimits (Task 2, Step 3), sonst kann die Kamera rechnerisch über die Decke hinaus positioniert werden.
- **Typkonsistenz geprüft:** `buildStructure`, `buildDecor`, `buildEnvironment`, `setActiveLevelDecor`, `createMaterial`, `createTexturedMaterial` werden in allen Tasks identisch benannt und signaturkonsistent verwendet.
