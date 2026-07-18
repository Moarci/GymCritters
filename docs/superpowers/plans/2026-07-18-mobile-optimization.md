# Mobile-Optimierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Touch-Steuerung, Hochformat-Layout und selbstregelnde Bildrate so weit bringen, dass GymCritters auf einem Handy vollwertig spielbar ist.

**Architecture:** Die Touch-Eingabe wandert aus dem Inline-Block in `src/main.js` in drei kleine Module unter `src/input/`; die reine Mathematik (Joystick-Kurve, Look-Deltas) wird DOM-frei und damit testbar, die DOM-Bindung liegt in `src/input/index.js`. Die Qualitätsregelung ist ein immutabler Reducer unter `src/perf/`, der nur eine Stufe *vorschlägt* — das Anwenden bleibt in `applyRenderQuality()` in `main.js`. Kameraausrichtung wird weiterhin ausschließlich in `main.js` geschrieben.

**Tech Stack:** Vanilla ES-Module, Babylon.js (global als `B` über `src/babylon.js`), `node --test` als Testrunner, CSS ohne Präprozessor.

## Global Constraints

- Sprache im Code: Kommentare, Testnamen und UI-Texte auf Deutsch, Bezeichner auf Englisch. **Commit-Messages auf Englisch im Conventional-Commits-Format** — so hält es die bestehende Historie (`feat: move the delivery payoff to the moment the item lands`).
- Immutabilität: Funktionen geben neue Objekte zurück, statt Argumente zu verändern.
- Dateigröße: Neue Module bleiben deutlich unter 200 Zeilen.
- Keine kontinuierliche Auto-Follow-Kamera. Die Rotation fließt nur von der Kamera zum Spieler, nie zurück. `resetCamera()` bleibt ein One-Shot.
- `camera.attachControl()` wird ausschließlich auf Nicht-Touch-Geräten aufgerufen. Desktop-Verhalten bleibt unverändert.
- Tests laufen mit `npm test` (`node --test "test/**/*.test.js"`).
- Der Branch ist `feature/mobile-optimization`. Nach jeder Task committen.
- Bestehende Spielstände dürfen nicht brechen: `loadSave()` merged Settings über Defaults, neue Settings-Schlüssel brauchen einen Default in `createDefaultSave()`.

---

## Phasen

Die drei Stränge sind voneinander unabhängig und werden nacheinander abgeschlossen. Nach jeder Phase ist das Spiel lauffähig.

- **Phase A — Eingabe** (Task 1–5): Joystick-Mathematik, Look-Zone, Reset-Pfad, Recenter-Button.
- **Phase B — Hochformat** (Task 6–8): FOV-Modus, Portrait-Layout, Orientierungshinweis entfernen.
- **Phase C — Qualität** (Task 9–11): Regel-Logik, Anbindung, Einstellung.

## Dateiübersicht

| Datei | Verantwortung | Phase |
|---|---|---|
| `src/input/joystick.js` (neu) | Pointer-Offset → Richtungsvektor, Deadzone, Clamping | A |
| `src/input/touch-look.js` (neu) | Pointer-Bewegung → Kamera-Deltas, Pitch-Clamping | A |
| `src/input/index.js` (neu) | DOM-Bindung, Pointer-Capture, State-Reset | A |
| `test/joystick.test.js` (neu) | Tests zu `joystick.js` | A |
| `test/touch-look.test.js` (neu) | Tests zu `touch-look.js` | A |
| `src/main.js` (ändern) | Nutzt die Module, wendet Deltas auf die Kamera an | A, B, C |
| `index.html` (ändern) | Recenter-Button in den Touch-Controls, Settings-Option, Hinweis entfernen | A, B, C |
| `style.css` (ändern) | Portrait-Layout, Button-Platzierung | A, B |
| `src/perf/adaptive-quality.js` (neu) | Frame-Zeiten → Qualitätsvorschlag (reine Logik) | C |
| `test/adaptive-quality.test.js` (neu) | Tests zu `adaptive-quality.js` | C |
| `src/save.js` (ändern) | Default `quality: "auto"` | C |

**Abweichung von der Spec, bewusst:** Die Spec sagt „Automatisch als Default auf Touch-Geräten". Umgesetzt wird `"auto"` als globaler Default, auch auf dem Desktop. Ein gerätespezifischer Default müsste beim Laden des Spielstands das Eingabegerät kennen, was `save.js` sonst nicht tut; und die Regelung hilft auch schwachen Desktops. Bestehende Spielstände behalten ihren gespeicherten Wert, weil `loadSave()` Legacy über Defaults merged.

---

# Phase A — Eingabe

### Task 1: Joystick-Mathematik

**Files:**
- Create: `src/input/joystick.js`
- Test: `test/joystick.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `JOYSTICK_DEADZONE: number` und `joystickVector(dx: number, dy: number, radius: number, deadzone?: number) => { x: number, z: number, knobX: number, knobY: number }`. `x`/`z` sind die Bewegungsachsen im Bereich -1..1 (`z` positiv = vorwärts), `knobX`/`knobY` die Pixel-Verschiebung des Knobs.

Hintergrund: Der Bildschirm zählt `y` nach unten, die Spielwelt zählt `z` nach vorne. Deshalb wird `z` aus `-dy` gebildet. Die alte Inline-Version in `main.js` hatte keine Deadzone, weshalb ein ruhender Daumen die Figur driften ließ.

- [ ] **Step 1: Write the failing test**

Create `test/joystick.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module` für `../src/input/joystick.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/input/joystick.js`:

```javascript
// Ab welchem Anteil des Ausschlags eine Bewegung überhaupt zählt. Ein ruhender Daumen
// wandert um wenige Pixel; ohne Schwelle driftet die Figur dauerhaft.
export const JOYSTICK_DEADZONE = 0.15;

