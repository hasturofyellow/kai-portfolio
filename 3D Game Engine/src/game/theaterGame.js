import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Settings } from '../settings.js';
import { Input } from '../input.js';
import { Collision } from './collision.js';
import { Player } from './player.js';
import { ExteriorScene } from './locations/exterior.js';
import { LobbyScene } from './locations/lobby.js';
import { TheaterRoomScene } from './locations/theaterRoom.js';
import { LavaCaveScene } from './locations/lavaCaveScene.js';
import { BackHallScene } from './locations/backHallScene.js';
import { JailScene } from './locations/jailScene.js';

export class TheaterGame {
    static ITEM_DEFS = {
        Pizza:     { emoji: '🍕', format: 'fbx', path: '../Pizza.fbx',                         scale: 0.002 },
        Soda:      { emoji: '🥤', format: 'fbx', path: '../Soda.fbx',                          scale: 0.002 },
        Fries:     { emoji: '🍟', format: 'fbx', path: '../Chips.fbx',                         scale: 0.002 },
        Hamburger: { emoji: '🍔', format: 'obj', path: '../Hamburger/Hamburger_01.obj',
                     mtl: '../Hamburger/Hamburger_01.mtl',      scale: 0.003 },
        Popcorn:   { emoji: '🍿', format: 'obj', path: '../Box of popcorn/model.obj',
                     mtl: '../Box of popcorn/materials.mtl',    scale: 0.03  },
        OldKey:    { emoji: '🗝️', format: null,  path: null,                                   scale: 1     },
        CriticPass:{ emoji: '🏅', format: null,  path: null,                                   scale: 1     },
    };

    constructor() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupComposer();

        // Initialize input
        Input.init(this.renderer.domElement);

        // Store in settings
        Settings.add('renderer', this.renderer);
        Settings.add('scene', this.scene);
        Settings.add('camera', this.camera);
        Settings.add('cameraSensitivity', Number(localStorage.getItem('kai-camera-sensitivity')) || 1);

        // Create player
        this.player = new Player(this.scene);

        // Current location
        this.currentLocation = null;
        this.locationName = '';

        // UI
        this.setupUI();
        this.currency = 25;
        this.tickets = 0;
        this.collectedBills = new Set();
        this.metGerald = false;
        this.strangerFed = false;  // true after player shares food with the lobby stranger
        this.activity = {
            conversations: new Set(),
            gamesPlayed: new Set(),
            moviesAttended: new Set(),
            unpaidMovies: new Set(),
            caveVisits: 0,
            bailPaid: 0,
        };
        this.unlockedRewards = new Set();
        this.inventory = [];       // [{name: string, count: number}]
        this.equippedItem = null;
        this.selectedSlot = 0;     // 0=money, 1=ticket, 2-7=food items
        this.pendingPurchase = null; // {cost, onConfirm} waiting for player to select 💵 and press U
        this._scrollCooldown = 0;
        this._pendingLocation = null;
        this.updateInventoryUI();

        // Sitting state
        this.isSitting = false;
        this.nearSeat = null;
        this.currentSeatPos = null;

        // Arcade state
        this.nearArcade = 0;
        this.arcadeOpen = false;
        this.gameOpen = false;
        this._gameReturnSeat = null;

        // Dumpster animation state
        this.dumpsterAnim = null;

        // Local QA can deep-link to a room without weakening progression in
        // the published experience (for example: ?start=lobby).
        const previewParams = new URLSearchParams(window.location.search);
        const previewStart = previewParams.get('start');
        const previewLocations = new Set(['exterior', 'lobby', 'backhall', 'lavacave', 'jail']);
        const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        this.loadLocation(isLocalPreview && previewLocations.has(previewStart) ? previewStart : 'exterior');
        if (isLocalPreview && previewParams.has('x') && previewParams.has('z')) {
            const previewX = Number(previewParams.get('x'));
            const previewZ = Number(previewParams.get('z'));
            const previewYaw = Number(previewParams.get('yaw'));
            if (Number.isFinite(previewX) && Number.isFinite(previewZ)) {
                this.player.setPosition(previewX, 1, previewZ);
                if (Number.isFinite(previewYaw)) this.player.cameraYaw = previewYaw;
                this.cameraInitialized = false;
            }
        }

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

