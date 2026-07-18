import { joystickVector } from "./joystick.js";
import { lookDelta } from "./touch-look.js";

// Bündelt Joystick, Action-Buttons und die Look-Zone zu einer Eingabequelle.
// Die Look-Zone ist der Canvas selbst: Joystick und Buttons liegen als Overlays mit
// pointer-events:auto darüber, ein pointerdown das den Canvas erreicht kann also
// per Definition kein Control getroffen haben. Damit braucht es keine Zonen-Geometrie
// und Hoch- wie Querformat funktionieren ohne Sonderfall.
export function createTouchInput({
  joystick, knob, canvas, sprintButton, interactButton, getSensitivity, isActive, onInteract,
}) {
  let move = { x: 0, z: 0 };
  let sprint = false;
  let movePointerId = null;
  let lookPointerId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let pendingYaw = 0;
  let pendingPitch = 0;

  function moveKnob(x, y) {
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  function reset() {
    move = { x: 0, z: 0 };
    sprint = false;
    movePointerId = null;
    lookPointerId = null;
    pendingYaw = 0;
    pendingPitch = 0;
    moveKnob(0, 0);
    sprintButton.classList.remove("active");
    interactButton.classList.remove("active");
  }

  function updateFromPointer(event) {
    const rect = joystick.getBoundingClientRect();
    const radius = rect.width * 0.31;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const result = joystickVector(dx, dy, radius);
    move = { x: result.x, z: result.z };
    moveKnob(result.knobX, result.knobY);
  }

  joystick.addEventListener("pointerdown", (event) => {
    if (!isActive()) return;
    movePointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateFromPointer(event);
    event.preventDefault();
  });
  joystick.addEventListener("pointermove", (event) => {
    if (movePointerId !== event.pointerId) return;
    updateFromPointer(event);
    event.preventDefault();
  });
  const releaseMove = (event) => {
    if (movePointerId !== event.pointerId) return;
    movePointerId = null;
    move = { x: 0, z: 0 };
    moveKnob(0, 0);
  };
  joystick.addEventListener("pointerup", releaseMove);
  joystick.addEventListener("pointercancel", releaseMove);

  // Genau ein Look-Finger. Ein zweiter Finger auf dem Canvas wird ignoriert, statt
  // wie bei Babylons eigenem Handling als Pinch-Zoom gedeutet zu werden -- das war
  // der Grund, warum Laufen und Umsehen gleichzeitig die Kamera springen ließ.
  canvas.addEventListener("pointerdown", (event) => {
    if (!isActive() || lookPointerId !== null) return;
    lookPointerId = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (lookPointerId !== event.pointerId) return;
    const delta = lookDelta(event.clientX - lookLastX, event.clientY - lookLastY, getSensitivity());
    pendingYaw += delta.deltaYaw;
    pendingPitch += delta.deltaPitch;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    event.preventDefault();
  });
  const releaseLook = (event) => {
    if (lookPointerId !== event.pointerId) return;
    lookPointerId = null;
  };
  canvas.addEventListener("pointerup", releaseLook);
  canvas.addEventListener("pointercancel", releaseLook);

  const setSprint = (active) => {
    sprint = isActive() ? active : false;
    sprintButton.classList.toggle("active", sprint);
  };
  sprintButton.addEventListener("pointerdown", (event) => {
    setSprint(true);
    sprintButton.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  sprintButton.addEventListener("pointerup", () => setSprint(false));
  sprintButton.addEventListener("pointercancel", () => setSprint(false));

  interactButton.addEventListener("pointerdown", (event) => {
    if (isActive()) onInteract();
    interactButton.classList.add("active");
    interactButton.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  interactButton.addEventListener("pointerup", () => interactButton.classList.remove("active"));
  interactButton.addEventListener("pointercancel", () => interactButton.classList.remove("active"));

  return {
    read: () => ({ x: move.x, z: move.z, sprint }),
    consumeLook: () => {
      const delta = { deltaYaw: pendingYaw, deltaPitch: pendingPitch };
      pendingYaw = 0;
      pendingPitch = 0;
      return delta;
    },
    reset,
  };
}
