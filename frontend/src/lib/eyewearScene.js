import * as THREE from "three";

// A scroll-driven product scene, built for the demo page.
//
// The frame is generated in code rather than loaded from a model file. That is
// a deliberate trade: a GLTF of this quality is a few megabytes and comes with
// licensing to track, while this is a few kilobytes of geometry and belongs to
// us outright. The reference point for this page was a site shipping 9.3MB of
// assets; the whole argument for building it this way is that a prospect on a
// mid-range Android phone in Bardhaman can still open it.
//
// Kept free of React so the scene can be reasoned about, replaced, or reused in
// a client project on its own terms.

const FRAME_COLOURS = [0x1b1f2a, 0x8c4a2f, 0x0f5b5e, 0xb08d2f];

export function createEyewearScene(canvas, { mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  // Capped rather than taken from the device: a 3x phone screen would render
  // nine times the pixels for no visible gain and a hot battery.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // ── lighting ──────────────────────────────────────────────────────────
  // Three lights, no shadow maps. Shadows are the single most expensive thing
  // in a scene like this and buy almost nothing against a dark background.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff0dd, 2.6);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rimCyan = new THREE.DirectionalLight(0x13dff4, 1.5);
  rimCyan.position.set(-6, -1, -4);
  scene.add(rimCyan);
  const rimMagenta = new THREE.DirectionalLight(0xf12dff, 1.1);
  rimMagenta.position.set(6, -3, -5);
  scene.add(rimMagenta);

  // ── the frame ─────────────────────────────────────────────────────────
  const root = new THREE.Group();
  scene.add(root);

  const frameMat = new THREE.MeshStandardMaterial({
    color: FRAME_COLOURS[0], metalness: 0.55, roughness: 0.32,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fd8ff, metalness: 0, roughness: 0.05,
    transmission: mobile ? 0 : 0.92,     // real refraction is desktop-only
    opacity: mobile ? 0.28 : 1, transparent: true,
    thickness: 0.4, ior: 1.5,
  });

  const RIM_R = 1.15;
  const rims = [];
  const lenses = [];
  const temples = [];

  [-1, 1].forEach((side) => {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(RIM_R, 0.11, mobile ? 10 : 18, mobile ? 32 : 64),
      frameMat,
    );
    rim.position.x = side * 1.42;
    root.add(rim);
    rims.push(rim);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(RIM_R - 0.02, mobile ? 32 : 64), lensMat);
    lens.position.set(side * 1.42, 0, 0);
    root.add(lens);
    lenses.push(lens);

    // Temple: a straight arm running back, with a short drop at the ear.
    const temple = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 3.4), frameMat);
    arm.position.z = -1.7;
    temple.add(arm);
    const drop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.11), frameMat);
    drop.position.set(0, -0.28, -3.32);
    drop.rotation.x = 0.28;
    temple.add(drop);
    temple.position.set(side * 2.5, 0.05, 0);
    root.add(temple);
    temples.push(temple);
  });

  // Bridge over the nose, and the two pads under it.
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 10, 28, Math.PI), frameMat);
  bridge.position.y = 0.42;
  root.add(bridge);

  // A faint grid far behind, so rotation is legible against something.
  const grid = new THREE.GridHelper(40, 40, 0x13dff4, 0x1b2440);
  grid.material.opacity = 0.12;
  grid.material.transparent = true;
  grid.position.set(0, -4.2, -6);
  scene.add(grid);

  const state = { progress: 0, spin: 0 };

  // How far back the camera has to sit for the frame to fit with room to
  // spare. A portrait phone needs considerably more distance than a laptop, and
  // the copy sits over the lower third of the canvas on every size, so the
  // model is aimed above centre rather than at it.
  let distance = 12;
  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const aspect = w / Math.max(h, 1);
    distance = aspect < 0.8 ? 19 : aspect < 1.3 ? 15 : 12;
  }

  // `p` is 0 to 1 across the whole scrolling section. Every visual change in
  // the scene is a function of it, so the scene has no state of its own to fall
  // out of sync with the page.
  function update(p, dt) {
    state.progress = p;
    state.spin += dt * 0.22;

    // Camera pulls back and rises as the page is read.
    const ease = (x) => x * x * (3 - 2 * x);
    const orbit = p * Math.PI * 1.15;
    const dist = distance - ease(Math.min(1, p * 1.2)) * 2.2;
    camera.position.set(
      Math.sin(orbit) * dist * 0.42,
      ease(Math.min(1, p * 1.6)) * 2.4 - 0.2,
      Math.cos(orbit) * dist * 0.9,
    );
    // Aimed below the frame so the model sits high and the copy at the bottom
    // of the canvas is never fighting it.
    camera.lookAt(0, -1.5, 0);

    root.rotation.y = state.spin * 0.35 + p * Math.PI * 0.9;
    root.rotation.x = Math.sin(p * Math.PI) * 0.16;

    // The exploded view lives in the middle of the scroll and closes again by
    // the end, so the page finishes on a whole product rather than a diagram.
    const explode = Math.max(0, Math.sin((p - 0.28) * Math.PI / 0.44)) * (p > 0.28 && p < 0.72 ? 1 : 0);
    rims.forEach((rim, i) => { rim.position.x = (i === 0 ? -1 : 1) * (1.42 + explode * 0.9); });
    lenses.forEach((lens, i) => {
      lens.position.x = (i === 0 ? -1 : 1) * (1.42 + explode * 0.9);
      lens.position.z = explode * 1.5;
    });
    temples.forEach((t, i) => {
      t.position.x = (i === 0 ? -1 : 1) * (2.5 + explode * 1.7);
      t.rotation.y = (i === 0 ? 1 : -1) * explode * 0.5;
    });
    bridge.position.y = 0.42 + explode * 0.85;

    // Colour steps through the range in the last third, which is the part a
    // retailer actually asks for.
    const band = Math.min(FRAME_COLOURS.length - 1, Math.floor(p * FRAME_COLOURS.length));
    const nextBand = Math.min(FRAME_COLOURS.length - 1, band + 1);
    const t = p * FRAME_COLOURS.length - band;
    frameMat.color.set(FRAME_COLOURS[band]).lerp(new THREE.Color(FRAME_COLOURS[nextBand]), t);

    grid.rotation.y = p * 0.4;
  }

  function render() { renderer.render(scene, camera); }

  // WebGL holds GPU memory that garbage collection cannot reach, so everything
  // built here is released by hand when the page unmounts.
  function dispose() {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
      }
    });
    grid.geometry.dispose();
    grid.material.dispose();
    renderer.dispose();
  }

  return { resize, update, render, dispose };
}
