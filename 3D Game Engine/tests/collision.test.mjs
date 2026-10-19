import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Three.js is supplied by a browser import map. These value-type doubles let
// the real collision math run without a renderer or a second Three dependency.
class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
}
class Box3 {
    constructor(min = new Vector3(), max = new Vector3()) { Object.assign(this, { min, max }); }
    setFromObject(mesh) {
        const { min, max } = mesh.bounds;
        this.min.set(min.x, min.y, min.z);
        this.max.set(max.x, max.y, max.z);
        return this;
    }
    intersectsBox(box) {
        return ['x', 'y', 'z'].every(axis => this.min[axis] <= box.max[axis] && this.max[axis] >= box.min[axis]);
    }
}
const source = (await readFile(new URL('../src/game/collision.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace('export class Collision', 'class Collision');
const Collision = new Function('THREE', `${source}\nreturn Collision;`)({ Vector3, Box3 });
const point = (x, y, z) => new Vector3(x, y, z);
const box = (min, max, options) => Collision.addBox(point(...min), point(...max), options);
const close = (actual, expected, tolerance = 0.0001) => assert.ok(
    Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);

test.beforeEach(() => Collision.clear());

test('full-height body blocks an elevated chair that a foot sphere would miss', () => {
    box([-1, 1.2, -1], [1, 2.2, 1], { ground: false });
    const push = Collision.checkBody(point(1.25, 0, 0), 0.4, 3.2);
    close(push.x, 0.15);
    close(push.z, 0);
    assert.equal(Collision.checkBody(point(1.25 + push.x, 0, 0), 0.4, 3.2), null);
    assert.equal(Collision.checkBody(point(1.25, 3, 0), 0.4, 3.2), null);
    assert.equal(Collision.checkBody(point(1.25, -3, 0), 0.4, 3.2), null);
});

test('ground penetration and a 0.4-unit curb are handled as support, never sideways pushes', () => {
    box([-20, -0.2, -20], [20, 0, 20]);
    assert.equal(Collision.checkBody(point(0, -0.04, 0), 0.4, 3.2), null);
    close(Collision.checkGround(point(0, -0.04, 0), 0.4, -0.04), 0);
    box([1, 0, -2], [3, 0.4, 2]);
    assert.equal(Collision.checkBody(point(0.8, 0, 0), 0.4, 3.2), null);
    close(Collision.checkGround(point(0.8, 0, 0), 0.4, 0), 0.4);
});

test('non-walkable furniture and NPCs do not become steps near their tops', () => {
    box([-1, 0, -1], [1, 3.2, 1], { ground: false, camera: false });
    const push = Collision.checkBody(point(1.2, 3, 0), 0.4, 3.2);
    close(push.x, 0.2);
    assert.equal(Collision.checkGround(point(0, 3.1, 0), 0.4, 3.1), null);
});

test('landing on a platform leaves horizontal position intact and selects the highest support', () => {
    box([-3, 0, -3], [3, 1, 3]);
    box([-3, 0, -3], [3, 1.2, 3]);
    assert.equal(Collision.checkBody(point(0, 0.9, 0), 0.4, 3.2), null);
    close(Collision.checkGround(point(0, 0.9, 0), 0.4, 0.9), 1.2);
});

test('circular footprint does not snag or stand on a box beyond the body corner', () => {
    box([0, 0, 0], [2, 3, 2]);
    assert.equal(Collision.checkBody(point(-0.35, 0, -0.35), 0.4, 3.2), null);
    assert.equal(Collision.checkGround(point(-0.35, 3, -0.35), 0.4, 3), null);
    const push = Collision.checkBody(point(-0.2, 0, -0.2), 0.4, 3.2);
    close(Math.hypot(-0.2 + push.x, -0.2 + push.z), 0.4);
});

test('coincident centers separate deterministically and sequential corner contacts stay resolved', () => {
    box([-1, 0, -1], [1, 4, 1], { ground: false });
    const inside = Collision.checkBody(point(0, 0, 0), 0.4, 3.2);
    assert.ok(Math.hypot(inside.x, inside.z) >= 1.4);
    assert.equal(Collision.checkBody(point(inside.x, 0, inside.z), 0.4, 3.2), null);

    Collision.clear();
    box([2, 0, -10], [2.5, 8, 10]);
    box([-10, 0, 2], [10, 8, 2.5]);
    const corner = Collision.checkBody(point(1.8, 0, 1.8), 0.4, 3.2);
    close(1.8 + corner.x, 1.6);
    close(1.8 + corner.z, 1.6);
    assert.equal(Collision.checkBody(point(1.8 + corner.x, 0, 1.8 + corner.z), 0.4, 3.2), null);
});

test('camera boom stops in front of the rear wall even when its desired point is beyond it', () => {
    box([-15, 0, 24.75], [15, 15, 25.25]);
    const target = point(0, 2.5, 22);
    const desired = point(0, 5.8, 32);
    const safe = Collision.constrainCamera(target, desired);
    assert.ok(safe.z < 24.5 && safe.z > 24.45);
    assert.ok(safe.y > target.y && safe.y < desired.y);
    assert.equal(target.z, 22);
    assert.equal(desired.z, 32);
    const insideWall = Collision.constrainCamera(target, point(0, 3, 25));
    assert.ok(insideWall.z < 24.5);
});

test('camera fits through an open doorway but clips its frame and lintel', () => {
    box([-15, 0, 24.75], [-4, 15, 25.25]);
    box([4, 0, 24.75], [15, 15, 25.25]);
    box([-4, 8, 24.75], [4, 15, 25.25]);
    assert.deepEqual(Collision.constrainCamera(point(0, 2.5, 22), point(0, 4, 32)), point(0, 4, 32));
    assert.ok(Collision.constrainCamera(point(3.9, 2.5, 22), point(3.9, 4, 32)).z < 24.5);
    assert.ok(Collision.constrainCamera(point(0, 9, 22), point(0, 9, 32)).z < 24.5);
});

test('ticket conversation camera sees through the window without ignoring booth panels', () => {
    box([10, 0, 0], [14, 1, 0.2]);
    box([10, 3.8, 0], [14, 6, 0.2]);
    box([10, 1, 0], [10.3, 3.8, 0.2]);
    box([13.7, 1, 0], [14, 3.8, 0.2]);
    const desired = point(12.7, 2.7, 2.2);
    assert.deepEqual(Collision.constrainCamera(point(12, 2.6, -2.2), desired), desired);
    assert.ok(Collision.constrainCamera(point(12, 0.5, -2.2), point(12, 0.5, 2.2)).z < -0.25);
});

test('expanded-box camera clearance catches diagonal corners and parallel wall paths', () => {
    box([5, 0, -10], [6, 10, 10]);
    box([-10, 0, 5], [10, 10, 6]);
    const corner = Collision.constrainCamera(point(0, 2, 0), point(10, 4, 10));
    assert.ok(corner.x < 4.75 && corner.z < 4.75);
    assert.deepEqual(Collision.constrainCamera(point(0, 2, 0), point(0, 4, -10)), point(0, 4, -10));
});

test('embedded camera target recovers to the nearest wall face instead of crossing to the outside', () => {
    box([-15, 0, 24.75], [15, 15, 25.25]);
    const safe = Collision.constrainCamera(point(0, 3, 25), point(0, 3, 32));
    assert.ok(safe.z < 24.5 && safe.z > 24.45);
    const stationary = Collision.constrainCamera(point(0, 3, 25), point(0, 3, 25));
    assert.ok(stationary.z < 24.5);
    Collision.clear();
    box([-1, 0, -1], [1, 3, 1]);
    assert.deepEqual(Collision.constrainCamera(point(0, 2.9, 0), point(0, 5, 7)), point(0, 5, 7));
});

test('floor geometry keeps the camera above ground without blocking a normal overhead boom', () => {
    box([-20, -0.5, -20], [20, 0, 20]);
    const below = Collision.constrainCamera(point(0, 2.5, 0), point(0, -2, 10));
    assert.ok(below.y > 0.25 && below.y < 0.3);
    assert.deepEqual(Collision.constrainCamera(point(0, 2.5, 0), point(0, 5, 10)), point(0, 5, 10));
});

test('camera:false ignores NPCs while furniture behind them still shortens the boom', () => {
    box([-2, 0, 1], [2, 4, 2], { camera: false, ground: false });
    const desired = point(0, 3, 10);
    assert.deepEqual(Collision.constrainCamera(point(0, 3, 0), desired), desired);
    box([-2, 0, 5], [2, 4, 6]);
    const safe = Collision.constrainCamera(point(0, 3, 0), desired);
    assert.ok(safe.z > 4.7 && safe.z < 4.75);
});

test('mesh and static proxy registrations update/remove independently and clear on scene disposal', () => {
    const min = point(-1, 0, -1);
    const fixed = Collision.addBox(min, point(1, 4, 1), { camera: false, ground: false });
    min.x = -99;
    close(fixed.box.min.x, -1);
    const mesh = { bounds: new Box3(point(5, 0, 5), point(6, 4, 6)) };
    const dynamic = Collision.addCollider(mesh);
    assert.equal(dynamic.camera, true);
    assert.equal(dynamic.ground, true);
    mesh.bounds.min.x = 4;
    Collision.updateBoxes();
    close(dynamic.box.min.x, 4);
    close(fixed.box.min.x, -1);
    Collision.removeCollider(mesh);
    assert.deepEqual(Collision.colliders, [fixed]);
    Collision.removeCollider(fixed);
    assert.equal(Collision.colliders.length, 0);

    Collision.addCollider(mesh);
    const events = [];
    Collision.addTrigger(mesh, event => events.push(event), 'seat');
    Collision.checkTriggers(point(5, 1, 5), 0.4);
    Collision.checkTriggers(point(5, 1, 5), 0.4);
    Collision.checkTriggers(point(0, 1, 0), 0.4);
    assert.deepEqual(events, ['enter', 'exit']);
    Collision.clear();
    Collision.clear();
    assert.equal(Collision.colliders.length, 0);
    assert.equal(Collision.triggers.length, 0);
    assert.equal(Collision.checkBody(point(5, 0, 5), 0.4, 3.2), null);
    assert.equal(Collision.checkGround(point(5, 4, 5), 0.4, 4), null);
    assert.deepEqual(Collision.constrainCamera(point(0, 2, 0), point(10, 2, 10)), point(10, 2, 10));
});

test('legacy sphere query still returns horizontal correction for a wall', () => {
    box([1, -5, -5], [2, 5, 5]);
    const push = Collision.checkSphere(point(0.8, 1, 0), 0.5);
    close(push.x, -0.3);
    close(push.y, 0);
});
