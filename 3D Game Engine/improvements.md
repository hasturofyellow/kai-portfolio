# Improvements & Roadmap

Ordered by **impact vs. effort** — highest value, lowest cost changes first.

---

## Tier 1 — Quick Wins (high impact, small effort)

### 1. Sound Effects & Ambient Audio
**Why it matters:** The experience is completely silent, which immediately breaks immersion. Sound does more for "feeling" than almost any visual change.
**What to add:**
- Footstep sounds (walk vs. sprint)
- Ambient lobby music loop (lo-fi jazz or cinematic score)
- Coin pickup chime
- Door whoosh on scene transitions
- NPC voice blip during dialogue

**Effort:** Low — Web Audio API or a small library like Howler.js. One audio manager file, ~50 lines.

---

### 2. Persist Progress with localStorage
**Why it matters:** Right now if you refresh the page you lose all your money and tickets. Players can't return to where they left off.
**What to add:**
- Save `currency`, `tickets`, and `collectedBills` to `localStorage` on every change
- Load on startup
- Optional: add a "Reset save" button

**Effort:** ~20 lines in `theaterGame.js`. Huge quality-of-life improvement.

---

### 3. Implement the Main Theater Room
**Why it matters:** There's an existing TODO in the code. Players can see the "MAIN THEATER" doors in the lobby but can't enter. It's a dead end.
**What to add:**
- A large-format theater with a bigger screen
- Show a reel/trailer (an `<iframe>` or video texture) of portfolio projects
- Seats for the full room

**Effort:** Medium — copy the `TheaterRoomScene` pattern and customize. The hardest part is deciding what content goes on the screen.

---

### 4. Use the Existing FBX Animation Files
**Why it matters:** `Dying.fbx`, `Sitting Laughing.fbx`, and full animation packs are already downloaded and sitting in the project folder — none of them are being used.
**What to add:**
- Play `Sitting Laughing.fbx` on the lobby sofa NPCs (or on Gerald when you buy tickets)
- Use the Sword and Shield / Longbow packs to animate wandering lobby patrons
- This makes the world feel alive with almost no extra work

**Effort:** Low — FBXLoader is already wired up for Gerald. Reuse the same loading + AnimationMixer pattern.

---

### 5. Add a Minimap or Location Name Transitions
**Why it matters:** First-time players have no sense of the layout. They don't know where the theaters are or that the dumpster leads somewhere.
**What to add:**
- Simple HTML/CSS location name fade-in when entering a new area (e.g., "LOBBY" fades in and out)
- Or: a small top-corner map showing rooms as labeled rectangles

**Effort:** Location name fade — ~10 lines. A minimap is medium effort but very high orientation value.

---

## Tier 2 — High Impact, Medium Effort

### 6. Mobile / Gamepad Support
**Why it matters:** Portfolio visitors on phones or with controllers currently see nothing (pointer lock fails silently). This cuts off a large audience.
**What to add:**
- Virtual joystick for mobile (left thumb = move, right thumb = look)
- Gamepad support via the existing `input.js` scaffold (it already has the `gamepad` field defined but empty)
- Touch buttons for jump and interact

**Effort:** Medium. The input abstraction in `input.js` already separates concerns. Add touch/gamepad as new input sources into the same normalized output.

---

### 7. Player Customization
**Why it matters:** The player character is a red cylinder with a ball head. Giving players even basic customization (color, hat, name tag) creates investment.
**What to add:**
- Color picker for body color at the start or in a lobby mirror
- Simple accessories: hat, glasses (basic geometry swapped on/off)
- Name badge above player head (CanvasTexture label, already used for signs)

**Effort:** Medium. Player mesh is already a grouped set of geometries in `player.js` — easy to swap materials or attach extras.

---

### 8. NPC Crowd in the Lobby
**Why it matters:** The lobby is visually impressive but completely empty. Even 3–5 wandering patrons would make it feel like an actual cinema.
**What to add:**
- Simple cylinder-body NPCs (same pattern as the player) with randomized colors
- Patrol paths between waypoints
- Idle animations using the existing FBX packs

**Effort:** Medium. Collision already supports static and trigger objects. NPCs don't need dynamic collision with each other — just patrol + avoid walls.

---

### 9. Death / Respawn Polish
**Why it matters:** Dying in the lava cave currently just teleports you silently. It's jarring and unclear.
**What to add:**
- Screen-edge red flash (CSS overlay, opacity flash)
- "$15 deducted" text that pops and fades
- Brief invincibility period after respawn (prevent instant re-death)

**Effort:** Small-medium. CSS overlay already exists for the UI layer. Add a `triggerDeathEffect()` helper.

---

### 10. Lava Cave — Checkpoint System
**Why it matters:** The parkour section is punishing (lose $15 on every fall). A checkpoint partway through makes it feel fair rather than frustrating.
**What to add:**
- A glowing orb/platform halfway through the cave
- Touch it → checkpoint saved (position stored)
- On death → respawn at checkpoint instead of exterior, smaller penalty ($5 instead of $15)

**Effort:** Small. `player.js` and `theaterGame.js` already handle spawn points and death. Add a `checkpointPos` field and a trigger zone.

---

## Tier 3 — Longer-Term / Feature Expansion

### 11. Theater Lobby Scoreboard / Leaderboard
Show high scores for each game (Snake, Stick Soccer, etc.) on the hallway placards. Pull from `localStorage` or a simple backend. Makes the portfolio feel cohesive — the games and the theater are connected.

### 12. Ticket Economy Expansion
More things to spend money on: concession stand items (cosmetics, buffs), arcade cabinet minigames in the lobby, a "VIP lounge" behind a paywall. Deepens the reason to explore and collect bills.

### 13. Post-Processing Bloom
The neon aesthetic is currently faked with emissive + point lights. Adding Three.js `UnrealBloomPass` (from `postprocessing` or `three/addons`) would make the glow effect dramatically more convincing. Medium performance cost — test on target hardware first.

### 14. Dynamic Loading Screens Between Scenes
Instead of an instant pop, show a brief loading card (black screen, location name, flavor text) between scene transitions. The `dispose()` / `build()` pair is fast enough that this is purely cosmetic — but it signals intentionality.

### 15. Drag-to-Look Without Pointer Lock
Some users will never click to lock the mouse. Add a fallback: hold right-click (or left-click-drag) to rotate the camera. This works alongside pointer lock and is the pattern used by most Three.js demos.

---

## Summary Table

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | Sound & ambient audio | ★★★★★ | Low |
| 2 | localStorage persistence | ★★★★ | Low |
| 3 | Main theater room | ★★★★ | Medium |
| 4 | Use existing FBX files | ★★★★ | Low |
| 5 | Location name transitions | ★★★ | Low |
| 6 | Mobile/gamepad support | ★★★★ | Medium |
| 7 | Player customization | ★★★ | Medium |
| 8 | NPC crowd in lobby | ★★★★ | Medium |
| 9 | Death effect polish | ★★★ | Low |
| 10 | Lava cave checkpoint | ★★★ | Low |
| 11 | Scoreboard/leaderboard | ★★★ | Medium-High |
| 12 | Economy expansion | ★★★ | Medium-High |
| 13 | Post-processing bloom | ★★★★ | Medium |
| 14 | Loading screens | ★★ | Low |
| 15 | Drag-to-look fallback | ★★★ | Low |
