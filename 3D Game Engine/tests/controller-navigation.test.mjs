import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Exercise the real controller methods without starting a renderer or loading
// Three.js from the browser's CDN import map.
const controllerSource = (await readFile(new URL('../src/game/theaterGame.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace('export class TheaterGame', 'class TheaterGame');
const programSource = await readFile(new URL('../src/game/program.js', import.meta.url), 'utf8');
const { getProgramEntry } = await import(`data:text/javascript;base64,${Buffer.from(programSource).toString('base64')}`);

function vector(x = 0, y = 0, z = 0) {
    return { x, y, z, set(x, y, z) { Object.assign(this, { x, y, z }); }, clone() { return new Vector3(this.x, this.y, this.z); } };
}

class Vector3 {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(value) { Object.assign(this, { x: value.x, y: value.y, z: value.z }); return this; }
    add(value) { this.x += value.x; this.y += value.y; this.z += value.z; return this; }
    lerp(value, amount) { this.x += (value.x - this.x) * amount; this.y += (value.y - this.y) * amount; this.z += (value.z - this.z) * amount; return this; }
}

const interactionFlags = [
    'nearDoor', 'nearExit', 'nearTheater1', 'nearTheater2', 'nearTheater3',
    'nearTheater4', 'nearScreen', 'nearTheaterExit', 'nearDumpster',
    'nearCaveExit', 'nearPortal', 'nearTicket', 'nearCheckIn'
];

function fixture() {
    const events = [];
    const input = {
        enabled: true, pressed: new Set(), scroll: { delta: 0 },
        reset() { events.push('input:reset'); this.pressed.clear(); this.scroll.delta = 0; },
        setEnabled(enabled) { this.enabled = enabled; this.reset(); },
        isKeyJustPressed(key) { return this.enabled && this.pressed.has(key); }
    };
    class Location {
        constructor(scene, config) { this.scene = scene; this.config = config; this.callbacks = {}; }
        build() { events.push('location:build'); }
        dispose() { events.push('location:dispose'); }
        getSpawnPoint() { return { x: 0, y: 1, z: 22 }; }
        update() { events.push('location:update'); }
    }
    for (const name of ['MoneyPickups', 'SeatTriggers', 'DoorTrigger', 'DumpsterTrigger',
        'TicketTrigger', 'EntranceTrigger', 'Theater1Trigger', 'Theater2Trigger',
        'Theater3Trigger', 'Theater4Trigger', 'CheckInTrigger', 'ArcadeTriggers',
        'ExitTrigger', 'PortalTrigger', 'ScreenTrigger']) {
        Location.prototype[`setup${name}`] = function (...args) { this.callbacks[name] = args; };
    }
    const TheaterGame = new Function('Input', 'Collision', 'ExteriorScene', 'LobbyScene',
        'LavaCaveScene', 'TheaterRoomScene', 'getProgramEntry', 'THREE',
        `${controllerSource}\nreturn TheaterGame;`)(input,
        { clear: () => events.push('collision:clear'), constrainCamera: (target, desired) => {
            events.push('camera:constrain');
            const safe = desired.clone();
            safe.z = Math.min(safe.z, 24.7);
            return safe;
        } }, Location, Location, Location, Location, getProgramEntry, { Vector3 });
    const game = Object.create(TheaterGame.prototype);
    Object.assign(game, {
        scene: {}, locationName: 'lobby', currentLocation: new Location(),
        currency: 25, tickets: 0, collectedBills: new Set(),
        menuOpen: false, dialogueOpen: false, arcadeOpen: false,
        dumpsterAnim: null, isSitting: false, nearSeat: null,
        cameraInitialized: true, cameraDistance: 10, cameraHeight: 4, cameraSmoothing: 0.08,
        uiElements: { dialoguePanel: { style: {} } },
        renderer: { domElement: { focus: () => events.push('canvas:focus') } },
        interface: { open: name => events.push(`menu:${name}`) },
        closeDialogue() { events.push('dialogue:close'); this.dialogueOpen = false; },
        closeArcades() { events.push('arcade:close'); this.arcadeOpen = false; },
        clearHint: () => events.push('hint:clear'),
        showHint: message => events.push(`hint:${message}`),
        setLocationUI: name => events.push(`location:${name}`),
        updateCamera: () => events.push('camera:update'),
        _updateDumpsterAnim: () => events.push('dumpster:update'),
        _startDumpsterAnim: () => events.push('dumpster:start'),
        launchGame: () => events.push('game:launch'),
        _openTicketConversation: () => events.push('ticket:open'),
        _openCheckInConversation: () => events.push('checkin:open'),
        _openArcadeGame: () => events.push('arcade:open'),
        sitDown: () => events.push('seat:sit'),
        die: () => events.push('player:die')
    });
    game.player = {
        mesh: { position: vector(2, 3, 4), scale: vector(1, 1, 1), rotation: {} },
        velocity: vector(3, -5, 2), cameraPitch: 0.3, cameraYaw: 0,
        update: () => events.push('player:update'),
        updateSeated() { events.push('player:seated-update'); this.cameraYaw += 0.5; },
        setSeated: height => events.push(`player:seated:${height}`),
        clearSeated: () => events.push('player:standing'),
        getPosition() { return this.mesh.position; },
        setPosition(x, y, z) { this.mesh.position.set(x, y, z); this.velocity.set(0, 0, 0); }
    };
    return { game, input, events };
}

for (const pausedState of ['menuOpen', 'dialogueOpen']) {
    test(`${pausedState} freezes movement, a pending cinematic and interactions`, () => {
        const { game, input, events } = fixture();
        game[pausedState] = true;
        game.dumpsterAnim = { elapsed: 0.2, phase: 'arc' };
        for (const flag of interactionFlags) game[flag] = true;
        game.nearArcade = 1;
        game.nearSeat = { x: 0, z: 0 };
        input.pressed = new Set(['KeyE', 'Space']);
        const position = { ...game.player.mesh.position };
        game.update(0.1);
        assert.deepEqual(events, ['camera:update']);
        assert.deepEqual(game.player.mesh.position, position);
        assert.equal(game.dumpsterAnim.elapsed, 0.2);
    });
}

test('travel cancels cinematic/seated state, clears interaction input and resets the player camera', () => {
    const { game, input, events } = fixture();
    const previousLocation = game.currentLocation;
    Object.assign(game, {
        dumpsterAnim: { elapsed: 0.5 }, isSitting: true, currentSeatPos: { x: 8 },
        nearSeat: { x: 8 }, nearArcade: 3, dialogueOpen: true, arcadeOpen: true,
        cameraDistance: 6, cameraHeight: 1.8, cameraSmoothing: 0.25,
        _dialogueOptions: [{}], _dialogueHasCamera: true
    });
    for (const flag of interactionFlags) game[flag] = true;
    Object.assign(game.player, { cameraPitch: 1.1, jumpBuffer: 0.12, coyoteTimer: 0.1, jumpsUsed: 2, isGrounded: true, floorY: -Infinity });
    game.player.mesh.scale.set(0.2, 0.2, 0.2);
    input.pressed.add('Space');
    input.scroll.delta = 150;

    game.loadLocation('theater2');

    assert.notEqual(game.currentLocation, previousLocation);
    assert.equal(game.currentLocation.config, getProgramEntry('theater2'));
    assert.equal(game.locationName, 'theater2');
    assert.equal(game.dumpsterAnim, null);
    assert.equal(game.isSitting, false);
    assert.equal(game.currentSeatPos, null);
    assert.equal(game.nearSeat, null);
    assert.equal(game.nearArcade, 0);
    for (const flag of interactionFlags) assert.equal(game[flag], false, flag);
    assert.equal(game.dialogueOpen, false);
    assert.equal(game.arcadeOpen, false);
    assert.equal(game._dialogueOptions, null);
    assert.equal(game._dialogueHasCamera, false);
    assert.equal(game.uiElements.dialoguePanel.style.display, 'none');
    assert.equal(game.cameraInitialized, false);
    assert.equal(game.cameraDistance, 6.5);
    assert.equal(game.cameraHeight, 2.8);
    assert.equal(game.cameraSmoothing, 0.08);
    assert.equal(game.player.cameraPitch, 0.3);
    assert.equal(game.player.cameraYaw, Math.PI);
    for (const key of ['jumpBuffer', 'coyoteTimer', 'jumpsUsed']) assert.equal(game.player[key], 0, key);
    assert.equal(game.player.isGrounded, false);
    assert.equal(game.player.floorY, 0);
    assert.deepEqual([game.player.mesh.scale.x, game.player.mesh.scale.y, game.player.mesh.scale.z], [1, 1, 1]);
    assert.deepEqual([game.player.velocity.x, game.player.velocity.y, game.player.velocity.z], [0, 0, 0]);
    assert.deepEqual([game.player.mesh.position.x, game.player.mesh.position.y, game.player.mesh.position.z], [0, 1, 22]);
    assert.equal(input.pressed.size, 0);
    assert.equal(input.scroll.delta, 0);
    assert.ok(events.indexOf('location:dispose') < events.indexOf('location:build'));
});

for (let number = 1; number <= 4; number++) {
    test(`a visitor with zero tickets can enter theater ${number} from its hallway`, () => {
        const { game, input } = fixture();
        game[`nearTheater${number}`] = true;
        input.pressed.add('Space');
        game.update(0.016);
        assert.equal(game.locationName, `theater${number}`);
        assert.equal(game.currentLocation.config, getProgramEntry(`theater${number}`));
        assert.equal(game.tickets, 0);
        assert.equal(game.currency, 25);
    });
}

test('invalid travel leaves the live scene and all transient state intact', () => {
    const { game, input, events } = fixture();
    const currentLocation = game.currentLocation;
    game.dumpsterAnim = { elapsed: 0.2 };
    game.menuOpen = true;
    input.pressed.add('Space');
    game.loadLocation('missing-room');
    assert.equal(game.currentLocation, currentLocation);
    assert.equal(game.locationName, 'lobby');
    assert.equal(game.dumpsterAnim.elapsed, 0.2);
    assert.equal(game.menuOpen, true);
    assert.equal(input.pressed.has('Space'), true);
    assert.deepEqual(events, []);
});

test('the main theater route opens the program without replacing the live scene', () => {
    const { game, events } = fixture();
    const currentLocation = game.currentLocation;
    game.loadLocation('theater');
    assert.equal(game.currentLocation, currentLocation);
    assert.deepEqual(events, ['menu:program']);
});

test('closing the menu only restores gameplay input when other overlays are also closed', () => {
    const { game, input } = fixture();
    input.pressed.add('Space');
    game.setMenuOpen(true);
    assert.equal(input.enabled, false);
    assert.equal(input.pressed.size, 0);
    game.setMenuOpen(false);
    assert.equal(input.enabled, true);
    game.dialogueOpen = true;
    game.setMenuOpen(false);
    assert.equal(input.enabled, false);
    game.dialogueOpen = false;
    game.arcadeOpen = true;
    game.setMenuOpen(false);
    assert.equal(input.enabled, false);
    game.arcadeOpen = false;
    game.syncInput();
    assert.equal(input.enabled, true);
});

test('seating uses the rig without squashing, keeps its facing fixed, and stands in clear space', () => {
    const { game, input, events } = fixture();
    game.nearSeat = { x: 5, z: 20, seatY: 1.4, meshRot: Math.PI, camYaw: Math.PI, standX: 5, standZ: 18.3 };
    Object.getPrototypeOf(game).sitDown.call(game);
    assert.equal(game.isSitting, true);
    assert.ok(events.includes('player:seated:1.4'));
    assert.deepEqual([game.player.mesh.scale.x, game.player.mesh.scale.y, game.player.mesh.scale.z], [1, 1, 1]);
    events.length = 0;
    game.update(0.016);
    assert.ok(events.includes('player:seated-update'));
    assert.ok(!events.includes('player:update'));
    assert.equal(game.player.mesh.rotation.y, Math.PI);
    assert.equal(game.player.cameraYaw, Math.PI + 0.5);
    assert.equal(game.player.mesh.position.y, 0);

    input.pressed.add('KeyE');
    game.update(0.016);
    assert.equal(game.isSitting, false);
    assert.equal(game.currentSeatPos, null);
    assert.ok(events.includes('player:standing'));
    assert.deepEqual([game.player.mesh.position.x, game.player.mesh.position.z], [5, 18.3]);
    assert.equal(input.pressed.size, 0);
});

test('camera smoothing cannot return the camera behind the rear wall', () => {
    const { game, events } = fixture();
    delete game.updateCamera;
    game.cameraTargetOffset = new Vector3(0, 3, 0);
    game.cameraCurrentPos = new Vector3(5, 4, 32);
    game.cameraCurrentLookAt = new Vector3(5, 1.7, 20);
    game.camera = { position: new Vector3(), lookAt() {} };
    game.player.setPosition(5, 0, 20);
    game.player.cameraYaw = Math.PI;
    game.updateCamera(0.016);
    assert.equal(events.filter(event => event === 'camera:constrain').length, 2);
    assert.ok(game.camera.position.z <= 24.7);
});

test('conversation framing shows the NPC and restores the player when dismissed', () => {
    const { game, input } = fixture();
    game.frameConversation(12, -2.2, 0);
    assert.equal(game.player.mesh.visible, false);
    assert.deepEqual([game.dialogueTarget.x, game.dialogueTarget.z], [12, -2.2]);
    assert.ok(game.dialogueCamera.z > game.dialogueTarget.z);
    game.dialogueOpen = true;
    input.setEnabled(false);
    Object.getPrototypeOf(game).closeDialogue.call(game);
    assert.equal(game.player.mesh.visible, true);
    assert.equal(game.dialogueTarget, null);
    assert.equal(input.enabled, true);
});

test('one interaction key opens the clerk conversation without also opening an arcade panel', () => {
    const { game, input, events } = fixture();
    game.nearCheckIn = true;
    game.nearArcade = 1;
    input.pressed.add('KeyE');
    game.update(0.016);
    assert.ok(events.includes('checkin:open'));
    assert.ok(!events.includes('arcade:open'));
});

test('leaving one overlapping seat zone keeps the nearest remaining seat selectable', () => {
    const { game } = fixture();
    const near = { x: 3, z: 4 };
    const far = { x: 5.8, z: 4 };
    game.updateSeatProximity(far, true);
    game.updateSeatProximity(near, true);
    assert.equal(game.nearSeat, near);
    game.updateSeatProximity(far, false);
    assert.equal(game.nearSeat, near);
    game.updateSeatProximity(near, false);
    assert.equal(game.nearSeat, null);
});
