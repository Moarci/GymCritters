import {
  ACHIEVEMENTS,
  CHARACTERS,
  CONFIG,
  ITEM_TYPES,
  LEVELS,
  MODES,
  SHOP_ITEMS,
} from "./config.js";
import { achievementProgress, buyOrEquip, evaluateAchievements, loadSave, nextGoal, owns, persistSave } from "./save.js";
import { AudioSystem } from "./audio.js";
import { B } from "./babylon.js";
import { createMaterial } from "./materials.js";
import { buildEnvironment, setActiveLevelDecor } from "./environment/index.js";
import { cameraAlphaBehind, cameraYaw, comboMultiplier, formatTime, forwardFromYaw, horizontalDistance, lerpAngle, normalizeAngle, rankValue, shuffle, yawTowards } from "./utils.js";
import { scoreTarget } from "./targeting.js";
import { SQUASH_DURATION, comboImpactScale, deliveryPitch, impactSound, impactStrength, squashAt } from "./impact.js";
import { createTouchInput } from "./input/index.js";
import { clampPitch } from "./input/touch-look.js";
import { createQualityState, stepQuality } from "./perf/adaptive-quality.js";
import { deviceScalingFloor, fixedQualityScaling } from "./perf/render-scale.js";
import { fovModeForViewport } from "./camera-fov.js";
import { carryPose, curveLean, dominantWeight, gaitParams, idleMotion, squirrelTailSpec } from "./character-motion.js";

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
  cameraButton: $("cameraButton"), cameraRecenterButton: $("cameraRecenterButton"), fullscreenHudButton: $("fullscreenHudButton"), soundButton: $("soundButton"),
  pauseButton: $("pauseButton"), mobileControls: $("mobileControls"), joystick: $("joystick"),
  joystickKnob: $("joystickKnob"), sprintButton: $("sprintButton"), interactButton: $("interactButton"),
  startScreen: $("startScreen"), menuCoins: $("menuCoins"),
  characterSelector: $("characterSelector"), levelSelector: $("levelSelector"), modeSelector: $("modeSelector"),
  startButton: $("startButton"), shopButton: $("shopButton"), achievementsButton: $("achievementsButton"),
  statsButton: $("statsButton"), settingsButton: $("settingsButton"), fullscreenButton: $("fullscreenButton"),
  pauseScreen: $("pauseScreen"), resumeButton: $("resumeButton"), pauseRestartButton: $("pauseRestartButton"),
  pauseMenuButton: $("pauseMenuButton"), resultScreen: $("resultScreen"), resultBadge: $("resultBadge"),
  resultRank: $("resultRank"), resultRankDetail: $("resultRankDetail"), resultRankBox: document.querySelector(".result-rank"),
  resultTitle: $("resultTitle"), resultText: $("resultText"), finalScore: $("finalScore"),
  earnedCoins: $("earnedCoins"), highScore: $("highScore"), bestTime: $("bestTime"),
  newAchievements: $("newAchievements"), nextGoal: $("nextGoal"), restartButton: $("restartButton"), resultShopButton: $("resultShopButton"),
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
// Muss vor dem ersten applyRenderQuality()-Aufruf existieren (der folgt sofort unten,
// noch vor der `let scene`-Gruppe) -- sonst schlägt der "auto"-Zweig mit einem
// Temporal-Dead-Zone-Fehler auf `qualityState` fehl.
let qualityState = createAdaptiveState();
applyRenderQuality();

const state = {
  playing: false, paused: false, ended: false, finishing: false, tutorial: false, tutorialStage: 0,
  mode: MODES[save.lastMode] ? save.lastMode : "standard",
  level: LEVELS[save.lastLevel] ? save.lastLevel : "closing",
  character: owns(save, save.selectedCharacter) ? save.selectedCharacter : "raccoon",
  score: 0, combo: 0, delivered: 0, timeLeft: 120, roundSeconds: 120, wrongPlacements: 0,
  droppedItems: 0, maxCombo: 0, deliveredDumbbells: 0, deliveredByType: {}, heldItems: [], nearestItem: null, nearestZone: null,
  keys: new Set(), interactPressed: false, elapsed: 0, hudAccumulator: 0,
  velocity: new B.Vector3(0, 0, 0), reaction: { type: null, time: 0 }, lean: 0,
  toastTimer: null, speechTimer: null, achievementTimer: null,
};

