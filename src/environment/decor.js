import { B } from "../babylon.js";
import { createMaterial, createTexturedMaterial } from "../materials.js";
import { createMuralTexture } from "./textures.js";
import { LEVEL_DECOR_SPECS } from "./level-decor-specs.js";

let scene;
let shadowGenerator;
let zones = [];
let obstacles = [];
let levelDecor = {};
let materialCache = new Map();
let levelAnimationObserver = null;
let animationScene = null;

function material(name, color, roughness = 0.85, metallic = 0) {
  if (!materialCache.has(name)) {
    materialCache.set(name, createMaterial(scene, name, color, roughness, metallic));
  }
  return materialCache.get(name);
}

function addShadow(mesh, detailed = true) {
  if (detailed) shadowGenerator.addShadowCaster(mesh);
}

export function buildDecor(sceneArg, shadowGeneratorArg, { quality = "high" } = {}) {
  if (animationScene && levelAnimationObserver) {
    animationScene.onBeforeRenderObservable.remove(levelAnimationObserver);
  }
  scene = sceneArg;
  shadowGenerator = shadowGeneratorArg;
  zones = [];
  obstacles = [];
  levelDecor = {};
  materialCache = new Map();
  levelAnimationObserver = null;
  animationScene = scene;
  const detailed = quality !== "low";

  createZones(detailed);
  createBaseDecor(detailed);
  createLevelDecor(detailed);
  createPegboards(detailed);

  return { zones, obstacles, levelDecor };
}

// bodyMeshes sind die sichtbaren Meshes der Zone (Korb, Regal, Kiste …). main.js
// staucht sie beim Aufschlag eines gelandeten Gegenstands. Die absoluten
// Koordinaten bleiben unangetastet — die Stauchung rechnet je Mesh mit dessen
// eigener Ausgangshöhe, statt alles unter einen neuen Elternknoten zu hängen.
function addZone(id, label, type, position, radius, color, bodyMeshes = []) {
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
  zones.push({
    id, label, type, position: position.clone(), radius, marker, beacon, deliveredCount: 0,
    bodyMeshes,
    // Ausgangswerte einmal sichern, damit die Stauchung immer von der Ruhelage
    // aus rechnet und sich bei mehreren Aufschlägen nicht aufschaukelt.
    bodyRest: bodyMeshes.map((mesh) => ({ y: mesh.position.y, scaling: mesh.scaling.clone() })),
    squash: null,
  });
}

function createZones(detailed) {
  createDumbbellRack(new B.Vector3(-9.8, 0, 6.7), detailed);
  createLaundryZone(new B.Vector3(9.8, 0, 6.6), detailed);
  createBottleZone(new B.Vector3(10.1, 0, -5.8), detailed);
  createMatZone(new B.Vector3(-10.1, 0, -5.8), detailed);
  createKettlebellRack(new B.Vector3(-11.0, 0, 0.6), detailed);
  createRopeHooks(new B.Vector3(11.0, 0, 0.6), detailed);
  createMedballNet(new B.Vector3(-6.5, 0, 6.7), detailed);
}

function createDumbbellRack(pos, detailed) {
  const metal = material("rackMetal", "#393f49", 0.43, 0.45);
  const accent = material("rackAccent", "#a7f46a", 0.75);
  const body = [];
  for (const x of [-1.05, 1.05]) {
    const post = B.MeshBuilder.CreateBox("rackPost", { width: 0.16, height: 2.05, depth: 0.32 }, scene);
    post.position.set(pos.x + x, 1.02, pos.z); post.material = metal; addShadow(post, detailed);
    body.push(post);
  }
  for (const y of [0.45, 1.05, 1.65]) {
    const beam = B.MeshBuilder.CreateBox("rackBeam", { width: 2.3, height: 0.13, depth: 0.42 }, scene);
    beam.position.set(pos.x, y, pos.z); beam.material = metal; addShadow(beam, detailed);
    body.push(beam);
  }
  const sign = B.MeshBuilder.CreateBox("rackSign", { width: 1.2, height: 0.18, depth: 0.48 }, scene);
  sign.position.set(pos.x, 2.1, pos.z); sign.material = accent;
  body.push(sign);
  addZone("rack", "Hantelregal", "dumbbell", pos, 2.0, "#a7f46a", body);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 1.4, halfZ: 0.55 });
}

