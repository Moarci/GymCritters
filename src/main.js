import {
  ACHIEVEMENTS,
  CHARACTERS,
  CONFIG,
  ITEM_TYPES,
  LEVELS,
  MODES,
  SHOP_ITEMS,
} from "./config.js";
import {
  achievementProgress,
  buyOrEquip,
  evaluateAchievements,
  loadSave,
  nextGoal,
  owns,
  parseSaveImport,
  persistSave,
  serializeSaveExport,
} from "./save.js";
import { ensureDailyContracts, contractDefinition } from "./challenges.js";
import { filteredRoundHistory, recordRoundProgress, roundTrend } from "./progression.js";
import { AudioSystem } from "./audio.js";
import { B } from "./babylon.js";
import { createMaterial } from "./materials.js";
import { buildEnvironment, setActiveLevelDecor } from "./environment/index.js";
import { cameraAlphaBehind, cameraYaw, comboMultiplier, formatTime, forwardFromYaw, horizontalDistance, lerpAngle, normalizeAngle, yawTowards } from "./utils.js";
import { hasClearLineOfSight, scoreTarget } from "./targeting.js";
import { SQUASH_DURATION, comboImpactScale, deliveryPitch, impactSound, impactStrength, squashAt } from "./impact.js";
import { createTouchInput } from "./input/index.js";
import { clampPitch } from "./input/touch-look.js";
import { createQualityState, stepQuality } from "./perf/adaptive-quality.js";
import { deviceScalingFloor, fixedQualityScaling } from "./perf/render-scale.js";
import { fovModeForViewport } from "./camera-fov.js";
import { carryPose, curveLean, dominantWeight, facingRotation, gaitParams, idleMotion, raccoonTailSpec, solveTwoBoneIK, squirrelTailSpec, surfacePoint } from "./character-motion.js";
import {
  shiftEvent,
  shiftEventBonusPercent,
  shiftEventMultiplier,
  shiftPhase,
  shiftPhaseLabel,
  unlockedWave,
  waveForItem,
} from "./shift-director.js";
import {
  SHIFT_SETTING_OPTIONS,
  itemCountForMode,
  modeDurationLabel,
  navigatorPolicy,
  optionFor,
} from "./shift-settings.js";
import { selectTripHazard, tripRule } from "./trip-physics.js";
import { itemDisplaySlot, MEDBALL_DIAMETER, ROPE_ITEM_LAYOUT } from "./item-placement.js";
import { buildRoundTypes, planSpawnPositions } from "./round-planner.js";
import { roundCoaching } from "./round-coach.js";
import { comboFlowState, courierBatchBonus, hazardCueIntensity } from "./game-feel.js";

const $ = (id) => /** @type {any} */ (document.getElementById(id));
const ui = {
  canvas: $("gameCanvas"), loading: $("loading"), hud: $("hud"), objective: $("objective"),
  progressTrack: $("progressTrack"), progressBar: $("progressBar"), navigator: $("navigator"),
  navArrow: $("navArrow"), navTarget: $("navTarget"), navDistance: $("navDistance"),
  speechBubble: $("speechBubble"), tutorialCoach: $("tutorialCoach"), tutorialTitle: $("tutorialTitle"),
  tutorialText: $("tutorialText"), prompt: $("prompt"), toast: $("toast"),
  achievementToast: $("achievementToast"), achievementIcon: $("achievementIcon"), achievementName: $("achievementName"),
  scorePopLayer: $("scorePopLayer"), score: $("score"), progress: $("progress"), combo: $("combo"),
  comboStat: $("comboStat"), comboTimeBar: $("comboTimeBar"), flowVignette: $("flowVignette"), flowLabel: $("flowLabel"),
  timer: $("timer"), coins: $("coins"), carrying: $("carrying"), carryCard: $("carryCard"),
  contractHud: $("contractHud"), contractTitle: $("contractTitle"), contractProgress: $("contractProgress"), contractProgressBar: $("contractProgressBar"),
  shiftStatus: $("shiftStatus"), shiftPhase: $("shiftPhase"), shiftWaveDots: $("shiftWaveDots"),
  shiftEventTitle: $("shiftEventTitle"), shiftEventBonus: $("shiftEventBonus"),
  cameraButton: $("cameraButton"), cameraRecenterButton: $("cameraRecenterButton"), fullscreenHudButton: $("fullscreenHudButton"), soundButton: $("soundButton"),
  pauseButton: $("pauseButton"), mobileControls: $("mobileControls"), joystick: $("joystick"),
  joystickKnob: $("joystickKnob"), sprintButton: $("sprintButton"), interactButton: $("interactButton"),
  startScreen: $("startScreen"), menuCoins: $("menuCoins"),
  characterSelector: $("characterSelector"), levelSelector: $("levelSelector"), modeSelector: $("modeSelector"),
  wizardProgress: $("wizardProgress"), wizardStageLabel: $("wizardStageLabel"),
  wizardStageTitle: $("wizardStageTitle"), wizardStageHint: $("wizardStageHint"),
  wizardSelectionSummary: $("wizardSelectionSummary"), wizardStepCounter: $("wizardStepCounter"),
  wizardBackButton: $("wizardBackButton"), wizardNextButton: $("wizardNextButton"),
  itemAmountSetting: $("itemAmountSetting"), shiftDynamicsSetting: $("shiftDynamicsSetting"),
  tripRiskSetting: $("tripRiskSetting"), navigatorSetting: $("navigatorSetting"),
  shiftPreviewCard: $("shiftPreviewCard"), shiftPreviewTitle: $("shiftPreviewTitle"),
  shiftPreviewSubtitle: $("shiftPreviewSubtitle"), shiftPreviewItems: $("shiftPreviewItems"),
  shiftPreviewTime: $("shiftPreviewTime"), shiftPreviewRisk: $("shiftPreviewRisk"),
  shiftPreviewDynamics: $("shiftPreviewDynamics"), shiftPreviewCharacter: $("shiftPreviewCharacter"),
  shiftPreviewGuidance: $("shiftPreviewGuidance"),
  startButton: $("startButton"), shopButton: $("shopButton"), achievementsButton: $("achievementsButton"),
  statsButton: $("statsButton"), settingsButton: $("settingsButton"), fullscreenButton: $("fullscreenButton"),
  pauseScreen: $("pauseScreen"), resumeButton: $("resumeButton"), pauseRestartButton: $("pauseRestartButton"),
  pauseMenuButton: $("pauseMenuButton"), resultScreen: $("resultScreen"), resultBadge: $("resultBadge"),
  resultRank: $("resultRank"), resultRankDetail: $("resultRankDetail"), resultRankBox: document.querySelector(".result-rank"),
  resultTitle: $("resultTitle"), resultText: $("resultText"), finalScore: $("finalScore"),
  earnedCoins: $("earnedCoins"), highScore: $("highScore"), bestTime: $("bestTime"),
  roundCoach: $("roundCoach"), roundCoachTitle: $("roundCoachTitle"), roundCoachText: $("roundCoachText"),
  roundCoachMetrics: $("roundCoachMetrics"),
  newAchievements: $("newAchievements"), nextGoal: $("nextGoal"), restartButton: $("restartButton"), resultShopButton: $("resultShopButton"),
  resultContracts: $("resultContracts"), masteryResult: $("masteryResult"), masteryLevel: $("masteryLevel"),
  masteryProgressText: $("masteryProgressText"), masteryProgressBar: $("masteryProgressBar"),
  resultMenuButton: $("resultMenuButton"), shopScreen: $("shopScreen"), shopCoins: $("shopCoins"), shopGrid: $("shopGrid"),
  achievementsScreen: $("achievementsScreen"), achievementGrid: $("achievementGrid"), statsScreen: $("statsScreen"),
  careerStats: $("careerStats"), modeStats: $("modeStats"), settingsScreen: $("settingsScreen"),
  trendSummary: $("trendSummary"), trendDelta: $("trendDelta"), trendMeta: $("trendMeta"),
  trendChart: $("trendChart"), recentRounds: $("recentRounds"),
  statsLevelFilter: $("statsLevelFilter"), statsModeFilter: $("statsModeFilter"),
  cameraSensitivity: $("cameraSensitivity"), joystickScale: $("joystickScale"), qualitySetting: $("qualitySetting"),
  vibrationSetting: $("vibrationSetting"), masterVolume: $("masterVolume"), reducedMotionSetting: $("reducedMotionSetting"),
  exportSaveButton: $("exportSaveButton"), importSaveButton: $("importSaveButton"), importSaveInput: $("importSaveInput"),
  resetTutorialButton: $("resetTutorialButton"),
};

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const WIZARD_STEPS = Object.freeze([
  {
    title: "Wer übernimmt die Schicht?",
    hint: "Jeder Critter spielt sich anders und bringt eine eigene Stärke mit.",
    next: "Weiter zum Bereich",
  },
  {
    title: "Welcher Bereich braucht Hilfe?",
    hint: "Jedes Level besitzt eigene Laufwege, Gegenstände, Hindernisse und Ereignisse.",
    next: "Weiter zum Modus",
  },
  {
    title: "Welches Tempo passt heute?",
    hint: "Vom entspannten Rundgang bis zum zeitlosen Zen-Modus bestimmst du den Druck.",
    next: "Weiter zum Feintuning",
  },
  {
    title: "Wie soll sich die Schicht spielen?",
    hint: "Passe Umfang, Dynamik, Stolperrisiko und Zielhilfe für dieses Level an.",
    next: "Auswahl überprüfen",
  },
  {
    title: "Bereit, das Gym zum Glänzen zu bringen?",
    hint: "Prüfe deine Auswahl – danach beginnt die Schicht.",
    next: "",
  },
]);
const wizardPages = [...document.querySelectorAll("[data-wizard-page]")];
const wizardStepButtons = [...document.querySelectorAll("[data-wizard-step]")];
const wizardStageNumber = document.querySelector(".wizard-stage-number");
const menuShell = document.querySelector(".menu-shell");
let menuWizardStep = 0;
const save = loadSave();
const dailyContracts = ensureDailyContracts(save);
if (dailyContracts.changed) persistSave(save);
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
  comboTime: 0,
  droppedItems: 0, trips: 0, tripTime: 0, tripCooldown: 0,
  maxCombo: 0, deliveredDumbbells: 0, deliveredByType: {}, heldItems: [], nearestItem: null, nearestZone: null,
  keys: new Set(), interactPressed: false, elapsed: 0, roundElapsed: 0, hudAccumulator: 0,
  velocity: new B.Vector3(0, 0, 0), reaction: { type: null, time: 0 }, lean: 0,
  activeWave: 0, shiftEventId: null,
  cameraPreferredRadius: 5.6, cameraOccluded: false,
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
let trailSparkPool = [];

const CARRY_PROFILES = {
  dumbbell: { scale: 0.72, rootY: -0.12, gripX: 0.22, gripY: 0.84, rotationZ: 0 },
  towel: { scale: 0.76, rootY: -0.04, gripX: 0.24, gripY: 0.84, rotationZ: 0 },
  bottle: { scale: 0.72, rootY: -0.37, gripX: 0.17, gripY: 0.85, rotationZ: 0 },
  mat: { scale: 0.68, rootY: -0.17, gripX: 0.27, gripY: 0.84, rotationZ: 0.2 },
  kettlebell: { scale: 0.74, rootY: -0.34, gripX: 0.14, gripY: 0.84, rotationZ: 0 },
  rope: { scale: 0.66, rootY: -0.08, gripX: 0.17, gripY: 0.84, rotationZ: -0.12 },
  medball: { scale: 0.76, rootY: -0.17, gripX: 0.22, gripY: 0.84, rotationZ: 0 },
};

function material(name, color, roughness = 0.85, metallic = 0) {
  return createMaterial(scene, name, color, roughness, metallic);
}

function shopItem(id) {
  return SHOP_ITEMS.find((item) => item.id === id) || null;
}

