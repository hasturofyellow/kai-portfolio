# 3D Cinema — Claude Guidance

This directory contains Kai's 3D portfolio game built with Three.js. Full technical documentation:

@movieTheaterProject.md

## Working in This Directory

- All source lives in `src/` — entry point is `src/main.js`
- ES modules only; must be served via HTTP (not `file://`)
- No build step, no bundler — Three.js is loaded via CDN import map in `index.html`
- The `improvements.md` file tracks planned features and known issues

## Key Files

| File | Purpose |
|---|---|
| `src/game/theaterGame.js` | Main controller — renderer, scene, game loop, UI |
| `src/game/player.js` | Character physics and camera |
| `src/game/collision.js` | AABB colliders and trigger zones |
| `src/input.js` | Keyboard, pointer-lock, scroll state |
| `src/settings.js` | Global key-value config store |
| `src/game/locations/` | One file per scene (exterior, lobby, lavaCave, theaterRoom) |

## Scene Interface Contract

Every location class must implement:
```js
constructor(scene)
build()                  // spawn geometry and lighting
update(dt, playerPos)    // per-frame animations
getSpawnPoint()          // returns {x, y, z}
dispose()                // remove meshes, free geometry/materials
```

`TheaterGame` calls `dispose()` on the old scene before `build()`-ing the new one.
