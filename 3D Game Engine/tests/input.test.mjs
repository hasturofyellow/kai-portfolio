import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';

// Load the browser ES module without changing the repository's server package type.
const source = await readFile(new URL('../src/input.js', import.meta.url), 'utf8');
const { Input } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

class Surface {
    listeners = new Map();
    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(handler);
    }
    removeEventListener(type, handler) {
        this.listeners.get(type)?.delete(handler);
    }
    emit(type, props = {}) {
        const event = {
            target: this,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            ...props
        };
        for (const handler of this.listeners.get(type) || []) handler(event);
        return event;
    }
    closest() { return null; }
}

let canvas;
beforeEach(() => {
    globalThis.window = new Surface();
    globalThis.document = new Surface();
    document.hidden = false;
    document.pointerLockElement = null;
    document.activeElement = null;
    document.exitPointerLock = () => {
        document.pointerLockElement = null;
        document.emit('pointerlockchange');
    };
    canvas = new Surface();
    canvas.tabIndex = -1;
    canvas.focus = () => { document.activeElement = canvas; };
    Input.init(canvas);
});

afterEach(() => {
    Input.cleanup?.();
    delete globalThis.window;
    delete globalThis.document;
});

test('drag-to-look accumulates deltas without requiring pointer lock', () => {
    let requests = 0;
    canvas.requestPointerLock = () => { requests++; };
    canvas.emit('click');
    window.emit('mousemove', { clientX: 70, clientY: 20 });
    assert.equal(requests, 0);
    assert.equal(Input.mouse.dx, 0);

    canvas.emit('mousedown', { button: 0, clientX: 100, clientY: 100 });
    window.emit('mousemove', { clientX: 115, clientY: 92 });
    window.emit('mousemove', { clientX: 120, clientY: 95 });
    assert.equal(Input.mouse.locked, false);
    assert.equal(Input.mouse.dragging, true);
    assert.equal(Input.mouse.dx, 20);
    assert.equal(Input.mouse.dy, -5);
    assert.equal(document.activeElement, canvas);

    window.emit('mouseup', { button: 0 });
    window.emit('mousemove', { clientX: 170, clientY: 190 });
    assert.equal(Input.mouse.dragging, false);
    assert.equal(Input.mouse.dx, 20, 'release retains this frame\'s final drag delta');
    Input.endFrame();
    assert.equal(Input.mouse.dx, 0);
    assert.equal(Input.mouse.dy, 0);
});

test('keyboard moves diagonally at unit speed and suppresses gameplay page scrolling', () => {
    const up = window.emit('keydown', { code: 'ArrowUp' });
    window.emit('keydown', { code: 'KeyD' });
    assert.equal(up.defaultPrevented, true);
    assert.deepEqual(Input.getMovementVector(), { x: 1 / Math.sqrt(2), z: 1 / Math.sqrt(2) });
    assert.equal(Input.isKeyJustPressed('KeyD'), true);
    Input.endFrame();
    window.emit('keydown', { code: 'KeyD', repeat: true });
    assert.equal(Input.isKeyJustPressed('KeyD'), false);
    assert.equal(window.emit('keydown', { code: 'Space' }).defaultPrevented, true);
    window.emit('keyup', { code: 'KeyD' });
    assert.equal(Input.isKeyDown('KeyD'), false);
});

test('a drag recovers from a missed mouseup outside the window', () => {
    canvas.emit('mousedown', { button: 0, clientX: 10, clientY: 10 });
    window.emit('mousemove', { clientX: 30, clientY: 40, buttons: 0 });
    assert.equal(Input.mouse.dragging, false);
    assert.equal(Input.mouseButtons.left, false);
    assert.equal(Input.mouse.dx, 0);
});

test('UI focus clears movement and leaves form keys and browser shortcuts alone', () => {
    window.emit('keydown', { code: 'KeyW' });
    for (const kind of ['input', 'button', 'contenteditable']) {
        const control = { closest: selector => selector.includes(kind) ? control : null };
        document.activeElement = control;
        document.emit('focusin', { target: control });
        assert.equal(Input.isKeyDown('KeyW'), false);
        const key = window.emit('keydown', { code: 'Space', target: control });
        assert.equal(key.defaultPrevented, false);
        assert.equal(Input.isKeyJustPressed('Space'), false);
        window.emit('keydown', { code: 'KeyW' });
        assert.equal(Input.isKeyDown('KeyW'), false, 'active control also suppresses window-targeted keys');
    }
    document.activeElement = canvas;
    window.emit('keydown', { code: 'KeyW', ctrlKey: true });
    assert.equal(Input.isKeyDown('KeyW'), false);
});

