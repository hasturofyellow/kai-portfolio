// Only dispose resources owned by the departing location. Player assets and
// textures still referenced by the shared scene must survive scene travel.
function collectResources(object, resources) {
    if (object.geometry) resources.add(object.geometry);
    if (object.skeleton) resources.add(object.skeleton);
    if (object.isLight) resources.add(object);

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
        if (!material) continue;
        resources.add(material);
        for (const value of Object.values(material)) {
            if (value?.isTexture) resources.add(value);
        }
    }
}

export function disposeOwnedObjects(scene, objects, mixers = []) {
    const owned = new Set();
    const resources = new Set();
    const retained = new Set();

    for (const object of objects) {
        object.traverse(child => {
            owned.add(child);
            collectResources(child, resources);
        });
    }

    scene.traverse(child => {
        if (!owned.has(child)) collectResources(child, retained);
    });
    if (scene.background?.isTexture) retained.add(scene.background);
    if (scene.environment?.isTexture) retained.add(scene.environment);

    for (const mixer of new Set(mixers)) {
        if (!mixer) continue;
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
    }
    for (const object of objects) object.removeFromParent();
    for (const resource of resources) {
        if (!retained.has(resource)) resource.dispose();
    }
}