// Rechnet den Pointer-Offset zur Joystick-Mitte in Bewegungsachsen um.
// dx/dy sind Pixel, radius der maximale Ausschlag in Pixeln.
// Der Bildschirm zählt y nach unten, die Welt zählt z nach vorne -- daher das Vorzeichen.
export function joystickVector(dx, dy, radius, deadzone = JOYSTICK_DEADZONE) {
  if (!(radius > 0)) return { x: 0, z: 0, knobX: 0, knobY: 0 };

  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, z: 0, knobX: 0, knobY: 0 };

  const unitX = dx / distance;
  const unitY = dy / distance;
  const clamped = Math.min(distance, radius);
  const knobX = unitX * clamped;
  const knobY = unitY * clamped;

  const magnitude = clamped / radius;
  if (magnitude < deadzone) return { x: 0, z: 0, knobX, knobY };

  // Die Deadzone wird herausgerechnet, statt nur abgeschnitten: sonst würde die Figur
  // direkt hinter der Schwelle mit 15% Tempo anspringen.
  const scaled = (magnitude - deadzone) / (1 - deadzone);
  return { x: unitX * scaled, z: -unitY * scaled, knobX, knobY };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, alle acht neuen Tests grün, bestehende Tests unverändert grün.

- [ ] **Step 5: Commit**

```bash
git add src/input/joystick.js test/joystick.test.js
git commit -m "feat: add joystick vector math with deadzone and clamping"
```

---

### Task 2: Look-Deltas

**Files:**
- Create: `src/input/touch-look.js`
- Test: `test/touch-look.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `LOOK_SENSITIVITY: number`, `lookDelta(dx: number, dy: number, sensitivity?: number) => { deltaYaw: number, deltaPitch: number }` und `clampPitch(beta: number, min: number, max: number) => number`.

Hintergrund: Die Kamera ist eine Babylon `ArcRotateCamera`. `alpha` ist die Drehung um die Hochachse, `beta` die Neigung, begrenzt auf 1.1 bis 1.32 (`main.js:273`). `lookDelta` liefert nur Zahlen; welches Vorzeichen auf `alpha` bzw. `beta` addiert wird, entscheidet `main.js` in Task 3.

- [ ] **Step 1: Write the failing test**

Create `test/touch-look.test.js`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { lookDelta, clampPitch, LOOK_SENSITIVITY } from "../src/input/touch-look.js";

test("lookDelta skaliert die Pixelbewegung mit der Grundempfindlichkeit", () => {
  const result = lookDelta(100, 0);
  assert.ok(Math.abs(result.deltaYaw - 100 * LOOK_SENSITIVITY) < 1e-12);
  assert.equal(result.deltaPitch, 0);
});

test("lookDelta multipliziert die Nutzereinstellung auf", () => {
  const normal = lookDelta(100, 50, 1);
  const fast = lookDelta(100, 50, 2);
  assert.ok(Math.abs(fast.deltaYaw - normal.deltaYaw * 2) < 1e-12);
  assert.ok(Math.abs(fast.deltaPitch - normal.deltaPitch * 2) < 1e-12);
});

test("lookDelta behält die Richtung der Bewegung", () => {
  const result = lookDelta(-30, -40);
  assert.ok(result.deltaYaw < 0);
  assert.ok(result.deltaPitch < 0);
});

test("lookDelta liefert bei Stillstand null", () => {
  const result = lookDelta(0, 0);
  assert.equal(result.deltaYaw, 0);
  assert.equal(result.deltaPitch, 0);
});

test("clampPitch hält den Winkel in den Kameragrenzen", () => {
  assert.equal(clampPitch(0.5, 1.1, 1.32), 1.1);
  assert.equal(clampPitch(9, 1.1, 1.32), 1.32);
  assert.equal(clampPitch(1.2, 1.1, 1.32), 1.2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module` für `../src/input/touch-look.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/input/touch-look.js`:

```javascript
// Radiant pro Pixel Wischbewegung. Kalibriert so, dass ein Wisch über die halbe
// Bildschirmbreite die Kamera etwa eine Vierteldrehung bewegt.
export const LOOK_SENSITIVITY = 0.0042;

// Wandelt eine Pointer-Bewegung in Winkel-Deltas. Bewusst ohne Kamerabezug: welche
// Achse in welche Richtung addiert wird, entscheidet der Aufrufer.
export function lookDelta(dx, dy, sensitivity = 1) {
  return {
    deltaYaw: dx * LOOK_SENSITIVITY * sensitivity,
    deltaPitch: dy * LOOK_SENSITIVITY * sensitivity,
  };
}

// Die ArcRotateCamera begrenzt beta selbst nur beim eigenen Input-Handling; da wir
// alpha und beta direkt schreiben, klemmen wir hier.
export function clampPitch(beta, min, max) {
  return Math.min(max, Math.max(min, beta));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/input/touch-look.js test/touch-look.test.js
git commit -m "feat: add touch look delta math"
```

---

### Task 3: DOM-Bindung der Touch-Eingabe

**Files:**
- Create: `src/input/index.js`
- Modify: `src/main.js` (Ersatz des Inline-Blocks bei Z. 1349–1390, `state.touch` bei Z. 64, `updatePlayer` bei Z. 468–472, `updateCamera` bei Z. 426–430, `attachControl` bei Z. 280)

**Interfaces:**
- Consumes: `joystickVector`, `JOYSTICK_DEADZONE` aus Task 1; `lookDelta`, `clampPitch` aus Task 2.
- Produces: `createTouchInput(options) => TouchInput`.
  - `options: { joystick: HTMLElement, knob: HTMLElement, canvas: HTMLElement, sprintButton: HTMLElement, interactButton: HTMLElement, getSensitivity: () => number, isActive: () => boolean, onInteract: () => void }`
  - `TouchInput: { read(): { x: number, z: number, sprint: boolean }, consumeLook(): { deltaYaw: number, deltaPitch: number }, reset(): void }`
  - `read()` liefert den aktuellen Stand. `consumeLook()` liefert die seit dem letzten Aufruf aufgelaufene Bewegung und setzt den Speicher auf null. `reset()` neutralisiert alles inklusive der DOM-Klassen.

