# Simple Browser Games

Self-contained HTML files. No server, no build step — open directly in a browser.

## Doodle Jump (`doodleJump.html`)

Vertical platformer. Canvas 2D, ~334 lines.

- Player bounces on platforms that scroll downward
- Falls off the bottom = game over
- Score based on height reached
- Cookie-based high score persistence

## Blast Block (`blastblock.html`)

Puzzle/arcade. Canvas 2D.

- Clear blocks by matching groups
- Distinct from `blockblastcopy.html` (earlier draft, kept for reference)

## Age of War (`ageOfWar.html`)

Tower-defense strategy game. Canvas 2D.

- Spawn units, defend base, attack enemy base
- Multiple unit types and ages/eras

## Stick Soccer (`stick/`)

Physics-based soccer. Lives in the `stick/` directory.

- Two stick figures kick a ball
- Local two-player (shared keyboard) or single-player vs AI

## Idle Game (`idle.html`) — "Cheeseburger Empire"

Incremental idle game. Canvas 2D.

- Click to earn currency
- Buy producers that auto-earn
- Cookie-based save/load

## Sharknado CYOA (`sharkNado.html`)

Choose-your-own-adventure story game.

- Text-based branching narrative
- Sharknado theme
- No canvas — rendered in HTML/DOM

## Common Patterns Across These Games

- `requestAnimationFrame` game loop with `update()` + `render()` phases
- `localStorage` or `document.cookie` for high scores / save state
- Modal overlays for start screen and game-over screen
- All art is either Canvas-drawn primitives or simple image sprites
