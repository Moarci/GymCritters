import test from "node:test";
import assert from "node:assert/strict";
import {
  REACTION_PROFILES,
  idleGesture,
  reactionPose,
  reactionProfile,
} from "../src/character-reactions.js";

test("unbekannte Charaktere fallen auf Roccos Profil zurück", () => {
  assert.equal(reactionProfile("squirrel"), REACTION_PROFILES.squirrel);
  assert.equal(reactionProfile("raccoon"), REACTION_PROFILES.raccoon);
  assert.equal(reactionProfile("unbekannt"), REACTION_PROFILES.raccoon);
});

test("Fibi reagiert energiegeladener als Rocco", () => {
  assert.ok(REACTION_PROFILES.squirrel.pickup.pop > REACTION_PROFILES.raccoon.pickup.pop);
  assert.ok(REACTION_PROFILES.squirrel.celebrate.hop > REACTION_PROFILES.raccoon.celebrate.hop);
  assert.ok(REACTION_PROFILES.squirrel.celebrate.spin > REACTION_PROFILES.raccoon.celebrate.spin);
  assert.ok(REACTION_PROFILES.squirrel.wrong.frequency > REACTION_PROFILES.raccoon.wrong.frequency);
});

test("eine Reaktion bespielt nur ihre eigenen Kanäle", () => {
  const profile = REACTION_PROFILES.raccoon;
  const pickup = reactionPose({ type: "pickup", elapsed: 0.15, duration: 0.3, profile });
  assert.equal(pickup.rotationX, null, "Griff lässt die Tragehaltung in Ruhe");
  assert.ok(typeof pickup.scale === "number");
  const wrong = reactionPose({ type: "wrong", elapsed: 0.1, duration: 0.7, profile });
  assert.equal(wrong.scale, null);
  assert.ok(typeof wrong.rotationZ === "number");
});

test("der Pickup-Pop erreicht in der Mitte die Profilhöhe", () => {
  const profile = REACTION_PROFILES.squirrel;
  const peak = reactionPose({ type: "pickup", elapsed: 0.5, duration: 1, profile });
  assert.ok(Math.abs(peak.scale - (1 + profile.pickup.pop)) < 1e-9);
});

test("Stolpern startet und endet neutral", () => {
  for (const id of ["raccoon", "squirrel"]) {
    const profile = REACTION_PROFILES[id];
    const start = reactionPose({ type: "trip", elapsed: 0, duration: 0.7, side: 1, profile });
    const end = reactionPose({ type: "trip", elapsed: 0.7, duration: 0.7, side: 1, profile });
    for (const pose of [start, end]) {
      assert.ok(Math.abs(pose.rotationX) < 1e-9, `${id}: rotationX neutral an den Enden`);
      assert.ok(Math.abs(pose.rotationZ) < 1e-9, `${id}: rotationZ neutral an den Enden`);
      assert.ok(Math.abs(pose.offsetY) < 1e-9, `${id}: offsetY neutral an den Enden`);
    }
  }
});

test("nur Fibis Stolpern federt elastisch über die Senkrechte hinaus", () => {
  const sample = (id) => {
    let minLean = Infinity;
    for (let i = 0; i <= 40; i++) {
      const pose = reactionPose({ type: "trip", elapsed: (i / 40) * 0.7, duration: 0.7, side: 1, profile: REACTION_PROFILES[id] });
      minLean = Math.min(minLean, pose.rotationX);
    }
    return minLean;
  };
  assert.ok(sample("squirrel") < -1e-4, "Fibi überschwingt (rotationX wird negativ)");
  assert.ok(sample("raccoon") >= -1e-9, "Rocco sackt schwer, überschwingt aber nie nach vorn");
});

test("die Stolperneigung folgt der Aufprallseite", () => {
  const profile = REACTION_PROFILES.raccoon;
  const left = reactionPose({ type: "trip", elapsed: 0.35, duration: 0.7, side: -1, profile });
  const right = reactionPose({ type: "trip", elapsed: 0.35, duration: 0.7, side: 1, profile });
  assert.ok(left.rotationZ < 0 && right.rotationZ > 0);
});

test("der Siegeshüpfer hebt die Figur nur an, senkt sie nie", () => {
  const profile = REACTION_PROFILES.squirrel;
  for (let i = 0; i <= 30; i++) {
    const pose = reactionPose({ type: "celebrate", elapsed: i * 0.1, duration: 2.5, profile });
    assert.ok(pose.offsetY >= 0);
  }
});

test("Fibis Leerlauf wiegt spürbar lebhafter als Roccos", () => {
  const maxSway = (id) => {
    let peak = 0;
    for (let i = 0; i <= 200; i++) {
      const gesture = idleGesture(REACTION_PROFILES[id], i * 0.1);
      peak = Math.max(peak, Math.abs(gesture.swayY), Math.abs(gesture.swayZ));
    }
    return peak;
  };
  assert.ok(maxSway("squirrel") > maxSway("raccoon"));
});