function createLaundryZone(pos, detailed) {
  const basket = B.MeshBuilder.CreateCylinder("laundryBasket", { diameterTop: 1.35, diameterBottom: 1.05, height: 1.35, tessellation: detailed ? 20 : 10 }, scene);
  basket.position.set(pos.x, 0.68, pos.z); basket.material = material("basket", "#f0bd72", 0.9); addShadow(basket, detailed);
  const hole = B.MeshBuilder.CreateCylinder("laundryHole", { diameter: 1.05, height: 0.04, tessellation: detailed ? 24 : 12 }, scene);
  hole.position.set(pos.x, 1.37, pos.z); hole.material = material("basketHole", "#302c29", 1);
  addZone("laundry", "Wäschekorb", "towel", pos, 1.8, "#ffbd73", [basket, hole]);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.7, halfZ: 0.7 });
}

function createBottleZone(pos, detailed) {
  const box = B.MeshBuilder.CreateBox("bottleCrate", { width: 1.7, height: 1.15, depth: 1.25 }, scene);
  box.position.set(pos.x, 0.58, pos.z); box.material = material("lostBox", "#5da9df", 0.88); addShadow(box, detailed);
  const top = B.MeshBuilder.CreateBox("crateTop", { width: 1.42, height: 0.05, depth: 0.92 }, scene);
  top.position.set(pos.x, 1.17, pos.z); top.material = material("crateDark", "#24364b", 0.9);
  addZone("bottles", "Flaschenbox", "bottle", pos, 1.85, "#63b4ef", [box, top]);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.9, halfZ: 0.7 });
}

function createMatZone(pos, detailed) {
  const rackMat = material("matRack", "#d97f6c", 0.88);
  const metal = material("matMetal", "#404650", 0.45, 0.4);
  const base = B.MeshBuilder.CreateBox("matRackBase", { width: 2.2, height: 0.15, depth: 1.25 }, scene);
  base.position.set(pos.x, 0.08, pos.z); base.material = metal;
  const body = [base];
  for (const x of [-0.8, 0, 0.8]) {
    const guide = B.MeshBuilder.CreateBox("matGuide", { width: 0.08, height: 1.55, depth: 0.8 }, scene);
    guide.position.set(pos.x + x, 0.78, pos.z); guide.material = rackMat;
    body.push(guide);
  }
  addZone("mats", "Mattenregal", "mat", pos, 2.0, "#ed8c78", body);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 1.25, halfZ: 0.7 });
}

function createKettlebellRack(pos, detailed) {
  const metal = material("kettleMetal", "#3d434d", 0.4, 0.5);
  const base = B.MeshBuilder.CreateBox("kettleBase", { width: 1.5, height: 0.14, depth: 0.8 }, scene);
  base.position.set(pos.x, 0.07, pos.z); base.material = metal; addShadow(base, detailed);
  const body = [base];
  const shelf = B.MeshBuilder.CreateBox("kettleShelf", { width: 1.5, height: 0.1, depth: 0.8 }, scene);
  shelf.position.set(pos.x, 0.73, pos.z); shelf.material = metal; addShadow(shelf, detailed);
  body.push(shelf);
  for (const x of [-0.72, 0.72]) {
    const post = B.MeshBuilder.CreateBox("kettleRackPost", { width: 0.08, height: 1.25, depth: 0.1 }, scene);
    post.position.set(pos.x + x, 0.625, pos.z + 0.34); post.material = metal; addShadow(post, detailed);
    body.push(post);
  }
  for (const y of [0.28, 0.92]) {
    const guard = B.MeshBuilder.CreateBox("kettleRackGuard", { width: 1.45, height: 0.08, depth: 0.08 }, scene);
    guard.position.set(pos.x, y, pos.z + 0.36); guard.material = metal; addShadow(guard, detailed);
    body.push(guard);
  }
  addZone("kettlebells", "Kettlebell-Ecke", "kettlebell", pos, 1.8, "#c9c2b6", body);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.8, halfZ: 0.5 });
}

