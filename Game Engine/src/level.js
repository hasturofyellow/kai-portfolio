import { Settings } from "./settings.js";
import { Collider } from "./collider.js";

export class Level {
    constructor() {
        this.gameObjects = [];
    }

    add(gameObject) {
        this.gameObjects.push(gameObject);
    }

    run() {
        const ctx = Settings.ctx;
        const dt = Settings.dt;

        for (const obj of this.gameObjects) {
            obj.update(dt);
        }

        this.checkCollisions();

        for (const obj of this.gameObjects) {
            obj.render(ctx);
        }
    }

    checkCollisions() {
        // Get only objects that have colliders
        const collidables = this.gameObjects.filter(obj => obj.collider);

        // Check each pair
        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const a = collidables[i];
                const b = collidables[j];

                if (a.collider.collidesWith(b)) {
                    a.onCollision(b);
                    b.onCollision(a);
                }
            }
        }
    }
}
