// Babylon misst das Standard-FOV (0.8 rad) vertikal. Im Querformat ist das die
// gewohnte Third-Person-Perspektive; im Hochformat schrumpft dabei das seitliche
// Sichtfeld so weit, dass die Halle nicht mehr überblickbar ist. Ein dauerhaft
// horizontal fixiertes FOV kehrt das Problem nur um: Auf einem Breitbildschirm
// zieht es die Vertikale auf ~0.45 rad zusammen und wirkt wie starkes Heranzoomen.
// Fixiert wird deshalb immer die KURZE Viewport-Kante — die lange bekommt mehr.
export function fovModeForViewport(width, height) {
  return width < height ? "horizontal" : "vertical";
}
