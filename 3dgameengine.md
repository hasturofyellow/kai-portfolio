# 3D Platformer Game Engine Plan

## Overview
A 3D platformer game engine built with JavaScript and WebGL (via Three.js). Designed for games like Mario 64, Crash Bandicoot, or A Hat in Time.

## Folder Structure
```
3D Game Engine/
├── index.html
├── plan.md
└── src/
    ├── main.js           - Entry point, game loop
    ├── settings.js       - Global settings
    ├── input.js          - Keyboard/mouse/gamepad input
    ├── scene.js          - Scene/level management
    ├── camera.js         - Third-person camera system
    ├── player.js         - Player controller
    ├── physics.js        - Physics & collision
    ├── entity.js         - Base class for 3D objects
    └── assets.js         - Model/texture loading
```

---

## Core Components (Priority Order)

### 1. Renderer & Scene (CRITICAL)
The foundation - displays 3D graphics on screen.

**Technology:** Three.js (WebGL wrapper, much easier than raw WebGL)

**Features:**
- Initialize WebGL renderer
- Create scene graph
- Add meshes (3D objects)
- Basic lighting (ambient + directional)
- Render loop

**Why first:** Nothing else matters if you can't see anything.

```js
// Usage
const renderer = new Renderer(canvas);
const scene = new Scene();
scene.add(cube);
renderer.render(scene, camera);
```

---

### 2. Camera System (CRITICAL)
Third-person camera that follows the player - essential for platformers.

