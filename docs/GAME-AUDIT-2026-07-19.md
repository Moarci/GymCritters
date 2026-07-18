# Gym Critters – vollständiger Spiel-Audit

Stand: 19. Juli 2026  
Basis: Quellcode, Konfiguration, Save-/Fortschrittssystem, Test-Suite und laufende Browserfassung von V5.1.

## Kurzfazit

Gym Critters besitzt inzwischen eine klare, charmante Grundidee, einen ungewöhnlich vollständigen lokal-first Fortschritt und eine gut verständliche Kernhandlung: finden, aufnehmen, sicher transportieren und passend ablegen. Die größte aktuelle Chance liegt nicht in mehr Menüseiten oder bloß mehr Gegenständen, sondern in drei Punkten:

1. Jede Schicht muss garantiert fair und lösbar zusammengestellt sein.
2. Wellen, Bonusereignisse und Charakterstärken müssen während des Spielens unmittelbar lesbar sein.
3. Die vorhandenen Systeme brauchen mehr spielerische Wechselwirkung, damit Level und Critter nicht nur andere Zahlen und Dekorationen liefern.

## Priorisierte Umsetzungsliste

### P0 – Fairness und verlässlicher Spielfluss

- [x] **Unerreichbare Gegenstandswellen beseitigen.** Bei „Nach dem Kurs“, hoher Gegenstandsmenge und ruhiger Dynamik konnte der prozentuale Grenzwert mehr Lieferungen verlangen, als in der sichtbaren Welle vorhanden waren. Die Freischaltung ist jetzt für jedes Level, 8–16 Gegenstände und alle Dynamiken mathematisch erreichbar und getestet.
- [x] **Runden leveltypisch zusammenstellen.** Statt derselben vier Pflichtgegenstände in jedem Level besitzt nun jeder Bereich einen eigenen Kern. Zufällige Dreifachhäufungen werden vermieden und dominante Typen gedeckelt, ohne den Level-Schwerpunkt zu verlieren.
- [x] **Spawnpunkte sicher und eindeutig planen.** Die Planung bevorzugt Abstand zu Startpunkt, Ablagen, aktiven Hindernissen und bereits gewählten Gegenständen. Maximale Runden verwenden keine Position doppelt.
- [ ] **Runtime-Fairness telemetrisch prüfen.** In einer späteren Debug-Ansicht sollten Weglängen, blockierte Spawnkandidaten und Verteilung pro Welle sichtbar werden, damit neue Leveldaten nicht nur durch Sichtprüfung balanciert werden.

### P1 – Lesbarkeit, Lernen und Entscheidungen

- [x] **Aktive Schichtregel dauerhaft zeigen.** Phase, Welle, aktuelles Ereignis, betroffene Gegenstandsgruppen und der echte Dynamik-Bonus bleiben im HUD sichtbar; wichtige Information hängt nicht länger nur an einem kurzen Toast.
- [x] **Ergebnisbildschirm in Coaching verwandeln.** Abschlussquote, Stolperer, Fehlablagen, Fallenlassen, Combo, Tempo und Leistungstrend bestimmen eine konkrete nächste Empfehlung statt nur einer Rangnote.
- [x] **Charakterwerte vor der Auswahl offenlegen.** Geh-/Sprinttempo, Tragkapazität, Tempo unter schwerer Last und Punktebonus stehen jetzt direkt auf den Karten. Roccos Text entspricht nun der tatsächlichen Mechanik für Hanteln und Kettlebells.
- [x] **Bodengefahren klarer lesen.** Beim Laufen reagieren Gegenstände jetzt abhängig von Abstand, Gewicht, Tempo und Stolperrisiko mit einem dezenten Bodenimpuls. Im Stillstand bleibt die natürliche Gym-Optik ruhig.
- [x] **Interaktionspriorität sichtbar erklären.** Bei vollen Pfoten nennt die Aktionsanzeige jetzt den blockierenden Grund – etwa schwere Last oder benötigte Doppelpfoten – und verbindet ihn mit der tatsächlich ausgelösten Ablegeaktion.
- [ ] **Kamera in engen Wegen stabilisieren.** Automatische Rezentrierung, Hinderniszoom und manuelles Drehen funktionieren, benötigen aber eine weichere Übergabe und getrennte Horizontal-/Vertikalempfindlichkeit.

