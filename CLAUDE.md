# Kai's Game Portfolio

Game portfolio website showcasing interactive browser games. Each game is a self-contained HTML file with embedded CSS and JavaScript — no build process required.

## Directory Structure

```
kai-portfolio/
├── index.html          — Portfolio hub (game directory, search, categories)
├── server.js           — Node.js WebSocket server for multiplayer Snake
├── snakeGame.html      — Multiplayer snake game
├── colorWars.html      — Chain Reaction (2–8 player turn-based)
├── cookieClicker.html  — Cosmic Cookie Clicker (idle game)
├── legoTest.html       — Lego-style 3D theater portfolio
├── doodleJump.html     — Vertical platformer
├── ageOfWar.html       — Tower-defense strategy
├── blastblock.html     — Block-clearing puzzle
├── idle.html           — Cheeseburger Empire (incremental)
├── sharkNado.html      — Choose-your-own-adventure
├── stick/              — Stick Soccer
├── 3D Game Engine/     — Three.js cinema portfolio (own CLAUDE.md)
├── God game/           — 3D Babylon.js game
├── sensor-puzzle/      — Mobile PWA sensor puzzle (own CLAUDE.md)
└── docs/               — Extended documentation (imported below)
```

## Running

**Portfolio site:**
```bash
python -m http.server
# open http://localhost:8000
```

**Multiplayer Snake** (WebSocket server required):
```bash
node server.js
# server runs on ws://localhost:8080
```

**3D Cinema** — must be served via HTTP (ES modules); open `3D Game Engine/index.html`.

**Sensor Puzzle** — requires HTTPS on a real mobile device, or DevTools sensor simulation.

## Technologies

| Tech | Used in |
|---|---|
| Vanilla JS + Canvas 2D | Most games |
| Three.js 0.160.0 | 3D Game Engine / cinema |
| Babylon.js | God game |
| WebSocket (`ws` package) | Multiplayer Snake server |
| Tailwind CSS (CDN) | Cookie Clicker |
| Service Worker / PWA | sensor-puzzle |

## Documentation

@docs/portfolio-hub.md

@docs/server.md

@docs/games/snake.md

@docs/games/3d-cinema.md

@docs/games/simple-games.md

@docs/games/newer-games.md

## Behavioral Guidelines

@docs/behavior.md

## Agent Guidance

@.claude/agents.md