Dieses Modul wird nicht unit-getestet — es ist reine DOM-Verdrahtung ohne Logik, die Logik liegt in Task 1 und 2. Verifikation erfolgt manuell in Step 5.

- [ ] **Step 1: Modul anlegen**

Create `src/input/index.js`:

```javascript
import { joystickVector } from "./joystick.js";
import { lookDelta } from "./touch-look.js";

// Bündelt Joystick, Action-Buttons und die Look-Zone zu einer Eingabequelle.
// Die Look-Zone ist der Canvas selbst: Joystick und Buttons liegen als Overlays mit
// pointer-events:auto darüber, ein pointerdown das den Canvas erreicht kann also
// per Definition kein Control getroffen haben. Damit braucht es keine Zonen-Geometrie
// und Hoch- wie Querformat funktionieren ohne Sonderfall.
export function createTouchInput({
  joystick, knob, canvas, sprintButton, interactButton, getSensitivity, isActive, onInteract,
}) {
  let move = { x: 0, z: 0 };
  let sprint = false;
  let movePointerId = null;
  let lookPointerId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let pendingYaw = 0;
  let pendingPitch = 0;

  function moveKnob(x, y) {
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  function reset() {
    move = { x: 0, z: 0 };
    sprint = false;
    movePointerId = null;
    lookPointerId = null;
    pendingYaw = 0;
    pendingPitch = 0;
    moveKnob(0, 0);
    sprintButton.classList.remove("active");
    interactButton.classList.remove("active");
  }

  function updateFromPointer(event) {
    const rect = joystick.getBoundingClientRect();
    const radius = rect.width * 0.31;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const result = joystickVector(dx, dy, radius);
    move = { x: result.x, z: result.z };
    moveKnob(result.knobX, result.knobY);
  }

  joystick.addEventListener("pointerdown", (event) => {
    if (!isActive()) return;
    movePointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateFromPointer(event);
    event.preventDefault();
  });
  joystick.addEventListener("pointermove", (event) => {
    if (movePointerId !== event.pointerId) return;
    updateFromPointer(event);
    event.preventDefault();
  });
  const releaseMove = (event) => {
    if (movePointerId !== event.pointerId) return;
    movePointerId = null;
    move = { x: 0, z: 0 };
    moveKnob(0, 0);
  };
  joystick.addEventListener("pointerup", releaseMove);
  joystick.addEventListener("pointercancel", releaseMove);

  // Genau ein Look-Finger. Ein zweiter Finger auf dem Canvas wird ignoriert, statt
  // wie bei Babylons eigenem Handling als Pinch-Zoom gedeutet zu werden -- das war
  // der Grund, warum Laufen und Umsehen gleichzeitig die Kamera springen ließ.
  canvas.addEventListener("pointerdown", (event) => {
    if (!isActive() || lookPointerId !== null) return;
    lookPointerId = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (lookPointerId !== event.pointerId) return;
    const delta = lookDelta(event.clientX - lookLastX, event.clientY - lookLastY, getSensitivity());
    pendingYaw += delta.deltaYaw;
    pendingPitch += delta.deltaPitch;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    event.preventDefault();
  });
  const releaseLook = (event) => {
    if (lookPointerId !== event.pointerId) return;
    lookPointerId = null;
  };
  canvas.addEventListener("pointerup", releaseLook);
  canvas.addEventListener("pointercancel", releaseLook);

  const setSprint = (active) => {
    sprint = isActive() ? active : false;
    sprintButton.classList.toggle("active", sprint);
  };
  sprintButton.addEventListener("pointerdown", (event) => {
    setSprint(true);
    sprintButton.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  sprintButton.addEventListener("pointerup", () => setSprint(false));
  sprintButton.addEventListener("pointercancel", () => setSprint(false));

  interactButton.addEventListener("pointerdown", (event) => {
    if (isActive()) onInteract();
    interactButton.classList.add("active");
    interactButton.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  interactButton.addEventListener("pointerup", () => interactButton.classList.remove("active"));
  interactButton.addEventListener("pointercancel", () => interactButton.classList.remove("active"));

  return {
    read: () => ({ x: move.x, z: move.z, sprint }),
    consumeLook: () => {
      const delta = { deltaYaw: pendingYaw, deltaPitch: pendingPitch };
      pendingYaw = 0;
      pendingPitch = 0;
      return delta;
    },
    reset,
  };
}
```

- [ ] **Step 2: Import und Instanz in `main.js`**

In `src/main.js` den Import neben die bestehenden Imports setzen (bei den anderen `./`-Imports um Z. 15):

```javascript
import { createTouchInput } from "./input/index.js";
import { clampPitch } from "./input/touch-look.js";
```

Direkt nach der `state`-Deklaration (nach Z. 66, also nach dem schließenden `};` des `state`-Objekts) einfügen:

```javascript
const touchInput = createTouchInput({
  joystick: ui.joystick,
  knob: ui.joystickKnob,
  canvas: ui.canvas,
  sprintButton: ui.sprintButton,
  interactButton: ui.interactButton,
  getSensitivity: () => save.settings.cameraSensitivity || 1,
  isActive: () => state.playing && !state.paused,
  onInteract: () => { state.interactPressed = true; },
});
```

- [ ] **Step 3: Alten Inline-Block entfernen**

In `src/main.js` ersatzlos löschen:
- Die Funktion `resetTouchInput()` (Z. 1349–1352) und `updateJoystick()` (Z. 1353–1358).
- Die sechs Event-Listener-Zeilen für `ui.joystick`, `releaseJoystick`, `setTouchSprint`, `ui.sprintButton` und `ui.interactButton` (Z. 1379–1390).
- Das Feld `touch: { x: 0, z: 0, sprint: false, pointerId: null },` aus dem `state`-Objekt (Z. 64).

Alle bisherigen Aufrufer von `resetTouchInput()` auf `touchInput.reset()` umstellen. Aufrufstellen finden mit:

```bash
grep -n "resetTouchInput\|state\.touch" src/main.js
```