function createRopeHooks(pos, detailed) {
  const board = material("ropeBoard", "#5c4a3a", 0.9);
  const metal = material("ropeHookMetal", "#3d434d", 0.4, 0.5);
  const panel = B.MeshBuilder.CreateBox("ropePanel", { width: 0.14, height: 1.5, depth: 1.4 }, scene);
  panel.position.set(pos.x, 0.85, pos.z); panel.material = board; addShadow(panel, detailed);
  const body = [panel];
  for (const z of [-0.42, 0, 0.42]) {
    const collar = B.MeshBuilder.CreateCylinder("ropeHookCollar", { diameter: 0.16, height: 0.04, tessellation: detailed ? 12 : 8 }, scene);
    collar.position.set(pos.x - 0.09, 1.35, pos.z + z); collar.rotation.z = Math.PI / 2; collar.material = metal;
    const hook = B.MeshBuilder.CreateCylinder("ropeHookPeg", { diameter: 0.07, height: 0.5, tessellation: detailed ? 10 : 6 }, scene);
    hook.position.set(pos.x - 0.22, 1.35, pos.z + z); hook.rotation.z = Math.PI / 2; hook.material = metal;
    addShadow(collar, detailed); addShadow(hook, detailed);
    body.push(collar, hook);
  }
  addZone("ropes", "Seilhaken", "rope", pos, 1.8, "#e9a767", body);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.4, halfZ: 0.75 });
}

function createMedballNet(pos, detailed) {
  const metal = material("medNetMetal", "#3d434d", 0.4, 0.5);
  const net = material("medNetMesh", "#8f9199", 0.82);
  const base = B.MeshBuilder.CreateCylinder("medNetBase", { diameter: 1.7, height: 0.12, tessellation: detailed ? 24 : 12 }, scene);
  base.position.set(pos.x, 0.06, pos.z); base.material = metal; addShadow(base, detailed);
  const body = [base];
  for (const y of [0.2, 0.9, 1.6, 2.3]) {
    const ring = B.MeshBuilder.CreateTorus("medNetRing", { diameter: 1.65, thickness: 0.045, tessellation: detailed ? 28 : 14 }, scene);
    ring.position.set(pos.x, y, pos.z); ring.material = net; addShadow(ring, detailed);
    body.push(ring);
  }
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    const post = B.MeshBuilder.CreateCylinder("medNetPost", { diameter: 0.045, height: 2.2, tessellation: detailed ? 10 : 6 }, scene);
    post.position.set(pos.x + Math.cos(angle) * 0.78, 1.2, pos.z + Math.sin(angle) * 0.78);
    post.material = net; addShadow(post, detailed);
    body.push(post);
  }
  addZone("medballs", "Ballnetz", "medball", pos, 1.9, "#8f9199", body);
  obstacles.push({ x: pos.x, z: pos.z, halfX: 0.95, halfZ: 0.95 });
}

function createBaseDecor(detailed) {
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
    root.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
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
  rack.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
  obstacles.push({ x: 0, z: 7.3, halfX: 1.55, halfZ: 0.45 });

  for (const [x, z] of [[-11.8, 8], [11.8, 8]]) {
    const pot = B.MeshBuilder.CreateCylinder("pot", { diameterTop: 0.65, diameterBottom: 0.5, height: 0.72, tessellation: detailed ? 18 : 8 }, scene);
    pot.position.set(x, 0.36, z); pot.material = material(`potMat${x}`, "#bc7658", 0.95);
    const plantMat = material(`plantMat${x}`, "#4c8a5c", 0.95);
    for (let i = 0; i < (detailed ? 5 : 3); i++) {
      const leaf = B.MeshBuilder.CreateSphere("leaf", { diameter: 0.72, segments: detailed ? 10 : 6 }, scene);
      leaf.position.set(x + Math.sin(i * 2.1) * 0.3, 1 + (i % 2) * 0.27, z + Math.cos(i * 2.1) * 0.28);
      leaf.scaling.set(0.55, 1, 0.35); leaf.rotation.z = Math.sin(i) * 0.5; leaf.material = plantMat;
      addShadow(leaf, detailed);
    }
    obstacles.push({ x, z, halfX: 0.5, halfZ: 0.5 });
  }
}

