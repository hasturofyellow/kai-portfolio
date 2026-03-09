# Game Engine Plan

## Overview
A modular 2D game engine built with vanilla JavaScript and Canvas. Each system is a separate module that can be used independently.

---

## Completed Components

### Settings (`src/settings.js`)
Global key-value store for sharing data across the engine.
- `Settings.add(key, value)` - Store a value
- `Settings.get(key)` - Retrieve a value
- Stores: canvas, ctx, dt (delta time)

### GameObject (`src/gameObject.js`)
Base class for all game entities.
- Properties: x, y, width, height, vx, vy
- `update(dt)` - Moves based on velocity
- `render(ctx)` - Draws a rectangle (override for custom rendering)
- `onCollision(other)` - Called when colliding (override to handle)

### Level (`src/level.js`)
Container that manages and runs GameObjects.
- `add(gameObject)` - Add an object to the level
- `run()` - Updates all objects, checks collisions, renders all objects
- `checkCollisions()` - Detects overlapping colliders and calls callbacks

### Input (`src/input.js`)
Tracks keyboard and mouse state.
- `Input.init(canvas)` - Start listening for input
- `Input.isKeyDown(code)` - Check if key is held (e.g., `'ArrowLeft'`, `'KeyW'`)
- `Input.isKeyJustPressed(code)` - Check if key was just pressed this frame
- `Input.mouse` - Object with x, y, down properties
- `Input.endFrame()` - Reset just-pressed state (called by game loop)

### Collider (`src/collider.js`)
Component for collision detection.
- Attach to GameObject: `obj.collider = new Collider(obj)`
- `collidesWith(other)` - Returns true if overlapping
- Level automatically calls `onCollision()` on both objects when they collide

### Main (`src/main.js`)
Entry point that initializes the engine.
- Creates canvas and context
- Initializes Input system
- Creates Level
- Runs game loop with requestAnimationFrame

---

## Planned Components

### Sprite System (`src/sprite.js`)
Load and display images instead of colored rectangles.

**Features:**
- Load images from URLs
- Sprite sheets (multiple frames in one image)
- Animation (cycle through frames)
- Flip horizontally/vertically

**Planned API:**
```js
// Single image
const sprite = new Sprite('player.png');
sprite.render(ctx, x, y);

// Sprite sheet with animation
const walkAnim = new Animation('walk.png', frameWidth, frameHeight, frameCount);
walkAnim.play();
walkAnim.render(ctx, x, y);
```

---

### Physics System (`src/physics.js`)
Add realistic movement with gravity, friction, and forces.

**Features:**
- Gravity (constant downward acceleration)
- Friction (slows objects over time)
- Bounce (objects rebound off surfaces)
- Apply forces (push objects)

**Planned API:**
```js
// Attach physics to an object
obj.physics = new Physics(obj);
obj.physics.gravity = 980;      // pixels/sec²
obj.physics.friction = 0.9;     // multiplier per frame
obj.physics.bounce = 0.7;       // energy retained on bounce

// Apply a force
obj.physics.applyForce(100, -500);  // push right and up
```

---

### Audio System (`src/audio.js`)
Play sound effects and background music.

**Features:**
- Load and play sound effects
- Background music with loop
- Volume control
- Stop/pause sounds

**Planned API:**
```js
// Sound effects
const jumpSound = new Sound('jump.wav');
jumpSound.play();

// Background music
const music = new Music('level1.mp3');
music.setVolume(0.5);
music.play();
music.stop();
```

---

### Camera System (`src/camera.js`)
Control what part of the game world is visible.

**Features:**
- Follow a target (e.g., player)
- Pan to a position
- Zoom in/out
- Screen shake effect

**Planned API:**
```js
// Create camera
const camera = new Camera(canvas.width, canvas.height);

// Follow player with smoothing
camera.follow(player, 0.1);

// Apply camera transform before rendering
camera.begin(ctx);
level.run();
camera.end(ctx);

// Effects
camera.shake(10, 0.5);  // intensity, duration
camera.zoomTo(2);       // 2x zoom
```

---

## File Structure
```
Game Engine/
├── index.html
├── plan.md
└── src/
    ├── main.js        ✅ Complete
    ├── settings.js    ✅ Complete
    ├── gameObject.js  ✅ Complete
    ├── level.js       ✅ Complete
    ├── input.js       ✅ Complete
    ├── collider.js    ✅ Complete
    ├── sprite.js      ⬜ Planned
    ├── physics.js     ⬜ Planned
    ├── audio.js       ⬜ Planned
    └── camera.js      ⬜ Planned
```

---

## Build Order (Recommended)
1. ~~Settings~~ ✅
2. ~~GameObject~~ ✅
3. ~~Level~~ ✅
4. ~~Input~~ ✅
5. ~~Collider~~ ✅
6. **Sprite System** - See images on screen
7. **Physics System** - Make things fall and bounce
8. **Camera System** - Scroll through larger levels
9. **Audio System** - Add sound and music
