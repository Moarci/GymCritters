import assert from "node:assert/strict";
import test from "node:test";

import { matRackSlot } from "../src/item-placement.js";

test("die ersten 16 Matten erhalten eindeutige Regalplätze", () => {
  const slots = Array.from({ length: 16 }, (_, index) => matRackSlot(index));
  const positions = slots.map(({ x, y, z }) => `${x.toFixed(3)}:${y.toFixed(3)}:${z.toFixed(3)}`);

  assert.equal(new Set(positions).size, 16);
});

test("jede Matte bleibt vollständig innerhalb des Regals", () => {
  const rolledRadius = 0.55 * 0.54 / 2;

  for (let index = 0; index < 16; index++) {
    const slot = matRackSlot(index);
    assert.ok(Math.abs(slot.x) + rolledRadius < 1.1, `Matte ${index} ragt seitlich heraus`);
    assert.ok(Math.abs(slot.z) + rolledRadius < 0.625, `Matte ${index} ragt vorne oder hinten heraus`);
    assert.equal(slot.rotationZ, Math.PI / 2);
    assert.equal(slot.scale, 0.54);
  }
});

test("benachbarte Matten besitzen sichtbaren Abstand statt Überlappung", () => {
  const diameter = 0.55 * 0.54;
  const slots = Array.from({ length: 16 }, (_, index) => matRackSlot(index));

  for (let left = 0; left < slots.length; left++) {
    for (let right = left + 1; right < slots.length; right++) {
      const distance = Math.hypot(slots[left].x - slots[right].x, slots[left].z - slots[right].z);
      assert.ok(distance > diameter, `Matten ${left} und ${right} überlappen sich`);
    }
  }
});