test('disabling input resets state and blocks keyboard, camera, zoom and locking', async () => {
    window.emit('keydown', { code: 'KeyW' });
    canvas.emit('mousedown', { button: 0, clientX: 2, clientY: 3 });
    window.emit('mousemove', { clientX: 12, clientY: 13 });
    canvas.emit('wheel', { deltaY: 80 });
    Input.setEnabled(false);
    assert.deepEqual(Input.getMovementVector(), { x: 0, z: 0 });
    assert.equal(Input.mouse.dx, 0);
    assert.equal(Input.mouse.dragging, false);
    assert.equal(Input.mouseButtons.left, false);
    assert.equal(Input.scroll.delta, 0);
    window.emit('keydown', { code: 'KeyW' });
    canvas.emit('mousedown', { button: 0, clientX: 20, clientY: 20 });
    window.emit('mousemove', { clientX: 30, clientY: 30 });
    canvas.emit('wheel', { deltaY: 100 });
    assert.equal(Input.mouse.dx, 0);
    assert.equal(Input.scroll.delta, 0);
    assert.equal(await Input.requestPointerLock(), false);
    Input.setEnabled(true);
    assert.equal(Input.isKeyDown('KeyW'), false);
    window.emit('keydown', { code: 'KeyW' });
    assert.equal(Input.isKeyDown('KeyW'), true);
});

test('blur, hiding the page and explicit reset clear held inputs', () => {
    for (const clear of [
        () => window.emit('blur'),
        () => { document.hidden = true; document.emit('visibilitychange'); },
        () => Input.reset()
    ]) {
        window.emit('keydown', { code: 'KeyW' });
        canvas.emit('mousedown', { button: 0, clientX: 0, clientY: 0 });
        window.emit('mousemove', { clientX: 12, clientY: 24 });
        canvas.emit('wheel', { deltaY: 50 });
        clear();
        assert.deepEqual(Input.keys, {});
        assert.deepEqual(Input.keysJustPressed, {});
        assert.equal(Input.mouse.dragging, false);
        assert.equal(Input.mouseButtons.left, false);
        assert.equal(Input.mouse.dx, 0);
        assert.equal(Input.scroll.delta, 0);
    }
});

test('explicit pointer lock handles unsupported, denied and synchronous failures', async () => {
    assert.equal(await Input.requestPointerLock(), false);
    canvas.requestPointerLock = () => Promise.reject(new Error('Denied by browser'));
    assert.equal(await Input.requestPointerLock(), false);
    canvas.requestPointerLock = () => { throw new Error('Unavailable'); };
    assert.equal(await Input.requestPointerLock(), false);
    document.emit('pointerlockerror');
    canvas.emit('mousedown', { button: 0, clientX: 10, clientY: 10 });
    window.emit('mousemove', { clientX: 30, clientY: 10 });
    assert.equal(Input.mouse.dx, 20, 'drag remains available after a denial');
});

test('optional locked camera uses relative motion and disabling releases lock', async () => {
    canvas.requestPointerLock = async () => {
        document.pointerLockElement = canvas;
        document.emit('pointerlockchange');
    };
    assert.equal(await Input.requestPointerLock(), true);
    assert.equal(Input.mouse.locked, true);
    window.emit('mousemove', { clientX: 20, clientY: 20, movementX: 6, movementY: -4 });
    assert.equal(Input.mouse.dx, 6);
    assert.equal(Input.mouse.dy, -4);
    Input.setEnabled(false);
    assert.equal(document.pointerLockElement, null);
    assert.equal(Input.mouse.locked, false);
    assert.equal(Input.mouse.dx, 0);
});

test('zoom only receives canvas scroll and reinitializing removes old listeners', () => {
    window.emit('wheel', { deltaY: 120 });
    assert.equal(Input.scroll.delta, 0);
    assert.equal(canvas.emit('wheel', { deltaY: 20 }).defaultPrevented, true);
    assert.equal(Input.scroll.delta, 20);
    Input.init(canvas);
    canvas.emit('wheel', { deltaY: 20 });
    assert.equal(Input.scroll.delta, 20, 'wheel listeners are not duplicated');
    Input.cleanup();
    window.emit('keydown', { code: 'KeyW' });
    assert.equal(Input.isKeyDown('KeyW'), false);
});
