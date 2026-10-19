import * as THREE from 'three';

const EPSILON = 0.00001;
const STEP_HEIGHT = 0.5;
const CAMERA_SKIN = 0.01;
const AXES = ['x', 'y', 'z'];

// Collision utilities for 3D
export class Collision {
    // Store all collidable objects
    static colliders = [];
    static triggers = [];

    static addCollider(mesh, type = 'box') {
        const box = new THREE.Box3().setFromObject(mesh);
        const collider = { mesh, box, type, camera: true, ground: true };
        Collision.colliders.push(collider);
        return collider;
    }

    // Static proxies avoid using the changing pose or decorative parts of a model.
    static addBox(min, max, { camera = true, ground = true } = {}) {
        const box = new THREE.Box3(
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(max.x, max.y, max.z)
        );
        const collider = { mesh: null, box, type: 'box', camera, ground };
        Collision.colliders.push(collider);
        return collider;
    }

    static addTrigger(mesh, callback, id = null) {
        const box = new THREE.Box3().setFromObject(mesh);
        Collision.triggers.push({ mesh, box, callback, id, triggered: false });
    }

    static removeCollider(mesh) {
        Collision.colliders = Collision.colliders.filter(c => c !== mesh && c.mesh !== mesh);
    }

    static removeTrigger(id) {
        Collision.triggers = Collision.triggers.filter(t => t.id !== id);
    }

    static clear() {
        Collision.colliders = [];
        Collision.triggers = [];
    }

    // Update all bounding boxes (call if objects move)
    static updateBoxes() {
        for (const c of Collision.colliders) {
            if (c.mesh) c.box.setFromObject(c.mesh);
        }
        for (const t of Collision.triggers) {
            t.box.setFromObject(t.mesh);
        }
    }

    // Compatibility for callers whose position describes the center of a sphere.
    static checkSphere(center, radius) {
        return Collision.checkBody({ x: center.x, y: center.y - radius, z: center.z }, radius, radius * 2);
    }

    // Resolve a vertical cylinder from its feet. Y remains the player's ground
    // solver's responsibility; a shallow overlap with a walkable top is a step.
    static checkBody(feet, radius, height) {
        let x = feet.x;
        let z = feet.z;
        const headY = feet.y + height;

        // Recheck contacts after each correction so adjoining walls do not add
        // stale push vectors or move the body back into a previously checked box.
        for (let pass = 0; pass < 8; pass++) {
            let moved = false;
            for (const collider of Collision.colliders) {
                const box = collider.box;
                if (headY <= box.min.y + EPSILON || feet.y >= box.max.y - EPSILON) continue;
                if (collider.ground !== false && feet.y >= box.max.y - STEP_HEIGHT) continue;

                const closestX = Math.max(box.min.x, Math.min(box.max.x, x));
                const closestZ = Math.max(box.min.z, Math.min(box.max.z, z));
                const dx = x - closestX;
                const dz = z - closestZ;
                const distanceSq = dx * dx + dz * dz;
                if (distanceSq >= radius * radius - EPSILON) continue;

                if (distanceSq > EPSILON * EPSILON) {
                    const distance = Math.sqrt(distanceSq);
                    const correction = (radius - distance) / distance;
                    x += dx * correction;
                    z += dz * correction;
                } else {
                    // The center is inside the box. Select a real face instead
                    // of Math.sign(0), which cannot separate coincident centers.
                    const left = x - box.min.x + radius;
                    const right = box.max.x - x + radius;
                    const front = z - box.min.z + radius;
                    const back = box.max.z - z + radius;
                    const shortest = Math.min(left, right, front, back);
                    if (shortest === left) x -= left;
                    else if (shortest === right) x += right;
                    else if (shortest === front) z -= front;
                    else z += back;
                }
                moved = true;
            }
            if (!moved) break;
        }

        if (Math.abs(x - feet.x) < EPSILON && Math.abs(z - feet.z) < EPSILON) return null;
        return new THREE.Vector3(x - feet.x, 0, z - feet.z);
    }

