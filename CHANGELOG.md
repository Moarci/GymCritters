# Changelog

## V5.4.0 – Flow Mastery (2026-07-18)

### Gameplay

- **Neuer Flow-Schild:** Wer den höchsten Flow (MAX FLOW, Combo ≥ 8) rund 2,6 Sekunden hält, bankt einen Serienschutz. Der nächste Combo-Bruch – ob Stolperer oder Fehlablage – wird abgefangen: die Serie überlebt, statt auf null zurückzufallen.
- Der Schild ist bewusst eine knappe Ressource (höchstens einer gleichzeitig) und schafft eine echte Risiko-/Belohnungsentscheidung: Spitzenflow aufbauen, Schutz banken und danach eine mutigere Route unter Stolpergefahr wagen.
- Ein Stolperer bleibt körperlich – getragene Gegenstände fallen weiterhin –, der Schild rettet nur die mühsam aufgebaute Serie. Eine abgefangene Fehlablage zählt weiterhin für Rang und Statistik, kostet aber nicht mehr die Combo.
- Ein kleiner Ladering in der Combo-Karte füllt sich beim Halten des Spitzenflows und leuchtet, sobald ein Schild bereitliegt; ein eigenes Toast, Sprachfeedback und Vibrationsmuster kündigen den geladenen Schutz an.

### Qualität

- Neues Babylon-unabhängiges Modul `src/flow-shield.js` kapselt Ladung, Verbrauch und Zerfall des Schilds für deterministische Tests.
- Sieben neue Tests decken Laden nur bei Spitzenflow, das einmalige Freischalten, den gedeckelten Speicher, den langsamen Zerfall und die genau einmalige Absorption ab; die Suite umfasst nun 237 Tests.
- Service Worker, Offline-App-Shell-Test und Cache-Version wurden um das neue Modul ergänzt.

## V5.1.0 – Crew Terminal (2026-07-18)

### Gameplay und Schichtplanung

- Herumliegende Gegenstände sind jetzt echte Stolperfallen: Bei ausreichendem Lauftempo stolpert der Critter, verliert seine Combo und lässt getragene Gegenstände kontrolliert auf freie Bodenpositionen fallen.
- Alle sieben Ablagen nutzen eindeutige, an ihre sichtbare Geometrie angepasste Plätze: Gegenstände schneiden nicht mehr in Träger oder Wände, schweben nicht über ihren Flächen und überschreiben keine bereits belegten Slots.
- Kettlebell-Regal und Seilhaken sind als wirklich leere Ablagen aufgebaut; echte Items überlagern dadurch keine dekorativen Duplikate mehr.
- Medizinbälle sind deutlich größer, besitzen sichtbare Nahtlinien und landen in einem offenen, deckenden Ballkorb mit klaren Stapelpositionen.
- Die Kursmatten liegen mit festen Abständen einzeln auf dem Boden statt fast deckungsgleich; deckende Materialien und eine stabile Tiefenreihenfolge verhindern den perspektivabhängigen Farbwechsel.
- Das Mattenregal besitzt zwei offene, exakt vermessene Ebenen für je acht liegende Rollen. Die doppelte Mattenrotation und Kollisionen mit den früheren Führungspfosten entfallen.
- Hantelregal und Hantel-Slots teilen sich dieselben Breiten-, Tiefen- und Höhenmaße; beide Hantelreihen liegen vollständig auf den verbreiterten Querträgern und halten sichtbar Abstand zum Rahmen.
- Springseile bestehen jetzt aus einer großen U-förmigen Seilschlaufe, zwei kontrastreichen Griffen und metallischen Griffringen statt aus einem kleinen, nicht erkennbaren Torus.
- Die Seilhaken wurden verbreitert und ihre Ablage-Slots richten jedes Springseil mit beiden Griffen auf Hakenhöhe aus.
- Das große Gym-Plakat besitzt ein neues gerahmtes Crew-Code-Design mit klarer Typografie, Badge, Akzentlinien und kontrollierter Beleuchtung; Plakat und Level-Schilder zeigen nun mit der korrekten, ungespiegelten Vorderseite in den Raum.
- Der aktuelle Levelname liegt als eigene schmale Live-Shift-Statusleiste oben im Plakatrahmen und verdeckt nicht länger die große Markenbotschaft.
- Springseile hängen am geschlossenen Seilbogen; Öffnung und Griffe zeigen dadurch korrekt nach unten.
- Drei Stolperrisiken verändern Auslöseradius, Mindesttempo, Abklingzeit und Dauer der Reaktion; Tutorial und unmittelbare Wiederholungen bleiben geschützt.
- Der neue Zen-Modus besitzt kein Zeitlimit. Verstrichene Zeit wird für die private Entwicklungsauswertung erfasst, aber bewusst nicht als Bestzeit gewertet.
- Gegenstandsmenge, Wellendynamik, Stolperrisiko und Zielhilfe lassen sich für jedes Level separat konfigurieren.
- Die Schichtvorschau zeigt vor dem Start Modus, Umfang, Tempo, Risiko, Zielhilfe und Zeitbudget.

