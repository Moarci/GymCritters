# Sichtbarer Fortschritt & Ziele für alle Gegenstände – Design

## Kontext

Gym Critters gibt wenig Grund, eine weitere Runde zu starten. Drei belegbare Ursachen:

1. **Fortschritt ist unsichtbar.** `renderAchievements()` in [src/main.js](../../../src/main.js) rendert für jedes noch offene Ziel nur „❔ / Noch offen". Bei „Insgesamt 50 Gegenstände aufräumen" sieht man nicht, ob man bei 3 oder bei 49 steht. Die Zahlen liegen alle in `save.stats` — sie werden nur nie gezeigt.
2. **Ein Drittel der Gegenstände hat keine Ziele.** Kettlebell, Springseil und Medizinball kamen mit der Ablageorte-Erweiterung dazu; Achievements wurden dort bewusst ausgelassen. Von sieben Gegenstandstypen kommen nur zwei in den Zielen vor.
3. **Nach der Runde gibt es keinen Anstoß.** Der Ergebnisbildschirm zeigt Punkte, Münzen und Bestwerte — aber nichts darüber, was als Nächstes erreichbar wäre. Genau dort entscheidet sich, ob jemand nochmal drückt.

## Ziel

Sichtbar machen, wo man steht, und für jeden Gegenstandstyp ein Ziel anbieten.

## Nicht-Ziele

- **Keine Änderung an der Rundenmechanik.** Combo, Punkte, Ränge und Aufschlag-Rückmeldung bleiben unangetastet — die Entscheidung fiel bewusst gegen „mehr Entscheidungen in der Runde".
- **Kein neuer Shop-Inhalt.** Münzen werden nach rund 55 Runden wertlos (alle Artikel zusammen kosten 945, eine Runde bringt 15–20). Das ist ein echtes, aber fernes Problem und führt in Charaktermodellierung — eigener Track.
- **Kein erfundener Fortschritt.** Ziele ohne zählbaren Verlauf bekommen keinen Balken (siehe unten).

## Design

### 1. Zähler je Gegenstandstyp

Heute existiert nur `save.stats.totalDumbbells` — ein Sonderfall für ein einzelnes Ziel. Statt zwei weitere Sonderfälle anzuhängen, kommt ein Zähler je Typ: `save.stats.byType = { dumbbell: 12, towel: 30, … }`.

Das trägt alle sieben Typen und alles Künftige ohne weitere Struktur.

**Save-Migration auf Version 5:** Bestehende Spielstände bekommen `byType.dumbbell` aus dem vorhandenen `totalDumbbells` gesetzt, damit niemand seinen Fortschritt Richtung „Schwerarbeiter" verliert. `totalDumbbells` bleibt zunächst erhalten (additive Migration, nichts wird destruktiv entfernt).

Während der Runde zählt `state.deliveredByType` mit; bei Rundenende wird es auf `save.stats.byType` addiert — dasselbe Muster wie beim bestehenden `state.deliveredDumbbells`.

### 2. Vier neue Ziele

| Name | Bedingung | Begründung der Zahl |
|---|---|---|
| Kettlebell-König | 10 Kettlebells aufräumen | Spiegelt „Schwerarbeiter" (10 Hanteln) für den neuen schweren Typ |
| Seilspringer | 15 Springseile aufräumen | Leichter Typ, kommt häufiger vor — daher höher angesetzt |
| Ballkünstler | 10 Medizinbälle aufräumen | Spiegelt den sperrigen Typ |
| Vollsortiment | Von jedem der sieben Typen mindestens einen | In ein bis zwei Runden erreichbar — zeigt früh, dass es die Vielfalt gibt |

### 3. Fortschritt deklarativ, nicht als Code in der Konfiguration

