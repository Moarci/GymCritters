// Reine Logik für den Flow-Schild: einen Serienschutz, den nur gehaltener
// Spitzen-Flow verdient. Die Szene fragt jede Frame die Ladung ab und meldet
// einen Combo-Bruch (Stolpern oder Fehlablage); die Balance bleibt dadurch
// Babylon-unabhängig und deterministisch testbar.
//
// Idee: Wer den höchsten Flow (Stufe 3) lange genug hält, bankt genau einen
// Schild. Der nächste Fehler verbraucht ihn und rettet die Serie, statt sie auf
// null zurückzusetzen. Der Schild ist bewusst eine knappe Ressource — höchstens
// einer gleichzeitig — und belohnt so mutige Routenentscheidungen unter Druck.

export const FLOW_SHIELD = Object.freeze({
  chargeTier: 3, // erst MAX FLOW lädt den Schild
  chargeSeconds: 2.6, // so lange muss der Spitzenflow gehalten werden
  decayFactor: 0.5, // unter Spitzenflow zerfällt der Fortschritt halb so schnell
  maxShields: 1, // immer nur ein gebankter Schutz
});

export function createFlowShieldState() {
  return { charge: 0, shields: 0 };
}

function clampCharge(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 1 ? 1 : value;
}

// Schreibt den Ladezustand für eine Frame fort. `earned` ist genau in der Frame
// true, in der ein neuer Schild gebankt wurde, damit die Szene ihr Feedback
// nur einmal auslöst.
export function chargeFlowShield(state, { tier = 0, dt = 0, config = FLOW_SHIELD } = {}) {
  const current = state || createFlowShieldState();
  const shields = Math.max(0, Math.min(config.maxShields, Math.floor(current.shields) || 0));
  const step = config.chargeSeconds > 0 ? Math.max(0, dt) / config.chargeSeconds : 0;

  // Voller Speicher lädt nicht weiter — der Schutz bleibt eine knappe Ressource,
  // und der Fortschritt hält, bis der gebankte Schild verbraucht ist.
  if (shields >= config.maxShields) {
    return { charge: 0, shields, earned: false };
  }
  if (tier >= config.chargeTier) {
    const charge = clampCharge(current.charge) + step;
    if (charge >= 1) return { charge: 0, shields: shields + 1, earned: true };
    return { charge, shields, earned: false };
  }
  // Unter Spitzenflow zerfällt der Ladefortschritt langsam: kurze Aussetzer
  // kosten Fortschritt, löschen ihn aber nicht sofort.
  const charge = Math.max(0, clampCharge(current.charge) - step * config.decayFactor);
  return { charge, shields, earned: false };
}

// Verbraucht einen Schild, falls vorhanden. `absorbed` sagt der Szene, ob der
// Fehler die Serie zerstört oder der Schild sie gerettet hat.
export function spendFlowShield(state) {
  const current = state || createFlowShieldState();
  if (Math.floor(current.shields) > 0) {
    return {
      state: { charge: clampCharge(current.charge), shields: current.shields - 1 },
      absorbed: true,
    };
  }
  return { state: { charge: clampCharge(current.charge), shields: 0 }, absorbed: false };
}

export function hasFlowShield(state) {
  return Boolean(state && Math.floor(state.shields) > 0);
}
