import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Stable original patrol character and scale.
const MODEL_PATH = '../Animated Men Characters - Feb 2019/FBX/Male_LongSleeve.fbx';
const CHARACTER_SCALE = 0.008333;

function addOfficerDetails(root) {
    const navy = new THREE.MeshStandardMaterial({ color: 0x142b58, roughness: 0.52, metalness: 0.18 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf3c75f, emissive: 0x4a2c00, emissiveIntensity: 0.25, metalness: 0.55, roughness: 0.32 });
    const cap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.31, 0.14, 16), navy);
    crown.position.y = 0.03;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.17), navy);
    brim.position.set(0, -0.025, 0.24);
    cap.add(crown, brim);
    cap.position.set(0, 2.08, 0);
    root.add(cap);

    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.10, 6), gold);
    badge.position.set(0.12, 1.42, 0.28);
    root.add(badge);
}

export function loadPatrolOfficer(root, onReady) {
    new FBXLoader().load(MODEL_PATH, model => {
        model.scale.setScalar(CHARACTER_SCALE);
        model.traverse(child => {
            if (!child.isMesh) return;
            child.castShadow = true;
            child.receiveShadow = true;
        });
        root.add(model);
        addOfficerDetails(root);

        const walkClip = model.animations?.find(clip => /Man_Walk$/i.test(clip.name));
        if (!walkClip) {
            console.warn('Patrol officer walk clip was not found; keeping a grounded standing pose.');
            onReady({ update() {} });
            return;
        }

        const mixer = new THREE.AnimationMixer(model);
        const walk = mixer.clipAction(walkClip);
        walk.timeScale = 1.08;
        walk.play();
        onReady({ update: dt => mixer.update(dt) });
    }, undefined, error => console.warn('Patrol officer FBX failed to load:', error));
}
