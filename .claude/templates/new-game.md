# New Game Template

Use when building a brand-new game from scratch.

## Checklist

1. Build the game file — `gameName.html`, self-contained (inline CSS + JS)
2. Register in portfolio hub — add entry to `games` array in `index.html`
3. Add thumbnail — `.project-gamename { background-image: url(...) }` CSS rule in `index.html`

## Game file structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>Game Name</title>
  <style>/* all styles inline */</style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    // --- constants ---
    // --- state ---
    // --- init ---
    // --- update ---
    // --- render ---
    // --- input ---
    // requestAnimationFrame loop
  </script>
</body>
</html>
```

## Portfolio hub entry

```js
{
  title: "Game Name",
  description: "One-sentence hook.",
  category: "Puzzle|Platformer|Strategy|Idle|Multiplayer|Sports|Story",
  link: "gameName.html",
  imageClass: "project-gamename"
}
```

Add a matching CSS rule in `index.html`:

```css
.project-gamename {
  background-image: url('thumb.png');
  background-size: cover;
  background-position: center;
}
```

If no thumbnail exists yet, use a color placeholder and note it:

```css
.project-gamename { background: #1a1a2e; }
```

## Common patterns

| Pattern | Used in |
|---|---|
| `requestAnimationFrame` loop | All Canvas 2D games |
| `localStorage` | High score / save state (Cookie Clicker, Snake) |
| `document.cookie` | Alternative persistence (Doodle Jump) |
| Modal overlay | Start screen + game over (most games) |
| DOM grid (no canvas) | Turn-based / text games (Chain Reaction, Sharknado) |

## Success criteria

- [ ] Game loads and plays in browser without console errors
- [ ] Appears correctly in the portfolio hub (thumbnail, title, description)
- [ ] Category filter in the hub shows the card when selected
- [ ] No external CDN dependencies added (or explicitly approved)