### Menü, Statistik und Fortschritt

- Das Startmenü wurde als hochwertiges, responsives Crew-Terminal mit fünf fokussierten Wizard-Seiten, Live-Zusammenfassung, Statusleiste und Utility-Dock neu aufgebaut.
- Bis zu 120 Runden werden lokal als kompakte Historie gespeichert und bei älteren Spielständen additiv migriert.
- Ein vergleichbarer Leistungsindex bewertet Abschluss, Genauigkeit, Combo und Tempo; Statistikfilter, Trendtext, Verlaufskurve und letzte Runden machen Verbesserungen über Zeit sichtbar.
- Stolperer werden pro Runde und in der Karrierestatistik erfasst.
- Save-Schema 7 ergänzt Level-Einstellungen und Rundentrends, ohne bestehende Freischaltungen, Bestwerte oder Statistiken zu entfernen.

### Qualität

- Neue Babylon-unabhängige Module kapseln Stolpererkennung und Schichteinstellungen für deterministische Tests.
- Service Worker, Manifest, HTTP-Smoke-Test und UI-Shell wurden um die neuen Module und Oberflächen erweitert.
- Die vollständige Suite umfasst 216 Tests sowie Syntax- und HTTP-Smoke-Prüfungen.

## V5.0.0 – Living Shifts (2026-07-18)

### Gameplay

- Schichten laufen jetzt in drei gestaffelten Wellen statt mit vollständig statischer Item-Verteilung.
- Jedes Level besitzt wechselnde Bonusereignisse für passende Gegenstands- oder Gewichtsklassen.
- Feierabend, Nach dem Kurs und Leg Day Chaos haben eigenständige Bodenflächen, Schilder, Farbakzente und kollidierende Levelhindernisse erhalten.
- Sichtbare Deko und Kollisionsdaten stammen aus derselben Leveldefinition; Startpunkte und Spawnpositionen werden gegen die Hindernisse geprüft.
- Aufnahmeziele berücksichtigen Distanz, Blickrichtung und freie Sicht. Levelhindernisse blockieren keine Interaktion mehr nur optisch.
- Schulter, Ellbogen und Pfoten verwenden Zwei-Knochen-IK. Gewichtsklasse und Gegenstandsform bestimmen Traghaltung, Gang und Griffposition.
- Item-spezifische Landungen, Aufschlagsounds, Squash und Combo-Tonhöhen verbessern das Feedback.

### Fortschritt

- Bestwerte werden fair für jede Kombination aus Level und Modus gespeichert; alte modusweite Statistiken bleiben kompatibel.
- Jedes Level besitzt fünf Meisterschaftsstufen ohne spielstarke permanente Upgrades.
- Pro lokalem Kalendertag entstehen deterministisch drei Verträge aus den Gruppen Lieferung, Schicht und Können.
- Vertragsfortschritt, einmalige Münzbelohnungen und eine begrenzte lokale Historie funktionieren vollständig offline.
- Der Shop wurde auf 15 Freischaltungen mit zusätzlichen Stirn-, Handgelenk-, Brillen- und Laufspur-Cosmetics erweitert.
- Die Achievement-Liste wurde auf 15 Ziele erweitert, darunter Verträge, Meisterschaft, Gesamtverdienst und alle sieben Itemtypen.
- Save-Schema 6 migriert ältere Spielstände additiv und erhält vorhandene Statistik-, Besitz- und Karrieredaten.
- Spielstände lassen sich als validierte JSON-Datei exportieren und wieder importieren; ältere rohe Save-JSONs werden ebenfalls migriert.

