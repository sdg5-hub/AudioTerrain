export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.inputGain = null;
    this.stream = null;
    this.demoNodes = [];

    this.frequencyData = new Uint8Array(0);
    this.timeDomainData = new Uint8Array(0);
    this.state = 'idle';
  }

  async startMicrophone({ fftSize, smoothingTimeConstant }) {
    this.stop();

    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error('getUserMedia is not available in this browser.');
      err.code = 'UNSUPPORTED';
      throw err;
    }

    this.state = 'requesting';

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const tracks = this.stream.getAudioTracks();
      if (!tracks.length) {
        const err = new Error('No microphone device found.');
        err.code = 'NO_MIC';
        throw err;
      }

      this.audioContext = new AudioContext();
      await this.audioContext.resume();
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.inputGain = this.audioContext.createGain();
      this.inputGain.gain.value = 2.2;
      this.createAnalyser({ fftSize, smoothingTimeConstant });
      this.source.connect(this.inputGain);
      this.inputGain.connect(this.analyser);

      this.state = 'running';
      return { type: 'microphone' };
    } catch (error) {
      this.stop();
      throw this.normalizeMediaError(error);
    }
  }

  startDemo({ fftSize, smoothingTimeConstant }) {
    this.stop();

    this.audioContext = new AudioContext();
    this.audioContext.resume();
    const outputGain = this.audioContext.createGain();
    outputGain.gain.value = 0.35;

    this.createAnalyser({ fftSize, smoothingTimeConstant });
    outputGain.connect(this.analyser);

    const freqs = [110, 220, 330, 440];
    freqs.forEach((freq, idx) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.07;
      osc.connect(gain);
      gain.connect(outputGain);
      osc.start();
      this.demoNodes.push(osc, gain);
    });

    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    lfo.frequency.value = 0.25;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);

    const demoOsc = this.demoNodes.find((node) => node instanceof OscillatorNode);
    if (demoOsc) {
      lfoGain.connect(demoOsc.frequency);
    }

    lfo.start();
    this.demoNodes.push(lfo, lfoGain);

    this.state = 'running';
    return { type: 'demo' };
  }

  createAnalyser({ fftSize, smoothingTimeConstant }) {
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = smoothingTimeConstant;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
  }

  setFftSize(fftSize) {
    if (!this.analyser) return;
    this.analyser.fftSize = Number(fftSize);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
  }

  setSmoothing(smoothingTimeConstant) {
    if (!this.analyser) return;
    this.analyser.smoothingTimeConstant = Number(smoothingTimeConstant);
  }

  setInputBoost(multiplier) {
    if (!this.inputGain) return;
    this.inputGain.gain.value = Number(multiplier);
  }

  getFrame() {
    if (!this.analyser) {
      return {
        frequencyData: this.frequencyData,
        timeDomainData: this.timeDomainData
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData
    };
  }

  stop() {
    this.demoNodes.forEach((node) => {
      if (node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch (_e) {
          // already stopped
        }
      }
      if (typeof node.disconnect === 'function') {
        node.disconnect();
      }
    });
    this.demoNodes = [];

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.inputGain) {
      this.inputGain.disconnect();
      this.inputGain = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.frequencyData = new Uint8Array(0);
    this.timeDomainData = new Uint8Array(0);
    this.state = 'idle';
  }

  normalizeMediaError(error) {
    if (!error) return new Error('Unknown microphone error.');

    const err = new Error(error.message || 'Microphone error.');
    err.name = error.name;

    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      err.code = 'DENIED';
      err.message = 'Microphone permission was denied. Enable microphone access in browser site settings and reload.';
      return err;
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      err.code = 'NO_MIC';
      err.message = 'No microphone was found. Connect a mic and try again.';
      return err;
    }

    if (error.name === 'NotReadableError') {
      err.code = 'BUSY';
      err.message = 'Microphone is busy or blocked by another app.';
      return err;
    }

    if (error.code) {
      err.code = error.code;
    }

    return err;
  }
}
