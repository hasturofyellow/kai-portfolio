import * as THREE from 'three';
import { Collision } from '../collision.js';

const COLORS = {
    concrete: 0x202a33,
    concreteLight: 0x394855,
    steel: 0x71818f,
    darkSteel: 0x0b1117,
    warning: 0xffb020,
    electric: 0x34d7ff,
    exit: 0x55ff9a,
};

export class JailEscapeScene {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];
        this.exitTrigger = null;
        this.time = 0;
        this.fans = [];
        this.warningLights = [];
        this.electricStrips = [];
    }

    _add(object, collider = false) {
        this.scene.add(object);
        this.objects.push(object);
        if (collider) Collision.addCollider(object);
        return object;
    }

    _box(size, position, material, collider = false) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return this._add(mesh, collider);
    }

    _panel(text, width, height, position, options = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = options.background ?? '#080d12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = options.border ?? '#ffb020';
        ctx.lineWidth = 18;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
        ctx.fillStyle = options.color ?? '#ffe0a0';
        ctx.font = `900 ${options.fontSize ?? 64}px "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, 0.14),
            new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
        );
        panel.position.set(...position);
        return this._add(panel);
    }

    build() {
        this.scene.background = new THREE.Color(0x03070b);
        this.scene.fog = new THREE.Fog(0x03070b, 16, 48);

        const concrete = new THREE.MeshStandardMaterial({ color: COLORS.concrete, roughness: 0.92, metalness: 0.08 });
        const concreteLight = new THREE.MeshStandardMaterial({ color: COLORS.concreteLight, roughness: 0.85, metalness: 0.12 });
        const steel = new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.3, metalness: 0.88 });
        const darkSteel = new THREE.MeshStandardMaterial({ color: COLORS.darkSteel, roughness: 0.42, metalness: 0.72 });
        const warning = new THREE.MeshStandardMaterial({
            color: COLORS.warning,
            emissive: 0x8a4300,
            emissiveIntensity: 0.85,
            roughness: 0.38,
            metalness: 0.45,
        });
        const exit = new THREE.MeshStandardMaterial({
            color: COLORS.exit,
            emissive: COLORS.exit,
            emissiveIntensity: 1.6,
            roughness: 0.3,
        });

        this._buildShell(concrete, darkSteel, steel);
        this._buildEntry(concreteLight, steel, warning);
        this._buildParkour(concreteLight, darkSteel, warning);
        this._buildRunoff();
        this._buildFans(darkSteel, steel, warning);
        this._buildExit(concreteLight, darkSteel, exit);
        this._buildLighting(warning, exit);
    }

    _buildShell(concrete, darkSteel, steel) {
        this._box([0.5, 10, 47], [-8.25, 3, -7], concrete, true);
        this._box([0.5, 10, 47], [8.25, 3, -7], concrete, true);
        this._box([17, 0.35, 47], [0, 7.8, -7], darkSteel, true);
        this._box([17, 10, 0.45], [0, 3, 16.3], concrete, true);
        this._box([17, 10, 0.45], [0, 3, -30.3], concrete, true);
        for (let z = 13; z >= -28; z -= 6.8) {
            this._box([16.1, 0.18, 0.22], [0, 7.28, z], steel);
            this._box([0.18, 7.1, 0.22], [-7.75, 3.75, z], steel);
            this._box([0.18, 7.1, 0.22], [7.75, 3.75, z], steel);
        }
    }

    _buildEntry(concreteLight, steel, warning) {
        this._box([7, 0.6, 6], [0, -0.3, 12.2], concreteLight, true);
        this._box([6.5, 0.18, 0.3], [0, 0.08, 9.25], warning);
        this._box([5.2, 5.2, 0.45], [0, 3.25, 15.95], steel);
        this._box([4.35, 4.25, 0.12], [0, 3.15, 15.68], new THREE.MeshBasicMaterial({ color: 0x020509 }));
        this._panel('DUCT 03  •  UNAUTHORIZED ACCESS', 7.1, 0.75, [0, 6.55, 15.66], {
            color: '#ffd27a', border: '#ff9b20', fontSize: 50,
        });
    }

    _buildParkour(concreteLight, darkSteel, warning) {
        const platforms = [
            { size: [4.8, 0.55, 3.8], pos: [0, 0.05, 6.4] },
            { size: [3.8, 0.55, 3.4], pos: [3.6, 0.45, 1.1] },
            { size: [3.3, 0.55, 3.2], pos: [-1.6, 0.9, -4.0] },
            { size: [3.4, 0.55, 3.1], pos: [-5.35, 0.35, -9.3] },
            { size: [3.7, 0.55, 3.2], pos: [0.15, 0.65, -14.0] },
            { size: [3.1, 0.55, 3.1], pos: [4.55, 1.05, -19.0] },
            { size: [5.6, 0.55, 4.2], pos: [0, 0.15, -25.3] },
        ];
        platforms.forEach(({ size, pos }, index) => {
            const platform = this._box(size, pos, index % 2 ? darkSteel : concreteLight, true);
            const edge = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.12, 0.1, 0.16), warning);
            edge.position.set(pos[0], pos[1] + size[1] / 2 + 0.07, pos[2] + size[2] / 2 - 0.04);
            this._add(edge);
            platform.userData.escapePlatform = true;
        });

        const pipe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.52, 0.52, 5.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x60717f, metalness: 0.84, roughness: 0.32 })
        );
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(-3.15, 0.55, -21.9);
        this._add(pipe, true);
    }

    _buildRunoff() {
        const runoff = new THREE.Mesh(
            new THREE.PlaneGeometry(15.5, 44),
            new THREE.MeshBasicMaterial({
                color: COLORS.electric,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        runoff.rotation.x = -Math.PI / 2;
        runoff.position.set(0, -2.65, -7);
        this._add(runoff);

        for (let z = 12; z >= -28; z -= 2.4) {
            const strip = new THREE.Mesh(
                new THREE.BoxGeometry(14.8, 0.05, 0.07),
                new THREE.MeshBasicMaterial({ color: COLORS.electric, toneMapped: false })
            );
            strip.position.set(0, -2.58, z);
            this._add(strip);
            this.electricStrips.push(strip);
        }

        for (const x of [-7.55, 7.55]) {
            for (const y of [1.8, 3.1]) {
                const pipe = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.18, 44, 12),
                    new THREE.MeshStandardMaterial({ color: 0x526573, metalness: 0.82, roughness: 0.35 })
                );
                pipe.rotation.x = Math.PI / 2;
                pipe.position.set(x, y, -7);
                this._add(pipe);
            }
        }
    }

    _buildFans(darkSteel, steel, warning) {
        [-7.98, 7.98].forEach((x, index) => {
            const fan = new THREE.Group();
            fan.position.set(x, 4.4, index ? -10 : 2.5);
            fan.rotation.y = index ? -Math.PI / 2 : Math.PI / 2;
            fan.add(new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.17, 12, 36), darkSteel));
            for (let i = 0; i < 4; i++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.75, 0.12), steel);
                blade.position.y = 0.72;
                blade.rotation.z = i * Math.PI / 2;
                fan.add(blade);
            }
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.3, 16), warning);
            hub.rotation.x = Math.PI / 2;
            fan.add(hub);
            this._add(fan);
            this.fans.push(fan);
        });
    }

    _buildExit(concreteLight, darkSteel, exit) {
        this._box([7.5, 0.6, 5.8], [0, -0.3, -27.2], concreteLight, true);
        this._box([6.2, 6.4, 0.5], [0, 3.2, -30], darkSteel);
        this._box([4.8, 5.2, 0.15], [0, 3, -29.68], new THREE.MeshBasicMaterial({ color: 0x06140d }));
        for (let y = 0.55; y <= 5.2; y += 0.58) this._box([3.1, 0.12, 0.18], [0, y, -29.45], exit);
        this._box([0.16, 5.1, 0.18], [-1.45, 2.85, -29.45], exit);
        this._box([0.16, 5.1, 0.18], [1.45, 2.85, -29.45], exit);
        this._panel('STREET ACCESS  •  FREEDOM', 7.2, 0.82, [0, 7.0, -29.65], {
            color: '#c9ffe0', border: '#55ff9a', fontSize: 54,
        });
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(5.4, 6.4, 1.5));
        trigger.visible = false;
        trigger.position.set(0, 3, -29.0);
        this._add(trigger);
        this.exitTrigger = trigger;
    }

    _buildLighting(warning, exit) {
        const ambient = new THREE.AmbientLight(0x8aa5b8, 1.25);
        this.scene.add(ambient);
        this.lights.push(ambient);
        for (let z = 11; z >= -24; z -= 7) {
            const lamp = this._box([2.4, 0.1, 0.5], [0, 7.55, z], z < -19 ? exit : warning);
            this.warningLights.push(lamp);
            const light = new THREE.PointLight(z < -19 ? COLORS.exit : COLORS.warning, 4.8, 12);
            light.position.set(0, 6.9, z);
            this.scene.add(light);
            this.lights.push(light);
        }
        const runoffLight = new THREE.PointLight(COLORS.electric, 5.5, 22);
        runoffLight.position.set(0, -1.2, -7);
        this.scene.add(runoffLight);
        this.lights.push(runoffLight);
    }

    setupExitTrigger(callback) {
        if (this.exitTrigger) Collision.addTrigger(this.exitTrigger, callback, 'jail-escape-exit');
    }

    update(dt) {
        this.time += dt;
        this.fans.forEach((fan, index) => { fan.rotation.z += dt * (index ? -2.2 : 2.6); });
        this.electricStrips.forEach((strip, index) => {
            strip.visible = Math.sin(this.time * 7 + index * 0.7) > -0.35;
        });
        this.warningLights.forEach((lamp, index) => {
            if (lamp.material?.emissive) lamp.material.emissiveIntensity = 0.65 + (Math.sin(this.time * 3.5 + index) + 1) * 0.35;
        });
    }

    getSpawnPoint() {
        return { x: 0, y: 1, z: 12.1 };
    }

    getCameraBounds() {
        return { minX: -7.5, maxX: 7.5, minY: -1.5, maxY: 7.3, minZ: -29.2, maxZ: 15.2 };
    }

    dispose() {
        const geometries = new Set();
        const materials = new Set();
        this.objects.forEach(object => {
            this.scene.remove(object);
            object.traverse?.(child => {
                if (child.geometry) geometries.add(child.geometry);
                const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
                childMaterials.filter(Boolean).forEach(material => materials.add(material));
            });
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => {
            material.map?.dispose?.();
            material.dispose?.();
        });
        this.lights.forEach(light => this.scene.remove(light));
        this.objects = [];
        this.lights = [];
    }
}
