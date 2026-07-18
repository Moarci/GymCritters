import { B } from "../babylon.js";

function shadeHex(hex, amount) {
  const c = B.Color3.FromHexString(hex);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const r = Math.round(clamp(c.r + amount / 255) * 255);
  const g = Math.round(clamp(c.g + amount / 255) * 255);
  const b = Math.round(clamp(c.b + amount / 255) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function createConcreteTexture(scene, name, { base = "#9a9d97", joints = "#5b5f59", size = 512 } = {}) {
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = shadeHex(base, Math.random() * 30 - 15);
    const w = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * size, Math.random() * size, w, w);
  }
  ctx.strokeStyle = joints;
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += size / 4) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  for (let y = 0; y <= size; y += size / 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  texture.update();
  texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = B.Texture.WRAP_ADDRESSMODE;
  return texture;
}

export function createRustMetalTexture(scene, name, { base = "#3a3f47", rust = "#8a4a2f", size = 512 } = {}) {
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = rust;
    const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 26;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 1500; i++) {
    ctx.strokeStyle = shadeHex(base, Math.random() * 40 - 20);
    ctx.lineWidth = 1;
    const y = Math.random() * size;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y + (Math.random() * 4 - 2)); ctx.stroke();
  }
  texture.update();
  return texture;
}

export function createDuskGradientTexture(scene, name, { size = 256 } = {}) {
  const texture = new B.DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#1b1f3a");
  gradient.addColorStop(0.55, "#2a2750");
  gradient.addColorStop(1, "#4a3a63");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#f4e8b8";
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size, y = Math.random() * size * 0.6, r = Math.random() * 1.4;
    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  texture.update();
  return texture;
}

export function createGymExteriorTexture(scene, name, { width = 1024, height = 512 } = {}) {
  const texture = new B.DynamicTexture(name, { width, height }, scene, false);
  const ctx = texture.getContext();
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#6f8797");
  sky.addColorStop(0.5, "#a9b5ba");
  sky.addColorStop(0.72, "#d7c7ae");
  sky.addColorStop(1, "#736f6a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Unscharfe Stadtsilhouette statt Sternenhimmel: Durch die Scheiben wirkt es nun
  // wie ein Gym in einem echten Gewerbehof am frühen Morgen.
  const buildings = [
    [0, 285, 160, 227, "#4f5960"], [125, 245, 220, 267, "#59636a"],
    [310, 320, 190, 192, "#454e55"], [465, 265, 245, 247, "#5e676b"],
    [675, 305, 210, 207, "#4a5358"], [850, 225, 190, 287, "#626a6d"],
  ];
  for (const [x, y, w, h, color] of buildings) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(246, 220, 160, 0.56)";
    for (let wx = x + 22; wx < x + w - 12; wx += 42) {
      for (let wy = y + 25; wy < Math.min(height - 18, y + h); wy += 38) {
        if (((wx + wy) / 10) % 3 > 0.7) ctx.fillRect(wx, wy, 14, 8);
      }
    }
  }
  ctx.fillStyle = "rgba(224, 231, 229, 0.35)";
  ctx.fillRect(0, 345, width, 5);
  texture.update();
  texture.wrapU = B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  return texture;
}

function fittedFontSize(ctx, text, maxWidth, preferredSize, minimumSize) {
  let size = preferredSize;
  while (size > minimumSize) {
    ctx.font = `900 ${Math.round(size)}px Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= Math.max(2, preferredSize * 0.025);
  }
  return Math.max(minimumSize, size);
}

export function createMuralTexture(scene, name, {
  width = 2048,
  height = 768,
  phrase = "CLOSING CREW",
  accent = "#a7f46a",
  kicker = "GYM CRITTERS // SHIFT STANDARD",
  subline = "MOVE • SORT • SHINE",
} = {}) {
  const texture = new B.DynamicTexture(name, { width, height }, scene, false);
  const ctx = texture.getContext();

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#11161d");
  background.addColorStop(0.58, "#1b222b");
  background.addColorStop(1, "#0c1117");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  ctx.lineWidth = Math.max(1, height * 0.004);
  const grid = height * 0.18;
  for (let x = -height; x < width + height; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height * 0.7, 0);
    ctx.stroke();
  }

  const railWidth = width * 0.026;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, railWidth, height);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(railWidth, 0, Math.max(2, width * 0.004), height);

  const badgeX = width * 0.105;
  const badgeY = height * 0.51;
  const badgeRadius = height * 0.2;
  ctx.fillStyle = "#0b0f14";
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(4, height * 0.018);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `900 ${Math.round(height * 0.22)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GC", badgeX, badgeY + height * 0.012);

  const textX = width * 0.205;
  const maxTextWidth = width * 0.74;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = accent;
  ctx.font = `700 ${Math.round(height * 0.072)}px Arial, sans-serif`;
  ctx.fillText(kicker.toUpperCase(), textX, height * 0.25);

  const headlineSize = fittedFontSize(ctx, phrase, maxTextWidth, height * 0.265, height * 0.135);
  ctx.font = `900 ${Math.round(headlineSize)}px Arial, sans-serif`;
  ctx.fillStyle = "#f5f7f8";
  ctx.fillText(phrase.toUpperCase(), textX, height * 0.59);

  const underlineWidth = Math.min(maxTextWidth, ctx.measureText(phrase.toUpperCase()).width);
  ctx.fillStyle = accent;
  ctx.fillRect(textX, height * 0.655, underlineWidth, Math.max(5, height * 0.018));
  ctx.fillStyle = "#aeb7c2";
  ctx.font = `700 ${Math.round(height * 0.066)}px Arial, sans-serif`;
  ctx.fillText(subline.toUpperCase(), textX, height * 0.82);

  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.font = `600 ${Math.round(height * 0.043)}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("EST. 2026  //  CREW 01", width * 0.96, height * 0.925);

  texture.update();
  return texture;
}

export function createShiftBannerTexture(scene, name, {
  width = 2048,
  height = 192,
  phrase = "CREW SHIFT",
  accent = "#a7f46a",
} = {}) {
  const texture = new B.DynamicTexture(name, { width, height }, scene, false);
  const ctx = texture.getContext();
  const background = ctx.createLinearGradient(0, 0, width, 0);
  background.addColorStop(0, "#0b1016");
  background.addColorStop(0.5, "#18212a");
  background.addColorStop(1, "#0b1016");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, Math.max(5, height * 0.055));
  ctx.fillRect(0, height - Math.max(5, height * 0.055), width, Math.max(5, height * 0.055));

  const badgeX = width * 0.055;
  const badgeY = height / 2;
  const badgeRadius = height * 0.28;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b1016";
  ctx.font = `900 ${Math.round(height * 0.3)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GC", badgeX, badgeY + height * 0.015);

  const textX = width * 0.105;
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = `700 ${Math.round(height * 0.115)}px Arial, sans-serif`;
  ctx.fillText("LIVE SHIFT // CREW TERMINAL", textX, height * 0.32);

  const headlineSize = fittedFontSize(ctx, phrase, width * 0.76, height * 0.33, height * 0.2);
  ctx.font = `900 ${Math.round(headlineSize)}px Arial, sans-serif`;
  ctx.fillStyle = "#f5f7f8";
  ctx.fillText(phrase.toUpperCase(), textX, height * 0.73);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(width * 0.955, badgeY, height * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#aeb7c2";
  ctx.font = `700 ${Math.round(height * 0.1)}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("ACTIVE", width * 0.93, height * 0.57);

  texture.update();
  return texture;
}
