<div align="center">

# 🦝🐿️ Gym Critters V5.1 — Crew Terminal

**Ein lokal-first 3D-Browsergame ohne Build-Schritt, Backend oder Account.**

**v5.1.0** — Physische Stolperfallen, zeitloser Zen-Modus, levelweises Feintuning, Leistungsentwicklung und ein komplett neues Crew-Terminal.

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Babylon.js](https://img.shields.io/badge/Babylon.js-via_CDN-BB464B?style=flat-square&logo=babylondotjs&logoColor=white)](https://www.babylonjs.com)
[![Version](https://img.shields.io/badge/version-5.1.0-a7f46a?style=flat-square)](CHANGELOG.md)
[![Dependencies](https://img.shields.io/badge/npm_dependencies-0-success?style=flat-square)](package.json)
[![Play](https://img.shields.io/badge/▶_Live_Demo-2ea44f?style=flat-square)](https://moarci.github.io/GymCritters/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

**[🎮 Jetzt spielen](https://moarci.github.io/GymCritters/)** · **[🚀 Lokal starten](#-schnellstart)** · **[🧪 Qualität prüfen](#-tests-und-ci)** · **[📝 Changelog](CHANGELOG.md)**

</div>

---

## Überblick

Rocco der Waschbär und Fibi das Eichhörnchen räumen ein chaotisches Fitnessstudio auf. Hanteln gehören ins Rack, Handtücher in die Wäsche, Matten auf den Stapel und jedes weitere Trainingsgerät an seinen sichtbaren Ablageort.

V5 macht aus der einfachen Aufräumrunde eine kleine Gym-Schicht: Gegenstände erscheinen in Wellen, die Priorität verändert sich während der Runde und jedes Level besitzt eigene Wege, Hindernisse, Farben und Bonusereignisse. In V5.1 werden herumliegende Gegenstände zusätzlich zu echten Stolperfallen, während das Crew-Terminal jede Schicht detailliert konfigurierbar und die eigene Verbesserung über viele Runden sichtbar macht. Fortschritt bleibt vollständig lokal und funktioniert ohne Account, Cloud oder Tracking.

## Features

| Bereich | Inhalt |
|---|---|
| **Living Shifts** | Drei garantiert erreichbare Schichtphasen, leveltypische Gegenstände, inszenierte Wellenankünfte und wechselnde Bonusereignisse. |
| **Drei Level-Identitäten** | Feierabend, Nach dem Kurs und Leg Day Chaos besitzen eigene Bodenflächen, ungespiegelte Crew-Beschilderung, Deko, Kollisionshindernisse, Item-Schwerpunkte und Ereignisse. |
| **Zwei Critter** | Rocco ist stark mit schweren Lasten; Fibi ist schneller, trägt zwei leichte Dinge und erhält +15 % auf passende Doppellieferungen. |
| **Präzises Greifen** | Zwei-Knochen-IK richtet Schulter, Ellbogen und Pfoten an den Gegenständen aus; Tragehaltung und Gang reagieren auf die Gewichtsklasse. |
| **Verlässliche Interaktion** | Reichweite, Blickrichtung und freie Sicht bestimmen das Ziel. Sichtbare Hindernisse blockieren Bewegung und Aufnahme konsistent; Matten und Hanteln landen in maßgenau abgestimmten, kollisionsfreien Ablage-Slots. |
| **Physische Stolperfallen** | Dynamische Bodenimpulse warnen beim schnellen Annähern; beim Überlaufen stolpert die Figur, verliert ihre Combo und lässt getragene Dinge fallen. |
| **Flow-Feedback** | Combo-Zeitleiste, dreistufige Flow-Vignette, eskalierende Lieferimpacts und animierte Wellen machen erfolgreiche Serien unmittelbar spürbar. |
| **Flow-Schild** | Gehaltener Spitzenflow bankt einen Serienschutz, der den nächsten Stolperer oder die nächste Fehlablage abfängt – eine knappe Ressource für mutige Routenentscheidungen unter Druck. |
| **Vier Spielmodi** | Entspannt, Standard, Blitz und der neue Zen-Modus ohne Zeitlimit. |
| **Level-Feintuning** | Gegenstandsmenge, Schichtdynamik, Stolperrisiko und Zielhilfe werden für jedes Level separat gespeichert. |
| **Entwicklung über Zeit** | Bis zu 120 Runden bilden eine lokale Historie mit vergleichbarem Leistungsindex, Trend, Filterung und Verlaufskurve. |
| **Crew-Terminal** | Fünfstufiger Schicht-Wizard für Crew, Level, Modus, Feintuning und Startprüfung – mit klarer Auswahlhierarchie und responsivem Utility-Dock. |
| **Fortschritt** | Münzshop, 15 Achievements, faire Bestwerte je Level × Modus, fünf Meisterschaftsstufen pro Level und drei lokale Tagesverträge. |
| **Lokal-first Saves** | Automatische Migration, feste lokale Origin sowie validierter JSON-Export und -Import des Spielstands. |
| **Desktop und Mobile** | Maus-/Tastatursteuerung, Touch-Look, virtueller Joystick, Vibrationsfeedback, Hochformat-HUD und adaptive Grafikqualität. |
| **Accessibility** | Semantische Dialoge, Fokusführung, Screenreader-Status, sichtbare Fokusrahmen, Forced Colors und reduzierte Bewegungen. |
| **Offline nach Erststart** | Service Worker speichert die lokale App-Shell und die erfolgreich geladene Babylon.js-Version für spätere Offline-Starts. |

## Living Shifts

Jede Runde entwickelt sich über drei Abschnitte:

1. **Opening:** Ein erster Teil der Gegenstände ist sofort verfügbar und führt in den Level-Schwerpunkt ein.
2. **Rush:** Die nächste Welle öffnet sich; ein neues Schichtereignis verändert wertvolle Itemgruppen.
3. **Finale:** Die letzten Gegenstände erscheinen und gewichtete Bonusziele belohnen eine passende Route.

Die Boni gelten nur für passende Gegenstände. Der Spieler entscheidet dadurch zwischen kurzem Weg, wertvoller Lieferung, Combo-Sicherung und Tagesvertrag.

## Flow-Schild

Der Flow-Schild vertieft die zentrale Combo-Schleife um eine echte Risiko-/Belohnungsentscheidung. Wer den höchsten Flow (**MAX FLOW**, Combo ≥ 8) rund 2,6 Sekunden hält, lädt einen Serienschutz auf – sichtbar als kleiner Ladering in der Combo-Karte. Sobald ein Schild bereitliegt, leuchtet der Ring und ein Toast kündigt ihn an.

- Der nächste Combo-Bruch – ein Stolperer oder eine Fehlablage – wird abgefangen: die Serie überlebt, statt auf null zurückzufallen.
- Der Schild ist eine knappe Ressource: höchstens einer gleichzeitig, und unter Spitzenflow gehaltener Fortschritt zerfällt langsam wieder, wenn der Flow abbricht.
- Ein Stolperer bleibt körperlich – getragene Gegenstände fallen weiterhin –, und eine abgefangene Fehlablage zählt weiterhin für Rang und Statistik. Der Schild rettet ausschließlich die mühsam aufgebaute Serie.

So entsteht ein neues Spielmuster: erst Spitzenflow aufbauen, den Schutz banken und danach bewusst die riskantere, aber wertvollere Route wählen.

### Level-Identitäten

| Level | Spielgefühl | Eigene Welt und Ereignisse |
|---|---|---|
| **Feierabend** | Gemischte Abschlussrunde im ganzen Gym. | Reinigungswagen, Wet-Floor-Station und Abschlussbeleuchtung; zuerst Flaschen/Handtücher, danach schwere Restgeräte im Bonus. |
| **Nach dem Kurs** | Viele Matten, Handtücher, Flaschen und Seile in gestaffelten Reihen. | Violette Kursfläche und kollidierende Step-Plattformen; Kursmaterial und später Fundsachen erhalten Bonus. |
| **Leg Day Chaos** | Schwere Hanteln, Kettlebells und Medizinbälle auf engeren Wegen. | Gummiboden, Plate Trees und Push Sled als echte Hindernisse; schwere und sperrige Lasten bestimmen den Endspurt. |

Die geschlossene Gebäudehülle, bündigen Industriefenster, Eingangslobby und prozedurale Stadtansicht verhindern schwarze Außenleere und vermitteln eine zusammenhängende Gym-Umgebung.

## Inhalte und Balancing

### Spielmodi

| Modus | Zeit | Gegenstände | Punktefaktor | Navigator |
|---|---:|---:|---:|---|
| Entspannt | 180 s | 8 | ×0,9 | immer |
| Standard | 120 s | 10 | ×1,0 | immer |
| Blitz | 90 s | 12 | ×1,3 | nur beim Tragen |
| Zen | kein Limit | 10 | ×0,85 | immer |

Die Gegenstandsmenge in dieser Tabelle ist die jeweilige Modusbasis. Im Crew-Terminal lässt sie sich pro Level auf **Kompakt**, **Standard** oder **Volles Haus** stellen. Zusätzlich stehen ruhige, lebendige und intensive Wellen sowie drei Stolperrisiken und vier Zielhilfe-Stufen zur Wahl.

### Charaktere

| Charakter | Tempo | Besonderheit |
|---|---|---|
| **Rocco** | 4,2 / 6,3 | Startcharakter, +20 % auf schwere Gegenstände und geringerer Tempoverlust mit schweren Lasten. |
| **Fibi** | 5,0 / 7,25 | Für 250 Münzen freischaltbar, schneller, zwei leichte Tragplätze und +15 % auf passende Doppellieferungen. |

### Gegenstände

| Gegenstand | Punkte | Ablageort | Gewicht |
|---|---:|---|---|
| Hantel | 125 | Rack | schwer |
| Kettlebell | 130 | Kettlebell-Ecke | schwer |
| Trainingsmatte | 100 | Mattenzone | sperrig |
| Medizinball | 105 | Ballnetz | sperrig |
| Trinkflasche | 75 | Pfandzone | leicht |
| Springseil | 65 | Seilhaken | leicht – große U-Schlaufe mit zwei Griffen |
| Handtuch | 50 | Wäsche | leicht |

## Karriere und Belohnungen

### Tagesverträge

Pro lokalem Kalendertag werden deterministisch drei Aufgaben gewählt:

- ein Lieferauftrag, etwa Handtücher oder schwere Geräte;
- ein Schichtauftrag, etwa zwei abgeschlossene Runden oder ein bestimmtes Level;
- ein Könnensauftrag, etwa Punktzahl, sichere Pfoten oder eine hohe Combo.

Fortschritt und Belohnungen werden sofort gespeichert. Bereits verdiente Belohnungen können auch nach einer zurückgestellten Geräteuhr nicht erneut kassiert werden. Es gibt keinen Server und keine vorausgesetzte Online-Zeit.

### Meisterschaft und Bestwerte

- Jedes Level besitzt fünf Meisterschaftsstufen.
- XP entstehen durch Abschluss, Punktzahl, eine Runde ohne Fallenlassen und perfekte Ordnung.
- Meisterschaft verleiht keine permanenten Werteboni und hält Highscores dadurch fair.
- Highscore, Bestzeit, Rang und Rundenzahl werden separat für jede Kombination aus Level und Modus geführt.
- Zen-Runden besitzen bewusst keine Bestzeit und keinen Timerdruck; ihr tatsächliches Tempo fließt nur in die private Entwicklungsauswertung ein.

### Leistungsentwicklung

Jeder Rundenabschluss speichert einen kompakten lokalen Historieneintrag. Ein normalisierter Leistungsindex von 0 bis 100 kombiniert Abschluss, Fehlerfreiheit, Combo und Tempo pro Gegenstand. Die Statistik vergleicht die neuere Hälfte der letzten zehn passenden Runden mit der vorherigen Hälfte und zeigt **Verbesserung**, **stabile Leistung** oder einen vorübergehenden Rückgang. Level- und Modusfilter verhindern irreführende Vergleiche.

### Shop und Achievements

Der Shop enthält 15 Freischaltungen: Fibi, Stirn- und Schweißbänder, Sportbrillen sowie mehrere Laufspuren bis zur Critter-Crew-Spur. Insgesamt existieren 15 Achievements:

`Erste Schicht`, `Klebrige Pfoten`, `Perfekte Ordnung`, `Schwerarbeiter`, `Kettlebell-König`, `Seilspringer`, `Ballkünstler`, `Vollsortiment`, `Gym-Held`, `Blitzsauber`, `Sammler`, `Stammcrew`, `Zuverlässige Pfoten`, `Gym-Meister` und `Crew-Verdiener`.

## 🕹 Steuerung

| Eingabe | Aktion |
|---|---|
| `WASD` / Pfeiltasten | Kamerarelativ laufen |
| Maus ziehen | Kamera drehen |
| `E` | Aufnehmen, zusätzlich einsammeln oder ablegen |
| `Shift` | Sprinten, soweit die Last es erlaubt |
| `C` | Kamera hinter der Figur ausrichten |
| `Esc` / `P` | Pause |
| Touch | Virtueller Joystick, Look-Zone und Aktionsbuttons |

## Komfort und Accessibility

In den Einstellungen stehen Lautstärke, Kameraempfindlichkeit, Joystickgröße, Grafikqualität, Vibration und reduzierte Bewegungen zur Verfügung. Die Systemeinstellung `prefers-reduced-motion` wird ebenfalls berücksichtigt.

Alle Menüs verwenden sichtbare Tastatur-Fokusrahmen. Modale Screens besitzen zugängliche Namen, halten den Fokus im aktiven Dialog und geben ihn beim Schließen an den Auslöser zurück. Wichtige Spielmeldungen werden über dedizierte Statusbereiche angekündigt, ohne den laufenden Timer vorzulesen.

Das Hochformat-HUD ordnet Status und Aktionen in getrennten Zeilen an. Auf schmalen Touch-Geräten bleiben die wichtigsten Tasten in Daumenreichweite, während doppelte Kamera-/Vollbildaktionen ausgeblendet werden.

## Spielstand und Offline-Betrieb

Der Spielstand liegt unter dem `localStorage`-Key `gymCrittersSave`. Die Produktversion ist **5.1.0**; die davon unabhängige interne Datenversion ist aktuell **`SAVE_VERSION = 7`**.

Gespeichert werden unter anderem:

- Münzen, Besitz und ausgerüstete Cosmetics;
- Charakter, letzter Modus und letztes Level;
- globale, modusweite und Level-×-Modus-Statistiken;
- levelweise Schichtkonfiguration und die letzten 120 Runden für die Entwicklungskurve;
- Achievements, Meisterschaft und Tagesverträge;
- Tutorial- und Komforteinstellungen.

`loadSave()` migriert ältere Spielstände additiv auf das aktuelle Schema. Über **Spielstand exportieren** entsteht eine lesbare JSON-Sicherung. Der Import akzeptiert validierte Gym-Critters-Exports sowie ältere rohe Save-JSONs, migriert sie und weist leere, fremde oder zukünftige Formate verständlich zurück.

Für den ersten vollständigen Start wird eine Internetverbindung benötigt, um Babylon.js von `cdn.babylonjs.com` oder dem jsDelivr-Fallback zu laden. Danach hält der Service Worker sowohl die lokalen Module als auch die erfolgreich verwendete Engine-Version im Cache. Online werden lokale Dateien weiterhin frisch geladen; offline fällt die App auf den Cache zurück.

## 🏗 Architektur

Gym Critters verwendet native ES-Module und Babylon.js ohne Bundler oder npm-Laufzeitabhängigkeiten.

```text
GymCritters/
├── index.html                 # App-Shell, Screens, HUD und Engine-Bootstrap
├── style.css                  # Responsive UI und Accessibility-Styles
├── ui-accessibility.js        # Dialogfokus, Fokusfalle und Status-Ankündigungen
├── manifest.webmanifest       # Installierbare App-Metadaten
├── service-worker.js          # Lokaler und Babylon-Runtime-Cache
├── start_server.js            # Statischer Node-Server auf fester Origin
├── start_game.py              # Entsprechender Python-Launcher
├── scripts/
│   ├── check-syntax.js        # Dependency-freier JS-/JSON-Syntaxcheck
│   └── http-smoke.js          # HTTP-Smoke-Test der App-Shell
├── test/                      # Node-Test-Suite
└── src/
    ├── main.js               # Szenen- und UI-Orchestrierung
    ├── config.js             # Balancing, Inhalte, Verträge und Meisterschaft
    ├── game-feel.js          # Gefahrenlesbarkeit, Combo-Flow und Charakter-Lieferbonus
    ├── flow-shield.js        # Serienschutz aus gehaltenem Spitzenflow
    ├── save.js               # Persistenz, Migration, Export/Import, Achievements
    ├── progression.js        # Bestwerte, Karriere und Meisterschaft
    ├── challenges.js         # Deterministische Tagesverträge
    ├── shift-director.js     # Wellen, Phasen und Levelereignisse
    ├── shift-settings.js     # Level-Feintuning und Modusdarstellung
    ├── trip-physics.js       # Babylon-freie Stolperreichweite und Gefahrenerkennung
    ├── character-motion.js   # Gang, Gewichtshaltung und Zwei-Knochen-IK
    ├── targeting.js          # Zielwertung und Sichtlinienprüfung
    ├── environment/          # Gebäude, Texturen und Level-Identitäten
    ├── input/                # Joystick und Touch-Look
    └── perf/                 # Adaptive Qualität und Render-Skalierung
```

Wichtige Architekturregeln:

- **Lokal-first:** Kein Gameplay-Feature benötigt Backend, Account oder Tracking.
- **Additive Saves:** `SAVE_VERSION` wird nur mit Migration erhöht; alte Daten werden nicht destruktiv entfernt.
- **Sichtbare Welt = Physik:** Spielrelevante Deko stammt aus denselben Leveldaten wie ihre Kollisionsbox.
- **Babylon-freie Logik:** Fortschritt, Schichtdirektor, Zielwertung und Bewegungsmathematik bleiben separat testbar.
- **Stabile Origin:** Alle lokalen Launcher verwenden `http://127.0.0.1:8347/`, damit derselbe Browser-Spielstand erhalten bleibt.

## 🚀 Schnellstart

Voraussetzung ist ein aktueller Browser mit WebGL2 sowie Node.js oder Python 3 für den lokalen Static Server.

```bash
git clone https://github.com/Moarci/GymCritters.git
cd GymCritters

# Windows
start-game.bat

# Alternativ mit Node.js
node start_server.js

# Alternativ mit Python
python start_game.py
```

Alle Varianten öffnen `http://127.0.0.1:8347/`. Ein zufälliger Ausweichport wird bewusst nicht verwendet, weil `localStorage` an Host und Port gebunden ist. `npm install` ist nicht nötig.

Die unveränderten statischen Dateien können auch über GitHub Pages oder einen beliebigen Static Host ausgeliefert werden. Die Live-Version liegt unter [moarci.github.io/GymCritters](https://moarci.github.io/GymCritters/).

## 🧪 Tests und CI

```bash
npm test          # gesamte Node-Test-Suite
npm run check     # Syntax aller JS-Dateien und JSON-Manifeste
npm run smoke     # App-Shell über einen temporären HTTP-Server prüfen
npm run test:ci   # alle drei Prüfungen in derselben Reihenfolge
```

Die Suite umfasst **237 Tests**. Sie deckt unter anderem Save-Migrationen, Rundentrends, Zen-Wertung, Stolperphysik, geometrisch geprüfte Ablageplätze, den fünfstufigen Schicht-Wizard, Level-Feintuning, Import/Export, Verträge, Meisterschaft, Levelhindernisse, Schichtwellen, IK, Ziel-Sichtlinien, Kamera, Touch, adaptive Qualität und die zugängliche Offline-App-Shell ab.

[`.github/workflows/quality.yml`](.github/workflows/quality.yml) führt `npm run test:ci` bei Pull Requests, Pushes auf `main` und manuellen Workflow-Starts mit Node.js 22 aus.

Rendering und visuelle 3D-Qualität benötigen weiterhin eine manuelle Browserkontrolle; der HTTP-Smoke-Test prüft Erreichbarkeit und Content-Types der statischen Kernassets, nicht das Babylon-Rendering.

## Versionshistorie

| Version | Schwerpunkt |
|---|---|
| **V5.1 — Crew Terminal** | Physische Stolperfallen, Zen ohne Zeitlimit, levelweises Feintuning, langfristige Leistungsentwicklung und eine komplett neue Menüoberfläche. |
| **V5 — Living Shifts** | Dynamische Schichten, Level-Identitäten, IK, verlässliche Interaktion, faire Karriere, Tagesverträge, Offline-App-Shell und Accessibility. |
| **V4 — Critter Crew** | Fibi, Münzshop, Cosmetics, Achievements, Tutorial, mehrere Level und Mobile-Steuerung. |
| **V1–V3** | Grundlegendes 3D-Aufräumspiel und erste lokale Fortschrittssysteme. |

Alle Änderungen stehen im [Changelog](CHANGELOG.md).

## Lizenz

[MIT](LICENSE) — frei nutzbar, veränderbar und weitergebbar, ohne Gewährleistung.

---

<div align="center">

**Gym Critters** — Räum auf. Halte die Combo. Meistere die Schicht.

</div>