function prefersReducedMotion() {
  return Boolean(save.settings.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function currentLevelSettings() {
  return save.levelSettings[state.level];
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
  // Sicherheitsnetz außerhalb der geschlossenen Halle: selbst an extremen
  // Kamerawinkeln erscheint ein kühles Tageslicht statt schwarzem Weltraum.
  scene.clearColor = new B.Color4(0.34, 0.39, 0.42, 1);
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

function rebuildSceneForQuality() {
  if (!scene || state.playing) return;
  scene.dispose();
  player = null;
  playerVisual = null;
  playerParts = {};
  carryAnchors = [];
  items = [];
  zones = [];
  obstacles = [];
  deliveryObservers = [];
  trailSparkPool = [];
  highlightedItem = null;
  createScene();
  renderMenu();
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
  // Brusthöhe und innerhalb der realen Reichweite der 0,66 Einheiten langen
  // Armkette. Die alten Werte (-0,84 z / 1,04 y) ließen Gegenstände vor der
  // Schnauze schweben; keine Schulter-/Ellbogenpose konnte sie erreichen.
  const center = new B.TransformNode("carryCenter", scene); center.parent = playerVisual; center.position.set(0, 0.82, -0.42);
  const left = new B.TransformNode("carryLeft", scene); left.parent = playerVisual; left.position.set(-0.27, 0.82, -0.42);
  const right = new B.TransformNode("carryRight", scene); right.parent = playerVisual; right.position.set(0.27, 0.82, -0.42);
  carryAnchors.push(center, left, right);
}

function buildRaccoon() {
  const fur = material("raccoonFur", "#777d83", 0.92);
  const dark = material("raccoonDark", "#272b31", 0.95);
  const light = material("raccoonLight", "#d7d4c9", 0.93);
  const white = material("raccoonEyeWhite", "#f7f6ec", 0.45);
  const iris = material("raccoonIris", "#17191d", 0.4);
  const mats = { dark, white, iris };

  // Rumpf: Kapsel mit hellem Bauch-Ei vorn und dunklem Rueckenstreifen hinten —
  // die Silhouette bekommt Vorder- und Rueckseite.
  const body = capsule("body", 0.43, 1.12, [0, 0.85, 0], fur); body.scaling.z = 0.86;
  const belly = sphere("belly", 0.6, [0, 0.88, -0.35], light); belly.scaling.set(0.75, 1.15, 0.2);
  const back = sphere("backStripe", 0.5, [0, 1.05, 0.33], dark); back.scaling.set(0.85, 1.3, 0.25);

  const HEAD_CENTER = [0, 1.57, -0.06];
  const HEAD_RADII = [0.41, 0.377, 0.394];
  const head = sphere("head", 0.82, HEAD_CENTER, fur); head.scaling.set(1, 0.92, 0.96);

  // Gesicht auf der Kopfoberflaeche: Wangen unten-seitlich, Brauen ueber den
  // Flecken, ein Maskensteg ueber der Nasenwurzel verbindet die zwei Flecken
  // zur klassischen Banditenmaske.
  const muzzle = sphere("muzzle", 0.5, [0, 1.44, -0.34], light); muzzle.scaling.set(0.85, 0.7, 0.6);
  const MUZZLE_RADII = [0.2125, 0.175, 0.15];
  for (const side of [-1, 1]) {
    faceDot("cheek", 0.26, light, HEAD_CENTER, HEAD_RADII, [side * 0.85, -0.25, -0.55], -0.035, [0.75, 0.9, 0.4]);
    faceDot("brow", 0.15, light, HEAD_CENTER, HEAD_RADII, [side * 0.32, 0.55, -0.85], -0.015, [1, 0.7, 0.35]);
  }
  faceDot("maskBridge", 0.24, dark, HEAD_CENTER, HEAD_RADII, [0, 0.18, -1], -0.035, [1.6, 0.5, 0.4]);
  const eyeSockets = buildEyes(HEAD_CENTER, HEAD_RADII, 0.4, mats, true);
  faceDot("nose", 0.17, material("raccoonNose", "#111318", 0.55), [0, 1.44, -0.34], MUZZLE_RADII, [0, 0.25, -1], -0.012, [1, 0.8, 0.75]);

  // Runde, zweifarbige Ohren, unten in der Kopfkugel eingelassen.
  for (const x of [-0.26, 0.26]) {
    const ear = sphere("ear", 0.34, [x, 1.9, 0], dark); ear.scaling.set(0.9, 1, 0.45); ear.rotation.z = x < 0 ? -0.25 : 0.25;
    const inner = sphere("earInner", 0.2, [x, 1.89, -0.07], light); inner.scaling.set(0.7, 0.85, 0.3); inner.rotation.z = ear.rotation.z;
  }

  // Zweigliedrige Arme und Beine mit Ellbogen und Knie. Pfoten und Fuesse
  // haengen an den Gelenk-Enden und machen jede Haltung automatisch mit.
  const armL = jointedLimb("leftArm", [-0.42, 1.28, 0], 0.34, 0.32, 0.105, fur, fur, fur);
  const armR = jointedLimb("rightArm", [0.42, 1.28, 0], 0.34, 0.32, 0.105, fur, fur, fur);
  const legL = jointedLimb("leftLeg", [-0.21, 0.6, 0], 0.3, 0.26, 0.13, fur, dark, fur);
  const legR = jointedLimb("rightLeg", [0.21, 0.6, 0], 0.3, 0.26, 0.13, fur, dark, fur);
  for (const arm of [armL, armR]) {
    const paw = B.MeshBuilder.CreateSphere("paw", { diameter: 0.18, segments: 10 }, scene);
    paw.parent = arm.tip;
    paw.position.set(0, -0.055, -0.015);
    paw.scaling.set(0.9, 1.35, 0.78);
    paw.material = dark;
  }
  for (const leg of [legL, legR]) {
    const foot = B.MeshBuilder.CreateSphere("foot", { diameter: 0.21, segments: 10 }, scene);
    foot.parent = leg.tip; foot.position.set(0, -0.03, -0.05); foot.scaling.set(1, 0.55, 1.5); foot.material = dark;
  }

  // Ringelschwanz aus der getesteten Spezifikation; die Spitze ist immer
  // dunkel — Waschbaerschwaenze enden dunkel.
  const tailRoot = new B.TransformNode("tailRoot", scene); tailRoot.parent = playerVisual; tailRoot.position.set(0, 0.88, 0.35);
  const tailSpec = raccoonTailSpec();
  tailSpec.forEach((segment, i) => {
    const ring = B.MeshBuilder.CreateCapsule("tail" + i, { radius: segment.radius, height: 0.5 }, scene);
    ring.parent = tailRoot; ring.position.set(...segment.position);
    ring.rotation.x = segment.rotationX;
    ring.material = i === tailSpec.length - 1 ? dark : (i % 2 === 0 ? dark : fur);
  });

  return {
    body, head, eyes: eyeSockets, eyeSockets,
    headCenter: HEAD_CENTER, headRadii: HEAD_RADII,
    leftArm: armL.root, leftElbow: armL.joint, rightArm: armR.root, rightElbow: armR.joint,
    leftArmRig: armL, rightArmRig: armR,
    leftLeg: legL.root, leftKnee: legL.joint, rightLeg: legR.root, rightKnee: legR.joint,
    tailRoot,
  };
}

function buildSquirrel() {
  const fur = material("squirrelFur", "#b66f3d", 0.93);
  const dark = material("squirrelDark", "#6c3f28", 0.95);
  const light = material("squirrelLight", "#efcc9d", 0.93);
  const white = material("squirrelEyeWhite", "#f7f6ec", 0.45);
  const iris = material("squirrelIris", "#201712", 0.4);
  const mats = { dark, white, iris };

  const body = capsule("body", 0.4, 1.06, [0, 0.82, 0], fur); body.scaling.z = 0.84;
  const belly = sphere("belly", 0.58, [0, 0.86, -0.34], light); belly.scaling.set(0.74, 1.12, 0.2);

  const HEAD_CENTER = [0, 1.55, -0.07];
  const HEAD_RADII = [0.3705, 0.3822, 0.3588];
  const head = sphere("head", 0.78, HEAD_CENTER, fur); head.scaling.set(0.95, 0.98, 0.92);
  const muzzle = sphere("muzzle", 0.42, [0, 1.45, -0.41], light); muzzle.scaling.set(0.85, 0.62, 0.55);
  const MUZZLE_RADII = [0.1785, 0.1302, 0.1155];
  for (const side of [-1, 1]) {
    faceDot("cheek", 0.22, light, HEAD_CENTER, HEAD_RADII, [side * 0.85, -0.3, -0.5], -0.03, [0.7, 0.85, 0.4]);
  }
  const eyeSockets = buildEyes(HEAD_CENTER, HEAD_RADII, 0.42, mats, false);
  faceDot("nose", 0.13, material("squirrelNose", "#201712", 0.6), [0, 1.45, -0.41], MUZZLE_RADII, [0, 0.25, -1], -0.01, [1, 0.8, 0.75]);

  // Spitze Ohren mit Pinsel-Tuffs — das Eichhoernchen-Erkennungszeichen.
  for (const x of [-0.25, 0.25]) {
    const ear = B.MeshBuilder.CreateCylinder("squirrelEar", { diameterTop: 0.03, diameterBottom: 0.24, height: 0.48, tessellation: 16 }, scene);
    ear.parent = playerVisual; ear.position.set(x, 1.98, -0.02); ear.rotation.z = x < 0 ? -0.16 : 0.16; ear.material = dark;
    sphere("earTuft", 0.11, [x + (x < 0 ? -0.035 : 0.035), 2.24, -0.02], fur);
  }

  const armL = jointedLimb("leftArm", [-0.41, 1.26, 0], 0.3, 0.3, 0.095, fur, fur, fur);
  const armR = jointedLimb("rightArm", [0.41, 1.26, 0], 0.3, 0.3, 0.095, fur, fur, fur);
  const legL = jointedLimb("leftLeg", [-0.19, 0.58, 0], 0.28, 0.24, 0.12, fur, dark, fur);
  const legR = jointedLimb("rightLeg", [0.19, 0.58, 0], 0.28, 0.24, 0.12, fur, dark, fur);
  for (const arm of [armL, armR]) {
    const paw = B.MeshBuilder.CreateSphere("paw", { diameter: 0.16, segments: 10 }, scene);
    paw.parent = arm.tip; paw.position.set(0, -0.02, 0); paw.material = dark;
  }
  for (const leg of [legL, legR]) {
    const foot = B.MeshBuilder.CreateSphere("foot", { diameter: 0.2, segments: 10 }, scene);
    foot.parent = leg.tip; foot.position.set(0, -0.03, -0.05); foot.scaling.set(1, 0.55, 1.45); foot.material = dark;
  }

  const tailRoot = new B.TransformNode("tailRoot", scene); tailRoot.parent = playerVisual; tailRoot.position.set(0, 0.72, 0.34);
  squirrelTailSpec().forEach((segment, i) => {
    const puff = sphere("squirrelTail" + i, segment.diameter, [0, 0, 0], i % 2 ? dark : fur);
    puff.parent = tailRoot;
    puff.position.set(...segment.position);
    puff.scaling.set(0.8, 1.1, 0.72);
  });

  return {
    body, head, eyes: eyeSockets, eyeSockets,
    headCenter: HEAD_CENTER, headRadii: HEAD_RADII,
    leftArm: armL.root, leftElbow: armL.joint, rightArm: armR.root, rightElbow: armR.joint,
    leftArmRig: armL, rightArmRig: armR,
    leftLeg: legL.root, leftKnee: legL.joint, rightLeg: legR.root, rightKnee: legR.joint,
    tailRoot,
  };
}

function capsule(name, radius, height, position, mat) {
  const mesh = B.MeshBuilder.CreateCapsule(name, { radius, height }, scene);
  mesh.parent = playerVisual; mesh.position.set(...position); mesh.material = mat; return mesh;
}
function sphere(name, diameter, position, mat) {
  const mesh = B.MeshBuilder.CreateSphere(name, { diameter, segments: 16 }, scene);
  mesh.parent = playerVisual; mesh.position.set(...position); mesh.material = mat; return mesh;
}
// Setzt ein flachgedruecktes Kugel-Detail AUF die Oberflaeche eines Ellipsoids:
// Position ueber surfacePoint entlang der Blickrichtung, Ausrichtung ueber
// facingRotation an die Oberflaechennormale geschmiegt. Damit liegen alle
// Gesichtsteile nachweislich auf der Haut statt an geratenen z-Werten.
function faceDot(name, diameter, mat, center, radii, dir, out, scale = null) {
  const mesh = B.MeshBuilder.CreateSphere(name, { diameter, segments: 14 }, scene);
  mesh.parent = playerVisual;
  const punkt = surfacePoint(radii, dir, out);
  mesh.position.set(center[0] + punkt[0], center[1] + punkt[1], center[2] + punkt[2]);
  const [pitch, yaw] = facingRotation(dir);
  mesh.rotation.set(pitch, yaw, 0);
  if (scale) mesh.scaling.set(...scale);
  mesh.material = mat;
  return mesh;
}

// Der Augen-Stapel liegt Schicht fuer Schicht auf demselben Normalen-Strahl:
// (Maskenfleck ->) Augenweiss -> Pupille -> Glanzlicht, jede Ebene strikt
// weiter aussen als die vorige. Das Glanzlicht sitzt leicht oben-innen — das
// gibt den Augen Leben. Liefert je Auge einen an der Oberflaeche
// ausgerichteten Anker fuer die Sonnenbrille.
function buildEyes(center, radii, spread, mats, withPatch) {
  const sockets = [];
  for (const side of [-1, 1]) {
    const dir = [side * spread, 0.2, -1];
    if (withPatch) faceDot("maskPatch", 0.33, mats.dark, center, radii, dir, -0.02, [0.85, 1, 0.4]);
    faceDot("eyeWhite", 0.19, mats.white, center, radii, dir, withPatch ? 0.035 : 0.008, [0.8, 1, 0.5]);
    faceDot("pupil", 0.09, mats.iris, center, radii, dir, withPatch ? 0.075 : 0.048);
    const glint = faceDot("eyeGlint", 0.035, mats.white, center, radii, dir, withPatch ? 0.1 : 0.07);
    glint.position.x -= side * 0.02;
    glint.position.y += 0.02;
    const socket = new B.TransformNode("eyeSocket", scene);
    socket.parent = playerVisual;
    const anker = surfacePoint(radii, dir, withPatch ? 0.09 : 0.06);
    socket.position.set(center[0] + anker[0], center[1] + anker[1], center[2] + anker[2]);
    const [pitch, yaw] = facingRotation(dir);
    socket.rotation.set(pitch, yaw, 0);
    sockets.push(socket);
  }
  return sockets;
}

// Zweigliedrige Gliedmasse: Schulter-/Hueft-Drehpunkt -> Oberteil -> Gelenk ->
// Unterteil -> Spitzen-Anker. Die Kappe am Drehpunkt verdeckt die Naht zum
// Rumpf. Die Animation greift am Wurzel- und am Gelenkknoten an — Pfoten und
// Baender haengen an den Segmenten und machen jede Pose automatisch mit.
function jointedLimb(name, pivot, upperLen, lowerLen, radius, upperMat, lowerMat, capMat) {
  const root = new B.TransformNode(name + "Root", scene);
  root.parent = playerVisual; root.position.set(...pivot);
  const cap = B.MeshBuilder.CreateSphere(name + "Cap", { diameter: radius * 2.7, segments: 12 }, scene);
  cap.parent = root; cap.scaling.set(1, 0.85, 1); cap.material = capMat;
  const upper = B.MeshBuilder.CreateCapsule(name + "Upper", { radius, height: upperLen + radius * 2 }, scene);
  upper.parent = root; upper.position.y = -upperLen / 2; upper.material = upperMat;
  const joint = new B.TransformNode(name + "Joint", scene);
  joint.parent = root; joint.position.y = -upperLen;
  const lower = B.MeshBuilder.CreateCapsule(name + "Lower", { radius: radius * 0.88, height: lowerLen + radius * 1.6 }, scene);
  lower.parent = joint; lower.position.y = -lowerLen / 2; lower.material = lowerMat;
  const tip = new B.TransformNode(name + "Tip", scene);
  tip.parent = joint; tip.position.y = -lowerLen;
  return { root, joint, tip, upperLen, lowerLen };
}

// Mischt eine Hex-Farbe Richtung Schwarz (factor < 0) oder Weiß (factor > 0)
// und liefert wieder Hex — damit Zierstreifen und Rahmen als abgesetzter Ton
// zur Grundfarbe des Accessoires passen, ohne eine zweite Farbe im Katalog.
function shadeColor(hex, factor) {
  const c = B.Color3.FromHexString(hex);
  const mix = (v) => Math.round(Math.max(0, Math.min(1, factor < 0 ? v * (1 + factor) : v + (1 - v) * factor)) * 255);
  return "#" + [mix(c.r), mix(c.g), mix(c.b)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

// Verbindet zwei lokale Punkte mit einer schlanken Kapsel und richtet deren
// Achse exakt auf die Verbindungsrichtung aus. So sind Brillenbügel und -steg
// real zwischen ihren Ankern verbaut, statt als lose Klötzchen im Raum zu
// liegen — jede Kopfform bekommt automatisch die passende Länge.
function strut(name, from, to, radius, mat, parent) {
  const a = new B.Vector3(from[0], from[1], from[2]);
  const b = new B.Vector3(to[0], to[1], to[2]);
  const span = b.subtract(a);
  const len = span.length();
  const mesh = B.MeshBuilder.CreateCapsule(name, { radius, height: Math.max(len, radius * 2) }, scene);
  mesh.parent = parent;
  mesh.position.copyFrom(a.add(b).scale(0.5));
  const axis = span.scale(1 / (len || 1));
  const dot = B.Scalar.Clamp(B.Vector3.Dot(B.Vector3.Up(), axis), -1, 1);
  let rotAxis = B.Vector3.Cross(B.Vector3.Up(), axis);
  if (rotAxis.lengthSquared() < 1e-6) rotAxis = B.Vector3.Right();
  mesh.rotationQuaternion = B.Quaternion.RotationAxis(rotAxis.normalize(), Math.acos(dot));
  mesh.material = mat;
  return mesh;
}

function applyCosmetics() {
  applyHeadband();
  if (save.equipped.face) applySunglasses();
  if (save.equipped.wrist) applyWristbands();
}

// Stirnband: ein flacher Ring, der an den Kopf-Ellipsoid geschmiegt ist —
// Höhe auf Brauenhöhe, Breite auf den Kopfquerschnitt skaliert, Front leicht
// abgesenkt. Ein Zierstreifen, ein seitlicher Knoten und zwei herabhängende
// Bänder machen aus dem Reifen ein wirklich gebundenes Stirnband.
function applyHeadband() {
  const headVisual = shopItem(save.equipped.head || "headband-lime")?.visual || { color: "#a7f46a" };
  const color = headVisual.color || "#a7f46a";
  const metallic = headVisual.metallic || 0;
  const bandMat = material("headbandMat", color, 0.5, metallic);
  const trimMat = material("headbandTrim", shadeColor(color, -0.32), 0.45, metallic);

  const center = playerParts.headCenter;
  const radii = playerParts.headRadii;
  const browFrac = 0.52;                                       // Anteil des vertikalen Radius über Kopfmitte
  const shrink = Math.sqrt(Math.max(0.2, 1 - browFrac * browFrac)); // horizontale Verjüngung auf Brauenhöhe
  const rx = radii[0] * shrink + 0.02;
  const rz = radii[2] * shrink + 0.02;

  const root = new B.TransformNode("headbandRoot", scene);
  root.parent = playerVisual;
  root.position.set(center[0], center[1] + radii[1] * browFrac, center[2]);
  root.rotation.x = -0.1;                                      // Front sinkt leicht auf die Braue

  const band = B.MeshBuilder.CreateTorus("cosmeticHeadband", { diameter: 2 * rx, thickness: 0.12, tessellation: 44 }, scene);
  band.parent = root; band.scaling.set(1, 0.6, rz / rx); band.material = bandMat;
  // Erhabener Mittelstreifen als Kontrast-Detail.
  const trim = B.MeshBuilder.CreateTorus("headbandTrim", { diameter: 2 * rx + 0.012, thickness: 0.12, tessellation: 44 }, scene);
  trim.parent = root; trim.scaling.set(1, 0.24, rz / rx); trim.material = trimMat;

  // Seitlicher Knoten mit zwei herabfallenden Bändern (hinten-links am Kopf).
  const knotAngle = 2.5;
  const kx = Math.cos(knotAngle) * rx;
  const kz = Math.sin(knotAngle) * rz;
  const knot = B.MeshBuilder.CreateSphere("headbandKnot", { diameter: 0.14, segments: 12 }, scene);
  knot.parent = root; knot.position.set(kx, 0, kz); knot.scaling.set(1.3, 0.95, 0.85); knot.material = bandMat;
  for (const t of [-1, 1]) {
    const tail = B.MeshBuilder.CreateCapsule("headbandTail", { radius: 0.03, height: 0.34 }, scene);
    tail.parent = root;
    tail.position.set(kx + t * 0.05, -0.17, kz + 0.02);
    tail.rotation.x = 0.55; tail.rotation.z = t * 0.28;
    tail.material = t < 0 ? bandMat : trimMat;
  }
}

// Sonnenbrille: gewölbte ovale Gläser mit eigener Fassung, verbunden durch
// einen erhöhten Nasensteg und zwei Bügeln, die entlang der Kopfseiten zu den
// Ohren laufen. Gläser und Fassung hängen an den Augen-Ankern (exakt vor der
// Pupille), Steg und Bügel werden aus denselben Ankern im Körperraum verbaut.
function applySunglasses() {
  const faceVisual = shopItem(save.equipped.face)?.visual || { color: "#151b24" };
  const lensColor = faceVisual.color || "#151b24";
  const lensMat = new B.PBRMaterial("sunglassLens", scene);
  lensMat.albedoColor = B.Color3.FromHexString(lensColor);
  lensMat.roughness = 0.14;
  lensMat.metallic = faceVisual.metallic ?? 0.2;
  lensMat.alpha = 0.92;                                        // Gläser wirken leicht durchscheinend
  lensMat.emissiveColor = B.Color3.FromHexString(lensColor).scale(0.22);
  const frameMat = material("sunglassFrame", shadeColor(lensColor, -0.45), 0.35, 0.4);

  const sockets = playerParts.eyeSockets;
  for (const socket of sockets) {
    const lens = B.MeshBuilder.CreateSphere("sunglassLens", { diameter: 0.2, segments: 18 }, scene);
    lens.parent = socket; lens.position.set(0, 0, 0.022); lens.scaling.set(1.18, 0.82, 0.34); lens.material = lensMat;
    const rim = B.MeshBuilder.CreateTorus("sunglassRim", { diameter: 0.24, thickness: 0.03, tessellation: 26 }, scene);
    rim.parent = socket; rim.position.set(0, 0, 0.03); rim.rotation.x = Math.PI / 2;
    rim.scaling.set(1.06, 1, 0.78); rim.material = frameMat;
  }

  const [l, r] = sockets;
  const sign = [-1, 1];
  // Nasensteg leicht erhöht zwischen den Innenkanten der beiden Fassungen.
  strut("sunglassBridge",
    [l.position.x + 0.055, l.position.y + 0.03, l.position.z],
    [r.position.x - 0.055, r.position.y + 0.03, r.position.z],
    0.022, frameMat, playerVisual);

  // Bügel: von der Außenkante jedes Glases seitlich am Kopf entlang nach hinten
  // bis kurz vor die Ohren, plus ein kurzer Bogen als Ohrbügel.
  const center = playerParts.headCenter;
  const radii = playerParts.headRadii;
  sockets.forEach((socket, i) => {
    const s = sign[i];
    const start = [socket.position.x + s * 0.11, socket.position.y + 0.02, socket.position.z + 0.02];
    // Ohr-Anker exakt auf der Kopf-Ellipse (seitlich und leicht nach hinten),
    // damit Bügelende und Ohrbügel an der Schläfe anliegen statt abzustehen.
    const earPt = surfacePoint(radii, [s, 0.35, 0.8], 0.02);
    const ear = [center[0] + earPt[0], center[1] + earPt[1], center[2] + earPt[2]];
    strut("sunglassTemple", start, ear, 0.02, frameMat, playerVisual);
    const hook = B.MeshBuilder.CreateCapsule("sunglassHook", { radius: 0.019, height: 0.1 }, scene);
    hook.parent = playerVisual; hook.position.set(ear[0], ear[1] - 0.045, ear[2] + 0.02); hook.material = frameMat;
  });
}

// Schweißbänder: ein voller Frottee-Bulge (Zylinder) am Handgelenk mit zwei
// abgesetzten Zierringen, sitzt am Unterarm nahe der Pfote und macht jede
// Ellbogenbeugung automatisch mit.
function applyWristbands() {
  const wristVisual = shopItem(save.equipped.wrist)?.visual || { color: "#f7f6f1" };
  const color = wristVisual.color || "#f7f6f1";
  const metallic = wristVisual.metallic || 0;
  const cuffMat = material("wristCuff", color, 0.94, metallic);
  const trimMat = material("wristTrim", shadeColor(color, -0.22), 0.9, metallic);
  // An der tatsächlichen Unterarmlänge ausgerichtet: die Manschette sitzt bei
  // beiden Critter gleich nah am Handgelenk und hält Abstand zur Pfote.
  for (const rig of [playerParts.leftArmRig, playerParts.rightArmRig]) {
    const y = -rig.lowerLen * 0.72;
    const cuff = B.MeshBuilder.CreateCylinder("wristband", { diameter: 0.215, height: 0.13, tessellation: 22 }, scene);
    cuff.parent = rig.joint; cuff.position.y = y; cuff.material = cuffMat;
    for (const off of [-0.05, 0.05]) {
      const ring = B.MeshBuilder.CreateTorus("wristbandTrim", { diameter: 0.225, thickness: 0.024, tessellation: 22 }, scene);
      ring.parent = rig.joint; ring.position.y = y + off; ring.material = trimMat;
    }
  }
}

function createCamera() {
  camera = new B.ArcRotateCamera("camera", Math.PI / 2, 1.03, 5.6, player.position.add(new B.Vector3(0, 0.75, 0)), scene);
  camera.lowerRadiusLimit = 3.15; camera.upperRadiusLimit = 6.1; camera.lowerBetaLimit = 1.1; camera.upperBetaLimit = 1.32;
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
  const desired = itemCountForMode(mode, currentLevelSettings().itemAmount);
  return buildRoundTypes({
    levelId,
    desired,
    itemWeights: level.itemWeights,
  }).map((type) => ({ type }));
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
  const spawnPool = state.tutorial
    ? [[-2.5, -1.2]]
    : planSpawnPositions({
      pool: LEVELS[state.level].spawnPool,
      count: specs.length,
      start: LEVELS[state.level].start,
      obstacles,
      avoidAreas: zones.map((zone) => ({
        position: [zone.position.x, zone.position.z],
        radius: zone.radius,
      })),
      levelId: state.level,
    });
  specs.forEach((spec, index) => {
    const type = spec.type;
    const definition = ITEM_TYPES[type];
    const [x, z] = spawnPool[index];
    const root = new B.TransformNode(`item-${index}`, scene);
    root.position.set(x, 0.12, z);
    root.metadata = { baseY: 0.12, spinSpeed: 0.45 + (index % 3) * 0.08 };
    const hazardRing = createHazardRing(root, index, definition.weight);
    const meshes = createItemMesh(type, root, index);
    meshes.forEach((mesh) => { mesh.isPickable = false; shadowGenerator.addShadowCaster(mesh); });
    const wave = state.tutorial ? 0 : waveForItem(state.level, index, specs.length);
    const active = wave <= state.activeWave;
    root.setEnabled(active);
    const item = {
      id: `item-${index}`, type, label: definition.label, points: definition.points, targetZone: definition.targetZone,
      weight: definition.weight, root, meshes, hazardRing, delivered: false, tutorial: Boolean(spec.tutorial), wave, active,
    };
    items.push(item);
    if (active) animateItemReveal(item, index * 34);
  });
}

function updateShiftDirector(initial = false) {
  if (state.tutorial || !items.length) return;
  const nextWave = unlockedWave(state.delivered, items.length, currentLevelSettings().dynamics, state.level);
  if (nextWave > state.activeWave) {
    state.activeWave = nextWave;
    let activated = 0;
    for (const item of items) {
      if (!item.active && item.wave <= state.activeWave) {
        item.active = true;
        item.root.setEnabled(true);
        animateItemReveal(item, activated * 55);
        activated += 1;
      }
    }
    if (activated && !initial) {
      showToast(`Neue Chaos-Welle: ${activated} Gegenstände`, "good");
      audio.play("wave");
    }
  }
  const event = shiftEvent(state.level, state.delivered, items.length);
  if (event.id !== state.shiftEventId) {
    state.shiftEventId = event.id;
    if (!initial) {
      showToast(event.title, "good");
      characterSays(event.description);
    }
  }
  updateShiftStatus();
}

function updateShiftStatus() {
  if (state.tutorial || !items.length || !state.playing || state.ended) {
    ui.shiftStatus.classList.add("hidden");
    return;
  }
  const dynamics = currentLevelSettings().dynamics;
  const phase = shiftPhase(state.delivered, items.length);
  const event = shiftEvent(state.level, state.delivered, items.length);
  const targets = event.types
    ? event.types.map((type) => ITEM_TYPES[type]?.icon).filter(Boolean).join(" ")
    : "Schwer & sperrig";
  ui.shiftPhase.textContent = `${shiftPhaseLabel(phase)} · Welle ${state.activeWave + 1}/3`;
  ui.shiftEventTitle.textContent = event.title;
  ui.shiftEventBonus.textContent = `${targets} +${shiftEventBonusPercent(event, dynamics)} % Bonus`;
  [...ui.shiftWaveDots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index <= state.activeWave);
  });
  ui.shiftStatus.classList.remove("hidden");
}

function createHazardRing(root, index, weight) {
  const diameter = weight === "bulky" ? 1.52 : weight === "heavy" ? 1.28 : 1.04;
  const ring = B.MeshBuilder.CreateTorus(`hazardCue-${index}`, {
    diameter,
    thickness: weight === "bulky" ? 0.035 : 0.028,
    tessellation: qualityTier() === "low" ? 18 : 30,
  }, scene);
  ring.parent = root;
  ring.position.y = -0.087;
  ring.isPickable = false;
  ring.visibility = 0;
  const ringMaterial = material(`hazardCueMat-${index}`, weight === "bulky" ? "#ff8f66" : "#ffb25f", 0.68);
  ringMaterial.emissiveColor = B.Color3.FromHexString(weight === "bulky" ? "#ff704f" : "#ff9f43").scale(0.68);
  ringMaterial.unlit = true;
  ring.material = ringMaterial;
  return ring;
}

function animateItemReveal(item, delay = 0) {
  if (!item?.root) return;
  const reduced = prefersReducedMotion();
  const started = performance.now() + Math.max(0, delay);
  const duration = reduced ? 240 : 560;
  item.root.metadata.revealPulse = 1;
  item.root.scaling.setAll(reduced ? 1 : 0.18);
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = Math.max(0, Math.min(1, (performance.now() - started) / duration));
    if (!reduced) {
      const eased = 1 - Math.pow(1 - t, 3);
      const overshoot = Math.sin(t * Math.PI) * 0.11;
      item.root.scaling.setAll(0.18 + eased * 0.82 + overshoot);
    }
    item.root.metadata.revealPulse = 1 - t;
    if (t < 1) return;
    item.root.scaling.setAll(1);
    item.root.metadata.revealPulse = 0;
    scene.onBeforeRenderObservable.remove(observer);
    deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
  });
  deliveryObservers.push(observer);
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
  const matSurface = material(`floorMat${index}`, colors[index % colors.length], 0.92);
  matSurface.alpha = 1;
  matSurface.transparencyMode = 0;
  matSurface.forceDepthWrite = true;
  matMesh.parent = root; matMesh.rotation.z = Math.PI / 2; matMesh.position.y = 0.28; matMesh.material = matSurface;
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
  ropeMat.emissiveColor = B.Color3.FromHexString(colors[index % colors.length]).scale(0.08);
  const gripMat = material(`ropeGripMat${index}`, "#252a33", 0.72, 0.12);
  const collarMat = material(`ropeCollarMat${index}`, "#d7dbe1", 0.34, 0.62);
  const path = ROPE_ITEM_LAYOUT.path.map(([x, y, z]) => new B.Vector3(x, y, z));
  const cable = B.MeshBuilder.CreateTube("jumpRopeCable", {
    path,
    radius: ROPE_ITEM_LAYOUT.cableRadius,
    tessellation: 12,
    cap: B.Mesh.CAP_ALL,
  }, scene);
  cable.parent = root;
  cable.material = ropeMat;
  const meshes = [cable];

  for (const x of [-ROPE_ITEM_LAYOUT.handleX, ROPE_ITEM_LAYOUT.handleX]) {
    const handle = B.MeshBuilder.CreateCylinder("jumpRopeHandle", {
      diameter: ROPE_ITEM_LAYOUT.handleDiameter,
      height: ROPE_ITEM_LAYOUT.handleLength,
      tessellation: 14,
    }, scene);
    handle.parent = root;
    handle.position.set(x, ROPE_ITEM_LAYOUT.handleY, ROPE_ITEM_LAYOUT.handleCenterZ);
    handle.rotation.x = Math.PI / 2;
    handle.material = gripMat;
    meshes.push(handle);

    for (const z of [
      ROPE_ITEM_LAYOUT.handleCenterZ - ROPE_ITEM_LAYOUT.handleLength / 2 + 0.035,
      ROPE_ITEM_LAYOUT.handleCenterZ + ROPE_ITEM_LAYOUT.handleLength / 2 - 0.035,
    ]) {
      const gripRing = B.MeshBuilder.CreateTorus("jumpRopeGripRing", {
        diameter: ROPE_ITEM_LAYOUT.handleDiameter * 1.04,
        thickness: 0.016,
        tessellation: 12,
      }, scene);
      gripRing.parent = root;
      gripRing.position.set(x, ROPE_ITEM_LAYOUT.handleY, z);
      gripRing.rotation.x = Math.PI / 2;
      gripRing.material = collarMat;
      meshes.push(gripRing);
    }
  }
  return meshes;
}

function createMedballItem(root, index) {
  const colors = ["#d36b61", "#6aabd8", "#a7f46a"];
  const ballMat = material(`medballMat${index}`, colors[index % colors.length], 0.7);
  const seamMat = material(`medballSeam${index}`, "#242832", 0.82);
  const ball = B.MeshBuilder.CreateSphere("medball", { diameter: MEDBALL_DIAMETER, segments: 20 }, scene);
  ball.parent = root; ball.position.y = MEDBALL_DIAMETER / 2; ball.material = ballMat;
  const meshes = [ball];
  for (const [rotationX, rotationZ] of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2]]) {
    const seam = B.MeshBuilder.CreateTorus("medballSeam", {
      diameter: MEDBALL_DIAMETER * 1.008,
      thickness: 0.018,
      tessellation: 28,
    }, scene);
    seam.parent = root;
    seam.position.y = MEDBALL_DIAMETER / 2;
    seam.rotation.set(rotationX, 0, rotationZ);
    seam.material = seamMat;
    meshes.push(seam);
  }
  return meshes;
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
  if (!state.tutorial) state.roundElapsed += dt;
  if (!state.tutorial && MODES[state.mode].timed !== false && !updateTimer(dt)) return;
  if (!state.tutorial && MODES[state.mode].timed === false) updateUntimedHud(dt);
  updateComboTimer(dt);
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
  updateCameraOcclusion(dt);
}

