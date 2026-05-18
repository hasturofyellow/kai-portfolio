# GitHub / Git Template

## Auto-save hook

A `Stop` hook runs after every Claude response. It:
1. Stages all changes (`git add -A`, respects `.gitignore`)
2. Commits only if something changed — message: `wip: auto-save HH:MM`
3. Pushes to `origin main`

Nothing to do manually during normal work. The push happens automatically.

## Manual commits (milestones)

When a feature is complete, make a real commit before Claude's next response:

```bash
git add -A
git commit -m "Add lava cave parkour section"
git push origin main
```

This replaces the next auto-save with a proper message in the log.

## Commit message style

```
Add X          — new feature or file
Fix X          — bug fix
Update X       — change to existing feature
Remove X       — deletion
wip: auto-save — auto-generated, don't write these manually
```

One line, imperative, no period. If it needs more context, add a blank line then a short paragraph.

## When NOT to rely on auto-save

- Large FBX/zip assets — check they're in `.gitignore` or explicitly excluded
- Work-in-progress that intentionally breaks something — commit manually with a `wip:` prefix
- Secrets or API keys — should never reach `git add` due to `.gitignore`, but double-check

## Branch strategy

This project commits directly to `main`. No feature branches unless a change is experimental and might be reverted. If you want a branch:

```bash
git checkout -b feature-name
# work...
git push origin feature-name
# open a PR on GitHub to merge back
```
