export const SAVE_KEY = "gymCrittersSave";
export const SAVE_VERSION = 7;

// Karrierefortschritt ist absichtlich nicht an kaufbare Vorteile gekoppelt:
// Meisterschaft zeigt Erfahrung, ohne alte Highscores durch permanente
// Werte-Upgrades unfair zu machen. Die Schwellen sind Gesamt-XP je Level.
export const LEVEL_MASTERY = {
  maxLevel: 5,
  thresholds: [0, 250, 700, 1400, 2400],
  xp: {
    completedRound: 80,
    scoreDivisor: 50,
    maxScoreBonus: 80,
    noDropBonus: 20,
    perfectBonus: 30,
  },
};

// Je Kalendertag wird aus jeder Gruppe genau ein Vertrag deterministisch
// ausgewählt. Dadurch bleibt die Mischung aus Aufräumen, Schicht und Können
// ausgewogen, ohne Server, Account oder Online-Zeit.
export const CONTRACT_DEFINITIONS = [
  {
    id: "delivery-dozen", group: "delivery", name: "Ein Dutzend Dinge",
    description: "Räume heute 12 Gegenstände auf.", icon: "📦", target: 12, reward: 35,
    progress: { kind: "delivered" },
  },
  {
    id: "towel-service", group: "delivery", name: "Handtuch-Service",
    description: "Bringe heute 8 Handtücher zur Wäsche.", icon: "🧺", target: 8, reward: 40,
    progress: { kind: "itemType", type: "towel" },
  },
  {
    id: "heavy-duty", group: "delivery", name: "Schwerdienst",
    description: "Räume heute 6 Hanteln oder Kettlebells auf.", icon: "🏋️", target: 6, reward: 45,
    progress: { kind: "itemTypes", types: ["dumbbell", "kettlebell"] },
  },
  {
    id: "two-shifts", group: "shift", name: "Doppelschicht",
    description: "Schließe heute 2 Schichten ab.", icon: "🕒", target: 2, reward: 45,
    progress: { kind: "completedRounds" },
  },
  {
    id: "blitz-shift", group: "shift", name: "Blitzdienst",
    description: "Schließe heute eine Blitz-Schicht ab.", icon: "⚡", target: 1, reward: 45,
    progress: { kind: "modeCompleted", mode: "blitz" },
  },
  {
    id: "class-shift", group: "shift", name: "Kursretter",
    description: "Schließe heute „Nach dem Kurs“ ab.", icon: "🧘", target: 1, reward: 40,
    progress: { kind: "levelCompleted", level: "class" },
  },
  {
    id: "score-run", group: "skill", name: "Punktejagd",
    description: "Sammle heute insgesamt 3.000 Punkte.", icon: "🎯", target: 3000, reward: 50,
    progress: { kind: "score" },
  },
  {
    id: "careful-paws", group: "skill", name: "Sichere Pfoten",
    description: "Beende eine Schicht, ohne etwas fallen zu lassen.", icon: "🐾", target: 1, reward: 50,
    progress: { kind: "cleanRounds" },
  },
  {
    id: "combo-eight", group: "skill", name: "Achter-Serie",
    description: "Erreiche heute eine 8er-Serie.", icon: "🔥", target: 8, reward: 45,
    progress: { kind: "maxCombo" },
  },
];

export const MODES = {
  relaxed: {
    label: "Entspannt",
    icon: "🌿",
    timed: true,
    seconds: 180,
    expectedSecondsPerItem: 22.5,
    scoreMultiplier: 0.9,
    itemCount: 8,
    navigator: "always",
    description: "Mehr Zeit, volle Zielhilfe und weniger Chaos.",
  },
  standard: {
    label: "Standard",
    icon: "⚖️",
    timed: true,
    seconds: 120,
    expectedSecondsPerItem: 12,
    scoreMultiplier: 1,
    itemCount: 10,
    navigator: "always",
    description: "Die ausgewogene Aufräumschicht.",
  },
  blitz: {
    label: "Blitz",
    icon: "⚡",
    timed: true,
    seconds: 90,
    expectedSecondsPerItem: 7.5,
    scoreMultiplier: 1.3,
    itemCount: 12,
    navigator: "carrying",
    description: "Mehr Gegenstände, weniger Hilfe, höhere Belohnung.",
  },
  zen: {
    label: "Zen",
    icon: "∞",
    timed: false,
    seconds: null,
    expectedSecondsPerItem: 16,
    scoreMultiplier: 0.85,
    itemCount: 10,
    navigator: "always",
    description: "Ohne Zeitlimit – aufräumen im eigenen Rhythmus.",
  },
};