function updateCameraOcclusion(dt) {
  const direction = camera.position.subtract(camera.target);
  if (direction.lengthSquared() < 0.001) return;
  direction.normalize();
  if (!state.cameraOccluded) state.cameraPreferredRadius = camera.radius;
  const ray = new B.Ray(camera.target, direction, state.cameraPreferredRadius);
  const hit = scene.pickWithRay(ray, (mesh) => {
    if (!mesh.isVisible || !mesh.isEnabled() || mesh === player || mesh.isDescendantOf(player)) return false;
    if (mesh.name.startsWith("zone-") || mesh.name.startsWith("beacon-")) return false;
    let node = mesh.parent;
    while (node) {
      if (node.name?.startsWith("item-")) return false;
      node = node.parent;
    }
    return mesh.isPickable;
  });
  const occluded = Boolean(hit?.hit && hit.distance > 0.45 && hit.distance < state.cameraPreferredRadius - 0.15);
  const targetRadius = occluded
    ? Math.max(camera.lowerRadiusLimit, hit.distance - 0.24)
    : state.cameraPreferredRadius;
  camera.radius = B.Scalar.Lerp(camera.radius, targetRadius, 1 - Math.exp(-(occluded ? 18 : 7) * dt));
  state.cameraOccluded = occluded;
}

