import * as THREE from 'three';
import { Collision } from '../collision.js';

const COLORS = {
    concrete: 0x2b3440,
    concreteLight: 0x556171,
    steel: 0x7f8c99,
    darkSteel: 0x10151c,
    amber: 0xffb020,
    red: 0xff304f,
    cyan: 0x45d9ff,
    blanket: 0x263f68,
};

export class JailScene {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];
        this.time = 0;
        this.bailTrigger = null;
        this.escapeTrigger = null;
        this.alarmLight = null;
        this.arrivalRing = null;
        this.cameraPivot = null;
        this.returnTrigger = null;
        this.escapeVentDoor = null;
        this.escapeVentOpening = false;
        this.escapeVentOpenAmount = 0;
        this.allowVisitorReturn = options.allowVisitorReturn === true;
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
        ctx.fillStyle = options.background ?? '#0b0f15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = options.border ?? '#ffb020';
        ctx.lineWidth = 18;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
        ctx.fillStyle = options.color ?? '#f4d28a';
        ctx.font = `900 ${options.fontSize ?? 66}px "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.14), material);
        panel.position.set(...position);
        return this._add(panel);
    }

    build() {
        this.scene.background = new THREE.Color(0x080d18);
        this.scene.fog = new THREE.Fog(0x080d18, 18, 42);

        const concrete = new THREE.MeshStandardMaterial({ color: COLORS.concrete, roughness: 0.92, metalness: 0.08 });
        const lighterConcrete = new THREE.MeshStandardMaterial({ color: COLORS.concreteLight, roughness: 0.86, metalness: 0.12 });
        const steel = new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.28, metalness: 0.9 });
        const darkSteel = new THREE.MeshStandardMaterial({ color: COLORS.darkSteel, roughness: 0.42, metalness: 0.72 });
        const amber = new THREE.MeshStandardMaterial({
            color: COLORS.amber,
            emissive: COLORS.amber,
            emissiveIntensity: 1.25,
            roughness: 0.38,
            metalness: 0.4,
        });
        const red = new THREE.MeshStandardMaterial({
            color: COLORS.red,
            emissive: COLORS.red,
            emissiveIntensity: 1.1,
            roughness: 0.32,
        });

        this._buildRoom(concrete, lighterConcrete, darkSteel, amber);
        this._buildCellFront(steel, darkSteel, amber);
        this._buildBookingArea(concrete, darkSteel, amber);
        this._buildCellFurniture(concrete, lighterConcrete, darkSteel);
        this._buildBailKiosk(darkSteel, amber);
        this._buildEscapeRoute(darkSteel, steel, red);
        if (this.allowVisitorReturn) this._buildVisitorReturn(darkSteel);
        this._buildSecurityDetails(darkSteel, red);
        this._buildLighting();
    }

    _buildRoom(concrete, lighterConcrete, darkSteel, amber) {
        this._box([24, 0.3, 22], [0, -0.15, 0], concrete, true);
        this._box([24, 0.28, 22], [0, 8, 0], darkSteel, true);
        this._box([24, 8, 0.5], [0, 4, 11], concrete, true);
        this._box([24, 8, 0.5], [0, 4, -11], concrete, true);
        this._box([0.5, 8, 22], [-12, 4, 0], concrete, true);
        this._box([0.5, 8, 22], [12, 4, 0], concrete, true);

        this._box([23.5, 0.025, 0.16], [0, 0.02, -2.55], amber);
        this._box([23.5, 0.025, 0.08], [0, 0.025, -2.05], lighterConcrete);
        for (let z = -9; z <= 9; z += 3) {
            this._box([23.5, 0.018, 0.035], [0, 0.018, z], lighterConcrete);
        }

        const arrivalMat = new THREE.MeshBasicMaterial({
            color: COLORS.cyan,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const arrival = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.08, 12, 48), arrivalMat);
        arrival.rotation.x = Math.PI / 2;
        arrival.position.set(0, 0.05, 5.2);
        this.arrivalRing = this._add(arrival);

        this._panel('KAI\'S CINEMA SECURITY  •  HOLDING 01', 11.5, 1.1, [0, 7.1, -10.7], {
            color: '#f5d38a', border: '#ffb020', fontSize: 52,
        });
    }

    _buildCellFront(steel, darkSteel, amber) {
        const bars = new THREE.Group();
        // Carry the bars into the side walls and from floor to ceiling so the
        // cell front reads as a sealed barrier from every camera angle.
        for (let x = -11.6; x <= 11.6; x += 0.85) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 7.9, 10), steel);
            bar.position.set(x, 3.95, -2.5);
            bar.castShadow = true;
            bars.add(bar);
        }
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(23.7, 0.32, 0.38), darkSteel);
        topRail.position.set(0, 7.78, -2.5);
        bars.add(topRail);
        const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(23.7, 0.28, 0.38), darkSteel);
        bottomRail.position.set(0, 0.14, -2.5);
        bars.add(bottomRail);
        this._add(bars);

        const barrier = new THREE.Mesh(new THREE.BoxGeometry(23.7, 8, 0.34));
        barrier.visible = false;
        barrier.position.set(0, 4, -2.5);
        this._add(barrier, true);

        this._box([4.4, 0.22, 0.42], [0, 7.05, -2.32], darkSteel);
        this._box([0.22, 7, 0.42], [-2.1, 3.55, -2.32], darkSteel);
        this._box([0.22, 7, 0.42], [2.1, 3.55, -2.32], darkSteel);
        this._box([0.58, 0.82, 0.38], [1.68, 3.25, -2.08], amber);
    }

    _buildBookingArea(concrete, darkSteel, amber) {
        this._box([8.8, 1.15, 2.1], [0, 0.65, -7.2], darkSteel, true);
        this._box([8.2, 0.16, 1.9], [0, 1.3, -7.2], concrete);
        this._box([2.4, 1.25, 0.16], [-2.5, 2.05, -7.15], amber);
        this._panel('OFFICER INTAKE', 5.6, 0.82, [0, 3.15, -10.65], {
            color: '#cceeff', border: '#45d9ff', fontSize: 60,
        });

        const monitor = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 1.15, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x77e8ff })
        );
        monitor.position.set(1.6, 2.05, -7.1);
        this._add(monitor);
        [-3.2, 3.2].forEach(x => this._box([1.5, 0.16, 1.2], [x, 1.55, -7.2], concrete));
    }

    _buildCellFurniture(concrete, lighterConcrete, darkSteel) {
        this._box([6.4, 0.42, 2.35], [-7.4, 0.55, 6.9], darkSteel, true);
        this._box([6.05, 0.32, 2.05], [-7.4, 0.92, 6.9], new THREE.MeshStandardMaterial({ color: COLORS.blanket, roughness: 0.95 }), true);
        this._box([1.35, 0.3, 1.55], [-9.55, 1.18, 6.9], lighterConcrete);
        for (const x of [-10.1, -4.7]) this._box([0.18, 1.1, 0.18], [x, 0.5, 6.9], darkSteel);

        const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.66, 0.9, 24), lighterConcrete);
        toilet.position.set(9.3, 0.45, 8.25);
        this._add(toilet, true);
        const seat = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 10, 28), darkSteel);
        seat.rotation.x = Math.PI / 2;
        seat.position.set(9.3, 0.94, 8.25);
        this._add(seat);
        this._box([1.8, 1.15, 0.85], [9.3, 1.25, 9.75], lighterConcrete, true);

        this._box([5.2, 0.38, 1.65], [6.4, 0.95, 5.8], darkSteel, true);
        this._box([0.22, 1.85, 1.35], [4.15, 0.62, 5.8], concrete, true);
        this._box([0.22, 1.85, 1.35], [8.65, 0.62, 5.8], concrete, true);

        for (let y = 2; y <= 6; y += 0.5) {
            const width = Number.isInteger(y) ? 2.6 : 1.35;
            this._box([width, 0.025, 0.035], [0, y, 10.72], lighterConcrete);
        }
        this._panel('5\'  •  6\'  •  7\'', 3.4, 0.55, [0, 6.65, 10.71], {
            color: '#9da9b8', border: '#303844', fontSize: 54,
        });
    }

    _buildBailKiosk(darkSteel, amber) {
        this._box([2.7, 4.1, 1.1], [-9.7, 2.05, 1.2], darkSteel, true);
        this._box([2.05, 1.25, 0.08], [-9.7, 2.65, 1.78], amber);
        this._panel('BAIL  $10', 2.8, 0.7, [-9.7, 4.55, 1.8], {
            color: '#ffe39b', border: '#ffb020', fontSize: 66,
        });
        const cardSlot = this._box([1.15, 0.12, 0.12], [-9.7, 1.4, 1.82], amber);
        cardSlot.rotation.z = -0.08;

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(4.1, 4.8, 3.6));
        trigger.visible = false;
        trigger.position.set(-9.2, 2.25, 2.1);
        this._add(trigger);
        this.bailTrigger = trigger;
    }

    _buildEscapeRoute(darkSteel, steel, red) {
        // Deep, framed duct opening so the escape route reads as a real vent
        // rather than bars painted directly onto the wall.
        this._box([3.55, 2.9, 0.42], [7.4, 5.25, 10.7], darkSteel);
        this._box([2.85, 2.28, 0.08], [7.4, 5.25, 10.43], new THREE.MeshBasicMaterial({ color: 0x020509 }));
        this._box([3.65, 0.18, 0.32], [7.4, 6.72, 10.38], steel);
        this._box([3.65, 0.18, 0.32], [7.4, 3.78, 10.38], steel);
        this._box([0.18, 3.1, 0.32], [5.62, 5.25, 10.38], steel);
        this._box([0.18, 3.1, 0.32], [9.18, 5.25, 10.38], steel);

        // The grate pivots from its top edge when pried with the crowbar.
        const grate = new THREE.Group();
        grate.position.set(7.4, 6.58, 10.2);
        for (let x = -1.3; x <= 1.3; x += 0.43) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.55, 0.12), steel);
            slat.position.set(x, -1.27, 0);
            slat.castShadow = true;
            grate.add(slat);
        }
        for (const y of [-0.12, -2.42]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 0.16), darkSteel);
            rail.position.set(0, y, 0);
            grate.add(rail);
        }
        for (const x of [-1.38, 1.38]) {
            for (const y of [-0.15, -2.4]) {
                const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), steel);
                bolt.rotation.x = Math.PI / 2;
                bolt.position.set(x, y, 0.1);
                grate.add(bolt);
            }
        }
        this.escapeVentDoor = this._add(grate);

        this._box([2.9, 0.09, 0.1], [7.4, 3.98, 10.12], red);
        this._panel('MAINTENANCE VENT  •  BOLTED', 5.1, 0.72, [7.4, 7.25, 10.66], {
            color: '#ffb8c3', border: '#ff304f', fontSize: 48,
        });

        const escape = new THREE.Mesh(new THREE.BoxGeometry(3.8, 8, 3.2));
        escape.visible = false;
        escape.position.set(7.4, 4, 9.35);
        this._add(escape);
        this.escapeTrigger = escape;
    }

    pryEscapeVent() {
        if (this.escapeVentOpening || this.escapeVentOpenAmount >= 1) return;
        this.escapeVentOpening = true;
    }

    _buildVisitorReturn(darkSteel) {
        const x = -4.3;
        const ringMat = new THREE.MeshStandardMaterial({
            color: COLORS.cyan,
            emissive: COLORS.cyan,
            emissiveIntensity: 1.8,
            metalness: 0.75,
            roughness: 0.22,
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.15, 14, 48), ringMat);
        ring.position.set(x, 1.55, 10.45);
        this._add(ring);

        const fill = new THREE.Mesh(
            new THREE.CircleGeometry(0.96, 40),
            new THREE.MeshBasicMaterial({
                color: 0x45d9ff,
                transparent: true,
                opacity: 0.38,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        fill.position.set(x, 1.55, 10.42);
        this._add(fill);

        this._panel('VISITOR RETURN', 3.4, 0.62, [x, 3.35, 10.66], {
            color: '#cceeff', border: '#45d9ff', fontSize: 58,
        });

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.8, 2.4));
        trigger.visible = false;
        trigger.position.set(x, 1.9, 9.55);
        this._add(trigger);
        this.returnTrigger = trigger;
    }

    _buildSecurityDetails(darkSteel, red) {
        this.cameraPivot = new THREE.Group();
        this.cameraPivot.position.set(-8.7, 6.7, -2.0);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.12), darkSteel);
        arm.position.x = 0.55;
        const camera = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.42), darkSteel);
        camera.position.set(1.2, -0.15, 0);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.16, 12), red);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(1.6, -0.15, 0);
        this.cameraPivot.add(arm, camera, lens);
        this._add(this.cameraPivot);

        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.55, 16), red);
        beacon.position.set(10.6, 7.45, -1.5);
        this._add(beacon);
    }

    _buildLighting() {
        const ambient = new THREE.AmbientLight(0xb8c7d8, 2.0);
        this.scene.add(ambient);
        this.lights.push(ambient);

        const hemi = new THREE.HemisphereLight(0xd3eeff, 0x1b202a, 1.55);
        this.scene.add(hemi);
        this.lights.push(hemi);

        [-7, 0, 7].forEach(x => {
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(4.4, 0.12, 1.15),
                new THREE.MeshBasicMaterial({ color: 0xbdefff })
            );
            panel.position.set(x, 7.75, 3.2);
            this._add(panel);

            const light = new THREE.PointLight(0x9fe7ff, 6.5, 15);
            light.position.set(x, 7.35, 3.2);
            this.scene.add(light);
            this.lights.push(light);
        });

        const intakeLight = new THREE.PointLight(COLORS.amber, 4, 15);
        intakeLight.position.set(0, 5.5, -6.5);
        this.scene.add(intakeLight);
        this.lights.push(intakeLight);

        this.alarmLight = new THREE.PointLight(COLORS.red, 4, 14);
        this.alarmLight.position.set(9.5, 6.8, -1.5);
        this.scene.add(this.alarmLight);
        this.lights.push(this.alarmLight);

        const cellFill = new THREE.PointLight(0xe4f4ff, 5.5, 18);
        cellFill.position.set(0, 4.8, 7.5);
        this.scene.add(cellFill);
        this.lights.push(cellFill);
    }

    setupBailTrigger(callback) {
        if (this.bailTrigger) Collision.addTrigger(this.bailTrigger, callback, 'jail-bail');
    }

    setupEscapeTrigger(callback) {
        if (this.escapeTrigger) Collision.addTrigger(this.escapeTrigger, callback, 'jail-escape');
    }

    setupReturnTrigger(callback) {
        if (this.returnTrigger) Collision.addTrigger(this.returnTrigger, callback, 'jail-visitor-return');
    }

    update(dt) {
        this.time += dt;
        if (this.escapeVentOpening && this.escapeVentDoor) {
            this.escapeVentOpenAmount = Math.min(1, this.escapeVentOpenAmount + dt * 1.35);
            const eased = 1 - Math.pow(1 - this.escapeVentOpenAmount, 3);
            this.escapeVentDoor.rotation.x = -eased * 1.3;
        }
        if (this.alarmLight) this.alarmLight.intensity = 2.8 + (Math.sin(this.time * 4.2) + 1) * 1.4;
        if (this.arrivalRing) {
            this.arrivalRing.rotation.z += dt * 0.65;
            const pulse = 1 + Math.sin(this.time * 3.2) * 0.06;
            this.arrivalRing.scale.setScalar(pulse);
        }
        if (this.cameraPivot) this.cameraPivot.rotation.y = Math.sin(this.time * 0.55) * 0.48;
    }

    getSpawnPoint() {
        return { x: 0, y: 1, z: 5.2 };
    }

    getCameraBounds() {
        return { minX: -11.2, maxX: 11.2, minY: 1.1, maxY: 7.5, minZ: -10.2, maxZ: 10.2 };
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