const touchInput = createTouchInput({
  joystick: ui.joystick,
  knob: ui.joystickKnob,
  canvas: ui.canvas,
  sprintButton: ui.sprintButton,
  interactButton: ui.interactButton,
  getSensitivity: () => save.settings.cameraSensitivity || 1,
  isActive: () => state.playing && !state.paused,
  onInteract: () => { state.interactPressed = true; },
  // Nur auf Touch-Geräten die Canvas-Look-Zone registrieren: Auf Desktop schreibt
  // Babylons attachControl (siehe createCamera) bereits auf dieselben Pointer-Events;
  // zwei Schreiber ließen Yaw ca. 6-7x zu schnell laufen und Pitch gegeneinander kämpfen.
  canvasLookEnabled: isTouchDevice,
});

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
let trailAccumulator = 0;

function material(name, color, roughness = 0.85, metallic = 0) {
  return createMaterial(scene, name, color, roughness, metallic);
}

function vibrate(pattern) {
  if (save.settings.vibration && navigator.vibrate) navigator.vibrate(pattern);
}

// Die geltende Stufe ist bei "auto" die geregelte, sonst die gespeicherte Wahl.
function qualityTier() {
  return save.settings.quality === "auto" ? qualityState.tier : save.settings.quality;
}

function deviceContext() {
  return { touch: isTouchDevice, devicePixelRatio: window.devicePixelRatio || 1 };
}

// Der Geräteboden ist die UNTERE GRENZE des Reglers, nicht ein nachträgliches Maximum
// darüber. Als Math.max(boden, scaling) lag der Boden auf Geräten mit DPR >= 2.9 über
// maxScaling (2.0) -- die Regelung konnte den Wert dann nie beeinflussen und war
// ausgerechnet auf aktuellen Oberklasse-Handys wirkungslos.
function createAdaptiveState() {
  const floor = deviceScalingFloor(deviceContext());
  return createQualityState({ minScaling: floor, maxScaling: floor + 1 });
}

function applyRenderQuality() {
  if (save.settings.quality === "auto") {
    engine.setHardwareScalingLevel(qualityState.scaling);
    return;
  }
  engine.setHardwareScalingLevel(fixedQualityScaling(save.settings.quality, deviceContext()));
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

  shadowGenerator = new B.ShadowGenerator(qualityTier() === "low" ? 512 : 1024, key);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = qualityTier() === "low" ? 10 : 24;
  shadowGenerator.bias = 0.001;

  highlightLayer = new B.HighlightLayer("interactionHighlights", scene, { blurHorizontalSize: 1.2, blurVerticalSize: 1.2 });
  highlightLayer.innerGlow = false;
  highlightLayer.outerGlow = true;

  const environment = buildEnvironment(scene, shadowGenerator, { quality: qualityTier() });
  zones = environment.zones;
  obstacles = environment.obstacles;
  createPlayerCollider();
  buildCharacter(state.character);
  createCamera();
  setActiveLevelDecor(state.level);
  scene.onBeforeRenderObservable.add(update);
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
  sphere("nose", 0.13, [0, 1.46, -0.62], material("squirrelNose", "#201712", 0.6));
  for (const x of [-0.25, 0.25]) {
    const ear = B.MeshBuilder.CreateCylinder("squirrelEar", { diameterTop: 0.03, diameterBottom: 0.24, height: 0.48, tessellation: 16 }, scene);
    ear.parent = playerVisual; ear.position.set(x, 1.98, -0.02); ear.rotation.z = x < 0 ? -0.16 : 0.16; ear.material = dark;
  }
  const leftArm = limb("leftArm", -0.43, 1.04, fur, 0.095, 0.64);
  const rightArm = limb("rightArm", 0.43, 1.04, fur, 0.095, 0.64);
  const leftLeg = limb("leftLeg", -0.2, 0.28, dark, 0.12, 0.46, true);
  const rightLeg = limb("rightLeg", 0.2, 0.28, dark, 0.12, 0.46, true);
  const tailRoot = new B.TransformNode("tailRoot", scene); tailRoot.parent = playerVisual; tailRoot.position.set(0, 0.72, 0.34);
  squirrelTailSpec().forEach((segment, i) => {
    const puff = sphere(`squirrelTail${i}`, segment.diameter, [0, 0, 0], i % 2 ? dark : fur);
    puff.parent = tailRoot;
    puff.position.set(...segment.position);
    puff.scaling.set(0.8, 1.1, 0.72);
  });
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
  camera.lowerRadiusLimit = 4.7; camera.upperRadiusLimit = 6.1; camera.lowerBetaLimit = 1.1; camera.upperBetaLimit = 1.32;
  camera.wheelDeltaPercentage = 0.01; camera.panningSensibility = 0; camera.pinchPrecision = 65;
  camera.inertia = 0.78;
  applyCameraFovMode();
  // Babylon binds the arrow keys to camera rotation by default; those keys are ours
  // for movement, so holding one would spin alpha and drag the player facing with it.
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  updateCameraSensitivity();
  // Auf Touch-Geräten übernimmt src/input/index.js die Look-Steuerung; Babylons
  // eigenes Canvas-Handling würde den zweiten Finger als Pinch-Zoom deuten.
  if (!isTouchDevice) camera.attachControl(ui.canvas, true);
}

