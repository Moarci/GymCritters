// Datenbasiertes Feedback für den Ergebnisbildschirm. Die Reihenfolge ist
// bewusst spielerisch: erst Runde beenden und sicher laufen, dann Präzision,
// Serien und Tempo optimieren.

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function roundCoaching(round = {}, trend = {}) {
  const total = Math.max(1, Number(round.totalItems) || 1);
  const delivered = clamp(Number(round.delivered) || 0, 0, total);
  const elapsed = Math.max(0, Number(round.elapsed) || 0);
  const secondsPerItem = delivered ? elapsed / delivered : 0;
  const wrong = Math.max(0, Number(round.wrongPlacements) || 0);
  const dropped = Math.max(0, Number(round.droppedItems) || 0);
  const trips = Math.max(0, Number(round.trips) || 0);
  const maxCombo = Math.max(0, Number(round.maxCombo) || 0);
  const cleanRatio = clamp(1 - (wrong + dropped * 0.5 + trips * 0.5) / total, 0, 1);
  const metrics = [
    `${secondsPerItem.toFixed(1).replace(".", ",")} s/Gegenstand`,
    `${Math.round(cleanRatio * 100)} % sauber`,
    `Beste Serie ${maxCombo}`,
  ];

  if (round.completed !== true) {
    const remaining = Math.max(0, total - delivered);
    return {
      tone: "focus",
      title: "Nächster Fokus: Runde abschließen",
      body: `Noch ${remaining} ${remaining === 1 ? "Gegenstand war" : "Gegenstände waren"} offen. Nutze im Auftakt den Navigator und räume nahe Dinge mit demselben Ablageziel nacheinander weg.`,
      metrics,
    };
  }
  if (trips >= 2) {
    return {
      tone: "focus",
      title: "Nächster Fokus: sichere Laufwege",
      body: "Plane den Rückweg an bereits geräumten Flächen entlang und sprinte nicht blind durch Gegenstandsgruppen. Weniger Stolperer schützen Last und Combo.",
      metrics,
    };
  }
  if (wrong >= 2) {
    return {
      tone: "focus",
      title: "Nächster Fokus: Ablagen lesen",
      body: "Folge beim Tragen dem grünen Navigator und achte auf die aufleuchtende Zielzone. Zwei vermiedene Fehlablagen halten die komplette Serie am Leben.",
      metrics,
    };
  }
  if (dropped >= 2) {
    return {
      tone: "focus",
      title: "Nächster Fokus: Last sichern",
      body: "Lege nur bewusst ab und nimm für riskante Wege lieber einen Gegenstand weniger mit. Eine sichere Lieferung ist wertvoller als ein verlorener Umweg.",
      metrics,
    };
  }
  if (maxCombo < Math.ceil(total * 0.65)) {
    return {
      tone: "focus",
      title: "Nächster Fokus: Serie halten",
      body: "Sortiere die nächsten Ziele schon vor dem Aufheben. Richtige Lieferungen ohne Fehlablage bauen den größten noch offenen Punktehebel auf.",
      metrics,
    };
  }

  const benchmark = Math.max(1, Number(round.expectedSecondsPerItem) || 14);
  if (round.timed !== false && secondsPerItem > benchmark * 1.12) {
    return {
      tone: "focus",
      title: "Nächster Fokus: kürzere Wege",
      body: "Die Ordnung stimmt. Sammle als Nächstes Gegenstände auf derselben Hallenseite und verbinde Abgabe und nächsten Fund zu einer Route.",
      metrics,
    };
  }
  if (trend.status === "improved") {
    return {
      tone: "improved",
      title: `Leistung steigt: +${Math.max(0, Number(trend.delta) || 0)} Punkte`,
      body: "Tempo, Präzision und Serie entwickeln sich gemeinsam nach oben. Halte diese Schichtkonfiguration für den nächsten fairen Vergleich bei.",
      metrics,
    };
  }
  return {
    tone: "strong",
    title: "Starke, kontrollierte Schicht",
    body: "Du räumst schnell und sauber. Der nächste Schritt ist eine längere perfekte Serie oder dieselbe Qualität in einer intensiveren Schicht.",
    metrics,
  };
}
