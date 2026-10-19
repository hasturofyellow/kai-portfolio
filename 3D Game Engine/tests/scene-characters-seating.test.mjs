import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helper = await readFile(new URL('../src/game/sceneResources.js', import.meta.url), 'utf8');
const { disposeOwnedObjects } = await import(`data:text/javascript;base64,${Buffer.from(helper).toString('base64')}`);

function vector() {
    return { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
}
function resource(properties = {}) {
    return { ...properties, disposals: 0, dispose() { this.disposals++; } };
}
class Object3D {
    constructor() { this.children = []; this.parent = null; this.position = vector(); this.rotation = vector(); }
    add(child) { this.children.push(child); child.parent = this; }
    traverse(callback) { callback(this); this.children.forEach(child => child.traverse(callback)); }
    updateMatrixWorld() { this.traverse(child => { child.matrixWorldReady = true; }); }
    removeFromParent() {
        if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
        this.parent = null;
    }
}
class Mesh extends Object3D {
    constructor(geometry, material = resource()) { super(); this.geometry = geometry; this.material = material; }
}
class Geometry {
    constructor(width, height, depth) { return resource({ width, height, depth }); }
}
class Material { constructor(properties) { return resource(properties); } }

// Geometry-bound double: apply the actual scene nodes' yaw and translations to
// all eight corners, so rotated sofas are checked in world space.
class Box3 {
    setFromObject(object) {
        assert.equal(object.matrixWorldReady, true, 'world transforms updated before collider creation');
        this.min = { x: Infinity, y: Infinity, z: Infinity };
        this.max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            const point = { x: sx * object.geometry.width / 2, y: sy * object.geometry.height / 2, z: sz * object.geometry.depth / 2 };
            for (let node = object; node; node = node.parent) {
                const cos = Math.cos(node.rotation.y), sin = Math.sin(node.rotation.y);
                const x = point.x * cos + point.z * sin;
                point.z = point.z * cos - point.x * sin + node.position.z;
                point.x = x + node.position.x;
                point.y += node.position.y;
            }
            for (const axis of ['x', 'y', 'z']) {
                this.min[axis] = Math.min(this.min[axis], point[axis]);
                this.max[axis] = Math.max(this.max[axis], point[axis]);
            }
        }
        return this;
    }
}

async function fixture(file, className) {
    const source = (await readFile(new URL(`../src/game/locations/${file}`, import.meta.url), 'utf8'))
        .replace(/^import .*;\r?\n/gm, '').replace(`export class ${className}`, `class ${className}`);
    const pending = [], boxes = [], triggers = [], rigs = [];
    const collision = {
        addBox(min, max, options) { boxes.push({ min, max, options }); },
        addTrigger(mesh, callback, id) { triggers.push({ mesh, callback, id }); },
        clear() { boxes.length = 0; triggers.length = 0; }
    };
    class CharacterRig {
        constructor(fbx, options) {
            this.options = options;
            this.model = new Object3D();
            this.model.add(fbx);
            this.updates = [];
            this.mixer = {
                stops: 0, uncaches: 0,
                stopAllAction() { this.stops++; },
                uncacheRoot() { this.uncaches++; },
                getRoot: () => fbx
            };
            rigs.push(this);
        }
        setState(state) { this.state = state; }
        setSeated(height) { this.state = 'sit'; this.seatY = height; }
        update(dt) { this.updates.push(dt); }
    }
    class FBXLoader { load(url, onLoad, progress, onError) { pending.push({ url, onLoad, onError }); } }
    const THREE = { Mesh, Group: Object3D, Box3, BoxGeometry: Geometry, PlaneGeometry: Geometry,
        MeshBasicMaterial: Material, MeshStandardMaterial: Material };
    const Scene = new Function('THREE', 'FBXLoader', 'Collision', 'CharacterRig', 'disposeOwnedObjects',
        `${source}\nreturn ${className};`)(THREE, FBXLoader, collision, CharacterRig, disposeOwnedObjects);
    const scene = new Object3D();
    return { location: new Scene(scene), scene, pending, boxes, triggers, rigs };
}

function overlapsAtFloor(point, box, radius = 0.5) {
    const closestX = Math.max(box.min.x, Math.min(point.x, box.max.x));
    const closestZ = Math.max(box.min.z, Math.min(point.z, box.max.z));
    return (point.x - closestX) ** 2 + (point.z - closestZ) ** 2 < radius ** 2;
}

function containsCameraTarget(point, box) {
    return ['x', 'y', 'z'].every(axis => point[axis] >= box.min[axis] - 0.25 && point[axis] <= box.max[axis] + 0.25);
}

