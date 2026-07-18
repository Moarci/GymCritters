import {
  ACHIEVEMENTS,
  CHARACTERS,
  CONFIG,
  ITEM_TYPES,
  LEVELS,
  MODES,
  SHOP_ITEMS,
} from "./config.js";
import { buyOrEquip, evaluateAchievements, loadSave, owns, persistSave } from "./save.js";
import { AudioSystem } from "./audio.js";

const B = window["BABYLON"];
if (!B) throw new Error("Babylon.js ist nicht verfügbar.");

const $ = (id) => /** @type {any} */ (document.getElementById(id));
const ui = {
  canvas: $("gameCanvas"), loading: $("loading"), hud: $("hud"), objective: $("objective"),
  progressTrack: $("progressTrack"), progressBar: $("progressBar"), navigator: $("navigator"),
  navArrow: $("navArrow"), navTarget: $("navTarget"), navDistance: $("navDistance"),
  speechBubble: $("speechBubble"), tutorialCoach: $("tutorialCoach"), tutorialTitle: $("tutorialTitle"),
  tutorialText: $("tutorialText"), prompt: $("prompt"), toast: $("toast"),
  achievementToast: $("achievementToast"), achievementIcon: $("achievementIcon"), achievementName: $("achievementName"),
  scorePopLayer: $("scorePopLayer"), score: $("score"), progress: $("progress"), combo: $("combo"),
  timer: $("timer"), coins: $("coins"), carrying: $("carrying"), carryCard: $("carryCard"),
  cameraButton: $("cameraButton"), fullscreenHudButton: $("fullscreenHudButton"), soundButton: $("soundButton"),
  pauseButton: $("pauseButton"), mobileControls: $("mobileControls"), joystick: $("joystick"),
  joystickKnob: $("joystickKnob"), sprintButton: $("sprintButton"), interactButton: $("interactButton"),
  orientationHint: $("orientationHint"), startScreen: $("startScreen"), menuCoins: $("menuCoins"),
  characterSelector: $("characterSelector"), levelSelector: $("levelSelector"), modeSelector: $("modeSelector"),
  startButton: $("startButton"), shopButton: $("shopButton"), achievementsButton: $("achievementsButton"),
  statsButton: $("statsButton"), settingsButton: $("settingsButton"), fullscreenButton: $("fullscreenButton"),
  pauseScreen: $("pauseScreen"), resumeButton: $("resumeButton"), pauseRestartButton: $("pauseRestartButton"),
  pauseMenuButton: $("pauseMenuButton"), resultScreen: $("resultScreen"), resultBadge: $("resultBadge"),
  resultRank: $("resultRank"), resultRankDetail: $("resultRankDetail"), resultRankBox: document.querySelector(".result-rank"),
  resultTitle: $("resultTitle"), resultText: $("resultText"), finalScore: $("finalScore"),
  earnedCoins: $("earnedCoins"), highScore: $("highScore"), bestTime: $("bestTime"),
  newAchievements: $("newAchievements"), restartButton: $("restartButton"), resultShopButton: $("resultShopButton"),
  resultMenuButton: $("resultMenuButton"), shopScreen: $("shopScreen"), shopCoins: $("shopCoins"), shopGrid: $("shopGrid"),
  achievementsScreen: $("achievementsScreen"), achievementGrid: $("achievementGrid"), statsScreen: $("statsScreen"),
  careerStats: $("careerStats"), modeStats: $("modeStats"), settingsScreen: $("settingsScreen"),
  cameraSensitivity: $("cameraSensitivity"), joystickScale: $("joystickScale"), qualitySetting: $("qualitySetting"),
  vibrationSetting: $("vibrationSetting"), resetTutorialButton: $("resetTutorialButton"),
};

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const save = loadSave();
const audio = new AudioSystem(save);
const engine = new B.Engine(ui.canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true });
applyRenderQuality();

const state = {
  playing: false, paused: false, ended: false, finishing: false, tutorial: false, tutorialStage: 0,
  mode: MODES[save.lastMode] ? save.lastMode : "standard",
  level: LEVELS[save.lastLevel] ? save.lastLevel : "closing",
  character: owns(save, save.selectedCharacter) ? save.selectedCharacter : "raccoon",
  score: 0, combo: 0, delivered: 0, timeLeft: 120, roundSeconds: 120, wrongPlacements: 0,
  droppedItems: 0, maxCombo: 0, deliveredDumbbells: 0, heldItems: [], nearestItem: null, nearestZone: null,
  keys: new Set(), interactPressed: false, elapsed: 0, hudAccumulator: 0,
  velocity: new B.Vector3(0, 0, 0), reaction: { type: null, time: 0 },
  touch: { x: 0, z: 0, sprint: false, pointerId: null },
  toastTimer: null, speechTimer: null, achievementTimer: null, tutorialResumeMode: null,
};

let scene;
let camera;
let shadowGenerator;
let highlightLayer;
let player;
let playerVisual;
let playerParts = {};
let carryAnchors = [];
let items = [];
let zones = [];
let obstacles = [];
let highlightedItem = null;
let deliveryObservers = [];
let levelDecor = {};
let trailAccumulator = 0;

function material(name, color, roughness = 0.85, metallic = 0) {
  const mat = new B.PBRMaterial(name, scene);
  mat.albedoColor = B.Color3.FromHexString(color);
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}

function vibrate(pattern) {
  if (save.settings.vibration && navigator.vibrate) navigator.vibrate(pattern);
}

function applyRenderQuality() {
  const quality = save.settings.quality;
  if (quality === "low") {
    engine.setHardwareScalingLevel(Math.max(1.35, window.devicePixelRatio || 1));
  } else if (isTouchDevice && window.devicePixelRatio > 1.5) {
    engine.setHardwareScalingLevel(window.devicePixelRatio / 1.45);
  } else {
    engine.setHardwareScalingLevel(1);
  }
}

function createScene() {
  scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.055, 0.064, 0.084, 1);
  scene.ambientColor = new B.Color3(0.25, 0.27, 0.32);
  scene.imageProcessingConfiguration.contrast = 1.08;
  scene.imageProcessingConfiguration.exposure = 1.05;

  const hemispheric = new B.HemisphericLight("ambient", new B.Vector3(0, 1, 0), scene);
  hemispheric.intensity = 0.72;
  hemispheric.groundColor = new B.Color3(0.08, 0.08, 0.1);
  const key = new B.DirectionalLight("key", new B.Vector3(-0.55, -1, 0.35), scene);
  key.position = new B.Vector3(8, 13, -8);
  key.intensity = 1.8;

  shadowGenerator = new B.ShadowGenerator(save.settings.quality === "low" ? 512 : 1024, key);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = save.settings.quality === "low" ? 10 : 24;
  shadowGenerator.bias = 0.001;

  highlightLayer = new B.HighlightLayer("interactionHighlights", scene, { blurHorizontalSize: 1.2, blurVerticalSize: 1.2 });
  highlightLayer.innerGlow = false;
  highlightLayer.outerGlow = true;

  createGym();
  createZones();
  createBaseDecor();
  createLevelDecor();
  createPlayerCollider();
  buildCharacter(state.character);
  createCamera();
  setActiveLevelDecor(state.level);
  scene.onBeforeRenderObservable.add(update);
}

