import { B } from "../babylon.js";
import { createMaterial, createTexturedMaterial } from "../materials.js";
import { createConcreteTexture, createRustMetalTexture, createDuskGradientTexture, createMuralTexture } from "./textures.js";

const ROOM = { halfWidth: 13.5, halfDepth: 9.5, wallHeight: 4.7, ceilingThickness: 0.15 };

export function buildStructure(scene, shadowGenerator, { quality = "high" } = {}) {
  const detailed = quality !== "low";

  const floorMat = createMaterial(scene, "rubberFloor", "#252a34", 0.95);
  const seamMat = createMaterial(scene, "darkWall", "#303541", 0.92);
  const wallMat = createTexturedMaterial(scene, "wall", createConcreteTexture(scene, "wallConcrete", { base: "#9a9d97", joints: "#5b5f59" }), { roughness: 0.92 });
  const backWallMat = createTexturedMaterial(scene, "backWall", createConcreteTexture(scene, "darkConcrete", { base: "#4a4d4f", joints: "#25272a" }), { roughness: 0.92 });
  const trimMat = createTexturedMaterial(scene, "rustTrim", createRustMetalTexture(scene, "rustTrimTex"), { roughness: 0.6, metallic: 0.35 });
  const frameMat = createMaterial(scene, "windowFrame", "#20242b", 0.4, 0.6);
  const duskTex = createDuskGradientTexture(scene, "duskGlass");
  const glassMat = createTexturedMaterial(scene, "duskGlassMat", duskTex, { roughness: 0.2, metallic: 0.1 });
  glassMat.emissiveTexture = duskTex;
  glassMat.emissiveColor = new B.Color3(0.5, 0.46, 0.6);
  const muralTex = createMuralTexture(scene, "backWallMural", { phrase: "CLOSING CREW", accent: "#a7f46a" });
  const muralMat = createTexturedMaterial(scene, "mural", muralTex, { roughness: 0.75 });
  muralMat.emissiveTexture = muralTex;
  muralMat.emissiveColor = new B.Color3(0.18, 0.18, 0.18);

  buildFloor(scene, floorMat, seamMat);
  buildBackWall(scene, backWallMat, muralMat);
  buildSideWall(scene, -ROOM.halfWidth, wallMat, frameMat, glassMat, shadowGenerator, detailed);
  buildSideWall(scene, ROOM.halfWidth, wallMat, frameMat, glassMat, shadowGenerator, detailed);
  buildEntranceLips(scene, wallMat);
  buildCeiling(scene, backWallMat, trimMat, shadowGenerator, detailed);
}

function buildFloor(scene, floorMat, seamMat) {
  const floor = B.MeshBuilder.CreateGround("floor", { width: 27, height: 19 }, scene);
  floor.material = floorMat;
  floor.receiveShadows = true;
  for (let x = -12; x <= 12; x += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamX${x}`, { width: 0.025, height: 0.006, depth: 18.3 }, scene);
    seam.position.set(x, 0.006, 0);
    seam.material = seamMat;
  }
  for (let z = -8; z <= 8; z += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamZ${z}`, { width: 26.3, height: 0.006, depth: 0.025 }, scene);
    seam.position.set(0, 0.006, z);
    seam.material = seamMat;
  }
}

function buildBackWall(scene, wallMat, muralMat) {
  const wall = B.MeshBuilder.CreateBox("backWall", { width: 27, height: ROOM.wallHeight, depth: 0.35 }, scene);
  wall.position.set(0, ROOM.wallHeight / 2, 9.35);
  wall.material = wallMat;
  wall.receiveShadows = true;
  const mural = B.MeshBuilder.CreatePlane("backWallMural", { width: 14, height: 3.6 }, scene);
  mural.position.set(0, 2.6, 9.16);
  mural.rotation.y = Math.PI;
  mural.material = muralMat;
}

function buildSideWall(scene, x, wallMat, frameMat, glassMat, shadowGenerator, detailed) {
  const side = Math.sign(x);
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
  const glass = B.MeshBuilder.CreatePlane("windowGlass", { width, height }, scene);
  glass.position.set(x - side * 0.19, (bottom + top) / 2, z);
  glass.rotation.y = Math.PI / 2;
  glass.material = glassMat;

  [bottom, top].forEach((y) => {
    const bar = B.MeshBuilder.CreateBox("windowFrameBar", { width: 0.06, height: 0.1, depth: width + 0.16 }, scene);
    bar.position.set(x - side * 0.19, y, z);
    bar.rotation.y = Math.PI / 2;
    bar.material = frameMat;
  });
  for (let i = 0; i <= 2; i++) {
    const mullion = B.MeshBuilder.CreateBox("windowMullion", { width: 0.05, height, depth: 0.05 }, scene);
    mullion.position.set(x - side * 0.19, (bottom + top) / 2, z - width / 2 + (width / 2) * i);
    mullion.material = frameMat;
  }
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

function buildCeiling(scene, ceilingMat, trimMat, shadowGenerator, detailed) {
  const ceiling = B.MeshBuilder.CreateBox("ceiling", { width: 27.6, height: ROOM.ceilingThickness, depth: 19.6 }, scene);
  ceiling.position.set(0, ROOM.wallHeight + 0.2 + ROOM.ceilingThickness / 2, 0);
  ceiling.material = ceilingMat;
  ceiling.receiveShadows = true;

  const trussY = ROOM.wallHeight + 0.15;
  const trussZs = [-6, -2, 2, 6];
  trussZs.forEach((z) => buildTruss(scene, z, trussY, trimMat, shadowGenerator, detailed));

  const lightXs = [-7, 0, 7];
  trussZs.forEach((z) => lightXs.forEach((x) => buildPendantLight(scene, x, z, trussY - 0.25, shadowGenerator, detailed)));

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

function buildPendantLight(scene, x, z, y, shadowGenerator, detailed) {
  const cable = B.MeshBuilder.CreateCylinder("pendantCable", { diameter: 0.03, height: 0.7 }, scene);
  cable.position.set(x, y - 0.35, z);
  cable.material = createMaterial(scene, "pendantCableMat", "#15171a", 0.5, 0.4);

  const cage = B.MeshBuilder.CreateCylinder("pendantCage", { diameterTop: 0.32, diameterBottom: 0.42, height: 0.3, tessellation: detailed ? 14 : 8 }, scene);
  cage.position.set(x, y - 0.72, z);
  cage.material = createMaterial(scene, "pendantCageMat", "#20242b", 0.4, 0.55);

  const bulb = B.MeshBuilder.CreateSphere("pendantBulb", { diameter: 0.22, segments: 10 }, scene);
  bulb.position.set(x, y - 0.72, z);
  const bulbMat = createMaterial(scene, "pendantBulbMat", "#f4f2df", 0.3);
  bulbMat.emissiveColor = new B.Color3(0.7, 0.66, 0.5);
  bulb.material = bulbMat;

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
