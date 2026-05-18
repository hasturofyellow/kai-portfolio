# Newer Games

More recently added games, not yet in the portfolio hub index.

## Chain Reaction — Multiplayer (`colorWars.html`)

Turn-based strategy game for 2–8 players on a shared screen. ~352 lines.

**Mechanics:**
- Grid of cells (configurable rows × cols, 3–9 each)
- Each cell holds colored orbs; when a cell reaches its "critical mass" (number of adjacent cells), it explodes and spreads to neighbors, converting their orbs to the current player's color
- Chain reactions can cascade across the board
- A player is eliminated when they lose all their orbs (after having placed at least one)
- Last player standing wins

**Rules:**
- First move of the entire game may be placed on any empty cell
- All subsequent moves must be placed on a cell you already own

**Config options (in-page controls):**
- Rows, Cols (3–9)
- Number of players (2–8)
- New Game / Reset buttons

**Tech:** Vanilla JS, DOM-rendered grid (no canvas). Dark blue color scheme (`#0f1724` background). Each player has a distinct CSS color variable.

---

## Cosmic Cookie Clicker (`cookieClicker.html`)

Idle clicker game. ~560 lines. Uses Tailwind CSS + Font Awesome via CDN.

**Mechanics:**
- Click the big cookie to earn cookies
- Buy buildings (Cursor, Grandma, Farm, Mine, Factory, Bank, Temple, Wizard Tower) that produce cookies per second (CPS)
- Unlock upgrades that multiply click power or CPS once click/build thresholds are met
- CPS contributes a percentage to each click's power (standard idle game mechanic)

**Persistence:** `localStorage` save/load. Manual save button + auto-save. Wipe/reset button.

**Tech:** Tailwind CSS utility classes for layout. `requestAnimationFrame`-driven game loop.

---

## Lego Theater (`legoTest.html`)

3D Lego-style theater portfolio, alternative to the Three.js cinema. ~2303 lines — the largest single file in the repo.

- Block-built scene rendered in the browser
- Shares the portfolio-as-game concept with `3D Game Engine/` but uses a distinct visual style
- Self-contained; no external 3D library CDN — rendering logic is embedded

---

## NULL — Sensor Puzzle (`sensor-puzzle/`)

Mobile-first puzzle game that uses device sensors. Installable as a PWA.

**Mechanics:**
- Players use their phone's gyroscope / accelerometer / other sensors to solve puzzles
- Falls back to a "open on a mobile device" screen if no sensors are detected
- Puzzle nodes arranged in a grid; each node has a symbol and must be activated via physical device movement

**PWA setup:**
- `manifest.json` — app name, icons (`icon-192.png`, `icon-512.png`), theme color `#0d0d0d`
- `sw.js` — service worker for offline caching
- `meta` tags for Apple mobile web app support

**Design:** Monochrome dark theme (`#0d0d0d` background, `#d0d0d0` text). No color accents — purely typographic/symbolic. Title displayed as "NULL".

**Note:** Requires a real mobile device with sensors (or browser DevTools sensor simulation) — does not work on desktop.
