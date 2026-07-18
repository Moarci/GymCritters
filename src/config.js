export const SAVE_KEY = "gymCrittersSave";
export const SAVE_VERSION = 4;

export const MODES = {
  relaxed: {
    label: "Entspannt",
    seconds: 180,
    scoreMultiplier: 0.9,
    itemCount: 8,
    navigator: "always",
    description: "Mehr Zeit, volle Zielhilfe und weniger Chaos.",
  },
  standard: {
    label: "Standard",
    seconds: 120,
    scoreMultiplier: 1,
    itemCount: 10,
    navigator: "always",
    description: "Die ausgewogene Aufräumschicht.",
  },
  blitz: {
    label: "Blitz",
    seconds: 90,
    scoreMultiplier: 1.3,
    itemCount: 12,
    navigator: "carrying",
    description: "Mehr Gegenstände, weniger Hilfe, höhere Belohnung.",
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
    description: "Stark mit schweren Gegenständen und Extra-Punkte für Hanteln.",
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
    description: "Schneller und kann zwei leichte Gegenstände gleichzeitig tragen.",
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
  },
  {
    id: "headband-red",
    name: "Rotes Stirnband",
    description: "Klassischer Cardio-Look.",
    cost: 40,
    slot: "head",
    preview: "🔴",
  },
  {
    id: "headband-blue",
    name: "Blaues Stirnband",
    description: "Kühler Look für schnelle Runden.",
    cost: 60,
    slot: "head",
    preview: "🔵",
  },
  {
    id: "wristbands",
    name: "Schweißbänder",
    description: "Zwei sportliche Bänder an den Pfoten.",
    cost: 75,
    slot: "wrist",
    preview: "💪",
  },
  {
    id: "sunglasses",
    name: "Sonnenbrille",
    description: "Cool bleiben, auch wenn der Timer läuft.",
    cost: 120,
    slot: "face",
    preview: "😎",
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
  },
];

export const ACHIEVEMENTS = [
  { id: "first-shift", name: "Erste Schicht", description: "Eine Runde beenden.", icon: "🔑" },
  { id: "sticky-paws", name: "Klebrige Pfoten", description: "Eine Runde ohne Fallenlassen schaffen.", icon: "🐾" },
  { id: "perfect-order", name: "Perfekte Ordnung", description: "Eine komplette Runde ohne Combo-Unterbrechung schaffen.", icon: "🏆" },
  { id: "heavy-lifter", name: "Schwerarbeiter", description: "Insgesamt 10 Hanteln aufräumen.", icon: "🏋️" },
  { id: "gym-hero", name: "Gym-Held", description: "Insgesamt 50 Gegenstände aufräumen.", icon: "🦸" },
  { id: "speed-cleaner", name: "Blitzsauber", description: "Standard in höchstens 75 Sekunden schaffen.", icon: "⚡" },
  { id: "collector", name: "Sammler", description: "Vier Shop-Artikel besitzen.", icon: "🛍️" },
];

export const CONFIG = {
  interactDistance: 2.18,
  deliveryDistance: 2.5,
  roomHalfX: 12.8,
  roomHalfZ: 9.2,
};
