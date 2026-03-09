import * as THREE from 'three';
import { Collision } from '../collision.js';

// Neon color palette
const COLORS = {
    primary: 0x00caeb,    // Cyan
    secondary: 0xdf3f8b,  // Hot pink
    tertiary: 0x060885,   // Deep blue
    accent: 0x55fc77,     // Neon green
    dark: 0x030312,       // Near black
    white: 0xffffff
};

export class TheaterRoomScene {
    constructor(scene, gameConfig) {
        this.scene = scene;
        this.objects = [];
        this.lights = [];

        this.gameConfig = gameConfig || {
            title: 'Game',
            url: '../ageOfWar.html',
            color: COLORS.accent,
            description: 'A game'
        };
    }

    build() {
        this.setupLighting();
        this.buildFloor();
        this.buildWalls();
        this.buildWallSconces();
        this.buildCeiling();
        this.buildCeilingStarField();
        this.buildProjectionBeam();
        this.buildScreen();
        this.buildSeats();
        this.buildExitDoor();
        this.buildNeonDecorations();
    }

    setupLighting() {
        // Dark blue-violet ambient - lets colored neon lights dominate instead of flat white wash
        const ambient = new THREE.AmbientLight(0x1a1060, 1.2);
        this.scene.add(ambient);
        this.lights.push(ambient);

        // Hemisphere - dim cyan from ceiling, near-black warm from floor
        const hemi = new THREE.HemisphereLight(0x003366, 0x0a0520, 0.8);
        this.scene.add(hemi);
        this.lights.push(hemi);

        // Screen glow - main light source using game color
        const screenGlow = new THREE.PointLight(this.gameConfig.color, 10, 35);
        screenGlow.position.set(0, 8, -14);
        this.scene.add(screenGlow);
        this.lights.push(screenGlow);

        // Screen floor spill - colors the front rows and aisle in the game's theme color
        const screenSpill = new THREE.PointLight(this.gameConfig.color, 5, 30);
        screenSpill.position.set(0, 2.5, -5);
        this.scene.add(screenSpill);
        this.lights.push(screenSpill);

        // Secondary screen light - cyan
        const screenCyan = new THREE.PointLight(COLORS.primary, 4, 30);
        screenCyan.position.set(0, 10, -18);
        this.scene.add(screenCyan);
        this.lights.push(screenCyan);

        // Aisle lights - raised to y=1.5 for better floor coverage, plus flanking fills
        [0, 10, 20].forEach((z, i) => {
            const color = i % 2 === 0 ? COLORS.secondary : COLORS.primary;

            // Center uplight
            const aisleLight = new THREE.PointLight(color, 5, 28);
            aisleLight.position.set(0, 1.5, z);
            this.scene.add(aisleLight);
            this.lights.push(aisleLight);

            // Flanking fills under seat rows - very close to floor, illuminates under seats
            [-6, 6].forEach(x => {
                const fill = new THREE.PointLight(0x1a0e3a, 2, 10);
                fill.position.set(x, 0.5, z);
                this.scene.add(fill);
                this.lights.push(fill);
            });
        });

        // Ceiling wash lights - lowered to y=8 (was y=13), doubles floor illumination
        [5, 10, 15, 20].forEach((z, i) => {
            const color = i % 2 === 0 ? COLORS.primary : COLORS.secondary;
            [-8, 0, 8].forEach(x => {
                const ceiling = new THREE.PointLight(color, 7, 16);
                ceiling.position.set(x, 8, z);
                this.scene.add(ceiling);
                this.lights.push(ceiling);
            });
        });

        // Wall neon strip lights
        [-15, 0, 15].forEach(z => {
            const leftLight = new THREE.PointLight(COLORS.primary, 3, 15);
            leftLight.position.set(-13, 6, z);
            this.scene.add(leftLight);
            this.lights.push(leftLight);

            const rightLight = new THREE.PointLight(COLORS.secondary, 3, 15);
            rightLight.position.set(13, 6, z);
            this.scene.add(rightLight);
            this.lights.push(rightLight);
        });

        // Exit sign glow
        const exitLight = new THREE.PointLight(COLORS.secondary, 4, 14);
        exitLight.position.set(0, 9, 24);
        this.scene.add(exitLight);
        this.lights.push(exitLight);

        this.scene.fog = new THREE.Fog(COLORS.dark, 35, 70);
        this.scene.background = new THREE.Color(COLORS.dark);
    }