function createLevelDecor(detailed) {
  for (const [id, spec] of Object.entries(LEVEL_DECOR_SPECS)) {
    const root = new B.TransformNode(`${id}Decor`, scene);
    root.metadata = {
      levelId: id,
      label: spec.label,
      accent: spec.accent,
      quality: detailed ? "high" : "low",
      animatedNodes: [],
    };
    levelDecor[id] = root;
    createLevelFloor(root, id, spec, detailed);
    createLevelSign(root, id, spec, detailed);
  }

  createClosingDecor(levelDecor.closing, LEVEL_DECOR_SPECS.closing, detailed);
  createClassDecor(levelDecor.class, LEVEL_DECOR_SPECS.class, detailed);
  createLegdayDecor(levelDecor.legday, LEVEL_DECOR_SPECS.legday, detailed);

  // main.js aktiviert unmittelbar danach das gewählte Level. Bis dahin darf
  // keine Levelkulisse versehentlich über einer anderen liegen.
  Object.values(levelDecor).forEach((root) => root.setEnabled(false));
  installLevelAnimationLoop();
}

function createLevelFloor(root, id, spec, detailed) {
  const floorColors = {
    closing: "#30382f",
    class: "#332c3d",
    legday: "#3b302a",
  };
  const floor = B.MeshBuilder.CreateBox(`${id}FloorIsland`, {
    width: spec.floor.width,
    height: 0.018,
    depth: spec.floor.depth,
  }, scene);
  floor.parent = root;
  floor.position.set(spec.floor.x, 0.018, spec.floor.z);
  floor.material = material(`${id}FloorMat`, floorColors[id], 0.96);
  floor.receiveShadows = true;
  floor.isPickable = false;

  const edgeMat = material(`${id}FloorEdge`, spec.accent, 0.72);
  edgeMat.emissiveColor = B.Color3.FromHexString(spec.accent).scale(detailed ? 0.055 : 0.025);
  for (const z of [-1, 1]) {
    // Kurze Eckmarkierungen lesen sich weiterhin als abgegrenzte Trainingszone,
    // ohne aus der niedrigen Spielkamera wie ein leuchtender Bildschirmrahmen
    // quer durch das gesamte Gym zu wirken.
    for (const x of [-1, 1]) {
      const edge = B.MeshBuilder.CreateBox(`${id}FloorEdge`, {
        width: Math.min(1.65, spec.floor.width * 0.2),
        height: 0.022,
        depth: 0.055,
      }, scene);
      edge.parent = root;
      edge.position.set(
        spec.floor.x + x * (spec.floor.width / 2 - Math.min(0.9, spec.floor.width * 0.12)),
        0.031,
        spec.floor.z + z * (spec.floor.depth / 2 - 0.08),
      );
      edge.material = edgeMat;
      edge.isPickable = false;
    }
  }

  // Wenige große Markierungen lesen sich aus der Spielkamera besser als viele
  // kleine Fliesen und kosten auch auf Low-End-Geräten kaum Geometrie.
  const stripeCount = detailed ? 7 : 4;
  const stripeMat = material(`${id}FloorStripe`, spec.secondary, 0.78);
  stripeMat.alpha = 0.34;
  for (let i = 0; i < stripeCount; i++) {
    const stripe = B.MeshBuilder.CreateBox(`${id}FloorStripe`, {
      width: 0.12,
      height: 0.012,
      depth: Math.min(1.2, spec.floor.depth * 0.31),
    }, scene);
    stripe.parent = root;
    stripe.position.set(
      spec.floor.x - spec.floor.width * 0.36 + i * (spec.floor.width * 0.72 / Math.max(1, stripeCount - 1)),
      0.034,
      spec.floor.z,
    );
    stripe.rotation.y = id === "legday" ? Math.PI / 4 : 0;
    stripe.material = stripeMat;
    stripe.isPickable = false;
  }

  if (detailed) {
    const light = new B.PointLight(`${id}FloorLight`, new B.Vector3(
      spec.floor.x,
      3.45,
      spec.floor.z,
    ), scene);
    light.parent = root;
    light.diffuse = B.Color3.FromHexString(spec.accent);
    light.specular = B.Color3.FromHexString(spec.secondary).scale(0.35);
    light.intensity = 0.19;
    light.range = 8.5;
    root.metadata.lightNode = light;
  }
}

