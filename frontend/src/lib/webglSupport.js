// Deliberately in its own file with no three.js import.
//
// Living inside the scene module, this check could only be reached by importing
// that module — which pulls the whole 3D engine into whatever bundle asks the
// question. The point of the demo page is that nobody who does not open it pays
// for the engine, so the question has to be answerable on its own.
export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}
