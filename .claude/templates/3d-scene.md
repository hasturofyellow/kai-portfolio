# 3D Cinema Template

Use when working inside `3D Game Engine/src/`.

## Scene interface — all four methods are required

```js
constructor(scene) { ... }
build()                    // spawn geometry + lighting
update(dt, playerPos)      // per-frame animation
getSpawnPoint()            // returns {x, y, z}
dispose()                  // remove all meshes, free geometry/materials
```

`TheaterGame` calls `dispose()` before `build()`-ing the new scene. Any leaked object persists forever — always clean up in `dispose()`.

## File map

| What you're changing | File |
|---|---|
| New scene/location | `src/game/locations/newScene.js` (new file) |
| Scene switching, economy, dialogue, UI | `src/game/theaterGame.js` (~1014 lines) |
| Player physics, camera, mesh | `src/game/player.js` |
| Static colliders, trigger zones | `src/game/collision.js` |
| Keyboard, pointer-lock, scroll state | `src/input.js` |

## Adding a trigger zone

```js
// In build():
Collision.addTrigger(
  new THREE.Box3(
    new THREE.Vector3(x1, y1, z1),
    new THREE.Vector3(x2, y2, z2)
  ),
  {
    onEnter: () => { /* fires once on entry */ },
    onExit:  () => { /* fires once on exit  */ }
  }
);

// In dispose():
Collision.clear(); // clears ALL colliders for this scene — always call this
```

## Neon glow (no post-processing bloom)

Neon is faked with high `emissiveIntensity` + a nearby `PointLight`:

```js
const mat = new THREE.MeshStandardMaterial({
  color: 0x000000,
  emissive: 0xff00ff,
  emissiveIntensity: 2.0
});
const glow = new THREE.PointLight(0xff00ff, 3, 8);
glow.position.set(x, y, z);
scene.add(glow);
```

## Player physics values (player.js)

| Property | Value |
|---|---|
| Walk speed | 6 u/s |
| Run speed (Shift) | 11 u/s |
| Jump force | 12 |
| Double-jump force | 10 |
| Gravity | −30 |
| Coyote time | 0.12 s |
| Jump buffer | 0.12 s |

## Economy reference (theaterGame.js)

| Event | Effect |
|---|---|
| Game start | +$25 |
| Pick up $5 bill | +$5 (tracks `collectedBills` Set, won't respawn) |
| Buy 1 ticket | −$5 |
| Buy 3 tickets | −$10 |
| Enter a theater | −1 ticket |
| Die in lava cave | −$15, respawn exterior |

## Rendering settings

| Setting | Value |
|---|---|
| Tone mapping | ACESFilmic, exposure 1.4 |
| Shadows | PCF soft, 2048×2048 |
| Max pixel ratio | 2.0 |
| Fog | Linear, per-scene (exterior 60–150, lobby 55–110, theater 35–70) |

## Running

```bash
python -m http.server
# open http://localhost:8000/3D%20Game%20Engine/
```

Must be served via HTTP — `file://` breaks ES module imports.

## Agent delegation

- **Explore** — find trigger patterns, material usage, or collision setups across files
- **Plan** — before adding a new scene class (affects theaterGame.js switching logic)
- **Direct** — isolated geometry/animation changes within a single location file

## Success criteria

- [ ] Scene loads without console errors
- [ ] `dispose()` removes all objects (switch scenes twice to verify — no console warnings)
- [ ] Trigger zones fire on enter and exit
- [ ] Smooth framerate (no per-frame allocations)
