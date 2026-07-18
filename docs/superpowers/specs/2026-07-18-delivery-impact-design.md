# Spürbares Abliefern – Design

## Kontext

Das Abliefern ist der Kern von Gym Critters — es ist die Handlung, für die es Punkte, Combo und Rang gibt. Im Spiel fühlt es sich aber beiläufig an, obwohl bereits sehr viel Rückmeldung existiert: Punkte-Pop, Streak-Pop bei Combo 3/5/8/10, Sound, Vibrationsmuster, Partikel-Burst, Toast, Charakterspruch, und der Gegenstand fliegt in einem 500-ms-Bogen sichtbar an seinen Platz.

Die Analyse von `deliverAtZone()` und `animateDeliveredItem()` in [src/main.js](../../../src/main.js) zeigt zwei Ursachen, die keine Effektmenge beheben kann:

1. **Das Feedback feuert 500 ms zu früh.** Sämtliche Rückmeldung wird beim Druck auf `E` ausgelöst. Der Gegenstand braucht danach noch 500 ms bis zur Ablage. Die Feier ist vorbei, bevor das Ding gelandet ist — Ursache und Wirkung sind zeitlich entkoppelt. Es gibt einen Moment des *Abschickens*, aber keinen des *Ankommens*.
2. **Nichts nimmt den Gegenstand entgegen.** Der Wäschekorb wackelt nicht, das Hantelregal ruckt nicht. Die Zonen sind dem Spiel als Objekte gar nicht bekannt: `addZone()` speichert nur den Bodenmarker und das Leuchtzeichen, nicht die eigentlichen Meshes.

Dazu kommt, dass alle Rückmeldung gleichzeitig und gleich laut feuert — es gibt keine Hierarchie, dadurch sticht nichts heraus.

## Ziel

Das Abliefern körperlich machen: Der Gegenstand kommt spürbar an, und die Zone nimmt ihn sichtbar und hörbar entgegen.

Umfang: **Phase 1 (der einzelne Moment).** Die Eskalation über die Runde ist Phase 2 und bekommt eine eigene Spec; dieses Design legt nur die Nahtstelle dafür.

## Ton

Gym Critters ist ein gemütliches Aufräumspiel, kein Actionspiel. Angestrebt wird ein befriedigendes *Plopp*, kein wuchtiger Treffer. Bildschirmwackeln, Zeitlupe und Trefferblitze sind bewusst ausgeschlossen — sie gehören in ein anderes Genre und würden den Charakter des Spiels brechen.

## Nicht-Ziele

- Keine Änderung an Punkteberechnung, Combo-Regeln, Rängen oder Münzausschüttung.
- Keine Änderung am Verhalten bei falscher Ablage (ist bereits deutlich unterscheidbar).
- Keine Audio-Dateien — alles bleibt synthetisch über die Web Audio API.
- Keine Eskalation über die Runde (Phase 2).
- Kein Bildschirmwackeln, kein Hit-Stop.

## Design

### 1. Zwei getrennte Momente

Die Rückmeldung wird auf zwei Zeitpunkte aufgeteilt, statt gebündelt beim Tastendruck zu feuern:

| Zeitpunkt | Was passiert | Rolle |
|---|---|---|
| `E` gedrückt | Leiser Bestätigungsklick, Gegenstand startet seinen Bogen, Punkte-Pop erscheint | „Angenommen" |
| Gegenstand landet (nach 500 ms) | Zone staucht und federt nach, materialabhängiger Aufschlag-Sound, Staubwölkchen, minimaler Kamera-Stups, Vibration | „Angekommen" |

Konkret zur bestehenden Rückmeldung:

- Der heutige `deliver`-Sound **wandert an den Landezeitpunkt**. Der Tastendruck bekommt stattdessen einen deutlich kürzeren, leiseren Bestätigungston, damit die Eingabe quittiert wird, ohne dem Aufschlag die Bühne zu nehmen.
- Das Vibrationsmuster wandert ebenfalls auf den Landezeitpunkt — es soll den Aufschlag begleiten, nicht den Tastendruck.
- Toast und Charakterspruch wandern ans Ende der Kette, damit sie den Landemoment nicht übertönen.
- Der bestehende bunte Belohnungs-Burst (`showDeliveryBurst`) bleibt am Landepunkt und behält seine Rolle als *Belohnungs*-Signal; das neue Staubwölkchen ist das *Aufprall*-Signal.

