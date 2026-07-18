# Gym Critters V4 – Critter Crew

Ein kleines 3D-Browsergame, in dem Rocco der Waschbär und Fibi das Eichhörnchen ein chaotisches Fitnessstudio aufräumen.

## Start unter Windows

1. ZIP entpacken.
2. `start-game.bat` doppelklicken.
3. Das Spiel öffnet sich automatisch im Browser.

Alternativ im Projektordner:

```bash
python start_game.py
```

Das Spiel verwendet Babylon.js. Wenn `vendor/babylon.js` nicht vorhanden ist, wird die Engine über ein CDN geladen; dafür ist eine Internetverbindung erforderlich.

## Steuerung

- `WASD` oder Pfeiltasten: laufen
- Maus: Kamera drehen
- `E`: aufnehmen, zusätzlich einsammeln, ablegen
- `Shift`: sprinten – nicht mit Hanteln oder Matten
- `C`: Kamera hinter der Figur ausrichten
- `Esc` oder `P`: Pause

Touch-Geräte erhalten einen virtuellen Joystick und Aktionsbuttons.

## Neu in V4

- Rocco und freischaltbare Fibi mit unterschiedlichen Fähigkeiten
- zwei leichte Tragplätze für Fibi
- schweres und sperriges Tragen mit eigenem Bewegungsverhalten
- interaktives Tutorial
- Münzshop mit sichtbaren Cosmetics
- drei Levelvarianten und drei Spieltempi
- sichtbar gefüllte Ablagestationen
- Achievements und Karrierestatistik
- Highscores, Bestzeiten und Ränge getrennt nach Modus
- sichereres Fallenlassen
- Charakterreaktionen, Sprachblasen und synthetische Hintergrundmusik
- Mobil-Einstellungen, Vibrationsfeedback und Grafikmodus
- Migration vorhandener V3-Spielstände

## Hinweise

Der Spielstand liegt lokal im Browser (`localStorage`). Es gibt keine Konten, keine Online-Rangliste und keine Echtgeldkäufe.