Jeder Treffer muss danach verschwunden sein.

- [ ] **Step 4: Eingabe in Spieler und Kamera einspeisen**

In `updatePlayer(dt)` die beiden Zeilen (Z. 468–469)

```javascript
  let inputX = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0) + state.touch.x;
  let inputZ = (forwardPressed ? 1 : 0) - (backPressed ? 1 : 0) + state.touch.z;
```

ersetzen durch:

```javascript
  const touch = touchInput.read();
  let inputX = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0) + touch.x;
  let inputZ = (forwardPressed ? 1 : 0) - (backPressed ? 1 : 0) + touch.z;
```

In derselben Funktion (Z. 472) `state.touch.sprint` durch `touch.sprint` ersetzen:

```javascript
  const wantsSprint = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") || touch.sprint;
```

In `updateCamera(dt)` (Z. 426) die aufgelaufene Look-Bewegung anwenden. Die Funktion lautet danach vollständig:

```javascript
function updateCamera(dt) {
  if (!camera || !player) return;
  // Kameraausrichtung wird ausschließlich hier geschrieben. touch-look.js liefert nur
  // Zahlen, damit es keinen zweiten Schreiber auf alpha/beta gibt.
  const look = touchInput.consumeLook();
  if (look.deltaYaw !== 0 || look.deltaPitch !== 0) {
    camera.alpha -= look.deltaYaw;
    camera.beta = clampPitch(camera.beta + look.deltaPitch, camera.lowerBetaLimit, camera.upperBetaLimit);
  }
  const desired = player.position.add(new B.Vector3(0, 0.78, 0));
  camera.target = B.Vector3.Lerp(camera.target, desired, 1 - Math.exp(-9 * dt));
}
```

Bei `camera.attachControl(ui.canvas, true);` (Z. 280) die Touch-Variante ausnehmen:

```javascript
  // Auf Touch-Geräten übernimmt src/input/index.js die Look-Steuerung; Babylons
  // eigenes Canvas-Handling würde den zweiten Finger als Pinch-Zoom deuten.
  if (!isTouchDevice) camera.attachControl(ui.canvas, true);
```

- [ ] **Step 5: Verifizieren**

Run: `npm test`
Expected: PASS, alle bestehenden Tests unverändert grün.

Dann das Spiel starten und im Browser mit emuliertem Touch-Gerät prüfen:

```bash
node start_server.js
```

Prüfliste, alle Punkte müssen zutreffen:
- Der Joystick bewegt die Figur, der Knob bleibt im Ring.
- Ein ruhender Daumen auf dem Joystick lässt die Figur stehen (Deadzone wirkt).
- Wischen auf der freien Fläche dreht die Kamera.
- Joystick halten und gleichzeitig wischen funktioniert, ohne dass die Kamera springt.
- Ein Wisch, der auf dem Joystick beginnt, dreht die Kamera *nicht*.
- Sprint- und Aktion-Button reagieren wie vorher.
- Auf dem Desktop dreht die Maus die Kamera unverändert.

- [ ] **Step 6: Commit**

```bash
git add src/input/index.js src/main.js
git commit -m "refactor: move touch input into dedicated modules with own look zone"
```

---

### Task 4: Reset-Pfad gegen hängende Eingaben

**Files:**
- Modify: `src/main.js` (Event-Listener bei Z. 1375–1378)

**Interfaces:**
- Consumes: `touchInput.reset()` aus Task 3.
- Produces: nichts für spätere Tasks.

Hintergrund: Wird der Tab in den Hintergrund geschoben oder reißt der Pointer-Capture ab, während der Joystick gehalten wird, kommt kein `pointerup` mehr an und die Figur läuft unbegrenzt weiter. `blur` leert heute nur `state.keys`, nicht die Touch-Eingabe.

- [ ] **Step 1: Reset-Funktion ergänzen**

In `src/main.js` neben den anderen Hilfsfunktionen (direkt vor dem `window.addEventListener("keydown", …)`-Block, Z. 1375) einfügen:

```javascript
// Ein gemeinsamer Weg für alle Fälle, in denen die Eingabe abreißen kann. Ohne das
// bleibt ein gehaltener Joystick nach einem Tab-Wechsel dauerhaft ausgelenkt.
function releaseAllInput() {
  state.keys.clear();
  touchInput.reset();
}
```

- [ ] **Step 2: Listener umhängen**

Die bestehende Zeile

```javascript
window.addEventListener("blur", () => state.keys.clear());
```

ersetzen durch:

```javascript
window.addEventListener("blur", releaseAllInput);
```

Die bestehende Zeile

```javascript
document.addEventListener("visibilitychange", () => { if (document.hidden && state.playing && !state.ended) setPaused(true); });
```

ersetzen durch:

```javascript
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  releaseAllInput();
  if (state.playing && !state.ended) setPaused(true);
});
```

- [ ] **Step 3: Verifizieren**

Run: `npm test`
Expected: PASS.

Im Browser prüfen: Joystick gedrückt halten, in einen anderen Tab wechseln, zurückkehren. Erwartet: Das Spiel ist pausiert, der Knob steht in der Mitte, nach dem Fortsetzen läuft die Figur nicht von selbst weiter.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "fix: release touch input when the page loses focus"
```

---

### Task 5: Recenter-Button in Daumenreichweite

**Files:**
- Modify: `index.html:34` (Button aus der HUD-Leiste), `index.html:57-63` (Touch-Controls)
- Modify: `style.css` (Regeln für `.mobile-button.tertiary`)
- Modify: `src/main.js` (Listener bei Z. 1392)

**Interfaces:**
- Consumes: `resetCamera(showFeedback)` — existiert bereits in `main.js:432`.
- Produces: `ui.cameraRecenterButton` als neue Referenz im `ui`-Objekt.

Hintergrund: Der vorhandene ⌖-Button sitzt oben rechts im HUD, im Hochformat außerhalb der Daumenreichweite. Er bleibt dort für Desktop und bekommt auf Touch ein Gegenstück unten rechts. Beide rufen dieselbe Funktion.

- [ ] **Step 1: Markup ergänzen**

In `index.html` innerhalb von `<div class="mobile-buttons">` (Z. 59) als erstes Kind einfügen:

```html
      <button id="cameraRecenterButton" class="mobile-button tertiary" type="button" aria-label="Kamera ausrichten">⌖</button>
