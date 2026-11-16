# Cinema Hangout (`Cinema Hangout/`)

A 2D, room-based take on the Kai Cinema: an alternative to the Three.js version in `3D Game Engine/`. Flat cartoon rooms, click-to-walk, speech bubbles, a shop and a decoratable room, in the style of online hangout games. The characters and art are original.

Everything is in `index.html` (Canvas 2D + vanilla JS, no dependencies, no build step).

## Running

Serve the repo root over HTTP so the screens can load the other games:

```bash
python -m http.server
# open http://localhost:8000/Cinema%20Hangout/
```

## Rooms

| Key | Title | Reached from |
|---|---|---|
| `street` | Main Street | Start; map |
| `lobby` | Lobby | Cinema doors |
| `arcade` | Arcade | Lobby arch |
| `theater` | The Screens | Lobby back door |
| `projection` | Projection Booth | Door at the right of The Screens |
| `trash` | Trash Room | Staff door on Main Street (unlocks at the Dumpster Diving task) |
| `cave` | Under the Street | The dumpster |
| `jail` | Holding 01 | Getting arrested (no map access) |
| `gift` | Gift Shop | Pink shop on Main Street |
| `myroom` | My Room | Map |

Each room object has `floorTop`, a walkable `poly`, `entries` (spawn points keyed by the room you came from), `drawBg`, depth-sorted `props`, clickable `hotspots` and `npcs`. `myroom` also builds props and hotspots from placed furniture (`dynProps` / `dynHotspots`).

## Systems

- **Iris quests**: the 10-step chain from `3D Game Engine/src/game/irisQuests.js`, run in order (`QUESTS`). Relative quests count from the value when accepted (`questBase`).
- **Tickets and arrests**: one ticket per screening. Sneaking in sets `criminal`; Officer Vale then chases and arrests you. Leave the cell by paying Deputy Hank 10 coins or unscrewing the vent (3 clicks).
- **Arcade**: Slots, Hi-Lo, Plinko and Popcorn Catch, all paying in coins.
- **Shop**: clothing (`ITEMS`, head / face / neck slots), the Kernel pet and furniture (`FURNITURE`). Wardrobe to equip; furniture is placed by clicking the floor in My Room.
- **Player card**: click yourself. Shows stats and the 14 stamps (`STAMPS`).
- **Social**: emotes, wave / dance / sit, popcorn throwing, visitors who come and go and reply to chat.
- **Save**: `localStorage` key `kaiCinemaHangout.v2`, written every 3 s and on key events.

## Controls

Click to walk or interact. W wave, D dance, S sit, T throw popcorn, M map, Enter chat, Esc cancel.