function createLevelSign(root, id, spec, detailed) {
  const texture = createMuralTexture(scene, `${id}ShiftSignTexture`, {
    width: detailed ? 1024 : 512,
    height: detailed ? 256 : 128,
    phrase: spec.sign.phrase,
    accent: spec.accent,
  });
  const signMat = createTexturedMaterial(scene, `${id}ShiftSignMaterial`, texture, { roughness: 0.72 });
  signMat.emissiveTexture = texture;
  signMat.emissiveColor = B.Color3.FromHexString(spec.accent).scale(detailed ? 0.2 : 0.11);
  signMat.backFaceCulling = false;

  const sign = B.MeshBuilder.CreatePlane(`${id}ShiftSign`, { width: spec.sign.width, height: 1.28 }, scene);
  sign.parent = root;
  sign.position.set(0, 3.35, 8.88);
  sign.rotation.y = Math.PI;
  sign.material = signMat;
  sign.isPickable = false;

  if (!detailed) return;
  const cableMat = material("shiftSignCable", "#262a31", 0.38, 0.52);
  for (const x of [-spec.sign.width * 0.36, spec.sign.width * 0.36]) {
    const cable = B.MeshBuilder.CreateCylinder(`${id}SignCable`, {
      diameter: 0.025,
      height: 1.25,
      tessellation: 6,
    }, scene);
    cable.parent = root;
    cable.position.set(x, 4.08, 8.9);
    cable.material = cableMat;
  }
}

function registerLevelObstacle(level, descriptor) {
  obstacles.push({
    id: descriptor.id,
    level,
    x: descriptor.position[0],
    z: descriptor.position[1],
    halfX: descriptor.halfX,
    halfZ: descriptor.halfZ,
  });
}

function createClosingDecor(root, spec, detailed) {
  const cart = spec.obstacles.find(({ kind }) => kind === "service-cart");
  const cartRoot = new B.TransformNode(cart.id, scene);
  cartRoot.parent = root;
  cartRoot.position.set(cart.position[0], 0, cart.position[1]);

  const frameMat = material("closingCartFrame", "#39424b", 0.42, 0.44);
  const shelfMat = material("closingCartShelf", "#668b78", 0.84);
  const clothMat = material("closingCartCloth", spec.secondary, 0.94);
  const base = B.MeshBuilder.CreateBox("closingCartBase", { width: 1.82, height: 0.18, depth: 0.78 }, scene);
  base.parent = cartRoot; base.position.y = 0.3; base.material = frameMat;
  const shelf = B.MeshBuilder.CreateBox("closingCartShelf", { width: 1.62, height: 0.52, depth: 0.68 }, scene);
  shelf.parent = cartRoot; shelf.position.y = 0.68; shelf.material = shelfMat;
  const foldedCloth = B.MeshBuilder.CreateBox("closingFoldedCloth", { width: 0.62, height: 0.12, depth: 0.5 }, scene);
  foldedCloth.parent = cartRoot; foldedCloth.position.set(-0.35, 1.01, 0); foldedCloth.material = clothMat;
  for (const x of [-0.72, 0.72]) {
    const handle = B.MeshBuilder.CreateCylinder("closingCartHandle", {
      diameter: 0.07,
      height: 1.22,
      tessellation: detailed ? 10 : 6,
    }, scene);
    handle.parent = cartRoot;
    handle.position.set(x, 1.02, 0.28);
    handle.material = frameMat;
  }
  if (detailed) {
    const bottleMat = material("closingCleanerBottle", "#63b4ef", 0.7);
    for (const x of [0.2, 0.48]) {
      const bottle = B.MeshBuilder.CreateCylinder("closingCleanerBottle", {
        diameterTop: 0.12,
        diameterBottom: 0.17,
        height: 0.42,
        tessellation: 10,
      }, scene);
      bottle.parent = cartRoot; bottle.position.set(x, 1.18, 0); bottle.material = bottleMat;
    }
  }
  cartRoot.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
  registerLevelObstacle("closing", cart);

  const wetFloor = spec.obstacles.find(({ kind }) => kind === "wet-floor-station");
  const station = new B.TransformNode(wetFloor.id, scene);
  station.parent = root;
  station.position.set(wetFloor.position[0], 0, wetFloor.position[1]);
  const warningMat = material("closingWarning", "#f2bd45", 0.82);
  const signLeft = B.MeshBuilder.CreateBox("wetFloorSignLeft", { width: 0.08, height: 1.05, depth: 0.74 }, scene);
  signLeft.parent = station; signLeft.position.set(-0.22, 0.55, 0); signLeft.rotation.z = -0.36; signLeft.material = warningMat;
  const signRight = signLeft.clone("wetFloorSignRight");
  signRight.parent = station; signRight.position.x = 0.22; signRight.rotation.z = 0.36;
  const bucket = B.MeshBuilder.CreateCylinder("closingBucket", {
    diameterTop: 0.55,
    diameterBottom: 0.42,
    height: 0.5,
    tessellation: detailed ? 14 : 7,
  }, scene);
  bucket.parent = station; bucket.position.set(0, 0.25, 0.42); bucket.material = material("closingBucketMat", "#577688", 0.9);
  station.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
  registerLevelObstacle("closing", wetFloor);

  const beacon = new B.TransformNode("closingStatusBeacon", scene);
  beacon.parent = cartRoot;
  beacon.position.set(0.72, 1.55, 0.28);
  const bulb = B.MeshBuilder.CreateSphere("closingStatusBulb", { diameter: 0.2, segments: detailed ? 10 : 6 }, scene);
  bulb.parent = beacon;
  const beaconMat = material("closingStatusLight", spec.accent, 0.38);
  beaconMat.emissiveColor = B.Color3.FromHexString(spec.accent).scale(0.72);
  bulb.material = beaconMat;
  root.metadata.animatedNodes.push({ node: beacon, type: "pulse", speed: 2.2, amplitude: 0.13 });

  if (detailed) {
    const mopMat = material("closingMop", "#d7d0bc", 0.92);
    for (const x of [-4.6, -1.6, 1.4, 4.4]) {
      const cleanedPatch = B.MeshBuilder.CreateDisc("cleanedFloorPatch", { radius: 0.52, tessellation: 20 }, scene);
      cleanedPatch.parent = root;
      cleanedPatch.position.set(x, 0.032, -4.8 + Math.sin(x) * 0.35);
      cleanedPatch.rotation.x = Math.PI / 2;
      cleanedPatch.material = mopMat;
      cleanedPatch.material.alpha = 0.1;
      cleanedPatch.isPickable = false;
    }
  }
}

