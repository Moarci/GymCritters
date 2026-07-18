# Erweiterung: Neue Gegenstände & Ablageorte

## Kontext

Gym Critters V4 kennt aktuell vier Gegenstandstypen (`ITEM_TYPES` in [src/config.js](../../../src/config.js)), jeder mit genau einem festen Ablageort (`targetZone`):

| Gegenstand | Gewicht | Punkte | Zone |
|---|---|---|---|
| Hantel | heavy | 125 | rack (Hantelregal) |
| Handtuch | light | 50 | laundry (Wäschekorb) |
| Trinkflasche | light | 75 | bottles (Flaschenbox) |
| Trainingsmatte | bulky | 100 | mats (Mattenregal) |

Jede Zone ist ein eigenes handgebautes 3D-Objekt in [src/main.js](../../../src/main.js) (`createDumbbellRack`, `createLaundryZone`, `createBottleZone`, `createMatZone`), registriert über `addZone(id, label, type, position, radius, color)` und blockiert die Laufwege über einen Eintrag in `obstacles`. Alle 3 Level (`closing`, `class`, `legday`) teilen sich dieselben vier Zonen und unterscheiden sich nur über `itemWeights` (gewichtete Zufallsauswahl) und `spawnPool` (Spawnpunkte).

`buildSpecs()` erzwingt zusätzlich eine `mandatory`-Liste (`["towel", "bottle", "dumbbell", "mat"]`), die unabhängig von `itemWeights` in jeder Runde mindestens einmal vorkommt.

## Ziel

Drei neue Gegenstände mit passenden neuen Ablageorten ergänzen, ohne bestehende Spielbalance, Tragemechanik oder Levelstruktur zu brechen. Umfang: **mittel** (3 Gegenstände + 3 Zonen), Integration in die drei bestehenden Level statt eines neuen Levels.

## Neue Gegenstände

| Gegenstand | id | Gewicht | Punkte | Icon | Zone |
|---|---|---|---|---|---|
| Kettlebell | `kettlebell` | heavy | 130 | 🔔 | `kettlebells` |
| Springseil | `rope` | light | 65 | 🪢 | `ropes` |
| Medizinball | `medball` | bulky | 105 | 🥎 | `medballs` |

Die Gewichtsklassen sind bewusst identisch zu den drei bestehenden Klassen (`heavy`, `light`, `bulky`) — es entsteht **keine neue Trage-Mechanik**, nur neue visuelle/thematische Varianten:
- `kettlebell` verhält sich wie `dumbbell` (einzeln tragbar, `heavyPenalty`, `heavyScoreBonus`).
- `rope` verhält sich wie `towel`/`bottle` (bis zu `lightCapacity` gleichzeitig tragbar).
- `medball` verhält sich wie `mat` (einzeln tragbar, `bulkyPenalty`, kein Sprint).

## Neue Ablageorte

Positionen wurden gegen bestehende `obstacles` (Zonen, Bänke, Squat-Rack, Pflanzen) geprüft, um Überschneidungen zu vermeiden:

| Zone | id | Label | Position | Radius | Beschreibung |
|---|---|---|---|---|---|
| Kettlebell-Ecke | `kettlebells` | "Kettlebell-Ecke" | `(-11.9, 0, 0.6)` | 1.8 | kleines Gestell an der linken Seitenwand, mittig |
| Seilhaken | `ropes` | "Seilhaken" | `(11.9, 0, 0.6)` | 1.8 | Hakenleiste an der rechten Seitenwand, mittig |
| Ballnetz | `medballs` | "Ballnetz" | `(-3.6, 0, 8.4)` | 1.9 | Netzkorb an der Rückwand, links neben dem Squat-Rack |

Jede Zone bekommt eine eigene kleine Aufbaufunktion (`createKettlebellRack`, `createRopeHooks`, `createMedballNet`) nach demselben Muster wie die bestehenden vier (`addZone(...)` + `obstacles.push(...)`), aufgerufen aus `createZones()`.

## Integration in bestehende Level

`itemWeights` der drei Level werden um die neuen Typen ergänzt, thematisch passend zum jeweiligen Level:

| Level | kettlebell | rope | medball |
|---|---|---|---|
| Feierabend (`closing`) — gemischtes Chaos | 2 | 2 | 2 |
| Nach dem Kurs (`class`) — leicht/Cardio | 1 | 4 | 2 |
| Leg Day Chaos (`legday`) — schwer | 5 | 1 | 3 |

**Entscheidung: `mandatory` in `buildSpecs()` bleibt unverändert** (`["towel", "bottle", "dumbbell", "mat"]`). Die drei neuen Typen werden *nicht* als Pflicht-Items ergänzt.

Begründung: Der Entspannt-Modus hat `itemCount: 8`. Mit 7 Pflicht-Typen (4 alte + 3 neue) blieben nur noch 1 Slot für die gewichtete Zufallsauswahl übrig — das würde die gewichtsbasierte Level-Differenzierung praktisch abschalten und in fast jeder Runde exakt dieselbe Grundzusammensetzung erzwingen. Die neuen Items sind über `itemWeights` verfügbar (garantiert häufig, aber nicht zwingend in jeder Runde), die alten vier bleiben der verlässliche Kern jeder Runde.

## Nicht-Ziele

- Kein neues Level.
- Keine neuen Achievements (bestehende referenzieren keine spezifischen Item-Typen außer `dumbbell`, bleiben unverändert).
- Keine Änderung an `CHARACTERS`, `MODES`, `SHOP_ITEMS` oder der Speicherstand-Migration (`save.js`, `SAVE_VERSION`).
- Keine Änderung an der Trage-/Punktelogik selbst (`heavyPenalty`, `bulkyPenalty`, `lightCapacity`) — neue Items nutzen ausschließlich bestehende Gewichtsklassen.

## Betroffene Dateien

- `src/config.js` — drei neue `ITEM_TYPES`-Einträge, `itemWeights` in `LEVELS` erweitert.
- `src/main.js` — drei neue Zonen-Aufbaufunktionen + Aufruf in `createZones()`, drei neue Item-Mesh-Funktionen + Erweiterung von `createItemMesh()`.

## Verifikation

Das Projekt hat keine automatisierten Tests (reines Browsergame ohne Test-Setup). Verifikation erfolgt manuell:
1. Spiel lokal starten (`python start_game.py` oder `start-game.bat`).
2. Für jedes der drei Level je einmal spielen und prüfen: neue Gegenstände spawnen, sind sichtbar unterscheidbar, lassen sich aufnehmen/tragen/ablegen, korrekte Punktzahl wird vergeben, keine Kollision/Clipping an den neuen Zonen-Positionen.
3. Prüfen, dass die alten vier Gegenstände weiterhin in jeder Runde mindestens einmal vorkommen (mandatory-Liste unverändert).