function resetCamera(showFeedback = true) {
  if (!camera || !player) return;
  camera.alpha = cameraAlphaBehind(player.rotation.y);
  camera.beta = 1.03;
  camera.radius = 5.6;
  state.cameraPreferredRadius = 5.6;
  state.cameraOccluded = false;
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

function updateUntimedHud(dt) {
  state.hudAccumulator += dt;
  if (state.hudAccumulator < 0.1) return;
  state.hudAccumulator = 0;
  updateHUD();
}

function currentCharacter() {
  return CHARACTERS[state.character] || CHARACTERS.raccoon;
}

function carryingHeavy() {
  return state.heldItems.some((item) => item.weight === "heavy" || item.weight === "bulky");
}

function updatePlayer(dt) {
  state.tripCooldown = Math.max(0, state.tripCooldown - dt);
  if (state.tripTime > 0) {
    state.tripTime = Math.max(0, state.tripTime - dt);
    state.velocity.scaleInPlace(Math.exp(-9 * dt));
    animateCharacter(dt, false, false);
    return;
  }

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

  const hazard = state.tutorial ? null : selectTripHazard({
    position: player.position,
    velocity: state.velocity,
    cooldown: state.tripCooldown,
    risk: currentLevelSettings().tripRisk,
    items: items.map((item) => ({
      source: item,
      active: item.active,
      delivered: item.delivered,
      held: state.heldItems.includes(item),
      weight: item.weight,
      position: item.root.getAbsolutePosition(),
    })),
  });
  if (hazard) {
    triggerTrip(hazard.source);
    animateCharacter(dt, false, false);
    return;
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
    // Die Haltung zeigt, was geschleppt wird: schwer haengt tief, der Ellbogen
    // traegt die eigentliche Beugung — erst das Gelenk macht Halten sichtbar.
    const pose = carryPose(weight);
    applyCarryIK();
    playerVisual.rotation.x = B.Scalar.Lerp(playerVisual.rotation.x, pose.torsoLean, 0.15);
  } else {
    playerParts.leftArm.rotationQuaternion = null;
    playerParts.rightArm.rotationQuaternion = null;
    playerParts.leftElbow.rotationQuaternion = null;
    playerParts.rightElbow.rotationQuaternion = null;
    playerParts.leftArm.rotation.x = armSwing;
    playerParts.rightArm.rotation.x = -armSwing;
    playerParts.leftArm.rotation.z = state.character === "squirrel" ? -0.17 : -0.22;
    playerParts.rightArm.rotation.z = state.character === "squirrel" ? 0.17 : 0.22;
    // Positive X-Rotation beugt den Unterarm zur Vorderseite (-Z).
    playerParts.leftElbow.rotation.x = 0.18 + Math.max(0, Math.sin(phase)) * 0.3 * gait.intensity;
    playerParts.rightElbow.rotation.x = 0.18 + Math.max(0, -Math.sin(phase)) * 0.3 * gait.intensity;
    playerVisual.rotation.x = B.Scalar.Lerp(playerVisual.rotation.x, 0, 0.15);
  }
  playerParts.leftLeg.rotation.x = -legSwing;
  playerParts.rightLeg.rotation.x = legSwing;
  // Das Knie beugt beim Durchschwingen — echtes Schreiten statt steifem Pendel.
  playerParts.leftKnee.rotation.x = 0.55 * gait.intensity * Math.max(0, Math.sin(phase + 0.4));
  playerParts.rightKnee.rotation.x = 0.55 * gait.intensity * Math.max(0, -Math.sin(phase + 0.4));
  const idle = !moving && !state.heldItems.length ? idleMotion(state.elapsed) : null;
  playerParts.body.scaling.y = 1 + (idle ? idle.breath : 0);
  playerParts.tailRoot.rotation.y = Math.sin(state.elapsed * (state.character === "squirrel" ? 4 : 3.2)) * 0.28 + (idle ? idle.tailFlick : 0);
  playerParts.tailRoot.rotation.x = 0.13 + Math.sin(state.elapsed * 2.1) * 0.06;
  playerVisual.position.y = -0.84 + Math.abs(Math.sin(phase)) * 0.035 * gait.intensity * gait.bob;
  updateReaction(dt);
}

function updateComboTimer(dt) {
  if (state.combo <= 0 || state.comboTime <= 0) return;
  state.comboTime = Math.max(0, state.comboTime - dt);
  if (state.comboTime > 0) return;
  state.combo = 0;
  audio.play("comboBreak");
  showToast("Serie abgelaufen", "bad");
  updateHUD();
}

function comboWindowSeconds() {
  return state.mode === "relaxed" ? 18 : state.mode === "blitz" ? 10 : 14;
}

function applyCarryIK() {
  const single = state.heldItems.length === 1 ? state.heldItems[0] : null;
  const profile = CARRY_PROFILES[single?.type] || CARRY_PROFILES.towel;
  const targets = single
    ? {
        left: [-profile.gripX, profile.gripY, carryAnchors[0].position.z],
        right: [profile.gripX, profile.gripY, carryAnchors[0].position.z],
      }
    : {
        left: [carryAnchors[1].position.x, 0.84, carryAnchors[1].position.z],
        right: [carryAnchors[2].position.x, 0.84, carryAnchors[2].position.z],
      };
  applyArmIK(playerParts.leftArmRig, targets.left, [-0.82, 1.02, -0.08]);
  applyArmIK(playerParts.rightArmRig, targets.right, [0.82, 1.02, -0.08]);
}

function applyArmIK(rig, target, pole) {
  const shoulder = [rig.root.position.x, rig.root.position.y, rig.root.position.z];
  const solved = solveTwoBoneIK({
    shoulder,
    target,
    pole,
    upperLength: rig.upperLen,
    lowerLength: rig.lowerLen,
  });
  const upperDirection = new B.Vector3(
    solved.elbow[0] - shoulder[0],
    solved.elbow[1] - shoulder[1],
    solved.elbow[2] - shoulder[2],
  ).normalize();
  const lowerDirection = new B.Vector3(
    solved.target[0] - solved.elbow[0],
    solved.target[1] - solved.elbow[1],
    solved.target[2] - solved.elbow[2],
  ).normalize();
  const down = new B.Vector3(0, -1, 0);
  const upperRotation = rotationBetween(down, upperDirection);
  const upperMatrix = B.Matrix.Identity();
  B.Matrix.FromQuaternionToRef(upperRotation, upperMatrix);
  upperMatrix.invert();
  const lowerLocalDirection = B.Vector3.TransformNormal(lowerDirection, upperMatrix).normalize();
  const lowerRotation = rotationBetween(down, lowerLocalDirection);
  rig.root.rotationQuaternion = rig.root.rotationQuaternion
    ? B.Quaternion.Slerp(rig.root.rotationQuaternion, upperRotation, 0.28)
    : upperRotation;
  rig.joint.rotationQuaternion = rig.joint.rotationQuaternion
    ? B.Quaternion.Slerp(rig.joint.rotationQuaternion, lowerRotation, 0.28)
    : lowerRotation;
}

function rotationBetween(from, to) {
  const dot = B.Scalar.Clamp(B.Vector3.Dot(from, to), -1, 1);
  if (dot < -0.9999) return B.Quaternion.RotationAxis(B.Axis.X, Math.PI);
  const axis = B.Vector3.Cross(from, to);
  const quaternion = new B.Quaternion(axis.x, axis.y, axis.z, 1 + dot);
  return quaternion.normalize();
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
  if (state.reaction.type === "trip") {
    const phase = Math.min(1, elapsed / state.reaction.duration);
    const stumble = Math.sin(phase * Math.PI);
    playerVisual.rotation.x = 0.52 * stumble;
    playerVisual.rotation.z = state.reaction.side * 0.18 * stumble;
    playerVisual.position.y = -0.84 - 0.09 * stumble;
  }
  if (state.reaction.type === "celebrate") {
    playerVisual.rotation.y = Math.sin(elapsed * 8) * 0.35;
    playerVisual.position.y = -0.84 + Math.abs(Math.sin(elapsed * 8)) * 0.14;
  }
  if (state.reaction.time <= 0) state.reaction = { type: null, time: 0, duration: 0 };
}

function updateTrail(dt, active) {
  if (!save.equipped.trail || !active || qualityTier() === "low" || prefersReducedMotion()) return;
  trailAccumulator += dt;
  if (trailAccumulator < 0.08) return;
  trailAccumulator = 0;
  let entry = trailSparkPool.find((candidate) => !candidate.active);
  if (!entry && trailSparkPool.length < 14) {
    const mesh = B.MeshBuilder.CreateSphere("trailSpark", { diameter: 0.09, segments: 5 }, scene);
    const sparkMaterial = new B.StandardMaterial("trailSparkMat", scene);
    mesh.material = sparkMaterial;
    mesh.setEnabled(false);
    entry = { mesh, material: sparkMaterial, active: false, age: 0 };
    trailSparkPool.push(entry);
  }
  if (!entry) entry = trailSparkPool.reduce((oldest, candidate) => candidate.age > oldest.age ? candidate : oldest);
  entry.active = true;
  entry.age = 0;
  entry.mesh.setEnabled(true);
  entry.mesh.position.copyFrom(player.position.add(new B.Vector3((Math.random() - 0.5) * 0.45, 0.22, (Math.random() - 0.5) * 0.45)));
  entry.mesh.scaling.setAll(1);
  const trailVisual = shopItem(save.equipped.trail)?.visual || { primary: "#ffd66e", secondary: "#fff2b0" };
  const sparkColor = B.Color3.FromHexString(Math.random() > 0.5 ? trailVisual.primary : (trailVisual.secondary || trailVisual.primary));
  entry.material.diffuseColor = sparkColor;
  entry.material.emissiveColor = sparkColor.scale(0.55);
}

function animateTrailSparks(dt) {
  for (const entry of trailSparkPool) {
    if (!entry.active) continue;
    entry.age += dt;
    const t = entry.age / 0.42;
    if (t >= 1) {
      entry.active = false;
      entry.mesh.setEnabled(false);
      continue;
    }
    entry.mesh.position.y += dt * 0.42;
    entry.mesh.scaling.setAll(1 - t);
  }
}

function animateWorld(dt) {
  if (state.paused) return;
  animateTrailSparks(dt);
  for (const item of items) {
    const held = state.heldItems.includes(item);
    if (item.hazardRing) {
      if (!item.active || item.delivered || held || !state.playing) {
        item.hazardRing.visibility = 0;
      } else {
        const intensity = state.tutorial ? 0 : hazardCueIntensity({
          distance: horizontalDistance(player.position, item.root.getAbsolutePosition()),
          speed: Math.hypot(state.velocity.x, state.velocity.z),
          weight: item.weight,
          risk: currentLevelSettings().tripRisk,
        });
        const reveal = Math.max(0, Number(item.root.metadata.revealPulse) || 0) * 0.62;
        const targetVisibility = Math.max(intensity, reveal);
        item.hazardRing.visibility = B.Scalar.Lerp(item.hazardRing.visibility, targetVisibility, 1 - Math.exp(-12 * dt));
        const pulse = 1 + targetVisibility * (0.06 + Math.sin(state.elapsed * 7.2) * 0.025);
        item.hazardRing.scaling.setAll(pulse);
      }
    }
    if (!item.active || item.delivered || held) continue;
    item.root.rotation.y += item.root.metadata.spinSpeed * dt;
    item.root.position.y = item.root.metadata.baseY + Math.sin(state.elapsed * 2.3 + Number(item.id.split("-")[1])) * 0.025;
  }
  if (!state.playing && state.reaction.type) updateReaction(dt);
}

function canPickUp(item) {
  if (!item || !item.active || item.delivered) return false;
  const character = currentCharacter();
  if (item.weight === "heavy" || item.weight === "bulky") return state.heldItems.length === 0;
  if (carryingHeavy()) return false;
  return state.heldItems.length < character.lightCapacity;
}

function pickupBlockReason(item) {
  if (!item || canPickUp(item)) return "";
  if (item.weight === "heavy" || item.weight === "bulky") return `${item.label} braucht beide Pfoten`;
  if (carryingHeavy()) return "Schwere Last zuerst ablegen";
  return "Pfoten voll";
}

function updateInteraction() {
  const actionKey = isTouchDevice ? "Aktion" : "E";
  state.nearestItem = null;
  state.nearestZone = null;
  let bestItemScore = Infinity;
  for (const item of items) {
    if (!item.active || item.delivered || state.heldItems.includes(item)) continue;
    const itemPosition = item.root.getAbsolutePosition();
    if (!hasClearLineOfSight(player.position, itemPosition, obstacles, state.level)) continue;
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
    } else if (state.nearestItem) {
      highlightItem(state.nearestItem);
      if (canPickUp(state.nearestItem)) {
        setPrompt(`<kbd>${actionKey}</kbd>${state.nearestItem.label} zusätzlich aufnehmen`);
      } else {
        setPrompt(`<kbd>${actionKey}</kbd>${state.heldItems.at(-1).label} ablegen · ${pickupBlockReason(state.nearestItem)}`);
      }
    } else {
      clearItemHighlight();
      setPrompt(`<kbd>${actionKey}</kbd>${state.heldItems.at(-1).label} sicher ablegen`);
    }
  } else {
    ui.objective.classList.remove("carrying");
    const event = state.tutorial ? null : shiftEvent(state.level, state.delivered, items.length);
    ui.objective.textContent = state.tutorial
      ? "Deine erste Aufgabe: Räume das Handtuch auf."
      : `${event.title} · Noch ${items.length - state.delivered} Gegenstände`;
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
  const policy = state.tutorial ? "always" : navigatorPolicy(MODES[state.mode], currentLevelSettings().guidance);
  if (policy === "off" || (policy === "carrying" && !state.heldItems.length)) {
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
      if (!item.active || item.delivered) continue;
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
    const profile = CARRY_PROFILES[item.type] || CARRY_PROFILES.towel;
    const absoluteStart = item.root.getAbsolutePosition().clone();
    item.root.parent = anchor;
    const targetPosition = new B.Vector3(0, profile.rootY, 0);
    const targetScaleValue = profile.scale;
    if (!animate) {
      item.root.position.copyFrom(targetPosition); item.root.rotation.set(0, 0, profile.rotationZ); item.root.scaling.setAll(targetScaleValue); return;
    }
    item.root.parent = null; item.root.position.copyFrom(absoluteStart);
    const started = performance.now();
    const observer = scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - started) / 230);
      const eased = 1 - Math.pow(1 - t, 3);
      const targetAbsolute = B.Vector3.TransformCoordinates(targetPosition, anchor.getWorldMatrix());
      const position = B.Vector3.Lerp(absoluteStart, targetAbsolute, eased); position.y += Math.sin(Math.PI * t) * 0.35;
      item.root.position.copyFrom(position); item.root.scaling.setAll(B.Scalar.Lerp(1, targetScaleValue, eased));
      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        item.root.parent = anchor; item.root.position.copyFrom(targetPosition); item.root.rotation.set(0, 0, profile.rotationZ); item.root.scaling.setAll(targetScaleValue);
      }
    });
  });
}

