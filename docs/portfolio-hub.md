# Portfolio Hub (`index.html`)

The landing page and game directory. A single self-contained HTML file — no build step.

## Features

- **Search bar** — live text filter across game titles and descriptions
- **Category filter** — dropdown populated dynamically from the `games` array; updates in sync with the search bar
- **Game cards** — each card has a background image (thumbnail), title, and description; clicking opens the game

## Game Registry

Games are defined as a JS array of objects directly in the HTML:

```js
{
  title: "Game Name",
  description: "Short description",
  category: "Category",
  link: "gamefile.html",
  imageClass: "project-classname"   // maps to a CSS background-image rule
}
```

To add a new game: add an entry to the `games` array and add a corresponding `.project-classname` CSS rule with its thumbnail image.

## Filtering Logic

`filterGames()` runs on every keyup/change event. It filters the `games` array where both:
1. The title or description matches the search text (case-insensitive)
2. The category matches the dropdown selection (or "All" is selected)

Then passes the result to `renderGames()`, which clears and re-renders the card grid.

## Current Games Listed

| Title | File | Category |
|---|---|---|
| Blast Block | blastblock.html | Puzzle |
| Doodle Jump | doodleJump.html | Platformer |
| Snake Game | snakeGame.html | Multiplayer |
| Age of War | ageOfWar.html | Strategy |
| Stick Soccer | stick/ | Sports |
| Cheeseburger Empire | idle.html | Idle |
| Sharknado CYOA | sharkNado.html | Story |

## Styling Notes

- Dark background with card grid layout
- Card thumbnails are CSS `background-image` rules — add `background-size: cover` entries per game
- No external CSS framework; all styles are inline in the `<style>` block
