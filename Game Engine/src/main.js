import { Level } from "./level.js";
import { Settings } from "./settings.js";
import { Input } from "./input.js";
import { GameObject } from "./gameObject.js";
import { Collider } from "./collider.js";

// Expose Input globally for console debugging
window.Input = Input;

// === SNAKE GAME CONFIG ===
const GRID_SIZE = 20;      // Size of each cell in pixels
const GRID_WIDTH = 30;     // Number of cells wide
const GRID_HEIGHT = 20;    // Number of cells tall
const MOVE_INTERVAL = 150; // Milliseconds between moves

// === SNAKE CLASS ===
class Snake extends GameObject {
    constructor(x, y) {
        super(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        this.gridX = x;
        this.gridY = y;
        this.segments = [{ x, y }];  // Array of grid positions
        this.direction = { x: 1, y: 0 };  // Moving right initially
        this.nextDirection = { x: 1, y: 0 };
        this.moveTimer = 0;
        this.growing = false;
        this.alive = true;
        this.collider = new Collider(this);
    }

    update(dt) {
        if (!this.alive) return;

        // Handle input (only allow perpendicular turns)
        if (Input.isKeyJustPressed('ArrowUp') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: -1 };
        } else if (Input.isKeyJustPressed('ArrowDown') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: 1 };
        } else if (Input.isKeyJustPressed('ArrowLeft') && this.direction.x === 0) {
            this.nextDirection = { x: -1, y: 0 };
        } else if (Input.isKeyJustPressed('ArrowRight') && this.direction.x === 0) {
            this.nextDirection = { x: 1, y: 0 };
        }

        // Move on interval
        this.moveTimer += dt * 1000;
        if (this.moveTimer >= MOVE_INTERVAL) {
            this.moveTimer = 0;
            this.direction = this.nextDirection;
            this.move();
        }
    }

    move() {
        // Calculate new head position
        const head = this.segments[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= GRID_WIDTH ||
            newHead.y < 0 || newHead.y >= GRID_HEIGHT) {
            this.die();
            return;
        }

        // Check self collision
        for (const segment of this.segments) {
            if (newHead.x === segment.x && newHead.y === segment.y) {
                this.die();
                return;
            }
        }

        // Add new head
        this.segments.unshift(newHead);

        // Remove tail (unless growing)
        if (!this.growing) {
            this.segments.pop();
        }
        this.growing = false;

        // Update position for collision detection
        this.x = newHead.x * GRID_SIZE;
        this.y = newHead.y * GRID_SIZE;
        this.gridX = newHead.x;
        this.gridY = newHead.y;
    }

    grow() {
        this.growing = true;
    }

    die() {
        this.alive = false;
    }

    render(ctx) {
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            // Head is brighter green
            ctx.fillStyle = i === 0 ? '#00ff00' : '#00aa00';
            ctx.fillRect(
                seg.x * GRID_SIZE + 1,
                seg.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );
        }
    }

    onCollision(other) {
        if (other instanceof Food) {
            this.grow();
        }
    }
}

// === FOOD CLASS ===
class Food extends GameObject {
    constructor() {
        super(0, 0, GRID_SIZE, GRID_SIZE);
        this.collider = new Collider(this);
        this.respawn();
    }

    respawn(snake = null) {
        // Find a position not occupied by snake
        let valid = false;
        while (!valid) {
            this.gridX = Math.floor(Math.random() * GRID_WIDTH);
            this.gridY = Math.floor(Math.random() * GRID_HEIGHT);
            valid = true;

            if (snake) {
                for (const seg of snake.segments) {
                    if (seg.x === this.gridX && seg.y === this.gridY) {
                        valid = false;
                        break;
                    }
                }
            }
        }

        this.x = this.gridX * GRID_SIZE;
        this.y = this.gridY * GRID_SIZE;
    }

    render(ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            this.gridX * GRID_SIZE + 2,
            this.gridY * GRID_SIZE + 2,
            GRID_SIZE - 4,
            GRID_SIZE - 4
        );
    }

    onCollision(other) {
        if (other instanceof Snake) {
            this.respawn(other);
        }
    }
}

// === GAME CLASS ===
class Game {
    constructor() {
        // Get the canvas element from HTML
        this.canvas = document.querySelector('canvas');

        // Get the 2D rendering context (the drawing tools)
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size to game area
        this.canvas.width = GRID_WIDTH * GRID_SIZE;
        this.canvas.height = GRID_HEIGHT * GRID_SIZE;

        // Center canvas on screen
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '50%';
        this.canvas.style.top = '50%';
        this.canvas.style.transform = 'translate(-50%, -50%)';
        this.canvas.style.border = '2px solid #333';
        document.body.style.backgroundColor = '#111';

        // Store in Settings so Level and other classes can access them
        Settings.add('canvas', this.canvas);
        Settings.add('ctx', this.ctx);

        // Initialize input system
        Input.init(this.canvas);

        this.level = new Level();

        // Create snake and food
        this.snake = new Snake(5, 10);
        this.food = new Food();
        this.food.respawn(this.snake);

        this.level.add(this.snake);
        this.level.add(this.food);

        this.score = 0;
        this.previousScore = 0;

        this.previoustime = Date.now();

        this.run();
    }

    run = () => {
        let newtime = Date.now();
        Settings.dt = (newtime - this.previoustime) / 1000;
        this.previoustime = newtime;

        // Clear previous frame
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines (subtle)
        this.ctx.strokeStyle = '#252540';
        for (let x = 0; x <= GRID_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * GRID_SIZE, 0);
            this.ctx.lineTo(x * GRID_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= GRID_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * GRID_SIZE);
            this.ctx.lineTo(this.canvas.width, y * GRID_SIZE);
            this.ctx.stroke();
        }

        this.level.run();

        // Update score (snake length - 1)
        this.score = this.snake.segments.length - 1;

        // Draw score
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText(`Score: ${this.score}`, 10, 25);

        // Game over screen
        if (!this.snake.alive) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '40px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px monospace';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Press SPACE to restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
            this.ctx.textAlign = 'left';

            // Restart on space
            if (Input.isKeyJustPressed('Space')) {
                this.restart();
            }
        }

        // Reset "just pressed" state for next frame
        Input.endFrame();

        requestAnimationFrame(this.run);
    }

    restart() {
        // Remove old objects
        this.level.gameObjects = [];

        // Create new snake and food
        this.snake = new Snake(5, 10);
        this.food = new Food();
        this.food.respawn(this.snake);

        this.level.add(this.snake);
        this.level.add(this.food);

        this.score = 0;
    }
}
window.addEventListener("DOMContentLoaded", () => { new Game(); });