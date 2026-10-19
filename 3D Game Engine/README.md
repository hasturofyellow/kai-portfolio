# Kai's Cinema

An explorable 3D portfolio with four screening rooms and a direct project program.
The cinema uses vanilla JavaScript modules and Three.js; there is no build step.

## Run locally

Serve the **repository root**, because project pages, previews and character
models live outside this directory:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/3D%20Game%20Engine/`. The import map loads Three.js
0.160.0 from unpkg, so the initial visit requires an internet connection.

## Visitor experience

- Enter the lobby from the welcome screen, or browse **The program**.
- Each program card offers a screening-room visit and a direct game link.
- All screening rooms are free to visit. Money, souvenir tickets, conversations
  and arcade activities are optional exploration features.
- The program and menus support keyboard, mouse and touch. Exploring the 3D
  world requires a keyboard; the cinema does not provide touch movement controls.
- Snake Game is identified as a prototype. Changes to the cinema do not complete
  its local gameplay or provision its multiplayer server.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Run |
| Drag on the scene | Look around |
| Scroll on the scene | Zoom |
| Space | Jump, or use a nearby door |
| E | Talk, sit, stand or play when prompted |
| Escape | Open / close controls; release optional mouse capture |

**Controls & settings** includes Balanced, High detail and Low detail rendering.
Mouse capture is optional; unsupported or denied requests leave drag-to-look
available. Menus and conversations pause world interactions. Leaving the tab
opens the controls menu and clears held input.

Arcade money is fictional and lasts for the current page visit. Closing an
unfinished slot or Plinko animation returns its wager. Closing Hi-Lo cashes out
the current pot. Scene travel closes these activities safely.

## Implementation

- `src/game/program.js`: the shared project metadata used by the program and rooms.
- `src/ui/cinemaUI.js` and `cinema.css`: responsive menus, navigation and overlays.
- `src/game/theaterGame.js`: navigation, interactions and the render loop.
- `src/game/characterRig.js`: consistent human scale, named animation states,
  grounded locomotion and pelvis alignment for seats. Standing actors use idle
  poses; the occupied lounge sofa is reserved for its NPC.
- `src/game/collision.js`: full-height player collision, solid furniture/NPC
  proxies and camera obstruction checks. Seated characters keep the seat's facing
  direction while the camera orbits; standing returns to clear floor space.
- `src/input.js`: focus-aware keyboard input, drag camera and optional pointer lock.
- `src/game/sceneResources.js`: disposal of owned scene resources while preserving
  player/shared resources. Async model callbacks reject results after departure.

## Verification

From this directory, run the dependency-free regression tests with Node.js:

```sh
node --test
```

The tests cover input reset and focus behavior, scene disposal and late model
loads, navigation and pause state, character movement/seating, camera obstruction,
and arcade timer/payout lifecycle. They use
controlled stubs for browser/Three.js boundaries; browser checks remain necessary
for rendering and native focus/pointer-lock behavior.

Optional tests also parse the actual FBX assets to verify normalized height,
animation clips, grounded shoes and seated pelvis alignment. From this directory,
prepare the existing pinned Three.js runtime once in PowerShell, then rerun tests:

```powershell
./tests/setup-character-runtime.ps1
node --test
```

The setup script downloads Three.js 0.160.0 into the repository's untracked
`output/character-test-runtime` directory. Those asset tests skip when the optional
runtime is absent; the remaining tests do not require network access.

For a browser smoke test:

1. Enter the lobby, drag the camera, move and jump.
2. Open and close Controls with Escape. Change graphics quality.
3. Visit every room from The program and open a game in a separate tab.
4. Return to the lobby and entrance. Confirm room links and hints update.
5. Try optional mouse capture. Both success and rejection should leave usable input.
6. Check narrow layouts: every project and the menu close button must remain reachable.
7. Stop moving and confirm idle poses; walk, run, jump and land. NPCs should face
   visitors, and Gerald's head should stay inside the ticket-window opening.
8. Sit near a theater chair, orbit the camera and stand. Confirm the pose stays
   aligned, occupied seats cannot be selected, and nearby walls do not blank the view.

The supplied FBX models may emit Three.js warnings about excess skinning weights;
the loader reduces them to its supported count. Asset optimization and full touch
exploration are separate future improvements.