### P1 – Mehr spielerische Identität

- [x] **Rocco und Fibi unterschiedliche Routinen geben.** Rocco erhält seinen Kraftbonus für schwere Lieferungen; Fibi bekommt levelübergreifend +15 % Kurierbonus für zwei leichte Gegenstände mit demselben Ziel. Auswahlkarten und Lieferfeedback zeigen beide Spielmuster.
- [ ] **Eigene Reaktionen und Silhouetten ausbauen.** Gang und Proportionen unterscheiden sich, aber Pickup-, Fehler- und Siegesreaktionen verwenden weitgehend dieselbe Struktur. Charaktereigene Antizipation, Stolper-Erholung und Idle-Handlungen würden Persönlichkeit stärker vermitteln.
- [ ] **Ereignisse mechanisch statt nur numerisch machen.** Derzeit verändern sie hauptsächlich Punkte. Gute nächste Varianten: kurzzeitig gesperrter Gang, rollender Medizinball, volle Wäschebox, verrutschtes Mattenregal oder ein Bonus für Lieferreihenfolge.
- [ ] **Wellen mit einer sichtbaren Ursache verbinden.** Neue Gegenstände sollten nicht einfach erscheinen, sondern etwa aus einer geöffneten Kursraumtür, einem umgekippten Wagen oder einer hereingebrachten Trainingskiste stammen.

### P2 – Level, Umgebung und Objekte

- [ ] **Jedes Level räumlich stärker trennen.** Farben, Bodeninseln, Hindernisse und Schilder funktionieren; alle drei Schichten spielen aber weiterhin in derselben Grundhalle. Eigene Nebenräume, Abkürzungen und Engstellen würden echte Routenidentität erzeugen.
- [ ] **Gym-Alltag erzählen.** Empfang, Fenster, Poster und Geräte bilden eine glaubwürdige Hülle. Ergänzend fehlen kleine, animierte Zustände: flackernde Schlussbeleuchtung, laufender Lüfter, Kursuhr, Reinigungsplan, vergessene Schließfach-Tür und Reaktionen der Ablagen auf Füllstand.
- [ ] **Gegenstände physisch lebendiger machen.** Die sieben Typen sind erkennbar und sauber ablegbar, verhalten sich auf dem Boden aber überwiegend gleich. Rollen, Kippen, Nachschwingen und gewichtsspezifische Aufhebezeiten sollten kontrolliert simuliert werden, ohne die verlässliche Ablage wieder zu gefährden.
- [ ] **Ablagen als Kapazitätssystem nutzen.** Visuelle Slots existieren bereits. Daraus können lesbare Teilziele entstehen: Rack-Reihe füllen, Matten farblich sortieren, Seile entwirren oder Ballnetz von unten nach oben beladen.
- [ ] **Mehr räumliche Audioquellen.** Fensterstadt, Lüftung, Kursbereich, Gewichte und Wäschezone brauchen leise positionsabhängige Klangbetten; aktuell trägt hauptsächlich die globale Musik die Atmosphäre.

### P2 – Motivation und Wiederspielwert

- [ ] **Schichtserien und Wochenziele ergänzen.** Tagesverträge sind solide, aber zwischen einzelner Runde und Level-Meisterschaft fehlt eine mittlere Zielschicht.
- [ ] **Bestleistungen besser vergleichbar machen.** Level × Modus ist getrennt; zusätzlich sollten Gegenstandsmenge und Dynamik als feste Wertungsklasse oder klarer Modifikator in Bestenlisten und Ergebnisvergleich einfließen.
- [ ] **Persönliche Rekorde im Moment markieren.** Neuer Tempo-, Präzisions-, Combo- oder Leistungsindex-Rekord sollte direkt während der Ergebnisauswertung sichtbar werden.
- [ ] **Kosmetik stärker präsentieren.** Der Shop ist funktional, aber eine drehbare Critter-Vorschau und Outfit-Sets würden Belohnungen wertiger machen.
- [ ] **Mehr Inhalte erst nach Systemtiefe.** Zusätzliche Critter, Gegenstände und Räume sind sinnvoll, sobald Ereignisse, Routen und Charakterboni genug Varianten erzeugen; sonst vergrößern sie hauptsächlich Pflegeaufwand.

