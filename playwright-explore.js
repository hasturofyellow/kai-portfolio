/**
 * Playwright exploration — Kai's Cinema 3D portfolio.
 *
 * Key techniques:
 *  1. Patches pointer lock in addInitScript so camera works in headless.
 *  2. Uses dynamic import() inside page.evaluate() to reach live module
 *     instances (module cache is shared between game and evaluate context).
 *  3. Patches TheaterGame.prototype.run to capture the live game instance
 *     into window.__game, then calls loadLocation() directly for reliable
 *     scene transitions without relying on trigger-zone navigation.
 *  4. Sets player.cameraYaw directly via window.__game.player.cameraYaw.
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'screenshots/explore');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

let idx = 0;
async function shot(page, label) {
    const file = path.join(DIR, `${String(idx++).padStart(2,'0')}_${label}.png`);
    await page.screenshot({ path: file });
    console.log(`  📸  ${path.basename(file)}`);
}

/** Set camera yaw via live game instance. */
async function setYaw(page, yaw) {
    await page.evaluate((y) => { window.__game.player.cameraYaw = y; }, yaw);
    await page.waitForTimeout(120); // let camera smooth to new position
}

/** Teleport player to world position. */
async function teleport(page, x, y, z) {
    await page.evaluate(([px, py, pz]) => {
        window.__game.player.setPosition(px, py, pz);
    }, [x, y, z]);
    await page.waitForTimeout(400);
}

/** Change scene directly, bypassing trigger/walk navigation. */
async function goTo(page, location) {
    await page.evaluate((loc) => { window.__game.loadLocation(loc); }, location);
    await page.waitForTimeout(2000); // let scene build and CDN assets settle
}

/** Hold a key for ms milliseconds. */
async function holdKey(page, code, ms) {
    await page.keyboard.down(code);
    await page.waitForTimeout(ms);
    await page.keyboard.up(code);
}