```

Der Block lautet danach:

```html
    <div class="mobile-buttons">
      <button id="cameraRecenterButton" class="mobile-button tertiary" type="button" aria-label="Kamera ausrichten">⌖</button>
      <button id="sprintButton" class="mobile-button secondary" type="button">Sprint</button>
      <button id="interactButton" class="mobile-button primary-action" type="button">Aktion</button>
    </div>
```

- [ ] **Step 2: Stil ergänzen**

In `style.css` direkt nach der Regel `.mobile-button.secondary { … }` (Z. 298) einfügen:

```css
.mobile-button.tertiary { width: 52px; height: 52px; font-size: 17px; }
```

Und in den bestehenden Block `@media (max-width: 680px) { … }` neben die anderen Control-Größen aufnehmen:

```css
  .mobile-button.tertiary { width: 48px; height: 48px; }
```

- [ ] **Step 3: Listener verdrahten**

In `src/main.js` im `ui`-Objekt neben `cameraButton` (Z. 29) ergänzen:

```javascript
  cameraRecenterButton: $("cameraRecenterButton"),
```

Die bestehende Zeile

```javascript
ui.cameraButton.addEventListener("click", () => resetCamera(true));
```

ergänzen um:

```javascript
ui.cameraRecenterButton.addEventListener("click", () => resetCamera(true));
```

- [ ] **Step 4: Verifizieren**

Run: `npm test`
Expected: PASS.

Im Browser mit emuliertem Touch prüfen: Der ⌖-Button erscheint unten rechts links neben „Sprint", richtet die Kamera hinter die Figur aus und zeigt den Toast „Kamera ausgerichtet". Die Kamera folgt danach *nicht* dauerhaft der Figur.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css src/main.js
git commit -m "feat: add camera recenter button within thumb reach on touch"
```

---

# Phase B — Hochformat

### Task 6: Horizontales FOV festhalten

**Files:**
- Modify: `src/main.js:272-280` (Kamera-Aufbau)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts für spätere Tasks.

Hintergrund: Babylon hält standardmäßig das vertikale Sichtfeld konstant (`FOVMODE_VERTICAL_FIXED`). In einem 9:19,5-Viewport schrumpft dadurch das horizontale Sichtfeld so stark, dass die Halle nicht mehr überblickbar ist. Mit `FOVMODE_HORIZONTAL_FIXED` bleibt die Breite stabil und das Hochformat gewinnt oben und unten Bild hinzu.

- [ ] **Step 1: FOV-Modus setzen**

In `src/main.js` direkt nach `camera.inertia = 0.78;` (Z. 275) einfügen:

```javascript
  // Im Hochformat würde ein fixes vertikales FOV das Sichtfeld seitlich zusammenziehen,
  // bis die Halle nicht mehr überblickbar ist. Fix ist die Breite, nicht die Höhe.
  camera.fovMode = B.Camera.FOVMODE_HORIZONTAL_FIXED;
```

- [ ] **Step 2: Verifizieren**

Run: `npm test`
Expected: PASS.

Im Browser prüfen, mit Screenshots in drei Viewports:
- 390×844 (Hochformat): Die Halle ist seitlich vollständig sichtbar, die Figur wirkt nicht herangezoomt.
- 844×390 (Querformat): Der Bildeindruck ist gegenüber vorher unverändert oder nur minimal weiter.
- 1440×900 (Desktop): unverändert.

Das Querformat ist der Risikopunkt — die Spec führt ihn als offenes Risiko. Weicht der Eindruck spürbar ab, in diesem Schritt `camera.fov` nachziehen und die gewählte Zahl im Commit begründen.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "fix: keep horizontal field of view stable in portrait"
```

---

### Task 7: Portrait-Layout

**Files:**
- Modify: `style.css` (neuer Media-Block am Ende der Datei)

**Interfaces:**
- Consumes: die Klassen `.hud`, `.stats`, `.objective`, `.progress-track`, `.navigator`, `.toast`, `.mobile-controls`, `.prompt` — alle bereits vorhanden.
- Produces: nichts für spätere Tasks.

Hintergrund: Im Hochformat ist die Breite knapp und die Höhe reichlich. Die HUD-Elemente sind heute mit festen `top`-Werten für Querformat positioniert und überlagern sich im Hochformat. Der Block gilt nur für Touch-Geräte im Hochformat, damit ein schmales Desktop-Fenster nicht betroffen ist.

- [ ] **Step 1: Media-Block ergänzen**

Am Ende von `style.css` anfügen:

```css
/* Hochformat auf Touch-Geräten: Breite ist knapp, Höhe reichlich. Die HUD-Elemente
   rücken deshalb nach oben zusammen, die Controls bekommen unten mehr Luft, weil der
   Daumen im Hochformat tiefer greift. */
@media (orientation: portrait) and (hover: none) and (pointer: coarse) {
  .hud { inset-inline: 8px; }
  .stats { grid-template-columns: repeat(4, auto); }
  .stats > div { padding: 6px 8px; border-bottom: 0; }
  .stats > div:nth-child(-n+3) { border-right: 1px solid var(--line); }
  .stats strong { font-size: 13px; }

  .objective { top: 96px; font-size: 12px; max-width: 92vw; }
  .progress-track { top: 128px; width: min(320px, 86vw); }
  .navigator { top: 146px; transform: translateX(-50%) scale(.82); }
  .toast { top: 196px; }
  .speech-bubble { top: 168px; }
  .prompt { bottom: 232px; max-width: 90vw; white-space: normal; text-align: center; }

  .mobile-controls { bottom: max(30px, env(safe-area-inset-bottom)); align-items: flex-end; }
  .mobile-buttons { gap: 9px; }
  .tutorial-coach { bottom: max(206px, calc(env(safe-area-inset-bottom) + 206px)); width: calc(100vw - 24px); }
}
```

- [ ] **Step 2: Verifizieren**

Im Browser bei 390×844 mit emuliertem Touch prüfen, Screenshot je Zustand:
- Startbildschirm: Panel und Buttons vollständig sichtbar, kein horizontales Scrollen.
- Laufende Runde: Stats, Objective, Progress und Navigator überlappen sich nicht.
- Die Controls unten überdecken weder `prompt` noch `tutorialCoach`.
- Der Ergebnisbildschirm ist vollständig erreichbar.

Zusätzlich bei 360×640 (kleines Gerät) gegenprüfen, dass nichts überläuft.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add portrait layout for touch devices"
```

