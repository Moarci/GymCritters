// Ab welchem Anteil des Ausschlags eine Bewegung überhaupt zählt. Ein ruhender Daumen
// wandert um wenige Pixel; ohne Schwelle driftet die Figur dauerhaft.
export const JOYSTICK_DEADZONE = 0.15;

// Rechnet den Pointer-Offset zur Joystick-Mitte in Bewegungsachsen um.
// dx/dy sind Pixel, radius der maximale Ausschlag in Pixeln.
// Der Bildschirm zählt y nach unten, die Welt zählt z nach vorne -- daher das Vorzeichen.
export function joystickVector(dx, dy, radius, deadzone = JOYSTICK_DEADZONE) {
  if (!(radius > 0)) return { x: 0, z: 0, knobX: 0, knobY: 0 };

  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, z: 0, knobX: 0, knobY: 0 };

  const unitX = dx / distance;
  const unitY = dy / distance;
  const clamped = Math.min(distance, radius);
  const knobX = unitX * clamped;
  const knobY = unitY * clamped;

  const magnitude = clamped / radius;
  if (magnitude < deadzone) return { x: 0, z: 0, knobX, knobY };

  // Die Deadzone wird herausgerechnet, statt nur abgeschnitten: sonst würde die Figur
  // direkt hinter der Schwelle mit 15% Tempo anspringen.
  const scaled = (magnitude - deadzone) / (1 - deadzone);
  return { x: unitX * scaled, z: -unitY * scaled, knobX, knobY };
}
