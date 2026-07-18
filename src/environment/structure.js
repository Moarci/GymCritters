import { B } from "../babylon.js";
import { createMaterial, createTexturedMaterial } from "../materials.js";
import { createConcreteTexture, createRustMetalTexture, createGymExteriorTexture, createMuralTexture } from "./textures.js";
import { GYM_POSTER_SPEC, INTERIOR_SIGN_ROTATION_Y } from "./level-decor-specs.js";

const ROOM = {
  halfWidth: 13.5,
  halfDepth: 9.5,
  wallHeight: 4.7,
  ceilingThickness: 0.15,
  shellHalfWidth: 20,
  shellFront: -18,
};

export function buildStructure(scene, shadowGenerator, { quality = "high" } = {}) {
  const detailed = quality !== "low";

  const floorMat = createMaterial(scene, "rubberFloor", "#252a34", 0.95);
  const seamMat = createMaterial(scene, "darkWall", "#303541", 0.92);
  const wallMat = createTexturedMaterial(scene, "wall", createConcreteTexture(scene, "wallConcrete", { base: "#9a9d97", joints: "#5b5f59" }), { roughness: 0.92 });
  const backWallMat = createTexturedMaterial(scene, "backWall", createConcreteTexture(scene, "darkConcrete", { base: "#4a4d4f", joints: "#25272a" }), { roughness: 0.92 });
  const trimMat = createTexturedMaterial(scene, "rustTrim", createRustMetalTexture(scene, "rustTrimTex"), { roughness: 0.6, metallic: 0.35 });
  const frameMat = createMaterial(scene, "windowFrame", "#20242b", 0.4, 0.6);
  const exteriorTex = createGymExteriorTexture(scene, "gymExterior");
  const glassMat = createTexturedMaterial(scene, "gymWindowGlass", exteriorTex, { roughness: 0.16, metallic: 0.06 });
  glassMat.emissiveTexture = exteriorTex;
  glassMat.emissiveColor = new B.Color3(0.34, 0.37, 0.39);
  const muralTex = createMuralTexture(scene, "backWallMural", GYM_POSTER_SPEC);
  const muralMat = createTexturedMaterial(scene, "mural", muralTex, { roughness: 0.75 });
  muralMat.emissiveTexture = muralTex;
  muralMat.emissiveColor = new B.Color3(0.18, 0.18, 0.18);
  muralMat.backFaceCulling = true;
  const lobbySignTex = createMuralTexture(scene, "lobbySign", { width: 1536, height: 384, phrase: "GYM CRITTERS", accent: "#63b4ef" });
  const lobbySignMat = createTexturedMaterial(scene, "lobbySignMat", lobbySignTex, { roughness: 0.58 });
  lobbySignMat.emissiveTexture = lobbySignTex;
  lobbySignMat.emissiveColor = new B.Color3(0.38, 0.42, 0.34);

  buildFloor(scene, floorMat, seamMat);
  buildBackWall(scene, backWallMat, muralMat, frameMat, shadowGenerator, detailed);
  buildSideWall(scene, -ROOM.halfWidth, wallMat, frameMat, glassMat, shadowGenerator, detailed);
  buildSideWall(scene, ROOM.halfWidth, wallMat, frameMat, glassMat, shadowGenerator, detailed);
  buildEntranceLips(scene, wallMat);
  buildOuterShell(scene, wallMat, frameMat, glassMat, lobbySignMat);
  buildCeiling(scene, backWallMat, trimMat, shadowGenerator, detailed);
}

function buildFloor(scene, floorMat, seamMat) {
  const floorDepth = ROOM.halfDepth - ROOM.shellFront;
  const floor = B.MeshBuilder.CreateGround("floor", { width: ROOM.shellHalfWidth * 2, height: floorDepth }, scene);
  floor.position.z = (ROOM.halfDepth + ROOM.shellFront) / 2;
  floor.material = floorMat;
  floor.receiveShadows = true;
  for (let x = -18; x <= 18; x += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamX${x}`, { width: 0.025, height: 0.006, depth: floorDepth - 0.7 }, scene);
    seam.position.set(x, 0.006, (ROOM.halfDepth + ROOM.shellFront) / 2);
    seam.material = seamMat;
  }
  for (let z = -16; z <= 8; z += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamZ${z}`, { width: ROOM.shellHalfWidth * 2 - 0.7, height: 0.006, depth: 0.025 }, scene);
    seam.position.set(0, 0.006, z);
    seam.material = seamMat;
  }
}