// Fixiert die kurze Viewport-Kante (siehe camera-fov.js) — muss bei jeder
// Größenänderung neu entschieden werden, sonst kippt ein Orientierungswechsel
// die Perspektive ins Extrem (Desktop: Zoom-Effekt, Hochformat: Tunnelblick).
function applyCameraFovMode() {
  if (!camera) return;
  camera.fovMode = fovModeForViewport(window.innerWidth, window.innerHeight) === "horizontal"
    ? B.Camera.FOVMODE_HORIZONTAL_FIXED
    : B.Camera.FOVMODE_VERTICAL_FIXED;
}

function updateCameraSensitivity() {
  if (!camera) return;
  const sensitivity = save.settings.cameraSensitivity || 1;
  camera.angularSensibilityX = 1400 / sensitivity;
  camera.angularSensibilityY = 1400 / sensitivity;
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
      weight: definition.weight, root, meshes, delivered: false, tutorial: Boolean(spec.tutorial),
    });
  });
}

function createItemMesh(type, root, index) {
  if (type === "dumbbell") return createDumbbell(root, index);
  if (type === "towel") return createTowel(root, index);
  if (type === "bottle") return createBottle(root, index);
  if (type === "kettlebell") return createKettlebellItem(root, index);
  if (type === "rope") return createRopeItem(root, index);
  if (type === "medball") return createMedballItem(root, index);
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

function createKettlebellItem(root, index) {
  const iron = material(`kettleItemIron${index}`, "#23262c", 0.55, 0.4);
  const metal = material(`kettleItemMetal${index}`, "#3d434d", 0.4, 0.5);
  const bell = B.MeshBuilder.CreateSphere("kettlebell", { diameter: 0.44, segments: 16 }, scene);
  bell.parent = root; bell.position.y = 0.24; bell.scaling.y = 1.08; bell.material = iron;
  const handle = B.MeshBuilder.CreateTorus("kettlebellHandle", { diameter: 0.24, thickness: 0.05, tessellation: 16 }, scene);
  handle.parent = root; handle.position.y = 0.48; handle.rotation.x = Math.PI / 2; handle.material = metal;
  return [bell, handle];
}

function createRopeItem(root, index) {
  const colors = ["#e9a767", "#70c7c2", "#d36b61"];
  const ropeMat = material(`ropeItemMat${index}`, colors[index % colors.length], 0.85);
  const coil = B.MeshBuilder.CreateTorus("ropeCoilItem", { diameter: 0.4, thickness: 0.07, tessellation: 20 }, scene);
  coil.parent = root; coil.position.y = 0.1; coil.rotation.x = Math.PI / 2; coil.rotation.y = 0.3 * index; coil.material = ropeMat;
  return [coil];
}

function createMedballItem(root, index) {
  const colors = ["#d36b61", "#6aabd8", "#a7f46a"];
  const ballMat = material(`medballMat${index}`, colors[index % colors.length], 0.7);
  const ball = B.MeshBuilder.CreateSphere("medball", { diameter: 0.5, segments: 16 }, scene);
  ball.parent = root; ball.position.y = 0.25; ball.material = ballMat;
  return [ball];
}

function update() {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  // Gemessen wird die ungeklemmte Frame-Zeit in Millisekunden: dt oben ist auf 50 ms
  // gedeckelt, ein echter Einbruch wäre darin nicht mehr sichtbar.
  if (save.settings.quality === "auto" && state.playing && !state.paused) {
    const previous = qualityState;
    qualityState = stepQuality(previous, engine.getDeltaTime());
    // Nur anfassen, wenn sich wirklich etwas geändert hat -- setHardwareScalingLevel
    // verwirft interne Render-Targets.
    if (qualityState.scaling !== previous.scaling) applyRenderQuality();
  }
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
  // Kameraausrichtung wird ausschließlich hier geschrieben. touch-look.js liefert nur
  // Zahlen, damit es keinen zweiten Schreiber auf alpha/beta gibt.
  const look = touchInput.consumeLook();
  if (look.deltaYaw !== 0 || look.deltaPitch !== 0) {
    camera.alpha -= look.deltaYaw;
    camera.beta = clampPitch(camera.beta + look.deltaPitch, camera.lowerBetaLimit, camera.upperBetaLimit);
  }
  const desired = player.position.add(new B.Vector3(0, 0.78, 0));
  camera.target = B.Vector3.Lerp(camera.target, desired, 1 - Math.exp(-9 * dt));
}

function resetCamera(showFeedback = true) {
  if (!camera || !player) return;
  camera.alpha = cameraAlphaBehind(player.rotation.y);
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
  const touch = touchInput.read();
  let inputX = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0) + touch.x;
  let inputZ = (forwardPressed ? 1 : 0) - (backPressed ? 1 : 0) + touch.z;
  const inputLength = Math.hypot(inputX, inputZ);
  const isMoving = inputLength > 0.04;
  const wantsSprint = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") || touch.sprint;
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
    const yVorher = player.rotation.y;
    player.rotation.y = lerpAngle(yVorher, yawTowards(moveDirection.x, moveDirection.z), Math.min(1, dt * 11));
    // Drehgeschwindigkeit -> Kurvenneigung. updateReaction wendet sie als
    // Ruhelage von rotation.z an, damit Reaktionen (Kopfschütteln) gewinnen.
    state.lean = dt > 0 ? curveLean(normalizeAngle(player.rotation.y - yVorher) / dt) : 0;
  } else {
    state.lean = 0;
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
  const weight = dominantWeight(state.heldItems.map((item) => item.weight));
  const gait = gaitParams(weight, sprinting, moving);
  const phase = state.elapsed * gait.frequency;
  const armSwing = Math.sin(phase) * 0.55 * gait.intensity * gait.armSwing;
  const legSwing = Math.sin(phase) * 0.5 * gait.intensity;
  if (state.heldItems.length) {
    // Die Haltung zeigt, was geschleppt wird: schwer hängt tief mit Rücklage,
    // sperrig umklammert breit, leicht bleibt locker.
    const pose = carryPose(weight);
    playerParts.leftArm.rotation.x = pose.armX;
    playerParts.rightArm.rotation.x = pose.armX;
    playerParts.leftArm.rotation.z = -pose.armZ;
    playerParts.rightArm.rotation.z = pose.armZ;
    playerVisual.rotation.x = B.Scalar.Lerp(playerVisual.rotation.x, pose.torsoLean, 0.15);
  } else {
    playerParts.leftArm.rotation.x = armSwing;
    playerParts.rightArm.rotation.x = -armSwing;
    playerParts.leftArm.rotation.z = state.character === "squirrel" ? -0.17 : -0.22;
    playerParts.rightArm.rotation.z = state.character === "squirrel" ? 0.17 : 0.22;
    playerVisual.rotation.x = B.Scalar.Lerp(playerVisual.rotation.x, 0, 0.15);
  }
  playerParts.leftLeg.rotation.x = -legSwing;
  playerParts.rightLeg.rotation.x = legSwing;
  const idle = !moving && !state.heldItems.length ? idleMotion(state.elapsed) : null;
  playerParts.body.scaling.y = 1 + (idle ? idle.breath : 0);
  playerParts.tailRoot.rotation.y = Math.sin(state.elapsed * (state.character === "squirrel" ? 4 : 3.2)) * 0.28 + (idle ? idle.tailFlick : 0);
  playerParts.tailRoot.rotation.x = 0.13 + Math.sin(state.elapsed * 2.1) * 0.06;
  playerVisual.position.y = -0.84 + Math.abs(Math.sin(phase)) * 0.035 * gait.intensity * gait.bob;
  updateReaction(dt);
}

