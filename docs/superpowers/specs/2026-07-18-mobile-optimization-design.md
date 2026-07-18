# Mobile-Optimierung — Design

Datum: 2026-07-18
Status: Entwurf abgenommen, Implementierungsplan ausstehend

## Ausgangslage

Eine Mobile-Schicht existiert bereits: DOM-Joystick mit Action-Buttons, Safe-Area-Insets,
Breakpoints bei 900/680/620 px, ein Landscape-Kurz-Breakpoint, ein Orientierungshinweis,
eine Control-Scale-Einstellung und DPR-abhängiges Hardware-Scaling.

Drei Bereiche bleiben offen: Steuerungsergonomie, Performance auf Mid-Range-Geräten und
das Layout im Hochformat.

## Ziele

1. Hochformat wird vollwertig spielbar, nicht nur toleriert.
2. Touch-Steuerung erlaubt gleichzeitiges Laufen und Umsehen ohne Kamerasprünge.
3. Bildrate reguliert sich selbst, statt vom Spieler eingestellt werden zu müssen.

## Nicht-Ziele

- Keine kontinuierliche Auto-Follow-Kamera. Die Rotation fließt einseitig von der Kamera
  zum Spieler; ein Rückkanal würde den bekannten Feedback-Loop wieder einführen.
- Kein Orientation-Lock. Hochformat wird unterstützt, nicht verboten.
- Kein Refactoring jenseits der Bereiche, die diese Arbeit ohnehin anfasst.

## Modulschnitt

`src/main.js` hat 1410 Zeilen und überschreitet damit die 800-Zeilen-Grenze der
Projektkonventionen. Die Touch-Eingabe liegt dort als inline-Block (ca. Z. 1337–1390).
Da genau dieser Bereich umgebaut wird, wandert er in eigene Module.

| Modul | Verantwortung | Abhängigkeiten |
|---|---|---|
| `src/input/joystick.js` | Pointer-Position → Richtungsvektor; Deadzone, Clamping, Recentering | DOM-Element, Config |
| `src/input/touch-look.js` | Look-Pointer verfolgen → `{deltaYaw, deltaPitch}` pro Frame | DOM, Config |
| `src/input/index.js` | Bündelt beides zu einem `TouchInput`, das `main.js` pro Frame ausliest | die beiden obigen |
| `src/perf/adaptive-quality.js` | Frame-Zeiten auswerten, Qualitätsstufe vorschlagen (reine Logik) | keine |

Leitprinzip: `touch-look.js` liefert ausschließlich Deltas und schreibt die Kamera nicht
selbst. `main.js` wendet sie an. Damit bleibt die Kameraausrichtung an genau einer Stelle
beschrieben und der einseitige Fluss ist strukturell abgesichert.

Analog entscheidet `adaptive-quality.js` nur, *welche* Stufe gelten soll; das Anwenden
bleibt in `applyRenderQuality()`. Dadurch ist die Heuristik ohne Babylon-Engine testbar.

## Steuerung

### Look-Zone

Die Look-Zone wird nicht geometrisch berechnet, sondern ergibt sich aus dem
DOM-Hit-Testing: Joystick und Buttons sind Overlays mit `pointer-events: auto`; ein
`pointerdown`, das den Canvas erreicht, liegt per Definition auf keinem Control. Die
Look-Zone ist damit der Canvas selbst — ohne Zonen-Mathematik, in Portrait und Landscape
gleichermaßen korrekt.

`camera.attachControl()` entfällt auf Touch-Geräten. Stattdessen eigene Pointer-Handler
auf dem Canvas, die per `pointerId` genau einen Look-Finger verfolgen. Das behebt zugleich
den Multitouch-Konflikt: Babylons Canvas-Control deutet einen zweiten Finger als
Pinch-Zoom, weshalb heute gleichzeitiges Laufen und Umsehen die Kamera springen lässt.

Auf dem Desktop bleibt `attachControl` unverändert.

### Joystick

Deadzone von etwa 0,15 gegen Daumen-Drift beim Halten, Clamping der Magnitude auf 1,
Recentering des Knobs beim Loslassen. Kurve und Verhalten liegen in `joystick.js` und
sind ohne DOM prüfbar.

### Recenter

Der vorhandene `cameraButton` (⌖, `index.html`) ruft bereits `resetCamera()` als One-Shot
auf, sitzt aber oben rechts im HUD außerhalb der Daumenreichweite. Auf Touch-Geräten
wandert er neben die Action-Buttons unten rechts. Verhalten bleibt unverändert.