function buildBackWall(scene, wallMat, muralMat, frameMat, shadowGenerator, detailed) {
  const wall = B.MeshBuilder.CreateBox("backWall", { width: 27, height: ROOM.wallHeight, depth: 0.35 }, scene);
  wall.position.set(0, ROOM.wallHeight / 2, 9.35);
  wall.material = wallMat;
  wall.receiveShadows = true;

  const posterBacking = B.MeshBuilder.CreateBox("backWallPosterFrame", {
    width: 14.55,
    height: 3.78,
    depth: 0.12,
  }, scene);
  posterBacking.position.set(0, 2.58, 9.095);
  posterBacking.material = frameMat;
  if (detailed) shadowGenerator.addShadowCaster(posterBacking);

  const mural = B.MeshBuilder.CreatePlane("backWallMural", { width: 14, height: 3.3 }, scene);
  mural.position.set(0, 2.58, 9.025);
  mural.rotation.y = INTERIOR_SIGN_ROTATION_Y;
  mural.material = muralMat;
  mural.isPickable = false;

  const accentMat = createMaterial(scene, "posterFrameAccent", GYM_POSTER_SPEC.accent, 0.62, 0.2);
  for (const x of [-7.12, 7.12]) {
    const rail = B.MeshBuilder.CreateBox("posterAccentRail", {
      width: 0.075,
      height: 3.3,
      depth: 0.035,
    }, scene);
    rail.position.set(x, 2.58, 9.012);
    rail.material = accentMat;
  }

  if (detailed) {
    for (const x of [-6.86, 6.86]) {
      for (const y of [1.08, 4.08]) {
        const bolt = B.MeshBuilder.CreateCylinder("posterFrameBolt", {
          diameter: 0.09,
          height: 0.035,
          tessellation: 12,
        }, scene);
        bolt.position.set(x, y, 8.995);
        bolt.rotation.x = Math.PI / 2;
        bolt.material = accentMat;
      }
    }
  }
}

function buildSideWall(scene, x, wallMat, frameMat, glassMat, shadowGenerator, detailed) {
  const zFrom = -ROOM.halfDepth + 0.15;
  const zTo = ROOM.halfDepth - 0.15;
  const windowWidth = 2.6;
  const windowCount = 3;
  const windowBottom = 1.5;
  const windowTop = 3.7;
  const totalSpan = zTo - zFrom;
  const gapCount = windowCount + 1;
  const gapWidth = (totalSpan - windowWidth * windowCount) / gapCount;

  const bottomBand = B.MeshBuilder.CreateBox("wallBottomBand", { width: 0.35, height: windowBottom, depth: totalSpan }, scene);
  bottomBand.position.set(x, windowBottom / 2, (zFrom + zTo) / 2);
  bottomBand.material = wallMat;
  bottomBand.receiveShadows = true;

  const topBand = B.MeshBuilder.CreateBox("wallTopBand", { width: 0.35, height: ROOM.wallHeight - windowTop, depth: totalSpan }, scene);
  topBand.position.set(x, windowTop + (ROOM.wallHeight - windowTop) / 2, (zFrom + zTo) / 2);
  topBand.material = wallMat;
  topBand.receiveShadows = true;

  let z = zFrom;
  for (let i = 0; i < gapCount; i++) {
    const pillar = B.MeshBuilder.CreateBox("wallPillar", { width: 0.35, height: windowTop - windowBottom, depth: gapWidth }, scene);
    pillar.position.set(x, (windowBottom + windowTop) / 2, z + gapWidth / 2);
    pillar.material = wallMat;
    pillar.receiveShadows = true;
    z += gapWidth;
    if (i < windowCount) {
      buildWindow(scene, x, z + windowWidth / 2, windowBottom, windowTop, windowWidth, frameMat, glassMat);
      z += windowWidth;
    }
  }

  if (detailed) buildWallPipe(scene, x);
}

