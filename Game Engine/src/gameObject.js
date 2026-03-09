export class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;  // velocity x
        this.vy = 0;  // velocity y
    }

    update(dt) {
        // Move based on velocity (dt = delta time for smooth movement)
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    render(ctx) {
        // Default: draw a rectangle (subclasses can override)
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    onCollision(other) {
        // Override in subclasses or instances to handle collisions
    }
}
