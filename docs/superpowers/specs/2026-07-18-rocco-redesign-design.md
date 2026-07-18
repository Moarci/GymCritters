# Rocco neu zusammengebaut – Design

## Kontext

Aus der Nähe fällt Rocco auseinander. Nachgerechnet an `buildRaccoon()` ([src/main.js](../../../src/main.js)):

1. **Die Augen schweben in der Luft.** Augenweiß bei z = −0,55, aber die Kopfoberfläche endet auf Augenhöhe bei z ≈ −0,45 — die Augen hängen 0,1 Einheiten frei vor dem Gesicht. Im Profil offensichtlich.
2. **Die Banditenmaske steckt im Kopf.** Das flache Masken-Ellipsoid endet vorn bei z ≈ −0,39, also *hinter* der Kopffront — sichtbar sind nur die seitlich herausragenden Ränder als dunkle Flecken.
3. **Die Ohren sind Kegel-Hüte.** Zylinder mit Spitze (Ø 0,31 → 0,04) wirken wie Partyhüte statt wie Waschbärohren.
4. **Der Schwanz ragt waagerecht heraus** — sechs Segmente, 1,9 Einheiten gerade nach hinten, fast horizontale Kette.
5. **Pfoten und Füße fehlen** — Arme und Beine enden als abgeschnittene Kapseln.

Fibis Augen haben denselben Schwebe-Fehler (gleicher Helper-Aufruf) und werden mitkorrigiert.

## Ziel

Ein Waschbär, dessen Teile einander berühren: Gesicht als zusammenhängende Einheit, runde zweifarbige Ohren, ein aufgerollter Ringelschwanz, Pfoten an den Gliedmaßen.

## Nicht-Ziele

- Kein Wechsel des Stils (stilisierte Primitive bleiben), keine Skeleton-Animation, keine neuen Materialschemata.
- Fibi bleibt bis auf die Augenkorrektur unangetastet.
- Cosmetics-Positionen (Stirnband, Sonnenbrille) bleiben — sie sitzen am Kopf und passen weiterhin.

## Design

### Gesicht — eingelassen statt aufgehängt

Jedes Teil überlappt nachweislich seinen Träger (Werte nachgerechnet gegen die Ellipsoid-Oberflächen):

| Teil | neu | sitzt in |
|---|---|---|
| Schnauze | (0, 1,44, −0,34), Ø 0,5 | Rückseite tief in der Kopfkugel |
| Maske | **zwei Augenflecken** (±0,17, 1,62, −0,40) statt eines Bands | Rückseite im Kopf, Front steht 0,05 vor |
| Augenweiß | (±0,17, 1,63, −0,46) | Rückseite im Augenfleck |
| Pupille | z −0,532 | berührt die Front des Augenweiß |
| Nase | (0, 1,49, −0,52) | Rückseite in der Schnauze |

Die zwei Flecken *sind* die klassische Waschbär-Maske — und im Gegensatz zum Band sind sie sichtbar.

### Ohren — rund und zweifarbig

Statt der Kegel: außen eine dunkle, flachgedrückte Kugel (±0,26, 1,90), innen ein helleres, kleineres Ohrinneres leicht davor, beide leicht nach außen gekippt und unten in der Kopfkugel eingelassen.

### Schwanz — Ringel, der sich aufrollt

Die Geometrie wandert als `raccoonTailSpec()` nach `src/character-motion.js` (Muster wie Fibis Schwanz): sechs Kapseln entlang eines Bogens `z = 1,05·sin(0,3·i)`, `y = 0,72·(1−cos(0,3·i))`, wobei jede Kapsel **tangential zum Bogen rotiert** — die Spitze zeigt am Ende fast senkrecht nach oben. Der Farbwechsel dunkel/hell (die Ringel) bleibt. Spitze bei ≈ Schulterhöhe statt 1,9 waagerecht hinterm Körper.

### Pfoten und Füße

Kleine dunkle Kugeln **als Kinder der Gliedmaßen** (nicht der Figur), damit sie Armschwung und Tragehaltung automatisch mitmachen. Füße leicht nach vorn gestreckt, damit die Figur auf etwas steht.

## Verifikation

**Unit-Tests** für `raccoonTailSpec()`: sechs Segmente, Verjüngung ≥ 30 %, y steigt monoton (der Schwanz rollt nach oben), z ≤ 1,1, Rotation fällt monoton von π/2 (waagerechter Ansatz) Richtung senkrecht — der Bogen ist ein Aufrollen, kein Knick.

**Browser, geometrisch:** Für Augenweiß↔Augenfleck, Nase↔Schnauze, Ohr↔Kopf die Welt-Bounding-Boxen auf Überlappung prüfen — nichts darf mehr schweben.

**Browser, visuell:** Profil-Screenshot aus demselben Blickwinkel wie die Beschwerde.