function createClassDecor(root, spec, detailed) {
  const stepBaseMat = material("classStepBase", "#5c3f76", 0.9);
  const stepTopMat = material("classStepTop", spec.accent, 0.82);
  const stepEdgeMat = material("classStepEdge", spec.secondary, 0.72);

  for (const descriptor of spec.obstacles) {
    const step = new B.TransformNode(descriptor.id, scene);
    step.parent = root;
    step.position.set(descriptor.position[0], 0, descriptor.position[1]);
    const base = B.MeshBuilder.CreateBox("classStepPlatform", { width: 1.74, height: 0.22, depth: 0.76 }, scene);
    base.parent = step; base.position.y = 0.11; base.material = stepBaseMat;
    const top = B.MeshBuilder.CreateBox("classStepTop", { width: 1.62, height: 0.055, depth: 0.67 }, scene);
    top.parent = step; top.position.y = 0.247; top.material = stepTopMat;
    if (detailed) {
      for (const x of [-0.7, 0.7]) {
        const end = B.MeshBuilder.CreateBox("classStepEnd", { width: 0.12, height: 0.14, depth: 0.81 }, scene);
        end.parent = step; end.position.set(x, 0.11, 0); end.material = stepEdgeMat;
      }
    }
    step.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
    registerLevelObstacle("class", descriptor);
  }

  const matColors = [spec.accent, "#63b4ef", "#ed8c78"];
  const matCount = detailed ? 6 : 3;
  for (let i = 0; i < matCount; i++) {
    const mat = B.MeshBuilder.CreateBox("classFloorMat", { width: 1.35, height: 0.022, depth: 2.35 }, scene);
    mat.parent = root;
    const row = i % 2;
    mat.position.set(-6.4 + Math.floor(i / 2) * 3.15, 0.045, 0.7 + row * 0.3);
    mat.rotation.y = row ? 0.06 : -0.06;
    mat.material = material(`classFloorMat${i % matColors.length}`, matColors[i % matColors.length], 0.96);
    mat.isPickable = false;
  }

  const tempo = new B.TransformNode("classTempoIndicator", scene);
  tempo.parent = root;
  tempo.position.set(0, 2.65, 7.95);
  const ring = B.MeshBuilder.CreateTorus("classTempoRing", {
    diameter: 0.62,
    thickness: 0.07,
    tessellation: detailed ? 24 : 12,
  }, scene);
  ring.parent = tempo;
  ring.material = stepEdgeMat;
  stepEdgeMat.emissiveColor = B.Color3.FromHexString(spec.secondary).scale(0.38);
  root.metadata.animatedNodes.push({ node: tempo, type: "bob-spin", speed: 1.25, amplitude: 0.12, baseY: tempo.position.y });
}

