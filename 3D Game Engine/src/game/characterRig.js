import * as THREE from 'three';

const CLIP_NAMES = {
    idle: ['Man_Idle', 'Man_Standing'],
    walk: ['Man_Walk'],
    run: ['Man_Run'],
    jump: ['Man_Jump'],
    sit: ['Man_Sitting']
};

// Keep imported units/animation transforms inside a stable, foot-based world anchor.
export class CharacterRig {
    constructor(fbx, { targetHeight = 3.2 } = {}) {
        this.model = new THREE.Group();
        this.visual = new THREE.Group();
        this.model.add(this.visual);
        this.visual.add(fbx);
        this.height = targetHeight;
        this.seatY = null;
        this.state = null;
        this.activeAction = null;
        this.pelvisPosition = new THREE.Vector3();
        this.pelvis = null;
        this.footSamples = [];
        this.samplePoint = new THREE.Vector3();
        this.modelInverse = new THREE.Matrix4();

        fbx.traverse(child => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            if (child.isBone && /(?:^|:)Hips$/i.test(child.name)) this.pelvis = child;
        });
        this.mixer = new THREE.AnimationMixer(fbx);
        this.actions = {};
        for (const [state, names] of Object.entries(CLIP_NAMES)) {
            const clip = names.map(name => fbx.animations?.find(candidate => candidate.name.endsWith(name))).find(Boolean);
            if (!clip) continue;
            const action = this.mixer.clipAction(clip);
            if (state === 'jump' || state === 'sit') {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            }
            this.actions[state] = action;
        }
        this.setState('idle', 0);
        this.mixer.update(0);
        this.model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(fbx, true);
        const importedHeight = bounds.max.y - bounds.min.y;
        if (Number.isFinite(importedHeight) && importedHeight > 0) {
            this.visual.scale.setScalar(targetHeight / importedHeight);
        }
        this.model.updateMatrixWorld(true);
        bounds.setFromObject(this.model, true);
        this.standingOffset = Number.isFinite(bounds.min.y) ? -bounds.min.y : 0;
        this.visual.position.y = this.standingOffset;
        this.update(0);
        // Cache only vertices near the feet. Some source locomotion clips dip toes
        // below their rest plane; correcting these samples avoids sinking shoes.
        this.modelInverse.copy(this.model.matrixWorld).invert();
        fbx.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes.position) return;
            const sample = { mesh: child, indices: [], matrix: new THREE.Matrix4() };
            sample.matrix.multiplyMatrices(this.modelInverse, child.matrixWorld);
            for (let index = 0; index < child.geometry.attributes.position.count; index++) {
                child.getVertexPosition(index, this.samplePoint).applyMatrix4(sample.matrix);
                if (this.samplePoint.y < targetHeight * 0.18) sample.indices.push(index);
            }
            if (sample.indices.length) this.footSamples.push(sample);
        });
    }

    setState(state, fade = 0.16) {
        const action = this.actions[state] || this.actions.idle;
        if (this.state === state || !action) return;
        this.state = state;
        if (action === this.activeAction) return;
        const previous = this.activeAction;
        if (fade === 0) this.mixer.stopAllAction();
        action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        if (previous && fade > 0) {
            previous.fadeOut(fade);
            action.fadeIn(fade);
        } else if (previous) {
            previous.stop();
        }
        this.activeAction = action;
    }

    setSeated(seatY) {
        this.seatY = seatY;
        this.setState('sit', 0);
        const sitting = this.actions.sit;
        if (sitting) {
            // This clip contains the transition into a chair; hold its seated endpoint.
            sitting.time = sitting.getClip().duration;
            sitting.paused = true;
        }
        this.update(0);
    }

    clearSeated() {
        this.seatY = null;
        this.visual.position.set(0, this.standingOffset, 0);
        this.setState('idle', 0);
        this.update(0);
    }

    update(dt) {
        this.mixer.update(dt);
        const grounded = this.seatY === null && (this.state === 'idle' || this.state === 'walk' || this.state === 'run');
        if (grounded) this.visual.position.y = this.standingOffset;
        this.model.updateWorldMatrix(true, false);
        this.model.updateMatrixWorld(true);
        if (this.seatY !== null && this.pelvis) {
            this.pelvis.getWorldPosition(this.pelvisPosition);
            this.model.worldToLocal(this.pelvisPosition);
            this.visual.position.x -= this.pelvisPosition.x;
            this.visual.position.y += this.seatY - this.pelvisPosition.y;
            this.visual.position.z -= this.pelvisPosition.z;
            this.model.updateMatrixWorld(true);
        } else if (grounded && this.footSamples.length) {
            this.modelInverse.copy(this.model.matrixWorld).invert();
            let lowestSole = Infinity;
            for (const sample of this.footSamples) {
                sample.matrix.multiplyMatrices(this.modelInverse, sample.mesh.matrixWorld);
                for (const index of sample.indices) {
                    sample.mesh.getVertexPosition(index, this.samplePoint).applyMatrix4(sample.matrix);
                    lowestSole = Math.min(lowestSole, this.samplePoint.y);
                }
            }
            if (lowestSole < 0) {
                this.visual.position.y -= lowestSole;
                this.model.updateMatrixWorld(true);
            }
        }
    }

    dispose() {
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.mixer.getRoot());
    }
}
