import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040810');
  scene.fog = new THREE.Fog('#040810', 32, 138);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 19, 42);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 12;
  controls.maxDistance = 120;
  controls.target.set(0, 6, -24);
  controls.update();

  const ambient = new THREE.AmbientLight('#9dc8ff', 0.48);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight('#c7f2ff', 0.98);
  directional.position.set(14, 24, 8);
  scene.add(directional);

  const rim = new THREE.DirectionalLight('#59ffe2', 0.3);
  rim.position.set(-18, 10, -28);
  scene.add(rim);

  const grid = new THREE.GridHelper(120, 36, '#43cdf3', '#102338');
  grid.position.y = -0.2;
  scene.add(grid);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    controls,
    grid,
    setGradientBackground(enabled) {
      const color = enabled ? '#040810' : '#010206';
      scene.background = new THREE.Color(color);
      scene.fog = new THREE.Fog(color, 35, 140);
    },
    resetCamera() {
      camera.position.set(0, 19, 42);
      controls.target.set(0, 6, -24);
      controls.update();
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
    }
  };
}
