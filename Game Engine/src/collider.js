export class Collider {
    constructor(gameObject, type = 'rect') {
        this.gameObject = gameObject;  // Reference to the object this is attached to
        this.type = type;              // 'rect' or 'circle'
    }

    // Check if this collider overlaps another
    collidesWith(other) {
        if (!other.collider) return false;

        const a = this.gameObject;
        const b = other;

        // Rectangle vs Rectangle (AABB)
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }
}
