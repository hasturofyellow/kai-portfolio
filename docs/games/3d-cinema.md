# 3D Cinema Game (`3D Game Engine/`)

Interactive 3D portfolio built with Three.js. Players explore a neon-lit movie theater, earn in-game currency, and launch real portfolio games from theater screens.

Full technical documentation is in the project subdirectory:

@3D Game Engine/movieTheaterProject.md

## Quick Reference

- **Entry point:** `3D Game Engine/index.html` → `main.js` → `TheaterGame`
- **Three.js version:** 0.160.0 via CDN import map
- **Renderer:** WebGL, ACESFilmic tone mapping, PCF soft shadows

## Source Layout

```
3D Game Engine/src/
  main.js           — 7 lines, bootstraps TheaterGame
  settings.js       — global key-value store
  input.js          — keyboard, pointer-lock, scroll wheel
  game/
    theaterGame.js  — main controller (~1014 lines)
    player.js       — physics, camera, mesh
    collision.js    — AABB colliders + trigger zones
    locations/
      exterior.js
      lobby.js
      theaterRoom.js
      lavaCaveScene.js
```

## Running

Open `3D Game Engine/index.html` via any HTTP server (not `file://` — ES modules require a server).

```bash
python -m http.server
# then open http://localhost:8000/3D Game Engine/
```

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Look (requires pointer lock — click canvas first) |
| Space | Jump / interact with doors |
| Shift | Sprint |
| E | Talk / sit / interact with screen / stand up |
| Scroll | Zoom camera |