## Hochformat

Der kritische Punkt ist die Kamera, nicht das HUD. Babylon hält standardmäßig das
vertikale FOV konstant; in einem 9:19,5-Viewport schrumpft dadurch das horizontale
Sichtfeld so stark, dass die Halle nicht mehr überblickbar ist. Mit
`FOVMODE_HORIZONTAL_FIXED` bleibt die Breite stabil und das Hochformat gewinnt oben und
unten Bild hinzu, statt seitlich zu verlieren.

Layout im Hochformat:

- Stats-Karte auf eine kompakte Zeile.
- Objective und Progress direkt darunter verankert statt frei positioniert.
- Navigator verkleinert.
- Mehr Bodenabstand für die Controls, da der Daumen im Hochformat tiefer greift.
- `orientationHint` entfällt ersatzlos.

## Adaptive Qualität

Es existieren nur zwei Stufen, `high` und `low` (`save.js`, `index.html`). Zwei Stufen
sind zu grob zum Regeln — jeder Wechsel wäre ein sichtbarer Sprung. Deshalb werden zwei
heute vermischte Dinge getrennt:

- **Hardware-Scaling** (`engine.setHardwareScalingLevel`) wird der kontinuierliche Regler,
  etwa 1,0 bis 2,0 in kleinen Schritten. Billig, sofort wirksam, pro Schritt kaum
  wahrnehmbar. Hier greift die Automatik zuerst.
- **Die Stufe high/low** (Schattenauflösung, Partikelzahl, Trail-Effekt) bleibt diskret
  und kippt erst, wenn das Scaling ausgereizt ist und die Bildrate weiterhin zu niedrig
  liegt.

Regelverhalten:

- Gleitendes Fenster über die Frame-Zeiten, Median statt Mittelwert, damit ein einzelner
  GC-Hänger nicht herunterregelt.
- Herunterregeln schnell, Heraufregeln zögerlich und mit Hysterese.
- Nach zwei erfolglosen Hochstuf-Versuchen bleibt die Automatik unten, statt zu pendeln.
- Warmlaufphase: die ersten Sekunden nach Spielstart werden ignoriert (Shader-Kompilierung
  und Asset-Upload sind nicht repräsentativ).

Das Qualitäts-Dropdown erhält „Automatisch" als dritte Option, Default auf Touch-Geräten.
Eine manuelle Wahl von `high` oder `low` schaltet die Automatik ab.

## Fehlerbehandlung

Der schwerwiegendste Fall ist ein hängender Input: Wird der Tab in den Hintergrund
geschoben oder reißt der Pointer-Capture ab, während der Joystick gehalten wird, läuft die
Figur unbegrenzt weiter. `visibilitychange`, `pointercancel` und `blur` münden deshalb in
einen gemeinsamen Reset-Pfad, der den gesamten Touch-State neutralisiert.

Orientierungswechsel lösen `engine.resize()` und eine Neuberechnung der Control-Geometrie
aus. Fehlendes `navigator.vibrate` ist bereits abgesichert und bleibt es.

## Teststrategie

Die drei neuen Module sind bewusst frei von DOM und Babylon und damit über das vorhandene
`node --test` abdeckbar. Vorgehen testfirst:

- `joystick.js`: Deadzone, Clamping auf Magnitude 1, Recentering, Diagonalen.
- `touch-look.js`: Delta-Berechnung inklusive Sensitivity-Skalierung, Pointer-Wechsel.
- `adaptive-quality.js`: Herunterregeln unter Last, Hysterese, Pendel-Sperre nach zwei
  Versuchen, Ignorieren der Warmlaufphase, Median-Robustheit gegen Ausreißer.

Nicht automatisiert prüfbar sind Layout im Hochformat, Daumenreichweite und FOV-Wirkung.
Diese werden per Playwright mit emuliertem Touch-Viewport und Screenshots verifiziert.

## Offene Risiken

- `FOVMODE_HORIZONTAL_FIXED` verändert auch das Landscape-Bild leicht. Der bestehende
  Bildeindruck im Querformat ist nach der Umstellung gegenzuprüfen.
- Die Schwellwerte der Regelung (Ziel-FPS, Fenstergröße, Schrittweite) sind Startwerte und
  brauchen eine Runde Kalibrierung auf echter Hardware.
