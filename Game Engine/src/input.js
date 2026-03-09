export class Input {
    static keys = {};        // Currently held keys
    static keysJustPressed = {};  // Keys pressed this frame
    static mouse = { x: 0, y: 0, down: false };

    static init(canvas) {
        window.addEventListener('keydown', (e) => {
            if (!Input.keys[e.code]) {
                Input.keysJustPressed[e.code] = true;
            }
            Input.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            Input.keys[e.code] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            Input.mouse.x = e.offsetX;
            Input.mouse.y = e.offsetY;
        });

        canvas.addEventListener('mousedown', () => Input.mouse.down = true);
        canvas.addEventListener('mouseup', () => Input.mouse.down = false);
    }

    // Call at end of each frame to reset "just pressed" state
    static endFrame() {
        Input.keysJustPressed = {};
    }

    // Is key currently held down?
    static isKeyDown(code) {
        return Input.keys[code] === true;
    }

    // Was key just pressed this frame?
    static isKeyJustPressed(code) {
        return Input.keysJustPressed[code] === true;
    }
}
