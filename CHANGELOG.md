# Changelog

## Gym-Umgebung

- geschlossene Gebäudehülle mit durchgehendem Boden und bündiger Betondecke statt schwarzer Außenleere
- zurückgesetzte Eingangslobby mit Glasfront, Läufer und beleuchtetem „GYM CRITTERS“-Schild
- korrekt eingelassene Industriefenster mit tiefen Rahmen, Laibungen, Sprossen, Querstreben und Fensterbänken
- prozedurale Stadtansicht am Morgen hinter den Scheiben statt sternenartigem Nachthimmel

## Dauerhafte lokale Spielstände

- alle Node- und Python-Startwege verwenden fest `http://127.0.0.1:8347`
- keine Ausweichports mehr, die versehentlich einen leeren Browser-Speicher anzeigen
- ein zweiter Start erkennt die bereits laufende Gym-Critters-Instanz und öffnet sie erneut
- verständliche Fehlermeldung, falls ein fremdes Programm den festen Spiel-Port belegt

## Mobile-Optimierung

- Hochformat vollwertig spielbar: eigenes HUD-Layout, stabiles horizontales Sichtfeld, Orientierungshinweis entfällt
- eigene Look-Zone auf Touch: Laufen und Umsehen gleichzeitig, ohne Kamerasprung durch den zweiten Finger
- Joystick mit Deadzone gegen Daumen-Drift, sauberes Clamping und Recentering
- Kamera-Ausrichten auch unten rechts in Daumenreichweite
- gehaltene Eingaben lösen sich beim Tab-Wechsel, statt die Figur weiterlaufen zu lassen
- neue Grafikeinstellung „Automatisch": regelt Auflösung und Detailstufe nach gemessener Bildrate

## V4 – Critter Crew

- vollständiges Progressionssystem mit Shop und Ausrüstung
- Eichhörnchen Fibi als freischaltbare zweite Figur
- figurspezifische Bewegung, Tragfähigkeit und Punktboni
- zwei leichte Gegenstände gleichzeitig tragbar
- Tutorial für die erste Schicht
- drei Levelvarianten: Feierabend, Nach dem Kurs, Leg Day Chaos
- Ablageorte füllen sich sichtbar
- Achievements, Statistiken und modusgetrennte Bestwerte
- bessere Objektmechaniken, sichere Drop-Positionen und Sprintregeln
- Charakterreaktionen, Quips, Hintergrundmusik und verbesserte Sounds
- zusätzliche mobile Komforteinstellungen
- modularisierte Dateien für Konfiguration, Spielstand und Audio
