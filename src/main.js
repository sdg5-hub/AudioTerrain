import './styles.css';
import { AudioEngine } from './audio.js';
import { createScene } from './scene.js';
import { SoundVisualizer } from './visualizer.js';
import { createUI } from './ui.js';

const defaultState = {
  mode: 'terrain',
  fftSize: 2048,
  detail: 'medium',
  gain: 1.5,
  smoothing: 0.72,
  historyLength: 120,
  freeze: false,
  wireframe: false,
  gradientBackground: true
};

const state = { ...defaultState };

const canvas = document.querySelector('#scene-canvas');
const sceneSystem = createScene(canvas);
const audio = new AudioEngine();
const visualizer = new SoundVisualizer(sceneSystem.scene);

let running = false;

function applyVisualizerSettings() {
  visualizer.updateConfig({
    detail: state.detail,
    historyLength: state.historyLength,
    gain: state.gain
  });
  visualizer.setMode(state.mode);
  visualizer.setWireframe(state.wireframe);
  sceneSystem.grid.visible = state.mode === 'terrain';
  sceneSystem.setGradientBackground(state.gradientBackground);
  document.body.classList.toggle('flat-bg', !state.gradientBackground);

  if (audio.stream) {
    audio.setInputBoost(1.25 + state.gain * 0.95);
  }
}

applyVisualizerSettings();

const ui = createUI({
  initialState: state,
  async onStartMic(settings) {
    Object.assign(state, settings);
    const result = await audio.startMicrophone({
      fftSize: state.fftSize,
      smoothingTimeConstant: state.smoothing
    });

    running = true;
    applyVisualizerSettings();
    return result;
  },
  async onStartDemo(settings) {
    Object.assign(state, settings);
    const result = audio.startDemo({
      fftSize: state.fftSize,
      smoothingTimeConstant: state.smoothing
    });

    running = true;
    applyVisualizerSettings();
    return result;
  },
  onStop() {
    running = false;
    audio.stop();
  },
  onSettingChange(nextSettings) {
    const prevFFT = state.fftSize;
    Object.assign(state, nextSettings);

    applyVisualizerSettings();

    if (running && audio.analyser) {
      if (prevFFT !== state.fftSize) {
        audio.setFftSize(state.fftSize);
      }
      audio.setSmoothing(state.smoothing);
    }
  },
  onResetCamera() {
    sceneSystem.resetCamera();
  }
});

let frameCounter = 0;
let fpsTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  if (running && audio.analyser) {
    const { frequencyData, timeDomainData } = audio.getFrame();
    visualizer.update(frequencyData, timeDomainData, state.freeze);

    // Basic low-frequency energy detector for a subtle beat pulse.
    let lowEnergy = 0;
    const lowBins = Math.max(8, Math.floor(frequencyData.length * 0.08));
    for (let i = 0; i < lowBins; i += 1) {
      lowEnergy += frequencyData[i];
    }
    lowEnergy = lowEnergy / (lowBins * 255);
    canvas.style.filter = lowEnergy > 0.34 ? 'saturate(1.15) brightness(1.06)' : 'none';
  }

  sceneSystem.controls.update();
  sceneSystem.renderer.render(sceneSystem.scene, sceneSystem.camera);

  frameCounter += 1;
  const now = performance.now();
  if (now - fpsTime >= 500) {
    const fps = Math.round((frameCounter * 1000) / (now - fpsTime));
    ui.setFPS(fps);
    frameCounter = 0;
    fpsTime = now;
  }
}

animate();

window.addEventListener('beforeunload', () => {
  audio.stop();
  visualizer.dispose();
  sceneSystem.dispose();
});
