// Shared keyboard and camera input. Drag to look; pointer lock is opt-in.
export class Input {
    static enabled = true;
    static keys = {};
    static keysJustPressed = {};
    static mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false, dragging: false };
    static mouseButtons = { left: false, right: false, middle: false };
    static scroll = { delta: 0 };
    static canvas = null;
    static cleanup = null;

    static init(canvas) {
        Input.cleanup?.();
        Input.canvas = canvas;
        Input.enabled = true;
        Input.reset();
        Input.mouse.locked = document.pointerLockElement === canvas;
        const listeners = [];
        const listen = (target, type, handler, options) => {
            target.addEventListener(type, handler, options);
            listeners.push(() => target.removeEventListener(type, handler, options));
        };

        // Focusing the canvas after a toolbar action restores game keyboard control.
        if (canvas.tabIndex < 0) canvas.tabIndex = 0;
        listen(window, 'keydown', (e) => {
            if (!Input.enabled || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey ||
                Input.isUIElement(e.target) || Input.isUIElement(document.activeElement)) return;
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
            if (!Input.keys[e.code]) {
                Input.keysJustPressed[e.code] = true;
            }
            Input.keys[e.code] = true;
        });

        listen(window, 'keyup', (e) => {
            Input.keys[e.code] = false;
        });

        listen(window, 'mousemove', (e) => {
            // Recover when a release outside the window did not deliver mouseup.
            if (Input.mouse.dragging && e.buttons === 0) {
                Input.mouse.dragging = false;
                Input.mouseButtons.left = false;
            }
            if (Input.enabled && Input.mouse.locked) {
                Input.mouse.dx += e.movementX || 0;
                Input.mouse.dy += e.movementY || 0;
            } else if (Input.enabled && Input.mouse.dragging) {
                Input.mouse.dx += e.clientX - Input.mouse.x;
                Input.mouse.dy += e.clientY - Input.mouse.y;
            }
            Input.mouse.x = e.clientX;
            Input.mouse.y = e.clientY;
        });

        listen(canvas, 'mousedown', (e) => {
            if (!Input.enabled) return;
            canvas.focus({ preventScroll: true });
            Input.mouse.x = e.clientX;
            Input.mouse.y = e.clientY;
            if (e.button === 0) {
                Input.mouseButtons.left = true;
                Input.mouse.dragging = !Input.mouse.locked;
                e.preventDefault();
            }
            if (e.button === 1) Input.mouseButtons.middle = true;
            if (e.button === 2) Input.mouseButtons.right = true;
        });

        listen(window, 'mouseup', (e) => {
            if (e.button === 0) {
                Input.mouseButtons.left = false;
                Input.mouse.dragging = false;
            }
            if (e.button === 1) Input.mouseButtons.middle = false;
            if (e.button === 2) Input.mouseButtons.right = false;
        });

        listen(document, 'pointerlockchange', () => {
            Input.reset();
            Input.mouse.locked = document.pointerLockElement === canvas;
            if (!Input.enabled && Input.mouse.locked) document.exitPointerLock();
            if (Input.enabled && Input.mouse.locked) canvas.focus({ preventScroll: true });
        });
        listen(document, 'pointerlockerror', () => {
            Input.reset();
            Input.mouse.locked = document.pointerLockElement === canvas;
        });

        // A panel's scroll should never zoom the camera behind it.
        listen(canvas, 'wheel', (e) => {
            if (!Input.enabled) return;
            Input.scroll.delta += e.deltaY;
            e.preventDefault();
        }, { passive: false });

        listen(canvas, 'contextmenu', (e) => e.preventDefault());
        listen(window, 'blur', () => Input.reset());
        listen(document, 'visibilitychange', () => {
            if (document.hidden) Input.reset();
        });
        listen(document, 'focusin', (e) => {
            if (Input.isUIElement(e.target)) Input.reset();
        });

        Input.cleanup = () => {
            listeners.forEach(remove => remove());
            if (document.pointerLockElement === canvas) document.exitPointerLock();
            Input.reset();
            Input.mouse.locked = false;
            Input.canvas = null;
            Input.cleanup = null;
        };
        return Input.cleanup;
    }

    static isUIElement(element) {
        return !!element?.closest?.('input, select, textarea, button, a[href], [role="button"], [contenteditable]:not([contenteditable="false"])');
    }

    static setEnabled(enabled) {
        if (Input.enabled === !!enabled) return;
        Input.enabled = !!enabled;
        Input.reset();
        if (!Input.enabled && Input.canvas && document.pointerLockElement === Input.canvas) {
            document.exitPointerLock();
        }
    }

    // Call directly from an explicit user gesture, such as a "Free look" button.
    // Returns whether the canvas has acquired lock; denial keeps drag-to-look usable.
    static async requestPointerLock() {
        const canvas = Input.canvas;
        if (!Input.enabled || !canvas?.requestPointerLock) return false;
        try {
            await canvas.requestPointerLock();
            return document.pointerLockElement === canvas;
        } catch {
            Input.reset();
            return false;
        }
    }

    static reset() {
        Input.keys = {};
        Input.keysJustPressed = {};
        Input.mouseButtons = { left: false, right: false, middle: false };
        Input.mouse.dragging = false;
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        Input.scroll.delta = 0;
    }

    static endFrame() {
        Input.keysJustPressed = {};
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        Input.scroll.delta = 0;
    }

    static isKeyDown(code) {
        return Input.enabled && Input.keys[code] === true;
    }

    static isKeyJustPressed(code) {
        return Input.enabled && Input.keysJustPressed[code] === true;
    }

    // Get movement input as a vector (-1 to 1)
    static getMovementVector() {
        let x = 0;
        let z = 0;

        if (Input.isKeyDown('KeyW') || Input.isKeyDown('ArrowUp')) z += 1;
        if (Input.isKeyDown('KeyS') || Input.isKeyDown('ArrowDown')) z -= 1;
        if (Input.isKeyDown('KeyA') || Input.isKeyDown('ArrowLeft')) x -= 1;
        if (Input.isKeyDown('KeyD') || Input.isKeyDown('ArrowRight')) x += 1;

        // Normalize diagonal movement
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }

        return { x, z };
    }
}
