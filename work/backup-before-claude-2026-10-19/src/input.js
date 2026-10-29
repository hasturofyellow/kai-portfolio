// Input system for keyboard, mouse, and gamepad
export class Input {
    static keys = {};
    static keysJustPressed = {};
    static mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false };
    static mouseButtons = { left: false, right: false, middle: false };
    static mouseButtonsJustPressed = { left: false, right: false, middle: false };
    static doubleClickForward = false;
    static scroll = { delta: 0 };

    static init(canvas) {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (!Input.keys[e.code]) {
                Input.keysJustPressed[e.code] = true;
            }
            Input.keys[e.code] = true;

            if ([
                'KeyW', 'KeyA', 'KeyS', 'KeyD',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Space',
            ].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            Input.keys[e.code] = false;
        });

        // Mouse movement
        window.addEventListener('mousemove', (e) => {
            if (Input.mouse.locked) {
                Input.mouse.dx += e.movementX;
                Input.mouse.dy += e.movementY;
            }
            Input.mouse.x = e.clientX;
            Input.mouse.y = e.clientY;
        });

        // Mouse buttons
        canvas.addEventListener('mousedown', (e) => {
            const button = e.button === 0 ? 'left' : e.button === 1 ? 'middle' : e.button === 2 ? 'right' : null;
            if (!button) return;

            if (!Input.mouseButtons[button]) {
                Input.mouseButtonsJustPressed[button] = true;
            }
            Input.mouseButtons[button] = true;
            e.preventDefault();
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) Input.mouseButtons.left = false;
            if (e.button === 1) Input.mouseButtons.middle = false;
            if (e.button === 2) Input.mouseButtons.right = false;
        });

        // Pointer lock for FPS-style mouse control
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        // A double-click is an intentional short burst in the direction the
        // camera is facing.  Keeping this separate from the held mouse state
        // prevents it from fighting WASD input.
        canvas.addEventListener('dblclick', (e) => {
            if (e.button === 0) Input.doubleClickForward = true;
            e.preventDefault();
        });

        document.addEventListener('pointerlockchange', () => {
            Input.mouse.locked = document.pointerLockElement === canvas;
        });

        // Never leave the player moving after focus changes while a key or
        // button is held down.
        window.addEventListener('blur', () => {
            Input.keys = {};
            Input.keysJustPressed = {};
            Input.mouseButtons = { left: false, right: false, middle: false };
            Input.mouseButtonsJustPressed = { left: false, right: false, middle: false };
            Input.doubleClickForward = false;
        });

        // Scroll wheel for inventory cycling
        window.addEventListener('wheel', (e) => {
            Input.scroll.delta += e.deltaY;
        }, { passive: true });

        // Prevent context menu on right-click
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    static endFrame() {
        Input.keysJustPressed = {};
        Input.mouseButtonsJustPressed = { left: false, right: false, middle: false };
        Input.doubleClickForward = false;
        Input.mouse.dx = 0;
        Input.mouse.dy = 0;
        Input.scroll.delta = 0;
    }

    static isKeyDown(code) {
        return Input.keys[code] === true;
    }

    static isKeyJustPressed(code) {
        return Input.keysJustPressed[code] === true;
    }

    static isMouseButtonJustPressed(button) {
        return Input.mouseButtonsJustPressed[button] === true;
    }

    // Get movement input as a vector (-1 to 1)
    static getMovementVector() {
        let x = 0;
        let z = 0;

        if (Input.isKeyDown('KeyW') || Input.isKeyDown('ArrowUp')) z += 1;
        if (Input.isKeyDown('KeyS') || Input.isKeyDown('ArrowDown')) z -= 1;
        // Project-specific mirrored lateral controls requested for the cinema:
        // A/Left move right and D/Right move left.
        if (Input.isKeyDown('KeyA') || Input.isKeyDown('ArrowLeft')) x += 1;
        if (Input.isKeyDown('KeyD') || Input.isKeyDown('ArrowRight')) x -= 1;

        // Normalize diagonal movement
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }

        return { x, z };
    }
}
