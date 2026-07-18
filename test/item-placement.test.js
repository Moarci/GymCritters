import assert from "node:assert/strict";
import test from "node:test";

import {
  DUMBBELL_RACK_LAYOUT,
  MAT_RACK_LAYOUT,
  MEDBALL_DIAMETER,
  itemDisplaySlot,
  matRackSlot,
} from "../src/item-placement.js";

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
  const diameter = 0.55 * MAT_RACK_LAYOUT.itemScale;
  const length = 1.65 * MAT_RACK_LAYOUT.itemScale;
  const innerSide = MAT_RACK_LAYOUT.sideX - MAT_RACK_LAYOUT.sideWidth / 2;
  const slots = Array.from({ length: 16 }, (_, index) => matRackSlot(index));

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];
    const supportTop = index < 8 ? MAT_RACK_LAYOUT.baseTop : MAT_RACK_LAYOUT.upperShelfTop;
    const bottom = slot.y + (0.28 - 0.275) * slot.scale;
    assert.ok(Math.abs(slot.x) + length / 2 < innerSide, `Matte ${index} berührt den Seitenrahmen`);
    assert.ok(
      Math.abs(slot.z) + diameter / 2 < MAT_RACK_LAYOUT.depth / 2,
      `Matte ${index} ragt vorne oder hinten heraus`,
    );
    assert.ok(bottom >= supportTop, `Matte ${index} steckt in ihrer Regalebene`);
    assert.equal(slot.rotationZ, 0, "die im Mesh liegende Matte darf nicht doppelt gedreht werden");
    for (let other = index + 1; other < slots.length; other++) {
      const otherSlot = slots[other];
      const overlapsAlongLength = Math.abs(slot.x - otherSlot.x) < length;
      const overlapsAroundRoll = Math.hypot(slot.y - otherSlot.y, slot.z - otherSlot.z) < diameter;
      assert.equal(
        overlapsAlongLength && overlapsAroundRoll,
        false,
        `Matten ${index} und ${other} schneiden sich`,
      );
    }
  }
});

test("Hanteln liegen auf den drei Querträgern statt darin", () => {
  const plateBottom = -0.03 * DUMBBELL_RACK_LAYOUT.itemScale;
  const shelfTops = DUMBBELL_RACK_LAYOUT.shelfCenters.map(
    (center) => center + DUMBBELL_RACK_LAYOUT.shelfHeight / 2,
  );
  const innerPost = DUMBBELL_RACK_LAYOUT.postX - DUMBBELL_RACK_LAYOUT.postWidth / 2;
  const outerHalfWidth = 0.625 * DUMBBELL_RACK_LAYOUT.itemScale;
  const plateRadius = 0.23 * DUMBBELL_RACK_LAYOUT.itemScale;

  for (let index = 0; index < 16; index++) {
    const slot = itemDisplaySlot("rack", index);
    const shelf = Math.floor(index / 6);
    assert.ok(Math.abs(slot.y + plateBottom - shelfTops[shelf]) < 0.001);
    assert.ok(Math.abs(slot.x) + outerHalfWidth < innerPost, `Hantel ${index} berührt einen Pfosten`);
    assert.ok(
      Math.abs(slot.z) + plateRadius < DUMBBELL_RACK_LAYOUT.depth / 2,
      `Hantel ${index} liegt nicht vollständig auf dem Querträger`,
    );
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