function setReaction(type, duration = 0.7) {
  state.reaction = { type, time: duration, duration };
}

function updateReaction(dt) {
  if (!state.reaction.type) {
    playerVisual.rotation.z = B.Scalar.Lerp(playerVisual.rotation.z, state.lean, 0.22);
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
  if (save.equipped.trail !== "golden-trail" || !active || qualityTier() === "low") return;
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
  let bestItemScore = Infinity;
  for (const item of items) {
    if (item.delivered || state.heldItems.includes(item)) continue;
    const itemPosition = item.root.getAbsolutePosition();
    const distance = horizontalDistance(player.position, itemPosition);
    const angleToItem = yawTowards(itemPosition.x - player.position.x, itemPosition.z - player.position.z);
    const angleDelta = normalizeAngle(angleToItem - player.rotation.y);
    const score = scoreTarget(distance, angleDelta, CONFIG.interactDistance);
    if (score < bestItemScore) {
      bestItemScore = score;
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
  const relativeAngle = normalizeAngle(yawTowards(toTarget.x, toTarget.z) - cameraYaw(camera.alpha));
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
      const direction = forwardFromYaw(baseAngle + offset);
      const candidate = new B.Vector3(player.position.x + direction.x * distance, 0.12, player.position.z + direction.z * distance);
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
    // Eine Serie ist nur dann etwas wert, wenn ihr Verlust hörbar ist. Ab drei
    // Gegenständen rutscht die Tonleiter vernehmbar wieder herunter; darunter
    // gab es nichts zu verlieren und der Fehlerton allein genügt.
    const hatteSerie = state.combo >= 3;
    state.combo = 0; state.wrongPlacements += 1; audio.play("wrong"); vibrate([30, 30, 30]); setReaction("wrong", 0.7);
    if (hatteSerie) {
      window.setTimeout(() => audio.play("comboBreak"), 180);
      showToast(`Serie gerissen – hierhin gehören ${ITEM_TYPES[zone.type].plural}`, "bad");
    } else {
      showToast(`Falscher Platz – hierhin gehören ${ITEM_TYPES[zone.type].plural}`, "bad");
    }
    characterSays("Das gehört woanders hin …"); updateHUD(); return;
  }

  const mode = MODES[state.mode];
  let batchScore = 0;
  let pending = matching.length;
  matching.forEach((item, index) => {
    state.combo += 1;
    // Für die Eskalation festhalten: bis zur Landung zählt state.combo weiter,
    // dieser Aufschlag gehört aber zu genau diesem Stand.
    const comboDiesesWurfs = state.combo;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const strengthBonus = item.weight === "heavy" ? currentCharacter().heavyScoreBonus : 1;
    const gained = Math.round(item.points * comboMultiplier(state.combo) * mode.scoreMultiplier * strengthBonus);
    const milestone = { 3: 75, 5: 150, 8: 300, 10: 400 }[state.combo] || 0;
    batchScore += gained + milestone;
    state.score += gained + milestone;
    state.delivered += 1;
    if (item.type === "dumbbell") state.deliveredDumbbells += 1;
    state.deliveredByType[item.type] = (state.deliveredByType[item.type] || 0) + 1;
    item.delivered = true;
    state.heldItems = state.heldItems.filter((entry) => entry !== item);
    showScorePop(`+${gained}`, false);
    if (milestone) showScorePop(`Streak +${milestone}`, true);
    // Versetzter Start, damit mehrere Gegenstände nacheinander landen und zwei
    // getrennte Aufschläge zu hören sind statt eines Matschs.
    animateDeliveredItem(item, zone, index * 80, () => {
      playImpact(zone, item, comboDiesesWurfs);
      pending -= 1;
      if (pending === 0) {
        showDeliveryBurst(zone.position, zone.marker.material.albedoColor);
        showToast(`${matching.length > 1 ? `${matching.length} Dinge` : matching[0].label} aufgeräumt · +${batchScore}`, "good");
        characterSays(state.combo >= 5 ? "Die Combo läuft!" : "Sieht schon besser aus!");
        onDeliveryAnimationFinished();
      }
    });
  });
  // Mit dem letzten Gegenstand ist die Runde entschieden — die Uhr muss hier stehen
  // bleiben, nicht erst nach der Landeanimation. Sonst kann der Timer in den 500 ms
  // bis zum Aufschlag (plus 80 ms je weiterem Gegenstand im Wurf) ablaufen und die
  // gewonnene Runde als "Zeit vorbei" beenden, obwohl der Fortschritt schon zählt.
  // Das Tutorial bleibt ausgenommen: dort läuft ohnehin kein Timer, und
  // finishTutorial() steigt bei gesetztem finishing an seinem eigenen Wächter aus.
  if (!state.tutorial && state.delivered === items.length) state.finishing = true;
  reflowHeldItems(false);
  // Nur die Quittung auf den Tastendruck — die Wucht sitzt auf der Landung.
  audio.play("release"); setReaction("pickup", 0.28);
  updateHUD();
}

function onDeliveryAnimationFinished() {
  if (state.tutorial && state.delivered === items.length) { finishTutorial(); return; }
  if (state.delivered === items.length) endRound(true);
}

function animateDeliveredItem(item, zone, delay, onComplete) {
  const startPosition = item.root.getAbsolutePosition().clone();
  const startScale = item.root.scaling.clone();
  item.root.parent = null; item.root.position.copyFrom(startPosition);
  const placement = getDisplayPlacement(zone, item, zone.deliveredCount++);
  const started = performance.now() + delay; let last = started;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    if (now < started) return;
    const t = Math.min(1, (now - started) / 500); const eased = 1 - Math.pow(1 - t, 3);
    const position = B.Vector3.Lerp(startPosition, placement.position, eased); position.y += Math.sin(Math.PI * t) * 0.85;
    item.root.position.copyFrom(position); item.root.rotation.y += (now - last) * 0.01; last = now;
    item.root.scaling.copyFrom(B.Vector3.Lerp(startScale, new B.Vector3(placement.scale, placement.scale, placement.scale), eased));
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer); deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
      item.root.position.copyFrom(placement.position); item.root.rotation.copyFrom(placement.rotation); item.root.scaling.setAll(placement.scale); onComplete?.();
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
  } else if (zone.id === "kettlebells") {
    const slot = [-0.42, 0, 0.42][index % 3];
    p.set(zone.position.x + slot, 0.24 + Math.floor(index / 3) * 0.5, zone.position.z); scale = 0.62;
  } else if (zone.id === "ropes") {
    const slot = [-0.42, 0, 0.42][index % 3];
    p.set(zone.position.x + 0.16, 0.95, zone.position.z + slot); rotation.y = index * 0.4; scale = 0.58;
  } else if (zone.id === "medballs") {
    const angle = index * 1.3; const radius = 0.35 + (index % 2) * 0.15;
    p.set(zone.position.x + Math.cos(angle) * radius, 0.75, zone.position.z + Math.sin(angle) * radius); scale = 0.6;
  }
  return { position: p, rotation, scale };
}

