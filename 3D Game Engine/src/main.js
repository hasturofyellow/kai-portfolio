// A dynamic import keeps a useful fallback visible if WebGL or the CDN fails.
import('./game/theaterGame.js').then(({ TheaterGame }) => {
    new TheaterGame();
    document.getElementById('loading-screen').remove();
}).catch((error) => {
    console.error('Cinema could not start:', error);
    document.getElementById('loading-message').textContent =
        'The 3D cinema could not start. Reload to try again, or use the portfolio below.';
});
