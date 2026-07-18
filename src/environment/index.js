import { buildStructure } from "./structure.js";
import { buildDecor, setActiveLevelDecor } from "./decor.js";

export { setActiveLevelDecor };

export function buildEnvironment(scene, shadowGenerator, options) {
  buildStructure(scene, shadowGenerator, options);
  return buildDecor(scene, shadowGenerator, options);
}
