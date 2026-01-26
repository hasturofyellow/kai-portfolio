# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Game portfolio website showcasing interactive browser games. Each game is a self-contained HTML file with embedded CSS and JavaScript - no build process required.

## Running the Project

**Portfolio site:** Serve `index.html` via any HTTP server (e.g., `python -m http.server` or VS Code Live Server)

**Multiplayer Snake:** Requires the WebSocket server
```bash
node server.js
```
Server runs on `ws://localhost:8080` with 60 Hz tick rate and 20 Hz snapshot broadcasts.

## Architecture

### Game Structure
- **index.html** - Portfolio hub with game directory, search, and category filtering
- **server.js** - Node.js WebSocket server for multiplayer Snake game
- **Individual games** - Self-contained HTML files in root (snakeGame.html, doodleJump.html, etc.)
- **Game Engine/** - Modular game framework (work in progress)
- **God game/** - 3D Babylon.js game
- **stick/** - Stick Soccer game

### Technologies
- Vanilla JavaScript (ES6+) with Canvas 2D for most games
- Babylon.js for 3D rendering (God Game)
- WebSocket (`ws` package) for multiplayer
- Tailwind CSS in some games (Cookie Clicker)

### Common Patterns
- Canvas rendering with `requestAnimationFrame` game loops
- Object-oriented entities (Actor, Ball, Snake classes)
- Separate update/render phases in game loops
- Browser cookies for persistence (high scores, achievements)
- Modal overlays for menus and settings
- AI behaviors with personality templates (Snake game)

### Snake Server Architecture
The multiplayer snake server uses:
- Fixed tick system (60 Hz physics)
- Snapshot broadcasts (20 Hz state sync)
- Path compression for network efficiency
- Safe spawn point calculation with collision checking
- Configurable AI personalities (fearful, balanced, aggressive)