export const LEVELS = {
  closing: {
    label: "Feierabend",
    subtitle: "Gemischtes Chaos im ganzen Gym",
    accent: "#a7f46a",
    start: [0, -6.7],
    itemWeights: { dumbbell: 3, towel: 3, bottle: 3, mat: 1, kettlebell: 2, rope: 2, medball: 2 },
    spawnPool: [
      [-6.2, 4.2], [-3.4, 2.2], [0.2, 4.2], [4.2, 3.2], [7.0, 4.0],
      [-1.4, -2.0], [4.2, -2.2], [7.0, -3.7], [-5.0, -4.5], [1.2, -5.6],
      [-9.0, 1.8], [8.2, 0.1], [-3.0, -6.1], [5.7, 0.2], [-5.2, 0.2], [2.0, 1.1],
    ],
  },
  class: {
    label: "Nach dem Kurs",
    subtitle: "Matten, Handtücher und Flaschen",
    accent: "#aa74d4",
    start: [-8.8, -6.4],
    itemWeights: { dumbbell: 1, towel: 5, bottle: 4, mat: 3, kettlebell: 1, rope: 4, medball: 2 },
    spawnPool: [
      [-8.8, 5.6], [-6.1, 5.3], [-3.6, 5.2], [-1.0, 5.4], [2.0, 5.3], [5.0, 5.4], [8.0, 5.2],
      [-7.6, 1.8], [-4.8, 1.4], [-1.8, 1.8], [1.3, 1.2], [4.2, 1.8], [7.3, 1.4],
      [-6.2, -3.3], [-2.7, -3.0], [1.0, -3.4], [4.8, -3.0], [8.2, -3.2],
    ],
  },
  legday: {
    label: "Leg Day Chaos",
    subtitle: "Schwere Hanteln und enge Wege",
    accent: "#ffad5c",
    start: [8.7, -6.4],
    itemWeights: { dumbbell: 7, towel: 2, bottle: 2, mat: 1, kettlebell: 5, rope: 1, medball: 3 },
    spawnPool: [
      [-9.0, 5.0], [-6.5, 4.5], [-3.8, 4.1], [-1.0, 5.1], [2.1, 4.5], [5.2, 4.7], [8.4, 5.0],
      [-8.2, 0.0], [-5.5, -0.5], [-2.4, 0.2], [1.4, -0.4], [4.8, 0.2], [8.1, -0.2],
      [-7.1, -4.4], [-3.8, -4.8], [0.0, -4.2], [3.8, -4.8], [7.4, -4.2],
    ],
  },
};

export const ITEM_TYPES = {
  dumbbell: {
    label: "Hantel",
    plural: "Hanteln",
    points: 125,
    targetZone: "rack",
    weight: "heavy",
    icon: "🏋️",
  },
  towel: {
    label: "Handtuch",
    plural: "Handtücher",
    points: 50,
    targetZone: "laundry",
    weight: "light",
    icon: "🧺",
  },
  bottle: {
    label: "Trinkflasche",
    plural: "Trinkflaschen",
    points: 75,
    targetZone: "bottles",
    weight: "light",
    icon: "🥤",
  },
  mat: {
    label: "Trainingsmatte",
    plural: "Trainingsmatten",
    points: 100,
    targetZone: "mats",
    weight: "bulky",
    icon: "▰",
  },
  kettlebell: {
    label: "Kettlebell",
    plural: "Kettlebells",
    points: 130,
    targetZone: "kettlebells",
    weight: "heavy",
    icon: "🔔",
  },
  rope: {
    label: "Springseil",
    plural: "Springseile",
    points: 65,
    targetZone: "ropes",
    weight: "light",
    icon: "🪢",
  },
  medball: {
    label: "Medizinball",
    plural: "Medizinbälle",
    points: 105,
    targetZone: "medballs",
    weight: "bulky",
    icon: "🥎",
  },
};

