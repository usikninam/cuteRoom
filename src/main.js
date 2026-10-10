import "./style.scss";
import * as THREE from "three";
import GUI from "lil-gui";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**  -------------------------- Scene setup -------------------------- */

const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color("#D9CAD1");

const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  200,
);
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 5;
controls.maxDistance = 45;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = Math.PI / 2;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Starting camera position
camera.position.set(9.99293394733715, 4.405862921790667, 9.88635502817539);
controls.target.set(
  -0.08206262548844094,
  3.311923352708726,
  -0.7433922282864018,
);
controls.update();

if (window.innerWidth < 768) {
  const target = controls.target;
  const offset = camera.position.clone().sub(target);
  camera.position.copy(target).addScaledVector(offset, 1.6);
  controls.update();
}

// Lights
scene.add(new THREE.AmbientLight(0x404040, 20));

const sun = new THREE.DirectionalLight("#ffffff", 2);
sun.position.set(10, 20, 10);
scene.add(sun);

/**  -------------------------- Click to edit materials -------------------------- */

function setupMaterialPicker(root) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const originals = new Map(); // mesh -> material exactly as it was in the model
  const edited = new Set(); // meshes that currently use our own editable copy
  root.traverse((c) => c.isMesh && originals.set(c, c.material));

  let selected = null;

  const params = {
    name: "Click an object",
    color: "#ffffff",
    roughness: 1,
    metalness: 0,
  };

  const gui = new GUI();
  gui.add(params, "name").name("Selected").disable();
  const colorCtrl = gui.addColor(params, "color").name("Color");
  const roughCtrl = gui.add(params, "roughness", 0, 1, 0.01).name("Roughness");
  const metalCtrl = gui.add(params, "metalness", 0, 1, 0.01).name("Metalness");
  gui.add({ reset: resetSelected }, "reset").name("Reset this object");

  // Give the selected mesh its own copy of the material (so shared
  // materials don't change other objects), converting to Standard if needed
  function getEditableMaterial() {
    if (!selected) return null;
    if (!edited.has(selected)) {
      const original = originals.get(selected);
      selected.material = original.isMeshStandardMaterial
        ? original.clone()
        : new THREE.MeshStandardMaterial({
            color: original.color,
            map: original.map,
          });
      edited.add(selected);
    }
    return selected.material;
  }

  colorCtrl.onChange((v) => getEditableMaterial()?.color.set(v));
  roughCtrl.onChange((v) => {
    const m = getEditableMaterial();
    if (m) m.roughness = v;
  });
  metalCtrl.onChange((v) => {
    const m = getEditableMaterial();
    if (m) m.metalness = v;
  });

  function resetSelected() {
    if (!selected) return;
    selected.material = originals.get(selected);
    edited.delete(selected);
    syncGUI();
  }

  // Copy the selected mesh's current material values into the panel
  function syncGUI() {
    const hasSelection = Boolean(selected);
    colorCtrl.disable(!hasSelection);
    roughCtrl.disable(!hasSelection);
    metalCtrl.disable(!hasSelection);

    if (!hasSelection) {
      params.name = "Click an object";
    } else {
      const m = selected.material;
      params.name = selected.name || "(unnamed)";
      params.color = "#" + m.color.getHexString();
      params.roughness = m.roughness ?? 1;
      params.metalness = m.metalness ?? 0;
    }
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  syncGUI();

  // Click detection that ignores camera drags
  let downX = 0;
  let downY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(root, true)[0];
    selected = hit ? hit.object : null;
    syncGUI();
  });
}

/**  -------------------------- Load room model -------------------------- */

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
);
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load(
  "/models/Room-DracoCompressed.glb",
  function (gltf) {
    scene.add(gltf.scene);
    setupMaterialPicker(gltf.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  },
);

/**  -------------------------- Resize + render loop -------------------------- */

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

/**  -------------------------- Console log -------------------------- */

window.addEventListener("keydown", (e) => {
  if (e.key !== "c") return;
  const p = camera.position;
  const t = controls.target;
  console.log(
    `camera.position.set(${p.x}, ${p.y}, ${p.z});\ncontrols.target.set(${t.x}, ${t.y}, ${t.z});`,
  );
});
