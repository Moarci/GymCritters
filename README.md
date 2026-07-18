<div align="center">

# 🦝🐿️ Gym Critters V4 — Critter Crew

**3D-Browsergame ohne Build-Schritt, ohne Server, ohne Account — Rocco der Waschbär und Fibi das Eichhörnchen räumen das Gym auf.**

**v4.0.0** — Zwei Charaktere, Münzshop, Achievements, drei Level, drei Tempi, Tutorial, Mobile-Steuerung

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Babylon.js](https://img.shields.io/badge/Babylon.js-via_CDN-BB464B?style=flat-square&logo=babylondotjs&logoColor=white)](https://www.babylonjs.com)
[![Build](https://img.shields.io/badge/Build-none_required-success?style=flat-square)]()
[![Dependencies](https://img.shields.io/badge/npm_Dependencies-0-success?style=flat-square)]()
[![Play](https://img.shields.io/badge/▶_Play-Live_Demo-2ea44f?style=flat-square)](https://moarci.github.io/GymCritters/)
[![GitHub Pages](https://img.shields.io/badge/Deployed_on-GitHub_Pages-222222?style=flat-square&logo=github&logoColor=white)](https://moarci.github.io/GymCritters/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

Kamera-relative 3D-Steuerung — Synthetisches Audio via Web Audio API — localStorage-Spielstand — Zero Server-Side State

**[🎮 Jetzt spielen](https://moarci.github.io/GymCritters/)** &nbsp;&nbsp;|&nbsp;&nbsp; **[🕹 Steuerung](#-steuerung)** &nbsp;&nbsp;|&nbsp;&nbsp; **[🚀 Schnellstart](#-schnellstart)** &nbsp;&nbsp;|&nbsp;&nbsp; **[📝 Changelog](#changelog)**

<details>
<summary><b>Inhaltsverzeichnis</b></summary>

- [Überblick](#überblick)
- [Features](#features)
- [Alle Inhalte im Detail](#alle-inhalte-im-detail)
- [Steuerung](#-steuerung)
- [Architektur](#-architektur)
- [Schnellstart](#-schnellstart)
- [Deployment](#-deployment)
- [Spielstand & Datenmodell](#spielstand--datenmodell)
- [Sicherheit](#-sicherheit)
- [Design-Prinzipien](#-design-prinzipien-golden-rules)
- [Roadmap](#roadmap)
- [Changelog](#changelog)
- [Contributing](#-contributing)
- [Lizenz](#-lizenz)

</details>

</div>

---

## Überblick

Gym Critters ist ein charmantes 3D-Aufräumspiel für den Browser: Rocco der Waschbär (und die freischaltbare Fibi, das Eichhörnchen) räumen ein chaotisches Fitnessstudio auf, bevor die Zeit abläuft — Hanteln zurück ins Rack, Handtücher in die Wäsche, Flaschen zum Pfand, Matten gestapelt.

Kein Account, keine Cloud, kein Tracking: Das gesamte Spiel läuft als statische Datei im Browser, der Spielstand liegt ausschließlich lokal in `localStorage`.

**Kernprinzipien:**

- **Zero Backend** — Keine API, keine Datenbank, kein Server-Prozess im Betrieb. Ein statischer Webserver liefert nur Dateien aus (siehe [Schnellstart](#-schnellstart)).
- **Zero Dependencies** — `package.json` enthält keine einzige npm-Abhängigkeit. Die einzige externe Laufzeit-Abhängigkeit ist Babylon.js, per CDN geladen (mit optionalem lokalem Fallback).
- **Config-driven Balancing** — Modi, Level, Charaktere, Items, Shop und Achievements sind vollständig in [`src/config.js`](src/config.js) deklariert — keine Werte verstreut im Code.
- **Additive Spielstand-Migration** — Neue Save-Versionen mergen mit den Defaults, alte V3-Spielstände werden automatisch migriert (siehe [Spielstand & Datenmodell](#spielstand--datenmodell)).

---

## Features

| Feature | Beschreibung |
|---|---|
| **Zwei spielbare Charaktere** | Rocco (stark, Punktebonus auf Hanteln) und die freischaltbare Fibi (schnell, trägt zwei leichte Gegenstände gleichzeitig) — unterschiedliche Lauf-, Sprint- und Tragwerte. |
| **Drei Level-Varianten** | Feierabend, Nach dem Kurs, Leg Day Chaos — je eigene Item-Gewichtung und Spawn-Layout. |
| **Drei Spieltempi** | Entspannt, Standard, Blitz — unterschiedliche Rundenzeit, Item-Anzahl und Punkte-Multiplikator. |
| **Münzshop** | Sichtbare Cosmetics (Stirnbänder, Schweißbänder, Sonnenbrille, Laufspur) und Fibi-Freischaltung, käuflich mit erspielten Münzen. |
| **Achievements & Karrierestatistik** | 7 Achievements, modusgetrennte Bestwerte, Bestzeiten und Ränge (D bis S). |
| **Interaktives Tutorial** | Geführte erste Schicht für neue Spieler:innen, jederzeit über die Einstellungen erneut abrufbar. |
| **Mobile-Steuerung** | Virtueller Joystick, Touch-Aktionsbuttons, Vibrationsfeedback, Grafikmodus „Leicht" für schwächere Geräte. |
| **Synthetisches Audio** | Soundeffekte und Hintergrundmusik werden zur Laufzeit per Web Audio API erzeugt — keine Audio-Dateien im Repo. |
| **Kamera-relative 3D-Steuerung** | Freie Maus-Look-Kamera, Bewegung folgt der Kamera-Ausrichtung, Figur richtet sich sauber zur Laufrichtung aus — siehe [Design-Entscheidungen](#design-entscheidungen). |

---

## Alle Inhalte im Detail

<details>
<summary><strong>Spieltempi (Modi)</strong></summary>

| Modus | Zeit | Items | Punkte-Multiplikator | Zielhilfe (Navigator) |
|---|---|---|---|---|
| Entspannt | 180 s | 8 | ×0,9 | immer aktiv |
| Standard | 120 s | 10 | ×1,0 | immer aktiv |
| Blitz | 90 s | 12 | ×1,3 | nur beim Tragen |

</details>

<details>
<summary><strong>Level</strong></summary>

| Level | Beschreibung |
|---|---|
| Feierabend | Gemischtes Chaos im ganzen Gym — Hanteln, Handtücher, Flaschen, Matten gleich gewichtet |
| Nach dem Kurs | Schwerpunkt Matten, Handtücher, Flaschen |
| Leg Day Chaos | Schwerpunkt Hanteln, engere Wege |

</details>

<details>
<summary><strong>Charaktere</strong></summary>

| Charakter | Spezies | Lauf-/Sprinttempo | Besonderheit |
|---|---|---|---|
| Rocco | Waschbär | 4,2 / 6,3 | Startcharakter. +20 % Punkte auf Hanteln, weniger Tempoverlust mit schwerem Gepäck |
| Fibi *(freischaltbar, 250 Münzen)* | Eichhörnchen | 5,0 / 7,25 | Trägt zwei leichte Gegenstände gleichzeitig, insgesamt schneller |

</details>

<details>
<summary><strong>Gegenstände</strong></summary>

| Item | Punkte | Zielzone | Gewichtsklasse |
|---|---|---|---|
| Hantel | 125 | Rack | schwer |
| Kettlebell | 130 | Kettlebell-Ecke | schwer |
| Trainingsmatte | 100 | Mattenzone | sperrig |
| Medizinball | 105 | Ballnetz | sperrig |
| Trinkflasche | 75 | Pfandzone | leicht |
| Springseil | 65 | Seilhaken | leicht |
| Handtuch | 50 | Wäsche | leicht |

</details>

<details>
<summary><strong>Shop-Artikel</strong></summary>

| Artikel | Slot | Kosten |
|---|---|---|
| Limetten-Stirnband | Kopf | 0 (Start-Cosmetic) |
| Rotes Stirnband | Kopf | 40 |
| Blaues Stirnband | Kopf | 60 |
| Schweißbänder | Handgelenk | 75 |
| Sonnenbrille | Gesicht | 120 |
| Fibi freischalten | Charakter | 250 |
| Goldene Laufspur | Trail | 400 |

</details>

<details>
<summary><strong>Achievements</strong></summary>

| Achievement | Bedingung |
|---|---|
| Erste Schicht | Eine Runde beenden |
| Klebrige Pfoten | Eine Runde ohne Fallenlassen schaffen |
| Perfekte Ordnung | Komplette Runde ohne Combo-Unterbrechung |
| Schwerarbeiter | Insgesamt 10 Hanteln aufgeräumt |
| Gym-Held | Insgesamt 50 Gegenstände aufgeräumt |
| Blitzsauber | Standard-Modus in ≤ 75 Sekunden |
| Sammler | 4 Shop-Artikel im Besitz |

</details>

---

## 🕹 Steuerung

| Eingabe | Aktion |
|---|---|
| `WASD` / Pfeiltasten | Laufen (kamerarelativ) |
| Maus | Kamera frei drehen |
| `E` | Aufnehmen, zusätzlich einsammeln, ablegen |
| `Shift` | Sprinten — nicht mit Hanteln oder Matten |
| `C` | Kamera hinter der Figur ausrichten |
| `Esc` / `P` | Pause |
| Touch (Mobilgeräte) | Virtueller Joystick + Aktionsbuttons |

---

## 🏗 Architektur

### Projektstruktur

```
GymCritters/
├── index.html            # DOM-Grundgerüst aller Screens (HUD, Menü, Shop, Achievements, Settings...)
├── style.css              # Gesamtes Styling, CSS Custom Properties, dunkles Theme
├── start_server.js         # Node-Static-Server (freier Port, öffnet Browser automatisch)
├── start_game.py           # Äquivalenter Python-Server/Launcher
├── start-game.bat / .sh    # Doppelklick-Starter für Windows / Unix
├── vendor/                  # Optionaler lokaler Babylon.js-Build (Offline-Fallback, aktuell leer)
└── src/
    ├── config.js           # Modi, Level, Items, Charaktere, Shop, Achievements — Single Source of Truth
    ├── save.js              # localStorage-Persistenz, Save-Migration, Achievement-Auswertung
    ├── audio.js              # Synthetische Sounds/Musik via Web Audio API
    └── main.js               # Szene, Bewegung, Interaktion, UI-Rendering, Game-Loop
```

Keine Build-Pipeline: `index.html` lädt `src/main.js` direkt als ES-Modul. `package.json` deklariert keine Scripts und keine Dependencies — der Browser erledigt die gesamte Arbeit.

### Design-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Kamera- und Spieler-Rotation strikt einseitig gekoppelt** | `camera.alpha` (Maus / `C`-Taste) → kamerarelative Bewegungsrichtung → `player.rotation.y`. Nichts fließt zurück zur Kamera. Zwei frühere Varianten (Kamera folgt automatisch der Figur / Figur folgt direkt dem Kamerawinkel) erzeugten einen sichtbaren Feedback-Loop zwischen beiden. |
| **Kollisionsauflösung über Kreis-vs-Rechteck-Pushout** | `resolvePlayerPosition()` löst Kollisionen mit Hindernissen über den nächstgelegenen Punkt auf der Box auf statt über eine Achsen-Wahl — verhindert Zittern an Ecken (Bänke, Squat-Rack, Pflanzen). |
| **Synthetisches Audio statt Audio-Dateien** | Alle Sounds/Musik entstehen zur Laufzeit über Web-Audio-Oszillatoren (`src/audio.js`). Kein Asset-Download, keine Lizenzfragen, kleines Repo. |
| **Additive Save-Migration** | `SAVE_VERSION` wird nur erhöht, alte Felder werden mit den Defaults gemerged statt überschrieben (`save.js: loadSave`). V3-Spielstände (globaler Highscore, separate Bestzeiten) werden automatisch übernommen. |
| **Kein Build-Tool** | Reine ES-Module, direkt im Browser ausführbar. Erfordert lediglich einen HTTP-Server statt `file://`, da ES-Module CORS-Restriktionen für lokale Dateien haben. |

---

## 🚀 Schnellstart

### Voraussetzungen

| Anforderung | Details |
|---|---|
| Browser | Aktueller Chrome / Edge / Firefox / Safari mit WebGL2 |
| Internetverbindung | Nötig, außer `vendor/babylon.js` liegt lokal vor (Fallback-Kette: lokal → `cdn.babylonjs.com` → `cdn.jsdelivr.net`) |
| Node.js **oder** Python 3 | Nur für den lokalen Dev-Server — keine Laufzeit-Abhängigkeit des Spiels selbst |

### Lokal starten

```bash
# Repository klonen
git clone https://github.com/Moarci/GymCritters.git
cd GymCritters

# Variante 1 — Windows Doppelklick
start-game.bat

# Variante 2 — Node (plattformunabhängig)
node start_server.js

# Variante 3 — Python
python start_game.py
```

Jede Variante startet einen minimalen statischen Webserver auf einem freien lokalen Port und öffnet automatisch den Standardbrowser. `npm install` ist **nicht nötig** — es gibt keine Dependencies.

---

## 🌐 Deployment

Das Spiel ist eine reine statische Seite und läuft unverändert auf jedem Static-Hosting.

**Aktuell live:** **[moarci.github.io/GymCritters](https://moarci.github.io/GymCritters/)** — gehostet über GitHub Pages vom `main`-Branch, Root-Verzeichnis.

| Schritt | Befehl |
|---|---|
| Remote setzen | `git remote add origin https://github.com/Moarci/GymCritters.git` |
| Pushen | `git push -u origin main` |
| Pages aktivieren | `gh api -X POST repos/Moarci/GymCritters/pages -f "source[branch]=main" -f "source[path]=/"` |

Jeder Push auf `main` deployt die Seite automatisch neu — kein zusätzlicher CI-Schritt nötig, da kein Build existiert.

---

## Spielstand & Datenmodell

Der komplette Spielstand ist ein einziges JSON-Objekt unter dem `localStorage`-Key `gymCrittersSave` (aktuell `SAVE_VERSION = 4`).

| Feld | Beschreibung |
|---|---|
| `coins` | Erspielte Münzen für den Shop |
| `soundEnabled` | Sound/Musik an oder aus |
| `tutorialCompleted` | Ob das Tutorial bereits gezeigt wurde |
| `lastMode` / `lastLevel` | Zuletzt gespielter Modus/Level als Menü-Default |
| `selectedCharacter` / `owned[]` | Aktiver Charakter, Liste freigeschalteter Charaktere/Items |
| `equipped` | Aktive Cosmetics pro Slot (`head`, `wrist`, `face`, `trail`) |
| `modeStats` | Highscore, Bestzeit, Bestrang, Rundenzahl — je Modus getrennt |
| `stats` | Karrierestatistik (Runden, gelieferte Items, Hanteln, max. Combo, perfekte Runden, Münzen gesamt) |
| `achievements` | Freigeschaltete Achievement-IDs mit Zeitstempel |
| `settings` | Kamera-Empfindlichkeit, Joystick-Größe, Grafikqualität, Vibration |

**Migration:** `loadSave()` merged jeden geladenen Spielstand mit den aktuellen Defaults und hebt `version` auf `SAVE_VERSION` an. Legacy-Felder aus V3 (`highScore`, `bestTimes`) werden einmalig in die neue `modeStats`-Struktur übernommen.

---

## 🔒 Sicherheit

- **Kein Server-seitiger Zustand** — `start_server.js` / `start_game.py` liefern ausschließlich Dateien aus dem Projektordner aus, keine Schreiboperationen, kein Datenbankzugriff.
- **Pfad-Traversal-Schutz** — `start_server.js` prüft `filePath.startsWith(root)` vor jeder Dateiauslieferung und lehnt Anfragen außerhalb des Projektordners mit `403` ab.
- **Keine Accounts, kein Tracking** — Der komplette Spielstand liegt ausschließlich lokal im Browser. Keine Online-Rangliste, keine Analytics, keine Echtgeldkäufe.
- **Einzige externe Netzwerk-Abhängigkeit** — Babylon.js per CDN (`cdn.babylonjs.com`, Fallback `cdn.jsdelivr.net`), ausschließlich falls `vendor/babylon.js` nicht lokal vorliegt.

---

## 🎯 Design-Prinzipien (Golden Rules)

| # | Regel | Begründung |
|---|---|---|
| 1 | **Config First** | Modi, Level, Items, Charaktere, Shop und Achievements ausschließlich in `config.js` pflegen — kein Balancing-Wert direkt im Game-Loop. |
| 2 | **Einseitige Kamera-Bewegungs-Kopplung** | Kamera → Bewegungsrichtung → Spieler-Rotation, niemals umgekehrt — sonst Feedback-Loop (siehe [Design-Entscheidungen](#design-entscheidungen)). |
| 3 | **Additive Save-Migration** | `SAVE_VERSION` nur erhöhen, nie Felder destruktiv entfernen — alte Spielstände müssen immer ladbar bleiben. |
| 4 | **Zero Dependencies** | Keine npm-Pakete ohne triftigen Grund — das Spiel bleibt ohne `npm install` lauffähig. |
| 5 | **Lokal-first** | Kein Feature darf einen Server, ein Backend oder einen Account voraussetzen. |

---

## Roadmap

| Phase | Status | Umfang |
|---|---|---|
| **V1 – V3** | Abgeschlossen (historisch) | Basis-Aufräumspiel, Vorgänger von V4 |
| **V4 — Critter Crew** | Abgeschlossen | Progressionssystem, Fibi, Münzshop, Achievements, drei Level-Varianten, Tutorial, mobile Komfort-Settings |
| **Kamera-/Bewegungs-Feinschliff** | Abgeschlossen | Kamera- und Spieler-Rotation entkoppelt, Kollisions-Jitter an Hindernissen behoben |
| **GitHub Pages Deployment** | Abgeschlossen | Spiel live und direkt teilbar unter eigenem Link |
| **Erweiterte Ablageorte** | Abgeschlossen | Kettlebell, Springseil und Medizinball samt neuer Ablageorte — siehe [`docs/superpowers/specs/2026-07-18-item-storage-expansion-design.md`](docs/superpowers/specs/2026-07-18-item-storage-expansion-design.md) |
| **Industrial Loft Gym** *(Entwurf, offener Worktree)* | In Planung | Geschlossene Decke, Sichtbeton, Industriefenster, Pegboard-Deko — siehe [`docs/superpowers/specs/2026-07-18-industrial-loft-gym-design.md`](docs/superpowers/specs/2026-07-18-industrial-loft-gym-design.md) |

---

## Changelog

### Unreleased (2026-07-18)

- Drei neue Gegenstände (Kettlebell, Springseil, Medizinball) mit eigenen Ablageorten ergänzt, in alle drei Level integriert — siehe [`docs/superpowers/specs/2026-07-18-item-storage-expansion-design.md`](docs/superpowers/specs/2026-07-18-item-storage-expansion-design.md)
- Kamera- und Spieler-Rotation vollständig entkoppelt — behebt "Kämpfen" zwischen automatischer Kameraausrichtung und Maus-Look
- Blickrichtung der Figur folgt jetzt stabil der tatsächlichen Bewegungsrichtung statt einer fehleranfälligen `camera.target`/`camera.position`-Differenz
- Kollisionsauflösung an Gym-Hindernissen auf Kreis-vs-Rechteck-Pushout umgestellt — kein Zittern mehr an Ecken
- ArcRotateCamera-Trägheit reduziert für direktere Maussteuerung
- Totes Kamera-Steuerungs-Handling (`cameraManualUntil`) entfernt
- Repository auf GitHub veröffentlicht, GitHub Pages aktiviert: [moarci.github.io/GymCritters](https://moarci.github.io/GymCritters/)

### V4 – Critter Crew

- Vollständiges Progressionssystem mit Shop und Ausrüstung
- Eichhörnchen Fibi als freischaltbare zweite Figur
- Figurspezifische Bewegung, Tragfähigkeit und Punktboni
- Zwei leichte Gegenstände gleichzeitig tragbar
- Tutorial für die erste Schicht
- Drei Levelvarianten: Feierabend, Nach dem Kurs, Leg Day Chaos
- Ablageorte füllen sich sichtbar
- Achievements, Statistiken und modusgetrennte Bestwerte
- Bessere Objektmechaniken, sichere Drop-Positionen und Sprintregeln
- Charakterreaktionen, Quips, Hintergrundmusik und verbesserte Sounds
- Zusätzliche mobile Komforteinstellungen
- Modularisierte Dateien für Konfiguration, Spielstand und Audio

---

## 🤝 Contributing

Branch-Namenskonvention: `feature/`, `fix/`, `refactor/`, `docs/`
Commit-Format: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` etc.)

Es gibt aktuell keine automatisierte CI-Pipeline. Vor jedem Commit manuell prüfen:

```bash
node --check src/main.js src/config.js src/audio.js src/save.js   # Syntax-Check
node start_server.js                                               # Lokal im Browser testen
```

---

## 📄 Lizenz

[MIT](LICENSE) — frei nutzbar, verändern und weitergeben erlaubt, ohne Gewährleistung.

---

<div align="center">

**Gym Critters** — Räum auf. Halte die Combo. Feierabend.

</div>