Der Punkte-Pop bleibt bewusst beim Tastendruck: Er ist Information („das hat sich gelohnt"), nicht Wucht, und soll unmittelbar auf die Eingabe antworten.

### 2. Die Zone nimmt den Gegenstand entgegen

`addZone()` bekommt einen zusätzlichen Parameter mit den sichtbaren Meshes der Zone und legt sie als `zone.bodyMeshes` ab. Die bestehenden absoluten Koordinaten der Meshes bleiben unangetastet — die Stauchung rechnet je Mesh mit dessen eigener Höhe, statt alles unter einen neuen Elternknoten zu hängen. Das vermeidet ein Umschreiben aller sieben Zonen-Builder auf relative Koordinaten.

Die Stauchung ist eine **gedämpfte Schwingung**, kein einmaliges Zucken:

```
offset(t) = exp(-5t) · cos(3πt)
scaleY  = 1 − offset · strength · 0.18
scaleXZ = 1 + offset · strength · 0.10
```

Bei `t = 0` ist die Zone maximal gestaucht und verbreitert, danach schwingt sie über die Ruhelage hinaus und pendelt sich ein. Genau dieses Nachfedern lässt Masse spüren. Dauer: 420 ms.

Damit die Meshes am Boden bleiben statt zu schweben, wird zusätzlich zur Skalierung die y-Position anteilig zur Stauchung abgesenkt (jedes Mesh relativ zu seiner eigenen Ausgangshöhe).

### 3. Materialabhängiger Aufschlag

Der Klang trägt Information — man hört, was gelandet ist:

| Gegenstand | Charakter |
|---|---|
| Hantel, Kettlebell | metallisch, hart, tief |
| Trinkflasche | hell, kurz, klackend |
| Handtuch | dumpf, sehr leise, kurz |
| Trainingsmatte, Medizinball | weich, mittel-tief |
| Springseil | weich, mittel |

Umgesetzt über die bestehende `tone()`-Mechanik in [src/audio.js](../../../src/audio.js): je Aufschlag ein tiefer Körper-Ton plus optional ein kurzer heller Anschlag für harte Materialien.

### 4. Kamera-Stups

Ein kurzer Radius-Impuls der Kamera (ca. 0,06 Einheiten nach innen, dann zurück), skaliert mit der Gewichtsklasse.

**Harte Randbedingung:** Der Stups darf **`camera.alpha` nicht anfassen**. Kamera-Ausrichtung und Spieler-Rotation stehen in einer strikt einseitigen Abhängigkeit (Maus/`C` → Bewegungsrichtung → Figur); jede zusätzliche Schreibstelle auf `alpha` bringt das Feedback-Problem zurück, das im Kamera-Fix behoben wurde. Der Radius ist von dieser Kette unabhängig und deshalb sicher.

### 5. Staubwölkchen

Wenige kleine, graue, schnell verblassende Partikel am Landepunkt — bewusst visuell verschieden vom bestehenden bunten Belohnungs-Burst, damit beide nebeneinander lesbar bleiben.

### 6. Mehrere Gegenstände gleichzeitig

Liefert Fibi zwei Gegenstände auf einmal ab, werden die Flüge um **80 ms je Index versetzt** gestartet. Dadurch landen sie nacheinander und erzeugen zwei getrennte *Plopps* statt eines Matschs.

### 7. Neues Modul

`src/impact.js` enthält die reine Logik, nach dem Vorbild von `targeting.js` und `save.js` (Abhängigkeiten als Parameter, kein Zugriff auf Modul-Globals):

| Funktion | Rückgabe |
|---|---|
| `impactStrength(weight)` | Wucht-Faktor für `"heavy"`, `"bulky"`, `"light"` |
| `squashAt(t)` | `{ scaleY, scaleXZ }` für normalisierte Zeit `t` |
| `impactSound(itemType, pitchFactor = 1)` | Klangbeschreibung (Frequenzen, Wellenform, Dauer, Lautstärke) |

Die imperative Anwendung (Babylon-Meshes animieren, Ton abspielen) bleibt in `main.js` bzw. `audio.js`.

### 8. Grafikmodus „Leicht"

Bei `save.settings.quality === "low"` entfallen Staubwölkchen und Kamera-Stups. Stauchung und Aufschlag-Sound bleiben — sie kosten praktisch nichts und tragen den Effekt allein.

### 9. Nahtstelle für Phase 2

`impactSound()` nimmt einen optionalen `pitchFactor` mit Standardwert `1`. Die Eskalation in Phase 2 ändert damit nur den Aufrufer, nicht die Klangdefinitionen. Ebenso lässt sich `impactStrength` später mit der Combo skalieren, ohne die Kurve anzufassen.

## Randfälle

- **Zweiter Aufschlag während des Nachfederns:** Die laufende Animation der Zone wird **zurückgesetzt statt gestapelt**. Zwei Observer auf denselben Meshes würden sich sonst gegenseitig überschreiben und die Zone würde zucken statt federn. Je Zone darf höchstens eine Stauch-Animation aktiv sein.
- **Rundenneustart mitten im Flug:** Alle neuen Observer werden in derselben Aufräumliste registriert wie die bestehenden Lieferanimationen (`deliveryObservers`), die `spawnItems()` bereits leert.
- **Rundenende während des Flugs:** Der Aufschlag wird ausgelöst, *bevor* `onComplete` gerufen wird, damit die bestehende Zählung offener Animationen in `onDeliveryAnimationFinished()` unverändert funktioniert.
- **Zone ohne `bodyMeshes`:** Fehlt die Liste (etwa weil ein künftiger Zonen-Builder sie nicht übergibt), wird die Stauchung übersprungen statt zu werfen. Sound und Partikel laufen weiter.

## Betroffene Dateien

- `src/impact.js` — neu, reine Logik
- `test/impact.test.js` — neu, Unit-Tests
- `src/environment/decor.js` — `addZone()` nimmt die Mesh-Liste entgegen, sieben Builder übergeben sie
- `src/audio.js` — Aufschlag-Wiedergabe aus einer Klangbeschreibung
- `src/main.js` — Umverteilung der Rückmeldung auf die zwei Zeitpunkte, Zonen-Stauchung, Kamera-Stups, Staubwölkchen, versetzter Start bei mehreren Gegenständen

## Verifikation

**Unit-Tests** (`npm test`) für die reine Logik:
- `impactStrength`: schwer > sperrig > leicht, alle Werte in `(0, 1]`
- `squashAt(0)`: gestaucht (`scaleY < 1`, `scaleXZ > 1`)
- `squashAt(1)`: praktisch neutral (beide ≈ 1)
- `squashAt` überschwingt mindestens einmal (`scaleY > 1` in der Mitte) — das ist das Nachfedern und der Kern des Effekts
- `impactSound`: schwere Materialien tiefer als leichte, unbekannter Typ liefert einen brauchbaren Rückfall, `pitchFactor` skaliert die Frequenzen

**Browser-Prüfung** (kein automatisiertes Setup vorhanden):
1. Je einen Gegenstand jeder Gewichtsklasse abliefern — Hantel muss hörbar anders landen als Handtuch
2. Die Zone dabei beobachten: sie muss stauchen **und nachfedern**, nicht nur einmal zucken
3. Mit Fibi zwei Gegenstände gleichzeitig abliefern — zwei getrennte Landungen hörbar
4. Denselben Gegenstandstyp mehrfach schnell hintereinander in dieselbe Zone — kein Zucken oder Verspringen der Zone
5. Runde mitten im Flug neu starten — keine Fehler in der Konsole, keine hängenden Animationen
6. Grafikmodus „Leicht" — Stauchung und Sound bleiben, Staub und Kamera-Stups entfallen
7. Kamera während des Ablieferns bewegen — die Ausrichtung darf nicht springen (Beleg, dass `alpha` unangetastet bleibt)
