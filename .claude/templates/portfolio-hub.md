# Portfolio Hub Template

Use when updating `index.html` — the landing page game directory.

## Adding a game card

1. Add an entry to the `games` array in `index.html`:

```js
{
  title: "Game Name",
  description: "One-sentence hook.",
  category: "Puzzle",        // must match existing or intentional new category
  link: "gamefile.html",
  imageClass: "project-slug" // kebab-case, no spaces
}
```

2. Add a CSS rule in the `<style>` block:

```css
.project-slug {
  background-image: url('thumb.png');
  background-size: cover;
  background-position: center;
}
```

No thumbnail? Use a color placeholder and flag it:

```css
.project-slug { background: #1a1a2e; } /* no thumbnail yet */
```

## How filtering works

`filterGames()` runs on every keyup/change event. It filters the `games` array where:
1. Title or description matches the search text (case-insensitive)
2. Category matches the dropdown (or "All" is selected)

Then calls `renderGames()` to clear and re-render the card grid. A new category value auto-appears in the dropdown — no extra code needed.

## Current categories

`Puzzle`, `Platformer`, `Strategy`, `Idle`, `Multiplayer`, `Sports`, `Story`

Use an existing one unless the game genuinely needs a new category. Inconsistent categories fragment the filter dropdown.

## Common mistakes

- Forgetting the `.project-slug` CSS rule → card renders with a blank background
- Using a typo'd or new category name → card disappears when filtering by the intended category
- Linking to a file that uses ES modules → add a note, don't try to open via `file://`
- Writing a description longer than ~80 chars → overflows the card on small screens

## Success criteria

- [ ] Card appears in the grid on page load
- [ ] Title and description visible on the card
- [ ] Searching by title or description words returns the card
- [ ] Category filter shows the card when that category is selected
- [ ] Clicking the card opens the correct game file