function createGym() {
  const floorMat = material("rubberFloor", "#252a34", 0.95);
  const wallMat = material("wall", "#e2ddd2", 0.9);
  const darkWallMat = material("darkWall", "#303541", 0.92);
  const accentMat = material("accent", "#a7f46a", 0.8);
  const floor = B.MeshBuilder.CreateGround("floor", { width: 27, height: 19 }, scene);
  floor.material = floorMat;
  floor.receiveShadows = true;

  for (let x = -12; x <= 12; x += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamX${x}`, { width: 0.025, height: 0.006, depth: 18.3 }, scene);
    seam.position.set(x, 0.006, 0);
    seam.material = darkWallMat;
  }
  for (let z = -8; z <= 8; z += 2) {
    const seam = B.MeshBuilder.CreateBox(`seamZ${z}`, { width: 26.3, height: 0.006, depth: 0.025 }, scene);
    seam.position.set(0, 0.006, z);
    seam.material = darkWallMat;
  }

  createWall("backWall", 27, 4.7, 0.35, 0, 2.35, 9.35, darkWallMat);
  createWall("leftWall", 0.35, 4.7, 19, -13.35, 2.35, 0, wallMat);
  createWall("rightWall", 0.35, 4.7, 19, 13.35, 2.35, 0, wallMat);
  createWall("frontLipLeft", 9, 1.1, 0.35, -9, 0.55, -9.35, wallMat);
  createWall("frontLipRight", 9, 1.1, 0.35, 9, 0.55, -9.35, wallMat);

  const stripe = B.MeshBuilder.CreateBox("stripe", { width: 26.6, height: 0.35, depth: 0.04 }, scene);
  stripe.position.set(0, 3.2, 9.16);
  stripe.material = accentMat;
  createWallSign();

  const lightMat = material("lightPanel", "#f4f2df", 0.35);
  lightMat.emissiveColor = new B.Color3(0.65, 0.65, 0.53);
  for (const x of [-7, 0, 7]) {
    for (const z of [-4, 4]) {
      const panel = B.MeshBuilder.CreateBox("ceilingLight", { width: 3.6, height: 0.08, depth: 0.65 }, scene);
      panel.position.set(x, 4.45, z);
      panel.material = lightMat;
    }
  }

  function createWall(name, width, height, depth, x, y, z, mat) {
    const wall = B.MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    wall.position.set(x, y, z);
    wall.material = mat;
    wall.receiveShadows = true;
  }
}

function createWallSign() {
  const texture = new B.DynamicTexture("gymSignTexture", { width: 1024, height: 256 }, scene, false);
  texture.hasAlpha = true;
  texture.drawText("CLOSING CREW", null, 170, "bold 112px Arial", "#f7f6f1", "transparent", true);
  const signMat = new B.StandardMaterial("gymSignMat", scene);
  signMat.diffuseTexture = texture;
  signMat.emissiveColor = new B.Color3(0.25, 0.25, 0.25);
  signMat.backFaceCulling = false;
  const sign = B.MeshBuilder.CreatePlane("gymSign", { width: 5.6, height: 1.4 }, scene);
  sign.position.set(0, 2.25, 9.15);
  sign.rotation.y = Math.PI;
  sign.material = signMat;
}

function createZones() {
  zones = [];
  createDumbbellRack(new B.Vector3(-9.8, 0, 6.7));
  createLaundryZone(new B.Vector3(9.8, 0, 6.6));
  createBottleZone(new B.Vector3(10.1, 0, -5.8));
  createMatZone(new B.Vector3(-10.1, 0, -5.8));
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

function createPlayerCollider() {
  player = B.MeshBuilder.CreateCapsule("playerCollider", { radius: 0.48, height: 1.75 }, scene);
  player.position.set(0, 0.9, -6.7);
  player.isVisible = false;
  player.metadata = { radius: 0.5 };
}

function buildCharacter(characterId) {
  state.character = characterId;
  save.selectedCharacter = characterId;
  persistSave(save);
  if (playerVisual) playerVisual.dispose(false, true);
  playerVisual = new B.TransformNode(`character-${characterId}`, scene);
  playerVisual.parent = player;
  playerVisual.position.y = -0.84;
  playerParts = characterId === "squirrel" ? buildSquirrel() : buildRaccoon();
  createCarryAnchors();
  applyCosmetics();
  player.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
}

function createCarryAnchors() {
  carryAnchors = [];
  const center = new B.TransformNode("carryCenter", scene); center.parent = playerVisual; center.position.set(0, 1.04, -0.84);
  const left = new B.TransformNode("carryLeft", scene); left.parent = playerVisual; left.position.set(-0.27, 1.02, -0.8);
  const right = new B.TransformNode("carryRight", scene); right.parent = playerVisual; right.position.set(0.27, 1.02, -0.8);
  carryAnchors.push(center, left, right);
}

function buildRaccoon() {
  const fur = material("raccoonFur", "#777d83", 0.92);
  const dark = material("raccoonDark", "#272b31", 0.95);
  const light = material("raccoonLight", "#d7d4c9", 0.93);
  const body = capsule("body", 0.43, 1.12, [0, 0.85, 0], fur); body.scaling.z = 0.86;
  const belly = sphere("belly", 0.58, [0, 0.82, -0.34], light); belly.scaling.set(0.72, 1, 0.18);
  const head = sphere("head", 0.82, [0, 1.57, -0.06], fur); head.scaling.set(1, 0.92, 0.96);
  const muzzle = sphere("muzzle", 0.48, [0, 1.47, -0.38], light); muzzle.scaling.set(0.9, 0.65, 0.55);
  const mask = sphere("mask", 0.69, [0, 1.64, -0.31], dark); mask.scaling.set(1, 0.32, 0.22);
  const eyes = createEyes(1.65, -0.55, 0.16);
  const nose = sphere("nose", 0.16, [0, 1.5, -0.61], material("raccoonNose", "#111318", 0.6)); nose.scaling.set(1, 0.72, 0.75);
  for (const x of [-0.28, 0.28]) {
    const ear = B.MeshBuilder.CreateCylinder("ear", { diameterTop: 0.04, diameterBottom: 0.31, height: 0.38, tessellation: 16 }, scene);
    ear.parent = playerVisual; ear.position.set(x, 1.94, -0.01); ear.rotation.z = x < 0 ? -0.35 : 0.35; ear.material = dark;
  }
  const leftArm = limb("leftArm", -0.46, 1.05, fur, 0.105, 0.68);
  const rightArm = limb("rightArm", 0.46, 1.05, fur, 0.105, 0.68);
  const leftLeg = limb("leftLeg", -0.22, 0.28, dark, 0.13, 0.48, true);
  const rightLeg = limb("rightLeg", 0.22, 0.28, dark, 0.13, 0.48, true);
  const tailRoot = new B.TransformNode("tailRoot", scene); tailRoot.parent = playerVisual; tailRoot.position.set(0, 0.88, 0.35);
  for (let i = 0; i < 6; i++) {
    const segment = B.MeshBuilder.CreateCapsule(`tail${i}`, { radius: 0.19 - i * 0.012, height: 0.55 }, scene);
    segment.parent = tailRoot; segment.position.set(0.05 * Math.sin(i * 0.8), -i * 0.03, i * 0.38);
    segment.rotation.x = Math.PI / 2 + 0.12 * i; segment.material = i % 2 === 0 ? dark : fur;
  }
  return { body, head, eyes, leftArm, rightArm, leftLeg, rightLeg, tailRoot };
}

function buildSquirrel() {
  const fur = material("squirrelFur", "#b66f3d", 0.93);
  const dark = material("squirrelDark", "#6c3f28", 0.95);
  const light = material("squirrelLight", "#efcc9d", 0.93);
  const body = capsule("body", 0.4, 1.06, [0, 0.82, 0], fur); body.scaling.z = 0.84;
  const belly = sphere("belly", 0.56, [0, 0.82, -0.34], light); belly.scaling.set(0.72, 1, 0.18);
  const head = sphere("head", 0.78, [0, 1.55, -0.07], fur); head.scaling.set(0.95, 0.98, 0.92);
  const muzzle = sphere("muzzle", 0.42, [0, 1.45, -0.41], light); muzzle.scaling.set(0.85, 0.62, 0.55);
  const eyes = createEyes(1.64, -0.55, 0.17);
  const nose = sphere("nose", 0.13, [0, 1.46, -0.62], material("squirrelNose", "#201712", 0.6));
  for (const x of [-0.25, 0.25]) {
    const ear = B.MeshBuilder.CreateCylinder("squirrelEar", { diameterTop: 0.03, diameterBottom: 0.24, height: 0.48, tessellation: 16 }, scene);
    ear.parent = playerVisual; ear.position.set(x, 1.98, -0.02); ear.rotation.z = x < 0 ? -0.16 : 0.16; ear.material = dark;
  }
  const leftArm = limb("leftArm", -0.43, 1.04, fur, 0.095, 0.64);
  const rightArm = limb("rightArm", 0.43, 1.04, fur, 0.095, 0.64);
  const leftLeg = limb("leftLeg", -0.2, 0.28, dark, 0.12, 0.46, true);
  const rightLeg = limb("rightLeg", 0.2, 0.28, dark, 0.12, 0.46, true);
  const tailRoot = new B.TransformNode("tailRoot", scene); tailRoot.parent = playerVisual; tailRoot.position.set(0, 0.72, 0.34);
  for (let i = 0; i < 8; i++) {
    const puff = sphere(`squirrelTail${i}`, 0.62 - i * 0.025, [0, 0, 0], i % 2 ? dark : fur);
    puff.parent = tailRoot;
    puff.position.set(Math.sin(i * 0.42) * 0.16, 0.18 + i * 0.23, i * 0.25);
    puff.scaling.set(0.8, 1.1, 0.72);
  }
  return { body, head, eyes, leftArm, rightArm, leftLeg, rightLeg, tailRoot };
}

function capsule(name, radius, height, position, mat) {
  const mesh = B.MeshBuilder.CreateCapsule(name, { radius, height }, scene);
  mesh.parent = playerVisual; mesh.position.set(...position); mesh.material = mat; return mesh;
}
function sphere(name, diameter, position, mat) {
  const mesh = B.MeshBuilder.CreateSphere(name, { diameter, segments: 16 }, scene);
  mesh.parent = playerVisual; mesh.position.set(...position); mesh.material = mat; return mesh;
}
function limb(name, x, y, mat, radius, height, vertical = false) {
  const mesh = B.MeshBuilder.CreateCapsule(name, { radius, height }, scene);
  mesh.parent = playerVisual; mesh.position.set(x, y, -0.04); mesh.material = mat;
  if (!vertical) mesh.rotation.z = x < 0 ? -0.22 : 0.22;
  return mesh;
}
function createEyes(y, z, xOffset) {
  const whiteMat = material(`eyeWhite-${Math.random()}`, "#f7f6ec", 0.45);
  const irisMat = material(`iris-${Math.random()}`, "#17191d", 0.4);
  const eyes = [];
  for (const x of [-xOffset, xOffset]) {
    const white = sphere("eyeWhite", 0.17, [x, y, z], whiteMat); white.scaling.set(0.82, 1.08, 0.45);
    const pupil = sphere("pupil", 0.075, [x, y, z - 0.072], irisMat);
    eyes.push({ white, pupil });
  }
  return eyes;
}

function applyCosmetics() {
  const headColors = { "headband-lime": "#a7f46a", "headband-red": "#ef6161", "headband-blue": "#63b4ef" };
  const headId = save.equipped.head || "headband-lime";
  const headband = B.MeshBuilder.CreateTorus("cosmeticHeadband", { diameter: state.character === "squirrel" ? 0.66 : 0.71, thickness: 0.075, tessellation: 28 }, scene);
  headband.parent = playerVisual; headband.position.set(0, 1.72, -0.02); headband.rotation.x = Math.PI / 2; headband.scaling.y = 0.93;
  headband.material = material("headbandMat", headColors[headId] || headColors["headband-lime"], 0.7);

  if (save.equipped.face === "sunglasses") {
    const lensMat = material("sunglassLens", "#151b24", 0.3, 0.15);
    for (const x of [-0.17, 0.17]) {
      const lens = B.MeshBuilder.CreateBox("sunglassLens", { width: 0.27, height: 0.17, depth: 0.035 }, scene);
      lens.parent = playerVisual; lens.position.set(x, 1.65, -0.635); lens.material = lensMat;
    }
    const bridge = B.MeshBuilder.CreateBox("sunglassBridge", { width: 0.13, height: 0.035, depth: 0.035 }, scene);
    bridge.parent = playerVisual; bridge.position.set(0, 1.65, -0.635); bridge.material = lensMat;
  }
  if (save.equipped.wrist === "wristbands") {
    const wristMat = material("wristMat", "#f7f6f1", 0.8);
    for (const [x, arm] of [[-0.46, playerParts.leftArm], [0.46, playerParts.rightArm]]) {
      const wrist = B.MeshBuilder.CreateTorus("wristband", { diameter: 0.23, thickness: 0.055, tessellation: 18 }, scene);
      wrist.parent = arm; wrist.position.y = -0.22; wrist.rotation.x = Math.PI / 2; wrist.material = wristMat;
    }
  }
}

function createCamera() {
  camera = new B.ArcRotateCamera("camera", Math.PI / 2, 1.03, 7.2, player.position.add(new B.Vector3(0, 0.75, 0)), scene);
  camera.lowerRadiusLimit = 4.7; camera.upperRadiusLimit = 9.2; camera.lowerBetaLimit = 0.65; camera.upperBetaLimit = 1.32;
  camera.wheelDeltaPercentage = 0.01; camera.panningSensibility = 0; camera.pinchPrecision = 65;
  camera.inertia = 0.78;
  updateCameraSensitivity();
  camera.attachControl(ui.canvas, true);
}

function updateCameraSensitivity() {
  if (!camera) return;
  const sensitivity = save.settings.cameraSensitivity || 1;
  camera.angularSensibilityX = 1400 / sensitivity;
  camera.angularSensibilityY = 1400 / sensitivity;
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

function setActiveLevelDecor(levelId) {
  Object.entries(levelDecor).forEach(([id, root]) => root.setEnabled(id === levelId));
}

function buildSpecs(levelId, modeId) {
  if (state.tutorial) return [{ type: "towel", tutorial: true }];
  const level = LEVELS[levelId];
  const mode = MODES[modeId];
  const weighted = [];
  for (const [type, weight] of Object.entries(level.itemWeights)) {
    for (let i = 0; i < weight; i++) weighted.push(type);
  }
  const selected = [];
  const desired = mode.itemCount;
  const mandatory = ["towel", "bottle", "dumbbell", "mat"];
  mandatory.forEach((type) => selected.push(type));
  while (selected.length < desired) selected.push(weighted[Math.floor(Math.random() * weighted.length)]);
  return shuffle(selected).map((type) => ({ type }));
}

function spawnItems() {
  clearItemHighlight();
  deliveryObservers.forEach((observer) => scene.onBeforeRenderObservable.remove(observer));
  deliveryObservers = [];
  state.heldItems = [];
  items.forEach((item) => item.root.dispose(false, true));
  items = [];
  zones.forEach((zone) => { zone.deliveredCount = 0; });

  const specs = buildSpecs(state.level, state.mode);
  const spawnPool = state.tutorial ? [[-2.5, -1.2]] : shuffle(LEVELS[state.level].spawnPool);
  specs.forEach((spec, index) => {
    const type = spec.type;
    const definition = ITEM_TYPES[type];
    const [x, z] = spawnPool[index % spawnPool.length];
    const root = new B.TransformNode(`item-${index}`, scene);
    root.position.set(x, 0.12, z);
    root.metadata = { baseY: 0.12, spinSpeed: 0.45 + (index % 3) * 0.08 };
    const meshes = createItemMesh(type, root, index);
    meshes.forEach((mesh) => { mesh.isPickable = false; shadowGenerator.addShadowCaster(mesh); });
    items.push({
      id: `item-${index}`, type, label: definition.label, points: definition.points, targetZone: definition.targetZone,
      weight: definition.weight, root, meshes, delivered: false, displayed: false, tutorial: Boolean(spec.tutorial),
    });
  });
}

function createItemMesh(type, root, index) {
  if (type === "dumbbell") return createDumbbell(root, index);
  if (type === "towel") return createTowel(root, index);
  if (type === "bottle") return createBottle(root, index);
  return createMat(root, index);
}

function createDumbbell(root, index) {
  const metal = material(`dumbMetal${index}`, "#555c66", 0.35, 0.65);
  const plate = material(`dumbPlate${index}`, index % 2 ? "#a7f46a" : "#e16862", 0.82);
  const bar = B.MeshBuilder.CreateCylinder("bar", { diameter: 0.1, height: 0.88, tessellation: 14 }, scene);
  bar.parent = root; bar.rotation.z = Math.PI / 2; bar.position.y = 0.2; bar.material = metal;
  const meshes = [bar];
  for (const x of [-0.48, 0.48]) {
    for (const offset of [-0.08, 0.08]) {
      const weight = B.MeshBuilder.CreateCylinder("plate", { diameter: 0.46, height: 0.13, tessellation: 18 }, scene);
      weight.parent = root; weight.rotation.z = Math.PI / 2; weight.position.set(x + offset * Math.sign(x), 0.2, 0); weight.material = plate; meshes.push(weight);
    }
  }
  return meshes;
}

function createTowel(root, index) {
  const colors = ["#f1d66a", "#67b7dc", "#ef8f8a"];
  const cloth = B.MeshBuilder.CreateBox("towel", { width: 0.95, height: 0.07, depth: 0.56 }, scene);
  cloth.parent = root; cloth.position.y = 0.08; cloth.rotation.y = 0.25 * index; cloth.material = material(`towelMat${index}`, colors[index % colors.length], 1);
  return [cloth];
}

function createBottle(root, index) {
  const colors = ["#70c7c2", "#e9a767", "#9c83db"];
  const liquid = material(`bottleMat${index}`, colors[index % colors.length], 0.48); liquid.alpha = 0.88;
  const body = B.MeshBuilder.CreateCylinder("bottle", { diameter: 0.34, height: 0.92, tessellation: 18 }, scene);
  body.parent = root; body.position.y = 0.48; body.material = liquid;
  const cap = B.MeshBuilder.CreateCylinder("cap", { diameter: 0.22, height: 0.14, tessellation: 16 }, scene);
  cap.parent = root; cap.position.y = 1.01; cap.material = material(`capMat${index}`, "#272c35", 0.8);
  return [body, cap];
}

function createMat(root, index) {
  const colors = ["#aa74d4", "#6aabd8", "#d97f6c"];
  const matMesh = B.MeshBuilder.CreateCylinder("mat", { diameter: 0.55, height: 1.65, tessellation: 24 }, scene);
  matMesh.parent = root; matMesh.rotation.z = Math.PI / 2; matMesh.position.y = 0.28; matMesh.material = material(`floorMat${index}`, colors[index % colors.length], 0.92);
  return [matMesh];
}

function shuffle(values) {
  const result = values.map((value) => Array.isArray(value) ? [...value] : value);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function update() {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  if (!state.paused) state.elapsed += dt;
  updateCamera(dt);
  animateWorld(dt);
  if (!state.playing || state.paused || state.ended) return;
  updateNavigator();
  updateZoneGuidance();
  if (state.finishing) return;
  if (!state.tutorial && !updateTimer(dt)) return;
  updatePlayer(dt);
  updateInteraction();
  if (state.interactPressed) {
    state.interactPressed = false;
    interact();
  }
}

function updateCamera(dt) {
  if (!camera || !player) return;
  const desired = player.position.add(new B.Vector3(0, 0.78, 0));
  camera.target = B.Vector3.Lerp(camera.target, desired, 1 - Math.exp(-9 * dt));
}

function resetCamera(showFeedback = true) {
  if (!camera || !player) return;
  camera.alpha = player.rotation.y + Math.PI / 2;
  camera.beta = 1.03;
  camera.radius = 7.2;
  camera.target = player.position.add(new B.Vector3(0, 0.78, 0));
  if (showFeedback && state.playing && !state.paused) showToast("Kamera ausgerichtet", "");
}

function updateTimer(dt) {
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) {
    endRound(false);
    return false;
  }
  state.hudAccumulator += dt;
  if (state.hudAccumulator >= 0.1) {
    state.hudAccumulator = 0;
    updateHUD();
  }
  return true;
}

function currentCharacter() {
  return CHARACTERS[state.character] || CHARACTERS.raccoon;
}

function carryingHeavy() {
  return state.heldItems.some((item) => item.weight === "heavy" || item.weight === "bulky");
}

function updatePlayer(dt) {
  const forwardPressed = state.keys.has("KeyW") || state.keys.has("ArrowUp");
  const backPressed = state.keys.has("KeyS") || state.keys.has("ArrowDown");
  const leftPressed = state.keys.has("KeyA") || state.keys.has("ArrowLeft");
  const rightPressed = state.keys.has("KeyD") || state.keys.has("ArrowRight");
  let inputX = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0) + state.touch.x;
  let inputZ = (forwardPressed ? 1 : 0) - (backPressed ? 1 : 0) + state.touch.z;
  const inputLength = Math.hypot(inputX, inputZ);
  const isMoving = inputLength > 0.04;
  const wantsSprint = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") || state.touch.sprint;
  const sprinting = wantsSprint && !carryingHeavy();
  const character = currentCharacter();

  const cameraForward = new B.Vector3(-Math.cos(camera.alpha), 0, -Math.sin(camera.alpha));
  const cameraRight = new B.Vector3(-Math.sin(camera.alpha), 0, Math.cos(camera.alpha));

  let desiredVelocity = B.Vector3.Zero();
  let moveDirection = null;
  if (isMoving) {
    inputX /= Math.max(1, inputLength);
    inputZ /= Math.max(1, inputLength);
    moveDirection = cameraForward.scale(inputZ).add(cameraRight.scale(inputX));
    if (moveDirection.lengthSquared() > 0.001) moveDirection.normalize();
    let penalty = 1;
    if (state.heldItems.some((item) => item.weight === "heavy")) penalty = character.heavyPenalty;
    if (state.heldItems.some((item) => item.weight === "bulky")) penalty = character.bulkyPenalty;
    const speed = (sprinting ? character.sprintSpeed : character.walkSpeed) * penalty;
    desiredVelocity = moveDirection.scale(speed);
  }

  const blend = 1 - Math.exp(-(isMoving ? 12 : 16) * dt);
  state.velocity = B.Vector3.Lerp(state.velocity, desiredVelocity, blend);
  if (!isMoving && state.velocity.lengthSquared() < 0.002) state.velocity.set(0, 0, 0);
  if (state.velocity.lengthSquared() > 0.001) {
    const next = player.position.add(state.velocity.scale(dt));
    resolvePlayerPosition(next);
  }
  if (moveDirection) {
    player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(moveDirection.x, -moveDirection.z), Math.min(1, dt * 11));
  }

  animateCharacter(dt, isMoving || state.velocity.lengthSquared() > 0.08, sprinting);
  updateTrail(dt, sprinting && isMoving);
}

function resolvePlayerPosition(next) {
  const radius = player.metadata.radius;
  next.x = B.Scalar.Clamp(next.x, -CONFIG.roomHalfX + radius, CONFIG.roomHalfX - radius);
  next.z = B.Scalar.Clamp(next.z, -CONFIG.roomHalfZ + radius, CONFIG.roomHalfZ - radius);
  for (const obstacle of obstacles) {
    if (obstacle.level && obstacle.level !== state.level) continue;
    const closestX = B.Scalar.Clamp(next.x, obstacle.x - obstacle.halfX, obstacle.x + obstacle.halfX);
    const closestZ = B.Scalar.Clamp(next.z, obstacle.z - obstacle.halfZ, obstacle.z + obstacle.halfZ);
    const dx = next.x - closestX;
    const dz = next.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq > 0 && distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const push = radius - dist;
      next.x += (dx / dist) * push;
      next.z += (dz / dist) * push;
    } else if (distSq === 0) {
      const overlapX = obstacle.halfX + radius - Math.abs(next.x - obstacle.x);
      const overlapZ = obstacle.halfZ + radius - Math.abs(next.z - obstacle.z);
      if (overlapX < overlapZ) next.x += Math.sign(next.x - obstacle.x || 1) * overlapX;
      else next.z += Math.sign(next.z - obstacle.z || 1) * overlapZ;
    }
  }
  player.position.x = next.x;
  player.position.z = next.z;
}

function animateCharacter(dt, moving, sprinting) {
  const intensity = moving ? (sprinting ? 1.1 : 0.78) : 0.12;
  const frequency = moving ? (sprinting ? 13 : 9) : 2.2;
  const phase = state.elapsed * frequency;
  const armSwing = Math.sin(phase) * 0.55 * intensity;
  const legSwing = Math.sin(phase) * 0.5 * intensity;
  if (state.heldItems.length) {
    playerParts.leftArm.rotation.x = -1.05;
    playerParts.rightArm.rotation.x = -1.05;
    playerParts.leftArm.rotation.z = -0.35;
    playerParts.rightArm.rotation.z = 0.35;
  } else {
    playerParts.leftArm.rotation.x = armSwing;
    playerParts.rightArm.rotation.x = -armSwing;
    playerParts.leftArm.rotation.z = state.character === "squirrel" ? -0.17 : -0.22;
    playerParts.rightArm.rotation.z = state.character === "squirrel" ? 0.17 : 0.22;
  }
  playerParts.leftLeg.rotation.x = -legSwing;
  playerParts.rightLeg.rotation.x = legSwing;
  playerParts.tailRoot.rotation.y = Math.sin(state.elapsed * (state.character === "squirrel" ? 4 : 3.2)) * 0.28;
  playerParts.tailRoot.rotation.x = 0.13 + Math.sin(state.elapsed * 2.1) * 0.06;
  playerVisual.position.y = -0.84 + Math.abs(Math.sin(phase)) * 0.035 * intensity;
  updateReaction(dt);
}

function setReaction(type, duration = 0.7) {
  state.reaction = { type, time: duration, duration };
}

function updateReaction(dt) {
  if (!state.reaction.type) {
    playerVisual.rotation.z = B.Scalar.Lerp(playerVisual.rotation.z, 0, 0.22);
    playerVisual.rotation.y = B.Scalar.Lerp(playerVisual.rotation.y, 0, 0.22);
    playerVisual.scaling.copyFrom(B.Vector3.Lerp(playerVisual.scaling, B.Vector3.One(), 0.18));
    return;
  }
  state.reaction.time -= dt;
  const elapsed = state.reaction.duration - state.reaction.time;
  if (state.reaction.type === "wrong") playerVisual.rotation.z = Math.sin(elapsed * 26) * 0.14;
  if (state.reaction.type === "pickup") playerVisual.scaling.setAll(1 + Math.sin(Math.min(1, elapsed / state.reaction.duration) * Math.PI) * 0.07);
  if (state.reaction.type === "celebrate") {
    playerVisual.rotation.y = Math.sin(elapsed * 8) * 0.35;
    playerVisual.position.y = -0.84 + Math.abs(Math.sin(elapsed * 8)) * 0.14;
  }
  if (state.reaction.time <= 0) state.reaction = { type: null, time: 0, duration: 0 };
}

function updateTrail(dt, active) {
  if (save.equipped.trail !== "golden-trail" || !active || save.settings.quality === "low") return;
  trailAccumulator += dt;
  if (trailAccumulator < 0.08) return;
  trailAccumulator = 0;
  const spark = B.MeshBuilder.CreateSphere("trailSpark", { diameter: 0.09, segments: 5 }, scene);
  spark.position = player.position.add(new B.Vector3((Math.random() - 0.5) * 0.45, 0.22, (Math.random() - 0.5) * 0.45));
  const mat = new B.StandardMaterial("trailSparkMat", scene);
  mat.diffuseColor = new B.Color3(1, 0.72, 0.18); mat.emissiveColor = new B.Color3(0.7, 0.35, 0.04); spark.material = mat;
  const started = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - started) / 420;
    if (t >= 1) { scene.onBeforeRenderObservable.remove(observer); spark.dispose(); mat.dispose(); return; }
    spark.position.y += 0.007; spark.scaling.setAll(1 - t);
  });
}

function animateWorld(dt) {
  if (state.paused) return;
  for (const item of items) {
    if (item.delivered || state.heldItems.includes(item)) continue;
    item.root.rotation.y += item.root.metadata.spinSpeed * dt;
    item.root.position.y = item.root.metadata.baseY + Math.sin(state.elapsed * 2.3 + Number(item.id.split("-")[1])) * 0.025;
  }
  if (!state.playing && state.reaction.type) updateReaction(dt);
}

function canPickUp(item) {
  if (!item || item.delivered) return false;
  const character = currentCharacter();
  if (item.weight === "heavy" || item.weight === "bulky") return state.heldItems.length === 0;
  if (carryingHeavy()) return false;
  return state.heldItems.length < character.lightCapacity;
}

function updateInteraction() {
  const actionKey = isTouchDevice ? "Aktion" : "E";
  state.nearestItem = null;
  state.nearestZone = null;
  let closestItemDistance = Infinity;
  for (const item of items) {
    if (item.delivered || state.heldItems.includes(item)) continue;
    const distance = horizontalDistance(player.position, item.root.getAbsolutePosition());
    if (distance < closestItemDistance && distance <= CONFIG.interactDistance) {
      closestItemDistance = distance;
      state.nearestItem = item;
    }
  }

  if (state.heldItems.length) {
    let closestZoneDistance = Infinity;
    for (const zone of zones) {
      const distance = horizontalDistance(player.position, zone.position);
      if (distance < closestZoneDistance && distance <= CONFIG.deliveryDistance) {
        closestZoneDistance = distance; state.nearestZone = zone;
      }
    }
    const targetZones = uniqueTargetZones();
    const nearestTarget = targetZones.sort((a, b) => horizontalDistance(player.position, a.position) - horizontalDistance(player.position, b.position))[0];
    if (nearestTarget) {
      ui.objective.textContent = `${heldLabel()} → ${targetZones.map((zone) => zone.label).join(" / ")}`;
      ui.objective.classList.add("carrying");
    }
    if (state.nearestZone) {
      clearItemHighlight();
      const matching = state.heldItems.filter((item) => item.targetZone === state.nearestZone.id);
      setPrompt(`<kbd>${actionKey}</kbd>${matching.length ? `${matching.length} Gegenstand${matching.length > 1 ? "e" : ""} ablegen` : `Das ist ${state.nearestZone.label}`}`, matching.length > 0);
    } else if (state.nearestItem && canPickUp(state.nearestItem)) {
      highlightItem(state.nearestItem);
      setPrompt(`<kbd>${actionKey}</kbd>${state.nearestItem.label} zusätzlich aufnehmen`);
    } else {
      clearItemHighlight();
      setPrompt(`<kbd>${actionKey}</kbd>${state.heldItems.at(-1).label} sicher ablegen`);
    }
  } else {
    ui.objective.classList.remove("carrying");
    ui.objective.textContent = state.tutorial ? "Deine erste Aufgabe: Räume das Handtuch auf." : `Noch ${items.length - state.delivered} Gegenstände aufräumen.`;
    if (state.nearestItem) {
      highlightItem(state.nearestItem);
      setPrompt(`<kbd>${actionKey}</kbd>${state.nearestItem.label} aufnehmen`);
      if (state.tutorial && state.tutorialStage === 0) setTutorialStage(1);
    } else {
      clearItemHighlight(); hidePrompt();
    }
  }

  if (state.tutorial && state.tutorialStage === 2 && state.nearestZone?.id === "laundry") setTutorialStage(3);
}

function uniqueTargetZones() {
  const ids = [...new Set(state.heldItems.map((item) => item.targetZone))];
  return ids.map((id) => zones.find((zone) => zone.id === id)).filter(Boolean);
}

function heldLabel() {
  if (!state.heldItems.length) return "Nichts";
  if (state.heldItems.length === 1) return state.heldItems[0].label;
  return state.heldItems.map((item) => ITEM_TYPES[item.type].icon).join(" ") + ` ${state.heldItems.length} Gegenstände`;
}

function updateNavigator() {
  if (!state.playing || state.ended) { ui.navigator.classList.add("hidden"); return; }
  if (!state.tutorial && MODES[state.mode].navigator === "carrying" && !state.heldItems.length) {
    ui.navigator.classList.add("hidden"); return;
  }
  let targetPosition = null;
  let targetLabel = "";
  if (state.heldItems.length) {
    const targets = uniqueTargetZones().sort((a, b) => horizontalDistance(player.position, a.position) - horizontalDistance(player.position, b.position));
    const target = targets[0];
    if (target) { targetPosition = target.position; targetLabel = `${ITEM_TYPES[target.type].icon} ${target.label}`; }
  } else {
    let closest = null; let closestDistance = Infinity;
    for (const item of items) {
      if (item.delivered) continue;
      const distance = horizontalDistance(player.position, item.root.getAbsolutePosition());
      if (distance < closestDistance) { closestDistance = distance; closest = item; }
    }
    if (closest) { targetPosition = closest.root.getAbsolutePosition(); targetLabel = `${ITEM_TYPES[closest.type].icon} ${closest.label}`; }
  }
  if (!targetPosition) { ui.navigator.classList.add("hidden"); return; }
  const toTarget = targetPosition.subtract(player.position); toTarget.y = 0;
  const distance = toTarget.length(); if (distance > 0.001) toTarget.normalize();
  const relativeAngle = normalizeAngle(Math.atan2(toTarget.x, -toTarget.z) - (camera.alpha - Math.PI / 2));
  ui.navArrow.style.transform = `rotate(${relativeAngle}rad)`;
  ui.navTarget.textContent = targetLabel;
  ui.navDistance.textContent = `${Math.max(0, Math.round(distance))} m entfernt`;
  ui.navigator.classList.remove("hidden");
}

function updateZoneGuidance() {
  for (const zone of zones) {
    const correct = state.heldItems.some((item) => item.targetZone === zone.id);
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 5.2);
    const targetScale = correct ? 1.04 + pulse * 0.12 : 1;
    const targetAlpha = state.heldItems.length ? (correct ? 0.34 + pulse * 0.24 : 0.075) : 0.22;
    zone.marker.scaling.setAll(B.Scalar.Lerp(zone.marker.scaling.x, targetScale, 0.18));
    zone.marker.material.alpha = B.Scalar.Lerp(zone.marker.material.alpha, targetAlpha, 0.18);
    zone.beacon.setEnabled(correct);
    if (correct) { zone.beacon.position.y = 2.45 + Math.sin(state.elapsed * 4.2) * 0.18; zone.beacon.rotation.y = state.elapsed * 2.4; }
  }
}

function resetZoneGuidance() {
  zones.forEach((zone) => { zone.marker.scaling.setAll(1); zone.marker.material.alpha = 0.22; zone.beacon.setEnabled(false); });
}

function highlightItem(item) {
  if (!highlightLayer || highlightedItem === item) return;
  clearItemHighlight(); highlightedItem = item;
  item.meshes.forEach((mesh) => highlightLayer.addMesh(mesh, new B.Color3(0.67, 0.96, 0.42)));
}
function clearItemHighlight() {
  if (!highlightLayer || !highlightedItem) return;
  highlightedItem.meshes.forEach((mesh) => highlightLayer.removeMesh(mesh)); highlightedItem = null;
}

function interact() {
  if (state.nearestZone && state.heldItems.length) { deliverAtZone(state.nearestZone); return; }
  if (state.nearestItem && canPickUp(state.nearestItem)) { pickUp(state.nearestItem); return; }
  if (state.heldItems.length) dropLastItem();
}

function pickUp(item) {
  if (!canPickUp(item)) {
    showToast(item.weight === "light" ? "Deine Pfoten sind voll" : "Dafür brauchst du beide Pfoten", "bad");
    return;
  }
  clearItemHighlight();
  state.heldItems.push(item);
  reflowHeldItems(true);
  audio.play("pickup"); vibrate(18); setReaction("pickup", 0.35);
  showToast(`${item.label} aufgenommen`, "good");
  characterSays(state.heldItems.length === 2 ? "Zwei auf einmal – effizient!" : pickupQuip());
  if (state.tutorial) setTutorialStage(2);
  updateHUD();
}

function pickupQuip() {
  const quips = state.character === "squirrel"
    ? ["Flinke Pfoten!", "Weiter geht’s!", "Das war leicht."]
    : ["Rocco regelt das.", "Alles an seinen Platz!", "Sauber eingesammelt."];
  return quips[Math.floor(Math.random() * quips.length)];
}

function reflowHeldItems(animate = false) {
  state.heldItems.forEach((item, index) => {
    const anchor = state.heldItems.length === 1 ? carryAnchors[0] : carryAnchors[index + 1];
    const absoluteStart = item.root.getAbsolutePosition().clone();
    item.root.parent = anchor;
    const targetPosition = B.Vector3.Zero();
    const targetScaleValue = item.type === "mat" ? 0.68 : item.type === "dumbbell" ? 0.76 : 0.78;
    if (!animate) {
      item.root.position.copyFrom(targetPosition); item.root.rotation.set(0, 0, item.type === "mat" ? 0.2 : 0); item.root.scaling.setAll(targetScaleValue); return;
    }
    item.root.parent = null; item.root.position.copyFrom(absoluteStart);
    const started = performance.now();
    const observer = scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - started) / 230);
      const eased = 1 - Math.pow(1 - t, 3);
      const targetAbsolute = anchor.getAbsolutePosition();
      const position = B.Vector3.Lerp(absoluteStart, targetAbsolute, eased); position.y += Math.sin(Math.PI * t) * 0.35;
      item.root.position.copyFrom(position); item.root.scaling.setAll(B.Scalar.Lerp(1, targetScaleValue, eased));
      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        item.root.parent = anchor; item.root.position.set(0, 0, 0); item.root.rotation.set(0, 0, item.type === "mat" ? 0.2 : 0); item.root.scaling.setAll(targetScaleValue);
      }
    });
  });
}

function dropLastItem() {
  const item = state.heldItems.pop();
  if (!item) return;
  const absolute = item.root.getAbsolutePosition().clone();
  item.root.parent = null; item.root.position.copyFrom(absolute);
  const safe = findSafeDropPosition();
  item.root.position.copyFrom(safe); item.root.scaling.setAll(1); item.root.rotation.set(0, 0, 0);
  state.droppedItems += 1;
  reflowHeldItems(false);
  audio.play("drop"); vibrate(12); showToast(`${item.label} sicher abgelegt`, ""); updateHUD();
}

function findSafeDropPosition() {
  const baseAngle = player.rotation.y;
  for (let ring = 0; ring < 3; ring++) {
    const distance = 1.25 + ring * 0.45;
    for (const offset of [0, 0.65, -0.65, 1.3, -1.3, Math.PI]) {
      const angle = baseAngle + offset;
      const candidate = new B.Vector3(player.position.x + Math.sin(angle) * distance, 0.12, player.position.z - Math.cos(angle) * distance);
      if (isDropPositionFree(candidate)) return candidate;
    }
  }
  return new B.Vector3(player.position.x, 0.12, player.position.z);
}

function isDropPositionFree(position) {
  if (Math.abs(position.x) > CONFIG.roomHalfX - 0.7 || Math.abs(position.z) > CONFIG.roomHalfZ - 0.7) return false;
  for (const obstacle of obstacles) {
    if (obstacle.level && obstacle.level !== state.level) continue;
    if (Math.abs(position.x - obstacle.x) < obstacle.halfX + 0.45 && Math.abs(position.z - obstacle.z) < obstacle.halfZ + 0.45) return false;
  }
  return items.every((item) => item.delivered || state.heldItems.includes(item) || horizontalDistance(position, item.root.getAbsolutePosition()) > 0.75);
}

function deliverAtZone(zone) {
  const matching = state.heldItems.filter((item) => item.targetZone === zone.id);
  if (!matching.length) {
    state.combo = 0; state.wrongPlacements += 1; audio.play("wrong"); vibrate([30, 30, 30]); setReaction("wrong", 0.7);
    characterSays("Das gehört woanders hin …"); showToast(`Falscher Platz – hierhin gehören ${ITEM_TYPES[zone.type].plural}`, "bad"); updateHUD(); return;
  }

  const mode = MODES[state.mode];
  let batchScore = 0;
  let pending = matching.length;
  for (const item of matching) {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const strengthBonus = item.weight === "heavy" ? currentCharacter().heavyScoreBonus : 1;
    const gained = Math.round(item.points * comboMultiplier() * mode.scoreMultiplier * strengthBonus);
    const milestone = { 3: 75, 5: 150, 8: 300, 10: 400 }[state.combo] || 0;
    batchScore += gained + milestone;
    state.score += gained + milestone;
    state.delivered += 1;
    if (item.type === "dumbbell") state.deliveredDumbbells += 1;
    item.delivered = true;
    state.heldItems = state.heldItems.filter((entry) => entry !== item);
    showScorePop(`+${gained}`, false);
    if (milestone) showScorePop(`Streak +${milestone}`, true);
    animateDeliveredItem(item, zone, () => {
      pending -= 1;
      if (pending === 0) onDeliveryAnimationFinished();
    });
  }
  reflowHeldItems(false);
  audio.play("deliver"); vibrate([18, 25, 28]); setReaction("pickup", 0.28);
  showDeliveryBurst(zone.position, zone.marker.material.albedoColor);
  showToast(`${matching.length > 1 ? `${matching.length} Dinge` : matching[0].label} aufgeräumt · +${batchScore}`, "good");
  characterSays(state.combo >= 5 ? "Die Combo läuft!" : "Sieht schon besser aus!");
  updateHUD();
}

function onDeliveryAnimationFinished() {
  if (state.tutorial && state.delivered === items.length) { finishTutorial(); return; }
  if (state.delivered === items.length) endRound(true);
}

function animateDeliveredItem(item, zone, onComplete) {
  const startPosition = item.root.getAbsolutePosition().clone();
  const startScale = item.root.scaling.clone();
  item.root.parent = null; item.root.position.copyFrom(startPosition);
  const placement = getDisplayPlacement(zone, item, zone.deliveredCount++);
  const started = performance.now(); let last = started;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now(); const t = Math.min(1, (now - started) / 500); const eased = 1 - Math.pow(1 - t, 3);
    const position = B.Vector3.Lerp(startPosition, placement.position, eased); position.y += Math.sin(Math.PI * t) * 0.85;
    item.root.position.copyFrom(position); item.root.rotation.y += (now - last) * 0.01; last = now;
    item.root.scaling.copyFrom(B.Vector3.Lerp(startScale, new B.Vector3(placement.scale, placement.scale, placement.scale), eased));
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer); deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
      item.root.position.copyFrom(placement.position); item.root.rotation.copyFrom(placement.rotation); item.root.scaling.setAll(placement.scale); item.displayed = true; onComplete?.();
    }
  });
  deliveryObservers.push(observer);
}

function getDisplayPlacement(zone, item, index) {
  const p = zone.position.clone();
  const rotation = B.Vector3.Zero();
  let scale = 0.72;
  if (zone.id === "rack") {
    const level = index % 3; const side = Math.floor(index / 3) % 2;
    p.set(zone.position.x + (side ? 0.55 : -0.55), 0.48 + level * 0.6, zone.position.z - 0.22); scale = 0.67;
  } else if (zone.id === "laundry") {
    p.set(zone.position.x + ((index % 2) - 0.5) * 0.32, 1.38 + Math.floor(index / 2) * 0.09, zone.position.z + ((index % 3) - 1) * 0.16);
    rotation.y = index * 0.5; scale = 0.62;
  } else if (zone.id === "bottles") {
    p.set(zone.position.x + ((index % 3) - 1) * 0.38, 1.22, zone.position.z + (Math.floor(index / 3) - 0.5) * 0.32); scale = 0.62;
  } else if (zone.id === "mats") {
    p.set(zone.position.x + ((index % 4) - 1.5) * 0.42, 0.82, zone.position.z - 0.05); rotation.z = Math.PI / 2; scale = 0.72;
  }
  return { position: p, rotation, scale };
}

function showDeliveryBurst(position, color) {
  const count = save.settings.quality === "low" ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const particle = B.MeshBuilder.CreateSphere("rewardParticle", { diameter: 0.1, segments: 6 }, scene);
    const origin = position.add(new B.Vector3(0, 0.7, 0)); particle.position.copyFrom(origin);
    const mat = new B.StandardMaterial("rewardParticleMat", scene); mat.diffuseColor = color; mat.emissiveColor = color.scale(0.5); particle.material = mat;
    const velocity = new B.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.5, Math.random() - 0.5).normalize().scale(2.2 + Math.random() * 1.2);
    const started = performance.now();
    const observer = scene.onBeforeRenderObservable.add(() => {
      const t = (performance.now() - started) / 650;
      if (t >= 1) { scene.onBeforeRenderObservable.remove(observer); particle.dispose(); mat.dispose(); return; }
      particle.position.copyFrom(origin.add(velocity.scale(t)).add(new B.Vector3(0, -1.9 * t * t, 0))); particle.scaling.setAll(Math.max(0.01, 1 - t));
    });
  }
}

function comboMultiplier() {
  return Math.min(2.2, 1 + Math.max(0, state.combo - 1) * 0.15);
}

function startRound() {
  closeAllModals();
  if (!save.tutorialCompleted) startTutorial();
  else beginGameplayRound();
}

function resetRoundState() {
  state.playing = true; state.paused = false; state.ended = false; state.finishing = false;
  state.score = 0; state.combo = 0; state.delivered = 0; state.wrongPlacements = 0; state.droppedItems = 0;
  state.maxCombo = 0; state.deliveredDumbbells = 0; state.heldItems = []; state.nearestItem = null; state.nearestZone = null;
  state.hudAccumulator = 0; state.interactPressed = false; state.keys.clear(); state.velocity.set(0, 0, 0);
  resetTouchInput(); resetZoneGuidance(); clearItemHighlight();
  zones.forEach((zone) => { zone.deliveredCount = 0; });
}

function prepareSceneForRound() {
  buildCharacter(state.character);
  const activeLevel = state.tutorial ? "closing" : state.level;
  setActiveLevelDecor(activeLevel);
  const [startX, startZ] = LEVELS[activeLevel].start;
  player.position.set(startX, 0.9, startZ); player.rotation.y = 0; resetCamera(false);
  spawnItems();
  ui.startScreen.classList.add("hidden"); ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.add("hidden");
  ui.hud.classList.remove("hidden"); ui.objective.classList.remove("hidden"); ui.progressTrack.classList.remove("hidden");
  ui.mobileControls.classList.toggle("hidden", !isTouchDevice); ui.coins.textContent = String(save.coins);
  document.body.classList.add("playing"); updateOrientationHint(); updateHUD(); ui.canvas.focus();
}

function startTutorial() {
  state.tutorial = true; state.tutorialStage = 0; state.tutorialResumeMode = state.mode;
  resetRoundState(); state.roundSeconds = Infinity; state.timeLeft = Infinity;
  prepareSceneForRound();
  ui.navigator.classList.remove("hidden"); ui.tutorialCoach.classList.remove("hidden");
  setTutorialStage(0); audio.play("start"); audio.startMusic(); characterSays(`${currentCharacter().name}: Erste Schicht? Das schaffen wir.`);
}

function beginGameplayRound() {
  state.tutorial = false; state.tutorialStage = 0;
  resetRoundState();
  const mode = MODES[state.mode]; state.roundSeconds = mode.seconds; state.timeLeft = mode.seconds;
  prepareSceneForRound();
  ui.tutorialCoach.classList.add("hidden");
  ui.objective.textContent = `${LEVELS[state.level].label} · ${mode.label}: ${items.length} Gegenstände warten.`;
  audio.play("start"); audio.startMusic();
  characterSays(state.character === "squirrel" ? "Fibi ist bereit – schnell und clever!" : "Rocco übernimmt die schwere Schicht!");
}

function setTutorialStage(stage) {
  state.tutorialStage = Math.max(state.tutorialStage, stage);
  const steps = [
    ["Deine erste Schicht", "Laufe zum leuchtenden Handtuch."],
    ["Ganz nah dran", `Drücke ${isTouchDevice ? "Aktion" : "E"}, um das Handtuch aufzunehmen.`],
    ["Ab zum Wäschekorb", "Folge dem grünen Kompass zum Wäschekorb."],
    ["Fast geschafft", `Drücke ${isTouchDevice ? "Aktion" : "E"}, um das Handtuch abzulegen.`],
  ];
  const [title, text] = steps[Math.min(stage, steps.length - 1)];
  ui.tutorialTitle.textContent = title; ui.tutorialText.textContent = text; ui.tutorialCoach.classList.remove("hidden");
}

function finishTutorial() {
  if (state.finishing) return;
  state.finishing = true; save.tutorialCompleted = true; persistSave(save);
  audio.play("tutorial"); vibrate([20, 30, 40]); setReaction("celebrate", 1.2);
  ui.tutorialTitle.textContent = "Tutorial geschafft";
  ui.tutorialText.textContent = "Perfekt. Jetzt beginnt deine erste richtige Schicht!";
  characterSays("Perfekt! Jetzt räumen wir den Rest auf.");
  setTimeout(() => beginGameplayRound(), 1450);
}

function endRound(completed) {
  if (state.ended) return;
  state.ended = true; state.playing = false; state.paused = false; state.finishing = false; state.velocity.set(0, 0, 0);
  resetTouchInput(); resetZoneGuidance(); clearItemHighlight(); hidePrompt(); audio.stopMusic();
  const mode = MODES[state.mode];
  const completionBonus = completed ? Math.round((state.timeLeft * 4 + 250) * mode.scoreMultiplier) : 0;
  state.score += completionBonus;
  const earned = state.score > 0 ? Math.max(1, Math.floor(state.score / 115)) : 0;
  const elapsed = Math.max(0, state.roundSeconds - state.timeLeft);
  const rank = calculateRank(completed);
  const modeStats = save.modeStats[state.mode];
  modeStats.highScore = Math.max(modeStats.highScore || 0, state.score);
  modeStats.rounds = (modeStats.rounds || 0) + 1;
  if (completed && (!modeStats.bestTime || elapsed < modeStats.bestTime)) modeStats.bestTime = elapsed;
  if (!modeStats.bestRank || rankValue(rank.grade) > rankValue(modeStats.bestRank)) modeStats.bestRank = rank.grade;

  save.coins += earned;
  save.stats.totalRounds += 1;
  save.stats.totalDelivered += state.delivered;
  save.stats.totalDumbbells += state.deliveredDumbbells;
  save.stats.maxCombo = Math.max(save.stats.maxCombo, state.maxCombo);
  save.stats.totalCoinsEarned += earned;
  if (completed && state.wrongPlacements === 0 && state.maxCombo >= items.length) save.stats.perfectRounds += 1;
  save.lastMode = state.mode; save.lastLevel = state.level; save.selectedCharacter = state.character;
  const unlocked = evaluateAchievements(save, {
    completed, droppedItems: state.droppedItems, maxCombo: state.maxCombo, totalItems: items.length,
    wrongPlacements: state.wrongPlacements, mode: state.mode, elapsed,
  });
  persistSave(save);

  ui.hud.classList.add("hidden"); ui.objective.classList.add("hidden"); ui.progressTrack.classList.add("hidden");
  ui.navigator.classList.add("hidden"); ui.mobileControls.classList.add("hidden"); ui.tutorialCoach.classList.add("hidden");
  ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.remove("hidden"); document.body.classList.remove("playing");
  ui.resultBadge.textContent = completed ? "GESCHAFFT" : "ZEIT VORBEI"; ui.resultBadge.classList.toggle("timeout", !completed);
  ui.resultTitle.textContent = completed ? `${currentCharacter().name} hat das Gym gerettet!` : "Fast geschafft!";
  ui.resultText.textContent = completed
    ? `${LEVELS[state.level].label} im Modus ${mode.label} in ${formatTime(elapsed)}. Zeitbonus: ${completionBonus} Punkte, falsche Ablagen: ${state.wrongPlacements}.`
    : `${state.delivered} von ${items.length} Gegenständen wurden aufgeräumt. Deine sichtbaren Ablagen zeigen, wie weit du gekommen bist.`;
  ui.resultRank.textContent = rank.grade; ui.resultRankDetail.textContent = rank.detail;
  ui.resultRankBox.className = `result-rank rank-${rank.grade.toLowerCase()}`;
  ui.finalScore.textContent = String(state.score); ui.earnedCoins.textContent = `+${earned}`;
  ui.highScore.textContent = String(modeStats.highScore); ui.bestTime.textContent = modeStats.bestTime ? formatTime(modeStats.bestTime) : "–";
  renderNewAchievements(unlocked); updateCoinDisplays(); renderMenu();
  if (unlocked.length) showAchievementSequence(unlocked);
  setReaction("celebrate", completed ? 2.5 : 0.8);
  audio.play(completed ? "success" : "timeout");
}

function calculateRank(completed) {
  if (!completed) {
    const ratio = state.delivered / Math.max(1, items.length);
    if (ratio >= 0.85) return { grade: "C", detail: "Haarscharf vorbei" };
    return { grade: "D", detail: ratio >= 0.5 ? "Solider Anfang" : "Noch einmal ran" };
  }
  const timeRatio = state.timeLeft / state.roundSeconds;
  if (state.wrongPlacements === 0 && state.maxCombo >= items.length && timeRatio >= 0.25) return { grade: "S", detail: "Perfekte Aufräumserie" };
  if (state.wrongPlacements === 0 && timeRatio >= 0.12) return { grade: "A", detail: "Sauber und schnell" };
  if (state.wrongPlacements <= 1) return { grade: "B", detail: "Starke Runde" };
  return { grade: "C", detail: "Gym gerettet" };
}

function rankValue(rank) { return ({ D: 1, C: 2, B: 3, A: 4, S: 5 })[rank] || 0; }

function returnToMenu() {
  state.playing = false; state.paused = false; state.ended = true; state.finishing = false; state.tutorial = false;
  state.keys.clear(); state.velocity.set(0, 0, 0); audio.stopMusic(); resetTouchInput(); clearItemHighlight(); hidePrompt();
  ui.hud.classList.add("hidden"); ui.objective.classList.add("hidden"); ui.progressTrack.classList.add("hidden"); ui.navigator.classList.add("hidden");
  ui.mobileControls.classList.add("hidden"); ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.add("hidden"); ui.tutorialCoach.classList.add("hidden");
  ui.startScreen.classList.remove("hidden"); document.body.classList.remove("playing"); renderMenu();
}

function setPaused(paused) {
  if (!state.playing || state.ended || state.finishing || state.paused === paused) return;
  state.paused = paused; state.keys.clear(); state.velocity.set(0, 0, 0); state.interactPressed = false; resetTouchInput();
  ui.pauseScreen.classList.toggle("hidden", !paused); ui.mobileControls.classList.toggle("hidden", paused || !isTouchDevice);
  if (paused) { hidePrompt(); audio.stopMusic(); audio.play("pause"); }
  else { audio.startMusic(); ui.canvas.focus(); }
}

function updateHUD() {
  ui.score.textContent = String(state.score);
  ui.progress.textContent = `${state.delivered}/${items.length}`;
  ui.progressBar.style.width = `${items.length ? (state.delivered / items.length) * 100 : 0}%`;
  ui.combo.textContent = `×${comboMultiplier().toFixed(1).replace(".", ",")}`;
  ui.combo.classList.toggle("hot", state.combo >= 3);
  ui.timer.textContent = state.tutorial ? "∞" : formatTime(state.timeLeft);
  ui.timer.style.color = !state.tutorial && state.timeLeft <= 20 ? "#ff7c74" : "";
  ui.carrying.textContent = heldLabel(); ui.carryCard.classList.toggle("active", state.heldItems.length > 0);
  ui.coins.textContent = String(save.coins);
}

function renderMenu() {
  updateCoinDisplays(); renderCharacterSelector(); renderLevelSelector(); renderModeSelector(); renderShop(); renderAchievements(); renderStats(); renderSettings();
}

function renderCharacterSelector() {
  ui.characterSelector.innerHTML = "";
  for (const character of Object.values(CHARACTERS)) {
    const unlocked = owns(save, character.id);
    const card = document.createElement("button");
    card.className = `character-card${state.character === character.id ? " active" : ""}${unlocked ? "" : " locked"}`;
    card.innerHTML = `<span class="character-avatar">${character.id === "raccoon" ? "🦝" : "🐿️"}</span><span class="character-copy"><strong>${character.name} · ${character.species}</strong><small>${character.description}</small></span><span class="character-badge">${unlocked ? (state.character === character.id ? "Aktiv" : "Wählen") : "🔒 Shop"}</span>`;
    card.addEventListener("click", () => {
      if (!unlocked) { showModal(ui.shopScreen); return; }
      state.character = character.id; save.selectedCharacter = character.id; persistSave(save); buildCharacter(character.id); renderMenu();
    });
    ui.characterSelector.appendChild(card);
  }
}

function renderLevelSelector() {
  ui.levelSelector.innerHTML = "";
  for (const [id, level] of Object.entries(LEVELS)) {
    const button = document.createElement("button"); button.className = `selector-tile${state.level === id ? " active" : ""}`;
    button.innerHTML = `<strong>${level.label}</strong><small>${level.subtitle}</small>`;
    button.addEventListener("click", () => { state.level = id; save.lastLevel = id; persistSave(save); setActiveLevelDecor(id); renderLevelSelector(); });
    ui.levelSelector.appendChild(button);
  }
}

function renderModeSelector() {
  ui.modeSelector.innerHTML = "";
  for (const [id, mode] of Object.entries(MODES)) {
    const button = document.createElement("button"); button.className = `selector-tile${state.mode === id ? " active" : ""}`;
    button.innerHTML = `<strong>${mode.label} · ${formatTime(mode.seconds)}</strong><small>${mode.description}</small>`;
    button.addEventListener("click", () => { state.mode = id; save.lastMode = id; persistSave(save); renderModeSelector(); });
    ui.modeSelector.appendChild(button);
  }
}

function renderShop() {
  ui.shopGrid.innerHTML = ""; ui.shopCoins.textContent = String(save.coins);
  for (const item of SHOP_ITEMS) {
    const owned = owns(save, item.id);
    const equipped = item.slot === "character" ? save.selectedCharacter === item.id : save.equipped[item.slot] === item.id;
    const card = document.createElement("article"); card.className = `store-card${equipped ? " equipped" : ""}`;
    const buttonLabel = !owned ? `${item.cost} Münzen` : equipped ? (item.slot === "head" || item.slot === "character" ? "Ausgewählt" : "Ablegen") : "Ausrüsten";
    card.innerHTML = `<span class="store-icon">${item.preview}</span><h3>${item.name}</h3><p>${item.description}</p><span class="price">${owned ? "Im Besitz" : `🪙 ${item.cost}`}</span><button type="button" ${equipped && (item.slot === "head" || item.slot === "character") ? "disabled" : ""}>${buttonLabel}</button>`;
    card.querySelector("button").addEventListener("click", () => {
      const result = buyOrEquip(save, item);
      if (!result.ok) { showToast("Dafür fehlen dir noch Münzen", "bad"); audio.play("wrong"); return; }
      if (item.slot === "character") state.character = item.id;
      if (item.slot === "character" || ["head", "wrist", "face"].includes(item.slot)) buildCharacter(state.character);
      const unlocked = evaluateAchievements(save);
      audio.play("purchase"); vibrate(28); showToast(owned ? `${item.name} angepasst` : `${item.name} freigeschaltet!`, "good");
      updateCoinDisplays(); renderMenu(); if (unlocked.length) showAchievementSequence(unlocked);
    });
    ui.shopGrid.appendChild(card);
  }
}

function renderAchievements() {
  ui.achievementGrid.innerHTML = "";
  for (const achievement of ACHIEVEMENTS) {
    const unlocked = Boolean(save.achievements[achievement.id]);
    const card = document.createElement("article"); card.className = `achievement-card ${unlocked ? "unlocked" : "locked"}`;
    card.innerHTML = `<span class="achievement-icon">${unlocked ? achievement.icon : "❔"}</span><h3>${achievement.name}</h3><p>${achievement.description}</p><span class="achievement-status">${unlocked ? "Freigeschaltet" : "Noch offen"}</span>`;
    ui.achievementGrid.appendChild(card);
  }
}

function renderStats() {
  const stats = save.stats;
  ui.careerStats.innerHTML = [
    ["Runden", stats.totalRounds], ["Aufgeräumt", stats.totalDelivered], ["Hanteln", stats.totalDumbbells],
    ["Beste Combo", stats.maxCombo], ["Perfekte Runden", stats.perfectRounds], ["Münzen verdient", stats.totalCoinsEarned],
    ["Shop-Artikel", save.owned.length - 1], ["Achievements", Object.keys(save.achievements).length],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  ui.modeStats.innerHTML = Object.entries(MODES).map(([id, mode]) => {
    const entry = save.modeStats[id];
    return `<div class="mode-stat-row"><strong>${mode.label}</strong><div><span>Highscore</span><strong>${entry.highScore || 0}</strong></div><div><span>Bestzeit</span><strong>${entry.bestTime ? formatTime(entry.bestTime) : "–"}</strong></div><div><span>Rang</span><strong>${entry.bestRank || "–"}</strong></div><div><span>Runden</span><strong>${entry.rounds || 0}</strong></div></div>`;
  }).join("");
}

function renderSettings() {
  ui.cameraSensitivity.value = save.settings.cameraSensitivity;
  ui.joystickScale.value = save.settings.joystickScale;
  ui.qualitySetting.value = save.settings.quality;
  ui.vibrationSetting.checked = save.settings.vibration;
  applyJoystickScale();
}

function renderNewAchievements(unlocked) {
  if (!unlocked.length) { ui.newAchievements.classList.add("hidden"); ui.newAchievements.innerHTML = ""; return; }
  ui.newAchievements.innerHTML = `<strong>Neu freigeschaltet</strong>${unlocked.map((entry) => `<span>${entry.icon} ${entry.name}</span>`).join("")}`;
  ui.newAchievements.classList.remove("hidden");
}

function showAchievementSequence(unlocked) {
  const queue = [...unlocked];
  const next = () => {
    const achievement = queue.shift();
    if (!achievement) return;
    ui.achievementIcon.textContent = achievement.icon; ui.achievementName.textContent = achievement.name; ui.achievementToast.classList.remove("hidden");
    audio.play("achievement");
    clearTimeout(state.achievementTimer);
    state.achievementTimer = setTimeout(() => { ui.achievementToast.classList.add("hidden"); if (queue.length) setTimeout(next, 250); }, 2100);
  };
  next();
}

function updateCoinDisplays() {
  ui.coins.textContent = String(save.coins); ui.menuCoins.textContent = String(save.coins); ui.shopCoins.textContent = String(save.coins);
}

function showModal(screen) { screen.classList.remove("hidden"); }
function closeAllModals() { document.querySelectorAll(".modal-screen").forEach((screen) => screen.classList.add("hidden")); }
function activeModal() { return Array.from(document.querySelectorAll(".modal-screen")).find((screen) => !screen.classList.contains("hidden")); }

function characterSays(message) {
  clearTimeout(state.speechTimer); ui.speechBubble.textContent = message; ui.speechBubble.classList.remove("hidden");
  state.speechTimer = setTimeout(() => ui.speechBubble.classList.add("hidden"), 1800);
}

function showToast(message, type = "") {
  clearTimeout(state.toastTimer); ui.toast.textContent = message; ui.toast.className = `toast ${type}`;
  state.toastTimer = setTimeout(() => ui.toast.classList.add("hidden"), 1600);
}

function showScorePop(text, bonus) {
  const element = document.createElement("div"); element.className = `score-pop${bonus ? " bonus" : ""}`; element.textContent = text;
  element.style.marginLeft = `${(Math.random() - 0.5) * 90}px`; ui.scorePopLayer.appendChild(element); setTimeout(() => element.remove(), 900);
}
function setPrompt(html, correct = false) { ui.prompt.innerHTML = html; ui.prompt.classList.toggle("correct", correct); ui.prompt.classList.remove("hidden"); }
function hidePrompt() { ui.prompt.classList.remove("correct"); ui.prompt.classList.add("hidden"); }
function formatTime(seconds) { const total = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
function horizontalDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function normalizeAngle(angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
function lerpAngle(current, target, amount) { let difference = (target - current + Math.PI) % (Math.PI * 2) - Math.PI; if (difference < -Math.PI) difference += Math.PI * 2; return current + difference * amount; }

function resetTouchInput() {
  state.touch.x = 0; state.touch.z = 0; state.touch.sprint = false; state.touch.pointerId = null;
  ui.joystickKnob.style.transform = "translate(0px, 0px)"; ui.sprintButton.classList.remove("active"); ui.interactButton.classList.remove("active");
}
function updateJoystick(event) {
  const rect = ui.joystick.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2;
  let dx = event.clientX - centerX; let dy = event.clientY - centerY; const maxDistance = rect.width * 0.31; const distance = Math.hypot(dx, dy);
  if (distance > maxDistance) { dx = (dx / distance) * maxDistance; dy = (dy / distance) * maxDistance; }
  state.touch.x = dx / maxDistance; state.touch.z = -dy / maxDistance; ui.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function applyJoystickScale() {
  const scale = save.settings.joystickScale || 1;
  ui.joystick.style.setProperty("--control-scale", String(scale));
  ui.mobileControls.style.setProperty("--control-scale", String(scale));
}
function updateOrientationHint() {
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  ui.orientationHint.classList.toggle("hidden", !(isTouchDevice && state.playing && portrait));
}
function requestFullscreen() {
  const element = document.documentElement;
  if (!document.fullscreenElement && element.requestFullscreen) element.requestFullscreen().catch(() => {});
  else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}
function updateSoundButton() {
  ui.soundButton.textContent = save.soundEnabled ? "🔊" : "🔇";
  ui.soundButton.setAttribute("aria-label", save.soundEnabled ? "Ton ausschalten" : "Ton einschalten");
}

window.addEventListener("keydown", (event) => {
  const controlled = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight", "KeyE", "KeyC", "Escape", "KeyP"];
  if (controlled.includes(event.code)) event.preventDefault();
  if (event.code === "Escape" && activeModal()) { activeModal().classList.add("hidden"); return; }
  if ((event.code === "Escape" || event.code === "KeyP") && !event.repeat && state.playing) { setPaused(!state.paused); return; }
  if (event.code === "KeyC" && !event.repeat && state.playing && !state.paused) { resetCamera(true); return; }
  if (state.paused) return;
  state.keys.add(event.code);
  if (event.code === "KeyE" && !event.repeat && state.playing) state.interactPressed = true;
});
window.addEventListener("keyup", (event) => state.keys.delete(event.code));
window.addEventListener("blur", () => state.keys.clear());
window.addEventListener("resize", () => { engine.resize(); updateOrientationHint(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && state.playing && !state.ended) setPaused(true); });
ui.joystick.addEventListener("pointerdown", (event) => { if (!state.playing || state.paused) return; state.touch.pointerId = event.pointerId; ui.joystick.setPointerCapture(event.pointerId); updateJoystick(event); event.preventDefault(); });
ui.joystick.addEventListener("pointermove", (event) => { if (state.touch.pointerId !== event.pointerId) return; updateJoystick(event); event.preventDefault(); });
const releaseJoystick = (event) => { if (state.touch.pointerId !== event.pointerId) return; state.touch.pointerId = null; state.touch.x = 0; state.touch.z = 0; ui.joystickKnob.style.transform = "translate(0px, 0px)"; };
ui.joystick.addEventListener("pointerup", releaseJoystick); ui.joystick.addEventListener("pointercancel", releaseJoystick);
const setTouchSprint = (active) => { if (!state.playing || state.paused) active = false; state.touch.sprint = active; ui.sprintButton.classList.toggle("active", active); };
ui.sprintButton.addEventListener("pointerdown", (event) => { setTouchSprint(true); ui.sprintButton.setPointerCapture(event.pointerId); event.preventDefault(); });
ui.sprintButton.addEventListener("pointerup", () => setTouchSprint(false)); ui.sprintButton.addEventListener("pointercancel", () => setTouchSprint(false));
ui.interactButton.addEventListener("pointerdown", (event) => { if (state.playing && !state.paused) state.interactPressed = true; ui.interactButton.classList.add("active"); ui.interactButton.setPointerCapture(event.pointerId); event.preventDefault(); });
ui.interactButton.addEventListener("pointerup", () => ui.interactButton.classList.remove("active")); ui.interactButton.addEventListener("pointercancel", () => ui.interactButton.classList.remove("active"));

ui.startButton.addEventListener("click", startRound); ui.restartButton.addEventListener("click", startRound); ui.pauseRestartButton.addEventListener("click", startRound);
ui.resumeButton.addEventListener("click", () => setPaused(false)); ui.pauseButton.addEventListener("click", () => setPaused(true)); ui.pauseMenuButton.addEventListener("click", returnToMenu);
ui.resultMenuButton.addEventListener("click", returnToMenu); ui.resultShopButton.addEventListener("click", () => showModal(ui.shopScreen));
ui.cameraButton.addEventListener("click", () => resetCamera(true)); ui.fullscreenButton.addEventListener("click", requestFullscreen); ui.fullscreenHudButton.addEventListener("click", requestFullscreen);
ui.shopButton.addEventListener("click", () => showModal(ui.shopScreen)); ui.achievementsButton.addEventListener("click", () => showModal(ui.achievementsScreen));
ui.statsButton.addEventListener("click", () => showModal(ui.statsScreen)); ui.settingsButton.addEventListener("click", () => showModal(ui.settingsScreen));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $(button.getAttribute("data-close")).classList.add("hidden")));
ui.soundButton.addEventListener("click", () => { save.soundEnabled = !save.soundEnabled; audio.setEnabled(save.soundEnabled); persistSave(save); updateSoundButton(); if (save.soundEnabled) { audio.play("pickup"); if (state.playing && !state.paused) audio.startMusic(); } });
ui.cameraSensitivity.addEventListener("input", () => { save.settings.cameraSensitivity = Number(ui.cameraSensitivity.value); persistSave(save); updateCameraSensitivity(); });
ui.joystickScale.addEventListener("input", () => { save.settings.joystickScale = Number(ui.joystickScale.value); persistSave(save); applyJoystickScale(); });
ui.qualitySetting.addEventListener("change", () => { save.settings.quality = ui.qualitySetting.value; persistSave(save); applyRenderQuality(); showToast("Grafikqualität angepasst", "good"); });
ui.vibrationSetting.addEventListener("change", () => { save.settings.vibration = ui.vibrationSetting.checked; persistSave(save); vibrate(20); });
ui.resetTutorialButton.addEventListener("click", () => { save.tutorialCompleted = false; persistSave(save); showToast("Tutorial wird bei der nächsten Schicht gezeigt", "good"); });

try {
  createScene();
  engine.runRenderLoop(() => scene.render());
  renderMenu(); updateSoundButton(); applyJoystickScale(); updateOrientationHint();
  ui.loading.classList.add("hidden");
} catch (error) {
  console.error(error); ui.loading.textContent = `Fehler beim Start: ${error.message}`;
}