function buildWindow(scene, x, z, bottom, top, width, frameMat, glassMat) {
  const side = Math.sign(x);
  const height = top - bottom;
  const innerX = x - side * 0.19;
  const glass = B.MeshBuilder.CreateBox("windowGlass", { width: 0.025, height: height - 0.16, depth: width - 0.16 }, scene);
  glass.position.set(innerX + side * 0.025, (bottom + top) / 2, z);
  glass.material = glassMat;

  // Vier tiefe Laibungen bilden einen echten, in der Wand sitzenden Rahmen.
  [bottom, top].forEach((y) => {
    const bar = B.MeshBuilder.CreateBox("windowFrameHorizontal", { width: 0.42, height: 0.12, depth: width + 0.16 }, scene);
    bar.position.set(x - side * 0.02, y, z);
    bar.material = frameMat;
  });
  for (const edgeZ of [z - width / 2, z + width / 2]) {
    const jamb = B.MeshBuilder.CreateBox("windowFrameJamb", { width: 0.42, height: height, depth: 0.12 }, scene);
    jamb.position.set(x - side * 0.02, (bottom + top) / 2, edgeZ);
    jamb.material = frameMat;
  }
  for (const mullionZ of [z - width / 6, z + width / 6]) {
    const mullion = B.MeshBuilder.CreateBox("windowMullion", { width: 0.1, height: height - 0.1, depth: 0.075 }, scene);
    mullion.position.set(innerX, (bottom + top) / 2, mullionZ);
    mullion.material = frameMat;
  }
  const transom = B.MeshBuilder.CreateBox("windowTransom", { width: 0.1, height: 0.075, depth: width - 0.1 }, scene);
  transom.position.set(innerX, bottom + height * 0.58, z);
  transom.material = frameMat;

  const sill = B.MeshBuilder.CreateBox("windowSill", { width: 0.62, height: 0.09, depth: width + 0.24 }, scene);
  sill.position.set(x - side * 0.16, bottom - 0.055, z);
  sill.material = frameMat;
}

function buildEntranceLips(scene, wallMat) {
  const left = B.MeshBuilder.CreateBox("frontLipLeft", { width: 9, height: 1.1, depth: 0.35 }, scene);
  left.position.set(-9, 0.55, -9.35);
  left.material = wallMat;
  left.receiveShadows = true;
  const right = B.MeshBuilder.CreateBox("frontLipRight", { width: 9, height: 1.1, depth: 0.35 }, scene);
  right.position.set(9, 0.55, -9.35);
  right.material = wallMat;
  right.receiveShadows = true;
}

