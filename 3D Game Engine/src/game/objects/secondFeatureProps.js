import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PACK_PATH = './assets/second-feature/pack.glb';
let packPromise = null;

function loadPack() {
    if (!packPromise) {
        packPromise = new GLTFLoader().loadAsync(PACK_PATH);
    }
    return packPromise;
}

export function mountSecondFeatureProp(scene, objects, name, {
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1
} = {}) {
    const anchor = new THREE.Group();
    anchor.position.set(...position);
    anchor.rotation.y = rotationY;
    if (Array.isArray(scale)) anchor.scale.set(...scale);
    else anchor.scale.setScalar(scale);
    scene.add(anchor);
    objects.push(anchor);

    loadPack().then(({ scene: pack }) => {
        const source = pack.getObjectByName(name);
        if (!source) throw new Error(`Second Feature prop not found: ${name}`);

        const prop = source.clone(true);
        prop.position.set(0, 0, 0);
        prop.rotation.set(0, 0, 0);
        prop.scale.set(1, 1, 1);
        prop.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        anchor.add(prop);
    }).catch(error => console.warn(`Second Feature ${name} failed to load:`, error));

    return anchor;
}