function createLegdayDecor(root, spec, detailed) {
  const ironMat = material("legdayIron", "#343941", 0.4, 0.52);
  const plateMat = material("legdayPlate", spec.secondary, 0.82);
  const accentMat = material("legdayAccent", spec.accent, 0.74);

  for (const descriptor of spec.obstacles.filter(({ kind }) => kind === "plate-tree")) {
    const tree = new B.TransformNode(descriptor.id, scene);
    tree.parent = root;
    tree.position.set(descriptor.position[0], 0, descriptor.position[1]);
    const base = B.MeshBuilder.CreateCylinder("legdayTreeBase", {
      diameter: 1.05,
      height: 0.12,
      tessellation: detailed ? 18 : 9,
    }, scene);
    base.parent = tree; base.position.y = 0.06; base.material = ironMat;
    const post = B.MeshBuilder.CreateCylinder("legdayTreePost", {
      diameter: 0.17,
      height: 1.7,
      tessellation: detailed ? 14 : 7,
    }, scene);
    post.parent = tree; post.position.y = 0.88; post.material = ironMat;
    for (let i = 0; i < (detailed ? 4 : 2); i++) {
      const plate = B.MeshBuilder.CreateTorus("legdayStoredPlate", {
        diameter: 0.92,
        thickness: 0.18,
        tessellation: detailed ? 22 : 11,
      }, scene);
      plate.parent = tree;
      plate.position.y = 0.3 + i * 0.38;
      plate.rotation.x = Math.PI / 2;
      plate.material = i % 2 ? accentMat : plateMat;
    }
    tree.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
    registerLevelObstacle("legday", descriptor);
  }

  const sledDescriptor = spec.obstacles.find(({ kind }) => kind === "push-sled");
  const sled = new B.TransformNode(sledDescriptor.id, scene);
  sled.parent = root;
  sled.position.set(sledDescriptor.position[0], 0, sledDescriptor.position[1]);
  const sledBase = B.MeshBuilder.CreateBox("legdaySledBase", { width: 2.18, height: 0.13, depth: 0.92 }, scene);
  sledBase.parent = sled; sledBase.position.y = 0.13; sledBase.material = ironMat;
  for (const x of [-0.78, 0.78]) {
    const handle = B.MeshBuilder.CreateCylinder("legdaySledHandle", {
      diameter: 0.1,
      height: 1.35,
      tessellation: detailed ? 10 : 6,
    }, scene);
    handle.parent = sled; handle.position.set(x, 0.78, 0); handle.material = accentMat;
  }
  const loadedPlate = B.MeshBuilder.CreateCylinder("legdaySledLoad", {
    diameter: 0.92,
    height: 0.24,
    tessellation: detailed ? 20 : 10,
  }, scene);
  loadedPlate.parent = sled; loadedPlate.position.y = 0.31; loadedPlate.material = plateMat;
  sled.getChildMeshes().forEach((mesh) => addShadow(mesh, detailed));
  registerLevelObstacle("legday", sledDescriptor);

  for (const x of [-7.1, 7.1]) {
    const platform = B.MeshBuilder.CreateBox("legdayLiftingPlatform", {
      width: 3.25,
      height: 0.025,
      depth: 2.2,
    }, scene);
    platform.parent = root;
    platform.position.set(x, 0.046, 1.15);
    platform.material = material("legdayPlatform", "#282b30", 0.98);
    platform.isPickable = false;
    const center = B.MeshBuilder.CreateBox("legdayPlatformCenter", {
      width: 1.6,
      height: 0.018,
      depth: 2.05,
    }, scene);
    center.parent = root;
    center.position.set(x, 0.07, 1.15);
    center.material = material("legdayPlatformCenter", "#594231", 0.92);
    center.isPickable = false;
  }

  const warning = new B.TransformNode("legdayLoadIndicator", scene);
  warning.parent = sled;
  warning.position.set(0, 1.65, 0);
  const warningRing = B.MeshBuilder.CreateTorus("legdayLoadRing", {
    diameter: 0.48,
    thickness: 0.06,
    tessellation: detailed ? 20 : 10,
  }, scene);
  warningRing.parent = warning; warningRing.rotation.x = Math.PI / 2; warningRing.material = accentMat;
  accentMat.emissiveColor = B.Color3.FromHexString(spec.accent).scale(0.28);
  root.metadata.animatedNodes.push({ node: warning, type: "spin", speed: 1.6 });
}

