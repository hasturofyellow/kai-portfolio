import * as THREE from 'three';
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
    // Backgrounds and surfaces
    dark: 0x020210,
    darkSurface: 0x040420,
    darkPanel: 0x050530,
    white: 0xffffff
};

export class LobbyScene {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];
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
        this.buildConcessionStand();
        this.buildTicketCounter();
        this.buildLoungeArea();
        this.buildArcadeCorner();
        this.buildHallways();
        this.buildMainTheaterDoors();
        this.buildFloorAccents();
    }

    setupLighting() {
        // Bright blue-white ambient - lobby is more open than the theater, keep it bright
        const ambient = new THREE.AmbientLight(0x8899ff, 1.8);
        this.scene.add(ambient);
        this.lights.push(ambient);

        // Hemisphere - bright blue from above, subtle warm ground bounce
        const hemiLight = new THREE.HemisphereLight(0x4488ff, 0x221100, 1.2);
        this.scene.add(hemiLight);
        this.lights.push(hemiLight);

        // Central chandelier light
        const chandelierLight = new THREE.PointLight(0xffeeff, 15, 55);
        chandelierLight.position.set(0, 14, 0);
        chandelierLight.castShadow = true;
        this.scene.add(chandelierLight);
        this.lights.push(chandelierLight);

        // Chandelier secondary fill - lower position reaches the floor better
        const chandelierFill = new THREE.PointLight(0xffeeff, 8, 30);
        chandelierFill.position.set(0, 5, 0);
        this.scene.add(chandelierFill);
        this.lights.push(chandelierFill);

        // Magenta accent wash from chandelier
        const chandelierMagenta = new THREE.PointLight(COLORS.secondary, 5, 40);
        chandelierMagenta.position.set(0, 16, 0);
        this.scene.add(chandelierMagenta);
        this.lights.push(chandelierMagenta);

        // Quadrant overhead fill lights - lowered from y=12 to y=7 for better floor coverage
        [
            { x: -18, z: -12 }, { x: 18, z: -12 },
            { x: -18, z:  12 }, { x: 18, z:  12 }
        ].forEach(pos => {
            const fill = new THREE.PointLight(0xffeeff, 8, 35);
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
            const light = new THREE.PointLight(COLORS.tertiary, 4, 25);
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
            color: 0x2e2c52,
            roughness: 0.12,
            metalness: 0.8,
            emissive: 0x0c0a38,
            emissiveIntensity: 0.3
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
            color: 0x0d0d28,
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
        // Deep blue columns (primary - architecture)
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

            // Magenta LED strip on column (secondary - LED edges)
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
            new THREE.CylinderGeometry(0.5, 0.85, 3.5, 8),
            baseMat
        );
        pedestal.position.set(0, 2.35, 0);
        this.scene.add(pedestal);
        this.objects.push(pedestal);

        // Eye orb - canvas-textured eye that tracks the player
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(0, 5.2, 0);

        // Sclera - off-white sphere (the white of the eye)
        const sclera = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xf0f4ff,
                roughness: 0.25,
                metalness: 0.0,
                emissive: 0x080818,
                emissiveIntensity: 0.2
            })
        );
        eyeGroup.add(sclera);

        // Build eye canvas - iris + pupil + details all on one surface (no z-fighting)
        const eyeCanvas = document.createElement('canvas');
        eyeCanvas.width = 512;
        eyeCanvas.height = 512;
        this.eyeCanvas = eyeCanvas;
        this.eyeCtx = eyeCanvas.getContext('2d');
        this._drawEyeTexture(78);

        const eyeTex = new THREE.CanvasTexture(eyeCanvas);
        this.eyeTexture = eyeTex;

        // Single disc flush with sclera surface - polygonOffset prevents z-fighting
        const eyeFace = new THREE.Mesh(
            new THREE.CircleGeometry(1.08, 64),
            new THREE.MeshBasicMaterial({
                map: eyeTex,
                transparent: true,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            })
        );
        eyeFace.position.z = 1.09;
        eyeGroup.add(eyeFace);

        this.scene.add(eyeGroup);
        this.objects.push(eyeGroup);
        this.eyeGroup = eyeGroup;

        // Eye glow light
        const orbLight = new THREE.PointLight(COLORS.pop, 4, 12);
        orbLight.position.set(0, 5.2, 0);
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

    buildConcessionStand() {
        // Counter - deep blue (primary)
        const counterMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.4,
            metalness: 0.35
        });

        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(12, 4, 3),
            counterMat
        );
        counter.position.set(-20, 2, 12);
        this.scene.add(counter);
        this.objects.push(counter);
        Collision.addCollider(counter);

        // Magenta LED edge (secondary)
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(12.2, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        edge.position.set(-20, 4, 10.5);
        this.scene.add(edge);
        this.objects.push(edge);

        // Display case with cyan glow (tertiary - interactive)
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
        display.position.set(-20, 5, 12);
        this.scene.add(display);
        this.objects.push(display);

        // "SNACKS" sign - mint (pop - concessions highlight)
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(5, 0.8, 0.15),
            new THREE.MeshBasicMaterial({ color: COLORS.pop })
        );
        sign.position.set(-20, 8, 13.5);
        this.scene.add(sign);
        this.objects.push(sign);

        const signLight = new THREE.PointLight(COLORS.pop, 3, 10);
        signLight.position.set(-20, 8, 12);
        this.scene.add(signLight);
        this.lights.push(signLight);
    }

    buildTicketCounter() {
        // Counter - deep blue (primary)
        const counterMat = new THREE.MeshStandardMaterial({
            color: COLORS.primary,
            roughness: 0.4,
            metalness: 0.35
        });

        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(10, 4, 3),
            counterMat
        );
        counter.position.set(20, 2, 12);
        this.scene.add(counter);
        this.objects.push(counter);
        Collision.addCollider(counter);

        // Magenta LED edge (secondary)
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(10.2, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        edge.position.set(20, 4, 10.5);
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
        ticketWindow.position.set(20, 5.5, 10.4);
        this.scene.add(ticketWindow);
        this.objects.push(ticketWindow);

        // "TICKETS" sign - magenta (secondary - signage)
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 0.8, 0.15),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        sign.position.set(20, 8, 13.5);
        this.scene.add(sign);
        this.objects.push(sign);

        const signLight = new THREE.PointLight(COLORS.secondary, 3, 10);
        signLight.position.set(20, 8, 12);
        this.scene.add(signLight);
        this.lights.push(signLight);
    }

    buildLoungeArea() {
        // Seating with magenta accents
        this.buildSofa(13, -5, Math.PI / 2);
        this.buildSofa(22, -5, -Math.PI / 2);

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

    buildSofa(x, z, rotation) {
        // Dark base
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x16143a,
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
            new THREE.BoxGeometry(4, 2, 0.5),
            baseMat
        );
        back.position.set(0, 1.8, -0.75);
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
            { x: -30, z: -15, name: 'THEATER 3', color: COLORS.secondary },
            { x: 30, z: -15, name: 'THEATER 4', color: COLORS.secondary },
            { x: -30, z: 15, name: 'AGE OF WAR', color: COLORS.pop },  // Pop for featured game
            { x: 30, z: 15, name: 'THEATER 2', color: COLORS.secondary }
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

            // Right wall — magenta
            const rightSconce = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.5, 1.4),
                new THREE.MeshBasicMaterial({ color: COLORS.secondary, transparent: true, opacity: 0.9 })
            );
            rightSconce.position.set(29.7, 3.5, z);
            this.scene.add(rightSconce);
            this.objects.push(rightSconce);
        });

        // One PointLight per side — low height means low attenuation to floor
        const leftFill = new THREE.PointLight(COLORS.tertiary, 5, 28);
        leftFill.position.set(-26, 3.5, 0);
        this.scene.add(leftFill);
        this.lights.push(leftFill);

        const rightFill = new THREE.PointLight(COLORS.secondary, 5, 28);
        rightFill.position.set(26, 3.5, 0);
        this.scene.add(rightFill);
        this.lights.push(rightFill);

        // Front and back wall sconces to cover depth
        const frontFill = new THREE.PointLight(COLORS.tertiary, 4, 25);
        frontFill.position.set(0, 3.5, 22);
        this.scene.add(frontFill);
        this.lights.push(frontFill);

        const backFill = new THREE.PointLight(COLORS.secondary, 4, 25);
        backFill.position.set(0, 3.5, -22);
        this.scene.add(backFill);
        this.lights.push(backFill);
    }

    setupEntranceTrigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 3));
        triggerBox.position.set(0, 4, 24);
        triggerBox.visible = false;
        Collision.addTrigger(triggerBox, callback, 'lobby-entrance');
    }

    setupTheater1Trigger(callback) {
        const triggerBox = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4));
        triggerBox.position.set(-27, 4, 15);
        triggerBox.visible = false;
        Collision.addTrigger(triggerBox, callback, 'theater-1-entrance');
    }

    getSpawnPoint() {
        return { x: 0, y: 1, z: 20 };
    }

    _drawEyeTexture(pupilR) {
        const ctx = this.eyeCtx;
        const cx = 256, cy = 256;
        ctx.clearRect(0, 0, 512, 512);

        // Iris - radial gradient, bright cyan centre fading to dark teal edge
        const irisGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 212);
        irisGrad.addColorStop(0,    '#00f2ff');
        irisGrad.addColorStop(0.45, '#00b8cc');
        irisGrad.addColorStop(1,    '#004455');
        ctx.beginPath();
        ctx.arc(cx, cy, 212, 0, Math.PI * 2);
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Radial fiber lines (gives iris that spoke texture)
        for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            ctx.strokeStyle = `rgba(0,20,30,0.18)`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (pupilR + 6), cy + Math.sin(a) * (pupilR + 6));
            ctx.lineTo(cx + Math.cos(a) * 208, cy + Math.sin(a) * 208);
            ctx.stroke();
        }

        // Limbal ring - dark edge where iris meets sclera
        ctx.beginPath();
        ctx.arc(cx, cy, 210, 0, Math.PI * 2);
        ctx.strokeStyle = '#001418';
        ctx.lineWidth = 18;
        ctx.stroke();

        // Pupil - solid near-black
        ctx.beginPath();
        ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
        ctx.fillStyle = '#060606';
        ctx.fill();

        // Main specular highlight (top-left)
        const hlGrad = ctx.createRadialGradient(cx + 55, cy - 58, 0, cx + 55, cy - 58, 30);
        hlGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx + 55, cy - 58, 30, 0, Math.PI * 2);
        ctx.fillStyle = hlGrad;
        ctx.fill();

        // Small secondary highlight
        ctx.beginPath();
        ctx.arc(cx + 72, cy - 38, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
    }

    update(dt, playerPos) {
        // Animate fountain
        if (this.fountainWater) {
            this.fountainWater.rotation.y += dt * 0.4;
        }

        // Eye tracks the player
        if (this.eyeGroup && playerPos) {
            const target = new THREE.Vector3(playerPos.x, playerPos.y + 1.2, playerPos.z);
            this.eyeGroup.lookAt(target);
        }

        // Pupil dilation - redraw canvas texture at slow breathing speed
        if (this.eyeTexture) {
            const t = performance.now() * 0.001;
            const pupilR = Math.round(68 + Math.sin(t * 0.7) * 18); // 50–86 px range
            if (pupilR !== this._lastPupilR) {
                this._lastPupilR = pupilR;
                this._drawEyeTexture(pupilR);
                this.eyeTexture.needsUpdate = true;
            }
        }

        // Rotate chandelier rings slowly
        if (this.chandelierRing1) this.chandelierRing1.rotation.z += dt * 0.15;
        if (this.chandelierRing2) this.chandelierRing2.rotation.z -= dt * 0.1;
        if (this.chandelierRing3) this.chandelierRing3.rotation.z += dt * 0.08;
    }

    dispose() {
        this.objects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            this.scene.remove(obj);
        });

        this.lights.forEach(light => this.scene.remove(light));

        this.objects = [];
        this.lights = [];
    }
}
