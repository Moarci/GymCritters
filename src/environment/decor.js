import { B } from "../babylon.js";
import { createMaterial } from "../materials.js";

let scene;
let shadowGenerator;
let zones = [];
let obstacles = [];
let levelDecor = {};

function material(name, color, roughness = 0.85, metallic = 0) {
  return createMaterial(scene, name, color, roughness, metallic);
}

export function buildDecor(sceneArg, shadowGeneratorArg, { quality = "high" } = {}) {
  scene = sceneArg;
  shadowGenerator = shadowGeneratorArg;
  zones = [];
  obstacles = [];
  const detailed = quality !== "low";

  createZones();
  createBaseDecor();
  createLevelDecor();
  createPegboards(detailed);

  return { zones, obstacles };
}

function addZone(id, label, type, position, radius, color) {
  const marker = B.MeshBuilder.CreateCylinder(`zone-${id}`, { diameter: radius * 1.65, height: 0.035, tessellation: 40 }, scene);
  marker.position.copyFrom(position);
  marker.position.y = 0.035;
  const mat = material(`zoneMat-${id}`, color, 0.7);
  mat.alpha = 0.25;
  mat.emissiveColor = B.Color3.FromHexString(color).scale(0.18);
  marker.material = mat;
  marker.isPickable = false;
  const beacon = B.MeshBuilder.CreatePolyhedron(`beacon-${id}`, { type: 1, size: 0.38 }, scene);
  beacon.position.copyFrom(position);
  beacon.position.y = 2.45;
  const beaconMat = material(`beaconMat-${id}`, color, 0.5);
  beaconMat.emissiveColor = B.Color3.FromHexString(color).scale(0.55);
  beacon.material = beaconMat;
  beacon.setEnabled(false);
  zones.push({ id, label, type, position: position.clone(), radius, marker, beacon, deliveredCount: 0 });
}

function createZones() {
  createDumbbellRack(new B.Vector3(-9.8, 0, 6.7));
  createLaundryZone(new B.Vector3(9.8, 0, 6.6));
  createBottleZone(new B.Vector3(10.1, 0, -5.8));
  createMatZone(new B.Vector3(-10.1, 0, -5.8));
  createKettlebellRack(new B.Vector3(-11.0, 0, 0.6));
  createRopeHooks(new B.Vector3(11.0, 0, 0.6));
  createMedballNet(new B.Vector3(-6.5, 0, 6.7));
}

function createDumbbellRack(pos) {
  const metal = material("rackMetal", "#393f49", 0.43, 0.45);
  const accent = material("rackAccent", "#a7f46a", 0.75);
  for (const x of [-1.05, 1.05]) {
    const post = B.MeshBuilder.CreateBox("rackPost", { width: 0.16, height: 2.05, depth: 0.32 }, scene);
    post.position.set(pos.x + x, 1.02, pos.z); post.material = metal; shadowGenerator.addShadowCaster(post);
  }
  for (const y of [0.45, 1.05, 1.65]) {
    const beam = B.MeshBuilder.CreateBox("rackBeam", { width: 2.3, height: 0.13, depth: 0.42 }, scene);
    beam.position.set(pos.x, y, pos.z); beam.material = metal; shadowGenerator.addShadowCaster(beam);
  }
  const sign = B.MeshBuilder.CreateBox("rackSign", { width: 1.2, height: 0.18, depth: 0.48 }, scene);
  sign.position.set(pos.x, 2.1, pos.z); sign.material = accent;
  addZone("rack", "Hantelregal", "dumbbell", pos, 2.0, "#a7f46a");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 1.4, halfZ: 0.55 });
}

function createLaundryZone(pos) {
  const basket = B.MeshBuilder.CreateCylinder("laundryBasket", { diameterTop: 1.35, diameterBottom: 1.05, height: 1.35, tessellation: 20 }, scene);
  basket.position.set(pos.x, 0.68, pos.z); basket.material = material("basket", "#f0bd72", 0.9); shadowGenerator.addShadowCaster(basket);
  const hole = B.MeshBuilder.CreateCylinder("laundryHole", { diameter: 1.05, height: 0.04, tessellation: 24 }, scene);
  hole.position.set(pos.x, 1.37, pos.z); hole.material = material("basketHole", "#302c29", 1);
  addZone("laundry", "Wäschekorb", "towel", pos, 1.8, "#ffbd73");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.7, halfZ: 0.7 });
}

