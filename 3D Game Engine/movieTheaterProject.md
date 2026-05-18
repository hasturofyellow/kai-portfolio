# Kai's Cinema — Project Overview

A Three.js 3D exploration game serving as an interactive portfolio. Players walk through a neon-lit movie theater, talk to an NPC ticket seller, buy tickets, navigate rooms, sit in seats, and launch real portfolio games from the theater screens.

---

## Architecture

```
index.html  →  main.js  →  TheaterGame (theaterGame.js)
                                ├── Input (input.js)
                                ├── Settings (settings.js)
                                ├── Player (player.js)
                                ├── Collision (collision.js)
                                └── Locations
                                    ├── ExteriorScene
                                    ├── LobbyScene
                                    ├── LavaCaveScene
                                    └── TheaterRoomScene (×4)
```

- **index.html** — Minimal HTML5 shell. Imports Three.js v0.160.0 via CDN import map. Dark background, fullscreen canvas, loads `main.js` as an ES module.
- **main.js** — 7 lines. Waits for `DOMContentLoaded`, then creates `new TheaterGame()`.
- **theaterGame.js** (~1014 lines) — Main controller. Owns the Three.js renderer, scene, camera, game loop, UI, and all interaction logic.
- **player.js** — Character physics, camera control, and player mesh.
- **input.js** — Keyboard, mouse pointer-lock, and scroll wheel state.
- **collision.js** — AABB-based static colliders and trigger zones.
- **settings.js** — Thin global key-value store shared across modules.

---

## How the Game Loop Works

Each frame in `theaterGame.js`:
1. Compute delta time (capped at 100ms to prevent spiral-of-death)
2. Update player physics (movement, gravity, collision resolution)
3. Reposition camera behind/above player
4. Process input (interactions, dialogue choices, triggers)
5. Update current location (animations, dynamics)
6. `renderer.render(scene, camera)`
7. Clear frame-specific input state (`Input.endFrame()`)
8. `requestAnimationFrame` for next frame

---

## Player System (`player.js`)

**Mesh:** Simple geometry — red cylinder body, skin-tone sphere head, two black eye spheres. Grouped and placed at y=1.

**Physics values:**
| Property | Value |
|---|---|
| Walk speed | 6 units/s |
| Run speed (Shift) | 11 units/s |
| Jump force | 12 |
| Double-jump force | 10 |
| Gravity | −30 |
| Collision radius | 0.5 |

**Movement:** Input is rotated by the camera's yaw so the player always moves relative to where they're looking. Horizontal velocity decays to 85% per frame when no input is held (friction). The mesh rotates to face the movement direction.

**Jump system:**
- Double jump supported (`jumpsUsed` counter, max 2)
- **Coyote time** (0.12s) — lets you jump briefly after walking off a ledge
- **Jump buffer** (0.12s) — if you press space just before landing, the jump still fires

**Camera:**
- Third-person, offset behind and above the player
- Mouse X → `cameraYaw`, Mouse Y → `cameraPitch` (clamped −0.5 to 1.2 radians)
- Scroll wheel zooms (3–22 units)
- Smooth interpolation using `1 - smoothing^(dt*60)` (frame-rate independent)

---

## Collision System (`collision.js`)

Uses Three.js `Box3` bounding boxes.

**Static colliders** — Physical walls and floors. The player can't pass through them.
- `checkSphere(center, radius)` — returns a push-out vector on X or Z (Y is handled separately by ground detection)
- `checkGround(center, radius, feetY)` — returns the top Y of any surface the player's feet are near

**Triggers** — Invisible `BoxGeometry` zones that fire callbacks on enter/exit events.
- Used for: door entry, theater hallways, NPC dialogue zones, money pickup, screen interaction, exit zones

`Collision.clear()` wipes everything when a new scene loads.

---

## Scene System

Each location is a class with a consistent interface:

```js
class SomeScene {
  constructor(scene) { ... }
  build()            // spawns all geometry and lighting
  update(dt, playerPos) // per-frame animations
  getSpawnPoint()    // returns {x, y, z}
  dispose()          // removes meshes, frees geometry/materials
}
```

`TheaterGame` holds a `currentLocation` reference, calls `dispose()` on it when switching, then constructs and `build()`s the new one.

---

## Locations

### Exterior
Neon-lit cinema frontage under a moonlit sky. Starfield (700 stars), moon with halo layers, asphalt street with cyan lane markings, theater facade with "KAI'S CINEMA" marquee (animated chase lights), four columns with magenta LED edges, a detailed dumpster model, and street lamps.

- Spawn: `(0, 1, 12)`
- Triggers: front door, dumpster (lava cave entry), ticket booth NPC zone
- Money: 2× $5 stacks
- NPC: Gerald at the ticket booth, loaded from `Old Man Idle.fbx` with animation mixer

