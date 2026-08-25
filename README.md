# The Echo Terrain

The Echo Terrain is a private journaling atlas that turns daily thoughts into an emotional terrain, an explorer's note, and a planetary-cycle reflection.

## Features

- Offline-first journal entries stored in the browser
- Deterministic emotional readings for Turbulence, Brightness, Density, Velocity, and Synergy
- Interactive topographic terrain render with a five-step time-lapse survey
- Expedition history with entry selection, copying, and deletion
- Planetary cycle prophecy

## Run locally

```bash
pnpm install
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/echo-terrain run dev
```

Open the local address shown by Vite.

## Privacy

Journal entries remain in the browser's local storage. The core experience does not require an account, cloud database, or API key.