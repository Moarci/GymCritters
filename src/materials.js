import { B } from "./babylon.js";

export function createMaterial(scene, name, color, roughness = 0.85, metallic = 0) {
  const mat = new B.PBRMaterial(name, scene);
  mat.albedoColor = B.Color3.FromHexString(color);
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}

export function createTexturedMaterial(scene, name, texture, { roughness = 0.9, metallic = 0 } = {}) {
  const mat = new B.PBRMaterial(name, scene);
  mat.albedoTexture = texture;
  mat.albedoColor = B.Color3.White();
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}
