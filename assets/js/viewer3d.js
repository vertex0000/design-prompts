/* 3D model viewer (FBX, GLB/GLTF, OBJ) built on three.js.
   Usage: const v = await mountViewer(element, 'assets/models/chair.fbx');
          v.setAutoRotate(true); v.setWireframe(true); v.reset(); v.capture(); v.dispose(); */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SUPPORTED = ['fbx', 'glb', 'gltf', 'obj'];

export function extOf(url, fallback) {
  const m = String(url || '').split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i);
  return (fallback || (m && m[1]) || 'fbx').toLowerCase();
}

function loadModel(url, ext, onProgress) {
  return new Promise((resolve, reject) => {
    const done = obj => resolve(obj);
    if (ext === 'fbx') new FBXLoader().load(url, done, onProgress, reject);
    else if (ext === 'glb' || ext === 'gltf') new GLTFLoader().load(url, g => { g.scene.animations = g.animations; done(g.scene); }, onProgress, reject);
    else if (ext === 'obj') new OBJLoader().load(url, done, onProgress, reject);
    else reject(new Error('Unsupported format: .' + ext));
  });
}

export async function mountViewer(el, url, opts = {}) {
  const ext = extOf(url, opts.ext);
  el.classList.add('v3d');
  el.innerHTML = '<div class="v3d-status">Loading 3D model…</div>';
  const status = el.firstChild;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = opts.autoRotate !== false;
  controls.autoRotateSpeed = 1.2;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let model = null, mixer = null, home = null, disposed = false;
  const clock = new THREE.Clock();

  function resize() {
    const w = el.clientWidth || 600, h = el.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  function frame() {
    if (disposed) return;
    requestAnimationFrame(frame);
    if (mixer) mixer.update(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  try {
    model = await loadModel(url, ext, e => {
      if (e.lengthComputable) status.textContent = `Loading 3D model… ${Math.round(e.loaded / e.total * 100)}%`;
    });
  } catch (err) {
    status.textContent = 'This model could not be loaded. Check the file is a valid ' + ext.toUpperCase() + '.';
    status.classList.add('err');
    console.error(err);
    return api();
  }
  if (disposed) return api();
  status.remove();

  model.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { if (m) { m.side = THREE.DoubleSide; m.userData.wire = m.wireframe; } });
    }
  });
  scene.add(model);

  // Centre on the origin, rest it on the ground, and frame it.
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  const radius = size.length() / 2 || 1;
  ground.scale.setScalar(radius * 12);
  sun.position.set(radius * 2, radius * 4, radius * 3);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -radius * 2; sc.right = sc.top = radius * 2; sc.near = 0.01; sc.far = radius * 12;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = radius * 0.02;
  const target = new THREE.Vector3(0, size.y / 2, 0);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  home = { pos: new THREE.Vector3(dist * 0.62, size.y / 2 + dist * 0.32, dist * 0.72), target };
  camera.near = radius / 100; camera.far = radius * 100; camera.updateProjectionMatrix();
  controls.minDistance = radius * 0.3; controls.maxDistance = radius * 8;
  resetView();

  if (model.animations && model.animations.length) {
    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(model.animations[0]).play();
  }

  function resetView() {
    if (!home) return;
    camera.position.copy(home.pos);
    controls.target.copy(home.target);
    controls.update();
  }

  function api() {
    return {
      setAutoRotate(v) { controls.autoRotate = v; },
      setWireframe(v) {
        model && model.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m) m.wireframe = v || m.userData.wire; }); });
      },
      setBackground(css) { el.style.background = css; },
      reset: resetView,
      loaded: !!model,
      info() {
        let meshes = 0, tris = 0;
        model && model.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } });
        return { meshes, triangles: Math.round(tris), format: ext.toUpperCase(), animated: !!mixer };
      },
      capture(type = 'image/jpeg', q = 0.9) {
        const bg = getComputedStyle(el).backgroundColor;
        renderer.render(scene, camera);
        const c = document.createElement('canvas');
        c.width = renderer.domElement.width; c.height = renderer.domElement.height;
        const ctx = c.getContext('2d');
        ctx.fillStyle = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#1b1b1f';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(renderer.domElement, 0, 0);
        return c.toDataURL(type, q);
      },
      dispose() {
        disposed = true; ro.disconnect(); controls.dispose();
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
        pmrem.dispose(); renderer.dispose(); el.innerHTML = '';
      }
    };
  }
  return api();
}