---

### Task 8: Orientierungshinweis entfernen

**Files:**
- Modify: `index.html:65` (Hinweis-Element), `style.css:433` und `style.css:459-461` (Regeln), `src/main.js` (`updateOrientationHint`, `ui.orientationHint`, Aufrufstellen)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts für spätere Tasks.

Hintergrund: Der Hinweis bittet darum, das Gerät zu drehen. Nach Task 6 und 7 ist das Hochformat vollwertig spielbar, der Hinweis also nicht nur überflüssig, sondern falsch.

- [ ] **Step 1: Markup entfernen**

In `index.html` die Zeile löschen:

```html
  <div id="orientationHint" class="orientation-hint hidden">↻ Für die beste Steuerung das Gerät bitte quer halten.</div>
```

- [ ] **Step 2: CSS entfernen**

In `style.css` löschen:
- Die Regel `.orientation-hint { … }` (Z. 433).
- Den Block

```css
@media (orientation: portrait) and (hover: none) and (pointer: coarse) {
  body.playing #orientationHint { display: block !important; }
}
```

Achtung: Das ist **nicht** der in Task 7 hinzugefügte Block mit demselben Media-Query. Nur der Block mit `#orientationHint` wird gelöscht, der neue Layout-Block bleibt.

- [ ] **Step 3: JavaScript entfernen**

In `src/main.js`:
- `orientationHint: $("orientationHint"),` aus dem `ui`-Objekt (Z. 32) löschen.
- Die Funktion `updateOrientationHint()` löschen.
- Den Aufruf `updateOrientationHint()` in der Startsequenz (Z. 1419, in der Zeile `renderMenu(); updateSoundButton(); applyJoystickScale(); updateOrientationHint();`) entfernen.
- Den Resize-Listener kürzen auf:

```javascript
window.addEventListener("resize", () => { engine.resize(); });
```

`engine.resize()` bleibt und deckt den Orientierungswechsel ab. Eine Neuberechnung der Control-Geometrie braucht es nicht: `createTouchInput` liest `getBoundingClientRect()` bei jedem Pointer-Ereignis frisch, die Maße sind also nie zwischengespeichert.

Alle weiteren Aufrufstellen finden und entfernen mit:

```bash
grep -n "orientationHint\|updateOrientationHint" src/main.js index.html style.css
```

Erwartet nach dem Aufräumen: keine Treffer.

- [ ] **Step 4: Verifizieren**

Run: `npm test`
Expected: PASS.

Im Browser bei 390×844 prüfen: Es erscheint kein Hinweis-Band mehr, keine Fehler in der Konsole.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css src/main.js
git commit -m "refactor: drop orientation hint now that portrait is playable"
```

---

# Phase C — Adaptive Qualität

### Task 9: Regel-Logik

**Files:**
- Create: `src/perf/adaptive-quality.js`
- Test: `test/adaptive-quality.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces:
  - `QUALITY_LIMITS: { minScaling, maxScaling, step, targetFps, upgradeFps, windowSize, warmupFrames, maxFailedUpgrades }`
  - `createQualityState(overrides?: object) => QualityState` mit `QualityState: { limits, samples: number[], warmup: number, scaling: number, tier: "high" | "low", failedUpgrades: number, lastAction: "none" | "up" | "down" }`
  - `stepQuality(state: QualityState, frameMs: number) => QualityState` — gibt immer ein **neues** Objekt zurück, verändert das Argument nicht.
  - `median(values: number[]) => number`

Hintergrund: Es gibt nur zwei Stufen, `high` und `low`. Zwei Stufen allein sind zu grob zum Regeln — jeder Wechsel wäre ein sichtbarer Sprung. Deshalb ist das Hardware-Scaling der feine, kontinuierliche Regler und die Stufe kippt erst, wenn das Scaling ausgereizt ist.

- [ ] **Step 1: Write the failing test**

Create `test/adaptive-quality.test.js`:

```javascript
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

test("stepQuality überschreitet die Grenzen nicht", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  for (let round = 0; round < 80; round++) state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  assert.ok(state.scaling <= QUALITY_LIMITS.maxScaling);
  let recovered = state;
  for (let round = 0; round < 80; round++) recovered = feed(recovered, SMOOTH, QUALITY_LIMITS.windowSize);
  assert.ok(recovered.scaling >= QUALITY_LIMITS.minScaling);
});

test("stepQuality regelt bei viel Luft wieder herunter", () => {
  let state = feed(createQualityState(), SMOOTH, QUALITY_LIMITS.warmupFrames);
  state = feed(state, SLOW, QUALITY_LIMITS.windowSize);
  const loaded = state.scaling;
  state = feed(state, SMOOTH, QUALITY_LIMITS.windowSize);
  assert.ok(state.scaling < loaded, `erwartet Erholung, war ${state.scaling}`);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module` für `../src/perf/adaptive-quality.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/perf/adaptive-quality.js`:

```javascript
export const QUALITY_LIMITS = {
  minScaling: 1,
  maxScaling: 2,
  step: 0.15,
  targetFps: 50,     // darunter wird heruntergeregelt
  upgradeFps: 58,    // darüber wird ein Hochstufversuch gewagt
  windowSize: 60,    // Frames pro Messfenster, etwa eine Sekunde
  warmupFrames: 120, // Shader-Kompilierung und Asset-Upload sind nicht repräsentativ
  maxFailedUpgrades: 2,
};

export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function createQualityState(overrides = {}) {
  const limits = { ...QUALITY_LIMITS, ...overrides };
  return {
    limits,
    samples: [],
    warmup: 0,
    scaling: limits.minScaling,
    tier: "high",
    failedUpgrades: 0,
    lastAction: "none",
  };
}

// Nimmt eine Frame-Dauer entgegen und gibt einen neuen Zustand zurück. Entschieden wird
// nur am Ende eines vollen Fensters; dazwischen werden ausschließlich Proben gesammelt.
export function stepQuality(state, frameMs) {
  const limits = state.limits;

  if (state.warmup < limits.warmupFrames) {
    return { ...state, warmup: state.warmup + 1 };
  }

  const samples = [...state.samples, frameMs];
  if (samples.length < limits.windowSize) {
    return { ...state, samples };
  }

  // Median statt Mittelwert: ein einzelner GC-Hänger soll die Qualität nicht drücken.
  const fps = 1000 / median(samples);
  const base = { ...state, samples: [] };

  if (fps < limits.targetFps) {
    // Erst der feine Regler, dann die grobe Stufe.
    const failedUpgrades = state.lastAction === "up"
      ? Math.min(limits.maxFailedUpgrades, state.failedUpgrades + 1)
      : state.failedUpgrades;

    if (state.scaling < limits.maxScaling) {
      const scaling = Math.min(limits.maxScaling, round2(state.scaling + limits.step));
      return { ...base, scaling, failedUpgrades, lastAction: "down" };
    }
    if (state.tier === "high") {
      return { ...base, tier: "low", failedUpgrades, lastAction: "down" };
    }
    return { ...base, failedUpgrades, lastAction: "down" };
  }

  if (fps > limits.upgradeFps && state.failedUpgrades < limits.maxFailedUpgrades) {
    // Rückwärts in der Reihenfolge des Abstiegs: erst die Stufe zurück, dann das Scaling.
    if (state.tier === "low") {
      return { ...base, tier: "high", lastAction: "up" };
    }
    if (state.scaling > limits.minScaling) {
      const scaling = Math.max(limits.minScaling, round2(state.scaling - limits.step));
      return { ...base, scaling, lastAction: "up" };
    }
  }

  return { ...base, lastAction: "none" };
}

// Hält das Scaling auf zwei Nachkommastellen, damit sich Fließkommareste nicht
// über viele Schritte zu sichtbaren Abweichungen aufsummieren.
function round2(value) {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, alle neun neuen Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/perf/adaptive-quality.js test/adaptive-quality.test.js
git commit -m "feat: add adaptive render quality controller"
```

---

### Task 10: Regelung anbinden

**Files:**
- Modify: `src/main.js` (`applyRenderQuality` bei Z. 91–99, Render-Schleife, `startRound`)

**Interfaces:**
- Consumes: `createQualityState`, `stepQuality` aus Task 9; `save.settings.quality`.
- Produces: `qualityTier(): "high" | "low"` — eine Funktion in `main.js`, die die *effektive* Stufe liefert. Task 11 nutzt sie nicht, aber alle bestehenden `save.settings.quality === "low"`-Abfragen werden hierauf umgestellt.

Hintergrund: `save.settings.quality` wird heute an sieben Stellen direkt abgefragt (`main.js` Z. 92, 116, 118, 125, 583, 928, 951). Sobald die Stufe automatisch kippen kann, ist die gespeicherte Einstellung nicht mehr die geltende Stufe. Deshalb eine einzige Funktion, die beides zusammenführt.

Wichtig: Szenenaufbau-Abfragen (Z. 116, 118, 125) laufen einmalig beim Start. Ein späterer Stufenwechsel ändert sie nicht rückwirkend — Schattenauflösung wird zur Laufzeit nicht neu erzeugt. Das ist beabsichtigt: der Effekt greift ab der nächsten Runde. Die Laufzeit-Abfragen (Z. 583, 928, 951) reagieren sofort.

- [ ] **Step 1: Import und Zustand**

In `src/main.js` bei den Imports ergänzen:

```javascript
import { createQualityState, stepQuality } from "./perf/adaptive-quality.js";
```

Neben den anderen Modul-Variablen (bei `let scene;`, Z. 68) ergänzen:

```javascript
let qualityState = createQualityState();
```

- [ ] **Step 2: Effektive Stufe zentralisieren**

Direkt vor `applyRenderQuality()` (Z. 91) einfügen:

```javascript
// Die geltende Stufe ist bei "auto" die geregelte, sonst die gespeicherte Wahl.
function qualityTier() {
  return save.settings.quality === "auto" ? qualityState.tier : save.settings.quality;
}
```

Alle direkten Abfragen umstellen. Treffer finden mit:

```bash
grep -n 'settings\.quality' src/main.js
```

Jede Abfrage der Form `save.settings.quality === "low"` wird zu `qualityTier() === "low"`, jede der Form `save.settings.quality !== "low"` zu `qualityTier() !== "low"`. Die Übergabe an `buildEnvironment` (Z. 125) wird zu:

```javascript
  const environment = buildEnvironment(scene, shadowGenerator, { quality: qualityTier() });
```

Ausgenommen bleiben die Stellen in Task 11, die den *gespeicherten* Wert für die Einstellungs-UI brauchen.

- [ ] **Step 3: `applyRenderQuality` umbauen**

Die Funktion (Z. 91–99) vollständig ersetzen durch:

