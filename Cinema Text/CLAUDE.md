# Kai's Cinema: A Text Adventure (`Cinema Text/`)

A parser-driven text adventure version of the main 3D cinema (`3D Game Engine/`), styled like an early-80s mainframe adventure: inverse status line, phosphor-green monospace, a `>` prompt, terse room prose, a score and move count. Same cast, rooms and quests as the 3D game. The screens open Kai's real games in an overlay.

Everything is in `index.html` (vanilla JS, no dependencies, no build step).

## Running

```bash
python -m http.server
# open http://localhost:8000/Cinema%20Text/
```

## Map

```
                 Main Theater (Critic Pass)
                        |ne
 Screen 3 — Back Hall N — Screen 4          Holding 01 (arrest)
                 |                                |u (vent)
 Screen 1 — Back Hall S — Screen 2          Maintenance Duct → Fan Chamber → Ladder → Main Street
                 |n (old key)
 Concessions — Lobby (the Iris) — Check-In & Lounge
                 |
 Ticket Booth — Main Street — Beside the Dumpster — Trash Room (push the dumpster)
                                     |in
                 The Descent → Basalt → Pillar → Low Slab → Far Platform (up → Main Street)
```

## Cast

Gerald (ticket booth), Rita (check-in), Benny (concessions), the man on the bench, Officer Vale (back hall), the Iris (the eye in the fountain). Gerald, Rita, Benny, the man on the bench, Vale and the Iris use their dialogue from `theaterGame.js`. Iris's errands are ported from `irisQuests.js`.

## Things the 3D game only stubs out

- **Trash Room** behind the dumpster (`dumpsterDive` errand): push the dumpster, search the trash, find the projectionist's note.
- **The Missing Reel**: hidden on a ledge in the maintenance duct ("where the air leaves the building").
- **Main Theater**: opened with the Critic Pass (earned after three different screenings). Two endings:
  - put the reel in the projector and watch it (disobey the Iris), or
  - give the reel to the Iris, get the lens, and walk in wearing it.

## Code layout

- `ROOMS`: name, `desc()`, `exits` (room id, or a function that returns one or `null`), `noExit` messages, `jumps` for the lava stones and the duct, and `lens` lines shown while wearing the Iris's lens.
- `OBJ`: every noun. Scenery has `at` (room or rooms). Portable items have `item: true` and live in `S.locs`. Optional `desc`, `read`, `here`, `onTake`, `talk`, `play`, `enter`, `search`, `sit`.
- `RULES`: the parser, as an ordered list of regexes over the normalised input. Earlier rules win.
- Conversations are numbered menus (`menu(speaker, text, options)`): typing a number picks an option, and anything else ends the conversation.
- `POINTS` drives the score. The max score is computed from it plus 2 per Iris errand.
- Save: autosaves to `localStorage` key `kaiCinemaText.v1` every turn. `SAVE`/`RESTORE` use a separate slot. `UNDO` keeps the last 40 turns.

## Visuals

- **Pixel item icons**: 12×12 grids in `GRIDS` (palette `PAL`), turned into data URLs at load. The reel and lens are drawn with a little circle maths (`roundIcon`). `decorate()` puts an icon in front of the first mention of each item in a paragraph (patterns in `ICON_INFO`). The strip under the status bar (`#bag`) shows money, tickets and everything you carry. Clicking any icon types its word at the prompt.
- **Title cards** (`ART`): ASCII art the first time you enter Main Street, the alley, the lobby, the Descent and the Main Theater (`S.seenArt`).
- **MAP / M**: `drawMap()` draws visited rooms on a fixed grid (`MAP_NODES`, `MAP_EDGES`) with box-drawing lines, and highlights the current room.

## Visual ideas (not built)

1. **The Iris in the status bar**: a small ASCII eye that blinks when an errand completes and dilates while it speaks.
2. **Per-room phosphor tint**: amber for the lava cave, a red/blue strobe on arrest, each screen's colour in its theater.
3. **Film-strip frame**: sprocket holes down the sides, film grain and a projector-flicker brightness wobble.
4. **Dithered 1-bit illustrations** for big moments only (first sight of the eye, the lava lake, both endings).
5. **Typewriter reveal** for the Iris's lines only.
