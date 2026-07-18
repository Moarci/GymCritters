# Fibis Schwanz-Proportionen – Design

## Kontext

Fibis Schwanz dominiert jede Ansicht der Figur. Die Zahlen aus `buildSquirrel()` ([src/main.js](../../../src/main.js)):

- Acht Kugeln mit Durchmesser 0,62 → 0,445 — nur **28 % Verjüngung** über die gesamte Länge, der Schwanz wirkt wie ein Rohr statt wie eine Feder.
- Er steigt auf relative Höhe 1,79 (absolut 2,51) — **deutlich über den Kopf** (Oberkante ≈ 1,93) und die Ohrenspitzen hinaus.
- Er reicht 1,75 nach hinten — bei einem Rumpf von 1,06 Höhe ragt er weiter aus der Figur, als die Figur groß ist.

In Screenshots nimmt der Schwanz regelmäßig die halbe Bildfläche der Figur ein; beim Laufen zieht die Kette als riesige Wurst hinterher.

## Ziel

Ein buschiger Eichhörnchen-Schwanz, der sich hinter der Figur **aufrollt** statt aus ihr herauszuragen: deutliche Verjüngung, Scheitel auf Kopfhöhe, kompakte Tiefe.

## Nicht-Ziele

- **Kein Kopf-Gruppen-Umbau.** Das Umschauen im Leerlauf braucht ein Reparenting von Kopf, Gesicht *und* Cosmetics (Stirnband/Sonnenbrille hängen an `playerVisual`) — eigenes Vorhaben mit eigenem Risiko.
- **Rocco bleibt unangetastet.** Seine Silhouette war in allen Prüfbildern stimmig.
- Keine Änderung an der Schwanz-Animation (`tailRoot`-Wedeln, Leerlauf-Zucken) — nur an der Geometrie.

## Design

Die Geometrie wandert als reine Funktion `squirrelTailSpec()` nach `src/character-motion.js` — damit sind die Proportionen testbar, statt als Magische Zahlen im Builder zu liegen.

Acht Segmente entlang eines Bogens:

| Größe | bisher | neu |
|---|---|---|
| Durchmesser | 0,62 → 0,445 (28 % Verjüngung) | 0,46 → 0,25 (**46 %**) |
| Höhe (relativ zu `tailRoot`) | linear bis 1,79 | Bogen `1,22 · sin(0,26·i)` bis ≈ 1,18 — **Scheitel knapp unter Kopfoberkante** |
| Tiefe | linear bis 1,75 | Bogen `0,72 · sin(0,24·i)` bis ≈ 0,72 |
| Seitliches Pendeln | ±0,16 | ±0,10 |

Die Sinus-Bögen lassen den Schwanz zum Ende hin **einrollen** (die Zuwächse werden kleiner), statt linear weiterzuwachsen — das ist die typische Eichhörnchen-Silhouette.

`buildSquirrel()` konsumiert die Spezifikation; die per-Kugel-Skalierung (0,8 / 1,1 / 0,72) und der Farbwechsel bleiben im Builder.

## Verifikation

**Unit-Tests** fixieren die Proportionen:
- acht Segmente, streng monoton fallende Durchmesser, Verjüngung mindestens 40 %
- maximale relative Höhe ≤ 1,21 (bleibt unter der Kopfoberkante bei `tailRoot`-Höhe 0,72)
- maximale Tiefe ≤ 0,78, seitliches Pendeln ≤ 0,10
- deterministisch

**Browser:** Fibi auswählen, Screenshot von hinten und von der Seite — der Schwanz muss hinter der Figur bleiben und darf Kopf/Ohren nicht überragen. Extents zusätzlich aus den Mesh-Positionen gemessen.