function createBottleZone(pos) {
  const box = B.MeshBuilder.CreateBox("bottleCrate", { width: 1.7, height: 1.15, depth: 1.25 }, scene);
  box.position.set(pos.x, 0.58, pos.z); box.material = material("lostBox", "#5da9df", 0.88); shadowGenerator.addShadowCaster(box);
  const top = B.MeshBuilder.CreateBox("crateTop", { width: 1.42, height: 0.05, depth: 0.92 }, scene);
  top.position.set(pos.x, 1.17, pos.z); top.material = material("crateDark", "#24364b", 0.9);
  addZone("bottles", "Flaschenbox", "bottle", pos, 1.85, "#63b4ef");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.9, halfZ: 0.7 });
}

function createMatZone(pos) {
  const rackMat = material("matRack", "#d97f6c", 0.88);
  const metal = material("matMetal", "#404650", 0.45, 0.4);
  const base = B.MeshBuilder.CreateBox("matRackBase", { width: 2.2, height: 0.15, depth: 1.25 }, scene);
  base.position.set(pos.x, 0.08, pos.z); base.material = metal;
  for (const x of [-0.8, 0, 0.8]) {
    const guide = B.MeshBuilder.CreateBox("matGuide", { width: 0.08, height: 1.55, depth: 0.8 }, scene);
    guide.position.set(pos.x + x, 0.78, pos.z); guide.material = rackMat;
  }
  addZone("mats", "Mattenregal", "mat", pos, 2.0, "#ed8c78");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 1.25, halfZ: 0.7 });
}

function createKettlebellRack(pos) {
  const metal = material("kettleMetal", "#3d434d", 0.4, 0.5);
  const iron = material("kettleIron", "#23262c", 0.55, 0.4);
  const base = B.MeshBuilder.CreateBox("kettleBase", { width: 1.5, height: 0.14, depth: 0.8 }, scene);
  base.position.set(pos.x, 0.07, pos.z); base.material = metal; shadowGenerator.addShadowCaster(base);
  for (const x of [-0.42, 0, 0.42]) {
    const bell = B.MeshBuilder.CreateSphere("kettleBell", { diameter: 0.42, segments: 16 }, scene);
    bell.position.set(pos.x + x, 0.35, pos.z); bell.scaling.y = 1.08; bell.material = iron; shadowGenerator.addShadowCaster(bell);
    const handle = B.MeshBuilder.CreateTorus("kettleHandle", { diameter: 0.24, thickness: 0.05, tessellation: 16 }, scene);
    handle.position.set(pos.x + x, 0.58, pos.z); handle.rotation.x = Math.PI / 2; handle.material = metal; shadowGenerator.addShadowCaster(handle);
  }
  addZone("kettlebells", "Kettlebell-Ecke", "kettlebell", pos, 1.8, "#c9c2b6");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.8, halfZ: 0.5 });
}

function createRopeHooks(pos) {
  const board = material("ropeBoard", "#5c4a3a", 0.9);
  const metal = material("ropeHookMetal", "#3d434d", 0.4, 0.5);
  const panel = B.MeshBuilder.CreateBox("ropePanel", { width: 0.14, height: 1.5, depth: 1.4 }, scene);
  panel.position.set(pos.x, 0.85, pos.z); panel.material = board; shadowGenerator.addShadowCaster(panel);
  const ropeColors = ["#e9a767", "#70c7c2", "#d36b61"];
  for (const [i, z] of [-0.42, 0, 0.42].entries()) {
    const hook = B.MeshBuilder.CreateCylinder("ropeHookPeg", { diameter: 0.08, height: 0.18, tessellation: 10 }, scene);
    hook.position.set(pos.x + 0.08, 1.35, pos.z + z); hook.rotation.z = Math.PI / 2; hook.material = metal;
    const coil = B.MeshBuilder.CreateTorus("ropeCoil", { diameter: 0.34, thickness: 0.05, tessellation: 20 }, scene);
    coil.position.set(pos.x + 0.16, 0.95, pos.z + z); coil.rotation.y = Math.PI / 2; coil.material = material(`ropeCoilMat${i}`, ropeColors[i % ropeColors.length], 0.85);
    shadowGenerator.addShadowCaster(hook); shadowGenerator.addShadowCaster(coil);
  }
  addZone("ropes", "Seilhaken", "rope", pos, 1.8, "#e9a767");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.4, halfZ: 0.75 });
}

