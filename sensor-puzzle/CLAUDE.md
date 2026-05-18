# NULL — Sensor Puzzle

Mobile PWA puzzle game that uses device motion sensors. See full game description:

@../docs/games/newer-games.md

## Files

| File | Purpose |
|---|---|
| `index.html` | Entire game — markup, styles, and JS in one file |
| `manifest.json` | PWA manifest (name, icons, theme color) |
| `sw.js` | Service worker for offline caching |
| `icon-192.png` | PWA icon |
| `icon-512.png` | PWA icon (large) |

## Testing

- Desktop: use browser DevTools → Sensors panel to simulate device orientation/motion
- Mobile: serve over HTTPS (required for DeviceMotion API) — use `ngrok` or deploy to test on a real device
- The game shows a fallback screen ("open on a mobile device") if the Sensors API is unavailable