```javascript
function applyRenderQuality() {
  if (save.settings.quality === "auto") {
    // Die Regelung besitzt das Scaling. Der Geräte-DPR fließt als Startwert ein, damit
    // ein hochauflösendes Display nicht erst eine Sekunde lang ruckeln muss.
    const dprFloor = isTouchDevice && window.devicePixelRatio > 1.5 ? window.devicePixelRatio / 1.45 : 1;
    engine.setHardwareScalingLevel(Math.max(dprFloor, qualityState.scaling));
    return;
  }
  if (save.settings.quality === "low") {
    engine.setHardwareScalingLevel(Math.max(1.35, window.devicePixelRatio || 1));
  } else if (isTouchDevice && window.devicePixelRatio > 1.5) {
    engine.setHardwareScalingLevel(window.devicePixelRatio / 1.45);
  } else {
    engine.setHardwareScalingLevel(1);
  }
}
```

- [ ] **Step 4: In die Frame-Schleife hängen**

Die Pro-Frame-Funktion ist `update()` in `src/main.js:408`, angemeldet über `scene.onBeforeRenderObservable` (Z. 132). Nicht der `runRenderLoop`-Callback (Z. 1418) — der ruft nur `scene.render()`.

In `update()` direkt nach der `dt`-Zeile (Z. 409) einfügen:

```javascript
  // Gemessen wird die ungeklemmte Frame-Zeit in Millisekunden: dt oben ist auf 50 ms
  // gedeckelt, ein echter Einbruch wäre darin nicht mehr sichtbar.
  if (save.settings.quality === "auto" && state.playing && !state.paused) {
    const previous = qualityState;
    qualityState = stepQuality(previous, engine.getDeltaTime());
    // Nur anfassen, wenn sich wirklich etwas geändert hat -- setHardwareScalingLevel
    // verwirft interne Render-Targets.
    if (qualityState.scaling !== previous.scaling) applyRenderQuality();
  }
```

- [ ] **Step 5: Zustand pro Runde zurücksetzen**

Der Ort ist `resetRoundState()` in `src/main.js:1062`, nicht `startRound()` — dort liegen die übrigen Zurücksetzungen. In der Zeile mit `resetTouchInput(); resetZoneGuidance(); clearItemHighlight();` (Z. 1067, nach Task 3 bereits auf `touchInput.reset()` umgestellt) ergänzen:

```javascript
  // Jede Runde beginnt mit frischer Warmlaufphase: Szenenaufbau verzerrt die Messung.
  qualityState = createQualityState();
```

- [ ] **Step 6: Verifizieren**

Run: `npm test`
Expected: PASS.

Im Browser prüfen:
- Mit Einstellung „Hoch" und „Leicht": Verhalten unverändert gegenüber vorher.
- Mit gedrosselter CPU (DevTools → Performance → CPU 6× slowdown) und Einstellung „Automatisch": Die Bildrate stabilisiert sich innerhalb weniger Sekunden, das Bild wird sichtbar weicher, das Spiel bleibt spielbar.
- Drosselung wieder aufheben: Die Schärfe kehrt über einige Sekunden zurück.
- Konsole bleibt fehlerfrei.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: drive render quality from the adaptive controller"
```

---

### Task 11: Einstellung „Automatisch"

**Files:**
- Modify: `index.html:169` (Select), `src/save.js:41` (Default), `src/main.js` (`qualitySetting`-Listener)

**Interfaces:**
- Consumes: `applyRenderQuality()`, `createQualityState()` aus Task 10.
- Produces: nichts für spätere Tasks.

- [ ] **Step 1: Option ergänzen**

In `index.html` das Select erweitern — „Automatisch" steht vorne, weil es der Default ist:

```html
<select id="qualitySetting"><option value="auto">Automatisch</option><option value="high">Hoch</option><option value="low">Leicht</option></select>
```

Den Hilfstext derselben Zeile anpassen von `„Leicht" schont schwächere Geräte.` auf:

```html
<small>„Automatisch" passt sich der Bildrate an.</small>
```

- [ ] **Step 2: Default umstellen**

In `src/save.js` in `createDefaultSave()` (Z. 41):

```javascript
      quality: "auto",
```

Bestehende Spielstände behalten ihren Wert, weil `loadSave()` Legacy-Settings über die Defaults merged (`save.js:66`).

- [ ] **Step 3: Wechsel behandeln**

Den bestehenden Listener finden:

```bash
grep -n "qualitySetting.addEventListener" src/main.js
```

Er steht in `src/main.js:1412` und lautet aktuell:

```javascript
ui.qualitySetting.addEventListener("change", () => { save.settings.quality = ui.qualitySetting.value; persistSave(save); applyRenderQuality(); showToast("Grafikqualität angepasst", "good"); });
```

Ersetzen durch — der Regel-Zustand muss zurückgesetzt werden, damit ein Wechsel nach „Automatisch" nicht mit Messwerten aus der vorherigen Einstellung startet:

```javascript
ui.qualitySetting.addEventListener("change", () => {
  save.settings.quality = ui.qualitySetting.value;
  persistSave(save);
  qualityState = createQualityState();
  applyRenderQuality();
  showToast("Grafikqualität angepasst", "good");
});
```

- [ ] **Step 4: Verifizieren**

Run: `npm test`
Expected: PASS, insbesondere `test/save.test.js` unverändert grün.

Im Browser prüfen:
- Ein frischer Spielstand (localStorage leeren) startet mit „Automatisch".
- Ein bestehender Spielstand mit „Hoch" behält „Hoch".
- Umschalten zwischen den drei Optionen wirkt sofort und übersteht einen Reload.

- [ ] **Step 5: Commit**

```bash
git add index.html src/save.js src/main.js
git commit -m "feat: add automatic graphics quality setting"
```

---

## Abschluss

- [ ] **Vollständiger Testlauf**

Run: `npm test`
Expected: PASS, alle Testdateien grün.

- [ ] **Manuelle Gesamtprüfung**

Eine vollständige Runde spielen, je einmal in:
- 390×844 mit emuliertem Touch (Hochformat)
- 844×390 mit emuliertem Touch (Querformat)
- 1440×900 mit Maus (Desktop, muss unverändert sein)

- [ ] **CHANGELOG ergänzen**

In `CHANGELOG.md` einen Eintrag für die Mobile-Optimierung anlegen, im Format der bestehenden Einträge.

- [ ] **Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: note mobile optimization in changelog"
```
