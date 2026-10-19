import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (await readFile(new URL('../src/game/player.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace('export class Player', 'class Player');

class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(vector) { return this.set(vector.x, vector.y, vector.z); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const size = this.length(); return size ? this.set(this.x / size, this.y / size, this.z / size) : this; }
    addScaledVector(vector, scale) {
        return this.set(this.x + vector.x * scale, this.y + vector.y * scale, this.z + vector.z * scale);
    }
}
class Group {
    position = new Vector3();
    scale = new Vector3(1, 1, 1);
    rotation = { y: 0 };
    children = [];
    add(child) { this.children.push(child); }
}
class Rig {
    constructor(fbx, options) { this.model = new Group(); this.mixer = {}; this.height = options.targetHeight; this.state = 'idle'; this.updates = 0; }
    setState(state) { this.state = state; }
    update() { this.updates++; }
    setSeated(height) { this.seatY = height; this.state = 'sit'; }
    clearSeated() { this.seatY = null; this.state = 'idle'; }
}

function fixture() {
    const pendingLoads = [];
    class Loader {
        load(url, success) { pendingLoads.push(success); }
    }
    const input = {
        enabled: true, mouse: { dx: 0, dy: 0 }, movement: { x: 0, z: 0 }, keys: new Set(), pressed: new Set(),
        getMovementVector() { return this.movement; },
        isKeyDown(code) { return this.keys.has(code); },
        isKeyJustPressed(code) { return this.pressed.has(code); }
    };
    const bodyChecks = [];
    let triggerChecks = 0;
    const collision = {
        checkBody(feet, radius, height) { bodyChecks.push({ feet: feet.clone(), radius, height }); return null; },
        checkGround() { return 0; },
        checkTriggers() { triggerChecks++; }
    };
    const Player = new Function('THREE', 'FBXLoader', 'Input', 'Collision', 'CharacterRig', `${source}\nreturn Player;`)
        ({ Vector3, Group }, Loader, input, collision, Rig);
    const player = new Player(new Group());
    player.setPosition(0, 0, 0);
    return { player, input, collision, bodyChecks, pendingLoads, triggerChecks: () => triggerChecks };
}

test('player selects idle, walking, running and airborne animation from its actual motion', () => {
    const { player, input, pendingLoads } = fixture();
    pendingLoads[0]({});
    player.update(0.016);
    assert.equal(player.rig.state, 'idle');
    input.movement.z = 1;
    player.update(0.016);
    assert.equal(player.rig.state, 'walk');
    input.keys.add('ShiftLeft');
    player.update(0.016);
    assert.equal(player.rig.state, 'run');
    input.keys.clear();
    input.movement.z = 0;
    for (let i = 0; i < 80; i++) player.update(0.016);
    assert.equal(player.rig.state, 'idle');
    input.pressed.add('Space');
    player.update(0.016);
    assert.equal(player.rig.state, 'jump');
    assert.equal(player.isGrounded, false);
});

test('seated camera input cannot move, rotate or jump the body or fire world triggers', () => {
    const { player, input, pendingLoads, bodyChecks, triggerChecks } = fixture();
    pendingLoads[0]({});
    player.setPosition(22, 0, -5);
    player.mesh.rotation.y = -Math.PI / 2;
    player.setSeated(1.1);
    input.movement.z = 1;
    input.pressed.add('Space');
    input.mouse.dx = 80;
    player.updateSeated(0.016);
    player.update(0.016); // The normal entry point is also safe while seated.
    assert.deepEqual(player.mesh.position, new Vector3(22, 0, -5));
    assert.equal(player.mesh.rotation.y, -Math.PI / 2);
    assert.notEqual(player.cameraYaw, 0);
    assert.equal(player.rig.state, 'sit');
    assert.equal(player.rig.seatY, 1.1);
    assert.equal(player.jumpBuffer, 0);
    assert.equal(bodyChecks.length, 0);
    assert.equal(triggerChecks(), 0);
    assert.deepEqual(player.mesh.scale, new Vector3(1, 1, 1));
});

test('a character asset finishing after the player sits immediately adopts the seated pose', () => {
    const { player, pendingLoads } = fixture();
    player.setSeated(1.4);
    pendingLoads[0]({});
    assert.equal(player.rig.state, 'sit');
    assert.equal(player.rig.seatY, 1.4);
    assert.equal(player.rig.height, 3.2);
    player.setPosition(3, 0, 4);
    assert.equal(player.isSeated, false);
    assert.equal(player.rig.state, 'idle');
    assert.equal(player.rig.seatY, null);
});

test('a long sprint frame tests the full-height body in small steps before crossing thin props', () => {
    const { player, input, collision, bodyChecks } = fixture();
    const checkBody = collision.checkBody.bind(collision);
    collision.checkBody = (feet, radius, height) => {
        checkBody(feet, radius, height);
        return feet.x < -0.2 ? { x: -0.2 - feet.x, z: 0 } : null;
    };
    input.movement.x = 1;
    input.keys.add('ShiftLeft');
    player.update(0.1);
    assert.ok(bodyChecks.length >= 3, '1.1-unit movement must not be tested only at its endpoint');
    for (const check of bodyChecks) {
        assert.equal(check.radius, 0.4);
        assert.equal(check.height, 3.2);
        assert.equal(check.feet.y, 0, 'body origin remains at the feet');
    }
    assert.ok(player.mesh.position.x >= -0.20001);
    assert.equal(player.velocity.x, 0);
});

test('deceleration is consistent across frame rates', () => {
    const slow = fixture().player;
    const fast = fixture().player;
    slow.velocity.x = fast.velocity.x = 6;
    slow.update(1 / 30);
    fast.update(1 / 60);
    fast.update(1 / 60);
    assert.ok(Math.abs(slow.velocity.x - fast.velocity.x) < 1e-10);
});
