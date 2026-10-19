import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Collision } from '../collision.js';
import { CharacterRig } from '../characterRig.js';
import { disposeOwnedObjects } from '../sceneResources.js';

// Slate architecture and restrained brass/teal accents frame the program.
const COLORS = {
    primary: 0x293b48,
    secondary: 0xc8ab78,
    tertiary: 0x6ea6ad,
    pop: 0x9fcab0,
    // Backgrounds and surfaces
    dark: 0x0b1118,
    darkSurface: 0x18232c,
    darkPanel: 0x202e38,
    white: 0xffffff
};

export class LobbyScene {
    constructor(scene) {
        this.scene = scene;
        this.disposed = false;
        this.objects = [];
        this.lights = [];
        this.sofaMixer = null;
        this.npcMixer = null;
        this.ticketNpcMixer = null;
        this.sofaRig = null;
        this.npcRig = null;
        this.ticketNpcRig = null;
        this.checkInTrigger = null;
    }

    build() {
        this.setupLighting();
        this.buildFloor();
        this.buildWalls();
        this.buildWallSconces();
        this.buildCeiling();
        this.buildColumns();
        this.buildFountain();
        this.buildChandelier();
        this.buildTicketCounter();
        this.buildConcessionStand();
        this.buildCheckInNPC();
        this.buildTicketCounterNPC();
        this.buildLoungeArea();
        this.buildArcadeCorner();
        this.buildHallways();
        this.buildMainTheaterDoors();
        this.buildFloorAccents();
    }

    setupLighting() {
        // Warm-neutral light preserves readable surfaces and natural character colors.
        const ambient = new THREE.AmbientLight(0xede8dd, 1.6);
        this.scene.add(ambient);
        this.lights.push(ambient);

        // Soft daylight above, warm ground bounce below
        const hemiLight = new THREE.HemisphereLight(0xb8cad5, 0x443a30, 0.9);
        this.scene.add(hemiLight);
        this.lights.push(hemiLight);

        // Central chandelier light
        const chandelierLight = new THREE.PointLight(0xffebca, 12, 55);
        chandelierLight.position.set(0, 14, 0);
        chandelierLight.castShadow = true;
        this.scene.add(chandelierLight);
        this.lights.push(chandelierLight);

        // Chandelier secondary fill - lower position reaches the floor better
        const chandelierFill = new THREE.PointLight(0xffebca, 7, 30);
        chandelierFill.position.set(0, 5, 0);
        this.scene.add(chandelierFill);
        this.lights.push(chandelierFill);

        // Subtle brass accent wash from chandelier
        const chandelierAccent = new THREE.PointLight(COLORS.secondary, 2.5, 40);
        chandelierAccent.position.set(0, 16, 0);
        this.scene.add(chandelierAccent);
        this.lights.push(chandelierAccent);

        // Quadrant overhead fill lights - lowered from y=12 to y=7 for better floor coverage
        [
            { x: -18, z: -12 }, { x: 18, z: -12 },
            { x: -18, z:  12 }, { x: 18, z:  12 }
        ].forEach(pos => {
            const fill = new THREE.PointLight(0xe8e3d9, 7, 35);
            fill.position.set(pos.x, 7, pos.z);
            this.scene.add(fill);
            this.lights.push(fill);
        });

        // Wall accent lights
        const wallLightPositions = [
            { x: -29, z: -15 },
            { x: -29, z: 0 },
            { x: -29, z: 15 },
            { x: 29, z: -15 },
            { x: 29, z: 0 },
            { x: 29, z: 15 },
        ];

        wallLightPositions.forEach(pos => {
            const light = new THREE.PointLight(COLORS.tertiary, 2.5, 25);
            light.position.set(pos.x, 8, pos.z);
            this.scene.add(light);
            this.lights.push(light);
        });

        // Fog pushed back so the whole lobby is visible
        this.scene.fog = new THREE.Fog(COLORS.dark, 55, 110);
        this.scene.background = new THREE.Color(COLORS.dark);
    }

    buildFloor() {
        // Dark reflective floor
        const floorGeo = new THREE.PlaneGeometry(60, 50);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x29343b,
            roughness: 0.38,
            metalness: 0.35,
            emissive: 0x10171b,
            emissiveIntensity: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.objects.push(floor);

        // Cyan floor strips (tertiary - directional/wayfinding)
        this.buildFloorStrips();
    }

