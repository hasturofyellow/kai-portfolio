import * as THREE from 'three';
import { Collision } from '../collision.js';

export class LavaCaveScene {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];
        this.moneyStacks = [];
        this.time = 0;
        this.lavaLight = null;
        this.lavaMesh = null;
        this.portalMesh = null;
        this.exitTrigger = null;
        this.portalTrigger = null;
    }

    build() {
        this.setupLighting();
        this.buildLava();
        this.buildPlatform();
        this.buildParkourRocks();
        this.buildDestinationPlatform();
        this.buildPortal();
        this.buildWalls();
        this.buildCeiling();
        this.buildExit();
        // Bill #5: on the destination platform, off to one side — reward for completing the parkour
        this.createMoneyStack('cave-platform', 3, -33);
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0x220800, 1.5);
        this.scene.add(ambient);
        this.lights.push(ambient);

        const hemi = new THREE.HemisphereLight(0xffddaa, 0xff2200, 2.5);
        this.scene.add(hemi);
        this.lights.push(hemi);

        // Main lava glow — pulsed in update()
        this.lavaLight = new THREE.PointLight(0xff5500, 8, 20);
        this.lavaLight.position.set(0, -1, 0);
        this.scene.add(this.lavaLight);
        this.lights.push(this.lavaLight);

        const fill = new THREE.PointLight(0xff2200, 3, 16);
        fill.position.set(5, 0, 5);
        this.scene.add(fill);
        this.lights.push(fill);

        // Additional lava lights distributed along cave length
        const lavaLight2 = new THREE.PointLight(0xff5500, 6, 18);
        lavaLight2.position.set(0, -1, -15);
        this.scene.add(lavaLight2);
        this.lights.push(lavaLight2);

        const lavaLight3 = new THREE.PointLight(0xff5500, 6, 18);
        lavaLight3.position.set(0, -1, -30);
        this.scene.add(lavaLight3);
        this.lights.push(lavaLight3);

        // Purple accent near portal
        const portalLight = new THREE.PointLight(0x8800ff, 4, 12);
        portalLight.position.set(0, 2, -36);
        this.scene.add(portalLight);
        this.lights.push(portalLight);
    }

    buildLava() {
        const lavaGeo = new THREE.PlaneGeometry(26, 56);
        const lavaMat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 1.5,
            roughness: 0.8
        });
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.rotation.x = -Math.PI / 2;
        lava.position.set(0, -3, -12.5);
        this.scene.add(lava);
        this.objects.push(lava);
        this.lavaMesh = lava;
    }

    buildPlatform() {
        // Spawn platform — player lands here from the dumpster
        const platGeo = new THREE.BoxGeometry(8, 0.5, 8);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1.0 });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(0, -0.25, 10);
        this.scene.add(platform);
        this.objects.push(platform);
        Collision.addCollider(platform);
    }

    buildParkourRocks() {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1.0 });
        const rocks = [
            { pos: [2,    -0.5,  4],  size: [3,   1,   3  ] }, // Rock 1 — trivial first step
            { pos: [-1.5,  0,    0],  size: [3,   1,   3  ] }, // Rock 2 — small hop + slight height
            { pos: [2.5,  -0.25, -5], size: [3.5, 0.5, 3.5] }, // Rock 3
            { pos: [-2,    0.25, -10], size: [2.5, 1.5, 2.5] }, // Rock 4 — taller landing
            { pos: [1.5,  -0.5, -16], size: [3,   1,   3  ] }, // Rock 5 — longest gap
            { pos: [-1,    0,   -21], size: [3,   1,   3  ] }, // Rock 6
            { pos: [1,    -0.25, -27], size: [4,   0.5, 4  ] }, // Rock 7 — wider, signals end near
        ];

        rocks.forEach(({ pos, size }) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), rockMat);
            mesh.position.set(...pos);
            this.scene.add(mesh);
            this.objects.push(mesh);
            Collision.addCollider(mesh);
        });
    }

    buildDestinationPlatform() {
        const geo = new THREE.BoxGeometry(10, 0.5, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1.0 });
        const platform = new THREE.Mesh(geo, mat);
        platform.position.set(0, -0.25, -35);
        this.scene.add(platform);
        this.objects.push(platform);
        Collision.addCollider(platform);
    }

    buildPortal() {
        const portalMat = new THREE.MeshStandardMaterial({
            color: 0x220044,
            emissive: 0x8800ff,
            emissiveIntensity: 2.0
        });

        // Frame: top bar + two side posts
        const frameParts = [
            { size: [3.4, 0.4, 0.4], pos: [0,    5,   -36] }, // top bar
            { size: [0.4, 5,   0.4], pos: [-1.7, 2.5, -36] }, // left post
            { size: [0.4, 5,   0.4], pos: [1.7,  2.5, -36] }, // right post
        ];
        frameParts.forEach(({ size, pos }) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), portalMat);
            mesh.position.set(...pos);
            this.scene.add(mesh);
            this.objects.push(mesh);
        });

        // Glowing inner fill plane
        const fillGeo = new THREE.PlaneGeometry(3, 5);
        const fillMat = new THREE.MeshStandardMaterial({
            color: 0x6600cc,
            emissive: 0x6600cc,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.position.set(0, 2.5, -35.9);
        this.scene.add(fill);
        this.objects.push(fill);
        this.portalMesh = fill; // tracked for pulsing

        // Invisible trigger volume
        const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 2));
        triggerMesh.visible = false;
        triggerMesh.position.set(0, 2.5, -35.5);
        this.scene.add(triggerMesh);
        this.objects.push(triggerMesh);
        this.portalTrigger = triggerMesh;
    }

    buildWalls() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1.0, metalness: 0 });

        const wallConfigs = [
            // Entrance wall
            { size: [26, 14, 3],  pos: [0,   5,   14],    rot: [0,    0,     -0.03] },
            // Far wall (behind portal)
            { size: [26, 14, 3],  pos: [0,   5,  -39],    rot: [0,    0,      0.04] },
            // Left wall
            { size: [3,  14, 56], pos: [-13, 5,  -12.5],  rot: [0.03, 0,      0   ] },
            // Right wall
            { size: [3,  14, 56], pos: [13,  5,  -12.5],  rot: [-0.02, 0,     0   ] },
            // Irregular rock masses jutting inward for visual depth
            { size: [5,  4,  3],  pos: [-10, -1,  -8],    rot: [0.1,  0.05,   0   ] },
            { size: [3,  5,  6],  pos: [10,  -0.5,-20],   rot: [0,    0.06,   0.04] },
            { size: [4,  3,  3],  pos: [-9,  -1,  -30],   rot: [0.08, 0,      0.03] },
        ];

        wallConfigs.forEach(({ size, pos, rot }) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
            mesh.position.set(...pos);
            mesh.rotation.set(...rot);
            this.scene.add(mesh);
            this.objects.push(mesh);
            Collision.addCollider(mesh);
        });
    }

    buildCeiling() {
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x110a04, roughness: 1.0, metalness: 0 });

        const ceilConfigs = [
            { size: [28, 3, 30], pos: [0,  10,    0     ] },
            { size: [28, 3, 30], pos: [0,   9.5, -27    ] },
            { size: [8,  4, 56], pos: [-9, 10.5, -12.5  ] },
            { size: [8,  4, 56], pos: [9,   9.5, -12.5  ] },
        ];

        ceilConfigs.forEach(({ size, pos }) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), ceilMat);
            mesh.position.set(...pos);
            this.scene.add(mesh);
            this.objects.push(mesh);
        });
    }

    buildExit() {
        // Invisible trigger box near the entrance wall — player walks back to exit
        const exitMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 2));
        exitMesh.visible = false;
        exitMesh.position.set(0, 1, 13);
        this.scene.add(exitMesh);
        this.objects.push(exitMesh);
        this.exitTrigger = exitMesh;

        // Orange glowing marker strip
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const marker = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.08), markerMat);
        marker.position.set(0, 0.5, 13.8);
        this.scene.add(marker);
        this.objects.push(marker);

        // Small sign above exit crack
        const signMat = new THREE.MeshStandardMaterial({ color: 0x2a1a00, emissive: 0xff3300, emissiveIntensity: 0.4 });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.1), signMat);
        sign.position.set(0, 1.8, 13.8);
        this.scene.add(sign);
        this.objects.push(sign);
    }

    createMoneyStack(id, x, z) {
        const group = new THREE.Group();

        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#2d8a3e';
        ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#1a5c28';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, 118, 54);
        ctx.fillStyle = '#c8ffc8';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$5', 64, 32);
        const tex = new THREE.CanvasTexture(canvas);

        const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.05 });
        const sideMat = new THREE.MeshStandardMaterial({
            color: 0x2d8a3e, roughness: 0.6, metalness: 0.05,
            emissive: 0x0a3010, emissiveIntensity: 0.15
        });
        const billMats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];

        const count = 6;
        for (let i = 0; i < count; i++) {
            const bill = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.028, 0.44), billMats);
            bill.position.y = i * 0.028 + 0.014;
            bill.rotation.y = (i - count / 2) * 0.08 + (Math.random() - 0.5) * 0.05;
            group.add(bill);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        const glow = new THREE.PointLight(0x44ff88, 1.2, 5);
        glow.position.set(x, 0.6, z);
        this.scene.add(glow);
        this.lights.push(glow);

        const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
        triggerMesh.visible = false;
        triggerMesh.position.set(x, 0.5, z);
        this.scene.add(triggerMesh);
        this.objects.push(triggerMesh);

        this.moneyStacks.push({ id, group, glow, triggerMesh });
    }

    setupMoneyPickups(collectedIds, onCollect) {
        for (const stack of this.moneyStacks) {
            if (collectedIds.has(stack.id)) {
                this.scene.remove(stack.group);
                this.scene.remove(stack.glow);
                this.scene.remove(stack.triggerMesh);
            } else {
                Collision.addTrigger(stack.triggerMesh, (event) => {
                    if (event === 'enter') {
                        this.scene.remove(stack.group);
                        this.scene.remove(stack.glow);
                        this.scene.remove(stack.triggerMesh);
                        Collision.removeTrigger(stack.id);
                        onCollect(stack.id);
                    }
                }, stack.id);
            }
        }
    }

    setupExitTrigger(callback) {
        if (this.exitTrigger) {
            Collision.addTrigger(this.exitTrigger, callback, 'cave-exit');
        }
    }

    setupPortalTrigger(callback) {
        if (this.portalTrigger) {
            Collision.addTrigger(this.portalTrigger, callback, 'cave-portal');
        }
    }

    getSpawnPoint() {
        return { x: 0, y: 1, z: 10 };
    }

    getGameUrl() {
        return '../doodleJump.html';
    }

    update(dt) {
        this.time += dt;

        // Pulse main lava light
        if (this.lavaLight) {
            this.lavaLight.intensity = 8 + Math.sin(this.time * 2) * 2;
        }

        // Pulse lava emissive
        if (this.lavaMesh) {
            this.lavaMesh.material.emissiveIntensity = 1.5 + Math.sin(this.time * 1.5) * 0.4;
        }

        // Pulse portal emissive between 1.5–2.5
        if (this.portalMesh) {
            this.portalMesh.material.emissiveIntensity = 2 + Math.sin(this.time * 3) * 0.5;
        }
    }

    dispose() {
        for (const obj of this.objects) {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }

        for (const light of this.lights) {
            this.scene.remove(light);
        }

        this.objects = [];
        this.lights = [];
        this.lavaLight = null;
        this.lavaMesh = null;
        this.portalMesh = null;
    }
}
