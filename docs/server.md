# Multiplayer Snake Server (`server.js`)

Node.js WebSocket server for the multiplayer Snake game. Run with `node server.js` (requires `npm i ws`).

## Timing

| Constant | Value | Description |
|---|---|---|
| `PORT` | 8080 | WebSocket port |
| `TICK_HZ` | 60 | Physics update rate |
| `SNAPSHOT_HZ` | 20 | State broadcast rate |
| `MAP_WIDTH/HEIGHT` | 4000×4000 | World dimensions (units) |

## WebSocket Protocol

All messages are JSON.

### Client → Server

| `type` | Payload | Description |
|---|---|---|
| `join` | `{name, color}` | Join the game; server responds with `joined` |
| `input` | `{mx, my, boosting}` | Mouse world-position + boost state (sent every frame while joined) |
| `leave` | — | Graceful disconnect |
| `ping` | `{t}` | Latency check; server echoes `pong` with same `t` |

### Server → Client

| `type` | Payload | Description |
|---|---|---|
| `joined` | `{id}` | Confirms join; gives the client its snake ID |
| `snapshot` | `{snakes, apples, ...}` | Full world state broadcast at 20 Hz |
| `pong` | `{t}` | Latency echo |

## Snake Physics

- Player snakes steer toward mouse world-position using angular velocity
- AI snakes use a behavior system with per-personality trait values
- Path is stored as a list of `{x,y}` waypoints; path compression removes collinear points
- Thickness grows with `targetLength`: `base + sqrt(length) * scale`, capped at `base + max`

## Boost System

| Config | Value |
|---|---|
| Depletion rate | 20 units/s |
| Speed multiplier | 2× |
| Minimum length floor | 80 units |
| Overheat duration | 1.9 s |

Boosting drains the snake's length. Can't boost below `minLengthFloor`. Overheat locks out boost for 1.9 s after full drain.

## AI Personality System

Three personality templates, randomly assigned at spawn:

| Personality | Aggression | Dot-seeking | Body avoid radius | Wall margin |
|---|---|---|---|---|
| `fearful` | 0.05–0.25 | 1.6–2.4 | 120–180 | 180–240 |
| `balanced` | 0.40–0.60 | 1.0–1.4 | 95–130 | 140–190 |
| `aggressive` | 0.70–0.95 | 0.7–1.1 | 75–100 | 110–160 |

Traits are sampled from uniform ranges at spawn. `traitJitterOnRespawn: false` means personalities are stable across a session.

## Death & Respawn

- On death, the snake drops pellets every 26 px along its old path (`remainsPelletEveryPx`)
- AI snakes respawn after 1.2 s (`respawnDelay`)
- Players see a UI prompt; respawn is player-initiated

## Spawn Safety

Safe spawn candidates are rejected if within `safeRadiusFromSnakes` (260 units) of any living snake. Up to 60 attempts are made; if all fail, a random point (within wall margin) is used.

## Collectibles

| Type | Lifetime | Value | Notes |
|---|---|---|---|
| Apple | 20 s | — | Grows the snake |
| Trail dot | — | 5 | Left every 50 px of travel; owner can't pick up for 0.9 s |

Magnet pulls nearby dots toward the snake head (`radius: 95`, `maxSpeed: 240`, `falloff: 1.5`).