function buildOuterShell(scene, wallMat, frameMat, glassMat, lobbySignMat) {
  const shellDepth = ROOM.halfDepth - ROOM.shellFront;
  for (const x of [-ROOM.shellHalfWidth, ROOM.shellHalfWidth]) {
    const wall = B.MeshBuilder.CreateBox("outerSideWall", { width: 0.3, height: ROOM.wallHeight + 0.4, depth: shellDepth }, scene);
    wall.position.set(x, (ROOM.wallHeight + 0.4) / 2, (ROOM.halfDepth + ROOM.shellFront) / 2);
    wall.material = wallMat;
    wall.receiveShadows = true;
  }
  for (const x of [-16.75, 16.75]) {
    const backReturn = B.MeshBuilder.CreateBox("outerBackReturn", { width: 6.5, height: ROOM.wallHeight + 0.4, depth: 0.35 }, scene);
    backReturn.position.set(x, (ROOM.wallHeight + 0.4) / 2, ROOM.halfDepth - 0.15);
    backReturn.material = wallMat;
    backReturn.receiveShadows = true;
  }

  // Eine zurückgesetzte Lobby fängt jede Kameraperspektive ab. Die Kamera bleibt
  // frei beweglich, blickt vor dem eigentlichen Trainingsraum aber nicht mehr ins Void.
  const frontZ = ROOM.shellFront + 0.18;
  const wallHeight = ROOM.wallHeight + 0.4;
  const sideWidth = 12.8;
  for (const x of [-13.6, 13.6]) {
    const panel = B.MeshBuilder.CreateBox("lobbyFrontWall", { width: sideWidth, height: wallHeight, depth: 0.35 }, scene);
    panel.position.set(x, wallHeight / 2, frontZ);
    panel.material = wallMat;
  }
  const header = B.MeshBuilder.CreateBox("lobbyEntranceHeader", { width: 14.4, height: 1.05, depth: 0.38 }, scene);
  header.position.set(0, wallHeight - 0.525, frontZ);
  header.material = wallMat;
  const sign = B.MeshBuilder.CreatePlane("lobbyGymSign", { width: 6.8, height: 0.72 }, scene);
  sign.position.set(0, wallHeight - 0.52, frontZ + 0.205);
  sign.material = lobbySignMat;

  const entryGlass = B.MeshBuilder.CreateBox("lobbyEntryGlass", { width: 13.8, height: wallHeight - 1.05, depth: 0.06 }, scene);
  entryGlass.position.set(0, (wallHeight - 1.05) / 2, frontZ + 0.18);
  entryGlass.material = glassMat;
  for (const x of [-6.9, -3.45, 0, 3.45, 6.9]) {
    const post = B.MeshBuilder.CreateBox("lobbyEntryPost", { width: 0.13, height: wallHeight - 0.94, depth: 0.3 }, scene);
    post.position.set(x, (wallHeight - 1.05) / 2, frontZ);
    post.material = frameMat;
  }
  const rail = B.MeshBuilder.CreateBox("lobbyEntryRail", { width: 13.9, height: 0.12, depth: 0.3 }, scene);
  rail.position.set(0, 1.15, frontZ);
  rail.material = frameMat;

  const mat = B.MeshBuilder.CreateBox("entranceRunner", { width: 5.4, height: 0.025, depth: 4.8 }, scene);
  mat.position.set(0, 0.02, ROOM.shellFront + 2.8);
  mat.material = createMaterial(scene, "entranceRunnerMat", "#171a1f", 0.98);
}

function buildCeiling(scene, ceilingMat, trimMat, shadowGenerator, detailed) {
  const ceilingDepth = ROOM.halfDepth - ROOM.shellFront + 0.6;
  const ceiling = B.MeshBuilder.CreateBox("ceiling", { width: ROOM.shellHalfWidth * 2 + 0.6, height: ROOM.ceilingThickness, depth: ceilingDepth }, scene);
  // Unterkante exakt auf Wandoberkante: kein Licht-/Void-Schlitz zwischen Wand
  // und Decke, auch nicht bei flachen Kamerawinkeln.
  ceiling.position.set(0, ROOM.wallHeight + ROOM.ceilingThickness / 2, (ROOM.halfDepth + ROOM.shellFront) / 2);
  ceiling.material = ceilingMat;
  ceiling.receiveShadows = true;

  const trussY = ROOM.wallHeight - 0.05;
  const trussZs = [-6, -2, 2, 6];
  trussZs.forEach((z) => buildTruss(scene, z, trussY, trimMat, shadowGenerator, detailed));

  // Materialien einmal anlegen und an alle 12 Leuchten weiterreichen — Babylon
  // dedupliziert nicht über den Namen, pro Leuchte erzeugte Materialien wären 36 statt 3.
  const pendantMats = {
    cable: createMaterial(scene, "pendantCableMat", "#15171a", 0.5, 0.4),
    cage: createMaterial(scene, "pendantCageMat", "#20242b", 0.4, 0.55),
    bulb: createMaterial(scene, "pendantBulbMat", "#f4f2df", 0.3),
  };
  pendantMats.bulb.emissiveColor = new B.Color3(0.7, 0.66, 0.5);

  const lightXs = [-7, 0, 7];
  trussZs.forEach((z) => lightXs.forEach((x) => buildPendantLight(scene, x, z, trussY - 0.25, pendantMats, shadowGenerator, detailed)));

  if (detailed) buildRoofDuct(scene, trussY - 0.05, trimMat, shadowGenerator);
}

