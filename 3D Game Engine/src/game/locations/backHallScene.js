import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Collision } from '../collision.js';
import { mountSecondFeatureProp } from '../objects/secondFeatureProps.js';

const GOLD = 0xd7b767;
const CYAN = 0x00caeb;
const MAGENTA = 0xdf3f8b;

export class BackHallScene {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];
        this.mixers = [];
        this.theaterTriggers = [];
        this.arcadeTriggers = [];
    }

    build() {
        this.scene.background = new THREE.Color(0x02020b);
        this.scene.fog = new THREE.Fog(0x02020b, 35, 80);
        this._lighting();
        this._architecture();
        this._nowShowingBoard();
        this._screenDoors();
        this._concessions();
        this._barAndArcade();
        this._posters();
        this._police();
    }

    _add(mesh, collider = false) {
        this.scene.add(mesh);
        this.objects.push(mesh);
        if (collider) Collision.addCollider(mesh);
        return mesh;
    }

    _box(size, pos, material, collider = false) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return this._add(mesh, collider);
    }

    _textSign(text, width, height, pos, rotationY = 0, accent = GOLD) {
        const canvas = document.createElement('canvas');
        canvas.width = 768; canvas.height = 192;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#090616'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = `#${accent.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 12; ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
        ctx.fillStyle = '#fff1c2';
        ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.32), mat);
        sign.position.set(...pos); sign.rotation.y = rotationY;
        return this._add(sign);
    }

    _lighting() {
        const ambient = new THREE.AmbientLight(0x8c99cc, 1.7);
        this.scene.add(ambient); this.lights.push(ambient);
        [-20, -7, 7, 20].forEach((z, i) => {
            const light = new THREE.PointLight(i % 2 ? CYAN : MAGENTA, 5, 22);
            light.position.set(0, 7, z);
            this.scene.add(light); this.lights.push(light);
        });
    }

    _architecture() {
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x17162a, roughness: 0.22, metalness: 0.65 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 60), floorMat);
        floor.rotation.x = -Math.PI / 2;
        this._add(floor);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x080b55, roughness: 0.58, metalness: 0.2 });
        this._box([0.6, 12, 60], [-12, 6, 0], wallMat, true);
        this._box([0.6, 12, 60], [12, 6, 0], wallMat, true);
        this._box([24, 12, 0.6], [0, 6, -30], wallMat, true);
        this._box([24, 0.5, 60], [0, 12, 0], wallMat);

        // Front wall has a real double door instead of an opening into void.
        this._box([8, 8, 0.55], [0, 4, 29.7], new THREE.MeshStandardMaterial({ color: 0x110d22, metalness: 0.55 }), true);
        this._textSign('GRAND LOBBY', 8, 1.35, [0, 9, 29.3], Math.PI, GOLD);
        const exitTrigger = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 3));
        exitTrigger.visible = false; exitTrigger.position.set(0, 3, 27.5);
        this._add(exitTrigger); this.exitTrigger = exitTrigger;

        // Carpet and rope line create a readable route and a proper queue.
        const carpet = new THREE.Mesh(new THREE.PlaneGeometry(5, 52), new THREE.MeshStandardMaterial({ color: 0x4a071f, roughness: 0.8 }));
        carpet.rotation.x = -Math.PI / 2; carpet.position.y = 0.015;
        this._add(carpet);
        [-1, 1].forEach(side => [-23, -18, -13, -8].forEach(z => {
            const post = this._box([0.15, 1.25, 0.15], [side * 3.2, 0.63, z], new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85 }));
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), post.material);
            ball.position.set(side * 3.2, 1.34, z); this._add(ball);
        }));
    }

    _screenDoors() {
        const entries = [
            { n: 1, title: 'AGE OF WAR', x: -11.55, z: 13, rot: Math.PI / 2, color: 0xff6644 },
            { n: 2, title: 'BLAST BLOCK', x: 11.55, z: 13, rot: -Math.PI / 2, color: 0x44aaff },
            { n: 3, title: 'STICK SOCCER', x: -11.55, z: -8, rot: Math.PI / 2, color: 0x44ff88 },
            { n: 4, title: 'SNAKE GAME', x: 11.55, z: -8, rot: -Math.PI / 2, color: 0x55fc77 },
        ];
        entries.forEach(entry => {
            const door = this._box([0.45, 7, 6], [entry.x, 3.5, entry.z], new THREE.MeshStandardMaterial({ color: 0x090817, roughness: 0.35, metalness: 0.65 }));
            const signX = entry.x < 0 ? -11.05 : 11.05;
            this._textSign(`SCREEN ${entry.n} • ${entry.title}`, 6.8, 1.15, [signX, 8.2, entry.z], entry.rot, entry.color);
            const backX = entry.x < 0 ? -11.8 : 11.8;
            this._textSign(`SCREEN ${entry.n} • ${entry.title}`, 6.8, 1.15, [backX, 8.2, entry.z], entry.rot + Math.PI, entry.color);
            const trigger = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 7));
            trigger.visible = false;
            trigger.position.set(entry.x < 0 ? -9.6 : 9.6, 3, entry.z);
            this._add(trigger);
            this.theaterTriggers.push({ trigger, n: entry.n, title: entry.title });
        });
    }

    _nowShowingBoard() {
        mountSecondFeatureProp(this.scene, this.objects, 'now_sign', {
            position: [0, 1.1, -29.2], scale: 2.8
        });
        mountSecondFeatureProp(this.scene, this.objects, 'letter_rows', {
            position: [0, -1.3, -29.2], scale: 2.8
        });
        mountSecondFeatureProp(this.scene, this.objects, 'usher_stand', {
            position: [-5.4, 0, 24.5], rotationY: Math.PI, scale: 1.65
        });
    }

    _concessions() {
        const counterMat = new THREE.MeshStandardMaterial({ color: 0x241247, roughness: 0.35, metalness: 0.4 });
        const counterCollider = this._box([9, 2.4, 3], [6.6, 1.2, 22], counterMat, true);
        counterCollider.visible = false;
        mountSecondFeatureProp(this.scene, this.objects, 'concession_counter', {
            position: [6.6, 0, 22], scale: [4.2, 2.6, 3.2]
        });
        mountSecondFeatureProp(this.scene, this.objects, 'concession_register', {
            position: [9.2, 2.4, 21.3], scale: 1.65
        });
        mountSecondFeatureProp(this.scene, this.objects, 'popcorn_machine', {
            position: [4.1, 2.4, 21.8], scale: 1.45
        });
        mountSecondFeatureProp(this.scene, this.objects, 'soda_tower', {
            position: [5.4, 2.4, 21.75], scale: 1.75
        });
        mountSecondFeatureProp(this.scene, this.objects, 'snack_set', {
            position: [7.75, 2.4, 21.35], scale: 2
        });
        this._textSign('POPCORN • DRINKS • HOT FOOD', 9, 1.25, [6.6, 6.7, 20.4], 0, 0x55fc77);
        this._loadNpc('../Animated Men Characters - Feb 2019/FBX/Male_Suit.fbx', [6.5, 0, 23.5], [6.5, 0, 19], 'concession');
        const concessionTrigger = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 7));
        concessionTrigger.visible = false;
        concessionTrigger.position.set(6.5, 3, 18.5);
        this._add(concessionTrigger);
        this.concessionTrigger = concessionTrigger;
    }

    _barAndArcade() {
        this._box([0.8, 4, 13], [-10.8, 2, 1], new THREE.MeshStandardMaterial({ color: 0x331329, roughness: 0.35, metalness: 0.45 }), true);
        this._textSign('THE REEL BAR', 8, 1.15, [-10.25, 6.2, 1], Math.PI / 2, MAGENTA);
        for (let z = -2; z <= 4; z += 2) {
            const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x55aacc, transparent: true, opacity: 0.75 }));
            bottle.position.set(-10.15, 4.0, z); this._add(bottle);
        }

        this._box([0.8, 5.5, 14], [10.8, 2.75, 1], new THREE.MeshStandardMaterial({ color: 0x071a2a, roughness: 0.35, metalness: 0.6 }), true);
        this._textSign('ARCADE WALL', 8, 1.15, [10.25, 6.5, 1], -Math.PI / 2, CYAN);
        [-3.5, 0, 3.5].forEach((z, i) => {
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.4), new THREE.MeshBasicMaterial({ color: [MAGENTA, CYAN, 0x55fc77][i] }));
            screen.rotation.y = -Math.PI / 2; screen.position.set(10.32, 3.2, z);
            this._add(screen);
            const trigger = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 3));
            trigger.visible = false;
            trigger.position.set(8.9, 2.5, z);
            this._add(trigger);
            this.arcadeTriggers.push({ trigger, n: i + 1 });
        });
    }

    _posters() {
        const posters = [
            ['AGE OF WAR', -7.7, 24.7, 0xff6644], ['BLAST BLOCK', -3.8, 24.7, 0x44aaff],
            ['STICK SOCCER', 0, 24.7, 0x44ff88], ['SNAKE', 3.8, 24.7, 0x55fc77],
        ];
        [-5.75, 1.9].forEach(x => {
            mountSecondFeatureProp(this.scene, this.objects, 'poster_lightboxes', {
                position: [x, -3.05, 24.9], scale: 4.5
            });
        });
        posters.forEach(([title, x, z, color]) => this._textSign(title, 3.1, 4.5, [x, 3.7, z], 0, color));
        this._textSign('THE IRIS SEES EVERY SCREENING', 11, 1.1, [0, 10.1, -29.6], 0, MAGENTA);
    }

    _police() {
        this._loadNpc('../Animated Men Characters - Feb 2019/FBX/Male_LongSleeve.fbx', [0, 0, 4], [0, 0, 18], 'police');
        this._textSign('CINEMA SECURITY • TICKETS READY', 10, 1.0, [0, 6.5, -28.9], 0, GOLD);
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8));
        trigger.visible = false; trigger.position.set(0, 3, 4);
        this._add(trigger); this.policeTrigger = trigger;
    }

    _loadNpc(path, position, lookAt, type) {
        new FBXLoader().load(path, fbx => {
            fbx.scale.setScalar(0.008333); fbx.position.set(...position); fbx.lookAt(...lookAt);
            fbx.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
            this.scene.add(fbx); this.objects.push(fbx);
            if (fbx.animations?.length) {
                const mixer = new THREE.AnimationMixer(fbx);
                const clip = fbx.animations.find(a => /Man_(Idle|Standing)$/.test(a.name));
                if (clip) mixer.clipAction(clip).play();
                this.mixers.push(mixer);
            }
            if (type === 'police') {
                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0x111c50 }));
                cap.position.set(position[0], 2.12, position[2]); this._add(cap);
            }
        });
    }

    setupTheaterTriggers(callback) {
        this.theaterTriggers.forEach(({ trigger, n, title }) => Collision.addTrigger(trigger, event => callback(event, n, title), `backhall-screen-${n}`));
    }

    setupExitTrigger(callback) { Collision.addTrigger(this.exitTrigger, callback, 'backhall-lobby'); }
    setupPoliceTrigger(callback) { Collision.addTrigger(this.policeTrigger, callback, 'backhall-police'); }
    setupConcessionTrigger(callback) { Collision.addTrigger(this.concessionTrigger, callback, 'backhall-concession'); }
    setupArcadeTriggers(callback) {
        this.arcadeTriggers.forEach(({ trigger, n }) => Collision.addTrigger(trigger, event => callback(event, n), `backhall-arcade-${n}`));
    }
    getSpawnPoint() { return { x: 0, y: 1, z: 25 }; }
    getCameraBounds() { return { minX: -11.2, maxX: 11.2, minY: 1.2, maxY: 11.2, minZ: -29.1, maxZ: 29.1 }; }
    update(dt) { this.mixers.forEach(m => m.update(dt)); }
    dispose() {
        this.mixers.forEach(m => m.stopAllAction());
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
            else obj.material?.dispose?.();
        });
        this.lights.forEach(light => this.scene.remove(light));
    }
}