export const CHARACTERS = {
  raccoon: {
    id: "raccoon",
    name: "Rocco",
    species: "Waschbär",
    description: "Kraft-Critter: +20 % auf Hanteln und Kettlebells, kaum Tempoverlust mit ihnen.",
    walkSpeed: 4.2,
    sprintSpeed: 6.3,
    heavyPenalty: 0.9,
    bulkyPenalty: 0.72,
    lightCapacity: 1,
    heavyScoreBonus: 1.2,
  },
  squirrel: {
    id: "squirrel",
    name: "Fibi",
    species: "Eichhörnchen",
    description: "Tempo-Critter: schneller und mit zwei leichten Gegenständen gleichzeitig unterwegs.",
    walkSpeed: 5.0,
    sprintSpeed: 7.25,
    heavyPenalty: 0.54,
    bulkyPenalty: 0.65,
    lightCapacity: 2,
    heavyScoreBonus: 1,
  },
};

export const SHOP_ITEMS = [
  {
    id: "headband-lime",
    name: "Limetten-Stirnband",
    description: "Roccos und Fibis klassischer Crew-Look.",
    cost: 0,
    slot: "head",
    preview: "🟢",
    visual: { color: "#a7f46a" },
  },
  {
    id: "headband-red",
    name: "Rotes Stirnband",
    description: "Klassischer Cardio-Look.",
    cost: 40,
    slot: "head",
    preview: "🔴",
    visual: { color: "#ef6161" },
  },
  {
    id: "headband-blue",
    name: "Blaues Stirnband",
    description: "Kühler Look für schnelle Runden.",
    cost: 60,
    slot: "head",
    preview: "🔵",
    visual: { color: "#63b4ef" },
  },
  {
    id: "wristbands",
    name: "Schweißbänder",
    description: "Zwei sportliche Bänder an den Pfoten.",
    cost: 75,
    slot: "wrist",
    preview: "💪",
    visual: { color: "#f7f6f1" },
  },
  {
    id: "sunglasses",
    name: "Sonnenbrille",
    description: "Cool bleiben, auch wenn der Timer läuft.",
    cost: 120,
    slot: "face",
    preview: "😎",
    visual: { color: "#151b24" },
  },
  {
    id: "squirrel",
    name: "Fibi freischalten",
    description: "Schnelles Eichhörnchen mit zwei leichten Tragplätzen.",
    cost: 250,
    slot: "character",
    preview: "🐿️",
  },
  {
    id: "golden-trail",
    name: "Goldene Laufspur",
    description: "Dezente Goldfunken beim Sprinten.",
    cost: 400,
    slot: "trail",
    preview: "✨",
    visual: { primary: "#ffd66e", secondary: "#fff2b0" },
  },
  {
    id: "headband-sunset",
    name: "Sunset-Stirnband",
    description: "Warme Koralle für lange Abendschichten.",
    cost: 220,
    slot: "head",
    preview: "🟠",
    visual: { color: "#ff805c" },
  },
  {
    id: "headband-violet",
    name: "Violettes Stirnband",
    description: "Kräftiges Violett für die Kursfläche.",
    cost: 350,
    slot: "head",
    preview: "🟣",
    visual: { color: "#aa74d4" },
  },
  {
    id: "headband-chrome",
    name: "Chrom-Stirnband",
    description: "Ein glänzender Meisterschafts-Look.",
    cost: 700,
    slot: "head",
    preview: "⚪",
    visual: { color: "#dfe7ef", metallic: 0.75 },
  },
  {
    id: "wristbands-lime",
    name: "Limetten-Schweißbänder",
    description: "Crew-Farben bis in die Pfotenspitzen.",
    cost: 280,
    slot: "wrist",
    preview: "💚",
    visual: { color: "#a7f46a" },
  },
  {
    id: "wristbands-gold",
    name: "Goldene Schweißbänder",
    description: "Für Critter mit vielen Schichten Erfahrung.",
    cost: 900,
    slot: "wrist",
    preview: "🏅",
    visual: { color: "#e6b84a", metallic: 0.55 },
  },
  {
    id: "sunglasses-rose",
    name: "Rosé-Sportbrille",
    description: "Leuchtende Gläser für einen auffälligen Auftritt.",
    cost: 500,
    slot: "face",
    preview: "🕶️",
    visual: { color: "#bd5277" },
  },
  {
    id: "neon-trail",
    name: "Neon-Laufspur",
    description: "Violette und limettengrüne Funken beim Sprinten.",
    cost: 1200,
    slot: "trail",
    preview: "💫",
    visual: { primary: "#aa74d4", secondary: "#a7f46a" },
  },
  {
    id: "crew-trail",
    name: "Critter-Crew-Spur",
    description: "Die seltene zweifarbige Spur für Gym-Legenden.",
    cost: 2400,
    slot: "trail",
    preview: "🌟",
    visual: { primary: "#ffad5c", secondary: "#63b4ef" },
  },
];

