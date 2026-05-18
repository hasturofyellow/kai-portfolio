# Snake Game (`snakeGame.html`)

Multiplayer snake game with a self-contained local mode and an optional WebSocket server for online play.

## Modes

| Mode | How to activate | Description |
|---|---|---|
| Local | Default | Single player vs AI snakes, runs entirely in the browser |
| Multiplayer | Enter a server address and click Join | Connects to `server.js` via WebSocket |

## Client Architecture

The file is fully self-contained — no external JS dependencies.

Key objects:
- **`NET`** — WebSocket wrapper. Handles `join`, `input`, `leave`, `ping/pong`. Queues the join message if the socket isn't open yet.
- **`playerSnake`** — The local snake object (in local mode) or a mirrored snapshot (in multiplayer).
- **Render loop** — Canvas 2D, `requestAnimationFrame`. Draws world then HUD overlay.

## WebSocket Client Flow

```
User enters name/color → clicks Join
  → NET.join(name, color)
    → sends {type:'join', name, color}
    → server responds {type:'joined', id}
  → every frame: NET.sendInput(mx, my, boosting)
    → sends {type:'input', mx, my, boosting}
  → on snapshot: update local render state
```

`mx`/`my` are mouse coordinates converted to world-space before sending.

## Visual Details

- Snakes are drawn as connected path segments with rounded caps
- Head has a distinct radius (`getHeadRadius`)
- Name label and personality badge shown above each snake
- HUD shows: mode, joined status, player ID, FPS

## Local Mode AI

Same personality system as the server (`fearful`, `balanced`, `aggressive`), but runs client-side. The server version is authoritative for multiplayer.

## Player Customization

- Name: text input, max 24 characters
- Color: color picker with preset swatches + custom hex input
- Preview snake rendered live as options change

## Controls

| Input | Action |
|---|---|
| Mouse move | Steer snake toward cursor |
| Left click / Space | Boost |
