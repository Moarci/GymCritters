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

export function createMuralTexture(scene, name, { width = 2048, height = 768, phrase = "CLOSING CREW", accent = "#a7f46a" } = {}) {
  const texture = new B.DynamicTexture(name, { width, height }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = "#232823";
  ctx.fillRect(0, 0, width, height);
  const splatterColors = [accent, "#ffad5c", "#63b4ef"];
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = splatterColors[i % splatterColors.length];
    ctx.globalAlpha = 0.16 + Math.random() * 0.18;
    const x = Math.random() * width, y = Math.random() * height, r = 30 + Math.random() * 110;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  texture.update();
  texture.drawText(phrase, null, height * 0.62, `bold ${Math.round(height * 0.28)}px Arial`, "#f7f6f1", "transparent", true);
  return texture;
}