function dropLastItem() {
  const item = state.heldItems.pop();
  if (!item) return;
  placeHeldItemOnFloor(item, player.rotation.y);
  state.droppedItems += 1;
  reflowHeldItems(false);
  audio.play("drop"); vibrate(12); showToast(`${item.label} sicher abgelegt`, ""); updateHUD();
}

function placeHeldItemOnFloor(item, baseAngle) {
  const absolute = item.root.getAbsolutePosition().clone();
  item.root.parent = null;
  item.root.position.copyFrom(absolute);
  item.root.position.copyFrom(findSafeDropPosition(baseAngle));
  item.root.scaling.setAll(1);
  item.root.rotation.set(0, 0, 0);
}

function findSafeDropPosition(baseAngle = player.rotation.y) {
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

function triggerTrip(hazard) {
  const risk = tripRule(currentLevelSettings().tripRisk);
  const dropped = [...state.heldItems];
  state.heldItems = [];
  dropped.forEach((item, index) => {
    const spread = dropped.length > 1 ? (index === 0 ? -0.72 : 0.72) : 0;
    placeHeldItemOnFloor(item, player.rotation.y + Math.PI + spread);
  });
  state.droppedItems += dropped.length;
  state.trips += 1;
  state.tripTime = prefersReducedMotion() ? Math.min(0.35, risk.stumbleDuration) : risk.stumbleDuration;
  state.tripCooldown = risk.cooldown;
  state.combo = 0;
  state.comboTime = 0;
  state.velocity.scaleInPlace(-0.12);
  state.lean = 0;
  setReaction("trip", state.tripTime);
  state.reaction.side = hazard.root.position.x >= player.position.x ? 1 : -1;
  clearItemHighlight();
  reflowHeldItems(false);
  audio.play("trip");
  vibrate([35, 25, 55]);
  showToast(dropped.length ? `Gestolpert – ${dropped.length > 1 ? "alles" : dropped[0].label} fallen gelassen!` : "Hoppla – über etwas gestolpert!", "bad");
  characterSays(state.character === "squirrel" ? "Uff! Alles noch dran?" : "Rocco, Augen auf den Boden!");
  updateHUD();
}

function isDropPositionFree(position) {
  if (Math.abs(position.x) > CONFIG.roomHalfX - 0.7 || Math.abs(position.z) > CONFIG.roomHalfZ - 0.7) return false;
  for (const obstacle of obstacles) {
    if (obstacle.level && obstacle.level !== state.level) continue;
    if (Math.abs(position.x - obstacle.x) < obstacle.halfX + 0.45 && Math.abs(position.z - obstacle.z) < obstacle.halfZ + 0.45) return false;
  }
  return items.every((item) => !item.active || item.delivered || state.heldItems.includes(item) || horizontalDistance(position, item.root.getAbsolutePosition()) > 0.75);
}

function deliverAtZone(zone) {
  const matching = state.heldItems.filter((item) => item.targetZone === zone.id);
  if (!matching.length) {
    // Eine Serie ist nur dann etwas wert, wenn ihr Verlust hörbar ist. Ab drei
    // Gegenständen rutscht die Tonleiter vernehmbar wieder herunter; darunter
    // gab es nichts zu verlieren und der Fehlerton allein genügt.
    const hatteSerie = state.combo >= 3;
    state.combo = 0; state.comboTime = 0; state.wrongPlacements += 1; audio.play("wrong"); vibrate([30, 30, 30]); setReaction("wrong", 0.7);
    if (hatteSerie) {
      window.setTimeout(() => audio.play("comboBreak"), 180);
      showToast(`Serie gerissen – hierhin gehören ${ITEM_TYPES[zone.type].plural}`, "bad");
    } else {
      showToast(`Falscher Platz – hierhin gehören ${ITEM_TYPES[zone.type].plural}`, "bad");
    }
    characterSays("Das gehört woanders hin …"); updateHUD(); return;
  }

  const mode = MODES[state.mode];
  const activeEvent = shiftEvent(state.level, state.delivered, items.length);
  const courierBonus = courierBatchBonus(currentCharacter(), matching);
  let batchScore = 0;
  let pending = matching.length;
  if (courierBonus.active) showScorePop(`Kurier +${courierBonus.percent} %`, true);
  matching.forEach((item, index) => {
    state.combo += 1;
    state.comboTime = comboWindowSeconds();
    // Für die Eskalation festhalten: bis zur Landung zählt state.combo weiter,
    // dieser Aufschlag gehört aber zu genau diesem Stand.
    const comboDiesesWurfs = state.combo;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const strengthBonus = item.weight === "heavy" ? currentCharacter().heavyScoreBonus : 1;
    const eventBonus = shiftEventMultiplier(activeEvent, item, currentLevelSettings().dynamics);
    const gained = Math.round(item.points * comboMultiplier(state.combo) * mode.scoreMultiplier * strengthBonus * eventBonus * courierBonus.multiplier);
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
        const courierText = courierBonus.active ? ` · Kurier +${courierBonus.percent} %` : "";
        showToast(`${matching.length > 1 ? `${matching.length} Dinge` : matching[0].label} aufgeräumt · +${batchScore}${courierText}`, "good");
        characterSays(courierBonus.active ? "Doppellieferung – Fibi-Express!" : state.combo >= 5 ? "Die Combo läuft!" : "Sieht schon besser aus!");
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
  updateShiftDirector();
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
  const duration = prefersReducedMotion() ? 180 : 500;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    if (now < started) return;
    const t = Math.min(1, (now - started) / duration); const eased = 1 - Math.pow(1 - t, 3);
    const position = B.Vector3.Lerp(startPosition, placement.position, eased);
    if (!prefersReducedMotion()) position.y += Math.sin(Math.PI * t) * 0.85;
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
  const slot = itemDisplaySlot(zone.id, index);
  p.set(zone.position.x + slot.x, slot.y, zone.position.z + slot.z);
  return {
    position: p,
    rotation: new B.Vector3(slot.rotationX, slot.rotationY, slot.rotationZ),
    scale: slot.scale,
  };
}

function showDeliveryBurst(position, color) {
  const count = prefersReducedMotion() ? 3 : qualityTier() === "low" ? 6 : 12;
  const origin = position.add(new B.Vector3(0, 0.7, 0));
  const mat = new B.StandardMaterial("rewardParticleMat", scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color.scale(0.5);
  const particles = [];
  for (let i = 0; i < count; i++) {
    const particle = B.MeshBuilder.CreateSphere("rewardParticle", { diameter: 0.1, segments: 6 }, scene);
    particle.position.copyFrom(origin);
    particle.material = mat;
    const velocity = new B.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.5, Math.random() - 0.5).normalize().scale(2.2 + Math.random() * 1.2);
    particles.push({ particle, velocity });
  }
  const started = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - started) / (prefersReducedMotion() ? 260 : 650);
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
      particles.forEach(({ particle }) => particle.dispose());
      mat.dispose();
      return;
    }
    particles.forEach(({ particle, velocity }) => {
      particle.position.copyFrom(origin.add(velocity.scale(t)).add(new B.Vector3(0, -1.9 * t * t, 0))); particle.scaling.setAll(Math.max(0.01, 1 - t));
    });
  });
  deliveryObservers.push(observer);
}