function buildTruss(scene, z, y, trimMat, shadowGenerator, detailed) {
  const bottomChord = B.MeshBuilder.CreateBox("trussBottom", { width: 27, height: 0.1, depth: 0.12 }, scene);
  bottomChord.position.set(0, y - 0.3, z);
  bottomChord.material = trimMat;
  const topChord = B.MeshBuilder.CreateBox("trussTop", { width: 27, height: 0.1, depth: 0.12 }, scene);
  topChord.position.set(0, y, z);
  topChord.material = trimMat;
  if (detailed) {
    for (let x = -12; x <= 12; x += 2) {
      const strut = B.MeshBuilder.CreateBox("trussStrut", { width: 0.08, height: 0.34, depth: 0.08 }, scene);
      strut.position.set(x, y - 0.15, z);
      strut.rotation.z = (Math.abs(x) / 2) % 2 === 0 ? 0.5 : -0.5;
      strut.material = trimMat;
    }
    shadowGenerator.addShadowCaster(bottomChord);
    shadowGenerator.addShadowCaster(topChord);
  }
}

function buildPendantLight(scene, x, z, y, mats, shadowGenerator, detailed) {
  const cable = B.MeshBuilder.CreateCylinder("pendantCable", { diameter: 0.03, height: 0.7 }, scene);
  cable.position.set(x, y - 0.35, z);
  cable.material = mats.cable;

  const cage = B.MeshBuilder.CreateCylinder("pendantCage", { diameterTop: 0.32, diameterBottom: 0.42, height: 0.3, tessellation: detailed ? 14 : 8 }, scene);
  cage.position.set(x, y - 0.72, z);
  cage.material = mats.cage;

  const bulb = B.MeshBuilder.CreateSphere("pendantBulb", { diameter: 0.22, segments: 10 }, scene);
  bulb.position.set(x, y - 0.72, z);
  bulb.material = mats.bulb;

  if (detailed) shadowGenerator.addShadowCaster(cage);
}

function buildRoofDuct(scene, y, trimMat, shadowGenerator) {
  const back = B.MeshBuilder.CreateCylinder("roofDuctBack", { diameter: 0.45, height: 26.6, tessellation: 12 }, scene);
  back.rotation.z = Math.PI / 2;
  back.position.set(0, y, 8.9);
  back.material = trimMat;
  shadowGenerator.addShadowCaster(back);

  [-12.9, 12.9].forEach((x) => {
    const branch = B.MeshBuilder.CreateCylinder("roofDuctBranch", { diameter: 0.22, height: 18, tessellation: 10 }, scene);
    branch.rotation.x = Math.PI / 2;
    branch.position.set(x, y, 0);
    branch.material = trimMat;
    const elbow = B.MeshBuilder.CreateSphere("ductElbow", { diameter: 0.42, segments: 10 }, scene);
    elbow.position.set(x, y, 8.9);
    elbow.material = trimMat;
  });
}

function buildWallPipe(scene, x) {
  const side = Math.sign(x);
  const pipeMat = createMaterial(scene, "wallPipeMat", "#3a3f47", 0.45, 0.4);
  const pipe = B.MeshBuilder.CreateCylinder("wallPipe", { diameter: 0.14, height: 18, tessellation: 10 }, scene);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(x - side * 0.28, ROOM.wallHeight - 0.4, 0);
  pipe.material = pipeMat;
  for (let z = -8; z <= 8; z += 4) {
    const bracket = B.MeshBuilder.CreateBox("pipeBracket", { width: 0.1, height: 0.14, depth: 0.05 }, scene);
    bracket.position.set(x - side * 0.15, ROOM.wallHeight - 0.4, z);
    bracket.material = pipeMat;
  }
}
