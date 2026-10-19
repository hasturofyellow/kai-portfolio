import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Optional offline test runtime: the same pinned Three.js 0.160.0 modules used by
// the app, downloaded into output/character-test-runtime without app dependencies.
// Prepare once with: powershell -File "3D Game Engine/tests/setup-character-runtime.ps1"
let THREE, FBXLoader;
try {
    THREE = await import('../../output/character-test-runtime/three.module.mjs');
    ({ FBXLoader } = await import('../../output/character-test-runtime/FBXLoader.mjs'));
} catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const runtimeOptions = { skip: !THREE && 'Pinned offline Three.js test runtime is not present' };
const rigSource = await readFile(new URL('../src/game/characterRig.js', import.meta.url), 'utf8');
const CharacterRig = THREE && new Function('THREE', rigSource
    .replace(/^import .*;\r?\n/gm, '').replace('export class CharacterRig', 'class CharacterRig')
    + '\nreturn CharacterRig;')(THREE);

async function loadRig(name = 'Male_Casual') {
    const buffer = await readFile(new URL(`../../Animated Men Characters - Feb 2019/FBX/${name}.fbx`, import.meta.url));
    const fbx = new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
    return new CharacterRig(fbx, { targetHeight: 3.2 });
}

function bounds(rig) {
    rig.model.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(rig.model, true);
}

function near(actual, expected, message, tolerance = 0.0001) {
    assert.ok(Math.abs(actual - expected) < tolerance, `${message}: expected ${expected}, got ${actual}`);
}

for (const asset of ['Male_Casual', 'Smooth_Male_Casual', 'Male_Suit']) {
    test(`${asset} normalizes its actual rendered idle pose to 3.2 units and grounds feet`, runtimeOptions, async () => {
        const rig = await loadRig(asset);
        const box = bounds(rig);
        near(box.min.y, 0, 'feet');
        near(box.max.y - box.min.y, 3.2, 'height');
        assert.equal(rig.state, 'idle');
        assert.match(rig.activeAction.getClip().name, /Man_Idle$/);
        rig.update(1);
        assert.match(rig.activeAction.getClip().name, /Man_Idle$/);
        assert.equal(rig.actions.walk.isRunning(), false, 'stationary characters never start walking');
        rig.dispose();
    });
}

test('player actions crossfade to named movement clips and hold an airborne pose', runtimeOptions, async () => {
    const rig = await loadRig();
    for (const [state, clip] of [['walk', 'Man_Walk'], ['run', 'Man_Run'], ['jump', 'Man_Jump']]) {
        const previous = rig.activeAction;
        rig.setState(state);
        rig.update(0.2);
        assert.match(rig.activeAction.getClip().name, new RegExp(`${clip}$`));
        near(rig.activeAction.getEffectiveWeight(), 1, 'new action weight');
        near(previous.getEffectiveWeight(), 0, 'previous action weight');
    }
    rig.update(2);
    assert.equal(rig.activeAction.paused, true);
    assert.equal(rig.state, 'jump');
    rig.setState('idle');
    rig.update(0.2);
    assert.match(rig.activeAction.getClip().name, /Man_Idle$/);
    rig.dispose();
});

test('sitting bends the legs, centers the pelvis on the cushion, and preserves the floor anchor', runtimeOptions, async () => {
    const rig = await loadRig();
    rig.model.position.set(13, 0, -5);
    rig.model.rotation.y = Math.PI / 2;
    rig.setSeated(1.1);
    for (const dt of [0, 0.25, 1]) {
        rig.update(dt);
        const pelvis = rig.model.worldToLocal(rig.pelvis.getWorldPosition(new THREE.Vector3()));
        near(pelvis.x, 0, 'seated pelvis x');
        near(pelvis.y, 1.1, 'seated pelvis y');
        near(pelvis.z, 0, 'seated pelvis z');
        assert.deepEqual(rig.model.position.toArray(), [13, 0, -5]);
        near(rig.model.rotation.y, Math.PI / 2, 'body orientation');
    }
    let thigh, shin;
    rig.model.traverse(child => {
        if (child.isBone && /^UpperLegL$/.test(child.name)) thigh = child;
        if (child.isBone && /^LowerLegL$/.test(child.name)) shin = child;
    });
    assert.ok(thigh && shin, 'asset contains leg joints');
    const upperLeg = shin.getWorldPosition(new THREE.Vector3()).sub(thigh.getWorldPosition(new THREE.Vector3())).normalize();
    assert.ok(Math.abs(upperLeg.y) < 0.65, 'thigh points across the chair rather than standing vertically');
    assert.match(rig.activeAction.getClip().name, /Man_Sitting$/);
    assert.equal(rig.activeAction.paused, true);
    rig.dispose();
});

test('standing after sitting restores size, foot origin and idle without pose contamination', runtimeOptions, async () => {
    const rig = await loadRig();
    rig.setState('walk');
    rig.update(0.04); // Interrupt an incomplete crossfade, not just a settled pose.
    rig.setSeated(1.4);
    rig.update(0.2);
    rig.clearSeated();
    const box = bounds(rig);
    near(box.min.y, 0, 'restored feet');
    near(box.max.y - box.min.y, 3.2, 'restored height');
    assert.equal(rig.state, 'idle');
    assert.equal(rig.actions.sit.isRunning(), false);
    assert.equal(rig.actions.walk.isRunning(), false);
    assert.equal(rig.visual.position.x, 0);
    assert.equal(rig.visual.position.z, 0);
    rig.dispose();
});

test('actual walking and running cycles keep soles above the floor without accumulating root motion', runtimeOptions, async () => {
    const rig = await loadRig();
    for (const state of ['walk', 'run']) {
        rig.setState(state, 0);
        for (let frame = 0; frame < 120; frame++) {
            rig.update(1 / 30);
            const box = bounds(rig);
            assert.ok(box.min.y > -0.001, `${state} frame ${frame} has feet below floor: ${box.min.y}`);
            const hips = rig.pelvis.getWorldPosition(new THREE.Vector3());
            assert.ok(Math.abs(hips.x) < 0.2 && Math.abs(hips.z) < 0.3, `${state} should remain in place within its physical anchor`);
            assert.deepEqual(rig.model.position.toArray(), [0, 0, 0]);
        }
    }
    rig.dispose();
});