**Features:**
- Follow target (player) with offset
- Orbit around player with mouse/right stick
- Collision with walls (camera doesn't go through geometry)
- Smooth interpolation (lerp)
- Look-at target

**Why second:** Need to see the world from the right angle to test anything.

```js
// Usage
const camera = new ThirdPersonCamera();
camera.setTarget(player);
camera.setDistance(10);
camera.setHeight(5);
camera.update(dt);
```

---

### 3. Input System (CRITICAL)
Handle keyboard, mouse, and gamepad for player control.

**Features:**
- Keyboard state tracking (similar to 2D engine)
- Mouse movement (for camera orbit)
- Gamepad support (analog sticks)
- Input mapping (rebindable controls)

**Why third:** Can't control anything without input.

```js
// Usage
Input.init();
if (Input.isKeyDown('KeyW')) { /* move forward */ }
const look = Input.getMouseDelta();
const stick = Input.getGamepadAxis(0, 'left');
```

---

### 4. Player Controller (CRITICAL)
The character you control - movement, jumping, physics response.

**Features:**
- WASD/stick movement relative to camera
- Jumping with variable height (hold longer = higher)
- Ground detection
- Coyote time (can jump briefly after leaving edge)
- Air control (reduced movement while airborne)

**Why fourth:** The core gameplay feel of a platformer.

```js
// Usage
const player = new PlayerController(mesh);
player.speed = 8;
player.jumpForce = 15;
player.update(dt); // Handles input internally
```

---

### 5. Physics System (CRITICAL)
Gravity, collision detection, and response.

**Features:**
- Gravity (constant downward acceleration)
- AABB or capsule collision detection
- Ground/wall/ceiling detection
- Slopes (walk up gentle slopes, slide down steep ones)
- Moving platforms

**Why fifth:** Platformers need solid collision to feel right.

```js
// Usage
const physics = new Physics();
physics.gravity = -30;
physics.addCollider(player, 'capsule');
physics.addCollider(platform, 'box');
physics.update(dt);
```

---

### 6. Entity System (IMPORTANT)
Base class for all game objects - enemies, collectibles, platforms.

**Features:**
- Position, rotation, scale (transform)
- Update/render lifecycle
- Parent-child hierarchy
- Tags for identification

```js
// Usage
class Coin extends Entity {
    update(dt) {
        this.rotation.y += dt * 2; // Spin
    }
    onCollision(other) {
        if (other.tag === 'player') this.collect();
    }
}
```

---

### 7. Asset Loading (IMPORTANT)
Load 3D models, textures, and audio files.

**Features:**
- GLTF/GLB model loading (industry standard)
- Texture loading
- Audio loading
- Loading screen / progress tracking
- Asset caching

```js
// Usage
const assets = new AssetLoader();
await assets.loadModel('player', 'models/player.glb');
await assets.loadTexture('grass', 'textures/grass.png');
const playerMesh = assets.get('player');
```

---

### 8. Animation System (IMPORTANT)
Animate character models - walk, run, jump, idle.

**Features:**
- Play animations from loaded models
- Blend between animations (smooth transitions)
- Animation events (trigger sounds at footsteps)
- Animation state machine

```js
// Usage
player.animator.play('run');
player.animator.crossFade('jump', 0.2); // Blend over 0.2 seconds
```

---

### 9. Audio System (NICE TO HAVE)
Sound effects and music with 3D positioning.

**Features:**
- 3D positional audio (sounds from world position)
- Background music
- Sound effects
- Volume control

```js
// Usage
Audio.playAt('coin.wav', coin.position);
Audio.playMusic('level1.mp3');
```

---

### 10. Level System (NICE TO HAVE)
Load and manage different levels/scenes.

**Features:**
- Load level from file (JSON or GLTF scene)
- Spawn points
- Checkpoints
- Level transitions

```js
// Usage
LevelManager.load('level1');
LevelManager.setCheckpoint(player.position);
LevelManager.respawn(player);
```

---

## Build Order (Recommended)

| Phase | Component | What You Can Do After |
|-------|-----------|----------------------|
| 1 | Renderer & Scene | See a spinning cube |
| 2 | Camera | Orbit around the cube |
| 3 | Input | Control camera with mouse |
| 4 | Player Controller | Move a capsule around |
| 5 | Physics | Jump and land on platforms |
| 6 | Entity System | Add coins and enemies |
| 7 | Asset Loading | Load real 3D models |
| 8 | Animation | Animated character |
| 9 | Audio | Sound effects |
| 10 | Level System | Multiple levels |

---

## Technology Choices

### Three.js vs Raw WebGL vs Babylon.js

| Option | Pros | Cons |
|--------|------|------|
| **Three.js** (Recommended) | Huge community, lots of examples, good for learning | Less built-in than Babylon |
| Babylon.js | More features built-in, physics included | Heavier, steeper learning curve |
| Raw WebGL | Full control, learn the fundamentals | Very complex, reinventing the wheel |

**Recommendation:** Three.js - best balance of power and simplicity.

### Physics Options

| Option | Pros | Cons |
|--------|------|------|
| **Custom** (Recommended for learning) | Learn how physics works, full control | More work |
| Cannon.js | Full physics simulation | Overkill for platformers |
| Rapier | Fast, modern | Smaller community |

**Recommendation:** Start custom for a platformer (you don't need full physics simulation), consider Cannon.js/Rapier later if needed.

---

## Platformer-Specific Considerations

### What Makes a Platformer Feel Good
1. **Responsive controls** - Instant direction changes, no acceleration delay
2. **Generous coyote time** - 100-150ms grace period after leaving edge
3. **Jump buffering** - Remember jump input slightly before landing
4. **Variable jump height** - Short tap = small hop, hold = full jump
5. **Fast fall** - Press down to fall faster (optional)
6. **Air control** - Can adjust direction mid-air (but less than ground)

### Common Platformer Objects
- Moving platforms
- Bouncy pads
- Collectibles (coins, stars)
- Enemies (with patrol paths)
- Checkpoints
- Death zones (pits, spikes)
- Doors/portals
- Switches/buttons

---

## Getting Started

### Step 1: Set up Three.js
```html
<!-- index.html -->
<script type="importmap">
{
    "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
    }
}
</script>
<script type="module" src="./src/main.js"></script>
```

### Step 2: Basic Scene
```js
// main.js
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add a cube
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
scene.add(cube);
camera.position.z = 5;

// Game loop
function animate() {
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
```

---

## Estimated Complexity

| Component | Difficulty | Lines of Code (approx) |
|-----------|------------|------------------------|
| Renderer setup | Easy | 50 |
| Camera system | Medium | 150 |
| Input system | Easy | 100 |
| Player controller | Hard | 300 |
| Physics/collision | Hard | 400 |
| Entity system | Medium | 100 |
| Asset loading | Medium | 150 |
| Animation | Medium | 200 |
| Audio | Easy | 100 |
| Level system | Medium | 200 |

**Total:** ~1,750 lines for a basic 3D platformer engine

---

## Next Steps

1. Create the `3D Game Engine/` folder
2. Set up index.html with Three.js
3. Create basic scene with a cube
4. Add orbit controls to verify setup works
5. Build components in order listed above