// `progress` beschreibt rein deklarativ, wie der Verlauf zu zählen ist — die
// Auswertung liegt in save.js, damit config.js reine Daten bleibt. Ziele ohne
// `progress` sind Ja/Nein-Bedingungen pro Runde und bekommen bewusst keinen
// Fortschrittsbalken: ein Balken, der nie wächst, verspricht Nähe, wo keine ist.
export const ACHIEVEMENTS = [
  { id: "first-shift", name: "Erste Schicht", description: "Eine Runde beenden.", icon: "🔑" },
  { id: "sticky-paws", name: "Klebrige Pfoten", description: "Eine Runde ohne Fallenlassen schaffen.", icon: "🐾" },
  { id: "perfect-order", name: "Perfekte Ordnung", description: "Eine komplette Runde ohne Combo-Unterbrechung schaffen.", icon: "🏆" },
  {
    id: "heavy-lifter", name: "Schwerarbeiter", description: "Insgesamt 10 Hanteln aufräumen.", icon: "🏋️",
    progress: { kind: "itemType", type: "dumbbell", target: 10 },
  },
  {
    id: "kettlebell-king", name: "Kettlebell-König", description: "Insgesamt 10 Kettlebells aufräumen.", icon: "🔔",
    progress: { kind: "itemType", type: "kettlebell", target: 10 },
  },
  {
    id: "rope-skipper", name: "Seilspringer", description: "Insgesamt 15 Springseile aufräumen.", icon: "🪢",
    progress: { kind: "itemType", type: "rope", target: 15 },
  },
  {
    id: "ball-artist", name: "Ballkünstler", description: "Insgesamt 10 Medizinbälle aufräumen.", icon: "🥎",
    progress: { kind: "itemType", type: "medball", target: 10 },
  },
  {
    id: "full-range", name: "Vollsortiment", description: "Von jeder Gegenstandsart mindestens eine aufräumen.", icon: "🎯",
    progress: { kind: "distinctTypes", target: 7 },
  },
  {
    id: "gym-hero", name: "Gym-Held", description: "Insgesamt 50 Gegenstände aufräumen.", icon: "🦸",
    progress: { kind: "totalDelivered", target: 50 },
  },
  { id: "speed-cleaner", name: "Blitzsauber", description: "Standard in höchstens 75 Sekunden schaffen.", icon: "⚡" },
  {
    id: "collector", name: "Sammler", description: "Vier Shop-Artikel besitzen.", icon: "🛍️",
    progress: { kind: "ownedExtras", target: 4 },
  },
  {
    id: "shift-veteran", name: "Stammcrew", description: "Insgesamt 25 Schichten beenden.", icon: "📅",
    progress: { kind: "totalRounds", target: 25 },
  },
  {
    id: "contract-pro", name: "Zuverlässige Pfoten", description: "Insgesamt 10 Tagesverträge erfüllen.", icon: "📋",
    progress: { kind: "completedContracts", target: 10 },
  },
  {
    id: "master-of-the-gym", name: "Gym-Meister", description: "Über alle Level zusammen 10 Meisterschaftsstufen erreichen.", icon: "🌟",
    progress: { kind: "masteryLevels", target: 10 },
  },
  {
    id: "coin-earner", name: "Crew-Verdiener", description: "Insgesamt 1.500 Münzen verdienen.", icon: "🪙",
    progress: { kind: "coinsEarned", target: 1500 },
  },
];

export const CONFIG = {
  interactDistance: 2.18,
  deliveryDistance: 2.5,
  roomHalfX: 12.8,
  roomHalfZ: 9.2,
};
