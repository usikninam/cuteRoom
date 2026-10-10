import "./style.scss";
import * as THREE from "three";
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

function render() {
  renderer.render(scene, camera);
}

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
camera.position.set(29.567116827654726, 14.018476147584705, 31.37040363900147);
controls.target.set(
  -0.08206262548844094,
  3.3119233527087255,
  -0.7433922282864018,
);
controls.update();

// Render on demand: draw while the user drags, then keep the loop alive
// only until damping has settled, then stop it.
function settle() {
  const stillMoving = controls.update();
  if (!stillMoving) renderer.setAnimationLoop(null);
}

controls.addEventListener("change", render);
controls.addEventListener("end", () => renderer.setAnimationLoop(settle));

const light = new THREE.AmbientLight(0x404040, 20);
scene.add(light);

// Load room model
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
    render();
  },
  undefined,
  function (error) {
    console.error(error);
  },
);

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  render();
});

render();