for (const [file, className, buildNPC, yaw, position, state] of [
    ['exterior.js', 'ExteriorScene', 'buildTicketNPC', 0, [12, 0, -2.2], 'idle'],
    ['lobby.js', 'LobbyScene', 'buildCheckInNPC', Math.PI / 2, [-20, 0, -2], 'idle'],
    ['lobby.js', 'LobbyScene', 'buildTicketCounterNPC', Math.PI, [-20, 0, 14.5], 'idle'],
    ['lobby.js', 'LobbyScene', 'buildSofaNPC', Math.PI / 2, [13, 0, -5], 'sit']
]) {
    test(`${buildNPC} uses a consistent human rig, intended facing and solid bounded body`, async () => {
        const { location, pending, boxes, rigs, scene } = await fixture(file, className);
        location[buildNPC]();
        assert.match(pending[0].url, /Animated Men Characters - Feb 2019\/FBX\/(Male_Suit|Smooth_Male_Casual)\.fbx$/);
        const mesh = new Mesh(resource());
        pending[0].onLoad(mesh);
        const rig = rigs[0];
        assert.equal(rig.options.targetHeight, 3.2);
        assert.equal(rig.state, state);
        assert.equal(rig.model.rotation.y, yaw);
        assert.deepEqual([rig.model.position.x, rig.model.position.y, rig.model.position.z], position);
        if (state === 'sit') assert.equal(rig.seatY, 1.1);
        assert.ok(location.objects.includes(rig.model));
        assert.ok(scene.children.includes(rig.model));
        assert.equal(boxes.length, 1);
        assert.equal(boxes[0].options.camera, false);
        assert.equal(boxes[0].options.ground, false);
        assert.ok(overlapsAtFloor({ x: position[0], z: position[2] }, boxes[0]));
        assert.ok(boxes[0].max.y <= 3.2);
        assert.ok(boxes[0].max.x - boxes[0].min.x < 2.1);
        location.update(0.016);
        assert.deepEqual(rig.updates, [0.016]);
        location.dispose();
        assert.equal(rig.mixer.stops, 1);
        assert.equal(rig.mixer.uncaches, 1);
        assert.equal(mesh.geometry.disposals, 1);
        assert.deepEqual(scene.children, []);
        assert.deepEqual(boxes, []);
    });
}

test('all theater seats face the screen and have unobstructed front standing points', async () => {
    const { location, boxes, triggers } = await fixture('theaterRoom.js', 'TheaterRoomScene');
    location.buildSeats();
    assert.equal(location.seats.length, 28);
    assert.equal(boxes.length, location.seats.length * 2);
    const entered = [];
    location.setupSeatTriggers(seat => entered.push(seat), () => {});
    for (const [index, seat] of location.seats.entries()) {
        for (const key of ['x', 'z', 'seatY', 'meshRot', 'camYaw', 'standX', 'standZ']) {
            assert.ok(Number.isFinite(seat[key]), key);
        }
        assert.equal(seat.meshRot, Math.PI);
        assert.equal(seat.camYaw, Math.PI);
        assert.equal(seat.seatY, 1.4);
        assert.ok(seat.standZ < seat.z);
        assert.ok(boxes.every(box => !overlapsAtFloor({ x: seat.standX, z: seat.standZ }, box)), 'stand point clears every chair');
        const [cushion, back] = boxes.slice(index * 2, index * 2 + 2);
        assert.equal(cushion.options.ground, false);
        assert.equal(back.options.ground, false);
        assert.ok(overlapsAtFloor(seat, cushion), 'chair cushion blocks walking through its center');
        assert.equal(cushion.max.y, seat.seatY);
        assert.equal(back.max.y, 2.7);
        assert.ok(back.min.z > seat.z, 'chair back is behind its seated occupant');
        assert.ok(boxes.every(box => !containsCameraTarget({ x: seat.x, y: 1.7, z: seat.z }, box)), 'seated camera target clears furniture');
        const trigger = triggers[index];
        assert.equal(trigger.mesh.position.x, seat.x);
        assert.equal(trigger.mesh.position.y, 1.6);
        assert.equal(trigger.mesh.position.z, seat.z);
        assert.deepEqual([trigger.mesh.geometry.width, trigger.mesh.geometry.height, trigger.mesh.geometry.depth], [3, 3.2, 3]);
        trigger.callback('enter');
        assert.equal(entered.at(-1), seat);
    }
});

test('the occupied sofa cannot be selected and the free sofa has a clear correctly oriented seat', async () => {
    const { location, boxes, triggers } = await fixture('lobby.js', 'LobbyScene');
    location.buildSofa(13, -5, Math.PI / 2);
    location.buildSofa(22, -5, -Math.PI / 2);
    const entered = [];
    location.setupSeatTriggers(seat => entered.push(seat), () => {});
    assert.equal(boxes.length, 4);
    assert.equal(triggers.length, 1);
    triggers[0].callback('enter');
    const seat = entered[0];
    assert.equal(seat.x, 22);
    assert.equal(seat.z, -5);
    assert.equal(seat.seatY, 1.1);
    assert.equal(seat.meshRot, -Math.PI / 2);
    assert.equal(seat.camYaw, -Math.PI / 2);
    assert.ok(seat.standX < seat.x);
    assert.ok(boxes.every(box => !overlapsAtFloor({ x: seat.standX, z: seat.standZ }, box)));
    assert.ok(boxes.every(box => box.options.ground === false));
    assert.equal(boxes[2].max.y, seat.seatY);
    assert.equal(boxes[1].max.y, 2.2);
    assert.equal(boxes[3].max.y, 2.2);
    assert.ok(boxes[3].min.x > seat.x, 'free sofa back is behind the occupant facing -X');
    assert.ok(boxes.every(box => !containsCameraTarget({ x: seat.x, y: 1.7, z: seat.z }, box)), 'seated camera target clears sofa');
    assert.equal(triggers[0].mesh.position.x, seat.standX);
    assert.equal(triggers[0].mesh.position.z, seat.standZ);
});