function createMedballNet(pos) {
  const metal = material("medNetMetal", "#3d434d", 0.4, 0.5);
  const net = material("medNetMesh", "#8f9199", 0.7); net.alpha = 0.55;
  const base = B.MeshBuilder.CreateCylinder("medNetBase", { diameter: 1.6, height: 0.12, tessellation: 20 }, scene);
  base.position.set(pos.x, 0.06, pos.z); base.material = metal; shadowGenerator.addShadowCaster(base);
  for (const angle of [0, Math.PI / 2]) {
    const hoop = B.MeshBuilder.CreateTorus("medNetHoop", { diameter: 1.4, thickness: 0.05, tessellation: 24 }, scene);
    hoop.position.set(pos.x, 0.75, pos.z); hoop.rotation.x = Math.PI / 2; hoop.rotation.y = angle; hoop.material = net;
  }
  addZone("medballs", "Ballnetz", "medball", pos, 1.9, "#8f9199");
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.9, halfZ: 0.6 });
}

function createBaseDecor() {
  const metal = material("machineMetal", "#474e59", 0.38, 0.5);
  const pad = material("machinePad", "#16191f", 0.86);
  const lime = material("machineLime", "#a7f46a", 0.8);
  for (const [x, z, rot] of [[-4, 6.7, 0], [4.2, 6.7, 0], [-7, -1.5, Math.PI / 2]]) {
    const root = new B.TransformNode("bench", scene); root.position.set(x, 0, z); root.rotation.y = rot;
    const seat = B.MeshBuilder.CreateBox("benchSeat", { width: 2.3, height: 0.24, depth: 0.72 }, scene);
    seat.parent = root; seat.position.y = 0.62; seat.material = pad;
    for (const sx of [-0.78, 0.78]) {
      const leg = B.MeshBuilder.CreateBox("benchLeg", { width: 0.15, height: 0.62, depth: 0.55 }, scene);
      leg.parent = root; leg.position.set(sx, 0.31, 0); leg.material = metal;
    }
    root.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
    const swap = Math.abs(Math.sin(rot)) > 0.5;
    obstacles.push({ x, z, halfX: swap ? 0.55 : 1.3, halfZ: swap ? 1.3 : 0.55 });
  }

  const rack = new B.TransformNode("squatRack", scene); rack.position.set(0, 0, 7.3);
  for (const x of [-1.25, 1.25]) {
    const post = B.MeshBuilder.CreateBox("squatPost", { width: 0.18, height: 2.7, depth: 0.22 }, scene);
    post.parent = rack; post.position.set(x, 1.35, 0); post.material = metal;
  }
  const top = B.MeshBuilder.CreateBox("squatTop", { width: 2.7, height: 0.18, depth: 0.22 }, scene);
  top.parent = rack; top.position.y = 2.62; top.material = lime;
  rack.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
  obstacles.push({ x: 0, z: 7.3, halfX: 1.55, halfZ: 0.45 });

  for (const [x, z] of [[-11.8, 8], [11.8, 8]]) {
    const pot = B.MeshBuilder.CreateCylinder("pot", { diameterTop: 0.65, diameterBottom: 0.5, height: 0.72, tessellation: 18 }, scene);
    pot.position.set(x, 0.36, z); pot.material = material(`potMat${x}`, "#bc7658", 0.95);
    const plantMat = material(`plantMat${x}`, "#4c8a5c", 0.95);
    for (let i = 0; i < 5; i++) {
      const leaf = B.MeshBuilder.CreateSphere("leaf", { diameter: 0.72, segments: 10 }, scene);
      leaf.position.set(x + Math.sin(i * 2.1) * 0.3, 1 + (i % 2) * 0.27, z + Math.cos(i * 2.1) * 0.28);
      leaf.scaling.set(0.55, 1, 0.35); leaf.rotation.z = Math.sin(i) * 0.5; leaf.material = plantMat;
      shadowGenerator.addShadowCaster(leaf);
    }
    obstacles.push({ x, z, halfX: 0.5, halfZ: 0.5 });
  }
}

