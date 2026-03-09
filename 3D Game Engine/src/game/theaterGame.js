import * as THREE from 'three';
import { Settings } from '../settings.js';
import { Input } from '../input.js';
import { Collision } from './collision.js';
import { Player } from './player.js';
import { ExteriorScene } from './locations/exterior.js';
import { LobbyScene } from './locations/lobby.js';
import { TheaterRoomScene } from './locations/theaterRoom.js';

export class TheaterGame {
    constructor() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();

        // Initialize input
        Input.init(this.renderer.domElement);

        // Store in settings
        Settings.add('renderer', this.renderer);
        Settings.add('scene', this.scene);
        Settings.add('camera', this.camera);

        // Create player
        this.player = new Player(this.scene);

        // Current location
        this.currentLocation = null;
        this.locationName = '';

        // UI
        this.setupUI();

        // Load starting location
        this.loadLocation('exterior');

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());

        // Start game loop
        this.previousTime = performance.now();
        this.run();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Color and tone mapping for cinematic look
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.4; // Brighter exposure

        document.body.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            65,  // Slightly narrower FOV for cinematic feel
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // Camera smoothing parameters
        this.cameraSmoothing = 0.08;  // Lower = smoother
        this.cameraDistance = 10;
        this.cameraHeight = 4;
        this.cameraTargetOffset = new THREE.Vector3(0, 1.5, 0);

        // Current camera position (for smoothing)
        this.cameraCurrentPos = new THREE.Vector3();
        this.cameraCurrentLookAt = new THREE.Vector3();
        this.cameraInitialized = false;
    }

    setupUI() {
        // Create UI overlay
        const ui = document.createElement('div');
        ui.id = 'game-ui';
        ui.innerHTML = `
            <style>
                #game-ui {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    z-index: 100;
                }
                #game-ui * {
                    pointer-events: auto;
                }
                #topbar {
                    position: absolute;
                    top: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 12px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                }
                #topbar h1 {
                    margin: 0 0 4px 0;
                    font-size: 18px;
                    color: #ffd700;
                }
                #topbar p {
                    margin: 0;
                    font-size: 12px;
                    opacity: 0.8;
                }
                #location {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: rgba(0,0,0,0.6);
                    color: #88ccff;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                }
                #hint {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.75);
                    color: #ffd700;
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                #hint.show {
                    opacity: 1;
                }
                #crosshair {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 12px;
                    height: 12px;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
                #crosshair::before, #crosshair::after {
                    content: '';
                    position: absolute;
                    background: rgba(255,255,255,0.6);
                }
                #crosshair::before {
                    width: 2px;
                    height: 12px;
                    left: 5px;
                }
                #crosshair::after {
                    width: 12px;
                    height: 2px;
                    top: 5px;
                }
                #click-prompt {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.85);
                    color: white;
                    padding: 30px 50px;
                    border-radius: 16px;
                    text-align: center;
                    font-size: 18px;
                }
                #click-prompt.hidden {
                    display: none;
                }
                #click-prompt span {
                    color: #ffd700;
                }
            </style>
            <div id="topbar">
                <h1>🎬 Kai's Cinema</h1>
                <p><b>WASD</b> Move • <b>Mouse</b> Look • <b>Space</b> Jump/Interact • <b>E</b> Play</p>
            </div>
            <div id="location">📍 Loading...</div>
            <div id="hint"></div>
            <div id="crosshair"></div>
            <div id="click-prompt">
                <span>Click to Start</span><br>
                <small style="opacity: 0.7">Click anywhere to capture mouse</small>
            </div>
        `;
        document.body.appendChild(ui);

        this.uiElements = {
            location: document.getElementById('location'),
            hint: document.getElementById('hint'),
            clickPrompt: document.getElementById('click-prompt')
        };

        // Hide prompt when mouse is locked
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.uiElements.clickPrompt.classList.add('hidden');
            } else {
                this.uiElements.clickPrompt.classList.remove('hidden');
            }
        });
    }

    showHint(text, duration = 3000) {
        const hint = this.uiElements.hint;
        hint.textContent = text;
        hint.classList.add('show');

        clearTimeout(this.hintTimeout);
        this.hintTimeout = setTimeout(() => {
            hint.classList.remove('show');
        }, duration);
    }

    setLocationUI(name) {
        this.uiElements.location.textContent = `📍 ${name}`;
    }

    loadLocation(name) {
        // Clear previous location
        if (this.currentLocation) {
            this.currentLocation.dispose();
            Collision.clear();
        }

        this.locationName = name;

        // Reset all interaction states
        this.nearDoor = false;
        this.nearExit = false;
        this.nearTheater1 = false;
        this.nearScreen = false;
        this.nearTheaterExit = false;

        switch (name) {
            case 'exterior':
                this.currentLocation = new ExteriorScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupDoorTrigger((event, trigger) => {
                    if (event === 'enter') {
                        this.showHint('Press SPACE to enter the theater...', 5000);
                        this.nearDoor = true;
                    } else {
                        this.nearDoor = false;
                    }
                });

                const spawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(spawn.x, spawn.y, spawn.z);
                this.player.cameraYaw = Math.PI; // Face the theater

                this.setLocationUI('Outside Theater');
                this.showHint('Walk toward the theater entrance...', 4000);
                break;

            case 'lobby':
                this.currentLocation = new LobbyScene(this.scene);
                this.currentLocation.build();

                // Setup entrance trigger (to go back outside)
                this.currentLocation.setupEntranceTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Press SPACE to exit to street...', 3000);
                        this.nearExit = true;
                    } else {
                        this.nearExit = false;
                    }
                });

                // Setup Theater 1 hallway trigger
                this.currentLocation.setupTheater1Trigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Press SPACE to enter Theater 1: Age of War', 4000);
                        this.nearTheater1 = true;
                    } else {
                        this.nearTheater1 = false;
                    }
                });

                const lobbySpawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(lobbySpawn.x, lobbySpawn.y, lobbySpawn.z);
                this.player.cameraYaw = Math.PI; // Face into lobby
                this.cameraInitialized = false; // Reset camera for new location

                this.setLocationUI('Grand Lobby');
                this.showHint('Welcome to Kai\'s Cinema! Explore the lobby...', 4000);
                break;

            case 'theater':
                // TODO: Implement main theater room
                this.showHint('Main theater coming soon!', 3000);
                break;

            case 'theater1':
                this.currentLocation = new TheaterRoomScene(this.scene, {
                    title: 'Age of War',
                    url: '../ageOfWar.html',
                    color: 0xff6644,
                    description: 'A strategy battle game'
                });
                this.currentLocation.build();

                // Setup screen trigger
                this.currentLocation.setupScreenTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Press E to play Age of War!', 5000);
                        this.nearScreen = true;
                    } else {
                        this.nearScreen = false;
                    }
                });

                // Setup exit trigger
                this.currentLocation.setupExitTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Press SPACE to return to lobby...', 3000);
                        this.nearTheaterExit = true;
                    } else {
                        this.nearTheaterExit = false;
                    }
                });

                const theater1Spawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(theater1Spawn.x, theater1Spawn.y, theater1Spawn.z);
                this.player.cameraYaw = Math.PI; // Face the screen
                this.cameraInitialized = false;

                this.setLocationUI('Theater 1: Age of War');
                this.showHint('Walk toward the screen to play!', 4000);
                break;
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCamera(dt) {
        const player = this.player;

        // Calculate ideal camera position based on player orientation
        const pitchInfluence = player.cameraPitch * 6;
        const idealDistance = this.cameraDistance;
        const idealHeight = this.cameraHeight + pitchInfluence;

        // Target position (camera BEHIND player, not in front)
        // Negate the offset so camera is opposite to where player faces
        const targetPos = new THREE.Vector3(
            player.mesh.position.x - Math.sin(player.cameraYaw) * idealDistance,
            player.mesh.position.y + idealHeight,
            player.mesh.position.z - Math.cos(player.cameraYaw) * idealDistance
        );

        // Look-at target (slightly above player)
        const targetLookAt = player.mesh.position.clone().add(this.cameraTargetOffset);

        // Initialize camera position on first frame
        if (!this.cameraInitialized) {
            this.cameraCurrentPos.copy(targetPos);
            this.cameraCurrentLookAt.copy(targetLookAt);
            this.cameraInitialized = true;
        }

        // Smooth interpolation (frame-rate independent)
        const smoothFactor = 1 - Math.pow(this.cameraSmoothing, dt * 60);

        this.cameraCurrentPos.lerp(targetPos, smoothFactor);
        this.cameraCurrentLookAt.lerp(targetLookAt, smoothFactor);

        // Apply to camera
        this.camera.position.copy(this.cameraCurrentPos);
        this.camera.lookAt(this.cameraCurrentLookAt);
    }

    update(dt) {
        // Update player
        this.player.update(dt);

        // Update current location (pass player position for interactive elements)
        if (this.currentLocation && this.currentLocation.update) {
            this.currentLocation.update(dt, this.player.getPosition());
        }

        // Update camera
        this.updateCamera(dt);

        // Check for door entry (space near door)
        if (this.nearDoor && Input.isKeyJustPressed('Space')) {
            this.loadLocation('lobby');
        }

        // Check for lobby exit (space near exit)
        if (this.nearExit && Input.isKeyJustPressed('Space')) {
            this.loadLocation('exterior');
        }

        // Check for theater 1 entry
        if (this.nearTheater1 && Input.isKeyJustPressed('Space')) {
            this.loadLocation('theater1');
        }

        // Check for screen interaction (E to play game)
        if (this.nearScreen && Input.isKeyJustPressed('KeyE')) {
            this.launchGame();
        }

        // Check for theater exit
        if (this.nearTheaterExit && Input.isKeyJustPressed('Space')) {
            this.loadLocation('lobby');
        }
    }

    launchGame() {
        if (this.currentLocation && this.currentLocation.getGameUrl) {
            const url = this.currentLocation.getGameUrl();
            // Open game in new tab
            window.open(url, '_blank');
            this.showHint('Game opened in new tab!', 2000);
        }
    }

    run = () => {
        const currentTime = performance.now();
        Settings.dt = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;

        const dt = Math.min(Settings.dt, 0.1);

        this.update(dt);

        this.renderer.render(this.scene, this.camera);

        Input.endFrame();

        requestAnimationFrame(this.run);
    }
}