`config.js` bleibt reine Daten (Regel „Config First"). Ziele mit zählbarem Verlauf bekommen einen Deskriptor:

```js
{ id: "heavy-lifter", …, progress: { kind: "itemType", type: "dumbbell", target: 10 } }
{ id: "gym-hero",     …, progress: { kind: "totalDelivered", target: 50 } }
{ id: "collector",    …, progress: { kind: "ownedExtras", target: 4 } }
{ id: "full-range",   …, progress: { kind: "distinctTypes", target: 7 } }
```

Ausgewertet wird das in `save.js` neben `evaluateAchievements` — dieselbe Zuständigkeit, dieselbe Datei.

| Art | Bedeutung |
|---|---|
| `itemType` | `byType[type]` gegen `target` |
| `totalDelivered` | Gesamtzahl aufgeräumter Gegenstände |
| `ownedExtras` | Besitz ohne die Startausrüstung (`raccoon`, `headband-lime`) |
| `distinctTypes` | Anzahl Typen mit mindestens einem aufgeräumten Exemplar |

### 4. Kein erfundener Fortschritt

Ziele wie „Klebrige Pfoten" (eine Runde ohne Fallenlassen) oder „Blitzsauber" (Standard unter 75 Sekunden) sind **Ja/Nein-Bedingungen pro Runde**. Für sie gibt es kein „47 von 50".

Diese behalten schlicht „Noch offen". Ein Fortschrittsbalken, der nie wächst, wäre schlechter als gar keiner — er verspricht Nähe, wo keine ist.

`achievementProgress()` liefert für sie `null`.

### 5. Zwei Anzeigeorte

**Achievement-Bildschirm:** Karten mit Deskriptor zeigen „47 / 50" und einen Balken.

**Ergebnisbildschirm:** eine Zeile „Nächstes Ziel: Schwerarbeiter — noch 3 Hanteln", ermittelt über `nextGoal(save)`.

Der zweite Ort trägt die eigentliche Wirkung: Der Moment direkt nach der Runde ist der, in dem man entscheidet, ob man nochmal drückt. Fortschritt nur in einem Bildschirm zu zeigen, den niemand öffnet, bewegt niemanden.

`nextGoal(save)` wählt unter den **noch nicht freigeschalteten** Zielen mit Deskriptor das anteilig am weitesten fortgeschrittene. Gibt es keines, entfällt die Zeile.

## Betroffene Dateien

- `src/config.js` — vier neue Achievements, `progress`-Deskriptoren an den zählbaren Zielen
- `src/save.js` — `byType` in den Defaults, Migration auf Version 5, `achievementProgress()`, `nextGoal()`, Auswertung der neuen Ziele
- `src/main.js` — `state.deliveredByType` mitzählen, bei Rundenende addieren, Balken im Achievement-Bildschirm, Zielzeile im Ergebnisbildschirm
- `style.css` — Darstellung von Balken und Zielzeile
- `test/save.test.js` — Migration und die neuen reinen Funktionen

## Verifikation

**Unit-Tests:**
- Migration: V4-Spielstand mit `totalDumbbells: 7` ergibt `byType.dumbbell === 7`; ein bestehender V5-Stand bleibt unverändert
- `achievementProgress` liefert `null` für Ziele ohne Deskriptor
- Jede der vier Deskriptor-Arten rechnet korrekt, auch bei leerem Spielstand
- `distinctTypes` zählt nur Typen mit Anzahl > 0
- `ownedExtras` klammert die Startausrüstung aus
- `nextGoal` wählt das anteilig nächste Ziel, überspringt bereits freigeschaltete und liefert `null`, wenn nichts offen ist
- Die vier neuen Ziele schalten bei erreichter Schwelle frei und nur einmal

**Browser-Prüfung:**
1. Achievement-Bildschirm öffnen — zählbare Ziele zeigen Zahlen und Balken, Ja/Nein-Ziele nur „Noch offen"
2. Eine Runde beenden — die Zielzeile erscheint und nennt ein tatsächlich offenes Ziel
3. Alle sieben Typen einmal abliefern — „Vollsortiment" schaltet frei
4. Bestehenden Spielstand mit Hantel-Fortschritt laden — der Fortschritt bei „Schwerarbeiter" bleibt erhalten
