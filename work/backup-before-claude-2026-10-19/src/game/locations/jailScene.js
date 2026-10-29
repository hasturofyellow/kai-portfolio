import * as THREE from 'three';
import { Collision } from '../collision.js';

export class JailScene {
    constructor(scene) { this.scene = scene; this.objects = []; this.lights = []; }
    _add(mesh, collider = false) { this.scene.add(mesh); this.objects.push(mesh); if (collider) Collision.addCollider(mesh); return mesh; }
    build() {
        this.scene.background = new THREE.Color(0x03050a);
        const ambient = new THREE.AmbientLight(0x6b7d99, 1.7); this.scene.add(ambient); this.lights.push(ambient);
        const mat = new THREE.MeshStandardMaterial({ color: 0x272b32, roughness: 0.9 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mat); floor.rotation.x = -Math.PI / 2; this._add(floor);
        [[18, 8, .6, 0, 4, -9], [18, 8, .6, 0, 4, 9], [.6, 8, 18, -9, 4, 0], [.6, 8, 18, 9, 4, 0]].forEach(v => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(v[0], v[1], v[2]), mat); wall.position.set(v[3], v[4], v[5]); this._add(wall, true);
        });
        const barMat = new THREE.MeshStandardMaterial({ color: 0x7d8795, metalness: 0.85, roughness: 0.25 });
        for (let x = -5; x <= 5; x += 1) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 7, 10), barMat); bar.position.set(x, 3.5, -5); this._add(bar, true);
        }
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#15171c'; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = '#f3cf72'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BAIL $10  •  ESCAPE VENT', 256, 64);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, .25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })); sign.position.set(0, 6.5, -8.55); this._add(sign);
        const bail = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 3)); bail.visible = false; bail.position.set(-5.5, 2.5, -6.8); this._add(bail); this.bailTrigger = bail;
        // The vent is raised, making the improved double jump part of the escape loop.
        const vent = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, .35), new THREE.MeshStandardMaterial({ color: 0x151a22, metalness: .7 })); vent.position.set(5.5, 4.8, -8.55); this._add(vent);
        const escape = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 2)); escape.visible = false; escape.position.set(5.5, 4.8, -7.5); this._add(escape); this.escapeTrigger = escape;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(5, .7, 2.2), new THREE.MeshStandardMaterial({ color: 0x1c2941 })); bed.position.set(-5.5, .5, 4.5); this._add(bed, true);
    }
    setupBailTrigger(cb) { Collision.addTrigger(this.bailTrigger, cb, 'jail-bail'); }
    setupEscapeTrigger(cb) { Collision.addTrigger(this.escapeTrigger, cb, 'jail-escape'); }
    getSpawnPoint() { return { x: 0, y: 1, z: 5 }; }
    getCameraBounds() { return { minX: -8.3, maxX: 8.3, minY: 1.2, maxY: 7.2, minZ: -8.3, maxZ: 8.3 }; }
    dispose() { this.objects.forEach(o => { this.scene.remove(o); o.geometry?.dispose?.(); o.material?.dispose?.(); }); this.lights.forEach(l => this.scene.remove(l)); }
}
