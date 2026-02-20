export function createUI({ initialState, onStartMic, onStartDemo, onStop, onSettingChange, onResetCamera }) {
  const els = {
    landing: document.querySelector('#landing'),
    overlay: document.querySelector('#overlay'),
    errorToast: document.querySelector('#error-toast'),

    startBtn: document.querySelector('#start-btn'),
    demoBtn: document.querySelector('#demo-btn'),
    stopBtn: document.querySelector('#stop-btn'),
    resetCameraBtn: document.querySelector('#reset-camera'),

    mode: document.querySelector('#mode-select'),
    fftSize: document.querySelector('#fft-size'),
    detail: document.querySelector('#detail-level'),
    gain: document.querySelector('#gain'),
    smoothing: document.querySelector('#smoothing'),
    history: document.querySelector('#history'),
    freeze: document.querySelector('#freeze'),
    wireframe: document.querySelector('#wireframe'),
    bgToggle: document.querySelector('#bg-toggle'),

    gainValue: document.querySelector('#gain-value'),
    smoothingValue: document.querySelector('#smoothing-value'),
    historyValue: document.querySelector('#history-value'),
    micStatus: document.querySelector('#mic-status'),
    fpsStatus: document.querySelector('#fps-status')
  };

  const updateTextValues = () => {
    els.gainValue.textContent = Number(els.gain.value).toFixed(2);
    els.smoothingValue.textContent = Number(els.smoothing.value).toFixed(2);
    els.historyValue.textContent = String(els.history.value);
  };

  const getSettings = () => ({
    mode: els.mode.value,
    fftSize: Number(els.fftSize.value),
    detail: els.detail.value,
    gain: Number(els.gain.value),
    smoothing: Number(els.smoothing.value),
    historyLength: Number(els.history.value),
    freeze: els.freeze.checked,
    wireframe: els.wireframe.checked,
    gradientBackground: els.bgToggle.checked
  });

  const setMicState = (on, label = 'Mic') => {
    els.micStatus.textContent = `${label}: ${on ? 'ON' : 'OFF'}`;
    els.micStatus.classList.toggle('on', on);
    els.micStatus.classList.toggle('off', !on);
  };

  const showError = (message) => {
    els.errorToast.textContent = message;
    els.errorToast.classList.remove('hidden');
  };

  const clearError = () => {
    els.errorToast.classList.add('hidden');
    els.errorToast.textContent = '';
  };

  const setRunningUI = (isRunning) => {
    els.landing.classList.toggle('hidden', isRunning);
    els.overlay.classList.toggle('hidden', !isRunning);
  };

  els.startBtn.addEventListener('click', async () => {
    clearError();
    els.startBtn.disabled = true;
    els.startBtn.textContent = 'Requesting...';

    try {
      const result = await onStartMic(getSettings());
      setRunningUI(true);
      setMicState(true, result?.type === 'demo' ? 'Demo' : 'Mic');
    } catch (error) {
      showError(error.message);
      setMicState(false);
    } finally {
      els.startBtn.disabled = false;
      els.startBtn.textContent = 'Start Microphone';
    }
  });

  els.demoBtn.addEventListener('click', async () => {
    clearError();

    try {
      const result = await onStartDemo(getSettings());
      setRunningUI(true);
      setMicState(true, result?.type === 'demo' ? 'Demo' : 'Mic');
    } catch (error) {
      showError(error.message || 'Could not start demo mode.');
    }
  });

  els.stopBtn.addEventListener('click', () => {
    onStop();
    setRunningUI(false);
    setMicState(false);
  });

  els.resetCameraBtn.addEventListener('click', onResetCamera);

  [els.mode, els.fftSize, els.detail, els.gain, els.smoothing, els.history, els.freeze, els.wireframe, els.bgToggle]
    .forEach((el) => {
      el.addEventListener('input', () => {
        updateTextValues();
        onSettingChange(getSettings());
      });
      el.addEventListener('change', () => {
        updateTextValues();
        onSettingChange(getSettings());
      });
    });

  els.mode.value = initialState.mode;
  els.fftSize.value = String(initialState.fftSize);
  els.detail.value = initialState.detail;
  els.gain.value = String(initialState.gain);
  els.smoothing.value = String(initialState.smoothing);
  els.history.value = String(initialState.historyLength);
  els.freeze.checked = initialState.freeze;
  els.wireframe.checked = initialState.wireframe;
  els.bgToggle.checked = initialState.gradientBackground;

  updateTextValues();
  setMicState(false);
  setRunningUI(false);

  return {
    showError,
    clearError,
    setMicState,
    setFPS(fps) {
      els.fpsStatus.textContent = `FPS: ${fps}`;
    }
  };
}