    setupComposer() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,   // strength
            0.4,   // radius
            0.15   // threshold — low so all neon blooms
        );
        this.composer.addPass(this.bloomPass);
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
                    margin: 0;
                    font-size: 18px;
                    color: #ffd700;
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
                #objective {
                    position: absolute;
                    top: 58px;
                    right: 16px;
                    max-width: 280px;
                    background: rgba(4,4,20,0.72);
                    border-left: 3px solid #ffd700;
                    color: #fff4cf;
                    padding: 9px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    line-height: 1.35;
                }
                #settings-button {
                    position: absolute;
                    top: 16px;
                    left: 16px;
                    border: 1px solid rgba(255,215,0,0.7);
                    border-radius: 8px;
                    background: rgba(0,0,0,0.72);
                    color: #fff4cf;
                    padding: 9px 13px;
                    cursor: pointer;
                }
                #settings-panel {
                    display: none;
                    position: absolute;
                    top: 58px;
                    left: 16px;
                    width: min(320px, calc(100vw - 60px));
                    padding: 14px;
                    border: 1px solid rgba(255,215,0,0.6);
                    border-radius: 10px;
                    background: rgba(2,2,16,0.92);
                    color: white;
                    backdrop-filter: blur(10px);
                }
                #settings-panel.open { display: block; }
                #settings-panel label { display: block; font-size: 13px; margin-bottom: 8px; }
                .settings-heading {
                    margin: 0 0 10px;
                    color: #ffd700;
                    font-size: 14px;
                    letter-spacing: 0.03em;
                }
                .settings-section + .settings-section {
                    margin-top: 14px;
                    padding-top: 14px;
                    border-top: 1px solid rgba(255,255,255,0.14);
                }
                .controls-list {
                    display: grid;
                    grid-template-columns: max-content 1fr;
                    gap: 7px 12px;
                    margin: 0;
                    font-size: 12px;
                    line-height: 1.35;
                }
                .controls-list dt {
                    color: #fff4cf;
                    font-weight: 700;
                }
                .controls-list dd {
                    margin: 0;
                    color: rgba(255,255,255,0.76);
                }
                #camera-sensitivity { width: 100%; accent-color: #df3f8b; }
                #sensitivity-value { color: #ffd700; font-weight: 700; }
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
                .inv-slot-currency {
                    border-color: rgba(255,215,0,0.3);
                    cursor: default;
                }
                .inv-label {
                    font-size: 11px;
                    color: #ffd700;
                    font-weight: bold;
                    margin-top: 2px;
                }
                #dialogue-panel {
                    display: none;
                    position: absolute;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 460px;
                    background: rgba(0,0,0,0.90);
                    border: 1px solid #ffd700;
                    border-radius: 12px;
                    padding: 18px 24px;
                    color: white;
                    backdrop-filter: blur(10px);
                }
                #dialogue-speaker {
                    font-size: 13px;
                    color: #ffd700;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                #dialogue-text {
                    font-size: 15px;
                    line-height: 1.5;
                    margin-bottom: 14px;
                    white-space: pre-line;
                }
                #dialogue-options {
                    font-size: 13px;
                    color: #aaa;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
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
                #cinema-game-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 500;
                    background: #020210;
                    pointer-events: auto;
                }
                #cinema-game-toolbar {
                    height: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 18px;
                    color: white;
                    background: linear-gradient(90deg, #060885, #1a0730);
                    border-bottom: 2px solid #df3f8b;
                    box-sizing: border-box;
                }
                #cinema-game-toolbar strong { color: #ffd86b; letter-spacing: 0.06em; }
                #return-to-cinema {
                    border: 1px solid #ffd86b;
                    border-radius: 999px;
                    background: rgba(255,216,107,0.12);
                    color: #fff4c8;
                    padding: 9px 18px;
                    font-weight: 700;
                    cursor: pointer;
                }
                #return-to-cinema:hover { background: rgba(255,216,107,0.25); }
                #cinema-game-frame {
                    width: 100%;
                    height: calc(100% - 56px);
                    border: 0;
                    background: #050510;
                }
                .arcade-overlay {
                    display: none;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.95);
                    border: 2px solid #ffd700;
                    border-radius: 16px;
                    padding: 28px 32px;
                    color: white;
                    backdrop-filter: blur(12px);
                    min-width: 380px;
                    text-align: center;
                    z-index: 300;
                }
                .arcade-title { font-size: 22px; font-weight: bold; color: #ffd700; margin-bottom: 4px; }
                .arcade-subtitle { font-size: 12px; color: #777; margin-bottom: 16px; }
                .arcade-btn {
                    background: rgba(255,215,0,0.12);
                    border: 1px solid #ffd700;
                    color: #ffd700;
                    padding: 8px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    margin: 4px;
                }
                .arcade-btn:hover { background: rgba(255,215,0,0.28); }
                .arcade-btn:disabled { opacity: 0.4; cursor: default; }
                .arcade-btn-green { border-color: #55fc77; color: #55fc77; background: rgba(85,252,119,0.08); }
                .arcade-close-btn {
                    display: block;
                    margin: 14px auto 0;
                    background: transparent;
                    border: 1px solid #444;
                    color: #666;
                    padding: 5px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    cursor: pointer;
                }
                .arcade-close-btn:hover { border-color: #888; color: #aaa; }
                .arcade-result { min-height: 26px; font-size: 16px; font-weight: bold; margin: 10px 0; }
                #slot-reels { font-size: 50px; display: flex; justify-content: center; gap: 12px; margin: 10px 0; }
                #slot-reels span { background: rgba(255,255,255,0.04); border: 1px solid #2a2a2a; border-radius: 8px; padding: 6px 10px; min-width: 64px; display: inline-block; }
                .slot-paytable { font-size: 11px; color: #555; margin-bottom: 12px; }
                #hilo-card-display { font-size: 62px; margin: 6px 0; background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 12px; padding: 10px 20px; display: inline-block; min-width: 80px; }
                #hilo-pot-display { font-size: 18px; color: #ffd700; margin-bottom: 6px; }
                .hilo-btns { display: flex; justify-content: center; gap: 8px; margin: 8px 0; }
                .plinko-board { font-family: monospace; font-size: 18px; line-height: 2; text-align: center; margin: 8px 0; user-select: none; }
                .plinko-row { display: flex; justify-content: center; gap: 14px; }
                .plinko-slots { display: flex; justify-content: center; gap: 8px; margin-top: 6px; font-size: 13px; font-weight: bold; }
                .plinko-slot { padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.06); }
                .plinko-slot-jackpot { color: #55fc77; background: rgba(85,252,119,0.12); }
                .plinko-slot-bust { color: #ff4444; }
                #inventory-bar {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    gap: 6px;
                    pointer-events: auto;
                }
                .inv-slot {
                    width: 52px;
                    height: 52px;
                    background: rgba(0,0,0,0.65);
                    border: 2px solid rgba(255,255,255,0.15);
                    border-radius: 8px;
                    backdrop-filter: blur(8px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                    transition: border-color 0.2s;
                }
                .inv-slot.equipped {
                    border-color: #ffd700;
                    box-shadow: 0 0 10px rgba(255,215,0,0.35);
                }
                .inv-slot.selected {
                    outline: 2px solid rgba(255,255,255,0.85);
                    outline-offset: 2px;
                }
                .inv-slot:hover { border-color: rgba(255,255,255,0.4); }
                .inv-emoji { font-size: 24px; line-height: 1; }
                .inv-count {
                    font-size: 10px;
                    color: #ccc;
                    position: absolute;
                    bottom: 3px;
                    right: 5px;
                }
            </style>
            <div id="topbar">
                <h1>🎬 Kai's Cinema</h1>
            </div>
            <div id="location">📍 Loading...</div>
            <div id="objective">Objective: explore the cinema</div>
            <button id="settings-button" type="button" aria-expanded="false" aria-controls="settings-panel">⚙ Settings</button>
            <div id="settings-panel">
                <section class="settings-section" aria-labelledby="controls-heading">
                    <h2 class="settings-heading" id="controls-heading">Controls</h2>
                    <dl class="controls-list">
                        <dt>W / S</dt><dd>Forward / back</dd>
                        <dt>A / ←</dt><dd>Move right</dd>
                        <dt>D / →</dt><dd>Move left</dd>
                        <dt>Mouse</dt><dd>Look around</dd>
                        <dt>Right-click</dt><dd>Talk</dd>
                        <dt>Space</dt><dd>Jump</dd>
                        <dt>E</dt><dd>Play / sit</dd>
                        <dt>U</dt><dd>Use / pay</dd>
                    </dl>
                </section>
                <section class="settings-section" aria-labelledby="camera-heading">
                    <h2 class="settings-heading" id="camera-heading">Camera</h2>
                    <label for="camera-sensitivity">Sensitivity: <span id="sensitivity-value">1.00×</span></label>
                    <input id="camera-sensitivity" type="range" min="0.35" max="2.25" step="0.05" value="1">
                    <small style="opacity:.7">Lower is steadier; higher turns faster.</small>
                </section>
            </div>
            <div id="hint"></div>
            <div id="inventory-bar"></div>
            <div id="crosshair"></div>
            <div id="dialogue-panel">
                <div id="dialogue-speaker"></div>
                <div id="dialogue-text"></div>
                <div id="dialogue-options"></div>
            </div>
            <div id="arcade-slot" class="arcade-overlay">
                <div class="arcade-title">🎰 SLOT MACHINE</div>
                <div class="arcade-subtitle">Match symbols to win big!</div>
                <div id="slot-reels">
                    <span id="slot-r1">💎</span>
                    <span id="slot-r2">💎</span>
                    <span id="slot-r3">💎</span>
                </div>
                <div class="slot-paytable">3×💎 = 10× &nbsp;•&nbsp; 3×7️⃣ = 5× &nbsp;•&nbsp; 3×any = 3× &nbsp;•&nbsp; 2×match = 0.5×</div>
                <div id="slot-result" class="arcade-result"></div>
                <div>Bet: $<select id="slot-bet" style="background:#111;color:#ffd700;border:1px solid #444;padding:3px 6px;border-radius:4px"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option></select></div>
                <br>
                <button id="slot-spin-btn" class="arcade-btn">🎰 SPIN</button>
                <button id="arcade-slot-close" class="arcade-close-btn">✕ Close</button>
            </div>
            <div id="arcade-hilo" class="arcade-overlay">
                <div class="arcade-title">🃏 HI-LO</div>
                <div class="arcade-subtitle">Guess higher or lower — cash out anytime!</div>
                <div id="hilo-card-display">?</div>
                <div id="hilo-pot-display">Pot: $0</div>
                <div id="hilo-result" class="arcade-result"></div>
                <div class="hilo-btns">
                    <button id="hilo-higher-btn" class="arcade-btn">↑ Higher</button>
                    <button id="hilo-lower-btn" class="arcade-btn">↓ Lower</button>
                    <button id="hilo-cashout-btn" class="arcade-btn arcade-btn-green">💰 Cash Out</button>
                </div>
                <button id="hilo-start-btn" class="arcade-btn">► Start ($10)</button>
                <button id="arcade-hilo-close" class="arcade-close-btn">✕ Close</button>
            </div>
            <div id="arcade-plinko" class="arcade-overlay">
                <div class="arcade-title">🎯 PLINKO</div>
                <div class="arcade-subtitle">Drop the disc — center slots pay most!</div>
                <div id="plinko-board-container"></div>
                <div id="plinko-result" class="arcade-result"></div>
                <div>Bet: $<select id="plinko-bet" style="background:#111;color:#ffd700;border:1px solid #444;padding:3px 6px;border-radius:4px"><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></div>
                <br>
                <button id="plinko-drop-btn" class="arcade-btn">▼ DROP</button>
                <button id="arcade-plinko-close" class="arcade-close-btn">✕ Close</button>
            </div>
            <div id="click-prompt">
                <span>Click to Start</span><br>
                <small style="opacity: 0.7">Click anywhere to capture mouse</small>
            </div>
            <div id="cinema-game-overlay" aria-hidden="true">
                <div id="cinema-game-toolbar">
                    <strong id="cinema-game-title">NOW PLAYING</strong>
                    <span>Esc or the button returns you to the exact seat you left.</span>
                    <button id="return-to-cinema" type="button">← Return to cinema</button>
                </div>
                <iframe id="cinema-game-frame" title="Cinema game"></iframe>
            </div>
        `;
        document.body.appendChild(ui);

        this.uiElements = {
            location: document.getElementById('location'),
            objective: document.getElementById('objective'),
            hint: document.getElementById('hint'),
            clickPrompt: document.getElementById('click-prompt'),
            inventoryBar: document.getElementById('inventory-bar'),
            dialoguePanel: document.getElementById('dialogue-panel'),
            dialogueSpeaker: document.getElementById('dialogue-speaker'),
            dialogueText: document.getElementById('dialogue-text'),
            dialogueOptions: document.getElementById('dialogue-options'),
            gameOverlay: document.getElementById('cinema-game-overlay'),
            gameFrame: document.getElementById('cinema-game-frame'),
            gameTitle: document.getElementById('cinema-game-title'),
        };

        document.getElementById('return-to-cinema').addEventListener('click', () => this.closeGame());
        this.uiElements.clickPrompt.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
        this.uiElements.gameFrame.addEventListener('load', () => {
            if (!this.gameOpen) return;
            try {
                this.uiElements.gameFrame.contentWindow.addEventListener('keydown', event => {
                    if (event.code === 'Escape') this.closeGame();
                });
            } catch (error) {
                console.warn('The embedded game uses a different origin; use the visible return button.', error);
            }
        });
        const sensitivityInput = document.getElementById('camera-sensitivity');
        const sensitivityValue = document.getElementById('sensitivity-value');
        sensitivityInput.value = String(Settings.get('cameraSensitivity') ?? 1);
        sensitivityValue.textContent = `${Number(sensitivityInput.value).toFixed(2)}×`;
        document.getElementById('settings-button').addEventListener('click', event => {
            event.stopPropagation();
            document.exitPointerLock();
            const panel = document.getElementById('settings-panel');
            const isOpen = panel.classList.toggle('open');
            event.currentTarget.setAttribute('aria-expanded', String(isOpen));
        });
        sensitivityInput.addEventListener('input', event => {
            const value = Number(event.target.value);
            Settings.add('cameraSensitivity', value);
            localStorage.setItem('kai-camera-sensitivity', String(value));
            sensitivityValue.textContent = `${value.toFixed(2)}×`;
        });
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.gameOpen) {
                event.preventDefault();
                this.closeGame();
            }
        }, true);

        // Hide prompt when mouse is locked
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.uiElements.clickPrompt.classList.add('hidden');
            } else if (!this.arcadeOpen && !this.gameOpen && !this.dialogueOpen && !document.getElementById('settings-panel').classList.contains('open')) {
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

    updateWalletUI() {
        this.updateInventoryUI();
    }

    collectBill(id) {
        this.collectedBills.add(id);
        this.currency += 5;
        this.updateWalletUI();
        this.showHint('Found $5!', 2000);
    }

    die() {
        this.currency = Math.max(0, this.currency - 15);
        this.updateWalletUI();
        this.showHint('You died! -$15', 2500);
        this.loadLocation('exterior');
    }

    openDialogue(speaker, text, options) {
        this.dialogueOpen = true;
        this._dialogueLockYaw = this.player.cameraYaw;
        document.exitPointerLock();
        this.uiElements.dialogueSpeaker.textContent = speaker;
        this.uiElements.dialogueText.textContent = text;
        this.uiElements.dialogueOptions.innerHTML = options.map(o => `<div>${o.label}</div>`).join('');
        this.uiElements.dialoguePanel.style.display = 'block';
        this._dialogueOptions = options;
        this.activity.conversations.add(speaker.replace(/^[^\p{L}]*/u, '').split('—')[0].trim());
        this._speakDialogue(speaker, text);
    }

    closeDialogue() {
        this.dialogueOpen = false;
        this._dialogueLockYaw = undefined;
        this.uiElements.dialoguePanel.style.display = 'none';
        this._dialogueOptions = null;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (this._dialogueHasCamera) {
            this.cameraDistance = this._preDialogueDist;
            this.cameraHeight = this._preDialogueHeight;
            this.cameraSmoothing = this._preDialogueSmooth;
            this._dialogueHasCamera = false;
        }
    }

    _transitionDialogue(speaker, text, options) {
        this.uiElements.dialogueSpeaker.textContent = speaker;
        this.uiElements.dialogueText.textContent = text;
        this.uiElements.dialogueOptions.innerHTML = options.map(o => `<div>${o.label}</div>`).join('');
        this._dialogueOptions = options;
        this._speakDialogue(speaker, text);
    }

    _speakDialogue(speaker, text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const cleanText = text
            .replace(/["*]/g, '')
            .replace(/\p{Extended_Pictographic}/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleanText) return;
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const sinister = speaker.includes('Iris');
        utterance.rate = sinister ? 0.72 : 0.96;
        utterance.pitch = sinister ? 0.35 : 1.0;
        utterance.volume = sinister ? 0.82 : 0.72;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => sinister
            ? /daniel|fred|male|english.*uk/i.test(`${v.name} ${v.lang}`)
            : /samantha|serena|english/i.test(`${v.name} ${v.lang}`));
        if (preferred) utterance.voice = preferred;
        window.speechSynthesis.speak(utterance);
    }

    _openTicketConversation() {
        const pPos = this.player.getPosition();
        this._preDialogueDist = this.cameraDistance;
        this._preDialogueHeight = this.cameraHeight;
        this._preDialogueSmooth = this.cameraSmoothing;
        this._dialogueHasCamera = true;
        this.player.cameraYaw = Math.atan2(12 - pPos.x, -2.2 - pPos.z);
        this.cameraDistance = 6;
        this.cameraHeight = 2.5;
        this.cameraSmoothing = 0.05;

        if (this.metGerald) {
            // Repeat visit — he remembers you
            this.openDialogue(
                'Gerald',
                '"Still here. Still watching."\n\n...He nods toward the booth window.',
                [
                    { key: 'KeyE', label: '[E] I need a ticket',     action: () => this._ticketPurchaseMenu() },
                    { key: 'KeyQ', label: '[Q] What\'s playing?',    action: () => this._ticketWhatsPlaying() },
                    { key: 'Escape', label: '[Esc] Never mind',      action: () => this.closeDialogue() },
                ]
            );
        } else {
            // First meeting
            this.openDialogue(
                'Gerald',
                '"You\'re new."',
                [
                    { key: 'KeyE', label: '[E] How long have you worked here?', action: () => this._geraldTenure() },
                    { key: 'KeyQ', label: '[Q] I need a ticket.',               action: () => this._geraldSkipToTickets() },
                ]
            );
        }
    }

    _geraldTenure() {
        this._transitionDialogue(
            'Gerald',
            '"Longer than the paint on these walls.\nLonger than most things around here."\n\n"The screens... they\'ve been different lately. Something\'s shifted."',
            [
                { key: 'KeyE', label: '[E] Different how?',          action: () => this._geraldDifferent() },
                { key: 'KeyQ', label: '[Q] Can I get a ticket?',     action: () => this._ticketPurchaseMenu() },
            ]
        );
    }

    _geraldDifferent() {
        this.metGerald = true;
        this._transitionDialogue(
            'Gerald',
            '"Hard to say.\n\nJust... watch the screens. Really watch them."\n\nHe slides the ticket window open.',
            [
                { key: 'KeyE', label: '[E] I\'ll take a ticket',  action: () => this._ticketPurchaseMenu() },
                { key: 'Escape', label: '[Esc] Thanks, Gerald',   action: () => this.closeDialogue() },
            ]
        );
    }

    _geraldSkipToTickets() {
        this.metGerald = true;
        this._transitionDialogue(
            'Gerald',
            '"Right to it. I can respect that."',
            [
                { key: 'KeyE', label: '[E] How many tickets?', action: () => this._ticketPurchaseMenu() },
            ]
        );
    }

    _ticketPurchaseMenu() {
        this._transitionDialogue(
            '🎟️ Gerald the Ticket Seller',
            '"Great choice! Each ticket gets you into one show.\nHow many would you like?"',
            [
                { key: 'KeyE', label: '[E] Buy 1 ticket — $5', action: () => this._buyTickets(1, 5) },
                { key: 'KeyQ', label: '[Q] Buy 3 tickets — $10  (save $5!)', action: () => this._buyTickets(3, 10) },
                { key: 'Escape', label: '[Esc] Actually, never mind', action: () => this.closeDialogue() },
            ]
        );
    }

    _ticketWhatsPlaying() {
        this._transitionDialogue(
            '🎟️ Gerald the Ticket Seller',
            '"We\'ve got four great shows today:\n🎮 Age of War\n🎮 Blast Block\n⚽ Stick Soccer\n🐍 Snake Game\n\nEach ticket is good for one show."',
            [
                { key: 'KeyE', label: '[E] I\'ll take a ticket!', action: () => this._ticketPurchaseMenu() },
                { key: 'Escape', label: '[Esc] Thanks, maybe later', action: () => this.closeDialogue() },
            ]
        );
    }

    _buyTickets(count, cost) {
        const ticketWord = count === 1 ? 'ticket' : 'tickets';
        this.closeDialogue();
        this.pendingPurchase = {
            cost,
            onConfirm: () => {
                this.tickets += count;
                this.updateWalletUI();
                this.showHint(`Bought ${count} ${ticketWord} for $${cost}! 🎟`, 2500);
            },
        };
        this.showHint(`Select 💵 and press U to pay $${cost} for ${count} ${ticketWord}`, 4000);
    }

    _openCheckInConversation() {
        const pPos = this.player.getPosition();
        this._preDialogueDist = this.cameraDistance;
        this._preDialogueHeight = this.cameraHeight;
        this._preDialogueSmooth = this.cameraSmoothing;
        this._dialogueHasCamera = true;
        this.player.cameraYaw = Math.atan2(-20 - pPos.x, 14.5 - pPos.z);
        this.cameraDistance = 6;
        this.cameraHeight = 2.5;
        this.cameraSmoothing = 0.05;

        this.openDialogue(
            '🎬 Rita — Check-In Clerk',
            '"Hello there, welcome to Kai\'s Cinema!\nLooking for your theater today?"',
            [
                { key: 'KeyE', label: '[E] Yes — which way are the theaters?', action: () => this._checkInTheaterMenu() },
                { key: 'KeyQ', label: '[Q] What\'s showing today?',            action: () => this._checkInWhatsShowing() },
                { key: 'Escape', label: '[Esc] Just browsing, thanks!',        action: () => this.closeDialogue() },
            ]
        );
    }

    _checkInTheaterMenu() {
        this._transitionDialogue(
            '🎬 Rita — Check-In Clerk',
            '"Perfect! Which show are you here for?"',
            [
                { key: 'KeyE', label: '[E] Theater 1 — Age of War',   action: () => this._checkInDirections('theater1') },
                { key: 'KeyQ', label: '[Q] Theater 2 — Blast Block',  action: () => this._checkInDirections('theater2') },
                { key: 'KeyR', label: '[R] Theater 3 — Stick Soccer', action: () => this._checkInDirections('theater3') },
                { key: 'KeyF', label: '[F] Theater 4 — Snake Game',   action: () => this._checkInDirections('theater4') },
            ]
        );
    }

    _checkInWhatsShowing() {
        this._transitionDialogue(
            '🎬 Rita — Check-In Clerk',
            '"Tonight\'s lineup:\n🔴 Theater 1 — Age of War (strategy)\n🔵 Theater 2 — Blast Block (puzzle)\n🟢 Theater 3 — Stick Soccer (sports)\n🟩 Theater 4 — Snake Game (arcade)\n\nAll four are running now — just pick your hall!"',
            [
                { key: 'KeyE', label: '[E] Great, point me to one!',               action: () => this._checkInTheaterMenu() },
                { key: 'Escape', label: '[Esc] Thanks, I\'ll wander around first', action: () => this.closeDialogue() },
            ]
        );
    }

    _checkInDirections(theater) {
        const d = {
            theater1: '"Age of War is Screen 1. Take the labeled BACK HALL door, then the first gold-framed door on your left."',
            theater2: '"Blast Block is Screen 2. Take the BACK HALL door; its blue marquee is first on your right."',
            theater3: '"Stick Soccer is Screen 3, farther down the back hall on the left. Follow the green marquee."',
            theater4: '"Snake Game is Screen 4, farther down the back hall on the right. Follow the mint marquee."',
        };

        this._transitionDialogue(
            '🎬 Rita — Check-In Clerk',
            d[theater],
            [
                { key: 'KeyE', label: '[E] Actually, can I check a different theater?', action: () => this._checkInTheaterMenu() },
                { key: 'KeyQ', label: '[Q] Thanks, that\'s all I needed!',              action: () => this._checkInFarewell() },
                { key: 'Escape', label: '[Esc] Got it, heading there now!',             action: () => this.closeDialogue() },
            ]
        );
    }

    _checkInFarewell() {
        this._transitionDialogue(
            '🎬 Rita — Check-In Clerk',
            '"Enjoy the show! And remember — if you need a ticket,\nthe booth is just outside the front entrance.\nHave a wonderful time at Kai\'s Cinema!"',
            [
                { key: 'Escape', label: '[Esc] Thanks, Rita!', action: () => this.closeDialogue() },
            ]
        );
    }

    _openConcessionConversation() {
        const pPos = this.player.getPosition();
        this._preDialogueDist = this.cameraDistance;
        this._preDialogueHeight = this.cameraHeight;
        this._preDialogueSmooth = this.cameraSmoothing;
        this._dialogueHasCamera = true;
        const concessionTarget = this.locationName === 'backhall'
            ? { x: 6.5, z: 23.5 }
            : { x: 20, z: 14.5 };
        this.player.cameraYaw = Math.atan2(concessionTarget.x - pPos.x, concessionTarget.z - pPos.z);
        this.cameraDistance = 6;
        this.cameraHeight = 2.5;
        this.cameraSmoothing = 0.05;

        this.openDialogue(
            '🍕 Benny — Concession Stand',
            '"Step right up! What can Benny get for ya tonight?"',
            [
                { key: 'KeyE',   label: '[E] What\'s on the menu?',     action: () => this._concessionMenu() },
                { key: 'KeyQ',   label: '[Q] What do you recommend?',   action: () => this._concessionRecommend() },
                { key: 'Escape', label: '[Esc] Just browsing, thanks.', action: () => this.closeDialogue() },
            ]
        );
    }

    _concessionMenu() {
        this._transitionDialogue(
            '🍕 Benny — Concession Stand',
            '"Tonight\'s menu:\n🍕 Pizza — $4\n🥤 Soda — $3\n🍟 Fries — $2\n🍔 Hamburger — $5\n\nWhat\'re you feeling?"',
            [
                { key: 'KeyE',   label: '[E] 🍕 Pizza — $4',       action: () => this._concessionConfirm('Pizza', 4) },
                { key: 'KeyQ',   label: '[Q] 🥤 Soda — $3',        action: () => this._concessionConfirm('Soda', 3) },
                { key: 'KeyR',   label: '[R] 🍟 Fries — $2',       action: () => this._concessionConfirm('Fries', 2) },
                { key: 'KeyF',   label: '[F] 🍔 Hamburger — $5',   action: () => this._concessionConfirm('Hamburger', 5) },
            ]
        );
    }

    _concessionRecommend() {
        this._transitionDialogue(
            '🍕 Benny — Concession Stand',
            '"Honestly? The burger. Every time.\nI don\'t make the rules — it\'s just the best thing on the menu."',
            [
                { key: 'KeyE',   label: '[E] Sold. Show me the menu.',  action: () => this._concessionMenu() },
                { key: 'Escape', label: '[Esc] I\'ll think about it.',   action: () => this.closeDialogue() },
            ]
        );
    }

    _concessionConfirm(item, cost) {
        const lines = {
            'Pizza':     '"One slice coming right up — careful, it\'s hot."',
            'Soda':      '"One soda, coming right up!"',
            'Fries':     '"Fries, great call. Nothing beats \'em during a film."',
            'Hamburger': '"One burger — I\'ll make it a good one."',
        };
        const line = lines[item] ?? `"${item}, coming right up!"`;
        this._transitionDialogue(
            '🍕 Benny — Concession Stand',
            `${line}\n\nThat'll be $${cost}.`,
            [
                { key: 'KeyE',   label: `[E] Buy ${item} — $${cost}`,  action: () => this._concessionBuy(item, cost) },
                { key: 'Escape', label: '[Esc] Actually, never mind',  action: () => this._concessionMenu() },
            ]
        );
    }

    _concessionBuy(item, cost) {
        this.closeDialogue();
        this.pendingPurchase = {
            cost,
            onConfirm: () => {
                this.addToInventory(item);
                this.showHint(`Benny hands you a ${item}. Enjoy the show! 🎬`, 3000);
            },
        };
        this.showHint(`Select 💵 and press U to pay $${cost} for ${item}`, 4000);
    }

    // ── Mysterious Stranger ──────────────────────────────────────────────────

    _openStrangerConversation() {
        const pPos = this.player.getPosition();
        this._preDialogueDist   = this.cameraDistance;
        this._preDialogueHeight = this.cameraHeight;
        this._preDialogueSmooth = this.cameraSmoothing;
        this._dialogueHasCamera = true;
        this.player.cameraYaw = Math.atan2(13 - pPos.x, -5 - pPos.z);
        this.cameraDistance = 6;
        this.cameraHeight   = 2.5;
        this.cameraSmoothing = 0.05;

        if (this.strangerFed) {
            this._strangerPostFeed();
        } else {
            this._strangerInitial();
        }
    }

    _strangerInitial() {
        this.openDialogue(
            '...',
            '*A man sits still on the bench, watching the fountain.\nAfter a moment, he notices you.*',
            [
                { key: 'KeyE',   label: '[E] "Are you alright?"', action: () => this._strangerAreYouOkay() },
                { key: 'KeyQ',   label: '[Q] "Who are you?"',     action: () => this._strangerWhoAreYou() },
                { key: 'Escape', label: '[Esc] Walk away',        action: () => this.closeDialogue() },
            ]
        );
    }

    _strangerWhoAreYou() {
        this._transitionDialogue(
            '...',
            '"...Does it matter?\nNames are for people who intend to leave."',
            [
                { key: 'KeyE',   label: '[E] "Are you alright?"', action: () => this._strangerAreYouOkay() },
                { key: 'Escape', label: '[Esc] Walk away',        action: () => this.closeDialogue() },
            ]
        );
    }

    _strangerAreYouOkay() {
        const food = this.inventory.find(i => TheaterGame.ITEM_DEFS[i.name]?.format !== null);
        const options = [];
        if (food) {
            options.push({ key: 'KeyE', label: `[E] "Here — take some of my ${TheaterGame.ITEM_DEFS[food.name].emoji} ${food.name}."`, action: () => this._strangerFeedGive(food.name) });
            options.push({ key: 'KeyQ', label: '[Q] "Sealed off the back?"', action: () => this._strangerSealedBack() });
        } else {
            options.push({ key: 'KeyE', label: '[E] "Sealed off the back?"', action: () => this._strangerSealedBack() });
        }
        options.push({ key: 'Escape', label: '[Esc] Walk away', action: () => this.closeDialogue() });

        this._transitionDialogue(
            '...',
            '"I get by. Haven\'t eaten in a while, but...\nUsed to come here every week, before they changed things.\nBefore they sealed off the back."',
            options
        );
    }

    _strangerSealedBack() {
        const food = this.inventory.find(i => TheaterGame.ITEM_DEFS[i.name]?.format !== null);
        const options = [];
        if (food) {
            options.push({ key: 'KeyE', label: `[E] "Here — take some of my ${TheaterGame.ITEM_DEFS[food.name].emoji} ${food.name}."`, action: () => this._strangerFeedGive(food.name) });
            options.push({ key: 'KeyQ', label: '[Q] "What happened to the key?"', action: () => this._strangerKeyGone() });
        } else {
            options.push({ key: 'KeyE', label: '[E] "What happened to the key?"', action: () => this._strangerKeyGone() });
        }
        options.push({ key: 'Escape', label: '[Esc] Walk away', action: () => this.closeDialogue() });

        this._transitionDialogue(
            '...',
            '"*looks toward the far wall for a long moment*\nThere\'s a door. Most people look right through it.\nToo busy watching the screens.\n...God, I\'m hungry. Anyway. I don\'t have the key anymore."',
            options
        );
    }

    _strangerKeyGone() {
        this._transitionDialogue(
            '...',
            '"...I gave it away. Same as everything else.\nThat\'s what you do, eventually.\nYou give things away."',
            [
                { key: 'Escape', label: '[Esc] Walk away', action: () => this.closeDialogue() },
            ]
        );
    }

    _strangerFeedGive(foodName) {
        this.useItem(foodName);
        this.addToInventory('OldKey');
        this.strangerFed = true;

        this._transitionDialogue(
            '...',
            '"*takes it without looking at it. holds it a moment.*\n\n...I didn\'t expect that.\n\n*a long pause*\n\n...Keep this.\nI don\'t need it anymore.\nBut you —\nyou look like someone who stops to look at things."\n\n*He presses something into your hand.\n You don\'t examine it until he looks away.*',
            [
                { key: 'KeyE',   label: '[E] "What does it open?"', action: () => this._strangerWhatDoes() },
                { key: 'Escape', label: '[Esc] Walk away',          action: () => this.closeDialogue() },
            ]
        );
    }

    _strangerWhatDoes() {
        this._transitionDialogue(
            '...',
            '"...You\'ll know when you find it.\nOr you won\'t.\n\nSome things are meant to be found\nby people who slow down long enough to look."',
            [
                { key: 'Escape', label: '[Esc] Walk away', action: () => this.closeDialogue() },
            ]
        );
    }

    _strangerPostFeed() {
        this.openDialogue(
            '...',
            '"*notices you. a small nod.*\n...Still here."',
            [
                { key: 'KeyE',   label: '[E] "What\'s behind that door?"', action: () => this._strangerPostFeedDoor() },
                { key: 'Escape', label: '[Esc] Walk away',                 action: () => this.closeDialogue() },
            ]
        );
    }

    _strangerPostFeedDoor() {
        this._transitionDialogue(
            '...',
            '"*looks toward the far wall.*\n*says nothing.*\n*smiles faintly.*"',
            [
                { key: 'Escape', label: '[Esc] Walk away', action: () => this.closeDialogue() },
            ]
        );
    }

    _openIrisConversation() {
        const p = this.player.getPosition();
        this._preDialogueDist = this.cameraDistance;
        this._preDialogueHeight = this.cameraHeight;
        this._preDialogueSmooth = this.cameraSmoothing;
        this._dialogueHasCamera = true;
        this.player.cameraYaw = Math.atan2(-p.x, -p.z);
        this.cameraDistance = 5;
        this.cameraHeight = 3.4;
        this.cameraSmoothing = 0.04;

        const games = [...this.activity.gamesPlayed];
        const people = [...this.activity.conversations].filter(n => n && !n.includes('Iris'));
        const memory = [
            `You carry $${this.currency} and ${this.tickets} ticket${this.tickets === 1 ? '' : 's'}.`,
            games.length ? `You have entered ${games.join(', ')}.` : 'You have not entered a screening. Yet.',
            people.length ? `You have spoken to ${people.join(', ')}.` : 'The staff still do not know your voice.',
            this.strangerFed ? 'You fed the one on the bench. He gave you the old key.' : 'The hungry one on the bench is still waiting.',
            this.activity.caveVisits ? `You survived the lava cave ${this.activity.caveVisits} time${this.activity.caveVisits === 1 ? '' : 's'}.` : 'You have not yet fallen beneath the street.',
        ].join('\n');

        this.openDialogue(
            '◉ The Iris',
            `"They all call me The Iris. They pretend I am decoration.\nI am the cinema's witness.\n\n${memory}\n\nI remember what the building is told to forget."`,
            [
                { key: 'KeyE', label: '[E] What are your sinister activities?', action: () => this._irisSecret() },
                { key: 'KeyQ', label: '[Q] What should I do next?', action: () => this._irisNext() },
                { key: 'Escape', label: '[Esc] Break eye contact', action: () => this.closeDialogue() },
            ]
        );
    }

    _irisSecret() {
        this._transitionDialogue(
            '◉ The Iris',
            '"I count unpaid admissions. I open doors that management sealed. I keep a copy of every choice made under this roof.\n\nGerald calls that sinister. Rita calls it impossible. The officer calls it evidence."',
            [{ key: 'Escape', label: '[Esc] Back away slowly', action: () => this.closeDialogue() }]
        );
    }

    _irisNext() {
        const next = this.activity.gamesPlayed.size === 0
            ? 'Buy a ticket, unlock the back hall, take a seat, and begin a screening.'
            : this.activity.caveVisits === 0
                ? 'The dumpster outside is not merely a dumpster.'
                : this.unlockedRewards.has('Critic Pass')
                    ? 'Your Critic Pass has opened a path most guests never see.'
                    : 'Three different screenings will earn you a pass. I will know when it happens.';
        this._transitionDialogue(
            '◉ The Iris',
            `"${next}"`,
            [{ key: 'Escape', label: '[Esc] Leave', action: () => this.closeDialogue() }]
        );
    }

    _openPoliceConversation() {
        const unpaid = this.activity.unpaidMovies.size;
        if (unpaid === 0) {
            this.openDialogue(
                '🛡 Officer Vale — Cinema Security',
                '"Tickets in order. Keep the aisles clear, and do not believe everything the eye tells you."',
                [{ key: 'Escape', label: '[Esc] Carry on', action: () => this.closeDialogue() }]
            );
            return;
        }
        this.openDialogue(
            '🛡 Officer Vale — Cinema Security',
            `"The Iris logged ${unpaid} unpaid screening${unpaid === 1 ? '' : 's'} under your face.\nBail is $10. Otherwise, you are coming with me."`,
            [
                { key: 'KeyE', label: '[E] Pay $10 bail now', action: () => this._payPoliceBail() },
                { key: 'KeyQ', label: '[Q] Refuse and go to holding', action: () => this._sendToJail() },
                { key: 'Escape', label: '[Esc] Try to leave', action: () => this._sendToJail() },
            ]
        );
    }

    _payPoliceBail() {
        if (this.currency < 10) {
            this._transitionDialogue(
                '🛡 Officer Vale — Cinema Security',
                '"You do not have enough. Holding cell."',
                [{ key: 'KeyE', label: '[E] Go to holding', action: () => this._sendToJail() }]
            );
            return;
        }
        this.currency -= 10;
        this.activity.bailPaid += 10;
        this.activity.unpaidMovies.clear();
        this.updateWalletUI();
        this.closeDialogue();
        this.showHint('Bail paid. Your admission record is clear.', 3500);
    }

    _sendToJail() {
        this.closeDialogue();
        this.loadLocation('jail');
    }

    _useKeyOnBackDoor() {
        const hasKey = this.inventory.some(i => i.name === 'OldKey');
        if (!hasKey) {
            this.showHint('Locked. The man on the bench may know where the key went.', 4000);
            return;
        }
        this.closeDialogue();
        this.loadLocation('backhall');
    }

    // ─────────────────────────────────────────────────────────────────────────

    addToInventory(itemName) {
        const existing = this.inventory.find(i => i.name === itemName);
        if (existing) existing.count++;
        else this.inventory.push({ name: itemName, count: 1 });
        this.updateInventoryUI();
        const def = TheaterGame.ITEM_DEFS[itemName];
        if (!this.equippedItem && def?.format !== null) this.equipItem(itemName);
    }

    equipItem(itemName) {
        this.equippedItem = itemName;
        this._loadItemModel(itemName);
        this.updateInventoryUI();
    }

    _loadItemModel(itemName) {
        const def = TheaterGame.ITEM_DEFS[itemName];
        if (!def || def.format === null) return;
        this.player.detachHeldItem();
        if (def.format === 'fbx') {
            new FBXLoader().load(def.path, (fbx) => {
                fbx.scale.setScalar(def.scale);
                this.player.attachItemToHand(fbx);
            });
        } else {
            const mtlLoader = new MTLLoader();
            mtlLoader.load(def.mtl, (mats) => {
                mats.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(mats);
                objLoader.load(def.path, (mesh) => {
                    mesh.scale.setScalar(def.scale);
                    this.player.attachItemToHand(mesh);
                });
            });
        }
    }

    useItem(itemName) {
        const entry = this.inventory.find(i => i.name === itemName);
        if (!entry) return;
        if (TheaterGame.ITEM_DEFS[itemName]?.format === null) {
            this.showHint(`${itemName} is a permanent key item.`, 2200);
            return;
        }
        this._applyItemEffect(itemName);
        entry.count--;
        if (entry.count <= 0) this.inventory.splice(this.inventory.indexOf(entry), 1);
        if (this.equippedItem === itemName && !this.inventory.find(i => i.name === itemName)) {
            this.equippedItem = null;
            this.player.detachHeldItem();
            if (this.inventory.length > 0) this.equipItem(this.inventory[0].name);
        }
        this.updateInventoryUI();
    }

    _applyItemEffect(itemName) {
        // Future: buff effects and secret-area unlocks go here
    }

    updateInventoryUI() {
        const bar = this.uiElements.inventoryBar;
        bar.innerHTML = '';

        // Fixed slots: money (index 0) and tickets (index 1)
        const moneySlot = document.createElement('div');
        moneySlot.className = 'inv-slot inv-slot-currency' + (this.selectedSlot === 0 ? ' selected' : '');
        moneySlot.title = 'Money';
        moneySlot.innerHTML = `<span class="inv-emoji">💵</span><span class="inv-label">$${this.currency}</span>`;
        bar.appendChild(moneySlot);

        const ticketSlot = document.createElement('div');
        ticketSlot.className = 'inv-slot inv-slot-currency' + (this.selectedSlot === 1 ? ' selected' : '');
        ticketSlot.title = 'Tickets';
        ticketSlot.innerHTML = `<span class="inv-emoji">🎟️</span><span class="inv-label">${this.tickets}</span>`;
        bar.appendChild(ticketSlot);

        // Food/item slots (indices 2-7)
        const MAX_SLOTS = 6;
        for (let i = 0; i < MAX_SLOTS; i++) {
            const item = this.inventory[i];
            const slotIndex = i + 2;
            let cls = 'inv-slot';
            if (item && this.equippedItem === item.name) cls += ' equipped';
            if (this.selectedSlot === slotIndex) cls += ' selected';
            const slot = document.createElement('div');
            slot.className = cls;
            if (item) {
                const def = TheaterGame.ITEM_DEFS[item.name] ?? {};
                slot.innerHTML = `<span class="inv-emoji">${def.emoji ?? '?'}</span><span class="inv-count">×${item.count}</span>`;
                slot.title = item.name;
                slot.addEventListener('click', () => {
                    this.selectedSlot = slotIndex;
                    this._onSlotSelected();
                });
            }
            bar.appendChild(slot);
        }
        if (this.activity && this.uiElements.objective) this.updateObjectiveUI();
    }

    _onSlotSelected() {
        const foodIdx = this.selectedSlot - 2;
        if (foodIdx >= 0 && foodIdx < this.inventory.length) {
            this.equipItem(this.inventory[foodIdx].name);
        } else if (foodIdx >= 0) {
            // Selected an empty food slot — unequip held item
            this.equippedItem = null;
            this.player.detachHeldItem();
            this.updateInventoryUI();
        } else {
            // Money or ticket slot selected — just refresh highlight
            this.updateInventoryUI();
        }
    }

    clearHint() {
        clearTimeout(this.hintTimeout);
        this.uiElements.hint.classList.remove('show');
    }

    sitDown() {
        this.isSitting = true;
        const s = this.nearSeat;
        this.currentSeatPos = { x: s.x, z: s.z, seatY: s.seatY, meshRot: s.meshRot, camYaw: s.camYaw };

        // Play sitting animation
        this.player.setSitting(true);

        // Orient camera toward the seat's facing direction initially
        this.player.cameraYaw = s.camYaw ?? Math.PI;
        this.player.mesh.rotation.y = s.meshRot ?? Math.PI;

        // Save camera settings and switch to cinematic seated view
        this._preSitDist = this.cameraDistance;
        this._preSitHeight = this.cameraHeight;
        this._preSitSmooth = this.cameraSmoothing;
        this.cameraDistance = 6;
        this.cameraHeight = 1.8;
        this.cameraSmoothing = 0.04;

        // Persist "stand up" hint while seated
        const canPlay = this.currentLocation?.getGameUrl?.();
        this.showHint(canPlay ? 'You are seated • Space plays the screening • E stands' : 'You are seated • E stands', 9999999);
    }

    standUp() {
        this.isSitting = false;
        this.currentSeatPos = null;

        // Return to locomotion animations
        this.player.setSitting(false);

        // Restore camera
        this.cameraDistance = this._preSitDist ?? 10;
        this.cameraHeight = this._preSitHeight ?? 4;
        this.cameraSmoothing = this._preSitSmooth ?? 0.08;

        this.clearHint();
    }

    handleDialogueInput() {
        if (!this._dialogueOptions) return;
        for (const opt of this._dialogueOptions) {
            if (Input.isKeyJustPressed(opt.key)) {
                opt.action();
                return;
            }
        }
    }

    setLocationUI(name) {
        this.uiElements.location.textContent = `📍 ${name}`;
    }

    updateObjectiveUI() {
        let objective = 'Talk to Gerald outside and buy a ticket.';
        if (this.tickets > 0 && !this.inventory.some(i => i.name === 'OldKey')) {
            objective = 'Talk to the man on the lobby bench; food may earn his trust.';
        } else if (this.inventory.some(i => i.name === 'OldKey') && this.activity.gamesPlayed.size === 0) {
            objective = 'Unlock the BACK HALL, choose a screen, and take a seat.';
        } else if (this.activity.gamesPlayed.size > 0 && this.activity.gamesPlayed.size < 3) {
            objective = `Play ${3 - this.activity.gamesPlayed.size} more different screening${3 - this.activity.gamesPlayed.size === 1 ? '' : 's'} to unlock the Critic Pass.`;
        } else if (this.unlockedRewards.has('Critic Pass')) {
            objective = 'Critic Pass unlocked. Ask The Iris what it has witnessed.';
        }
        if (this.activity.unpaidMovies.size) objective = 'Security alert: settle your unpaid admission or face the holding cell.';
        this.uiElements.objective.textContent = `Objective: ${objective}`;
    }

    _queueLocation(name) {
        if (!this._pendingLocation) this._pendingLocation = name;
    }

    _queueTheaterEntry(number) {
        const theater = `theater${number}`;
        if (this.tickets > 0) {
            this.tickets--;
            this.activity.moviesAttended.add(theater);
            this.updateWalletUI();
        } else {
            this.activity.unpaidMovies.add(theater);
            this.updateObjectiveUI();
        }
        this._queueLocation(theater);
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
        this.nearTheater2 = false;
        this.nearTheater3 = false;
        this.nearTheater4 = false;
        this.nearScreen = false;
        this.nearTheaterExit = false;
        this.nearDumpster = false;
        this.nearCaveExit = false;
        this.nearPortal = false;
        this.nearTicket = false;
        this.nearCheckIn = false;
        this.nearConcession = false;
        this.nearStranger = false;
        this.nearEye = false;
        this.nearBackDoor = false;
        this.nearHallExit = false;
        this.nearPolice = false;
        this.nearJailBail = false;
        this.nearJailEscape = false;
        this.nearHallTheater = 0;
        this.nearPoster = null;
        this.nearArcade = 0;
        this.nearSeat = null;
        this.isSitting = false;
        this.currentSeatPos = null;
        this.player.mesh.scale.set(1, 1, 1);
        this.cameraDistance = 10;
        this.cameraHeight = 4;
        this.cameraSmoothing = 0.08;
        this.dialogueOpen = false;
        this._dialogueOptions = null;
        this._dialogueHasCamera = false;
        if (this.uiElements) this.uiElements.dialoguePanel.style.display = 'none';
        this.player.floorY = 0; // Reset to default; lava cave overrides below

        switch (name) {
            case 'exterior':
                this.currentLocation = new ExteriorScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupMoneyPickups(this.collectedBills, (id) => this.collectBill(id));
                this.currentLocation.setupDoorTrigger((event, trigger) => {
                    if (event === 'enter') {
                        this.showHint('Entrance doors opening...', 1500);
                        this.nearDoor = true;
                        this._queueLocation('lobby');
                    } else {
                        this.nearDoor = false;
                    }
                });

                this.currentLocation.setupDumpsterTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Press SPACE to enter the cave...', 4000);
                        this.nearDumpster = true;
                    } else {
                        this.nearDumpster = false;
                    }
                });

                this.currentLocation.setupTicketTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Right-click to talk to the ticket seller...', 4000);
                        this.nearTicket = true;
                    } else {
                        this.nearTicket = false;
                        if (this.dialogueOpen) this.closeDialogue();
                    }
                });

                this.currentLocation.setupPosterTriggers((event, poster) => {
                    if (event === 'enter') {
                        this.nearPoster = poster;
                        this.showHint(`Press SPACE to jump into ${poster.title}`, 5000);
                    } else if (this.nearPoster === poster) {
                        this.nearPoster = null;
                    }
                });

                const spawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(spawn.x, spawn.y, spawn.z);
                this.player.cameraYaw = Math.PI; // Face the theater
                this.player.floorY = -Infinity; // Allow falling off the road

                this.setLocationUI('Outside Theater');
                this.showHint('Walk toward the theater entrance...', 4000);
                break;

            case 'lobby':
                this.currentLocation = new LobbyScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupMoneyPickups(this.collectedBills, (id) => this.collectBill(id));
                this.currentLocation.setupSeatTriggers(
                    (seat) => { this.nearSeat = seat; this.showHint('Press E to sit', 5000); },
                    () => { if (!this.isSitting) { this.nearSeat = null; this.clearHint(); } }
                );

                // Setup entrance trigger (to go back outside)
                this.currentLocation.setupEntranceTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Street doors opening...', 1500);
                        this.nearExit = true;
                        this._queueLocation('exterior');
                    } else {
                        this.nearExit = false;
                    }
                });

                // The former side-wall entrances are now illuminated game ads;
                // all actual screen doors live together in the back hall.

                // Setup check-in clerk trigger
                this.currentLocation.setupCheckInTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Right-click to chat with the check-in clerk...', 4000);
                        this.nearCheckIn = true;
                    } else {
                        this.nearCheckIn = false;
                        if (this.dialogueOpen) this.closeDialogue();
                    }
                });

                // Setup concession stand trigger
                this.currentLocation.setupConcessionTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Right-click to order from the concession stand...', 4000);
                        this.nearConcession = true;
                    } else {
                        this.nearConcession = false;
                        if (this.dialogueOpen) this.closeDialogue();
                    }
                });

                // The lobby cabinets are deliberately duplicated in the back
                // hall so the gambling games stay discoverable before the
                // player unlocks that progression area.
                this.currentLocation.setupArcadeTriggers((event, n) => {
                    const names = ['', 'Slot Machine', 'Hi-Lo', 'Plinko'];
                    if (event === 'enter') {
                        this.nearArcade = n;
                        this.showHint(`Press E to play ${names[n]}`, 4000);
                    } else if (this.nearArcade === n) {
                        this.nearArcade = 0;
                    }
                });

                // Setup mysterious stranger trigger
                this.currentLocation.setupStrangerTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Right-click to approach the stranger...', 4000);
                        this.nearStranger = true;
                    } else {
                        this.nearStranger = false;
                        if (this.dialogueOpen) this.closeDialogue();
                    }
                });

                this.currentLocation.setupEyeTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Right-click to speak with The Iris...', 4000);
                        this.nearEye = true;
                    } else {
                        this.nearEye = false;
                        if (this.dialogueOpen) this.closeDialogue();
                    }
                });

                // Setup back door trigger
                this.currentLocation.setupBackDoorTrigger((event) => {
                    if (event === 'enter') {
                        const hasKey = this.inventory.some(i => i.name === 'OldKey');
                        if (hasKey) {
                            this.showHint('Back hall door unlocking...', 1500);
                            this._queueLocation('backhall');
                        } else {
                            this.showHint('Locked. The man on the bench may know where the key went.', 3500);
                        }
                        this.nearBackDoor = true;
                    } else {
                        this.nearBackDoor = false;
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

            case 'lavacave':
                this.activity.caveVisits++;
                this.currentLocation = new LavaCaveScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupMoneyPickups(this.collectedBills, (id) => this.collectBill(id));
                this.currentLocation.setupExitTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Cave exit opening...', 1500);
                        this.nearCaveExit = true;
                        this._queueLocation('exterior');
                    } else {
                        this.nearCaveExit = false;
                    }
                });
                this.currentLocation.setupPortalTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Press E to enter Doodle Jump!', 5000);
                        this.nearPortal = true;
                    } else {
                        this.nearPortal = false;
                    }
                });
                this.player.floorY = -Infinity; // Allow falling into the lava
                const caveSpawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(caveSpawn.x, caveSpawn.y, caveSpawn.z);
                // Spawn looking along the parkour route toward the portal.
                this.player.cameraYaw = Math.PI;
                this.cameraInitialized = false;
                this.setLocationUI('Lava Cave');
                this.showHint("Don't fall in the lava!", 4000);
                break;

            case 'backhall':
                this.currentLocation = new BackHallScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupExitTrigger(event => {
                    this.nearHallExit = event === 'enter';
                    if (this.nearHallExit) {
                        this.showHint('Lobby doors opening...', 1500);
                        this._queueLocation('lobby');
                    }
                });
                this.currentLocation.setupTheaterTriggers((event, n, title) => {
                    if (event === 'enter') {
                        this.nearHallTheater = n;
                        this.showHint(`Screen ${n}: ${title} — doors opening...`, 1500);
                        this._queueTheaterEntry(n);
                    } else if (this.nearHallTheater === n) {
                        this.nearHallTheater = 0;
                    }
                });
                this.currentLocation.setupPoliceTrigger(event => {
                    this.nearPolice = event === 'enter';
                    if (this.nearPolice) this.showHint('Right-click to speak with Cinema Security', 4000);
                });
                this.currentLocation.setupConcessionTrigger(event => {
                    this.nearConcession = event === 'enter';
                    if (this.nearConcession) {
                        this.showHint('Right-click to order from Benny at the back-hall concession line', 4000);
                    } else if (this.dialogueOpen) {
                        this.closeDialogue();
                    }
                });
                this.currentLocation.setupArcadeTriggers((event, n) => {
                    const names = ['', 'Slot Machine', 'Hi-Lo', 'Plinko'];
                    if (event === 'enter') {
                        this.nearArcade = n;
                        this.showHint(`Press E to play the built-in ${names[n]} cabinet`, 4000);
                    } else if (this.nearArcade === n) {
                        this.nearArcade = 0;
                    }
                });
                {
                    const hallSpawn = this.currentLocation.getSpawnPoint();
                    this.player.setPosition(hallSpawn.x, hallSpawn.y, hallSpawn.z);
                }
                this.player.cameraYaw = Math.PI;
                this.cameraInitialized = false;
                this.setLocationUI('Back Hall • Screens 1–4');
                this.showHint('Screens, concessions, bar and arcade are down this hall.', 5000);
                break;

            case 'jail':
                this.currentLocation = new JailScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupBailTrigger(event => {
                    this.nearJailBail = event === 'enter';
                    if (this.nearJailBail) this.showHint('Press U with 💵 selected to pay $10 bail', 5000);
                });
                this.currentLocation.setupEscapeTrigger(event => {
                    this.nearJailEscape = event === 'enter';
                    if (this.nearJailEscape) this.showHint('Press SPACE to crawl through the escape vent', 5000);
                });
                {
                    const jailSpawn = this.currentLocation.getSpawnPoint();
                    this.player.setPosition(jailSpawn.x, jailSpawn.y, jailSpawn.z);
                }
                this.player.cameraYaw = Math.PI;
                this.cameraInitialized = false;
                this.setLocationUI('Cinema Security Holding Cell');
                this.showHint('Pay bail or double-jump to the raised escape vent.', 6000);
                break;

            case 'theater4':
                this.currentLocation = new TheaterRoomScene(this.scene, {
                    title: 'Snake Game',
                    url: '../snakeGame.html',
                    color: 0x55fc77,
                    description: 'A multiplayer snake game'
                });
                this.currentLocation.build();
                this.currentLocation.setupSeatTriggers(
                    (seat) => { this.nearSeat = seat; this.showHint('Press E to sit', 5000); },
                    () => { if (!this.isSitting) { this.nearSeat = null; this.clearHint(); } }
                );

                this.currentLocation.setupScreenTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Press E to play Snake Game!', 5000);
                        this.nearScreen = true;
                    } else {
                        this.nearScreen = false;
                    }
                });

                this.currentLocation.setupExitTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Exit doors opening...', 1500);
                        this.nearTheaterExit = true;
                        this._queueLocation('backhall');
                    } else {
                        this.nearTheaterExit = false;
                    }
                });

                const theater4Spawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(theater4Spawn.x, theater4Spawn.y, theater4Spawn.z);
                this.player.cameraYaw = Math.PI;
                this.cameraInitialized = false;

                this.setLocationUI('Theater 4: Snake Game');
                this.showHint('Walk toward the screen to play!', 4000);
                break;

            case 'theater3':
                this.currentLocation = new TheaterRoomScene(this.scene, {
                    title: 'Stick Soccer',
                    url: '../stick/index.html',
                    color: 0x44ff88,
                    description: 'A stick figure soccer game'
                });
                this.currentLocation.build();
                this.currentLocation.setupSeatTriggers(
                    (seat) => { this.nearSeat = seat; this.showHint('Press E to sit', 5000); },
                    () => { if (!this.isSitting) { this.nearSeat = null; this.clearHint(); } }
                );

                this.currentLocation.setupScreenTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Press E to play Stick Soccer!', 5000);
                        this.nearScreen = true;
                    } else {
                        this.nearScreen = false;
                    }
                });

                this.currentLocation.setupExitTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Exit doors opening...', 1500);
                        this.nearTheaterExit = true;
                        this._queueLocation('backhall');
                    } else {
                        this.nearTheaterExit = false;
                    }
                });

                const theater3Spawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(theater3Spawn.x, theater3Spawn.y, theater3Spawn.z);
                this.player.cameraYaw = Math.PI;
                this.cameraInitialized = false;

                this.setLocationUI('Theater 3: Stick Soccer');
                this.showHint('Walk toward the screen to play!', 4000);
                break;

            case 'theater2':
                this.currentLocation = new TheaterRoomScene(this.scene, {
                    title: 'Blast Block',
                    url: '../blastblock.html',
                    color: 0x44aaff,
                    description: 'A block blasting puzzle game'
                });
                this.currentLocation.build();
                this.currentLocation.setupSeatTriggers(
                    (seat) => { this.nearSeat = seat; this.showHint('Press E to sit', 5000); },
                    () => { if (!this.isSitting) { this.nearSeat = null; this.clearHint(); } }
                );

                this.currentLocation.setupScreenTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Press E to play Blast Block!', 5000);
                        this.nearScreen = true;
                    } else {
                        this.nearScreen = false;
                    }
                });

                this.currentLocation.setupExitTrigger((approaching) => {
                    if (approaching) {
                        this.showHint('Exit doors opening...', 1500);
                        this.nearTheaterExit = true;
                        this._queueLocation('backhall');
                    } else {
                        this.nearTheaterExit = false;
                    }
                });

                const theater2Spawn = this.currentLocation.getSpawnPoint();
                this.player.setPosition(theater2Spawn.x, theater2Spawn.y, theater2Spawn.z);
                this.player.cameraYaw = Math.PI;
                this.cameraInitialized = false;

                this.setLocationUI('Theater 2: Blast Block');
                this.showHint('Walk toward the screen to play!', 4000);
                break;

            case 'theater1':
                this.currentLocation = new TheaterRoomScene(this.scene, {
                    title: 'Age of War',
                    url: '../ageOfWar.html',
                    color: 0xff6644,
                    description: 'A strategy battle game'
                });
                this.currentLocation.build();
                this.currentLocation.setupSeatTriggers(
                    (seat) => { this.nearSeat = seat; this.showHint('Press E to sit', 5000); },
                    () => { if (!this.isSitting) { this.nearSeat = null; this.clearHint(); } }
                );

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
                        this.showHint('Exit doors opening...', 1500);
                        this.nearTheaterExit = true;
                        this._queueLocation('backhall');
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
        this.composer.setSize(window.innerWidth, window.innerHeight);
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

        // Doorways are intentional player routes, but the orbit camera should
        // stay within the room. Physical colliders then pull it in front of
        // walls, counters, and columns that lie between it and the player.
        const roomBounds = this.currentLocation?.getCameraBounds?.();
        const boundedTargetPos = Collision.clampCameraToBounds(targetPos, roomBounds);
        const safeTargetPos = Collision.clipCamera(targetLookAt, boundedTargetPos);

        // Initialize camera position on first frame
        if (!this.cameraInitialized) {
            this.cameraCurrentPos.copy(safeTargetPos);
            this.cameraCurrentLookAt.copy(targetLookAt);
            this.cameraInitialized = true;
        }

        // Smooth interpolation (frame-rate independent)
        // Exponential damping gives the same natural camera response at every
        // frame rate.  The previous power curve snapped almost fully each
        // frame and made small mouse motions feel twitchy.
        const smoothFactor = 1 - Math.exp(-dt * (7 + this.cameraSmoothing * 20));

        this.cameraCurrentPos.lerp(safeTargetPos, smoothFactor);
        this.cameraCurrentLookAt.lerp(targetLookAt, smoothFactor);

        // Smoothing must not let a formerly valid position slide through a
        // wall immediately after the player changes direction.
        const boundedCurrentPos = Collision.clampCameraToBounds(this.cameraCurrentPos, roomBounds);
        this.cameraCurrentPos.copy(Collision.clipCamera(targetLookAt, boundedCurrentPos));

        // Apply to camera
        this.camera.position.copy(this.cameraCurrentPos);
        this.camera.lookAt(this.cameraCurrentLookAt);
    }

    update(dt) {
        // Dumpster cinematic — skip all normal physics/input
        if (this.dumpsterAnim !== null) {
            this._updateDumpsterAnim(dt);
            this.updateCamera(dt);
            if (this.currentLocation?.update) this.currentLocation.update(dt, this.player.getPosition());
            return;
        }

        // Arcade or full game overlay open — freeze player, keep scene animating.
        if (this.arcadeOpen || this.gameOpen) {
            if (this.currentLocation?.update) this.currentLocation.update(dt, this.player.getPosition());
            this.updateCamera(dt);
            return;
        }

        // Update player
        this.player.update(dt);

        // Collision triggers request transitions; applying them after the
        // trigger scan avoids mutating collider lists mid-iteration.
        if (this._pendingLocation) {
            const nextLocation = this._pendingLocation;
            this._pendingLocation = null;
            this.loadLocation(nextLocation);
            return;
        }

        // Lock camera during dialogue
        if (this.dialogueOpen && this._dialogueLockYaw !== undefined) {
            this.player.cameraYaw = this._dialogueLockYaw;
        }

        // Sitting: lock player in place and handle stand-up
        if (this.isSitting) {
            const sp = this.currentSeatPos;
            this.player.mesh.position.set(sp.x, sp.seatY ?? 0, sp.z);
            this.player.velocity.set(0, 0, 0);
            // Lock both camera yaw and mesh rotation — override whatever player.update() changed
            this.player.cameraYaw = sp.camYaw ?? Math.PI;
            this.player.mesh.rotation.y = sp.meshRot ?? Math.PI;
            this.updateCamera(dt);
            if (this.currentLocation && this.currentLocation.update) {
                this.currentLocation.update(dt, this.player.getPosition());
            }
            if (Input.isKeyJustPressed('KeyE')) this.standUp();
            if (Input.isKeyJustPressed('Space')) this.launchGame();
            return;
        }

        // Update current location (pass player position for interactive elements)
        if (this.currentLocation && this.currentLocation.update) {
            this.currentLocation.update(dt, this.player.getPosition());
        }

        // Update camera
        this.updateCamera(dt);

        // Scroll wheel — cycle selected inventory slot (cooldown prevents runaway scrolling)
        if (this._scrollCooldown > 0) this._scrollCooldown -= dt;
        if (Input.scroll.delta !== 0 && this._scrollCooldown <= 0) {
            const dir = Input.scroll.delta > 0 ? 1 : -1;
            this.selectedSlot = (this.selectedSlot + dir + 8) % 8;
            this._onSlotSelected();
            this._scrollCooldown = 0.4;
        }

        // Dialogue takes priority — block all other interaction input
        if (this.dialogueOpen) {
            this.handleDialogueInput();
            return;
        }

        // Pending purchase: press U to pay, Escape to cancel
        if (this.pendingPurchase && Input.isKeyJustPressed('Escape')) {
            this.pendingPurchase = null;
            this.showHint("Purchase cancelled.", 1500);
        }

        // Check for door entry (space near door)
        if (this.nearDoor && Input.isKeyJustPressed('Space')) {
            this.loadLocation('lobby');
        }

        if (this.nearPoster && Input.isKeyJustPressed('Space')) {
            this.launchGame(this.nearPoster.url, this.nearPoster.title);
        }

        // Check for dumpster / lava cave entry
        if (this.nearDumpster && Input.isKeyJustPressed('Space')) {
            this._startDumpsterAnim();
        }

        // Check for cave exit
        if (this.nearCaveExit && Input.isKeyJustPressed('Space')) {
            this.loadLocation('exterior');
        }

        // Check for portal interaction (E to launch Doodle Jump)
        if (this.nearPortal && Input.isKeyJustPressed('KeyE')) {
            this.launchGame();
        }

        // NPC conversations use the secondary mouse button. E stays reserved
        // for gameplay actions such as minigames, seating, and dialogue choices.
        const npcTalkRequested = Input.isMouseButtonJustPressed('right');

        // Check for ticket seller interaction
        if (this.nearTicket && npcTalkRequested) {
            this._openTicketConversation();
        }

        // Check for check-in clerk interaction
        if (this.nearCheckIn && npcTalkRequested) {
            this._openCheckInConversation();
        }

        // Check for concession stand interaction
        if (this.nearConcession && npcTalkRequested) {
            this._openConcessionConversation();
        }

        // Arcade minigames
        if (this.nearArcade && Input.isKeyJustPressed('KeyE')) {
            this._openArcadeGame(this.nearArcade);
        }

        // Mysterious stranger
        if (this.nearStranger && npcTalkRequested) {
            this._openStrangerConversation();
        }

        if (this.nearEye && npcTalkRequested) {
            this._openIrisConversation();
        }

        if (this.nearPolice && npcTalkRequested) {
            this._openPoliceConversation();
        }

        // Back door
        if (this.nearBackDoor && Input.isKeyJustPressed('KeyE')) {
            this._useKeyOnBackDoor();
        }

        if (this.nearHallExit && Input.isKeyJustPressed('Space')) {
            this.loadLocation('lobby');
        }

        // Guests may sneak into a screening without a ticket, but The Iris
        // records it and Officer Vale enforces the consequence in the hall.
        if (this.nearHallTheater && Input.isKeyJustPressed('KeyE') && this.tickets === 0) {
            const theater = `theater${this.nearHallTheater}`;
            this.activity.unpaidMovies.add(theater);
            this.updateObjectiveUI();
            this.loadLocation(theater);
        }

        if (this.nearJailEscape && Input.isKeyJustPressed('Space')) {
            this.activity.unpaidMovies.clear();
            this.loadLocation('exterior');
            this.showHint('You escaped through the vent. The Iris saw that too.', 5000);
        }

        if (this.nearJailBail && Input.isKeyJustPressed('KeyU') && this.selectedSlot === 0) {
            if (this.currency >= 10) {
                this.currency -= 10;
                this.activity.bailPaid += 10;
                this.activity.unpaidMovies.clear();
                this.updateWalletUI();
                this.loadLocation('lobby');
                return;
            }
            this.showHint('You need $10 for bail. Try the raised escape vent.', 4000);
        }

        // Death zones
        const pos = this.player.getPosition();
        if (this.locationName === 'lavacave' && pos.y < -1) {
            this.die();
        }
        if (this.locationName === 'exterior' && pos.y < -10) {
            this.die();
        }

        // Check for lobby exit (space near exit)
        if (this.nearExit && Input.isKeyJustPressed('Space')) {
            this.loadLocation('exterior');
        }

        // Seat interaction (priority over screen launch)
        if (this.nearSeat && Input.isKeyJustPressed('KeyE')) {
            this.sitDown();
        }

        // Check for screen interaction (E to play game) — only if not near a seat
        if (this.nearScreen && !this.nearSeat && Input.isKeyJustPressed('KeyE')) {
            this.launchGame();
        }

        // Check for theater exit
        if (this.nearTheaterExit && Input.isKeyJustPressed('Space')) {
            this.loadLocation('backhall');
        }

        // U — use selected item (context-sensitive)
        if (Input.isKeyJustPressed('KeyU')) {
            if (this.pendingPurchase) {
                // Pay with money slot
                if (this.selectedSlot === 0) {
                    if (this.currency >= this.pendingPurchase.cost) {
                        this.currency -= this.pendingPurchase.cost;
                        this.updateWalletUI();
                        this.pendingPurchase.onConfirm();
                    } else {
                        this.showHint("Not enough money!", 2000);
                    }
                    this.pendingPurchase = null;
                } else {
                    this.showHint("Select 💵 and press U to pay!", 2500);
                }
            } else if (this.selectedSlot === 1) {
                // Use ticket to enter a theater
                if (this.tickets === 0) {
                    this.showHint('You need a ticket! Buy one from the booth outside.', 4000);
                } else if (this.nearTheater1) {
                    this.tickets--; this.updateWalletUI(); this.loadLocation('theater1');
                } else if (this.nearTheater2) {
                    this.tickets--; this.updateWalletUI(); this.loadLocation('theater2');
                } else if (this.nearTheater3) {
                    this.tickets--; this.updateWalletUI(); this.loadLocation('theater3');
                } else if (this.nearTheater4) {
                    this.tickets--; this.updateWalletUI(); this.loadLocation('theater4');
                } else if (this.nearHallTheater) {
                    const theater = `theater${this.nearHallTheater}`;
                    this.tickets--;
                    this.activity.moviesAttended.add(theater);
                    this.updateWalletUI();
                    this.loadLocation(theater);
                }
            } else {
                // Eat selected food item
                const foodIdx = this.selectedSlot - 2;
                if (foodIdx >= 0 && foodIdx < this.inventory.length) {
                    this.useItem(this.inventory[foodIdx].name);
                }
            }
        }
    }

    launchGame(urlOverride = null, titleOverride = null) {
        const url = urlOverride || this.currentLocation?.getGameUrl?.();
        if (!url || this.gameOpen) return;

        const title = titleOverride || this.currentLocation?.gameConfig?.title || 'Featured Game';
        this._gameReturnSeat = this.isSitting && this.currentSeatPos
            ? { ...this.currentSeatPos }
            : null;
        this.activity.gamesPlayed.add(title);
        if (this.locationName.startsWith('theater')) {
            this.activity.moviesAttended.add(this.locationName);
        }
        this._checkProgressRewards();

        document.exitPointerLock();
        this.gameOpen = true;
        this.uiElements.clickPrompt.classList.add('hidden');
        this.uiElements.gameTitle.textContent = `NOW PLAYING — ${title.toUpperCase()}`;
        this.uiElements.gameFrame.src = url;
        this.uiElements.gameOverlay.style.display = 'block';
        this.uiElements.gameOverlay.setAttribute('aria-hidden', 'false');
    }

    closeGame() {
        if (!this.gameOpen) return;
        this.gameOpen = false;
        this.uiElements.gameFrame.src = 'about:blank';
        this.uiElements.gameOverlay.style.display = 'none';
        this.uiElements.gameOverlay.setAttribute('aria-hidden', 'true');
        if (this._gameReturnSeat) {
            this.isSitting = true;
            this.currentSeatPos = { ...this._gameReturnSeat };
            this.player.setSitting(true);
            this.showHint('Back in your seat • Space plays • E stands', 5000);
        } else {
            this.showHint('Welcome back to the cinema.', 2000);
        }
        this._gameReturnSeat = null;
        this.renderer.domElement.requestPointerLock();
    }

    _checkProgressRewards() {
        const played = this.activity.gamesPlayed.size;
        if (played >= 1 && !this.unlockedRewards.has('First Screening')) {
            this.unlockedRewards.add('First Screening');
            this.currency += 5;
            this.updateWalletUI();
            this.showHint('Unlocked: First Screening badge + $5', 3500);
        }
        if (played >= 3 && !this.unlockedRewards.has('Critic Pass')) {
            this.unlockedRewards.add('Critic Pass');
            this.addToInventory('CriticPass');
            this.showHint('Unlocked: Critic Pass — The Iris noticed.', 4000);
        }
    }

    _startDumpsterAnim() {
        const player = this.player;
        this.clearHint();
        this._preAnimSmoothing = this.cameraSmoothing;
        this.cameraSmoothing = 0.25;

        this.dumpsterAnim = {
            elapsed: 0,
            phase: 'arc',
            arcDuration: 0.45,
            shrinkDuration: 0.20,
            startPos: player.mesh.position.clone(),
            targetPos: new THREE.Vector3(-14, 3.1, -4),
            arcPeakY: Math.max(player.mesh.position.y, 3.1) + 4.5,
            spinStartY: player.mesh.rotation.y,
            spinTotalRad: Math.PI * 4,
            lidHinge: this.currentLocation.dumpsterLidHinge,
            lidRestX: this.currentLocation.dumpsterLidRestX,
            lidSlamT: 0.85,
        };
    }

    _updateDumpsterAnim(dt) {
        const a = this.dumpsterAnim;
        const player = this.player;
        a.elapsed += dt;

        if (a.phase === 'arc') {
            const t = Math.min(a.elapsed / a.arcDuration, 1.0);
            const inv = 1 - t;

            // Quadratic Bezier arc
            player.mesh.position.x = a.startPos.x + (a.targetPos.x - a.startPos.x) * t;
            player.mesh.position.z = a.startPos.z + (a.targetPos.z - a.startPos.z) * t;
            player.mesh.position.y = inv * inv * a.startPos.y
                                   + 2 * inv * t * a.arcPeakY
                                   + t * t * a.targetPos.y;

            // Spin
            player.mesh.rotation.y = a.spinStartY + a.spinTotalRad * t;

            // Lid slams shut over the last 15% of the arc
            if (t >= a.lidSlamT && a.lidHinge) {
                const lidT = (t - a.lidSlamT) / (1.0 - a.lidSlamT);
                a.lidHinge.rotation.x = a.lidRestX + (0 - a.lidRestX) * lidT;
            }

            if (a.elapsed >= a.arcDuration) {
                a.elapsed -= a.arcDuration;
                a.phase = 'shrink';
                player.mesh.position.copy(a.targetPos);
            }

        } else if (a.phase === 'shrink') {
            const t = Math.min(a.elapsed / a.shrinkDuration, 1.0);

            // Ease-in cubic: slow start, fast pull-in
            const s = 1.0 - t * t * t;
            player.mesh.scale.set(s, s, s);

            // Lid bounces back open
            if (a.lidHinge) {
                if (t < 0.5) {
                    a.lidHinge.rotation.x = (a.lidRestX - 0.26) * (t / 0.5);
                } else {
                    a.lidHinge.rotation.x = (a.lidRestX - 0.26) + 0.26 * ((t - 0.5) / 0.5);
                }
            }

            if (a.elapsed >= a.shrinkDuration) a.phase = 'done';
        }

        if (a.phase === 'done') this._endDumpsterAnim();
    }

    _endDumpsterAnim() {
        this.player.mesh.scale.set(1, 1, 1);
        this.cameraSmoothing = this._preAnimSmoothing ?? 0.08;
        this.dumpsterAnim = null;
        this.loadLocation('lavacave');
    }

    _openArcadeGame(n) {
        if (this.currency < 5) { this.showHint('Not enough money to play!', 2500); return; }
        document.exitPointerLock();
        this.uiElements.clickPrompt.classList.add('hidden');
        this.arcadeOpen = true;
        if (n === 1) this._openSlotMachine();
        else if (n === 2) this._openHiLo();
        else if (n === 3) this._openPlinko();
    }

    _closeArcadePanel(id) {
        document.getElementById(id).style.display = 'none';
        this.arcadeOpen = false;
        this.renderer.domElement.requestPointerLock();
    }

    _openSlotMachine() {
        const panel = document.getElementById('arcade-slot');
        panel.style.display = 'block';
        document.getElementById('slot-result').textContent = '';
        document.getElementById('arcade-slot-close').onclick = () => this._closeArcadePanel('arcade-slot');

        document.getElementById('slot-spin-btn').onclick = () => {
            const SYMS = ['💎', '7️⃣', '🍒', '🍋', '⭐'];
            const bet = parseInt(document.getElementById('slot-bet').value);
            if (this.currency < bet) {
                const r = document.getElementById('slot-result');
                r.textContent = 'Not enough money!'; r.style.color = '#ff6666'; return;
            }
            this.currency -= bet;
            this.updateWalletUI();

            const r1 = document.getElementById('slot-r1');
            const r2 = document.getElementById('slot-r2');
            const r3 = document.getElementById('slot-r3');
            const btn = document.getElementById('slot-spin-btn');
            const result = document.getElementById('slot-result');
            btn.disabled = true;
            result.textContent = '';

            const finals = [SYMS[Math.floor(Math.random() * 5)], SYMS[Math.floor(Math.random() * 5)], SYMS[Math.floor(Math.random() * 5)]];
            let t1 = 0, t2 = 0, t3 = 0;
            const spin1 = setInterval(() => { r1.textContent = SYMS[t1++ % 5]; }, 70);
            const spin2 = setInterval(() => { r2.textContent = SYMS[t2++ % 5]; }, 70);
            const spin3 = setInterval(() => { r3.textContent = SYMS[t3++ % 5]; }, 70);

            setTimeout(() => { clearInterval(spin1); r1.textContent = finals[0]; }, 650);
            setTimeout(() => { clearInterval(spin2); r2.textContent = finals[1]; }, 950);
            setTimeout(() => {
                clearInterval(spin3); r3.textContent = finals[2];
                let payout = 0;
                if (finals[0] === finals[1] && finals[1] === finals[2]) {
                    if (finals[0] === '💎') payout = bet * 10;
                    else if (finals[0] === '7️⃣') payout = bet * 5;
                    else payout = bet * 3;
                    result.textContent = `🎉 JACKPOT! Won $${payout}!`;
                    result.style.color = '#ffd700';
                } else if (finals[0] === finals[1] || finals[1] === finals[2] || finals[0] === finals[2]) {
                    payout = Math.floor(bet * 0.5);
                    result.textContent = payout > 0 ? `Partial match — got back $${payout}` : 'Partial match!';
                    result.style.color = '#aaa';
                } else {
                    result.textContent = `No match. Lost $${bet}`;
                    result.style.color = '#ff6666';
                }
                this.currency += payout;
                this.updateWalletUI();
                btn.disabled = false;
            }, 1250);
        };
    }

    _openHiLo() {
        const panel = document.getElementById('arcade-hilo');
        panel.style.display = 'block';
        document.getElementById('arcade-hilo-close').onclick = () => this._closeArcadePanel('arcade-hilo');

        const state = { active: false, currentCard: 0, pot: 0 };
        const cardNames = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const suits = ['♠', '♥', '♦', '♣'];
        const randCard = () => Math.floor(Math.random() * 13) + 1;
        const cardStr = (v) => `${cardNames[v]}${suits[Math.floor(Math.random() * 4)]}`;

        const cardEl = document.getElementById('hilo-card-display');
        const potEl = document.getElementById('hilo-pot-display');
        const resultEl = document.getElementById('hilo-result');
        const startBtn = document.getElementById('hilo-start-btn');
        const higherBtn = document.getElementById('hilo-higher-btn');
        const lowerBtn = document.getElementById('hilo-lower-btn');
        const cashoutBtn = document.getElementById('hilo-cashout-btn');

        cardEl.textContent = '?';
        potEl.textContent = 'Pot: $0';
        resultEl.textContent = '';

        const setActive = (active) => {
            state.active = active;
            startBtn.style.display = active ? 'none' : 'inline-block';
            higherBtn.style.display = active ? 'inline-block' : 'none';
            lowerBtn.style.display = active ? 'inline-block' : 'none';
            cashoutBtn.style.display = active ? 'inline-block' : 'none';
        };
        setActive(false);

        startBtn.onclick = () => {
            if (this.currency < 10) { resultEl.textContent = 'Need $10 to start!'; resultEl.style.color = '#ff6666'; return; }
            this.currency -= 10;
            state.pot = 10;
            state.currentCard = randCard();
            cardEl.textContent = cardStr(state.currentCard);
            potEl.textContent = `Pot: $${state.pot}`;
            resultEl.textContent = '';
            this.updateWalletUI();
            setActive(true);
        };

        const guess = (higher) => {
            const next = randCard();
            const tied = next === state.currentCard;
            const correct = higher ? next > state.currentCard : next < state.currentCard;
            state.currentCard = next;
            cardEl.textContent = cardStr(next);
            if (tied) {
                resultEl.textContent = 'Tie — no change!';
                resultEl.style.color = '#aaa';
            } else if (correct) {
                state.pot = Math.floor(state.pot * 1.8);
                potEl.textContent = `Pot: $${state.pot}`;
                resultEl.textContent = '✓ Correct!';
                resultEl.style.color = '#55fc77';
            } else {
                resultEl.textContent = `✗ Wrong! Lost $${state.pot}`;
                resultEl.style.color = '#ff6666';
                state.pot = 0;
                potEl.textContent = 'Pot: $0';
                setActive(false);
                cardEl.textContent = '?';
            }
        };

        higherBtn.onclick = () => guess(true);
        lowerBtn.onclick = () => guess(false);
        cashoutBtn.onclick = () => {
            if (state.pot > 0) {
                this.currency += state.pot;
                this.updateWalletUI();
                resultEl.textContent = `💰 Cashed out $${state.pot}!`;
                resultEl.style.color = '#ffd700';
            }
            state.pot = 0;
            potEl.textContent = 'Pot: $0';
            setActive(false);
            cardEl.textContent = '?';
        };
    }

    _openPlinko() {
        const panel = document.getElementById('arcade-plinko');
        panel.style.display = 'block';
        document.getElementById('arcade-plinko-close').onclick = () => this._closeArcadePanel('arcade-plinko');
        document.getElementById('plinko-result').textContent = '';
        this._renderPlinkoBoard(-1, 3);

        document.getElementById('plinko-drop-btn').onclick = () => {
            const bet = parseInt(document.getElementById('plinko-bet').value);
            if (this.currency < bet) {
                const r = document.getElementById('plinko-result');
                r.textContent = 'Not enough money!'; r.style.color = '#ff6666'; return;
            }
            this.currency -= bet;
            this.updateWalletUI();

            const btn = document.getElementById('plinko-drop-btn');
            btn.disabled = true;
            document.getElementById('plinko-result').textContent = '';

            let col = 3;
            const path = [{ step: -1, col }];
            for (let r = 0; r < 6; r++) {
                col = Math.max(0, Math.min(6, col + (Math.random() < 0.5 ? -1 : 1)));
                path.push({ step: r, col });
            }
            path.push({ step: 6, col });

            let i = 0;
            const animate = () => {
                this._renderPlinkoBoard(path[i].step, path[i].col);
                i++;
                if (i < path.length) {
                    setTimeout(animate, 210);
                } else {
                    const multipliers = [0, 0.5, 1, 3, 1, 0.5, 0];
                    const finalCol = path[path.length - 1].col;
                    const won = Math.floor(bet * multipliers[finalCol]);
                    this.currency += won;
                    this.updateWalletUI();
                    const resultEl = document.getElementById('plinko-result');
                    if (won === 0) {
                        resultEl.textContent = `Bust! Lost $${bet}`;
                        resultEl.style.color = '#ff6666';
                    } else if (won > bet) {
                        resultEl.textContent = `Won $${won}! (+$${won - bet})`;
                        resultEl.style.color = '#ffd700';
                    } else if (won === bet) {
                        resultEl.textContent = `Break even — got $${won} back`;
                        resultEl.style.color = '#aaa';
                    } else {
                        resultEl.textContent = `Partial — got $${won} back`;
                        resultEl.style.color = '#aaa';
                    }
                    btn.disabled = false;
                }
            };
            animate();
        };
    }

    _renderPlinkoBoard(discStep, discCol) {
        const multipliers = [0, 0.5, 1, 3, 1, 0.5, 0];
        let html = '<div class="plinko-board">';

        // Disc starting position row (above board)
        html += '<div class="plinko-row">';
        for (let c = 0; c < 7; c++) {
            html += discStep === -1 && c === discCol
                ? '<span style="color:#ffd700">●</span>'
                : '<span style="color:transparent">●</span>';
        }
        html += '</div>';

        // Peg rows
        for (let r = 0; r < 6; r++) {
            html += '<div class="plinko-row">';
            for (let c = 0; c < 7; c++) {
                html += discStep === r && c === discCol
                    ? '<span style="color:#ffd700;font-size:20px">●</span>'
                    : '<span style="color:#444">·</span>';
            }
            html += '</div>';
        }

        // Slot labels
        html += '<div class="plinko-slots">';
        multipliers.forEach((m, c) => {
            const active = discStep === 6 && c === discCol;
            const cls = m === 3 ? 'plinko-slot plinko-slot-jackpot' : (m === 0 ? 'plinko-slot plinko-slot-bust' : 'plinko-slot');
            const style = active ? 'outline:2px solid #ffd700' : '';
            html += `<span class="${cls}" style="${style}">${m}×</span>`;
        });
        html += '</div></div>';

        document.getElementById('plinko-board-container').innerHTML = html;
    }

    run = () => {
        const currentTime = performance.now();
        Settings.dt = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;

        const dt = Math.min(Settings.dt, 0.1);

        this.update(dt);

        this.composer.render();

        Input.endFrame();

        requestAnimationFrame(this.run);
    }
}