/** Get current UI text. */
async function ui(page) {
    return page.evaluate(() => ({
        loc: document.getElementById('location')?.textContent?.trim(),
        cash: document.getElementById('currency')?.textContent?.trim(),
        hint: document.getElementById('hint')?.textContent?.trim(),
    }));
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    // Patch pointer lock before anything loads
    await context.addInitScript(() => {
        let _el = null;
        HTMLElement.prototype.requestPointerLock = function () {
            _el = this;
            Object.defineProperty(document, 'pointerLockElement', { get: () => _el, configurable: true });
            document.dispatchEvent(new Event('pointerlockchange'));
        };
        document.exitPointerLock = () => {
            _el = null;
            Object.defineProperty(document, 'pointerLockElement', { get: () => null, configurable: true });
            document.dispatchEvent(new Event('pointerlockchange'));
        };
    });

    const page = await context.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    // ── LOAD ────────────────────────────────────────────────────────────────────
    console.log('\n=== Loading game ===');
    await page.goto('http://localhost:8765/3D%20Game%20Engine/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(4500);

    // Activate pointer lock
    await page.evaluate(() => document.querySelector('canvas').click());
    await page.waitForTimeout(300);

    // Capture live game instance by patching TheaterGame.prototype.run
    await page.evaluate(async () => {
        const { TheaterGame } = await import('./src/game/theaterGame.js');
        const orig = TheaterGame.prototype.run;
        TheaterGame.prototype.run = function () {
            window.__game = this;
            return orig.call(this);
        };
    });
    await page.waitForTimeout(200); // one rAF cycle to store the instance

    const hasGame = await page.evaluate(() => typeof window.__game?.loadLocation === 'function');
    console.log(`Game instance captured: ${hasGame}`);

    // ── EXTERIOR ─────────────────────────────────────────────────────────────────
    console.log('\n=== Exterior ===');
    await goTo(page, 'exterior');
    await page.waitForTimeout(500);

    // Default spawn: facing theater (yaw=π)
    await shot(page, 'ext_01_spawn');

    // Look UP at marquee (pitch up = lower cameraPitch)
    await page.evaluate(() => { window.__game.player.cameraPitch = -0.45; });
    await page.waitForTimeout(300);
    await shot(page, 'ext_02_marquee_look_up');
    await page.evaluate(() => { window.__game.player.cameraPitch = 0.3; });

    // Face LEFT → dumpster side (x=-14), yaw ≈ 3π/2
    await setYaw(page, Math.PI * 1.5);
    await shot(page, 'ext_03_dumpster_side');

    // Walk to dumpster (W moves in forward direction = toward -X when yaw=3π/2)
    await holdKey(page, 'KeyW', 1800);
    await page.waitForTimeout(300);
    await shot(page, 'ext_04_near_dumpster');

    // Reset to center, face ticket booth (yaw = π/2)
    await teleport(page, 0, 1, 8);
    await setYaw(page, Math.PI * 0.5);
    await page.waitForTimeout(400);
    await shot(page, 'ext_05_ticket_booth_side');

    // Walk toward ticket booth
    await holdKey(page, 'KeyW', 1500);
    await page.waitForTimeout(300);
    await shot(page, 'ext_06_near_ticket_booth_npc');

    // Street view: reset and face away from theater (yaw=0 = toward +Z = street)
    await teleport(page, 0, 1, 12);
    await setYaw(page, 0);
    await page.waitForTimeout(400);
    await shot(page, 'ext_07_street_view');

    // Walk toward entrance: reset position, face theater, walk forward
    console.log('\n=== Walking to entrance ===');
    await teleport(page, 0, 1, 12);
    await setYaw(page, Math.PI);
    await page.waitForTimeout(400);
    await holdKey(page, 'KeyW', 2000);
    await page.waitForTimeout(200);
    await shot(page, 'ext_08_halfway_to_door');

    await holdKey(page, 'KeyW', 1500);
    await page.waitForTimeout(200);
    await shot(page, 'ext_09_at_entrance');

    // ── LOBBY ────────────────────────────────────────────────────────────────────
    console.log('\n=== Lobby ===');
    await goTo(page, 'lobby');
    await page.waitForTimeout(600);
    await shot(page, 'lobby_01_spawn');

    // Look around — face the entrance exit (toward +Z, yaw=0)
    await setYaw(page, 0);
    await shot(page, 'lobby_02_face_entrance');

    // Look left — fountain/eye center
    await setYaw(page, Math.PI * 0.5);
    await shot(page, 'lobby_03_face_fountain');

    // Walk toward fountain center
    await holdKey(page, 'KeyW', 1000);
    await page.waitForTimeout(300);
    await shot(page, 'lobby_04_fountain_center');

    // Look up at chandelier
    await page.evaluate(() => { window.__game.player.cameraPitch = -0.45; });
    await page.waitForTimeout(300);
    await shot(page, 'lobby_05_chandelier_ceiling');
    await page.evaluate(() => { window.__game.player.cameraPitch = 0.3; });

    // Look right — arcade corner
    await setYaw(page, Math.PI * 1.5);
    await page.waitForTimeout(300);
    await shot(page, 'lobby_06_arcade_corner');

    // Walk to back area
    await setYaw(page, Math.PI);
    await holdKey(page, 'KeyW', 1500);
    await page.waitForTimeout(300);
    await shot(page, 'lobby_07_back_center');

    // Face theater 1 hallway (back-left = yaw heading to -X side)
    await setYaw(page, Math.PI * 0.6);
    await holdKey(page, 'KeyW', 1000);
    await page.waitForTimeout(300);
    await shot(page, 'lobby_08_theater1_hallway');

    // Full lobby panorama from center
    await teleport(page, 0, 1, 0);
    await setYaw(page, Math.PI);
    await page.waitForTimeout(300);
    await shot(page, 'lobby_09_center_panorama');

    // ── THEATER ROOM ─────────────────────────────────────────────────────────────
    console.log('\n=== Theater 1 — Age of War ===');
    await goTo(page, 'theater1');
    await page.waitForTimeout(600);
    await shot(page, 'theater1_01_spawn');

    // Face screen
    await setYaw(page, Math.PI);
    await holdKey(page, 'KeyW', 1500);
    await page.waitForTimeout(300);
    await shot(page, 'theater1_02_toward_screen');

    // Look at seating — left
    await setYaw(page, Math.PI * 0.5);
    await page.waitForTimeout(300);
    await shot(page, 'theater1_03_seats_left');

    // Look at seating — right
    await setYaw(page, Math.PI * 1.5);
    await page.waitForTimeout(300);
    await shot(page, 'theater1_04_seats_right');

    // Look up at ceiling star field
    await setYaw(page, Math.PI);
    await page.evaluate(() => { window.__game.player.cameraPitch = -0.45; });
    await page.waitForTimeout(300);
    await shot(page, 'theater1_05_ceiling');
    await page.evaluate(() => { window.__game.player.cameraPitch = 0.3; });

    // Walk close to the projection screen
    await holdKey(page, 'KeyW', 1500);
    await page.waitForTimeout(300);
    await shot(page, 'theater1_06_screen_close');

    // ── THEATER 2 — Blast Block (different accent color) ────────────────────────
    console.log('\n=== Theater 2 — Blast Block ===');
    await goTo(page, 'theater2');
    await page.waitForTimeout(600);
    await setYaw(page, Math.PI);
    await holdKey(page, 'KeyW', 1500);
    await page.waitForTimeout(300);
    await shot(page, 'theater2_01_screen');

    // ── LAVA CAVE ────────────────────────────────────────────────────────────────
    console.log('\n=== Lava Cave ===');
    await goTo(page, 'lavacave');
    await page.waitForTimeout(600);
    await shot(page, 'cave_01_spawn');

    // Look at lava below
    await page.evaluate(() => { window.__game.player.cameraPitch = 1.1; });
    await page.waitForTimeout(300);
    await shot(page, 'cave_02_lava_below');
    await page.evaluate(() => { window.__game.player.cameraPitch = 0.3; });

    // Face the platforms / portal
    await setYaw(page, Math.PI);
    await holdKey(page, 'KeyW', 800);
    await page.waitForTimeout(300);
    await shot(page, 'cave_03_platforms');

    // Jump toward platform
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await shot(page, 'cave_04_in_air');

    // ── SUMMARY ────────────────────────────────────────────────────────────────
    const finalUI = await ui(page);
    console.log('\nFinal UI:', finalUI);
    console.log(`\nErrors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.warn(' ', e.slice(0, 120)));

    await browser.close();
    console.log(`\n${idx} screenshots → ${DIR}`);
})();
