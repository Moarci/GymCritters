import assert from "node:assert/strict";
import test from "node:test";

import { itemDisplaySlot, matRackSlot, MEDBALL_DIAMETER } from "../src/item-placement.js";

const ZONES = ["rack", "laundry", "bottles", "mats", "kettlebells", "ropes", "medballs"];

test("jede Ablage besitzt 16 eindeutige Gegenstandsplätze", () => {
  for (const zone of ZONES) {
    const positions = Array.from({ length: 16 }, (_, index) => {
      const { x, y, z } = itemDisplaySlot(zone, index);
      return `${x.toFixed(3)}:${y.toFixed(3)}:${z.toFixed(3)}`;
    });
    assert.equal(new Set(positions).size, 16, `${zone} wiederholt einen belegten Platz`);
  }
});

test("Matten bleiben vollständig und ohne Überlappung im Regal", () => {
  const diameter = 0.55 * 0.54;
  const slots = Array.from({ length: 16 }, (_, index) => matRackSlot(index));

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];
    assert.ok(Math.abs(slot.x) + diameter / 2 < 1.1, `Matte ${index} ragt seitlich heraus`);
    assert.ok(Math.abs(slot.z) + diameter / 2 < 0.625, `Matte ${index} ragt vorne oder hinten heraus`);
    assert.equal(slot.rotationZ, Math.PI / 2);
    for (let other = index + 1; other < slots.length; other++) {
      assert.ok(Math.hypot(slot.x - slots[other].x, slot.z - slots[other].z) > diameter);
    }
  }
});

test("Hanteln liegen auf den drei Querträgern statt darin", () => {
  const plateBottom = -0.03 * 0.5;
  const shelfTops = [0.515, 1.115, 1.715];

  for (let index = 0; index < 16; index++) {
    const slot = itemDisplaySlot("rack", index);
    const shelf = Math.floor(index / 6);
    assert.ok(Math.abs(slot.y + plateBottom - shelfTops[shelf]) < 0.001);
    assert.ok(Math.abs(slot.x) + 0.625 * slot.scale < 0.97);
  }
});

test("Flaschen stehen vollständig auf dem Kistendeckel", () => {
  for (let index = 0; index < 16; index++) {
    const slot = itemDisplaySlot("bottles", index);
    const bottom = slot.y + 0.02 * slot.scale;
    assert.ok(bottom >= 1.195);
    assert.ok(Math.abs(slot.x) + 0.17 * slot.scale < 0.71);
    assert.ok(Math.abs(slot.z) + 0.17 * slot.scale < 0.46);
  }
});

test("Handtücher bilden einen sichtbaren Stapel direkt auf der Korböffnung", () => {
  for (let index = 0; index < 16; index++) {
    const slot = itemDisplaySlot("laundry", index);
    const bottom = slot.y + 0.045 * slot.scale;
    const top = slot.y + 0.115 * slot.scale;
    assert.ok(bottom >= 1.39, `Handtuch ${index} verschwindet im Korbdeckel`);
    assert.ok(top < 1.57, `Handtuch ${index} schwebt zu hoch über dem Korb`);
  }
});

test("Kettlebells stehen auf genau zwei echten Regalebenen", () => {
  const expectedTops = [0.14, 0.78];
  for (let index = 0; index < 16; index++) {
    const slot = itemDisplaySlot("kettlebells", index);
    const tier = Math.floor(index / 8);
    assert.ok(Math.abs(slot.y + 0.02 * slot.scale - expectedTops[tier]) < 0.002);
  }
});

test("Seile hängen auf der Raumseite und in der Ebene ihrer Haken", () => {
  for (let index = 0; index < 16; index++) {
    const slot = itemDisplaySlot("ropes", index);
    assert.ok(slot.x < -0.14, "Seil liegt hinter dem Wandboard");
    assert.equal(slot.rotationY, -Math.PI / 2);
  }
});

test("Medizinbälle sind groß und bilden einen berührungsfreien 4×4-Stapel", () => {
  assert.ok(MEDBALL_DIAMETER >= 0.8);
  const deliveredDiameter = MEDBALL_DIAMETER * itemDisplaySlot("medballs", 0).scale;
  const slots = Array.from({ length: 16 }, (_, index) => itemDisplaySlot("medballs", index));

  for (let index = 0; index < slots.length; index++) {
    for (let other = index + 1; other < slots.length; other++) {
      const distance = Math.hypot(
        slots[index].x - slots[other].x,
        slots[index].y - slots[other].y,
        slots[index].z - slots[other].z,
      );
      assert.ok(distance > deliveredDiameter, `Medizinbälle ${index} und ${other} überschneiden sich`);
    }
    const radialCenter = Math.hypot(slots[index].x, slots[index].z);
    assert.ok(radialCenter + deliveredDiameter / 2 < 0.78, `Medizinball ${index} ragt durch den Korb`);
  }
});