// Der Moment, in dem ein Gegenstand tatsächlich landet. Bewusst getrennt vom
// Tastendruck: der Gegenstand fliegt 500 ms, und die Wucht gehört ans Ende
// dieses Fluges, nicht an seinen Anfang.
function playImpact(zone, item, combo) {
  const strength = impactStrength(item.weight) * comboImpactScale(combo);
  audio.playImpact(impactSound(item.type, deliveryPitch(combo)), strength);
  vibrate(Math.round(12 + strength * 22));
  squashZone(zone, strength);
  if (qualityTier() !== "low" && !prefersReducedMotion()) {
    kickCamera(strength);
    showImpactDust(zone.position, strength);
  }
}

// Staucht die Zone und lässt sie nachfedern. Je Zone darf höchstens eine
// Animation laufen — ein zweiter Aufschlag setzt sie zurück, statt einen
// weiteren Observer auf dieselben Meshes zu legen.
function squashZone(zone, strength) {
  if (!zone.bodyMeshes?.length || prefersReducedMotion()) return;
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
  if (!camera || prefersReducedMotion()) return;
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
  if (prefersReducedMotion()) return;
  const count = Math.round(3 + strength * 4);
  const mat = new B.StandardMaterial("impactDustMat", scene);
  mat.diffuseColor = new B.Color3(0.62, 0.62, 0.6);
  mat.alpha = 0.4;
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const puff = B.MeshBuilder.CreateSphere("impactDust", { diameter: 0.16, segments: 5 }, scene);
    const origin = position.add(new B.Vector3((Math.random() - 0.5) * 0.5, 0.12, (Math.random() - 0.5) * 0.5));
    puff.position.copyFrom(origin);
    puff.material = mat;
    const drift = new B.Vector3((Math.random() - 0.5) * 1.1, 0.35 + Math.random() * 0.3, (Math.random() - 0.5) * 1.1);
    puffs.push({ puff, origin, drift });
  }
  const started = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = (performance.now() - started) / 420;
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      deliveryObservers = deliveryObservers.filter((entry) => entry !== observer);
      puffs.forEach(({ puff }) => puff.dispose());
      mat.dispose();
      return;
    }
    mat.alpha = 0.4 * (1 - t);
    puffs.forEach(({ puff, origin, drift }) => {
      puff.position.copyFrom(origin.add(drift.scale(t)));
      puff.scaling.setAll(0.6 + t * 1.3);
    });
  });
  deliveryObservers.push(observer);
}

function startRound() {
  closeAllModals();
  if (!save.tutorialCompleted) startTutorial();
  else beginGameplayRound();
}

function resetRoundState() {
  state.playing = true; state.paused = false; state.ended = false; state.finishing = false;
  state.score = 0; state.combo = 0; state.comboTime = 0; state.delivered = 0; state.wrongPlacements = 0; state.droppedItems = 0;
  state.trips = 0; state.tripTime = 0; state.tripCooldown = 0; state.roundElapsed = 0;
  state.maxCombo = 0; state.deliveredDumbbells = 0; state.deliveredByType = {}; state.heldItems = []; state.nearestItem = null; state.nearestZone = null;
  state.activeWave = 0; state.shiftEventId = null;
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
  updateShiftDirector(true);
  ui.startScreen.classList.add("hidden"); ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.add("hidden");
  ui.hud.classList.remove("hidden"); ui.objective.classList.remove("hidden"); ui.progressTrack.classList.remove("hidden");
  ui.mobileControls.classList.toggle("hidden", !isTouchDevice); ui.coins.textContent = String(save.coins);
  document.body.classList.add("playing"); updateHUD(); renderContractHud(); ui.canvas.focus();
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
  const mode = MODES[state.mode];
  state.roundSeconds = mode.timed === false ? Infinity : mode.seconds;
  state.timeLeft = state.roundSeconds;
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
  setTimeout(() => beginGameplayRound(), prefersReducedMotion() ? 350 : 1450);
}

