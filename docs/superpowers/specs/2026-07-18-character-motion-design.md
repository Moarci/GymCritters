# Lebendige Charakterbewegung – Design

## Kontext

Rocco und Fibi wirken beim Spielen wie Puppen, obwohl das Reaktionssystem (`setReaction`/`updateReaction`) existiert und verdrahtet ist. Drei belegbare Ursachen in `animateCharacter()` ([src/main.js](../../../src/main.js)):

1. **Die Tragehaltung ignoriert, was getragen wird.** Beide Arme stehen beim Tragen fix auf `rotation.x = -1.05` — egal ob 130-Punkte-Kettlebell, sperrige Matte oder Handtuch. Die Gewichtsklassen stehen in `ITEM_TYPES`, sind aber unsichtbar.
2. **Der Gang kennt kein Gewicht.** Frequenz und Intensität hängen nur von `moving`/`sprinting` ab. Eine Hantel verlangsamt zwar die Geschwindigkeit (`heavyPenalty`), aber der Körper zeigt nichts davon.
3. **Im Stillstand passiert fast nichts** (Intensität 0,12) und in Kurven bleibt die Figur kerzengerade.

## Ziel

Die Figuren sollen zeigen, was sie tun: was sie schleppen, wie schwer es ist, wohin sie sich wenden — und im Stillstand atmen statt einzufrieren.

## Nicht-Ziele

- Keine Geometrie-Änderungen (Fibis Schwanz-Proportionen sind Phase 2, eigene Spec).
- Keine Änderung an Tempo-Werten (`walkSpeed`, `heavyPenalty` …) — nur an der Darstellung.
- Kein Eingriff ins Kamera-System.
- Keine Skeleton-/Bone-Animation — es bleibt bei prozeduraler Bewegung der vorhandenen Teile.

## Design

### 1. Reines Modul `src/character-motion.js`

Nach dem Muster von `impact.js`/`targeting.js`: reine Funktionen, testbar ohne Browser. Die Anwendung auf Babylon-Meshes bleibt in `main.js`.

| Funktion | Rückgabe |
|---|---|
| `dominantWeight(weights)` | schwerste Klasse aus einer Liste (`heavy` > `bulky` > `light`), `null` bei leerer Liste |
| `carryPose(weight)` | `{ armX, armZ, torsoLean }` — Gelenkwinkel je Gewichtsklasse |
| `gaitParams(weight, sprinting, moving)` | `{ frequency, intensity, armSwing, bob }` |
| `curveLean(angularVelocity)` | seitliche Neigung, begrenzt und vorzeichenrichtig |
| `idleMotion(t)` | `{ breath, tailFlick }` — deterministisch aus der Zeit, kein Zufall im Render-Loop |

### 2. Tragehaltung nach Gewichtsklasse

| Klasse | Haltung |
|---|---|
| `heavy` | Arme tief und nah am Körper (`armX ≈ -0.55`), Oberkörper lehnt spürbar zurück (`torsoLean`) — die klassische „schwere Kiste"-Silhouette |
| `bulky` | Arme weit auseinander (`armZ` groß), mittlere Höhe — Umklammern statt Heben |
| `light` | nahe der heutigen Haltung (`armX ≈ -1.05`), kein Zurücklehnen |

`torsoLean` wird auf `playerVisual.rotation.x` angewandt. Diese Achse beschreibt heute niemand — kein Kompositionskonflikt. Beim Ablegen wird sie weich auf 0 zurückgeführt.

### 3. Gang mit Gewicht

`gaitParams` ersetzt die heutigen Inline-Konstanten:

- Basis unverändert: Gehen 9 Hz / Intensität 0,78, Sprint 13 Hz / 1,1, Stillstand 2,2 Hz / 0,12 — **die heutige Optik ohne Last bleibt exakt erhalten**.
- `heavy`: Frequenz ×0,8, `bob` ×1,5 (schwerere, stampfendere Schritte), `armSwing` ×0 (Arme sind belegt).
- `bulky`: Frequenz ×0,85, `bob` ×1,2.
- `light`: Frequenz ×0,95.