function createLevelDecor() {
  levelDecor = { closing: new B.TransformNode("closingDecor", scene), class: new B.TransformNode("classDecor", scene), legday: new B.TransformNode("legdayDecor", scene) };

  const classMat = material("classMat", "#76519c", 0.9);
  for (const [x, z] of [[-5.8, 3.7], [-2.8, 3.7], [0.2, 3.7], [3.2, 3.7], [6.2, 3.7]]) {
    const platform = B.MeshBuilder.CreateBox("stepPlatform", { width: 1.7, height: 0.22, depth: 0.72 }, scene);
    platform.parent = levelDecor.class; platform.position.set(x, 0.11, z); platform.material = classMat;
  }

  const plateMat = material("legPlate", "#d36b61", 0.82);
  for (const [x, z] of [[-4.5, 0.5], [4.5, 0.5]]) {
    const tree = new B.TransformNode("plateTree", scene); tree.parent = levelDecor.legday; tree.position.set(x, 0, z);
    const post = B.MeshBuilder.CreateCylinder("platePost", { diameter: 0.16, height: 1.6, tessellation: 14 }, scene);
    post.parent = tree; post.position.y = 0.8; post.material = material(`post${x}`, "#414852", 0.4, 0.45);
    for (let i = 0; i < 3; i++) {
      const plate = B.MeshBuilder.CreateTorus("plate", { diameter: 0.9, thickness: 0.18, tessellation: 22 }, scene);
      plate.parent = tree; plate.position.y = 0.35 + i * 0.42; plate.rotation.x = Math.PI / 2; plate.material = plateMat;
    }
  }
}

export function setActiveLevelDecor(levelId) {
  Object.entries(levelDecor).forEach(([id, root]) => root.setEnabled(id === levelId));
}

function createPegboards(detailed) {
  buildPegboard(-13.1, 8.0, detailed);
  buildPegboard(13.1, 8.0, detailed);
}

function buildPegboard(x, z, detailed) {
  const side = Math.sign(x);
  const panel = B.MeshBuilder.CreateBox("pegboardPanel", { width: 0.06, height: 2.0, depth: 2.2 }, scene);
  panel.position.set(x - side * 0.31, 1.9, z);
  panel.material = material("pegboardFrame", "#2c313a", 0.7, 0.3);
  shadowGenerator.addShadowCaster(panel);

  const hookMat = material("pegHook", "#8a8f97", 0.4, 0.6);
  [[-0.7, 2.5], [0, 2.5], [0.7, 2.5], [-0.35, 1.3], [0.35, 1.3]].forEach(([dz, y]) => {
    const hook = B.MeshBuilder.CreateCylinder("pegHook", { diameter: 0.05, height: 0.22, tessellation: 8 }, scene);
    hook.rotation.x = Math.PI / 2;
    hook.position.set(x - side * 0.42, y, z + dz);
    hook.material = hookMat;
  });

  buildKettlebell(x - side * 0.5, 2.5, z - 0.7, detailed);
  buildKettlebell(x - side * 0.5, 2.5, z + 0.7, detailed);
  buildResistanceBand(x - side * 0.45, 2.5, z);
  buildJumpRope(x - side * 0.42, 1.3, z - 0.35);
  buildJumpRope(x - side * 0.42, 1.3, z + 0.35);
}

function buildKettlebell(x, y, z, detailed) {
  const metal = material(`kettlebellMetal${x}${z}`, "#2b2e33", 0.35, 0.55);
  const body = B.MeshBuilder.CreateSphere(`kettlebellBody${x}${z}`, { diameter: 0.34, segments: detailed ? 14 : 8 }, scene);
  body.position.set(x, y - 0.32, z); body.material = metal;
  const handle = B.MeshBuilder.CreateTorus(`kettlebellHandle${x}${z}`, { diameter: 0.2, thickness: 0.035, tessellation: 12 }, scene);
  handle.position.set(x, y - 0.1, z); handle.rotation.x = Math.PI / 2; handle.material = metal;
  if (detailed) shadowGenerator.addShadowCaster(body);
}

function buildResistanceBand(x, y, z) {
  const band = B.MeshBuilder.CreateTorus("resistanceBand", { diameter: 0.26, thickness: 0.03, tessellation: 16 }, scene);
  band.position.set(x, y, z);
  band.material = material("resistanceBandMat", "#e16862", 0.6);
}

function buildJumpRope(x, y, z) {
  const rope = B.MeshBuilder.CreateTorus("jumpRope", { diameter: 0.22, thickness: 0.018, tessellation: 16 }, scene);
  rope.position.set(x, y, z);
  rope.material = material("jumpRopeMat", "#f4f2df", 0.5);
}