    buildFloorStrips() {
        // Radial lines from center - cyan for wayfinding
        const stripMat = new THREE.MeshBasicMaterial({
            color: COLORS.tertiary,
            transparent: true,
            opacity: 0.7
        });

        // Concentric rings
        [6, 12].forEach((radius, i) => {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(radius - 0.08, radius, 64),
                new THREE.MeshBasicMaterial({
                    color: COLORS.tertiary,
                    transparent: true,
                    opacity: 0.6
                })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.01;
            this.scene.add(ring);
            this.objects.push(ring);
        });

        // Direction strips leading to hallways
        const stripGeo = new THREE.BoxGeometry(0.08, 0.02, 10);

        // Leading to entrance
        const entranceStrip = new THREE.Mesh(stripGeo, stripMat);
        entranceStrip.position.set(0, 0.01, 17);
        this.scene.add(entranceStrip);
        this.objects.push(entranceStrip);

        // Leading to main theater
        const theaterStrip = new THREE.Mesh(stripGeo, stripMat);
        theaterStrip.position.set(0, 0.01, -17);
        this.scene.add(theaterStrip);
        this.objects.push(theaterStrip);
    }

    buildWalls() {
        // Deep blue walls (primary - architecture)
        const wallMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.55,
            metalness: 0.2
        });

        const wallHeight = 15;

        // Back wall with main theater opening
        this.buildWallWithOpening(0, -25, 60, 12, wallMat, 'back');
        // Front wall with entrance
        this.buildWallWithOpening(0, 25, 60, 10, wallMat, 'front');
        // Side walls
        this.buildSideWall(-30, wallHeight, wallMat);
        this.buildSideWall(30, wallHeight, wallMat);
    }

    buildWallWithOpening(x, z, width, openingWidth, wallMat, side) {
        const wallHeight = 15;
        const sideWidth = (width - openingWidth) / 2;

        // Left section
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(sideWidth, wallHeight, 0.5),
            wallMat
        );
        leftWall.position.set(-openingWidth / 2 - sideWidth / 2, wallHeight / 2, z);
        this.scene.add(leftWall);
        this.objects.push(leftWall);
        Collision.addCollider(leftWall);

        // Right section
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(sideWidth, wallHeight, 0.5),
            wallMat
        );
        rightWall.position.set(openingWidth / 2 + sideWidth / 2, wallHeight / 2, z);
        this.scene.add(rightWall);
        this.objects.push(rightWall);
        Collision.addCollider(rightWall);

        // Top section
        const topWall = new THREE.Mesh(
            new THREE.BoxGeometry(openingWidth, wallHeight - 8, 0.5),
            wallMat
        );
        topWall.position.set(0, wallHeight - (wallHeight - 8) / 2, z);
        this.scene.add(topWall);
        this.objects.push(topWall);

        // Magenta neon frame around opening (secondary - LED edges)
        this.addNeonFrame(0, 4, z + 0.3, openingWidth, 8, COLORS.secondary);
    }

    addNeonFrame(x, y, z, width, height, color) {
        const mat = new THREE.MeshBasicMaterial({ color });
        const thickness = 0.1;

        // Top
        const top = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, thickness), mat);
        top.position.set(x, y + height / 2, z);
        this.scene.add(top);
        this.objects.push(top);

        // Bottom
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, thickness), mat);
        bottom.position.set(x, y - height / 2, z);
        this.scene.add(bottom);
        this.objects.push(bottom);

        // Left
        const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, thickness), mat);
        left.position.set(x - width / 2, y, z);
        this.scene.add(left);
        this.objects.push(left);

        // Right
        const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, thickness), mat);
        right.position.set(x + width / 2, y, z);
        this.scene.add(right);
        this.objects.push(right);
    }

    buildSideWall(x, height, wallMat) {
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, height, 50),
            wallMat
        );
        wall.position.set(x, height / 2, 0);
        this.scene.add(wall);
        this.objects.push(wall);
        Collision.addCollider(wall);

        // Cyan floor strip along wall base (tertiary - wayfinding)
        const baseStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 48),
            new THREE.MeshBasicMaterial({ color: COLORS.tertiary })
        );
        baseStrip.position.set(x > 0 ? x - 0.3 : x + 0.3, 0.2, 0);
        this.scene.add(baseStrip);
        this.objects.push(baseStrip);
    }

    buildCeiling() {
        // Dark ceiling
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x17212a,
            roughness: 0.85,
            metalness: 0.1
        });

        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 50),
            ceilingMat
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 15;
        this.scene.add(ceiling);
        this.objects.push(ceiling);
    }

    buildColumns() {
        // Slate columns
        const columnMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.35,
            metalness: 0.45
        });

        const positions = [
            { x: -12, z: -10 },
            { x: 12, z: -10 },
            { x: -12, z: 10 },
            { x: 12, z: 10 }
        ];

        positions.forEach((pos) => {
            const column = new THREE.Mesh(
                new THREE.CylinderGeometry(0.9, 1.1, 14, 16),
                columnMat
            );
            column.position.set(pos.x, 7, pos.z);
            this.scene.add(column);
            this.objects.push(column);
            Collision.addCollider(column);

            // Warm LED strip on column
            const ledGeo = new THREE.BoxGeometry(0.06, 12, 0.06);
            const ledMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(pos.x + 0.95, 6, pos.z);
            this.scene.add(led);
            this.objects.push(led);
        });
    }

    buildFountain() {
        // Deep blue base (primary - architecture)
        const baseMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.35,
            metalness: 0.4
        });

        // Base pool
        const pool = new THREE.Mesh(
            new THREE.CylinderGeometry(4.5, 5, 1.2, 32),
            baseMat
        );
        pool.position.set(0, 0.6, 0);
        this.scene.add(pool);
        this.objects.push(pool);
        Collision.addCollider(pool);

        // Glowing water - cyan (tertiary - glow effect)
        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(4.2, 4.2, 0.1, 32),
            new THREE.MeshBasicMaterial({
                color: COLORS.tertiary,
                transparent: true,
                opacity: 0.5
            })
        );
        water.position.set(0, 1.15, 0);
        this.scene.add(water);
        this.objects.push(water);
        this.fountainWater = water;

        // Center pedestal
        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.85
                , 3.5, 8),
            baseMat
        );
        pedestal.position.set(0, 2.35, 0);
        this.scene.add(pedestal);
        this.objects.push(pedestal);

        // Eye orb - tracks the player
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(0, 4.5, 0);

        // Sclera (white of eye)
        const sclera = new THREE.Mesh(
            new THREE.SphereGeometry(0.75, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xddeeff,
                roughness: 0.15,
                metalness: 0.05,
                emissive: 0x112244,
                emissiveIntensity: 0.3
            })
        );
        eyeGroup.add(sclera);

        // Iris - sits just on the surface of the sclera (z = radius)
        const iris = new THREE.Mesh(
            new THREE.CircleGeometry(0.34, 48),
            new THREE.MeshBasicMaterial({ color: COLORS.pop, side: THREE.FrontSide })
        );
        iris.position.z = 0.72;
        eyeGroup.add(iris);
        this.eyeIris = iris;

        // Limbal ring - dark edge around iris
        const limbal = new THREE.Mesh(
            new THREE.RingGeometry(0.30, 0.36, 48),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide })
        );
        limbal.position.z = 0.73;
        eyeGroup.add(limbal);

        // Pupil - sits in front of iris
        const pupil = new THREE.Mesh(
            new THREE.CircleGeometry(0.16, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide })
        );
        pupil.position.z = 0.74;
        eyeGroup.add(pupil);
        this.eyePupil = pupil;

        // Specular highlight dot
        const highlight = new THREE.Mesh(
            new THREE.CircleGeometry(0.045, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide })
        );
        highlight.position.set(0.07, 0.07, 0.745);
        eyeGroup.add(highlight);

        this.scene.add(eyeGroup);
        this.objects.push(eyeGroup);
        this.eyeGroup = eyeGroup;

        // Eye glow light
        const orbLight = new THREE.PointLight(COLORS.pop, 4, 12);
        orbLight.position.set(0, 4.5, 0);
        this.scene.add(orbLight);
        this.lights.push(orbLight);

        // Pool edge glow - cyan
        const poolRing = new THREE.Mesh(
            new THREE.TorusGeometry(4.8, 0.08, 8, 64),
            new THREE.MeshBasicMaterial({ color: COLORS.tertiary })
        );
        poolRing.position.set(0, 1.2, 0);
        poolRing.rotation.x = Math.PI / 2;
        this.scene.add(poolRing);
        this.objects.push(poolRing);
    }

    buildChandelier() {
        // Central hub - dark
        const hubMat = new THREE.MeshStandardMaterial({
            color: COLORS.darkSurface,
            roughness: 0.3,
            metalness: 0.6
        });

        const hub = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 16, 16),
            hubMat
        );
        hub.position.set(0, 14, 0);
        this.scene.add(hub);
        this.objects.push(hub);

        // Elegant rings - magenta primary with cyan accent
        const ringData = [
            { radius: 2.5, y: 13.2, color: COLORS.secondary },
            { radius: 3.5, y: 12.4, color: COLORS.secondary },
            { radius: 2, y: 11.6, color: COLORS.tertiary }
        ];

        ringData.forEach((data, i) => {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(data.radius, 0.08, 8, 64),
                new THREE.MeshBasicMaterial({ color: data.color })
            );
            ring.position.set(0, data.y, 0);
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = i * 0.5;
            this.scene.add(ring);
            this.objects.push(ring);

            // Store for animation
            if (i === 0) this.chandelierRing1 = ring;
            if (i === 1) this.chandelierRing2 = ring;
            if (i === 2) this.chandelierRing3 = ring;
        });

        // Hanging crystals - magenta
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 3;
            const crystal = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.7, 6),
                new THREE.MeshBasicMaterial({ color: COLORS.secondary })
            );
            crystal.position.set(
                Math.sin(angle) * radius,
                11 - (i % 2) * 0.4,
                Math.cos(angle) * radius
            );
            crystal.rotation.x = Math.PI;
            this.scene.add(crystal);
            this.objects.push(crystal);
        }
    }

    buildTicketCounter() {
        // Counter - deep blue (primary)
        const counterMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.4,
            metalness: 0.35
        });

        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(12, 2.5, 3),
            counterMat
        );
        counter.position.set(-20, 1.25, 12);
        this.scene.add(counter);
        this.objects.push(counter);
        Collision.addCollider(counter);

        // Magenta LED edge (secondary) - sits on counter top
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(12.2, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        edge.position.set(-20, 2.5, 10.5);
        this.scene.add(edge);
        this.objects.push(edge);

        // Ticket window - magenta glow (secondary - branding)
        const windowMat = new THREE.MeshStandardMaterial({
            color: COLORS.secondary,
            emissive: COLORS.secondary,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.4
        });
        const ticketWindow = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            windowMat
        );
        ticketWindow.position.set(-20, 5.5, 10.4);
        this.scene.add(ticketWindow);
        this.objects.push(ticketWindow);

        // "TICKETS" sign - magenta (secondary - signage)
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 0.8, 0.15),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        sign.position.set(-20, 8, 13.5);
        this.scene.add(sign);
        this.objects.push(sign);

        const signLight = new THREE.PointLight(COLORS.secondary, 3, 10);
        signLight.position.set(-20, 8, 12);
        this.scene.add(signLight);
        this.lights.push(signLight);
    }

    buildConcessionStand() {
        // Counter - deep blue (primary)
        const counterMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.4,
            metalness: 0.35
        });

        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(10, 2.5, 3),
            counterMat
        );
        counter.position.set(20, 1.25, 12);
        this.scene.add(counter);
        this.objects.push(counter);
        Collision.addCollider(counter);

        // Magenta LED edge (secondary) - sits on counter top
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(10.2, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        edge.position.set(20, 2.5, 10.5);
        this.scene.add(edge);
        this.objects.push(edge);

        // Display case with cyan glow (tertiary - interactive) - sits on lowered counter top (y=2.5)
        const display = new THREE.Mesh(
            new THREE.BoxGeometry(10, 2, 2),
            new THREE.MeshStandardMaterial({
                color: COLORS.tertiary,
                emissive: COLORS.tertiary,
                emissiveIntensity: 0.15,
                transparent: true,
                opacity: 0.35
            })
        );
        display.position.set(20, 3.5, 12);
        this.scene.add(display);
        this.objects.push(display);

        // "SNACKS" sign - mint (pop - concessions highlight)
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(5, 0.8, 0.15),
            new THREE.MeshBasicMaterial({ color: COLORS.pop })
        );
        sign.position.set(20, 8, 13.5);
        this.scene.add(sign);
        this.objects.push(sign);

        const signLight = new THREE.PointLight(COLORS.pop, 3, 10);
        signLight.position.set(20, 8, 12);
        this.scene.add(signLight);
        this.lights.push(signLight);
    }

    buildCheckInNPC() {
        const loader = new FBXLoader();
        loader.load('../Animated Men Characters - Feb 2019/FBX/Smooth_Male_Casual.fbx', (fbx) => {
            if (this.disposed) {
                disposeOwnedObjects(this.scene, [fbx]);
                return;
            }
            const rig = new CharacterRig(fbx, { targetHeight: 3.2 });
            rig.model.position.set(-20, 0, -2); // left side of lobby, near the arcade corner
            rig.model.rotation.y = Math.PI / 2; // face +X toward lobby center
            rig.setState('idle');
            this.scene.add(rig.model);
            this.objects.push(rig.model);
            this.npcRig = rig;
            this.npcMixer = rig.mixer;
            Collision.addBox(
                { x: -20.55, y: 0, z: -2.55 }, { x: -19.45, y: 3.2, z: -1.45 },
                { camera: false, ground: false }
            );
        }, undefined, (err) => {
            if (!this.disposed) console.warn('Smooth_Male_Casual.fbx failed to load:', err);
        });

        // Interaction trigger zone around the clerk near the arcade
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 6));
        trigger.visible = false;
        trigger.position.set(-20, 3, -2);
        this.scene.add(trigger);
        this.objects.push(trigger);
        this.checkInTrigger = trigger;
    }

    buildTicketCounterNPC() {
        // NPC behind the real ticket counter (the one at x=-20)
        const loader = new FBXLoader();
        loader.load('../Animated Men Characters - Feb 2019/FBX/Male_Suit.fbx', (fbx) => {
            if (this.disposed) {
                disposeOwnedObjects(this.scene, [fbx]);
                return;
            }
            const rig = new CharacterRig(fbx, { targetHeight: 3.2 });
            rig.model.position.set(-20, 0, 14.5); // standing on floor, behind counter (back face z=13.5)
            rig.model.rotation.y = Math.PI; // face -Z toward approaching player
            rig.setState('idle');
            this.scene.add(rig.model);
            this.objects.push(rig.model);
            this.ticketNpcRig = rig;
            this.ticketNpcMixer = rig.mixer;
            Collision.addBox(
                { x: -20.55, y: 0, z: 13.95 }, { x: -19.45, y: 3.2, z: 15.05 },
                { camera: false, ground: false }
            );
        }, undefined, (err) => {
            if (!this.disposed) console.warn('Male_Suit.fbx (ticket NPC) failed to load:', err);
        });
    }

    buildLoungeArea() {
        // Seating with magenta accents
        this.buildSofa(13, -5, Math.PI / 2);
        this.buildSofa(22, -5, -Math.PI / 2);
        this.buildSofaNPC();

        // Coffee table with cyan glow (tertiary)
        const table = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.15, 3),
            new THREE.MeshStandardMaterial({
                color: COLORS.tertiary,
                emissive: COLORS.tertiary,
                emissiveIntensity: 0.25,
                transparent: true,
                opacity: 0.5
            })
        );
        table.position.set(18, 0.6, -5);
        this.scene.add(table);
        this.objects.push(table);

        const tableLight = new THREE.PointLight(COLORS.tertiary, 1.5, 6);
        tableLight.position.set(18, 1.2, -5);
        this.scene.add(tableLight);
        this.lights.push(tableLight);
    }

    buildSofaNPC() {
        const loader = new FBXLoader();
        loader.load('../Animated Men Characters - Feb 2019/FBX/Smooth_Male_Casual.fbx', (fbx) => {
            if (this.disposed) {
                disposeOwnedObjects(this.scene, [fbx]);
                return;
            }
            const rig = new CharacterRig(fbx, { targetHeight: 3.2 });
            rig.model.position.set(13, 0, -5);
            rig.model.rotation.y = Math.PI / 2; // face away from sofa back (+X direction)
            rig.setSeated(1.1);
            this.scene.add(rig.model);
            this.objects.push(rig.model);
            this.sofaRig = rig;
            this.sofaMixer = rig.mixer;
            Collision.addBox(
                { x: 12.45, y: 0, z: -5.55 }, { x: 14.5, y: 2.9, z: -4.45 },
                { camera: false, ground: false }
            );
        }, undefined, (err) => {
            if (!this.disposed) console.warn('Smooth_Male_Casual.fbx (seated NPC) failed to load:', err);
        });
    }

    buildSofa(x, z, rotation) {
        // Dark base
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x25323c,
            roughness: 0.5,
            metalness: 0.2
        });

        const group = new THREE.Group();

        // Seat
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.6, 2),
            baseMat
        );
        seat.position.y = 0.8;
        group.add(seat);

        // Back
        const back = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1.4, 0.5),
            baseMat
        );
        back.position.set(0, 1.5, -0.75);
        group.add(back);

        // Magenta LED edge (secondary)
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(4.1, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        edge.position.set(0, 1.1, 1);
        group.add(edge);

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        this.scene.add(group);
        this.objects.push(group);

        group.updateMatrixWorld(true);
        for (const part of [seat, back]) {
            const bounds = new THREE.Box3().setFromObject(part);
            Collision.addBox(bounds.min, bounds.max, { ground: false });
        }
    }

    buildArcadeCorner() {
        // Arcade cabinets with neon screens
        this.buildArcadeCabinet(-22, -8, 0.3, COLORS.tertiary);
        this.buildArcadeCabinet(-18, -6, -0.2, COLORS.secondary);
        this.buildArcadeCabinet(-24, -4, 0.5, COLORS.pop);

        // "ARCADE" sign - mint (pop - special zone)
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(5, 1, 0.15),
            new THREE.MeshBasicMaterial({ color: COLORS.pop })
        );
        sign.position.set(-20, 10, -8);
        this.scene.add(sign);
        this.objects.push(sign);

        const signLight = new THREE.PointLight(COLORS.pop, 4, 10);
        signLight.position.set(-20, 10, -6);
        this.scene.add(signLight);
        this.lights.push(signLight);

        // Floor marker - mint (pop - arcade zone boundary)
        const floorMarker = new THREE.Mesh(
            new THREE.RingGeometry(5, 5.15, 6),
            new THREE.MeshBasicMaterial({
                color: COLORS.pop,
                transparent: true,
                opacity: 0.4
            })
        );
        floorMarker.rotation.x = -Math.PI / 2;
        floorMarker.position.set(-20, 0.02, -6);
        this.scene.add(floorMarker);
        this.objects.push(floorMarker);
    }

    buildArcadeCabinet(x, z, rotY, screenColor) {
        const cabinetMat = new THREE.MeshStandardMaterial({
            color: COLORS.darkSurface,
            roughness: 0.5,
            metalness: 0.3
        });

        const group = new THREE.Group();

        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2, 5, 2),
            cabinetMat
        );
        body.position.y = 2.5;
        group.add(body);

        // Screen glow
        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 1.1),
            new THREE.MeshBasicMaterial({ color: screenColor })
        );
        screen.position.set(0, 3.5, 1.01);
        group.add(screen);

        // Screen light
        const screenLight = new THREE.PointLight(screenColor, 1.5, 4);
        screenLight.position.set(0, 3.5, 2);
        group.add(screenLight);

        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        this.scene.add(group);
        this.objects.push(group);
    }

    buildHallways() {
        const hallwayData = [
            { x: -30, z: -15, name: '03 / STICK SOCCER', color: 0x44ff88 },
            { x: 30, z: -15, name: '04 / SNAKE GAME', color: 0x55fc77 },
            { x: -30, z: 15, name: '01 / AGE OF WAR', color: 0xff6644 },
            { x: 30, z: 15, name: '02 / BLAST BLOCK', color: 0x44aaff }
        ];

        hallwayData.forEach(data => {
            this.buildHallwayEntrance(data.x, data.z, data.name, data.color);
        });
    }

    buildHallwayEntrance(x, z, name, color) {
        // Neon arch frame flush with side wall (wall at x=±30)
        const archMat = new THREE.MeshBasicMaterial({ color });
        // Inset slightly from wall face so arch is visible from inside lobby
        const wallFace = x < 0 ? x + 0.3 : x - 0.3;

        // Posts flank the opening along z-axis
        const postGeo = new THREE.BoxGeometry(0.15, 8, 0.15);
        const leftPost = new THREE.Mesh(postGeo, archMat);
        leftPost.position.set(wallFace, 4, z - 3);
        this.scene.add(leftPost);
        this.objects.push(leftPost);

        const rightPost = new THREE.Mesh(postGeo, archMat);
        rightPost.position.set(wallFace, 4, z + 3);
        this.scene.add(rightPost);
        this.objects.push(rightPost);

        // Top beam runs along z-axis
        const topBeam = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 6.3),
            archMat
        );
        topBeam.position.set(wallFace, 8, z);
        this.scene.add(topBeam);
        this.objects.push(topBeam);

        // Sign bar runs along z-axis
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.8, 5),
            new THREE.MeshBasicMaterial({ color })
        );
        sign.position.set(wallFace, 9.5, z);
        this.scene.add(sign);
        this.objects.push(sign);

        // Text label placard facing lobby interior
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const hexColor = '#' + color.toString(16).padStart(6, '0');
        ctx.fillStyle = '#111a21';
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = hexColor;
        ctx.font = 'bold 38px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 256, 64);
        const placardTexture = new THREE.CanvasTexture(canvas);
        const placardPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 0.8),
            new THREE.MeshBasicMaterial({ map: placardTexture, transparent: false })
        );
        // Face inward toward the lobby (rotate 90° around Y for left wall, -90° for right wall)
        placardPlane.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        const placardX = x < 0 ? wallFace + 0.1 : wallFace - 0.1;
        placardPlane.position.set(placardX, 9.5, z);
        this.scene.add(placardPlane);
        this.objects.push(placardPlane);

        // Hallway light - positioned inside lobby, away from wall
        const lightX = x < 0 ? x + 4 : x - 4;
        const light = new THREE.PointLight(color, 3, 10);
        light.position.set(lightX, 6, z);
        this.scene.add(light);
        this.lights.push(light);

        // Floor arrow pointing toward the wall (x direction)
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 0.8, 3),
            new THREE.MeshBasicMaterial({ color: COLORS.tertiary })
        );
        arrow.rotation.x = -Math.PI / 2;
        // After rotation.x, cone points +z. rotation.z ±90° pivots it into ±x.
        arrow.rotation.z = x < 0 ? -Math.PI / 2 : Math.PI / 2;
        const arrowX = x < 0 ? x + 5 : x - 5;
        arrow.position.set(arrowX, 0.15, z);
        this.scene.add(arrow);
        this.objects.push(arrow);
    }

    buildMainTheaterDoors() {
        // Grand frame - magenta (secondary - main branding)
        const frameColor = COLORS.secondary;
        const frameMat = new THREE.MeshBasicMaterial({ color: frameColor });

        // Door posts
        [-5.5, 5.5].forEach(xOff => {
            const post = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 10, 0.2),
                frameMat
            );
            post.position.set(xOff, 5, -24);
            this.scene.add(post);
            this.objects.push(post);
        });

        // Top
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(11.2, 0.2, 0.2),
            frameMat
        );
        top.position.set(0, 10, -24);
        this.scene.add(top);
        this.objects.push(top);

        // "MAIN THEATER" sign - magenta (secondary - signage)
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(9, 1.2, 0.12),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        sign.position.set(0, 12, -24);
        this.scene.add(sign);
        this.objects.push(sign);

        // Text label on the main theater sign facing the lobby (+z direction)
        const mainCanvas = document.createElement('canvas');
        mainCanvas.width = 512;
        mainCanvas.height = 128;
        const mainCtx = mainCanvas.getContext('2d');
        mainCtx.fillStyle = '#' + COLORS.secondary.toString(16).padStart(6, '0');
        mainCtx.fillRect(0, 0, 512, 128);
        mainCtx.fillStyle = '#ffffff';
        mainCtx.font = 'bold 56px Arial, sans-serif';
        mainCtx.textAlign = 'center';
        mainCtx.textBaseline = 'middle';
        mainCtx.fillText('MAIN THEATER', 256, 64);
        const mainTexture = new THREE.CanvasTexture(mainCanvas);
        const mainPlacard = new THREE.Mesh(
            new THREE.PlaneGeometry(9, 1.2),
            new THREE.MeshBasicMaterial({ map: mainTexture })
        );
        // Faces +z toward the lobby
        mainPlacard.position.set(0, 12, -23.93);
        this.scene.add(mainPlacard);
        this.objects.push(mainPlacard);

        const signLight = new THREE.PointLight(COLORS.secondary, 4, 12);
        signLight.position.set(0, 11, -22);
        this.scene.add(signLight);
        this.lights.push(signLight);

        // Doors - dark
        const doorMat = new THREE.MeshStandardMaterial({
            color: COLORS.darkSurface,
            roughness: 0.4,
            metalness: 0.4
        });

        [-3, 3].forEach(xOff => {
            const door = new THREE.Mesh(
                new THREE.BoxGeometry(4, 8, 0.4),
                doorMat
            );
            door.position.set(xOff, 4, -24);
            this.scene.add(door);
            this.objects.push(door);
        });

        // Door handles - cyan (tertiary - interactive)
        const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
        const handleMat = new THREE.MeshBasicMaterial({ color: COLORS.tertiary });

        [-1.5, 1.5].forEach(xOff => {
            const handle = new THREE.Mesh(handleGeo, handleMat);
            handle.rotation.z = Math.PI / 2;
            handle.position.set(xOff, 4, -23.7);
            this.scene.add(handle);
            this.objects.push(handle);
        });
    }

    buildFloorAccents() {
        // Subtle directional arrows at key points - cyan (tertiary)
        const arrowMat = new THREE.MeshBasicMaterial({
            color: COLORS.tertiary,
            transparent: true,
            opacity: 0.5
        });

        // Arrow toward main theater
        const mainArrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.6, 1.2, 3),
            arrowMat
        );
        mainArrow.rotation.x = -Math.PI / 2;
        mainArrow.position.set(0, 0.08, -12);
        this.scene.add(mainArrow);
        this.objects.push(mainArrow);
    }

    buildWallSconces() {
        // Decorative emissive sconce bars at waist height on both side walls
        // Same pattern as theater room — y=3.5 is only 3.5 units above floor, very effective lighting
        const positions = [-15, -5, 5, 15];

        positions.forEach(z => {
            // Left wall — cyan
            const leftSconce = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.5, 1.4),
                new THREE.MeshBasicMaterial({ color: COLORS.tertiary, transparent: true, opacity: 0.9 })
            );
            leftSconce.position.set(-29.7, 3.5, z);
            this.scene.add(leftSconce);
            this.objects.push(leftSconce);

            // Right wall — brass
            const rightSconce = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.5, 1.4),
                new THREE.MeshBasicMaterial({ color: COLORS.secondary, transparent: true, opacity: 0.9 })
            );
            rightSconce.position.set(29.7, 3.5, z);
            this.scene.add(rightSconce);
            this.objects.push(rightSconce);
        });

        // One PointLight per side — low height means low attenuation to floor
        const leftFill = new THREE.PointLight(COLORS.tertiary, 2.8, 28);
        leftFill.position.set(-26, 3.5, 0);
        this.scene.add(leftFill);
        this.lights.push(leftFill);

        const rightFill = new THREE.PointLight(COLORS.secondary, 2.8, 28);
        rightFill.position.set(26, 3.5, 0);
        this.scene.add(rightFill);
        this.lights.push(rightFill);

        // Front and back wall sconces to cover depth
        const frontFill = new THREE.PointLight(COLORS.tertiary, 2.5, 25);
        frontFill.position.set(0, 3.5, 22);
        this.scene.add(frontFill);
        this.lights.push(frontFill);

        const backFill = new THREE.PointLight(COLORS.secondary, 2.5, 25);
        backFill.position.set(0, 3.5, -22);
        this.scene.add(backFill);
        this.lights.push(backFill);
    }

    setupEntranceTrigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 3));
        triggerBox.position.set(0, 4, 24);
        triggerBox.visible = false;
        this.objects.push(triggerBox);
        Collision.addTrigger(triggerBox, callback, 'lobby-entrance');
    }

    setupTheater1Trigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4));
        triggerBox.position.set(-27, 4, 15);
        triggerBox.visible = false;
        this.objects.push(triggerBox);
        Collision.addTrigger(triggerBox, callback, 'theater-1-entrance');
    }

    setupTheater2Trigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4));
        triggerBox.position.set(27, 4, 15);
        triggerBox.visible = false;
        this.objects.push(triggerBox);
        Collision.addTrigger(triggerBox, callback, 'theater-2-entrance');
    }

    setupTheater3Trigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4));
        triggerBox.position.set(-27, 4, -15);
        triggerBox.visible = false;
        this.objects.push(triggerBox);
        Collision.addTrigger(triggerBox, callback, 'theater-3-entrance');
    }

    setupTheater4Trigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4));
        triggerBox.position.set(27, 4, -15);
        triggerBox.visible = false;
        this.objects.push(triggerBox);
        Collision.addTrigger(triggerBox, callback, 'theater-4-entrance');
    }

    setupCheckInTrigger(callback) {
        if (this.checkInTrigger) {
            Collision.addTrigger(this.checkInTrigger, callback, 'checkin-npc');
        }
    }

    setupSeatTriggers(onEnterSeat, onExitSeat) {
        const sofaPositions = [
            // The opposite sofa is occupied by the seated NPC.
            { x: 22, z: -5, seatY: 1.1, meshRot: -Math.PI / 2, camYaw: -Math.PI / 2, standX: 20.35, standZ: -5 }
        ];
        sofaPositions.forEach((seat, i) => {
            const trigger = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 3.2));
            trigger.visible = false;
            trigger.position.set(seat.standX, 1.2, seat.standZ);
            this.scene.add(trigger);
            this.objects.push(trigger);
            Collision.addTrigger(trigger, (event) => {
                if (event === 'enter') onEnterSeat(seat);
                else onExitSeat(seat);
            }, `lobby-seat-${i}`);
        });
    }

    setupArcadeTriggers(callback) {
        const cabinets = [
            { x: -22, z: -8, id: 'arcade-1' },
            { x: -18, z: -6, id: 'arcade-2' },
            { x: -24, z: -4, id: 'arcade-3' },
        ];
        cabinets.forEach((c, i) => {
            const trigger = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4));
            trigger.visible = false;
            trigger.position.set(c.x, 3, c.z);
            this.scene.add(trigger);
            this.objects.push(trigger);
            Collision.addTrigger(trigger, (event) => callback(event, i + 1), c.id);
        });
    }

    setupMoneyPickups(collectedIds, onCollect) {
        // No money pickups in the lobby
    }

    getSpawnPoint() {
        return { x: 0, y: 1, z: 20 };
    }

    update(dt, playerPos) {
        // Animate fountain
        if (this.fountainWater) {
            this.fountainWater.rotation.y += dt * 0.4;
        }

        // Eye tracks the player
        if (this.eyeGroup && playerPos) {
            // Look at player's chest height so the eye doesn't stare at the floor
            const target = new THREE.Vector3(playerPos.x, playerPos.y + 1.2, playerPos.z);
            this.eyeGroup.lookAt(target);
        }

        // Pupil dilation pulse (subtle breathing effect)
        if (this.eyePupil) {
            const t = performance.now() * 0.0015;
            const dilation = 0.88 + Math.sin(t) * 0.12;
            this.eyePupil.scale.setScalar(dilation);
        }

        // Rotate chandelier rings slowly
        if (this.chandelierRing1) this.chandelierRing1.rotation.z += dt * 0.15;
        if (this.chandelierRing2) this.chandelierRing2.rotation.z -= dt * 0.1;
        if (this.chandelierRing3) this.chandelierRing3.rotation.z += dt * 0.08;
        if (this.sofaRig) this.sofaRig.update(dt);
        if (this.npcRig) this.npcRig.update(dt);
        if (this.ticketNpcRig) this.ticketNpcRig.update(dt);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        disposeOwnedObjects(this.scene, [...this.objects, ...this.lights], [
            this.sofaMixer, this.npcMixer, this.ticketNpcMixer
        ]);
        Collision.clear();
        this.objects = [];
        this.lights = [];
        this.sofaMixer = null;
        this.npcMixer = null;
        this.ticketNpcMixer = null;
        this.sofaRig = null;
        this.npcRig = null;
        this.ticketNpcRig = null;
        this.checkInTrigger = null;
        this.fountainWater = null;
        this.eyeGroup = null;
        this.eyeIris = null;
        this.eyePupil = null;
        this.chandelierRing1 = null;
        this.chandelierRing2 = null;
        this.chandelierRing3 = null;
    }
}
