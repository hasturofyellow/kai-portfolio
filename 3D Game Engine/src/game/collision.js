import * as THREE from 'three';

// Collision utilities for 3D
export class Collision {
    // Store all collidable objects
    static colliders = [];
    static triggers = [];

    static addCollider(mesh, type = 'box') {
        const box = new THREE.Box3().setFromObject(mesh);
        Collision.colliders.push({ mesh, box, type });
    }

    static addTrigger(mesh, callback, id = null) {
        const box = new THREE.Box3().setFromObject(mesh);
        Collision.triggers.push({ mesh, box, callback, id, triggered: false });
    }

    static removeCollider(mesh) {
        Collision.colliders = Collision.colliders.filter(c => c.mesh !== mesh);
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
            c.box.setFromObject(c.mesh);
        }
        for (const t of Collision.triggers) {
            t.box.setFromObject(t.mesh);
        }
    }

    // Check if a point + radius collides with any collider
    // Returns push-out vector if collision, null if not
    static checkSphere(center, radius) {
        const playerBox = new THREE.Box3(
            new THREE.Vector3(center.x - radius, center.y - radius, center.z - radius),
            new THREE.Vector3(center.x + radius, center.y + radius, center.z + radius)
        );

        let pushOut = new THREE.Vector3();
        let hasCollision = false;

        for (const c of Collision.colliders) {
            if (playerBox.intersectsBox(c.box)) {
                hasCollision = true;

                // Calculate push-out direction
                const colliderCenter = new THREE.Vector3();
                c.box.getCenter(colliderCenter);

                const diff = center.clone().sub(colliderCenter);

                // Find the axis with smallest overlap
                const overlapX = (c.box.max.x - c.box.min.x) / 2 + radius - Math.abs(diff.x);
                const overlapZ = (c.box.max.z - c.box.min.z) / 2 + radius - Math.abs(diff.z);

                if (overlapX < overlapZ) {
                    pushOut.x += Math.sign(diff.x) * overlapX;
                } else {
                    pushOut.z += Math.sign(diff.z) * overlapZ;
                }
            }
        }

        return hasCollision ? pushOut : null;
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
        for (const c of Collision.colliders) {
            // Check if player is above this collider and within its XZ bounds
            const expandedBox = c.box.clone();
            expandedBox.min.x -= radius;
            expandedBox.max.x += radius;
            expandedBox.min.z -= radius;
            expandedBox.max.z += radius;

            if (center.x >= expandedBox.min.x && center.x <= expandedBox.max.x &&
                center.z >= expandedBox.min.z && center.z <= expandedBox.max.z) {

                // Check if feet are near the top of this collider
                const topY = c.box.max.y;
                if (feetY <= topY + 0.1 && feetY >= topY - 0.5) {
                    return topY;
                }
            }
        }
        return null;
    }
}