function showDeliveryBurst(position, color) {
  const count = qualityTier() === "low" ? 6 : 12;
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

// Der Moment, in dem ein Gegenstand tatsächlich landet. Bewusst getrennt vom
// Tastendruck: der Gegenstand fliegt 500 ms, und die Wucht gehört ans Ende
// dieses Fluges, nicht an seinen Anfang.
function playImpact(zone, item, combo) {
  const strength = impactStrength(item.weight) * comboImpactScale(combo);
  audio.playImpact(impactSound(item.type, deliveryPitch(combo)), strength);
  vibrate(Math.round(12 + strength * 22));
  squashZone(zone, strength);
  if (qualityTier() !== "low") {
    kickCamera(strength);
    showImpactDust(zone.position, strength);
  }
}

// Staucht die Zone und lässt sie nachfedern. Je Zone darf höchstens eine
// Animation laufen — ein zweiter Aufschlag setzt sie zurück, statt einen
// weiteren Observer auf dieselben Meshes zu legen.
function squashZone(zone, strength) {
  if (!zone.bodyMeshes?.length) return;
  if (zone.squash) {
    scene.onBeforeRenderObservable.remove(zone.squash);
    deliveryObservers = deliveryObservers.filter((entry) => entry !== zone.squash);
  }
  const restore = () => zone.bodyMeshes.forEach((mesh, index) => {
    const rest = zone.bodyRest[index];
    mesh.position.y = rest.y;
    mesh.scaling.copyFrom(rest.scaling);
  });
  const started = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - started) / (SQUASH_DURATION * 1000);
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
      zone.squash = null;
      restore();
      return;
    }
    const { scaleY, scaleXZ } = squashAt(t, strength);
    zone.bodyMeshes.forEach((mesh, index) => {
      const rest = zone.bodyRest[index];
      mesh.scaling.set(rest.scaling.x * scaleXZ, rest.scaling.y * scaleY, rest.scaling.z * scaleXZ);
      // Mitsinken lassen, damit die Meshes am Boden bleiben statt zu schweben.
      mesh.position.y = rest.y * scaleY;
    });
  });
  zone.squash = observer;
  deliveryObservers.push(observer);
}