function endRound(completed) {
  if (state.ended) return;
  state.ended = true; state.playing = false; state.paused = false; state.finishing = false; state.velocity.set(0, 0, 0);
  touchInput.reset(); resetZoneGuidance(); clearItemHighlight(); hidePrompt(); audio.stopMusic();
  const mode = MODES[state.mode];
  const completionBonus = completed
    ? Math.round((mode.timed === false ? 250 : state.timeLeft * 4 + 250) * mode.scoreMultiplier)
    : 0;
  state.score += completionBonus;
  const earned = state.score > 0 ? Math.max(1, Math.floor(state.score / 115)) : 0;
  const elapsed = Math.max(0, state.roundElapsed);
  const rank = calculateRank(completed);
  const roundRecord = {
    level: state.level,
    mode: state.mode,
    character: state.character,
    completed,
    timed: mode.timed !== false,
    score: state.score,
    elapsed,
    rank: rank.grade,
    delivered: state.delivered,
    deliveredByType: { ...state.deliveredByType },
    droppedItems: state.droppedItems,
    trips: state.trips,
    wrongPlacements: state.wrongPlacements,
    maxCombo: state.maxCombo,
    totalItems: items.length,
    shiftSettings: { ...currentLevelSettings() },
    coinsEarned: earned,
  };
  const progressResult = recordRoundProgress(save, roundRecord);
  const modeStats = progressResult.levelModeStats;
  const unlocked = evaluateAchievements(save, {
    completed, droppedItems: state.droppedItems, maxCombo: state.maxCombo, totalItems: items.length,
    wrongPlacements: state.wrongPlacements, mode: state.mode, level: state.level, elapsed,
  });
  persistSave(save);

  ui.hud.classList.add("hidden"); ui.objective.classList.add("hidden"); ui.contractHud.classList.add("hidden"); ui.shiftStatus.classList.add("hidden"); ui.progressTrack.classList.add("hidden");
  ui.flowVignette.classList.remove("active");
  ui.navigator.classList.add("hidden"); ui.mobileControls.classList.add("hidden"); ui.tutorialCoach.classList.add("hidden");
  ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.remove("hidden"); document.body.classList.remove("playing");
  ui.resultBadge.textContent = completed ? "GESCHAFFT" : "ZEIT VORBEI"; ui.resultBadge.classList.toggle("timeout", !completed);
  ui.resultTitle.textContent = completed ? `${currentCharacter().name} hat das Gym gerettet!` : "Fast geschafft!";
  ui.resultText.textContent = completed
    ? `${LEVELS[state.level].label} im Modus ${mode.label} in ${formatTime(elapsed)}. Bonus: ${completionBonus} Punkte, Stolperer: ${state.trips}, falsche Ablagen: ${state.wrongPlacements}.`
    : `${state.delivered} von ${items.length} Gegenständen wurden aufgeräumt. Deine sichtbaren Ablagen zeigen, wie weit du gekommen bist.`;
  ui.resultRank.textContent = rank.grade; ui.resultRankDetail.textContent = rank.detail;
  ui.resultRankBox.className = `result-rank rank-${rank.grade.toLowerCase()}`;
  ui.finalScore.textContent = String(state.score); ui.earnedCoins.textContent = `+${progressResult.coinsEarned}`;
  ui.highScore.textContent = String(modeStats.highScore); ui.bestTime.textContent = modeStats.bestTime ? formatTime(modeStats.bestTime) : "–";
  renderRoundCoach({
    ...roundRecord,
    expectedSecondsPerItem: mode.expectedSecondsPerItem,
  }, progressResult.trend);
  renderRoundProgress(progressResult);
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
  if (MODES[state.mode].timed === false) {
    if (state.wrongPlacements === 0 && state.trips === 0 && state.maxCombo >= items.length) return { grade: "S", detail: "Zen in perfekter Ordnung" };
    if (state.wrongPlacements === 0 && state.trips <= 1) return { grade: "A", detail: "Ruhig und aufmerksam" };
    if (state.wrongPlacements <= 1) return { grade: "B", detail: "Saubere Zen-Schicht" };
    return { grade: "C", detail: "Ohne Eile ans Ziel" };
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
  ui.hud.classList.add("hidden"); ui.objective.classList.add("hidden"); ui.contractHud.classList.add("hidden"); ui.shiftStatus.classList.add("hidden"); ui.progressTrack.classList.add("hidden"); ui.navigator.classList.add("hidden");
  ui.flowVignette.classList.remove("active");
  ui.mobileControls.classList.add("hidden"); ui.pauseScreen.classList.add("hidden"); ui.resultScreen.classList.add("hidden"); ui.tutorialCoach.classList.add("hidden");
  ui.startScreen.classList.remove("hidden"); document.body.classList.remove("playing"); renderMenu();
}

function setPaused(paused) {
  if (!state.playing || state.ended || state.finishing || state.paused === paused) return;
  state.paused = paused; state.keys.clear(); state.velocity.set(0, 0, 0); state.interactPressed = false; touchInput.reset();
  ui.pauseScreen.classList.toggle("hidden", !paused); ui.mobileControls.classList.toggle("hidden", paused || !isTouchDevice);
  if (paused) {
    hidePrompt();
    ui.flowVignette.classList.remove("active");
    audio.stopMusic();
    audio.play("pause");
  } else {
    updateHUD();
    audio.startMusic();
    ui.canvas.focus();
  }
}

function updateHUD() {
  ui.score.textContent = String(state.score);
  ui.progress.textContent = `${state.delivered}/${items.length}`;
  ui.progressBar.style.width = `${items.length ? (state.delivered / items.length) * 100 : 0}%`;
  ui.combo.textContent = state.combo > 0
    ? `×${comboMultiplier(state.combo).toFixed(1).replace(".", ",")} · ${Math.ceil(state.comboTime)}s`
    : "×1,0";
  ui.combo.classList.toggle("hot", state.combo >= 3);
  const flow = comboFlowState(state.combo, state.comboTime, comboWindowSeconds());
  ui.comboStat.dataset.tier = String(flow.tier);
  ui.comboTimeBar.style.transform = `scaleX(${flow.ratio})`;
  ui.flowVignette.dataset.tier = String(flow.tier);
  ui.flowVignette.style.setProperty("--flow-strength", flow.intensity.toFixed(2));
  ui.flowVignette.classList.toggle("active", flow.tier > 0 && state.playing && !state.ended);
  ui.flowLabel.textContent = flow.label;
  const untimed = state.tutorial || MODES[state.mode].timed === false;
  ui.timer.textContent = untimed ? "∞" : formatTime(state.timeLeft);
  ui.timer.style.color = !untimed && state.timeLeft <= 20 ? "#ff7c74" : "";
  ui.carrying.textContent = heldLabel(); ui.carryCard.classList.toggle("active", state.heldItems.length > 0);
  ui.coins.textContent = String(save.coins);
  updateShiftStatus();
}

function renderRoundCoach(round, trend) {
  const coaching = roundCoaching(round, trend);
  ui.roundCoach.dataset.tone = coaching.tone;
  ui.roundCoachTitle.textContent = coaching.title;
  ui.roundCoachText.textContent = coaching.body;
  ui.roundCoachMetrics.replaceChildren(...coaching.metrics.map((metric) => {
    const chip = document.createElement("span");
    chip.textContent = metric;
    return chip;
  }));
}

function showWizardStep(step, { focus = false } = {}) {
  menuWizardStep = Math.max(0, Math.min(WIZARD_STEPS.length - 1, Number(step) || 0));
  const copy = WIZARD_STEPS[menuWizardStep];

  for (const page of wizardPages) {
    const active = Number(page.dataset.wizardPage) === menuWizardStep;
    page.hidden = !active;
    page.classList.toggle("is-active", active);
  }
  for (const button of wizardStepButtons) {
    const position = Number(button.dataset.wizardStep);
    button.classList.toggle("is-active", position === menuWizardStep);
    button.classList.toggle("is-complete", position < menuWizardStep);
    if (position === menuWizardStep) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  }

  ui.wizardStageLabel.textContent = `Schritt ${menuWizardStep + 1} von ${WIZARD_STEPS.length}`;
  ui.wizardStageTitle.textContent = copy.title;
  ui.wizardStageHint.textContent = copy.hint;
  ui.wizardStepCounter.textContent = `${menuWizardStep + 1} / ${WIZARD_STEPS.length}`;
  wizardStageNumber.textContent = String(menuWizardStep + 1).padStart(2, "0");
  ui.wizardBackButton.classList.toggle("hidden", menuWizardStep === 0);
  ui.wizardNextButton.classList.toggle("hidden", menuWizardStep === WIZARD_STEPS.length - 1);
  ui.startButton.classList.toggle("hidden", menuWizardStep !== WIZARD_STEPS.length - 1);
  if (copy.next) ui.wizardNextButton.querySelector("span").textContent = copy.next;
  if (focus) {
    menuShell.scrollTop = 0;
    ui.startScreen.scrollTop = 0;
  }
}

function renderWizardSummary() {
  const character = CHARACTERS[state.character];
  const level = LEVELS[state.level];
  const mode = MODES[state.mode];
  ui.wizardSelectionSummary.textContent = `${character.name} · ${level.label} · ${mode.label}`;
}

function renderMenu() {
  updateCoinDisplays();
  renderCharacterSelector();
  renderLevelSelector();
  renderModeSelector();
  renderShiftSettings();
  renderShiftPreview();
  renderShop();
  renderAchievements();
  renderStats();
  renderSettings();
  renderWizardSummary();
  showWizardStep(menuWizardStep);
}

function renderCharacterSelector() {
  ui.characterSelector.innerHTML = "";
  for (const character of Object.values(CHARACTERS)) {
    const unlocked = owns(save, character.id);
    const speed = `${String(character.walkSpeed).replace(".", ",")} / ${String(character.sprintSpeed).replace(".", ",")}`;
    const heavyTempo = `${Math.round(character.heavyPenalty * 100)} %`;
    const heavyBonus = Math.round((character.heavyScoreBonus - 1) * 100);
    const courierBonus = Math.round((character.lightBatchBonus - 1) * 100);
    const card = document.createElement("button");
    card.className = `character-card${state.character === character.id ? " active" : ""}${unlocked ? "" : " locked"}`;
    card.innerHTML = `<span class="character-avatar">${character.id === "raccoon" ? "🦝" : "🐿️"}</span><span class="character-copy"><strong>${character.name} · ${character.species}</strong><small>${character.description}</small><span class="character-stats"><span>Tempo <b>${speed}</b></span><span>Leicht <b>${character.lightCapacity}×</b></span><span>Schwer <b>${heavyTempo}</b></span>${heavyBonus ? `<span>Kraft <b>+${heavyBonus} %</b></span>` : ""}${courierBonus ? `<span>Kurier <b>+${courierBonus} %</b></span>` : ""}</span></span><span class="character-badge">${unlocked ? (state.character === character.id ? "Aktiv" : "Wählen") : "🔒 Shop"}</span>`;
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
    button.addEventListener("click", () => {
      state.level = id;
      save.lastLevel = id;
      persistSave(save);
      setActiveLevelDecor(id);
      renderLevelSelector();
      renderShiftSettings();
      renderShiftPreview();
    });
    ui.levelSelector.appendChild(button);
  }
}

function renderModeSelector() {
  ui.modeSelector.innerHTML = "";
  for (const [id, mode] of Object.entries(MODES)) {
    const button = document.createElement("button"); button.className = `selector-tile${state.mode === id ? " active" : ""}`;
    button.innerHTML = `<span class="mode-icon">${mode.icon || "•"}</span><strong>${mode.label}</strong><small>${modeDurationLabel(mode)}</small><em>${mode.description}</em>`;
    button.addEventListener("click", () => {
      state.mode = id;
      save.lastMode = id;
      persistSave(save);
      renderModeSelector();
      renderShiftPreview();
    });
    ui.modeSelector.appendChild(button);
  }
}

function renderShiftSettings() {
  const settings = currentLevelSettings();
  for (const [element, group] of [
    [ui.itemAmountSetting, "itemAmount"],
    [ui.shiftDynamicsSetting, "dynamics"],
    [ui.tripRiskSetting, "tripRisk"],
    [ui.navigatorSetting, "guidance"],
  ]) {
    if (!element.options.length) {
      element.innerHTML = SHIFT_SETTING_OPTIONS[group]
        .map((option) => `<option value="${option.id}">${option.label}</option>`)
        .join("");
    }
  }
  ui.itemAmountSetting.value = settings.itemAmount;
  ui.shiftDynamicsSetting.value = settings.dynamics;
  ui.tripRiskSetting.value = settings.tripRisk;
  ui.navigatorSetting.value = settings.guidance;
}

function renderShiftPreview() {
  const level = LEVELS[state.level];
  const mode = MODES[state.mode];
  const settings = currentLevelSettings();
  ui.shiftPreviewCard.style.setProperty("--shift-accent", level.accent);
  ui.shiftPreviewTitle.textContent = level.label;
  ui.shiftPreviewSubtitle.textContent = `${mode.icon || ""} ${mode.label} · ${level.subtitle}`;
  ui.shiftPreviewItems.textContent = String(itemCountForMode(mode, settings.itemAmount));
  ui.shiftPreviewTime.textContent = mode.timed === false ? "∞" : modeDurationLabel(mode);
  ui.shiftPreviewRisk.textContent = optionFor("tripRisk", settings.tripRisk).label;
  ui.shiftPreviewDynamics.textContent = optionFor("dynamics", settings.dynamics).label;
  ui.shiftPreviewCharacter.textContent = `${CHARACTERS[state.character].name} · ${CHARACTERS[state.character].species}`;
  ui.shiftPreviewGuidance.textContent = optionFor("guidance", settings.guidance).label;
  renderWizardSummary();
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
  const masteryLevels = Object.values(save.career?.levels || {}).reduce((sum, entry) => sum + (entry.level || 1), 0);
  ui.careerStats.innerHTML = [
    ["Runden", stats.totalRounds], ["Aufgeräumt", stats.totalDelivered], ["Hanteln", stats.totalDumbbells],
    ["Beste Combo", stats.maxCombo], ["Perfekte Runden", stats.perfectRounds], ["Münzen verdient", stats.totalCoinsEarned],
    ["Verträge", stats.completedContracts || 0], ["Meisterschaft", masteryLevels], ["Stolperer", stats.totalTrips || 0],
    ["Shop-Artikel", save.owned.length - 1], ["Achievements", Object.keys(save.achievements).length],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");

  if (!ui.statsLevelFilter.options.length) {
    ui.statsLevelFilter.innerHTML = `<option value="all">Alle Level</option>${Object.entries(LEVELS)
      .map(([id, level]) => `<option value="${id}">${level.label}</option>`).join("")}`;
  }
  if (!ui.statsModeFilter.options.length) {
    ui.statsModeFilter.innerHTML = `<option value="all">Alle Modi</option>${Object.entries(MODES)
      .map(([id, mode]) => `<option value="${id}">${mode.label}</option>`).join("")}`;
  }
  const filters = {
    level: ui.statsLevelFilter.value || "all",
    mode: ui.statsModeFilter.value || "all",
  };
  const history = filteredRoundHistory(save.roundHistory, filters);
  renderTrend(roundTrend(history), history);

  ui.modeStats.innerHTML = Object.entries(LEVELS).map(([levelId, level]) => `
    <section class="level-stat-group">
      <h4>${level.label} · Meisterschaft ${save.career?.levels?.[levelId]?.level || 1}</h4>
      ${Object.entries(MODES).map(([modeId, mode]) => {
        const entry = save.levelModeStats?.[levelId]?.[modeId] || {};
        return `<div class="mode-stat-row"><strong>${mode.label}</strong><div><span>Highscore</span><strong>${entry.highScore || 0}</strong></div><div><span>Bestzeit</span><strong>${entry.bestTime ? formatTime(entry.bestTime) : "–"}</strong></div><div><span>Rang</span><strong>${entry.bestRank || "–"}</strong></div><div><span>Runden</span><strong>${entry.rounds || 0}</strong></div></div>`;
      }).join("")}
    </section>
  `).join("");
}

function renderTrend(trend, history) {
  const copy = {
    improved: ["Du wirst besser", "trend-up", `+${trend.delta}`],
    stable: ["Deine Leistung ist stabil", "trend-steady", `${trend.delta >= 0 ? "+" : ""}${trend.delta}`],
    declined: ["Zuletzt etwas schwächer", "trend-down", `${trend.delta}`],
    insufficient: ["Noch nicht genug Vergleichsrunden", "trend-new", "–"],
  }[trend.status];
  ui.trendSummary.textContent = copy[0];
  ui.trendSummary.className = copy[1];
  ui.trendDelta.textContent = copy[2];
  ui.trendDelta.className = copy[1];
  ui.trendMeta.textContent = trend.status === "insufficient"
    ? `${trend.sampleSize} von mindestens 4 vergleichbaren Runden`
    : `Neu Ø ${trend.recentAverage} · vorher Ø ${trend.previousAverage} · ${trend.sampleSize} Runden`;
  renderTrendChart(history.slice(-20));
  renderRecentRounds(history.slice(-8).reverse());
}

function renderTrendChart(history) {
  if (!history.length) {
    ui.trendChart.innerHTML = `<div class="trend-empty">Deine Entwicklungskurve erscheint nach der ersten abgeschlossenen Schicht.</div>`;
    return;
  }
  const width = 760;
  const height = 190;
  const padX = 28;
  const padY = 22;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;
  const points = history.map((entry, index) => {
    const x = history.length === 1 ? width / 2 : padX + (index / (history.length - 1)) * usableWidth;
    const y = padY + (1 - entry.performance / 100) * usableHeight;
    return { x, y, entry };
  });
  const path = points.map(({ x, y }, index) => `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  ui.trendChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Leistungsentwicklung der letzten ${history.length} Runden">
      <defs><linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7f46a" stop-opacity=".28"/><stop offset="1" stop-color="#a7f46a" stop-opacity="0"/></linearGradient></defs>
      ${[25, 50, 75].map((value) => {
        const y = padY + (1 - value / 100) * usableHeight;
        return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" class="trend-grid"/><text x="3" y="${y + 4}" class="trend-label">${value}</text>`;
      }).join("")}
      <path d="${path} L ${points.at(-1).x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z" class="trend-area"/>
      <path d="${path}" class="trend-line"/>
      ${points.map(({ x, y, entry }) => `<circle cx="${x}" cy="${y}" r="4.5"><title>${LEVELS[entry.level].label}, ${MODES[entry.mode].label}: ${entry.performance}</title></circle>`).join("")}
    </svg>`;
}

function renderRecentRounds(history) {
  ui.recentRounds.innerHTML = history.length
    ? history.map((entry) => `
      <article class="recent-round">
        <span class="recent-score">${entry.performance}</span>
        <div><strong>${LEVELS[entry.level].label} · ${MODES[entry.mode].label}</strong><small>${new Date(entry.timestamp).toLocaleDateString("de-DE")} · ${entry.delivered}/${entry.totalItems} Dinge · ${entry.trips} Stolperer</small></div>
        <em>${entry.completed ? entry.timed ? formatTime(entry.elapsed) : "∞ Zen" : "offen"}</em>
      </article>`).join("")
    : `<div class="trend-empty">Noch keine aufgezeichneten Runden.</div>`;
}

function renderSettings() {
  ui.masterVolume.value = save.settings.masterVolume;
  ui.cameraSensitivity.value = save.settings.cameraSensitivity;
  ui.joystickScale.value = save.settings.joystickScale;
  ui.qualitySetting.value = save.settings.quality;
  ui.vibrationSetting.checked = save.settings.vibration;
  ui.reducedMotionSetting.checked = save.settings.reducedMotion;
  document.body.classList.toggle("reduce-motion", save.settings.reducedMotion);
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

function renderContractHud() {
  if (state.tutorial) {
    ui.contractHud.classList.add("hidden");
    return;
  }
  const ensured = ensureDailyContracts(save);
  if (ensured.changed) persistSave(save);
  const contract = ensured.contracts.find((entry) => !entry.completed) || ensured.contracts[0];
  const definition = contractDefinition(contract);
  if (!contract || !definition) {
    ui.contractHud.classList.add("hidden");
    return;
  }
  ui.contractTitle.textContent = `${definition.icon} ${definition.name}`;
  ui.contractProgress.textContent = contract.completed
    ? `Erledigt · +${contract.reward} Münzen`
    : `${contract.progress} / ${contract.target} · +${contract.reward} Münzen`;
  ui.contractProgressBar.style.width = `${Math.min(100, (contract.progress / Math.max(1, contract.target)) * 100)}%`;
  ui.contractHud.classList.remove("hidden");
}

function renderRoundProgress(progressResult) {
  const mastery = progressResult.masteryAfter;
  ui.masteryLevel.textContent = `Stufe ${mastery.level}`;
  ui.masteryProgressText.textContent = mastery.maxed
    ? `Maximalstufe · +${progressResult.xpEarned} EP`
    : `${mastery.xpIntoLevel} EP in dieser Stufe · noch ${mastery.xpForNextLevel} · +${progressResult.xpEarned} EP`;
  ui.masteryProgressBar.style.width = `${Math.round(mastery.ratio * 100)}%`;
  ui.masteryResult.classList.remove("hidden");

  const completed = progressResult.contracts.completed;
  if (!completed.length) {
    ui.resultContracts.innerHTML = "";
    ui.resultContracts.classList.add("hidden");
    return;
  }
  ui.resultContracts.innerHTML = `<strong>Schichtauftrag erfüllt</strong>${completed.map(({ contract, definition }) => (
    `<span>${definition.icon} ${definition.name} · +${contract.reward} Münzen</span>`
  )).join("")}`;
  ui.resultContracts.classList.remove("hidden");
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
ui.wizardBackButton.addEventListener("click", () => showWizardStep(menuWizardStep - 1, { focus: true }));
ui.wizardNextButton.addEventListener("click", () => showWizardStep(menuWizardStep + 1, { focus: true }));
for (const button of wizardStepButtons) {
  button.addEventListener("click", () => showWizardStep(Number(button.dataset.wizardStep), { focus: true }));
}
ui.resumeButton.addEventListener("click", () => setPaused(false)); ui.pauseButton.addEventListener("click", () => setPaused(true)); ui.pauseMenuButton.addEventListener("click", returnToMenu);
ui.resultMenuButton.addEventListener("click", returnToMenu); ui.resultShopButton.addEventListener("click", () => showModal(ui.shopScreen));
ui.cameraButton.addEventListener("click", () => resetCamera(true)); ui.cameraRecenterButton.addEventListener("click", () => resetCamera(true));
ui.fullscreenButton.addEventListener("click", requestFullscreen); ui.fullscreenHudButton.addEventListener("click", requestFullscreen);
ui.shopButton.addEventListener("click", () => showModal(ui.shopScreen)); ui.achievementsButton.addEventListener("click", () => showModal(ui.achievementsScreen));
ui.statsButton.addEventListener("click", () => showModal(ui.statsScreen)); ui.settingsButton.addEventListener("click", () => showModal(ui.settingsScreen));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $(button.getAttribute("data-close")).classList.add("hidden")));
for (const [element, key] of [
  [ui.itemAmountSetting, "itemAmount"],
  [ui.shiftDynamicsSetting, "dynamics"],
  [ui.tripRiskSetting, "tripRisk"],
  [ui.navigatorSetting, "guidance"],
]) {
  element.addEventListener("change", () => {
    currentLevelSettings()[key] = element.value;
    persistSave(save);
    renderShiftPreview();
  });
}
ui.statsLevelFilter.addEventListener("change", renderStats);
ui.statsModeFilter.addEventListener("change", renderStats);
ui.soundButton.addEventListener("click", () => { save.soundEnabled = !save.soundEnabled; audio.setEnabled(save.soundEnabled); persistSave(save); updateSoundButton(); if (save.soundEnabled) { audio.play("pickup"); if (state.playing && !state.paused) audio.startMusic(); } });
ui.masterVolume.addEventListener("input", () => {
  save.settings.masterVolume = Number(ui.masterVolume.value);
  persistSave(save);
  if (save.settings.masterVolume > 0) audio.play("pickup");
});
ui.cameraSensitivity.addEventListener("input", () => { save.settings.cameraSensitivity = Number(ui.cameraSensitivity.value); persistSave(save); updateCameraSensitivity(); });
ui.joystickScale.addEventListener("input", () => { save.settings.joystickScale = Number(ui.joystickScale.value); persistSave(save); applyJoystickScale(); });
ui.qualitySetting.addEventListener("change", () => {
  save.settings.quality = ui.qualitySetting.value;
  persistSave(save);
  qualityState = createAdaptiveState();
  applyRenderQuality();
  rebuildSceneForQuality();
  showToast("Grafikqualität angepasst", "good");
});
ui.vibrationSetting.addEventListener("change", () => { save.settings.vibration = ui.vibrationSetting.checked; persistSave(save); vibrate(20); });
ui.reducedMotionSetting.addEventListener("change", () => {
  save.settings.reducedMotion = ui.reducedMotionSetting.checked;
  document.body.classList.toggle("reduce-motion", save.settings.reducedMotion);
  persistSave(save);
});
ui.exportSaveButton.addEventListener("click", () => {
  const blob = new Blob([serializeSaveExport(save)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gym-critters-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Spielstand exportiert", "good");
});
ui.importSaveButton.addEventListener("click", () => ui.importSaveInput.click());
ui.importSaveInput.addEventListener("change", async () => {
  const file = ui.importSaveInput.files?.[0];
  ui.importSaveInput.value = "";
  if (!file) return;
  const result = parseSaveImport(await file.text());
  if (!result.ok) {
    showToast(result.error, "bad");
    audio.play("wrong");
    return;
  }
  if (!window.confirm("Den aktuellen Spielstand durch dieses Backup ersetzen?")) return;
  for (const key of Object.keys(save)) delete save[key];
  Object.assign(save, result.save);
  persistSave(save);
  window.location.reload();
});
ui.resetTutorialButton.addEventListener("click", () => { save.tutorialCompleted = false; persistSave(save); showToast("Tutorial wird bei der nächsten Schicht gezeigt", "good"); });

try {
  createScene();
  engine.runRenderLoop(() => scene.render());
  renderMenu(); updateSoundButton(); applyJoystickScale();
  ui.loading.classList.add("hidden");
} catch (error) {
  console.error(error); ui.loading.textContent = `Fehler beim Start: ${error.message}`;
}
