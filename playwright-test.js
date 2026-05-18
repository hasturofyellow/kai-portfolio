const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    const url = 'http://localhost:8765/3D%20Game%20Engine/';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for canvas to appear (Three.js appends it to body)
    await page.waitForSelector('canvas', { timeout: 15000 });
    console.log('Canvas element found.');

    // Screenshot immediately after canvas appears
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_canvas_loaded.png') });
    console.log('Screenshot 01: canvas loaded');

    // Wait for scene to render (give Three.js + network time)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_scene_3s.png') });
    console.log('Screenshot 02: 3 seconds in');

    // Wait a bit more for assets to fully load
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_scene_7s.png') });
    console.log('Screenshot 03: 7 seconds in');

    // Check canvas dimensions
    const canvasInfo = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? { width: c.width, height: c.height, style: c.style.cssText } : null;
    });
    console.log('Canvas info:', canvasInfo);

    if (errors.length) {
        console.warn('\nConsole errors detected:');
        errors.forEach(e => console.warn(' -', e));
    } else {
        console.log('\nNo console errors.');
    }

    await browser.close();
    console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
})();
