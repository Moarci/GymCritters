# Changelog

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