// Kurzer Radius-Impuls. Fasst camera.alpha bewusst NICHT an — Kameraausrichtung
// und Spielerrotation müssen strikt einseitig gekoppelt bleiben.
function kickCamera(strength) {
  if (!camera) return;
  const base = camera.radius;
  const depth = 0.06 * strength;
  const started = performance.now();
  const duration = 220;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - started) / duration;
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
      return;
    }
    camera.radius = base - Math.sin(Math.PI * t) * depth;
  });
  deliveryObservers.push(observer);
}

// Kleine graue Wolke am Aufschlagpunkt — bewusst anders als der bunte
// Belohnungs-Burst, damit beide nebeneinander lesbar bleiben.
function showImpactDust(position, strength) {
  const count = Math.round(3 + strength * 4);
  for (let i = 0; i < count; i++) {
    const puff = B.MeshBuilder.CreateSphere("impactDust", { diameter: 0.16, segments: 5 }, scene);
    const origin = position.add(new B.Vector3((Math.random() - 0.5) * 0.5, 0.12, (Math.random() - 0.5) * 0.5));
    puff.position.copyFrom(origin);
    const mat = new B.StandardMaterial("impactDustMat", scene);
    mat.diffuseColor = new B.Color3(0.62, 0.62, 0.6);
    mat.alpha = 0.4;
    puff.material = mat;
    const drift = new B.Vector3((Math.random() - 0.5) * 1.1, 0.35 + Math.random() * 0.3, (Math.random() - 0.5) * 1.1);
    const started = performance.now();
    const observer = scene.onBeforeRenderObservable.add(() => {
      const t = (performance.now() - started) / 420;
      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
        puff.dispose(); mat.dispose();
        return;
      }
      puff.position.copyFrom(origin.add(drift.scale(t)));
      puff.scaling.setAll(0.6 + t * 1.3);
      mat.alpha = 0.4 * (1 - t);
    });
    deliveryObservers.push(observer);
  }
}