    // Shorten the camera boom before it reaches geometry. Expanding the boxes
    // protects the camera's near plane and catches edges as well as face hits.
    static constrainCamera(target, desired, radius = 0.25) {
        const origin = new THREE.Vector3(target.x, target.y, target.z);

        // A seated/teleported target can begin inside a proxy. There is no clear
        // point on that segment, so recover its origin through the nearest face.
        // On equal faces prefer the one away from the desired camera position.
        for (let pass = 0; pass < 8; pass++) {
            let moved = false;
            for (const collider of Collision.colliders) {
                if (collider.camera === false) continue;
                const box = collider.box;
                if (origin.x <= box.min.x - radius || origin.x >= box.max.x + radius ||
                    origin.y <= box.min.y - radius || origin.y >= box.max.y + radius ||
                    origin.z <= box.min.z - radius || origin.z >= box.max.z + radius) continue;

                let bestAxis = 'x';
                let bestMove = Infinity;
                let bestAlignment = Infinity;
                for (const axis of AXES) {
                    for (let side = -1; side <= 1; side += 2) {
                        const edge = side < 0 ? box.min[axis] - radius : box.max[axis] + radius;
                        const move = edge - origin[axis] + side * CAMERA_SKIN;
                        const alignment = move * (desired[axis] - origin[axis]);
                        if (Math.abs(move) < Math.abs(bestMove) - EPSILON ||
                            (Math.abs(Math.abs(move) - Math.abs(bestMove)) < EPSILON && alignment < bestAlignment)) {
                            bestAxis = axis;
                            bestMove = move;
                            bestAlignment = alignment;
                        }
                    }
                }
                origin[bestAxis] += bestMove;
                moved = true;
            }
            if (!moved) break;
        }

        const dx = desired.x - origin.x;
        const dy = desired.y - origin.y;
        const dz = desired.z - origin.z;
        const length = Math.hypot(dx, dy, dz);
        if (length < EPSILON) return origin;
        let fraction = 1;

        for (const collider of Collision.colliders) {
            if (collider.camera === false) continue;
            const box = collider.box;
            let entry = 0;
            let exit = 1;
            for (const axis of AXES) {
                const delta = axis === 'x' ? dx : axis === 'y' ? dy : dz;
                const min = box.min[axis] - radius;
                const max = box.max[axis] + radius;
                if (Math.abs(delta) < EPSILON) {
                    if (origin[axis] < min || origin[axis] > max) { entry = Infinity; break; }
                } else {
                    const first = (min - origin[axis]) / delta;
                    const second = (max - origin[axis]) / delta;
                    entry = Math.max(entry, Math.min(first, second));
                    exit = Math.min(exit, Math.max(first, second));
                }
            }
            if (entry <= exit && exit > EPSILON && entry <= fraction) {
                fraction = Math.max(0, entry - CAMERA_SKIN / length);
            }
        }

        return origin.set(origin.x + dx * fraction, origin.y + dy * fraction, origin.z + dz * fraction);
    }

    // Check triggers and fire callbacks
    static checkTriggers(center, radius) {
        const playerBox = new THREE.Box3(
            new THREE.Vector3(center.x - radius, center.y - radius, center.z - radius),
            new THREE.Vector3(center.x + radius, center.y + radius, center.z + radius)
        );

        for (const t of Collision.triggers) {
            const isInside = playerBox.intersectsBox(t.box);

            if (isInside && !t.triggered) {
                t.triggered = true;
                if (t.callback) t.callback('enter', t);
            } else if (!isInside && t.triggered) {
                t.triggered = false;
                if (t.callback) t.callback('exit', t);
            }
        }
    }

    // Check if player is standing on something (for ground detection)
    static checkGround(center, radius, feetY) {
        let groundY = null;
        for (const c of Collision.colliders) {
            if (c.ground === false) continue;
            const dx = center.x - Math.max(c.box.min.x, Math.min(c.box.max.x, center.x));
            const dz = center.z - Math.max(c.box.min.z, Math.min(c.box.max.z, center.z));
            if (dx * dx + dz * dz > radius * radius + EPSILON) continue;

            const topY = c.box.max.y;
            if (feetY <= topY + 0.1 && feetY >= topY - STEP_HEIGHT &&
                (groundY === null || topY > groundY)) groundY = topY;
        }
        return groundY;
    }
}