### 4. Kurvenneigung

`updatePlayer` kennt die Drehgeschwindigkeit der Figur (Differenz der `rotation.y`-Zielwinkel pro Frame). `curveLean` macht daraus eine seitliche Neigung, hart begrenzt auf ±0,18 rad.

**Kompositionsregel:** `updateReaction` schreibt heute `playerVisual.rotation.z` (Kopfschütteln bei Fehlablage) und lerpt sie sonst auf 0 zurück. Damit Neigung und Reaktion sich nicht überschreiben, wird die Ruhelage parametrisiert: `updateReaction` lerpt auf `state.lean` statt auf 0. Eine aktive Reaktion gewinnt weiterhin — sie ist kurz und bedeutungstragend.

### 5. Leerlauf

Wenn die Figur steht und nichts trägt:

- **Atmen:** sanfte periodische Skalierung des Rumpf-Meshes (`playerParts.body.scaling.y`, Amplitude ~1,5 %).
- **Schwanzzucken:** gelegentliche schnelle Zuckbewegung zusätzlich zum vorhandenen Wedeln. Deterministisch über eine gepulste Kurve (`max(0, sin(0.9·t))^8`) — **kein `Math.random()` im Render-Loop**, damit das Verhalten reproduzierbar und testbar bleibt.

Bewusst weggelassen: Kopfdrehen/Umschauen. Kopf, Schnauze und Augen sind Geschwister unter `playerVisual`, nicht am Kopf-Mesh verankert — eine Kopfdrehung würde die Kugel unsichtbar drehen und Schnauze/Augen stehenlassen. Das wäre erst nach einer Reparenting-Umbau möglich (Phase 2).

## Randfälle

- **Fibi trägt zwei verschiedene Klassen:** `dominantWeight` entscheidet — zwei leichte Gegenstände ergeben `light`, sobald etwas Schweres dabei wäre (heute unmöglich, `canPickUp` verhindert das), gewänne es.
- **Reaktion während Kurvenneigung:** Reaktion gewinnt (siehe Kompositionsregel), danach kehrt die Neigung weich zurück.
- **Charakterwechsel im Menü:** `buildCharacter` erzeugt frische Teile; alle Winkel starten von den Ausgangswerten — kein Zustand überlebt den Wechsel.

## Betroffene Dateien

- `src/character-motion.js` — neu, reine Logik
- `test/character-motion.test.js` — neu
- `src/main.js` — `animateCharacter` nutzt die Modul-Funktionen; `updatePlayer` liefert die Drehgeschwindigkeit; `updateReaction` lerpt auf `state.lean`

## Verifikation

**Unit-Tests:**
- `dominantWeight`: Rangfolge, leere Liste → `null`
- `carryPose`: drei unterscheidbare Posen; `heavy` lehnt zurück, `light` nicht; unbekannte Klasse fällt auf `light` zurück
- `gaitParams`: ohne Last exakt die heutigen Werte; `heavy` langsamer und stampfender als `light`; Sprint schneller als Gehen; `armSwing` bei Last reduziert
- `curveLean`: 0 bei 0, Vorzeichen folgt der Drehrichtung, Betrag hart bei 0,18 gedeckelt
- `idleMotion`: beschränkt (Atmen ±2 %), periodisch, Zuckkurve meist nahe 0 mit gelegentlichen Spitzen

**Browser-Prüfung:**
1. Hantel tragen → Arme sichtbar tiefer, Rücklage; Handtuch → lockere Haltung; Matte → breite Arme
2. Mit Hantel laufen → langsamerer, stampfenderer Schritt als unbeladen
3. Enge Kurven laufen → Figur legt sich hinein, kippt aber nie um (Deckel)
4. Stehen bleiben → Atmen sichtbar, Schwanz zuckt gelegentlich
5. Fehlablage während einer Kurve → Kopfschütteln gewinnt, danach kehrt die Neigung zurück
6. Charakterwechsel → keine verzerrten Startposen
