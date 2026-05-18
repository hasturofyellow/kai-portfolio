import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Collision } from '../collision.js';

// Refined color palette - Deep blue as PRIMARY grounding color
const COLORS = {
    // PRIMARY: Deep Electric Blue - for walls, architecture, grounding
    primary: 0x060885,
    // SECONDARY: Hot Magenta - for signage, branding, LED edges
    secondary: 0xdf3f8b,
    // TERTIARY: Neon Cyan - for floor strips, glow effects, directional
    tertiary: 0x00caeb,
    // POP: Neon Mint - use sparingly for VIP, arcade, special highlights
    pop: 0x55fc77,
    // Backgrounds
    dark: 0x020210,       // Near black with deep blue undertone
    darkSurface: 0x040420, // Slightly lighter for surfaces
    white: 0xffffff
};

export class ExteriorScene {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];
        this.marqueeLights = [];
        this.moneyStacks = [];
        this.time = 0;
        this.npcMixer = null;
        this.ticketTrigger = null;
    }

    build() {
        this.createSky();
        this.createStreet();
        this.createSidewalk();
        this.createTheaterBuilding();
        this.createMarquee();
        this.createTicketBooth();
        this.createStreetLamps();
        this.createEntranceDoors();
        this.createNeonDecorations();
        this.createDumpster();
        // Bill #1: tucked between dumpster and building wall
        this.createMoneyStack('ext-dumpster', -14, -7);
        // Bill #2: pressed against the facade between leftmost column and building edge
        this.createMoneyStack('ext-corner', -17.5, -8);
        this.setupLighting();
        this.buildTicketNPC();
    }

    buildTicketNPC() {
        const loader = new FBXLoader();
        loader.load('../Animated Men Characters - Feb 2019/FBX/Male_Suit.fbx', (fbx) => {
            fbx.scale.setScalar(0.0125);
            fbx.position.set(12, 0, -2.2); // inside booth, behind window
            fbx.rotation.y = Math.PI; // face toward player (+Z)
            fbx.traverse(child => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });
            this.scene.add(fbx);
            this.objects.push(fbx);
            if (fbx.animations?.length > 0) {
                this.npcMixer = new THREE.AnimationMixer(fbx);
                this.npcMixer.clipAction(fbx.animations[0]).play();
            }
        }, undefined, (err) => console.warn('Male_Suit.fbx (exterior NPC) failed to load:', err));

        // Interaction trigger in front of the booth window
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 3));
        trigger.visible = false;
        trigger.position.set(12, 2, 0.8);
        this.scene.add(trigger);
        this.objects.push(trigger);
        this.ticketTrigger = trigger;
    }

    createSky() {
        // Starry night sky
        this.scene.background = new THREE.Color(COLORS.dark);
        this.scene.fog = new THREE.Fog(COLORS.dark, 60, 150);

        // Stars - slightly more and bigger than before for visual richness
        const starGeo = new THREE.BufferGeometry();
        const starCount = 700;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 220;
            positions[i * 3 + 1] = Math.random() * 60 + 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 220;

            const tint = Math.random();
            if (tint < 0.1) {
                // Cyan tint
                colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1;
            } else if (tint < 0.2) {
                // Pink tint
                colors[i * 3] = 1; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 0.85;
            } else {
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            }
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const starMat = new THREE.PointsMaterial({
            size: 0.45,
            vertexColors: true,
            transparent: true,
            opacity: 0.95
        });
        const stars = new THREE.Points(starGeo, starMat);
        this.scene.add(stars);
        this.objects.push(stars);

        // Moon - larger and brighter than before
        const moonGeo = new THREE.SphereGeometry(3.5, 32, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xf0f0ff });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(35, 50, -80);
        this.scene.add(moon);
        this.objects.push(moon);

        // Inner moon glow - soft blue-white
        const innerHaloGeo = new THREE.SphereGeometry(5.5, 32, 32);
        const innerHaloMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.15
        });
        const innerHalo = new THREE.Mesh(innerHaloGeo, innerHaloMat);
        innerHalo.position.set(35, 50, -80);
        this.scene.add(innerHalo);
        this.objects.push(innerHalo);

        // Outer moon halo - very diffuse blue ring
        const outerHaloGeo = new THREE.SphereGeometry(10, 32, 32);
        const outerHaloMat = new THREE.MeshBasicMaterial({
            color: 0x4466aa,
            transparent: true,
            opacity: 0.06
        });
        const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
        outerHalo.position.set(35, 50, -80);
        this.scene.add(outerHalo);
        this.objects.push(outerHalo);
    }

    createStreet() {
        // Dark asphalt
        const streetGeo = new THREE.PlaneGeometry(100, 40);
        const streetMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a25,
            roughness: 0.7,
            metalness: 0.2
        });
        const street = new THREE.Mesh(streetGeo, streetMat);
        street.rotation.x = -Math.PI / 2;
        street.position.set(0, -0.1, 25);
        street.receiveShadow = true;
        this.scene.add(street);
        this.objects.push(street);

        // Lane markings - subtle cyan glow (tertiary - directional)
        const lineGeo = new THREE.PlaneGeometry(8, 0.25);
        const lineMat = new THREE.MeshBasicMaterial({
            color: COLORS.tertiary,
            transparent: true,
            opacity: 0.6
        });

        for (let x = -40; x < 40; x += 14) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.01, 25);
            this.scene.add(line);
            this.objects.push(line);
        }
    }

    createSidewalk() {
        // Dark sidewalk — extended to z=-9 so it meets the building facade
        const walkGeo = new THREE.PlaneGeometry(100, 16.5);
        const walkMat = new THREE.MeshStandardMaterial({
            color: 0x1e1c2e,
            roughness: 0.75,
            metalness: 0.1
        });
        const sidewalk = new THREE.Mesh(walkGeo, walkMat);
        sidewalk.rotation.x = -Math.PI / 2;
        sidewalk.position.set(0, 0, -0.75);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);
        this.objects.push(sidewalk);

        // Invisible ground colliders so the player can fall off the edges
        // Sidewalk slab (z: -9 to 7.5) — covers up to the building facade front
        const sidewalkCollider = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 16.5));
        sidewalkCollider.position.set(0, -0.1, -0.75);
        sidewalkCollider.visible = false;
        this.scene.add(sidewalkCollider);
        this.objects.push(sidewalkCollider);
        Collision.addCollider(sidewalkCollider);

        // Street slab (z: 5 to 45)
        const streetCollider = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 40));
        streetCollider.position.set(0, -0.2, 25);
        streetCollider.visible = false;
        this.scene.add(streetCollider);
        this.objects.push(streetCollider);
        Collision.addCollider(streetCollider);

        // Curb strip - cyan (tertiary - floor lighting)
        const curbGeo = new THREE.BoxGeometry(100, 0.25, 0.4);
        const curbMat = new THREE.MeshStandardMaterial({
            color: COLORS.tertiary,
            emissive: COLORS.tertiary,
            emissiveIntensity: 0.4
        });
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(0, 0.12, 5);
        this.scene.add(curb);
        this.objects.push(curb);
    }

    createTheaterBuilding() {
        // Main facade - DEEP BLUE (primary - architecture)
        const facadeGeo = new THREE.BoxGeometry(40, 22, 2);
        const facadeMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.5,
            metalness: 0.25
        });
        const facade = new THREE.Mesh(facadeGeo, facadeMat);
        facade.position.set(0, 11, -10);
        facade.castShadow = true;
        facade.receiveShadow = true;
        this.scene.add(facade);
        this.objects.push(facade);
        Collision.addCollider(facade);

        // Architectural columns - deep blue with subtle magenta LED strips
        const columnGeo = new THREE.CylinderGeometry(0.9, 0.9, 18, 16);
        const columnMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.35,
            metalness: 0.4
        });

        for (const x of [-15, -5, 5, 15]) {
            const column = new THREE.Mesh(columnGeo, columnMat);
            column.position.set(x, 9, -8.5);
            column.castShadow = true;
            this.scene.add(column);
            this.objects.push(column);
            Collision.addCollider(column);

            // LED edge on column - magenta (secondary - LED edges)
            const ledGeo = new THREE.BoxGeometry(0.08, 16, 0.08);
            const ledMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(x + 0.85, 8, -8.5);
            this.scene.add(led);
            this.objects.push(led);
        }

        // Awning - dark with magenta neon edge
        const awningGeo = new THREE.BoxGeometry(16, 0.5, 6);
        const awningMat = new THREE.MeshStandardMaterial({
            color: 0x16143a,
            roughness: 0.5
        });
        const awning = new THREE.Mesh(awningGeo, awningMat);
        awning.position.set(0, 13, -6);
        awning.castShadow = true;
        this.scene.add(awning);
        this.objects.push(awning);

        // Awning edge - magenta (secondary - branding)
        const trimGeo = new THREE.BoxGeometry(16.5, 0.12, 0.12);
        const trimMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(0, 12.8, -3);
        this.scene.add(trim);
        this.objects.push(trim);
    }

    createMarquee() {
        // Marquee box - deep blue (primary)
        const marqueeGeo = new THREE.BoxGeometry(30, 6, 1.5);
        const marqueeMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.35,
            metalness: 0.35
        });
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.set(0, 17, -8);
        this.scene.add(marquee);
        this.objects.push(marquee);

        // Main title - MAGENTA (secondary - branding/signage)
        const textCanvas = this.createTextCanvas("KAI'S CINEMA", 512, 128, COLORS.secondary);
        const textTex = new THREE.CanvasTexture(textCanvas);
        const textMat = new THREE.MeshBasicMaterial({
            map: textTex,
            transparent: true
        });
        const textGeo = new THREE.PlaneGeometry(24, 4);
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(0, 17, -7.2);
        this.scene.add(textMesh);
        this.objects.push(textMesh);

        // Marquee border lights - subtle cyan
        const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8);

        // Top and bottom rows - cyan for elegant directional framing
        for (let i = 0, x = -14; x <= 14; x += 1.4, i++) {
            const bulb = this.createMarqueeBulb(bulbGeo, x, 19.8, -7.2, COLORS.tertiary);
            this.marqueeLights.push(bulb);
        }

        for (let i = 0, x = -14; x <= 14; x += 1.4, i++) {
            const bulb = this.createMarqueeBulb(bulbGeo, x, 14.2, -7.2, COLORS.tertiary);
            this.marqueeLights.push(bulb);
        }

        // Side columns - alternating cyan/magenta
        for (let i = 0, y = 14.5; y <= 19.5; y += 1.4, i++) {
            const color = i % 2 === 0 ? COLORS.tertiary : COLORS.secondary;
            const bulbL = this.createMarqueeBulb(bulbGeo, -14.5, y, -7.2, color);
            const bulbR = this.createMarqueeBulb(bulbGeo, 14.5, y, -7.2, color);
            this.marqueeLights.push(bulbL, bulbR);
        }

        // "NOW SHOWING" - mint (pop color, special highlight)
        const subCanvas = this.createTextCanvas("NOW SHOWING", 256, 48, COLORS.pop, 24);
        const subTex = new THREE.CanvasTexture(subCanvas);
        const subMat = new THREE.MeshBasicMaterial({
            map: subTex,
            transparent: true
        });
        const subGeo = new THREE.PlaneGeometry(10, 1.5);
        const subMesh = new THREE.Mesh(subGeo, subMat);
        subMesh.position.set(0, 14.5, -7.1);
        this.scene.add(subMesh);
        this.objects.push(subMesh);
    }

    createMarqueeBulb(geo, x, y, z, color) {
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const bulb = new THREE.Mesh(geo, mat);
        bulb.position.set(x, y, z);
        this.scene.add(bulb);
        this.objects.push(bulb);
        return { mesh: bulb, baseColor: color, phase: Math.random() * Math.PI * 2 };
    }

    createTextCanvas(text, width, height, color, fontSize = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, width, height);

        ctx.font = `bold ${fontSize}px "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cssColor = '#' + color.toString(16).padStart(6, '0');

        // Neon glow effect
        ctx.shadowColor = cssColor;
        ctx.shadowBlur = 25;
        ctx.fillStyle = cssColor;
        ctx.fillText(text, width / 2, height / 2);

        ctx.shadowBlur = 12;
        ctx.fillText(text, width / 2, height / 2);

        return canvas;
    }

    createTicketBooth() {
        const boothMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.45
        });

        // Booth walls — 8 panels leaving a 2.5 × 2.8 open gap in the front face
        // Booth bounds: X 10→14, Y 0→5, Z −3.5→−0.5. Opening: X 10.75→13.25, Y 1.0→3.8
        const panels = [
            { geo: [4,    5,   0.2], pos: [12,      2.5,  -3.4] },  // back wall
            { geo: [0.2,  5,   3  ], pos: [10.1,    2.5,  -2  ] },  // left wall
            { geo: [0.2,  5,   3  ], pos: [13.9,    2.5,  -2  ] },  // right wall
            { geo: [3.6,  0.2, 2.8], pos: [12,      4.9,  -1.9] },  // ceiling
            { geo: [0.75, 5,   0.2], pos: [10.375,  2.5,  -0.5] },  // front left pillar
            { geo: [0.75, 5,   0.2], pos: [13.625,  2.5,  -0.5] },  // front right pillar
            { geo: [2.5,  1.0, 0.2], pos: [12,      0.5,  -0.5] },  // front bottom sill
            { geo: [2.5,  1.2, 0.2], pos: [12,      4.4,  -0.5] },  // front top header
        ];
        panels.forEach(({ geo, pos }) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...geo), boothMat);
            mesh.position.set(...pos);
            mesh.castShadow = true;
            this.scene.add(mesh);
            this.objects.push(mesh);
            Collision.addCollider(mesh);
        });

        // Counter shelf at the base of the opening
        const counter = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.6), boothMat);
        counter.position.set(12, 1.0, -0.2);
        this.scene.add(counter);
        this.objects.push(counter);

        // Neon frame - magenta (secondary - ticket kiosk highlight)
        const framePositions = [
            { geo: [4.2, 0.08, 0.08], pos: [12, 5, -0.5] },
            { geo: [4.2, 0.08, 0.08], pos: [12, 0, -0.5] },
            { geo: [0.08, 5, 0.08], pos: [10, 2.5, -0.5] },
            { geo: [0.08, 5, 0.08], pos: [14, 2.5, -0.5] }
        ];
        framePositions.forEach(f => {
            const frameGeo = new THREE.BoxGeometry(...f.geo);
            const frameMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.set(...f.pos);
            this.scene.add(frame);
            this.objects.push(frame);
        });

        // "TICKETS" sign - magenta (secondary - signage)
        const signCanvas = this.createTextCanvas("TICKETS", 128, 32, COLORS.secondary, 20);
        const signTex = new THREE.CanvasTexture(signCanvas);
        const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
        const signGeo = new THREE.PlaneGeometry(2.5, 0.6);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(12, 5.3, -0.4);
        this.scene.add(sign);
        this.objects.push(sign);

        // Booth interior light — warm white so NPC is clearly visible
        const boothLight = new THREE.PointLight(0xfff5e0, 6, 8);
        boothLight.position.set(12, 3.5, -1.5);
        this.scene.add(boothLight);
        this.lights.push(boothLight);
    }

    createStreetLamps() {
        const lampPositions = [[-22, -3], [22, -3], [-38, 10], [38, 10]];

        for (const [x, z] of lampPositions) {
            this.createStreetLamp(x, z);
        }
    }

    createStreetLamp(x, z) {
        // Dark pole
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 8, 8);
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0x080818,
            roughness: 0.3,
            metalness: 0.7
        });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 4, z);
        this.scene.add(pole);
        this.objects.push(pole);

        // Lamp head - cyan (tertiary - lighting/directional)
        const lampGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const lampMat = new THREE.MeshBasicMaterial({ color: COLORS.tertiary });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(x, 8.3, z);
        this.scene.add(lamp);
        this.objects.push(lamp);

        // Light - cyan
        const light = new THREE.PointLight(COLORS.tertiary, 5, 18);
        light.position.set(x, 8, z);
        light.castShadow = true;
        this.scene.add(light);
        this.lights.push(light);
    }

    createEntranceDoors() {
        // Door frame - deep blue (primary)
        const frameGeo = new THREE.BoxGeometry(6, 8.5, 0.5);
        const frameMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.4
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 4.25, -8.5);
        this.scene.add(frame);
        this.objects.push(frame);

        // Glass doors with subtle cyan tint (tertiary)
        const glassGeo = new THREE.PlaneGeometry(4.5, 7.5);
        const glassMat = new THREE.MeshStandardMaterial({
            color: COLORS.tertiary,
            transparent: true,
            opacity: 0.2,
            roughness: 0.1,
            metalness: 0.9
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 4, -8.3);
        this.scene.add(glass);
        this.objects.push(glass);

        // Neon door frame - magenta (secondary - LED edges)
        const neonFramePositions = [
            { geo: [5.2, 0.1, 0.1], pos: [0, 7.8, -8.2] }, // top
            { geo: [5.2, 0.1, 0.1], pos: [0, 0.2, -8.2] }, // bottom
            { geo: [0.1, 7.6, 0.1], pos: [-2.6, 4, -8.2] }, // left
            { geo: [0.1, 7.6, 0.1], pos: [2.6, 4, -8.2] }  // right
        ];

        neonFramePositions.forEach(f => {
            const geo = new THREE.BoxGeometry(...f.geo);
            const mat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...f.pos);
            this.scene.add(mesh);
            this.objects.push(mesh);
        });

        // Door handles - mint (pop - special highlight)
        const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
        const handleMat = new THREE.MeshBasicMaterial({ color: COLORS.pop });

        const handleL = new THREE.Mesh(handleGeo, handleMat);
        handleL.rotation.x = Math.PI / 2;
        handleL.position.set(-1.4, 4, -8.1);
        this.scene.add(handleL);
        this.objects.push(handleL);

        const handleR = new THREE.Mesh(handleGeo, handleMat);
        handleR.rotation.x = Math.PI / 2;
        handleR.position.set(1.4, 4, -8.1);
        this.scene.add(handleR);
        this.objects.push(handleR);

        // Entry trigger zone
        const triggerGeo = new THREE.BoxGeometry(5, 4, 2);
        const trigger = new THREE.Mesh(triggerGeo);
        trigger.visible = false;
        trigger.position.set(0, 2, -8);
        this.scene.add(trigger);
        this.objects.push(trigger);
        this.doorTrigger = trigger;
    }

    createNeonDecorations() {
        // Base strip along building - cyan (tertiary - floor lighting)
        const stripGeo = new THREE.BoxGeometry(40, 0.08, 0.08);
        const stripMat = new THREE.MeshBasicMaterial({ color: COLORS.tertiary });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(0, 0.4, -9);
        this.scene.add(strip);
        this.objects.push(strip);

        // Vertical neon accents on building edges - magenta
        [-19.5, 19.5].forEach(x => {
            const vertGeo = new THREE.BoxGeometry(0.08, 20, 0.08);
            const vertMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
            const vert = new THREE.Mesh(vertGeo, vertMat);
            vert.position.set(x, 10, -9);
            this.scene.add(vert);
            this.objects.push(vert);
        });

        // Decorative arrow pointing to entrance - cyan (directional)
        const arrowGeo = new THREE.ConeGeometry(0.5, 1.2, 3);
        const arrowMat = new THREE.MeshBasicMaterial({ color: COLORS.tertiary });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.set(0, 0.3, -3);
        this.scene.add(arrow);
        this.objects.push(arrow);
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

    createDumpster() {
        const W = 3.8, H = 2.5, D = 2.4, wheelR = 0.38;
        const bodyBottomY = wheelR + 0.12;
        const bodyCenterY = bodyBottomY + H / 2;
        const bodyTopY    = bodyBottomY + H;
        const lip = 0.13;

        const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x2aa84a, roughness: 0.5, metalness: 0.5 });
        const lidMat   = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.65, metalness: 0.3 });
        const ribMat   = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.9 });
        const darkMat  = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1.0 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.9 });
        const hubMat   = new THREE.MeshStandardMaterial({ color: 0x282828, roughness: 0.5, metalness: 0.7 });

        const group = new THREE.Group();

        // ── Main body ──────────────────────────────────────────────────
        const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bodyMat);
        body.position.y = bodyCenterY;
        body.castShadow = true;
        group.add(body);

        // ── Two horizontal reinforcement rails on front face ───────────
        [0.55, 1.05].forEach(y => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.13, 0.09), bodyMat);
            rail.position.set(0, y, D / 2 + 0.04);
            group.add(rail);
        });

        // ── Top lip/rim ────────────────────────────────────────────────
        [
            { g: [W + 0.18, lip, lip], p: [0,       bodyTopY,  D / 2] },
            { g: [W + 0.18, lip, lip], p: [0,       bodyTopY, -D / 2] },
            { g: [lip, lip, D],        p: [ W / 2,  bodyTopY,  0    ] },
            { g: [lip, lip, D],        p: [-W / 2,  bodyTopY,  0    ] },
        ].forEach(({ g, p }) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(...g), bodyMat);
            m.position.set(...p);
            group.add(m);
        });

        // ── Fork pocket brackets (sides, mid-height) ───────────────────
        [-W / 2, W / 2].forEach(x => {
            const s = Math.sign(x);
            // Outer bracket arm
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 1.3), bodyMat);
            arm.position.set(x + s * 0.14, 1.3, 0);
            group.add(arm);
            // Dark pocket opening face
            const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 1.05), darkMat);
            pocket.position.set(x + s * 0.23, 1.3, 0);
            group.add(pocket);
        });

        // ── Two-panel lid, hinged at back top edge ─────────────────────
        this.dumpsterLidHinge = new THREE.Group();
        const lidHinge = this.dumpsterLidHinge;
        lidHinge.position.set(0, bodyTopY + lip, -D / 2);

        const panelW = W / 2 - 0.06;
        const panelD = D - 0.04;

        [-1, 1].forEach(side => {
            const cx = side * (panelW / 2 + 0.03);

            const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.13, panelD), lidMat);
            panel.position.set(cx, 0, panelD / 2);
            lidHinge.add(panel);

            // Ribs running front-to-back on each half
            for (let i = -2; i <= 2; i++) {
                const rib = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, panelD - 0.1), ribMat);
                rib.position.set(cx + i * (panelW / 5), 0.1, panelD / 2);
                lidHinge.add(rib);
            }
        });

        // Center split gap
        const gap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, panelD), darkMat);
        gap.position.set(0, 0, panelD / 2);
        lidHinge.add(gap);

        // Swing open ~100°
        lidHinge.rotation.x = -Math.PI * 0.56;
        this.dumpsterLidRestX = -Math.PI * 0.56;
        group.add(lidHinge);

        // ── Four large caster wheels ───────────────────────────────────
        const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.22, 20);
        const hubGeo   = new THREE.CylinderGeometry(0.13, 0.13, 0.26, 12);

        [
            [-W / 2 + 0.35,  D / 2 - 0.38],
            [ W / 2 - 0.35,  D / 2 - 0.38],
            [-W / 2 + 0.35, -D / 2 + 0.38],
            [ W / 2 - 0.35, -D / 2 + 0.38],
        ].forEach(([xw, zw]) => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(xw, wheelR, zw);
            group.add(wheel);

            const hub = new THREE.Mesh(hubGeo, hubMat);
            hub.rotation.z = Math.PI / 2;
            hub.position.set(xw, wheelR, zw);
            group.add(hub);
        });

        group.position.set(-14, 0, -4);
        this.scene.add(group);
        this.objects.push(group);

        // Invisible collision box
        const collider = new THREE.Mesh(new THREE.BoxGeometry(W + 0.56, H + 0.2, D + 0.3));
        collider.position.set(-14, bodyCenterY, -4);
        collider.visible = false;
        this.scene.add(collider);
        this.objects.push(collider);
        Collision.addCollider(collider);

        // Interaction trigger (larger than collider so player can get close)
        const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(W + 2.5, H + 1, D + 2.5));
        triggerMesh.position.set(-14, bodyCenterY, -4);
        triggerMesh.visible = false;
        this.scene.add(triggerMesh);
        this.objects.push(triggerMesh);
        this.dumpsterTrigger = triggerMesh;
    }
    setupLighting() {
        // Strong white ambient - same fix as lobby/theater, ensures surfaces are visible
        const ambient = new THREE.AmbientLight(0xffffff, 2.0);
        this.scene.add(ambient);
        this.lights.push(ambient);

        // Hemisphere - deep night blue from sky, subtle warm ground bounce
        const hemiLight = new THREE.HemisphereLight(0x1a2a6c, 0x331100, 1.2);
        this.scene.add(hemiLight);
        this.lights.push(hemiLight);

        // Moon directional light - cool blue-white, casts moonlit shadows
        const moonLight = new THREE.DirectionalLight(0xaabbff, 2.0);
        moonLight.position.set(35, 50, -80);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 1;
        moonLight.shadow.camera.far = 200;
        moonLight.shadow.camera.left = -60;
        moonLight.shadow.camera.right = 60;
        moonLight.shadow.camera.top = 60;
        moonLight.shadow.camera.bottom = -60;
        this.scene.add(moonLight);
        this.lights.push(moonLight);

        // Overhead fill lights along the sidewalk - illuminate the player's path
        [-20, 0, 20].forEach(x => {
            const fill = new THREE.PointLight(0xaabbff, 3, 28);
            fill.position.set(x, 14, 4);
            this.scene.add(fill);
            this.lights.push(fill);
        });

        // Main facade spotlight - magenta wash on the building front
        const facadeSpot = new THREE.SpotLight(COLORS.secondary, 8, 45, Math.PI / 5, 0.5, 1);
        facadeSpot.position.set(0, 22, 12);
        facadeSpot.target.position.set(0, 12, -10);
        this.scene.add(facadeSpot);
        this.scene.add(facadeSpot.target);
        this.lights.push(facadeSpot);

        // Marquee glow - magenta
        const marqueeGlow = new THREE.PointLight(COLORS.secondary, 8, 22);
        marqueeGlow.position.set(0, 17, -4);
        this.scene.add(marqueeGlow);
        this.lights.push(marqueeGlow);

        // Ground floor neon wash - cyan either side of entrance
        const groundCyanL = new THREE.PointLight(COLORS.tertiary, 3, 15);
        groundCyanL.position.set(-10, 1, -4);
        this.scene.add(groundCyanL);
        this.lights.push(groundCyanL);

        const groundCyanR = new THREE.PointLight(COLORS.tertiary, 3, 15);
        groundCyanR.position.set(10, 1, -4);
        this.scene.add(groundCyanR);
        this.lights.push(groundCyanR);

        // Entrance accent - mint pop
        const entranceGlow = new THREE.PointLight(COLORS.pop, 2, 8);
        entranceGlow.position.set(0, 5, -7);
        this.scene.add(entranceGlow);
        this.lights.push(entranceGlow);
    }

    setupDoorTrigger(callback) {
        if (this.doorTrigger) {
            Collision.addTrigger(this.doorTrigger, callback, 'entrance');
        }
    }

    setupDumpsterTrigger(callback) {
        if (this.dumpsterTrigger) {
            Collision.addTrigger(this.dumpsterTrigger, callback, 'dumpster');
        }
    }

    setupTicketTrigger(callback) {
        if (this.ticketTrigger) {
            Collision.addTrigger(this.ticketTrigger, callback, 'ticket-npc');
        }
    }

    update(dt) {
        this.time += dt;
        if (this.npcMixer) this.npcMixer.update(dt);

        // Subtle marquee light chase animation
        for (let i = 0; i < this.marqueeLights.length; i++) {
            const bulb = this.marqueeLights[i];
            const wave = Math.sin(this.time * 3 + i * 0.3);
            const brightness = 0.5 + wave * 0.5;

            const color = new THREE.Color(bulb.baseColor);
            color.multiplyScalar(brightness);
            bulb.mesh.material.color.copy(color);
        }
    }

    getSpawnPoint() {
        return new THREE.Vector3(0, 1, 12);
    }

    dispose() {
        if (this.npcMixer) { this.npcMixer.stopAllAction(); this.npcMixer = null; }

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
        this.marqueeLights = [];
    }
}
