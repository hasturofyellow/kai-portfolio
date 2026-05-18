# Kai Portfolio — Agent Guidance

## Task types and templates

| Task | Template | When to use |
|---|---|---|
| New game from scratch | `templates/new-game.md` | Building a new self-contained HTML game |
| 3D cinema work | `templates/3d-scene.md` | Scenes, NPCs, physics, UI in the Three.js engine |
| Feature or bug in an existing game | `templates/game-feature.md` | Editing any existing `.html` game or `src/` file |
| Portfolio hub changes | `templates/portfolio-hub.md` | Adding/updating cards in `index.html` |
| Git / GitHub | `templates/github.md` | Commits, pushes, branches, auto-save behavior |

## Agent delegation rules

Read the task, then pick one path:

- **Direct work** — Use Read/Edit/Bash yourself. Right for tasks touching fewer than ~3 known files.
- **Explore agent** — For open-ended searches: "where is X defined?", "which files use Y?", "find all trigger zones". Give it a specific question, not an open mandate.
- **Plan agent** — Before touching architecture: new scene class, changing the collision contract, refactoring a shared system. Not for single-file edits.

Never spawn an agent to summarize work you can read yourself in one or two tool calls.

## Core requirements for any change

1. Open the game in a browser and verify before reporting done — run `python -m http.server`
2. Match existing code style exactly (indentation, naming, structure)
3. Self-contained HTML files stay self-contained — no new external CDN dependencies without asking
4. Touch only what the task requires — don't clean up adjacent code unless asked
