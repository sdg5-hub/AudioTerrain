import * as THREE from 'three';

const DETAIL_BINS = {
  low: 96,
  medium: 160,
  high: 256
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class SoundVisualizer {
  constructor(scene) {
    this.scene = scene;

    this.mode = 'terrain';
    this.detail = 'medium';
    this.historyLength = 120;
    this.gain = 1.5;
    this.gamma = 0.72;

    this.width = 58;
    this.depth = 84;
    this.heightScale = 24;

    this.detailBins = DETAIL_BINS[this.detail];

    this.freqRow = new Float32Array(this.detailBins);
    this.waveRow = new Float32Array(this.detailBins);
    this.terrainHistory = new Float32Array(this.detailBins * this.historyLength);
    this.ribbonHistory = new Float32Array(this.detailBins * this.historyLength);

    this.terrainMesh = null;
    this.terrainGeometry = null;
    this.terrainMaterial = null;

    this.ribbonLine = null;
    this.ribbonGeometry = null;
    this.ribbonMaterial = null;

    this.frameCount = 0;
    this.runningPeak = 0.2;

    this.buildTerrain();
    this.buildRibbon();
    this.setMode(this.mode);
  }

  updateConfig({ detail, historyLength, gain }) {
    let needsRebuild = false;

    if (detail && detail !== this.detail) {
      this.detail = detail;
      this.detailBins = DETAIL_BINS[this.detail];
      needsRebuild = true;
    }

    if (historyLength && Number(historyLength) !== this.historyLength) {
      this.historyLength = Number(historyLength);
      needsRebuild = true;
    }

    if (typeof gain === 'number') {
      this.gain = gain;
    }

    if (needsRebuild) {
      this.freqRow = new Float32Array(this.detailBins);
      this.waveRow = new Float32Array(this.detailBins);
      this.terrainHistory = new Float32Array(this.detailBins * this.historyLength);
      this.ribbonHistory = new Float32Array(this.detailBins * this.historyLength);
      this.runningPeak = 0.2;
      this.disposeGeometries();
      this.buildTerrain();
      this.buildRibbon();
      this.setMode(this.mode);
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (this.terrainMesh) {
      this.terrainMesh.visible = mode === 'terrain';
    }
    if (this.ribbonLine) {
      this.ribbonLine.visible = mode === 'ribbon';
    }
  }

  setWireframe(enabled) {
    if (this.terrainMaterial) {
      this.terrainMaterial.wireframe = enabled;
    }
  }

  update(frequencyData, timeDomainData, freeze = false) {
    if (!frequencyData?.length || !timeDomainData?.length) return;

    if (!freeze) {
      this.sampleFrequency(frequencyData);
      this.sampleWaveform(timeDomainData);
      this.pushHistory(this.terrainHistory, this.freqRow);
      this.pushHistory(this.ribbonHistory, this.waveRow);
    }

    this.updateTerrainGeometry();
    this.updateRibbonGeometry();

    this.frameCount += 1;
    if (this.frameCount % 6 === 0 && this.terrainGeometry) {
      this.terrainGeometry.computeVertexNormals();
    }
  }

  sampleFrequency(source) {
    const srcLen = source.length;
    const step = srcLen / this.detailBins;

    for (let i = 0; i < this.detailBins; i += 1) {
      const srcIdx = Math.floor(i * step);
      const amp = source[srcIdx] / 255;
      const gated = amp < 0.018 ? 0 : amp;
      const curved = Math.pow(gated, this.gamma);
      const boosted = curved * this.gain * 1.9;
      this.runningPeak = Math.max(boosted, this.runningPeak * 0.985);
      const normalized = clamp(boosted / (this.runningPeak + 1e-6), 0, 1);
      this.freqRow[i] = this.freqRow[i] * 0.52 + normalized * 0.48;
    }
  }

  sampleWaveform(source) {
    const srcLen = source.length;
    const step = srcLen / this.detailBins;

    for (let i = 0; i < this.detailBins; i += 1) {
      const srcIdx = Math.floor(i * step);
      const centered = (source[srcIdx] - 128) / 128;
      const waved = clamp(centered * this.gain * 1.2, -1, 1);
      this.waveRow[i] = waved;
    }
  }

  pushHistory(historyBuffer, row) {
    const rowSize = this.detailBins;
    historyBuffer.copyWithin(rowSize, 0, rowSize * (this.historyLength - 1));
    historyBuffer.set(row, 0);
  }

  buildTerrain() {
    const cols = this.detailBins;
    const rows = this.historyLength;
    const vertexCount = cols * rows;

    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const idx = row * cols + col;
        const ptr = idx * 3;

        const x = (col / (cols - 1) - 0.5) * this.width;
        const z = -(row / (rows - 1)) * this.depth;

        positions[ptr] = x;
        positions[ptr + 1] = 0;
        positions[ptr + 2] = z;

        colors[ptr] = 0.12;
        colors[ptr + 1] = 0.4;
        colors[ptr + 2] = 0.9;
      }
    }

    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const a = row * cols + col;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    this.terrainGeometry = new THREE.BufferGeometry();
    this.terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.terrainGeometry.setIndex(indices);
    this.terrainGeometry.computeVertexNormals();

    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.08,
      roughness: 0.36,
      side: THREE.DoubleSide
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
    this.terrainMesh.position.set(0, 0, 0);
    this.scene.add(this.terrainMesh);
  }

  updateTerrainGeometry() {
    if (!this.terrainGeometry) return;

    const positions = this.terrainGeometry.attributes.position.array;
    const colors = this.terrainGeometry.attributes.color.array;

    for (let row = 0; row < this.historyLength; row += 1) {
      for (let col = 0; col < this.detailBins; col += 1) {
        const idx = row * this.detailBins + col;
        const amp = this.terrainHistory[idx];
        const ptr = idx * 3;

        positions[ptr + 1] = amp * this.heightScale;

        const ageFade = 1 - row / this.historyLength;
        colors[ptr] = clamp(0.08 + amp * 0.75, 0, 1);
        colors[ptr + 1] = clamp(0.28 + amp * 0.65 + ageFade * 0.1, 0, 1);
        colors[ptr + 2] = clamp(0.45 + amp * 0.55, 0, 1);
      }
    }

    this.terrainGeometry.attributes.position.needsUpdate = true;
    this.terrainGeometry.attributes.color.needsUpdate = true;
  }

  buildRibbon() {
    const rows = this.historyLength;
    const cols = this.detailBins;
    const segmentCount = rows * (cols - 1);

    const positions = new Float32Array(segmentCount * 6);
    const colors = new Float32Array(segmentCount * 6);

    this.ribbonGeometry = new THREE.BufferGeometry();
    this.ribbonGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.ribbonGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.ribbonMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92
    });

    this.ribbonLine = new THREE.LineSegments(this.ribbonGeometry, this.ribbonMaterial);
    this.ribbonLine.visible = false;
    this.scene.add(this.ribbonLine);
  }

  updateRibbonGeometry() {
    if (!this.ribbonGeometry) return;

    const positions = this.ribbonGeometry.attributes.position.array;
    const colors = this.ribbonGeometry.attributes.color.array;

    const cols = this.detailBins;
    const rows = this.historyLength;
    const xStep = this.width / (cols - 1);
    const zStep = this.depth / (rows - 1);

    let ptr = 0;
    for (let row = 0; row < rows; row += 1) {
      const z = -(row * zStep);
      const ageFade = 1 - row / rows;

      for (let col = 0; col < cols - 1; col += 1) {
        const i0 = row * cols + col;
        const i1 = i0 + 1;

        const x0 = -this.width / 2 + col * xStep;
        const x1 = x0 + xStep;

        const y0 = this.ribbonHistory[i0] * (this.heightScale * 0.55);
        const y1 = this.ribbonHistory[i1] * (this.heightScale * 0.55);

        positions[ptr] = x0;
        positions[ptr + 1] = y0 + 6;
        positions[ptr + 2] = z;

        positions[ptr + 3] = x1;
        positions[ptr + 4] = y1 + 6;
        positions[ptr + 5] = z;

        const ampMix = clamp((Math.abs(this.ribbonHistory[i0]) + Math.abs(this.ribbonHistory[i1])) * 0.5, 0, 1);
        const r = clamp(0.15 + ampMix * 0.7, 0, 1);
        const g = clamp(0.4 + ageFade * 0.45, 0, 1);
        const b = clamp(0.9 - ageFade * 0.4 + ampMix * 0.2, 0, 1);

        colors[ptr] = r;
        colors[ptr + 1] = g;
        colors[ptr + 2] = b;
        colors[ptr + 3] = r;
        colors[ptr + 4] = g;
        colors[ptr + 5] = b;

        ptr += 6;
      }
    }

    this.ribbonGeometry.attributes.position.needsUpdate = true;
    this.ribbonGeometry.attributes.color.needsUpdate = true;
  }

  disposeGeometries() {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainGeometry.dispose();
      this.terrainMaterial.dispose();
      this.terrainMesh = null;
      this.terrainGeometry = null;
      this.terrainMaterial = null;
    }

    if (this.ribbonLine) {
      this.scene.remove(this.ribbonLine);
      this.ribbonGeometry.dispose();
      this.ribbonMaterial.dispose();
      this.ribbonLine = null;
      this.ribbonGeometry = null;
      this.ribbonMaterial = null;
    }
  }

  dispose() {
    this.disposeGeometries();
  }
}
