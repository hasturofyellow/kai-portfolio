import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// The game imports Three.js from a browser import map. These small resource and
// loader doubles exercise ownership and delayed loads without a WebGL context.
const helperSource = await readFile(new URL('../src/game/sceneResources.js', import.meta.url), 'utf8');
const { disposeOwnedObjects } = await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`);

function resource(extra = {}) {
    return { disposals: 0, dispose() { this.disposals++; }, ...extra };
}

class Object3D {
    constructor() {
        this.children = [];
        this.parent = null;
        this.position = { set() {} };
        this.scale = { setScalar() {} };
        this.rotation = {};
    }
    add(object) { this.children.push(object); object.parent = this; }
    traverse(callback) { callback(this); this.children.forEach(child => child.traverse(callback)); }
    removeFromParent() {
        if (!this.parent) return;
        this.parent.children = this.parent.children.filter(child => child !== this);
        this.parent = null;
    }
}

class Mesh extends Object3D {
    constructor(geometry = resource(), material = resource()) {
        super();
        this.geometry = geometry;
        this.material = material;
    }
}

test('travel frees nested and detached assets once while keeping the player and shared textures alive', () => {
    const scene = new Object3D();
    const group = new Object3D();
    const texture = resource({ isTexture: true });
    const geometry = resource();
    const material = resource({ map: texture, emissiveMap: texture });
    const skeleton = resource();
    const first = new Mesh(geometry, [material, material]);
    first.skeleton = skeleton;
    const second = new Mesh(geometry, material);
    second.skeleton = skeleton;
    group.add(first);
    group.add(second);
    scene.add(group);

    const sharedTexture = resource({ isTexture: true });
    const sharedMaterial = resource({ map: sharedTexture });
    const sharedGeometry = resource();
    const player = new Mesh(sharedGeometry, sharedMaterial);
    scene.add(player);
    group.add(new Mesh(sharedGeometry, sharedMaterial));
    const environment = resource({ isTexture: true });
    scene.environment = environment;
    const environmentMaterial = resource({ envMap: environment });
    group.add(new Mesh(resource(), environmentMaterial));

    // Collected money is detached before travel but remains owned by the scene.
    const collectedBill = new Mesh();
    const light = Object.assign(new Object3D(), resource({ isLight: true }));
    scene.add(light);
    const mixerEvents = [];
    const mixer = {
        getRoot: () => group,
        stopAllAction: () => mixerEvents.push('stop'),
        uncacheRoot: root => mixerEvents.push(root)
    };

    disposeOwnedObjects(scene, [group, first, collectedBill, light], [mixer, mixer, null]);

    assert.deepEqual(scene.children, [player]);
    for (const asset of [geometry, material, texture, skeleton, light, environmentMaterial,
        collectedBill.geometry, collectedBill.material]) assert.equal(asset.disposals, 1);
    for (const asset of [sharedTexture, sharedMaterial, sharedGeometry, environment]) {
        assert.equal(asset.disposals, 0);
    }
    assert.deepEqual(mixerEvents, ['stop', group]);
});

async function loadLocation(file, className, pending, warnings, collision = { clear() {} }) {
    const source = await readFile(new URL(`../src/game/locations/${file}`, import.meta.url), 'utf8');
    const body = source.replace(/^import .*;\r?\n/gm, '').replace(`export class ${className}`, `class ${className}`);
    class Asset { constructor(properties = {}) { return resource(properties); } }
    const THREE = { Mesh, BoxGeometry: Asset, PlaneGeometry: Asset, MeshBasicMaterial: Asset, MeshStandardMaterial: Asset };
    class FBXLoader {
        load(url, onLoad, onProgress, onError) { pending.push({ onLoad, onError }); }
    }
    return new Function('THREE', 'FBXLoader', 'Collision', 'disposeOwnedObjects', 'console',
        `${body}\nreturn ${className};`)(THREE, FBXLoader, collision, disposeOwnedObjects,
        { warn: (...args) => warnings.push(args) });
}

for (const [file, className, buildNPC] of [
    ['exterior.js', 'ExteriorScene', 'buildTicketNPC'],
    ['lobby.js', 'LobbyScene', 'buildCheckInNPC'],
    ['lobby.js', 'LobbyScene', 'buildTicketCounterNPC'],
    ['lobby.js', 'LobbyScene', 'buildSofaNPC']
]) {
    test(`${className}.${buildNPC} cannot add a late NPC to the next location`, async () => {
        const pending = [];
        const warnings = [];
        const Location = await loadLocation(file, className, pending, warnings);
        const scene = new Object3D();
        const player = new Mesh();
        scene.add(player);
        const location = new Location(scene);
        location[buildNPC]();
        location.dispose();
        location.dispose();

        const lateNPC = new Object3D();
        const npcTexture = resource({ isTexture: true });
        const body = new Mesh(resource(), resource({ map: npcTexture }));
        lateNPC.add(body);
        pending[0].onLoad(lateNPC);
        pending[0].onError(new Error('late network failure'));

        assert.deepEqual(scene.children, [player]);
        assert.deepEqual(location.objects, []);
        assert.deepEqual(location.lights, []);
        assert.equal(body.geometry.disposals, 1);
        assert.equal(body.material.disposals, 1);
        assert.equal(npcTexture.disposals, 1);
        assert.equal(player.geometry.disposals, 0);
        assert.equal(warnings.length, 0);
    });
}

test('lobby disposal stops every owned animation mixer', async () => {
    const LobbyScene = await loadLocation('lobby.js', 'LobbyScene', [], []);
    const location = new LobbyScene(new Object3D());
    const events = [];
    for (const name of ['sofaMixer', 'npcMixer', 'ticketNpcMixer']) {
        const root = new Object3D();
        location[name] = {
            stopAllAction() { events.push(`${name}:stop`); },
            getRoot() { return root; },
            uncacheRoot(object) { assert.equal(object, root); events.push(`${name}:uncache`); }
        };
    }
    location.dispose();
    location.dispose();
    assert.equal(events.length, 6);
    assert.equal(location.sofaMixer, null);
    assert.equal(location.npcMixer, null);
    assert.equal(location.ticketNpcMixer, null);
});

test('theater screen and exit triggers keep working and release their detached assets on travel', async () => {
    const triggers = [];
    const collision = {
        addTrigger(mesh, callback, id) { triggers.push({ mesh, callback, id }); },
        clear() {}
    };
    const TheaterRoomScene = await loadLocation('theaterRoom.js', 'TheaterRoomScene', [], [], collision);
    const location = new TheaterRoomScene(new Object3D());
    location.addScreenFrame = () => {};
    location.buildScreenContent = () => {};
    location.buildScreenLabel = () => {};
    location.buildScreen();
    location.buildExitDoor();
    const events = [];
    location.setupScreenTrigger(inside => events.push(['screen', inside]));
    location.setupExitTrigger(inside => events.push(['exit', inside]));
    assert.deepEqual(triggers.map(trigger => trigger.id), ['screen-trigger', 'exit-trigger']);
    for (const trigger of triggers) {
        assert.equal(trigger.mesh.parent, null);
        trigger.callback('enter');
        trigger.callback('exit');
    }
    assert.deepEqual(events, [['screen', true], ['screen', false], ['exit', true], ['exit', false]]);
    location.dispose();
    location.dispose();
    for (const trigger of triggers) {
        assert.equal(trigger.mesh.geometry.disposals, 1, `${trigger.id} geometry`);
        assert.equal(trigger.mesh.material.disposals, 1, `${trigger.id} material`);
    }
});