### P3 – Bedienung, Accessibility und Technik

- [ ] **Tastenbelegung und Linkshänder-Modus.** Steuerung ist für Desktop und Touch vorhanden, aber nicht frei belegbar. Mobile Buttons sollten spiegelbar sein.
- [ ] **Kontrastprofile ergänzen.** Forced Colors und reduzierte Bewegung sind unterstützt. Zusätzlich fehlen ein farbunabhängiger Ablagecode, größere HUD-Schrift und getrennte Effekt-/Umgebungslautstärke.
- [ ] **`main.js` in Systeme zerlegen.** Rund 2.400 Zeilen koordinieren Szene, Figur, Items, Interaktion, Runde und UI. Als nächste Schnitte bieten sich `item-runtime`, `interaction-controller`, `round-runtime` und `hud-controller` an. Neue reine Logik wird bereits außerhalb dieser Datei aufgebaut.
- [ ] **Objekt-Pooling erweitern.** Trails verwenden schon einen Pool; Lieferpartikel, Staub und temporäre Materialien werden noch häufig neu erzeugt. Das verursacht auf schwächeren Mobilgeräten vermeidbare Garbage-Collection-Spitzen.
- [ ] **Visuelle Regressionstests etablieren.** Pure Spiellogik ist gut getestet. Für Matten, Ablage-Slots, Poster, Fenster, Seile und responsive HUD-Zustände fehlen reproduzierbare Referenzbilder.
- [ ] **Offline-Engine robuster ausliefern.** Die App-Shell wird gecacht, Babylon.js benötigt beim allerersten vollständigen Start aber weiterhin Internet. Eine selbst gehostete, versionierte Runtime würde den echten Erststart offline ermöglichen.

## Systembewertung

| Bereich | Heute | Größter Hebel |
|---|---|---|
| Kernschleife | Klar, schnell verständlich, gute physische Konsequenz durch Stolpern | Mehr wechselwirkende Ereignisse und Routenentscheidungen |
| Schwierigkeit | Vier Modi plus Level-Feintuning | Bewertungsregeln für benutzerdefinierte Schichten transparenter machen |
| Charaktere | Gute Silhouetten, unterschiedliche Geschwindigkeit/Traglast | Eigene aktive Spielmuster, Reaktionen und Auswertung |
| Gegenstände | Sieben lesbare Typen, hochwertige Ablage-Slots | Gewicht, Rollen/Kippen und Sortierketten spielerisch nutzen |
| Umgebung | Geschlossene, glaubwürdige Gym-Hülle, starke Detailarbeit | Level räumlich unterscheiden und Alltag animieren |
| Feedback | Navigator, Highlight, Audio, Combo, Toasts | Gefahrenlesbarkeit und dauerhafte Regelanzeige |
| Fortschritt | Sehr vollständig: Save, Historie, Trend, Verträge, Meisterschaft | Mittelfristige Ziele und bessere Rekordmomente |
| Menü | Hochwertiger mehrseitiger Wizard | Charakter- und Regelvergleich noch visueller machen |
| Accessibility | Gute Basis für Dialoge, Screenreader und Reduced Motion | Remapping, Textgröße, farbunabhängige Zielcodes |
| Technik | Keine Runtime-Abhängigkeiten im Build, breite Pure-Logic-Tests | Monolith aufteilen, visuelle Tests und Pooling |

## Nächste konkrete Arbeitsreihenfolge

Nach den in diesem Durchlauf abgeschlossenen Punkten folgt die Liste weiter von oben:

1. Kameraübergänge in engen Wegen.
2. Charaktereigene Reaktionen und Ergebnisdetails.
3. Erstes mechanisches Levelereignis als vertikaler Prototyp.
4. Sichtbare Herkunft neuer Wellen aus der Umgebung.
5. Räumliche Audioquellen für die drei Levelidentitäten.

Jeder Punkt sollte mit einer kleinen reinen Regellogik, automatisierten Tests und einer visuellen Prüfung in mindestens Desktop- und schmaler Touch-Größe abgeschlossen werden.