### Lobby
Grand hub connecting everything. Dark reflective floors with concentric cyan ring inlays, tall columns, chandelier (rotating concentric rings), concession stand, ticket counter, lounge area with sofas, arcade corner with 3 cabinets, and four hallway archways leading to theaters.

- Spawn: `(0, 1, 20)`
- Key feature: **Fountain Eye** — a giant eyeball in the center pool that rotates to track the player's position and has a breathing pupil dilation effect
- Seats: 2 sofas (interactive sit mechanic)
- 4 theater hallways (color-coded, require 1 ticket each)

### Lava Cave
Parkour platforming section. Lava plane at y=−3 with pulsing orange glow. Seven stepping-stone platforms at varying heights. Destination platform with a glowing purple portal (leads to Doodle Jump).

- Spawn: `(0, 1, 10)`
- Death zone: `y < −1` → lose $15, respawn at exterior
- Money: $5 stack on the far platform
- Entry: from the dumpster in the exterior

### Theater Rooms (×4)
Generic parameterized template. Each theater has a game title, game URL, and a neon accent color that recolors the entire room (screen glow, seat edges, aisle lights, wall strips).

| Theater | Game | Color |
|---|---|---|
| 1 | Age of War | Orange-red |
| 2 | Blast Block | Blue |
| 3 | Stick Soccer | Green |
| 4 | Snake Game | Mint |

Features: dark cinema rows (seats skip the center aisle), projection beam cone from back ceiling to screen, pulsing screen with play icon, neon corner triangles, exit arch.

- Spawn: `(0, 1, 22)`
- Press E near screen → opens game in a new tab

---

## Economy & Progression

| Action | Effect |
|---|---|
| Start game | $25 |
| Pick up $5 bill | +$5 (persists, won't respawn) |
| Buy 1 ticket | −$5 |
| Buy 3 tickets | −$10 (bulk deal) |
| Enter a theater | −1 ticket |
| Die in lava cave | −$15, respawn exterior |

`collectedBills` is a `Set` stored on `TheaterGame`. Bills are tracked by ID so they don't respawn when you re-enter a scene.

---

## Dialogue System

`openDialogue(speaker, text, options)` renders a panel at the bottom of the screen with labeled key hints. Options call arbitrary action callbacks.

Gerald the ticket seller has a full branching conversation:
- Greeting → purchase menu
- "Buy 1 ticket" (requires $5) / "Buy 3 tickets" (requires $10) / "Never mind"
- Feedback messages if funds are insufficient

During dialogue, the camera pans closer to the NPC and smoothing is tightened for a cinematic feel. Camera settings are restored on close.

---

## Sitting Mechanic

When the player is within range of a seat (sofa or theater chair), pressing E:
1. Locks player position and orientation to the seat
2. Scales player mesh to 72% height (seated look)
3. Moves camera to a close cinematic offset
4. Displays "Press E to stand" hint

Pressing E again restores everything.

---

## Rendering

| Setting | Value |
|---|---|
| Renderer | WebGL, antialiased |
| Tone mapping | ACESFilmic |
| Exposure | 1.4 |
| Color space | sRGB |
| Shadows | PCF soft, 2048×2048 |
| Max pixel ratio | 2.0 |

**Lighting approach:** No post-processing bloom. Neon glow is faked via `emissive` on materials + nearby `PointLight` sources. Each scene has its own ambient, hemisphere, and directional light setup tuned to its mood.

**Fog:** Linear fog in every scene for atmospheric depth (exterior: 60–150, lobby: 55–110, theater: 35–70).

---

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Look |
| Click | Lock mouse pointer |
| Space | Jump / interact with doors |
| Shift | Sprint |
| E | Talk / sit / interact with screen / stand up |
| Scroll | Zoom camera |

---

## Asset Files

The following FBX files are in the project directory but only `Old Man Idle.fbx` is actively loaded:
- `Old Man Idle.fbx` — Gerald's idle animation (ticket booth NPC)
- `Dying.fbx` — Unused
- `Sitting Laughing.fbx` — Unused
- `Capoeira Pack.zip`, `Longbow Locomotion Pack.zip`, `Sword and Shield Pack.zip` — Unused animation packs

---

## Current Limitations

- **Main Theater** — Referenced in code but not implemented (TODO comment in theaterGame.js)
- **No audio** — The entire experience is silent
- **No mobile support** — Requires pointer lock (desktop only)
- **No save system** — Progress resets on page refresh (except `collectedBills` which is in-memory only)
- **Hard-coded controls** — No remapping UI
- **No LOD, instancing, or mesh batching** — Fine for the current scale
- **Unused FBX assets** — Several animation files in the directory serve no current purpose
