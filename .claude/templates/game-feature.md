# Game Feature / Bug Fix Template

Use when editing an existing game file.

## Before touching code

1. Open the game in a browser and reproduce the current behavior
2. Read only the relevant section — don't scan the whole file first
3. State the bug or feature in one sentence before writing any code

## Surgical edit rules

- Touch only lines that directly implement the task
- Match the file's existing style (indentation, naming, semicolons)
- Remove only imports/variables that YOUR changes make unused
- Don't rename, reformat, or clean up things you didn't break

## File sizes (for context before reading)

| Game | File | Lines |
|---|---|---|
| Lego Theater | `legoTest.html` | ~2303 |
| Snake (client) | `snakeGame.html` | large |
| Cookie Clicker | `cookieClicker.html` | ~560 |
| Chain Reaction | `colorWars.html` | ~352 |
| Doodle Jump | `doodleJump.html` | ~334 |
| Age of War | `ageOfWar.html` | medium |
| Stick Soccer | `stick/` | directory |

For large files, use `Read` with `offset` + `limit` to read only the relevant section rather than loading the whole file.

## Multiplayer Snake split

`server.js` — authoritative physics, AI, state broadcast  
`snakeGame.html` — rendering, input, NET websocket wrapper

Before editing, decide: is this bug client-side (rendering, input, NET wrapper) or server-side (physics, AI, snapshot)? They're separate files.

## Server changes

If editing `server.js`, restart it and reconnect the client:

```bash
node server.js
# ws://localhost:8080
```

## Success criteria

- [ ] The specific bug is fixed or feature works as described
- [ ] No regressions in adjacent behavior (test the feature's neighbors)
- [ ] Verified in browser, not just visually confirmed in code