function installLevelAnimationLoop() {
  let elapsed = 0;
  levelAnimationObserver = scene.onBeforeRenderObservable.add(() => {
    elapsed += Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    for (const root of Object.values(levelDecor)) {
      if (!root.isEnabled()) continue;
      for (const animation of root.metadata.animatedNodes) {
        if (animation.type === "pulse") {
          const scale = 1 + Math.sin(elapsed * animation.speed * Math.PI * 2) * animation.amplitude;
          animation.node.scaling.set(scale, scale, scale);
        } else if (animation.type === "bob-spin") {
          animation.node.position.y = animation.baseY + Math.sin(elapsed * animation.speed * Math.PI * 2) * animation.amplitude;
          animation.node.rotation.z = elapsed * animation.speed;
        } else if (animation.type === "spin") {
          animation.node.rotation.y = elapsed * animation.speed;
        }
      }
    }
  });
}

export function setActiveLevelDecor(levelId) {
  Object.entries(levelDecor).forEach(([id, root]) => root.setEnabled(id === levelId));
}

function createPegboards(detailed) {
  const kettlebellMetal = material("kettlebellMetal", "#2b2e33", 0.35, 0.55);
  buildPegboard(-13.1, 8.0, kettlebellMetal, detailed);
  buildPegboard(13.1, 8.0, kettlebellMetal, detailed);
}

function buildPegboard(x, z, kettlebellMetal, detailed) {
  const side = Math.sign(x);
  const panel = B.MeshBuilder.CreateBox("pegboardPanel", { width: 0.06, height: 2.0, depth: 2.2 }, scene);
  panel.position.set(x - side * 0.31, 1.9, z);
  panel.material = material("pegboardFrame", "#2c313a", 0.7, 0.3);
  if (detailed) shadowGenerator.addShadowCaster(panel);

  const hookMat = material("pegHook", "#8a8f97", 0.4, 0.6);
  [[-0.7, 2.5], [0, 2.5], [0.7, 2.5], [-0.35, 1.3], [0.35, 1.3]].forEach(([dz, y]) => {
    const hook = B.MeshBuilder.CreateCylinder("pegHook", { diameter: 0.05, height: 0.22, tessellation: 8 }, scene);
    hook.rotation.x = Math.PI / 2;
    hook.position.set(x - side * 0.42, y, z + dz);
    hook.material = hookMat;
  });

  buildKettlebell(x - side * 0.5, 2.5, z - 0.7, kettlebellMetal, detailed);
  buildKettlebell(x - side * 0.5, 2.5, z + 0.7, kettlebellMetal, detailed);
  buildResistanceBand(x - side * 0.45, 2.5, z);
  buildJumpRope(x - side * 0.42, 1.3, z - 0.35);
  buildJumpRope(x - side * 0.42, 1.3, z + 0.35);
}

function buildKettlebell(x, y, z, metal, detailed) {
  const body = B.MeshBuilder.CreateSphere("kettlebellBody", { diameter: 0.34, segments: detailed ? 14 : 8 }, scene);
  body.position.set(x, y - 0.32, z); body.material = metal;
  const handle = B.MeshBuilder.CreateTorus("kettlebellHandle", { diameter: 0.2, thickness: 0.035, tessellation: 12 }, scene);
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
