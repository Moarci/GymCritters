const screens = Array.from(document.querySelectorAll(".screen"));
const announcement = document.getElementById("gameAnnouncements");
const backgroundRegions = [
  document.getElementById("gameCanvas"),
  document.getElementById("hud"),
  document.getElementById("mobileControls"),
].filter(Boolean);
const guidanceElements = [
  document.getElementById("objective"),
  document.getElementById("prompt"),
].filter(Boolean);

let activeScreen = null;
const returnFocus = new WeakMap();
const lastGuidance = new WeakMap();

function isVisible(element) {
  return element && !element.classList.contains("hidden");
}

function topScreen() {
  return screens.filter(isVisible).at(-1) || null;
}

function focusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(
    "button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), " +
    "textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
  )).filter((element) => !element.closest(".hidden") && !element.hasAttribute("inert"));
}

function announce(message) {
  if (!announcement || !message) return;
  announcement.textContent = "";
  requestAnimationFrame(() => {
    announcement.textContent = message;
  });
}

function setBackgroundInert(screen) {
  const modalOpen = screen?.getAttribute("role") === "dialog";
  for (const region of backgroundRegions) region.inert = Boolean(screen);
  for (const candidate of screens) {
    candidate.inert = Boolean(screen && candidate !== screen);
    candidate.setAttribute("aria-hidden", isVisible(candidate) ? "false" : "true");
  }

  // Ein Startbildschirm ist der primäre Seiteninhalt und kein Modal. Die
  // Hintergrundbereiche bleiben trotzdem unbedienbar, solange er sichtbar ist.
  document.body.classList.toggle("dialog-open", modalOpen);
}

function syncScreenState() {
  const nextScreen = topScreen();
  if (nextScreen === activeScreen) {
    setBackgroundInert(nextScreen);
    return;
  }

  const previousScreen = activeScreen;
  const previousFocus = document.activeElement;
  if (nextScreen && previousFocus instanceof HTMLElement) {
    returnFocus.set(nextScreen, previousFocus);
  }

  activeScreen = nextScreen;
  setBackgroundInert(nextScreen);

  if (!nextScreen) {
    document.getElementById("gameCanvas")?.focus({ preventScroll: true });
    return;
  }

  const restoreTarget = previousScreen?.classList.contains("modal-screen")
    ? returnFocus.get(previousScreen)
    : null;
  if (restoreTarget instanceof HTMLElement && nextScreen.contains(restoreTarget)) {
    restoreTarget.focus({ preventScroll: true });
    return;
  }

  const target = focusableElements(nextScreen)[0] || nextScreen.querySelector(".panel");
  target?.focus({ preventScroll: true });
  if (nextScreen.getAttribute("role") === "dialog") {
    const title = nextScreen.querySelector("h2")?.textContent?.trim();
    announce(title ? `${title} geöffnet` : "Dialog geöffnet");
  }
}

function enhanceDynamicControls() {
  document.querySelectorAll(
    "#characterSelector button, #levelSelector button, #modeSelector button",
  ).forEach((button) => {
    button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
  });

  const sprintButton = document.getElementById("sprintButton");
  if (sprintButton) {
    sprintButton.setAttribute("aria-pressed", sprintButton.classList.contains("active") ? "true" : "false");
  }
}

function announceChangedGuidance() {
  for (const element of guidanceElements) {
    if (!isVisible(element)) continue;
    const message = element.textContent?.replace(/\s+/g, " ").trim();
    if (!message || lastGuidance.get(element) === message) continue;
    lastGuidance.set(element, message);
    announce(message);
  }
}

const screenObserver = new MutationObserver(syncScreenState);
for (const screen of screens) {
  screenObserver.observe(screen, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

const controlObserver = new MutationObserver(enhanceDynamicControls);
for (const container of [
  document.getElementById("characterSelector"),
  document.getElementById("levelSelector"),
  document.getElementById("modeSelector"),
].filter(Boolean)) {
  controlObserver.observe(container, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
}
const sprintControl = document.getElementById("sprintButton");
if (sprintControl) {
  controlObserver.observe(sprintControl, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

const guidanceObserver = new MutationObserver(announceChangedGuidance);
for (const element of guidanceElements) {
  guidanceObserver.observe(element, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    characterData: true,
    subtree: true,
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || activeScreen?.getAttribute("role") !== "dialog") return;
  const focusables = focusableElements(activeScreen);
  if (!focusables.length) {
    event.preventDefault();
    activeScreen.querySelector(".panel")?.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

syncScreenState();
enhanceDynamicControls();
announceChangedGuidance();