### Gym und Level-Identität

- Geschlossene Gebäudehülle mit durchgehendem Boden und bündiger Betondecke verhindert schwarze Außenleere.
- Zurückgesetzte Eingangslobby mit Glasfront, Läufer und beleuchtetem „GYM CRITTERS“-Schild ergänzt.
- Industriefenster besitzen eingelassene Rahmen, Laibungen, Sprossen, Querstreben und Fensterbänke.
- Prozedurale morgendliche Stadtansicht ersetzt den früheren dunklen Außenraum.
- Feierabend ergänzt Reinigungswagen und Wet-Floor-Station.
- Nach dem Kurs ergänzt violette Kursfläche und eine Reihe aus Step-Plattformen.
- Leg Day Chaos ergänzt Gummiboden, Plate Trees und einen Push Sled für engere Laufwege.

### Bedienung und Accessibility

- Hochformat-HUD ordnet Status und Aktionen auf schmalen Touch-Geräten neu an.
- Touch-Look, Joystick-Deadzone, sauberes Clamping, Kamera-Recenter und Eingabe-Reset bei Tab-Wechsel bleiben parallel nutzbar.
- Lautstärke ist stufenlos regelbar; Vibration, Kamera, Joystick und Grafik bleiben separat einstellbar.
- Reduzierte Bewegungen lassen sich manuell aktivieren und folgen zusätzlich `prefers-reduced-motion`.
- Menüs besitzen sichtbare Fokusrahmen, semantische Dialoge, Fokusfalle, Fokus-Rückgabe und gezielte Screenreader-Statusmeldungen.
- Forced-Colors-Modus und ausreichend große mobile Interaktionsflächen wurden ergänzt.

### Offline und Qualität

- Web-App-Manifest und Service Worker machen die App installierbar.
- Nach einem erfolgreichen Online-Start werden lokale Module und die verwendete Babylon.js-CDN-Version für weitere Offline-Starts gecacht.
- Dependency-freier Syntaxcheck prüft alle JavaScript- und JSON-Dateien.
- Dependency-freier HTTP-Smoke-Test prüft App-Shell, Content-Types, Manifest, Service Worker und Kernmodule.
- GitHub Actions führt Syntaxcheck, Node-Test-Suite und HTTP-Smoke bei Pull Requests und Pushes auf `main` aus.
- Die V5-Suite umfasst zum Release 184 Tests.

## V4.0.0 – Critter Crew

- Münzshop, Ausrüstung und sichtbare Cosmetics eingeführt.
- Eichhörnchen Fibi als freischaltbare zweite Figur ergänzt.
- Figurspezifische Lauf-, Sprint-, Trag- und Punktewerte eingeführt.
- Zwei leichte Gegenstände können mit Fibi gleichzeitig getragen werden.
- Geführtes Tutorial für die erste Schicht ergänzt.
- Feierabend, Nach dem Kurs und Leg Day Chaos als drei Levelvarianten eingeführt.
- Kettlebell, Springseil und Medizinball samt eigener Ablageorte ergänzt.
- Ablageorte füllen sich nach erfolgreichen Lieferungen sichtbar.
- Achievements, Karrierestatistik, Ränge und modusweite Bestwerte ergänzt.
- Charakterreaktionen, Quips, synthetische Hintergrundmusik und verbesserte Sounds eingeführt.
- Mobile Steuerung, Vibrationsfeedback und Grafikoptionen ergänzt.
- Konfiguration, Spielstand, Audio, Eingabe, Umgebung und Performance schrittweise modularisiert.

## V1–V3

- Grundlegendes 3D-Aufräumspiel mit Rocco, Timer, Punkten und Combo aufgebaut.
- Kamerarelative Bewegung, Maussteuerung und erste Gym-Hindernisse eingeführt.
- Lokalen Spielstand und erste Bestzeiten ergänzt.
