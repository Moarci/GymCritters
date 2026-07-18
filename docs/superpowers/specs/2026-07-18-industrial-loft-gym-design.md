# Industrial-Loft-Gym-Umgebung – Design

## Kontext

`src/main.js` (Babylon.js, 1484 Zeilen) baut die Spielumgebung aktuell komplett aus
einfarbigen PBR-Boxen/Zylindern: ein Boden, vier 4,7 Einheiten hohe Wände und ein paar
flache "Deckenlicht"-Panels. Es gibt keine echte Decke – oberhalb der Wandkante zeigt
`scene.clearColor` (dunkles Navy-Schwarz) direkt in die Leere. Zusammen mit den reinen
Flachfarben-Wänden wirkt der Raum wie "eine Fläche in einem schwarzen Universum" statt
wie ein echtes Fitnessstudio.

Ziel: Die Umgebung zu einem Industrie-Loft-Gym ausbauen – geschlossene Decke,
strukturierte Wände, Wanddetails – ohne das Zero-Asset-Prinzip des Projekts zu brechen
(kein Build-Schritt, kein Asset-Ordner, ZIP-Doppelklick-Start bleibt erhalten) und ohne
Gameplay zu verändern.

## Nicht-Ziele

- Keine Änderungen an Spiellogik, Items, Zonen-Positionen, Charakteren, Spielfeldgrenzen
  (`CONFIG.roomHalfX/Z`) oder Steuerung.
- Keine echten Bilddateien/Texturen – alle Oberflächenstrukturen werden prozedural per
  `DynamicTexture`/Canvas erzeugt (wie das bestehende "CLOSING CREW"-Schild).
- Keine neuen Build-Tools oder Abhängigkeiten.

## Design

### 1. Decke & Void-Fix

- Eine Deckenplatte (Sichtbeton-Textur) schließt den Raum bei y ≈ 4.9 vollständig.
- Stahl-Dachbinder (Fachwerk aus Boxen/Zylindern) spannen in regelmäßigen Abständen quer
  über den Raum; daran entlang laufen Lüftungsrohre und Kabeltrassen.
- Die bisherigen flachen Deckenlicht-Panels werden durch hängende Käfig-Pendelleuchten
  ersetzt (Zylinder-Käfig + emissive Glühbirne an dünner Kette/Seil vom Träger).
- 2–3 schmale Oberlicht-Streifen in der Decke mit einer sanften Dämmerungs-Gradient-
  Textur statt hartem Schwarz – Decke bleibt aber vollständig geschlossen.

### 2. Wandmaterial

- Sichtbeton-Textur (prozedural: Rauschen + Flecken + feine Fugenlinien) ersetzt die
  Flachfarben an Seiten-/Rückwand.
- Die dunkle Akzentwand bekommt einen dezenten Metall-/Rost-Textur-Touch an Kanten und
  Ecken.

### 3. Wanddetails

- **Industriefenster:** Sprossenfenster (Stahlrahmen-Gitter) in den Seitenwänden, dahinter
  eine gedimmte Loft-/Nachthimmel-Gradient-Fläche – nutzt den bisherigen Schwarzton als
  "Blick nach draußen bei Nacht" statt als Leere.
- **Pegboard mit Equipment:** Lochwand-Segmente (prozedurale Perforations-Textur) neben
  bestehenden Zonen, mit hängenden Kettlebells, Resistance Bands, Springseilen als reine
  Deko-Meshes (nicht interaktiv).
- **Rohre & Kabelkanäle:** Metallrohre/Kabeltrassen mit Knick- und Abzweigstücken entlang
  Wand-Decken-Kante und Ecken.
- **Graffiti/Mural:** Großflächiges Wandbild (Canvas-Textur, Typo + Streetart-Akzente) an
  der Rückwand, plus 1–2 kleinere Tag-Akzente an Seitenwänden.

### 4. Technische Umsetzung

- Alle neuen Texturen entstehen per `DynamicTexture`/Canvas-Code, keine Bilddateien.
- Neue Elemente sind Low-Poly-Primitives (Box/Zylinder/Torus), passend zum bisherigen
  Stil.
- Bestehender `save.settings.quality === "low"`-Grafikmodus wird respektiert: feinere
  Details (Rohre/Kabeltrassen, Pegboard-Requisiten) werden dort übersprungen.
- Spielfeldgrenzen, Items, Zonen-Positionen, Charaktere bleiben unverändert.

### 5. Code-Organisation

`src/main.js` lagert die komplette Umgebungserstellung in neue Module aus:

- `src/environment/textures.js` – prozedurale Canvas-Texturgeneratoren (Beton, Rost,
  Pegboard-Perforation, Mural, Dämmerungs-Gradient). Reine Funktionen `(scene) => texture`.
- `src/environment/structure.js` – Boden, Wände, Decke, Dachbinder, Fenster, Rohre.
  Exportiert `buildStructure(scene, shadowGenerator)`.
- `src/environment/decor.js` – Zonen (Hantelregal, Wäschekorb, Flaschenbox, Mattenregal),
  Basis-Deko (Bank, Squat-Rack, Pflanzen), Level-Deko, Pegboard-Requisiten. Exportiert
  `buildDecor(scene, shadowGenerator)` inkl. `zones`/`obstacles`.
- `main.js` ruft `buildEnvironment(scene, shadowGenerator)` (kleiner Orchestrator in
  `src/environment/index.js`) auf und erhält `{ zones, obstacles }` für den Rest der
  Spiellogik zurück – identische Schnittstelle zum bisherigen `createGym() +
  createZones() + createBaseDecor() + createLevelDecor()`-Aufrufblock in `createScene()`.

### Architektur-Skizze

```
main.js
  createScene()
    -> buildEnvironment(scene, shadowGenerator)   [environment/index.js]
         -> buildStructure(scene, shadowGenerator) [environment/structure.js]
              -> textures.* [environment/textures.js]
         -> buildDecor(scene, shadowGenerator)     [environment/decor.js]
              -> textures.* [environment/textures.js]
       returns { zones, obstacles }
```

## Testing / Verifikation

Rein visuelles Feature ohne automatisierte Tests im Projekt (kein Test-Setup vorhanden).
Verifikation erfolgt durch:

- Lokalen Server starten (`python start_game.py` bzw. bestehendes Start-Skript).
- Spiel im Browser öffnen, Kamera in alle Richtungen drehen (insbesondere nach oben, an
  die Wände heran) und prüfen, dass kein schwarzer Void mehr sichtbar ist.
- Alle drei Level (`closing`, `class`, `legday`) kurz anspielen, um sicherzustellen, dass
  Wanddetails/Deko keine bestehenden Zonen oder den Spielbereich blockieren.
- Performance-Check im `quality: "low"`-Modus (Einstellungen im Spiel umschaltbar).

## Offene Annahmen

- Die vier Wanddetail-Typen werden über die vorhandene Wandfläche verteilt, ohne die
  offene Vorderseite (Spieler-Start/Kamera-Eingang bei z ≈ -9.35) oder bestehende
  Zonen-Positionen zu überlappen.
- Fenster und Pegboards sind rein dekorativ (kein Durchgang, keine Kollisionsänderung).
