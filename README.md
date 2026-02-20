# Sound Terrain 3D

**Tagline:** Real-time microphone audio becomes a cinematic 3D sound landscape in your browser.

A production-ready browser-based audio visualizer built with Vite, Vanilla JavaScript, Three.js, and the Web Audio API.
LIVE HERE ->>>>> https://sdg5-hub.github.io/AudioTerrain/

## Screenshot

Add screenshots or GIFs here:
- `docs/screenshot-terrain.png`
- `docs/screenshot-ribbon.png`

## Features

- Microphone permission flow with clear states: idle, requesting, running, error.
- Helpful permission-denied and no-device messaging.
- iOS/Safari note for user-gesture restrictions.
- Web Audio API pipeline: `AudioContext` + `MediaStreamSource` + `AnalyserNode`.
- Configurable `fftSize`, `smoothingTimeConstant`, gain/sensitivity, and history length.
- Two visualization modes:
  - Spectrum Terrain (3D scrolling heightfield)
  - Wave Ribbon (time-domain trailing ribbon lines)
- Real-time controls without reload:
  - Start/Stop
  - Mode select
  - FFT size
  - Detail level (Low/Medium/High)
  - Gain
  - Smoothing
  - History
  - Freeze
  - Wireframe
  - Background gradient toggle
- OrbitControls camera with damping + reset camera action.
- Performance-focused updates with reusable typed arrays.
- Visual polish: fog, lighting, status badges, FPS badge, axes tooltip.
- Optional demo mode (synthetic signal) for environments without microphone access.

## How It Works

1. The app requests microphone access with `navigator.mediaDevices.getUserMedia({ audio: true })`.
2. Input is connected to an `AnalyserNode`.
3. Each frame:
   - Frequency FFT data (`getByteFrequencyData`) is sampled for the terrain.
   - Time-domain data (`getByteTimeDomainData`) is sampled for the ribbon.
4. A rolling history buffer stores prior frames.
5. Three.js geometry updates only vertex Y (and color attributes), then renders via `requestAnimationFrame`.

Axis mapping:
- X: Frequency bins (low to high)
- Y: Amplitude
- Z: Time history (newest near camera, older farther away)

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL shown in terminal (typically `http://localhost:5173`).

## Production Build

```bash
npm run build
npm run preview
```

Build artifacts are generated in `dist/`.

## GitHub Pages Deployment (Manual)

1. Build the app:
   ```bash
   npm run build
   ```
2. Commit and push the generated `dist/` (or use a dedicated deploy branch).
3. In GitHub repo settings:
   - Go to **Settings → Pages**.
   - Set source to the branch/folder that contains `dist/` content.
4. If deploying from `gh-pages`, publish the built files from that branch root.

Notes:
- `vite.config.js` is set to `base: './'` to support static hosting paths.
- If you prefer a fixed repo subpath (e.g. `/my-repo/`), set `base` accordingly.

## Troubleshooting Microphone Permissions

- **Permission denied:** open browser site settings and allow microphone, then reload.
- **No microphone found:** connect or enable an input device and retry.
- **Mic busy / unreadable:** close other apps/browser tabs that may be using the microphone.
- **Safari/iOS:** must start audio from a direct user tap/click; auto-start is blocked.

## Privacy

Audio stays in your browser. No audio is uploaded or sent to external servers.

## Roadmap Ideas

- Audio recording and session replay.
- Export frame sequences / high-res snapshots.
- Shader-based materials and post-processing bloom.
- Beat/tempo detection with event markers.
- Presets and camera path automation.

## License

MIT. See `LICENSE`.
