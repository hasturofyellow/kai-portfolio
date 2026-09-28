import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Exercise the actual arcade methods independently of Three.js and its CDN imports.
const source = await readFile(new URL('../src/game/theaterGame.js', import.meta.url), 'utf8');
const start = source.indexOf('    _openArcadeGame(n) {');
const end = source.indexOf('    run = () => {', start);
assert.ok(start !== -1 && end > start, 'arcade lifecycle methods must be present');
const arcadeMethods = source.slice(start, end);

function createArcade(randomValues = []) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, { style: {}, value: '10', textContent: '', innerHTML: '', disabled: false });
        return elements.get(id);
    };
    let now = 0;
    let nextTimer = 0;
    const timers = new Map();
    const schedule = (fn, delay, repeat) => {
        const id = ++nextTimer;
        timers.set(id, { fn, delay, repeat, at: now + delay });
        return id;
    };
    const math = Object.create(Math);
    math.random = () => randomValues.shift() ?? 0;
    const game = runInNewContext(`new (class { ${arcadeMethods} })()`, {
        document: {
            getElementById: element,
            querySelectorAll: () => ['arcade-slot', 'arcade-hilo', 'arcade-plinko'].map(element),
            pointerLockElement: null
        },
        Math: math,
        setTimeout: (fn, delay) => schedule(fn, delay, false),
        setInterval: (fn, delay) => schedule(fn, delay, true),
        clearTimeout: id => timers.delete(id),
        clearInterval: id => timers.delete(id)
    });
    game.currency = 100;
    game.arcadeOpen = false;
    game.syncInput = () => {};
    game.updateWalletUI = () => {};
    game.showHint = () => {};
    game.renderer = { domElement: { focus() {} } };

    const advance = milliseconds => {
        const endTime = now + milliseconds;
        while (timers.size) {
            const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
            if (timer.at > endTime) break;
            now = timer.at;
            if (timer.repeat) timer.at += timer.delay;
            else timers.delete(id);
            timer.fn();
        }
        now = endTime;
    };
    return { game, element, advance, timers };
}

for (const [name, number, actionId] of [
    ['slot', 1, 'slot-spin-btn'],
    ['Plinko', 3, 'plinko-drop-btn']
]) {
    test(`${name}: closing an unfinished round refunds once and isolates a reopened visit`, () => {
        const { game, element, advance, timers } = createArcade();
        game._openArcadeGame(number);
        const oldAction = element(actionId).onclick;
        oldAction();
        oldAction();
        assert.equal(game.currency, 90, 'rapid repeated activation cannot place a second wager');
        assert.equal(element(actionId).disabled, true);
        advance(300);
        const oldCallbacks = [...timers.values()].map(timer => timer.fn);
        game.closeArcades();
        assert.equal(game.currency, 100);
        assert.equal(timers.size, 0);
        game.closeArcades();
        assert.equal(game.currency, 100, 'closing twice cannot double-refund');

        game._openArcadeGame(number);
        assert.equal(element(actionId).disabled, false);
        element(actionId).onclick();
        const state = [...elementsSnapshot(element)];
        oldAction();
        oldCallbacks.forEach(callback => callback());
        assert.equal(game.currency, 90, 'stale callbacks cannot pay or debit the new visit');
        assert.deepEqual(elementsSnapshot(element), state, 'stale callbacks cannot overwrite the new animation');
        game.closeArcades();
    });
}

function elementsSnapshot(element) {
    return ['slot-r1', 'slot-r2', 'slot-r3', 'slot-result', 'plinko-result', 'plinko-board-container']
        .map(id => [element(id).textContent, element(id).innerHTML]);
}

test('completed slot payout is credited once and is not refunded on close', () => {
    const { game, element, advance, timers } = createArcade();
    game._openArcadeGame(1);
    element('slot-spin-btn').onclick();
    advance(1250);
    assert.equal(game.currency, 190, '$10 diamond jackpot pays $100 after the wager');
    assert.equal(element('slot-spin-btn').disabled, false);
    assert.equal(timers.size, 0);
    assert.equal(game._arcadeSession.timers.size, 0);
    game.closeArcades();
    assert.equal(game.currency, 190);
    advance(5000);
    assert.equal(game.currency, 190);
});

test('completed Plinko payout is credited once and is not refunded on close', () => {
    const { game, element, advance, timers } = createArcade([0, 0.9, 0, 0.9, 0, 0.9]);
    game._openArcadeGame(3);
    element('plinko-drop-btn').onclick();
    advance(1470);
    assert.equal(game.currency, 120, '$10 center result pays $30 after the wager');
    assert.equal(element('plinko-drop-btn').disabled, false);
    assert.equal(timers.size, 0);
    assert.equal(game._arcadeSession.timers.size, 0);
    game.closeArcades();
    assert.equal(game.currency, 120);
});

test('closing Hi-Lo cashes out the active earned pot exactly once', () => {
    const { game, element } = createArcade([0, 0, 0.99, 0]);
    game._openArcadeGame(2);
    element('hilo-start-btn').onclick();
    assert.equal(game.currency, 90);
    element('hilo-higher-btn').onclick();
    assert.equal(element('hilo-pot-display').textContent, 'Pot: $18');
    const oldCashout = element('hilo-cashout-btn').onclick;
    game.closeArcades();
    assert.equal(game.currency, 108);
    game.closeArcades();
    oldCashout();
    assert.equal(game.currency, 108);
    game._openArcadeGame(2);
    assert.equal(element('hilo-pot-display').textContent, 'Pot: $0');
    assert.equal(element('hilo-start-btn').style.display, 'inline-block');
    oldCashout();
    assert.equal(game.currency, 108);
});

test('Hi-Lo cashout and a lost round cannot be credited again on close', () => {
    for (const lose of [false, true]) {
        const { game, element } = createArcade([0, 0, 0.99, 0]);
        game._openArcadeGame(2);
        element('hilo-start-btn').onclick();
        if (lose) element('hilo-lower-btn').onclick();
        else element('hilo-cashout-btn').onclick();
        const expected = lose ? 90 : 100;
        assert.equal(game.currency, expected);
        game.closeArcades();
        assert.equal(game.currency, expected);
    }
});