function startRound() {
  closeAllModals();
  if (!save.tutorialCompleted) startTutorial();
  else beginGameplayRound();
}

function resetRoundState() {
  state.playing = true; state.paused = false; state.ended = false; state.finishing = false;
  state.score = 0; state.combo = 0; state.delivered = 0; state.wrongPlacements = 0; state.droppedItems = 0;
  state.maxCombo = 0; state.deliveredDumbbells = 0; state.deliveredByType = {}; state.heldItems = []; state.nearestItem = null; state.nearestZone = null;
  state.hudAccumulator = 0; state.interactPressed = false; state.keys.clear(); state.velocity.set(0, 0, 0);
  touchInput.reset(); resetZoneGuidance(); clearItemHighlight();
  // Jede Runde beginnt mit frischer Warmlaufphase: Szenenaufbau verzerrt die Messung.
  qualityState = createAdaptiveState();
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
  document.body.classList.add("playing"); updateHUD(); ui.canvas.focus();
}

function startTutorial() {
  state.tutorial = true; state.tutorialStage = 0;
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
  touchInput.reset(); resetZoneGuidance(); clearItemHighlight(); hidePrompt(); audio.stopMusic();
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
  for (const [type, anzahl] of Object.entries(state.deliveredByType)) {
    save.stats.byType[type] = (save.stats.byType[type] || 0) + anzahl;
  }
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
  renderNewAchievements(unlocked); renderNextGoal(); updateCoinDisplays(); renderMenu();
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

function returnToMenu() {
  state.playing = false; state.paused = false; state.ended = true; state.finishing = false; state.tutorial = false;
  state.keys.clear(); state.velocity.set(0, 0, 0); audio.stopMusic(); touchInput.reset(); clearItemHighlight(); hidePrompt();
  ui.hud.classList.add("hidden"); ui.objective.classList.add("hidden"); ui.progressTrack.classList.add("hidden"); ui.navigator.classList.add("hidden");
  ui.mobileControls.classList.add("hidden"); ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.add("hidden"); ui.tutorialCoach.classList.add("hidden");
  ui.startScreen.classList.remove("hidden"); document.body.classList.remove("playing"); renderMenu();
}

function setPaused(paused) {
  if (!state.playing || state.ended || state.finishing || state.paused === paused) return;
  state.paused = paused; state.keys.clear(); state.velocity.set(0, 0, 0); state.interactPressed = false; touchInput.reset();
  ui.pauseScreen.classList.toggle("hidden", !paused); ui.mobileControls.classList.toggle("hidden", paused || !isTouchDevice);
  if (paused) { hidePrompt(); audio.stopMusic(); audio.play("pause"); }
  else { audio.startMusic(); ui.canvas.focus(); }
}

function updateHUD() {
  ui.score.textContent = String(state.score);
  ui.progress.textContent = `${state.delivered}/${items.length}`;
  ui.progressBar.style.width = `${items.length ? (state.delivered / items.length) * 100 : 0}%`;
  ui.combo.textContent = `×${comboMultiplier(state.combo).toFixed(1).replace(".", ",")}`;
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
    // Nur zählbare Ziele bekommen einen Balken. Ja/Nein-Bedingungen pro Runde
    // behalten "Noch offen" — ein Balken, der nie wächst, wäre irreführend.
    const stand = unlocked ? null : achievementProgress(save, achievement);
    const status = unlocked
      ? `<span class="achievement-status">Freigeschaltet</span>`
      : stand
        ? `<span class="achievement-status">${stand.aktuell} / ${stand.ziel}</span>
           <div class="achievement-bar"><div style="width:${Math.round((stand.aktuell / stand.ziel) * 100)}%"></div></div>`
        : `<span class="achievement-status">Noch offen</span>`;
    card.innerHTML = `<span class="achievement-icon">${unlocked ? achievement.icon : "❔"}</span><h3>${achievement.name}</h3><p>${achievement.description}</p>${status}`;
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

// Der Anstoß für die nächste Runde: direkt nach dem Ergebnis zeigen, was als
// Nächstes in Reichweite liegt. Genau hier entscheidet sich, ob nochmal
// gedrückt wird.
function renderNextGoal() {
  const ziel = nextGoal(save);
  if (!ziel) { ui.nextGoal.classList.add("hidden"); ui.nextGoal.innerHTML = ""; return; }
  const anteil = Math.round((ziel.aktuell / ziel.ziel) * 100);
  ui.nextGoal.innerHTML = `<small>Nächstes Ziel</small>
    <strong>${ziel.achievement.icon} ${ziel.achievement.name}</strong>
    <span>noch ${ziel.rest} · ${ziel.aktuell} von ${ziel.ziel}</span>
    <div class="next-goal-bar"><div style="width:${anteil}%"></div></div>`;
  ui.nextGoal.classList.remove("hidden");
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

function applyJoystickScale() {
  const scale = save.settings.joystickScale || 1;
  ui.joystick.style.setProperty("--control-scale", String(scale));
  ui.mobileControls.style.setProperty("--control-scale", String(scale));
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

// Ein gemeinsamer Weg für alle Fälle, in denen die Eingabe abreißen kann. Ohne das
// bleibt ein gehaltener Joystick nach einem Tab-Wechsel dauerhaft ausgelenkt.
function releaseAllInput() {
  state.keys.clear();
  touchInput.reset();
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
window.addEventListener("blur", releaseAllInput);
window.addEventListener("resize", () => { engine.resize(); applyCameraFovMode(); });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  releaseAllInput();
  if (state.playing && !state.ended) setPaused(true);
});

ui.startButton.addEventListener("click", startRound); ui.restartButton.addEventListener("click", startRound); ui.pauseRestartButton.addEventListener("click", startRound);
ui.resumeButton.addEventListener("click", () => setPaused(false)); ui.pauseButton.addEventListener("click", () => setPaused(true)); ui.pauseMenuButton.addEventListener("click", returnToMenu);
ui.resultMenuButton.addEventListener("click", returnToMenu); ui.resultShopButton.addEventListener("click", () => showModal(ui.shopScreen));
ui.cameraButton.addEventListener("click", () => resetCamera(true)); ui.cameraRecenterButton.addEventListener("click", () => resetCamera(true));
ui.fullscreenButton.addEventListener("click", requestFullscreen); ui.fullscreenHudButton.addEventListener("click", requestFullscreen);
ui.shopButton.addEventListener("click", () => showModal(ui.shopScreen)); ui.achievementsButton.addEventListener("click", () => showModal(ui.achievementsScreen));
ui.statsButton.addEventListener("click", () => showModal(ui.statsScreen)); ui.settingsButton.addEventListener("click", () => showModal(ui.settingsScreen));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $(button.getAttribute("data-close")).classList.add("hidden")));
ui.soundButton.addEventListener("click", () => { save.soundEnabled = !save.soundEnabled; audio.setEnabled(save.soundEnabled); persistSave(save); updateSoundButton(); if (save.soundEnabled) { audio.play("pickup"); if (state.playing && !state.paused) audio.startMusic(); } });
ui.cameraSensitivity.addEventListener("input", () => { save.settings.cameraSensitivity = Number(ui.cameraSensitivity.value); persistSave(save); updateCameraSensitivity(); });
ui.joystickScale.addEventListener("input", () => { save.settings.joystickScale = Number(ui.joystickScale.value); persistSave(save); applyJoystickScale(); });
ui.qualitySetting.addEventListener("change", () => {
  save.settings.quality = ui.qualitySetting.value;
  persistSave(save);
  qualityState = createAdaptiveState();
  applyRenderQuality();
  showToast("Grafikqualität angepasst", "good");
});
ui.vibrationSetting.addEventListener("change", () => { save.settings.vibration = ui.vibrationSetting.checked; persistSave(save); vibrate(20); });
ui.resetTutorialButton.addEventListener("click", () => { save.tutorialCompleted = false; persistSave(save); showToast("Tutorial wird bei der nächsten Schicht gezeigt", "good"); });

try {
  createScene();
  engine.runRenderLoop(() => scene.render());
  renderMenu(); updateSoundButton(); applyJoystickScale();
  ui.loading.classList.add("hidden");
} catch (error) {
  console.error(error); ui.loading.textContent = `Fehler beim Start: ${error.message}`;
}