    buildFloor() {
        // Dark reflective floor
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x2a2850,
            roughness: 0.18,
            metalness: 0.75,
            emissive: 0x0a0830,
            emissiveIntensity: 0.35
        });

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 50),
            floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.objects.push(floor);

        // Neon aisle strips
        const stripMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });
        [-2, 2].forEach(x => {
            const strip = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.05, 45),
                stripMat
            );
            strip.position.set(x, 0.03, 0);
            this.scene.add(strip);
            this.objects.push(strip);
        });

        // Cross strips
        [5, 10, 15, 20].forEach(z => {
            const cross = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.05, 0.15),
                new THREE.MeshBasicMaterial({ color: COLORS.primary })
            );
            cross.position.set(0, 0.03, z);
            this.scene.add(cross);
            this.objects.push(cross);
        });
    }

    buildWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x0e0e28,
            roughness: 0.7,
            metalness: 0.2
        });

        const wallHeight = 15;

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, wallHeight, 50),
            wallMat
        );
        leftWall.position.set(-15, wallHeight / 2, 0);
        this.scene.add(leftWall);
        this.objects.push(leftWall);
        Collision.addCollider(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, wallHeight, 50),
            wallMat
        );
        rightWall.position.set(15, wallHeight / 2, 0);
        this.scene.add(rightWall);
        this.objects.push(rightWall);
        Collision.addCollider(rightWall);

        // Front wall
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(30, wallHeight, 0.5),
            wallMat
        );
        frontWall.position.set(0, wallHeight / 2, -20);
        this.scene.add(frontWall);
        this.objects.push(frontWall);
        Collision.addCollider(frontWall);

        // Back wall sections
        const backWallLeft = new THREE.Mesh(
            new THREE.BoxGeometry(11, wallHeight, 0.5),
            wallMat
        );
        backWallLeft.position.set(-9.5, wallHeight / 2, 25);
        this.scene.add(backWallLeft);
        this.objects.push(backWallLeft);
        Collision.addCollider(backWallLeft);

        const backWallRight = new THREE.Mesh(
            new THREE.BoxGeometry(11, wallHeight, 0.5),
            wallMat
        );
        backWallRight.position.set(9.5, wallHeight / 2, 25);
        this.scene.add(backWallRight);
        this.objects.push(backWallRight);
        Collision.addCollider(backWallRight);

        // Neon strips on walls
        this.addWallNeonStrips();
    }

    addWallNeonStrips() {
        // Vertical strips on side walls
        [-14.7, 14.7].forEach((x, i) => {
            const color = i === 0 ? COLORS.primary : COLORS.secondary;

            // Vertical strips
            [-15, 0, 15].forEach(z => {
                const strip = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 12, 0.1),
                    new THREE.MeshBasicMaterial({ color })
                );
                strip.position.set(x, 6, z);
                this.scene.add(strip);
                this.objects.push(strip);
            });

            // Horizontal strip
            const hStrip = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 48),
                new THREE.MeshBasicMaterial({ color })
            );
            hStrip.position.set(x, 7, 0);
            this.scene.add(hStrip);
            this.objects.push(hStrip);
        });
    }

    buildCeiling() {
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x0c0c20,
            roughness: 0.9,
            metalness: 0.0
        });

        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 50),
            ceilingMat
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 15;
        this.scene.add(ceiling);
        this.objects.push(ceiling);

        // Neon grid on ceiling
        const gridMat = new THREE.MeshBasicMaterial({
            color: COLORS.primary,
            transparent: true,
            opacity: 0.3
        });

        for (let x = -10; x <= 10; x += 5) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, 48),
                gridMat
            );
            line.position.set(x, 14.9, 0);
            this.scene.add(line);
            this.objects.push(line);
        }
    }

    buildScreen() {
        // Screen frame - dark
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x050510,
            roughness: 0.3,
            metalness: 0.4
        });

        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(22, 14, 0.5),
            frameMat
        );
        frame.position.set(0, 8, -19.5);
        this.scene.add(frame);
        this.objects.push(frame);

        // Screen surface - glowing with game color
        const screenMat = new THREE.MeshBasicMaterial({
            color: this.gameConfig.color,
            transparent: true,
            opacity: 0.8
        });

        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 12),
            screenMat
        );
        screen.position.set(0, 8, -19.2);
        this.scene.add(screen);
        this.objects.push(screen);
        this.screenMesh = screen;

        // Neon frame around screen
        this.addScreenFrame();

        // Game icon on screen
        this.buildScreenContent();

        // Screen trigger zone
        const triggerBox = new THREE.Mesh(
            new THREE.BoxGeometry(24, 12, 30)
        );
        triggerBox.position.set(0, 6, -5);
        triggerBox.visible = false;
        Collision.addTrigger(triggerBox, (event) => {
            if (event === 'enter') {
                this.onScreenApproach && this.onScreenApproach(true);
            } else {
                this.onScreenApproach && this.onScreenApproach(false);
            }
        }, 'screen-trigger');
    }

    addScreenFrame() {
        const frameMat = new THREE.MeshBasicMaterial({ color: COLORS.primary });
        const thickness = 0.2;

        // Top
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(21, thickness, thickness),
            frameMat
        );
        top.position.set(0, 14.1, -19.1);
        this.scene.add(top);
        this.objects.push(top);

        // Bottom
        const bottom = new THREE.Mesh(
            new THREE.BoxGeometry(21, thickness, thickness),
            frameMat
        );
        bottom.position.set(0, 1.9, -19.1);
        this.scene.add(bottom);
        this.objects.push(bottom);

        // Left
        const left = new THREE.Mesh(
            new THREE.BoxGeometry(thickness, 12.4, thickness),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        left.position.set(-10.5, 8, -19.1);
        this.scene.add(left);
        this.objects.push(left);

        // Right
        const right = new THREE.Mesh(
            new THREE.BoxGeometry(thickness, 12.4, thickness),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        right.position.set(10.5, 8, -19.1);
        this.scene.add(right);
        this.objects.push(right);

        // Corner accents
        [[-10.5, 14.1], [10.5, 14.1], [-10.5, 1.9], [10.5, 1.9]].forEach(([x, y]) => {
            const corner = new THREE.Mesh(
                new THREE.SphereGeometry(0.25, 8, 8),
                new THREE.MeshBasicMaterial({ color: COLORS.accent })
            );
            corner.position.set(x, y, -19);
            this.scene.add(corner);
            this.objects.push(corner);
        });
    }

    buildScreenContent() {
        // Pulsing outer ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(4, 4.3, 32),
            new THREE.MeshBasicMaterial({
                color: this.gameConfig.color,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            })
        );
        ring.position.set(0, 8, -19);
        this.scene.add(ring);
        this.objects.push(ring);
        this.glowRing = ring;

        // Inner decorative elements
        const innerRing = new THREE.Mesh(
            new THREE.RingGeometry(2, 2.2, 32),
            new THREE.MeshBasicMaterial({
                color: COLORS.primary,
                side: THREE.DoubleSide
            })
        );
        innerRing.position.set(0, 8, -19);
        this.scene.add(innerRing);
        this.objects.push(innerRing);

        // Play icon (triangle)
        const triShape = new THREE.Shape();
        triShape.moveTo(0, 1.5);
        triShape.lineTo(1.3, 0);
        triShape.lineTo(0, -1.5);
        triShape.lineTo(0, 1.5);

        const playIcon = new THREE.Mesh(
            new THREE.ShapeGeometry(triShape),
            new THREE.MeshBasicMaterial({ color: COLORS.accent })
        );
        playIcon.position.set(0.3, 8, -18.9);
        this.scene.add(playIcon);
        this.objects.push(playIcon);
    }

    buildSeats() {
        const seatMat = new THREE.MeshStandardMaterial({
            color: 0x18163a,
            roughness: 0.6,
            metalness: 0.2
        });

        // Rows of seats
        const rows = [
            { z: 5, seats: 8, spacing: 3 },
            { z: 10, seats: 10, spacing: 2.8 },
            { z: 15, seats: 10, spacing: 2.8 },
            { z: 20, seats: 8, spacing: 3 }
        ];

        rows.forEach((row, rowIndex) => {
            const totalWidth = (row.seats - 1) * row.spacing;
            const startX = -totalWidth / 2;

            for (let i = 0; i < row.seats; i++) {
                const x = startX + i * row.spacing;
                if (Math.abs(x) < 2.5) continue; // Skip aisle

                this.buildNeonSeat(x, row.z, seatMat, rowIndex);
            }
        });
    }

    buildNeonSeat(x, z, seatMat, rowIndex) {
        const group = new THREE.Group();

        // Seat
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.4, 1.8),
            seatMat
        );
        seat.position.y = 1.2;
        group.add(seat);

        // Back
        const back = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2.5, 0.4),
            seatMat
        );
        back.position.set(0, 2.2, -0.7);
        group.add(back);

        // Neon edge on seat - alternating colors per row
        const edgeColor = rowIndex % 2 === 0 ? COLORS.primary : COLORS.secondary;
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(2.1, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: edgeColor })
        );
        edge.position.set(0, 1.45, 0.9);
        group.add(edge);

        // Under-seat glow strip - emissive bar on front-bottom of seat
        const underStrip = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.04, 0.06),
            new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.85 })
        );
        underStrip.position.set(0, 0.9, 0.95);
        group.add(underStrip);

        // Soft floor glow pool in front of seat
        const glowPool = new THREE.Mesh(
            new THREE.PlaneGeometry(1.8, 0.7),
            new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.12 })
        );
        glowPool.rotation.x = -Math.PI / 2;
        glowPool.position.set(0, 0.02, 1.5);
        group.add(glowPool);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);
    }

    buildExitDoor() {
        // Neon exit frame
        const frameMat = new THREE.MeshBasicMaterial({ color: COLORS.secondary });

        // Posts
        const leftPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 10, 0.2),
            frameMat
        );
        leftPost.position.set(-4, 5, 25);
        this.scene.add(leftPost);
        this.objects.push(leftPost);

        const rightPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 10, 0.2),
            frameMat
        );
        rightPost.position.set(4, 5, 25);
        this.scene.add(rightPost);
        this.objects.push(rightPost);

        // Top beam
        const topBeam = new THREE.Mesh(
            new THREE.BoxGeometry(8.4, 0.2, 0.2),
            frameMat
        );
        topBeam.position.set(0, 10, 25);
        this.scene.add(topBeam);
        this.objects.push(topBeam);

        // EXIT sign
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.8, 0.2),
            new THREE.MeshBasicMaterial({ color: COLORS.secondary })
        );
        sign.position.set(0, 11.5, 25);
        this.scene.add(sign);
        this.objects.push(sign);

        // Exit trigger
        const triggerBox = new THREE.Mesh(
            new THREE.BoxGeometry(8, 10, 3)
        );
        triggerBox.position.set(0, 5, 26);
        triggerBox.visible = false;
        Collision.addTrigger(triggerBox, (event) => {
            if (event === 'enter') {
                this.onExitApproach && this.onExitApproach(true);
            } else {
                this.onExitApproach && this.onExitApproach(false);
            }
        }, 'exit-trigger');
    }

    buildNeonDecorations() {
        // Corner triangles
        const triShape = new THREE.Shape();
        triShape.moveTo(0, 1.5);
        triShape.lineTo(-1, 0);
        triShape.lineTo(1, 0);
        triShape.lineTo(0, 1.5);

        const triGeo = new THREE.ShapeGeometry(triShape);

        [
            { pos: [-13, 12, -18], color: COLORS.primary },
            { pos: [13, 12, -18], color: COLORS.secondary },
            { pos: [-13, 12, 22], color: COLORS.accent },
            { pos: [13, 12, 22], color: COLORS.primary }
        ].forEach(data => {
            const tri = new THREE.Mesh(
                triGeo,
                new THREE.MeshBasicMaterial({ color: data.color, side: THREE.DoubleSide })
            );
            tri.position.set(...data.pos);
            this.scene.add(tri);
            this.objects.push(tri);
        });

        // Floating rings near screen
        [-8, 8].forEach((x, i) => {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1, 0.08, 8, 32),
                new THREE.MeshBasicMaterial({
                    color: i === 0 ? COLORS.primary : COLORS.secondary
                })
            );
            ring.position.set(x, 8, -17);
            this.scene.add(ring);
            this.objects.push(ring);
        });
    }

    buildWallSconces() {
        // Decorative emissive sconce bars mounted at waist height on both side walls
        [-14.7, 14.7].forEach((x, side) => {
            const color = side === 0 ? COLORS.primary : COLORS.secondary;
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });

            [-15, -5, 5, 15].forEach(z => {
                const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.2), mat);
                sconce.position.set(x, 3.5, z);
                this.scene.add(sconce);
                this.objects.push(sconce);
            });
        });

        // One PointLight per side wall at y=3.5 - only 3.5 units above floor, very effective
        const leftFill = new THREE.PointLight(COLORS.primary, 4, 22);
        leftFill.position.set(-12, 3.5, 2);
        this.scene.add(leftFill);
        this.lights.push(leftFill);

        const rightFill = new THREE.PointLight(COLORS.secondary, 4, 22);
        rightFill.position.set(12, 3.5, 2);
        this.scene.add(rightFill);
        this.lights.push(rightFill);
    }

    buildCeilingStarField() {
        this.ceilingStars = [];
        const starColors = [0xffffff, 0x00caeb, 0xdf3f8b, 0x55fc77];
        const colorWeights = [0.45, 0.35, 0.15, 0.05];

        for (let i = 0; i < 80; i++) {
            const x = (Math.random() - 0.5) * 28;
            const z = (Math.random() - 0.5) * 48;

            // Weighted color pick
            let rand = Math.random();
            let colorIndex = 0;
            let cumulative = 0;
            for (let c = 0; c < colorWeights.length; c++) {
                cumulative += colorWeights[c];
                if (rand < cumulative) { colorIndex = c; break; }
            }

            const star = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: starColors[colorIndex],
                    transparent: true,
                    opacity: 0.4 + Math.random() * 0.6
                })
            );
            star.position.set(x, 14.85, z);
            this.scene.add(star);
            this.objects.push(star);
            this.ceilingStars.push(star);
        }
    }

    buildProjectionBeam() {
        // Semi-transparent cone from back ceiling toward the screen - no lights, pure geometry
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xd0f0ff,
            transparent: true,
            opacity: 0.04,
            side: THREE.BackSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 4.5, 42, 8, 1, true),
            beamMat
        );
        beam.position.set(0, 10.5, 1);
        beam.rotation.x = Math.PI / 2;
        this.scene.add(beam);
        this.objects.push(beam);

        // Brighter inner core
        const coreMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 1.5, 42, 6, 1, true),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.025,
                side: THREE.BackSide,
                depthWrite: false
            })
        );
        coreMesh.position.set(0, 10.5, 1);
        coreMesh.rotation.x = Math.PI / 2;
        this.scene.add(coreMesh);
        this.objects.push(coreMesh);

        // Projector housing at back ceiling
        const projector = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.6, 1.8),
            new THREE.MeshStandardMaterial({
                color: 0x111122,
                roughness: 0.5,
                metalness: 0.6,
                emissive: 0x003344,
                emissiveIntensity: 0.3
            })
        );
        projector.position.set(0, 13.5, 20);
        this.scene.add(projector);
        this.objects.push(projector);

        // Projector lens glow
        const lens = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 16),
            new THREE.MeshBasicMaterial({ color: 0xd0f0ff })
        );
        lens.position.set(0, 13.5, 19.1);
        this.scene.add(lens);
        this.objects.push(lens);
    }

    setupScreenTrigger(callback) {
        this.onScreenApproach = callback;
    }

    setupExitTrigger(callback) {
        this.onExitApproach = callback;
    }

    getSpawnPoint() {
        return { x: 0, y: 1, z: 22 };
    }

    getGameUrl() {
        return this.gameConfig.url;
    }

    update(dt) {
        // Animate glow ring
        if (this.glowRing) {
            this.glowRing.rotation.z += dt * 0.5;
            const pulse = 0.6 + Math.sin(performance.now() * 0.003) * 0.3;
            this.glowRing.material.opacity = pulse;
        }

        // Pulse screen
        if (this.screenMesh) {
            const screenPulse = 0.6 + Math.sin(performance.now() * 0.002) * 0.2;
            this.screenMesh.material.opacity = screenPulse;
        }

        // Twinkle ceiling stars
        if (this.ceilingStars) {
            const t = performance.now() * 0.001;
            this.ceilingStars.forEach((star, i) => {
                star.material.opacity = 0.3 + 0.7 * Math.abs(
                    Math.sin(t * (0.3 + (i % 7) * 0.15) + i * 1.3)
                );
            });
        }
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
