import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Settings } from '../settings.js';
import { Input } from '../input.js';
import { Collision } from './collision.js';
import { Player } from './player.js';
import { ExteriorScene } from './locations/exterior.js';
import { LobbyScene } from './locations/lobby.js';
import { TheaterRoomScene } from './locations/theaterRoom.js';
import { LavaCaveScene } from './locations/lavaCaveScene.js';

export class TheaterGame {
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

        // Sitting state
        this.isSitting = false;
        this.nearSeat = null;
        this.currentSeatPos = null;

        // Arcade state
        this.nearArcade = 0;
        this.arcadeOpen = false;

        // Dumpster animation state
        this.dumpsterAnim = null;

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
                #currency {
                    position: absolute;
                    bottom: 20px;
                    left: 20px;
                    background: rgba(0,0,0,0.65);
                    color: #ffd700;
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: bold;
                    backdrop-filter: blur(8px);
                    letter-spacing: 0.5px;
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
            </style>
            <div id="topbar">
                <h1>🎬 Kai's Cinema</h1>
                <p><b>WASD</b> Move • <b>Mouse</b> Look • <b>Space</b> Jump/Interact • <b>E</b> Play</p>
            </div>
            <div id="location">📍 Loading...</div>
            <div id="hint"></div>
            <div id="currency">$ 25  🎟 0</div>
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
        `;
        document.body.appendChild(ui);

        this.uiElements = {
            location: document.getElementById('location'),
            hint: document.getElementById('hint'),
            clickPrompt: document.getElementById('click-prompt'),
            currency: document.getElementById('currency'),
            dialoguePanel: document.getElementById('dialogue-panel'),
            dialogueSpeaker: document.getElementById('dialogue-speaker'),
            dialogueText: document.getElementById('dialogue-text'),
            dialogueOptions: document.getElementById('dialogue-options'),
        };

        // Hide prompt when mouse is locked
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.uiElements.clickPrompt.classList.add('hidden');
            } else if (!this.arcadeOpen) {
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
        this.uiElements.currency.textContent = `$ ${this.currency}  🎟 ${this.tickets}`;
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
    }

    closeDialogue() {
        this.dialogueOpen = false;
        this._dialogueLockYaw = undefined;
        this.uiElements.dialoguePanel.style.display = 'none';
        this._dialogueOptions = null;
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
        if (this.currency >= cost) {
            this.currency -= cost;
            this.tickets += count;
            this.updateWalletUI();
            this.closeDialogue();
            const ticketWord = count === 1 ? 'ticket' : 'tickets';
            this.showHint(`Bought ${count} ${ticketWord} for $${cost}!`, 2500);
        } else {
            this._transitionDialogue(
                '🎟️ Gerald the Ticket Seller',
                `"Hmm, you need $${cost} for that but you only have $${this.currency}.\nCan't help you there, friend."`,
                [
                    { key: 'Escape', label: '[Esc] Okay, goodbye', action: () => this.closeDialogue() },
                ]
            );
        }
    }

    _openCheckInConversation() {
        const pPos = this.player.getPosition();
        this._preDialogueDist = this.cameraDistance;
        this._preDialogueHeight = this.cameraHeight;
        this._preDialogueSmooth = this.cameraSmoothing;
        this._dialogueHasCamera = true;
        this.player.cameraYaw = Math.atan2(-20 - pPos.x, -2 - pPos.z);
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
            theater1: '"Age of War is in Theater 1!\nHead to the back-LEFT corner of the lobby.\nLook for the orange-red glowing arch — you can\'t miss it.\nIt radiates serious battle energy!"',
            theater2: '"Blast Block is in Theater 2!\nHead to the back-RIGHT corner of the lobby.\nFollow the blue glow down that hallway.\nPuzzle fans love it in there!"',
            theater3: '"Stick Soccer is in Theater 3!\nHead to the front-LEFT corner — follow the green arch.\nKick-off is whenever you walk through!"',
            theater4: '"Snake Game is in Theater 4!\nFront-RIGHT corner, mint-green arch.\nThe snake gets fast. Watch that tail!"',
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

    clearHint() {
        clearTimeout(this.hintTimeout);
        this.uiElements.hint.classList.remove('show');
    }

    sitDown() {
        this.isSitting = true;
        const s = this.nearSeat;
        this.currentSeatPos = { x: s.x, z: s.z, seatY: s.seatY, meshRot: s.meshRot, camYaw: s.camYaw };

        // Squish player to look seated
        this.player.mesh.scale.set(1.05, 0.72, 1.05);

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
        this.showHint('Press E to stand up', 9999999);
    }

    standUp() {
        this.isSitting = false;
        this.currentSeatPos = null;

        // Restore normal scale
        this.player.mesh.scale.set(1, 1, 1);

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
                        this.showHint('Press SPACE to enter the theater...', 5000);
                        this.nearDoor = true;
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
                        this.showHint('Press E to talk to the ticket seller...', 4000);
                        this.nearTicket = true;
                    } else {
                        this.nearTicket = false;
                        if (this.dialogueOpen) this.closeDialogue();
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
                        this.showHint('Press SPACE to exit to street...', 3000);
                        this.nearExit = true;
                    } else {
                        this.nearExit = false;
                    }
                });

                // Setup Theater 1 hallway trigger
                this.currentLocation.setupTheater1Trigger((event) => {
                    if (event === 'enter') {
                        const note = this.tickets > 0 ? '(uses 1 ticket)' : '— need a ticket!';
                        this.showHint(`Press SPACE to enter Theater 1: Age of War ${note}`, 4000);
                        this.nearTheater1 = true;
                    } else {
                        this.nearTheater1 = false;
                    }
                });

                // Setup Theater 2 hallway trigger
                this.currentLocation.setupTheater2Trigger((event) => {
                    if (event === 'enter') {
                        const note = this.tickets > 0 ? '(uses 1 ticket)' : '— need a ticket!';
                        this.showHint(`Press SPACE to enter Theater 2: Blast Block ${note}`, 4000);
                        this.nearTheater2 = true;
                    } else {
                        this.nearTheater2 = false;
                    }
                });

                // Setup Theater 3 hallway trigger
                this.currentLocation.setupTheater3Trigger((event) => {
                    if (event === 'enter') {
                        const note = this.tickets > 0 ? '(uses 1 ticket)' : '— need a ticket!';
                        this.showHint(`Press SPACE to enter Theater 3: Stick Soccer ${note}`, 4000);
                        this.nearTheater3 = true;
                    } else {
                        this.nearTheater3 = false;
                    }
                });

                // Setup Theater 4 hallway trigger
                this.currentLocation.setupTheater4Trigger((event) => {
                    if (event === 'enter') {
                        const note = this.tickets > 0 ? '(uses 1 ticket)' : '— need a ticket!';
                        this.showHint(`Press SPACE to enter Theater 4: Snake Game ${note}`, 4000);
                        this.nearTheater4 = true;
                    } else {
                        this.nearTheater4 = false;
                    }
                });

                // Setup check-in clerk trigger
                this.currentLocation.setupCheckInTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Press E to chat with the check-in clerk...', 4000);
                        this.nearCheckIn = true;
                    } else {
                        this.nearCheckIn = false;
                        if (this.dialogueOpen) this.closeDialogue();
                    }
                });

                // Setup arcade cabinet triggers
                this.currentLocation.setupArcadeTriggers((event, n) => {
                    const names = ['', 'Slot Machine', 'Hi-Lo', 'Plinko'];
                    if (event === 'enter') {
                        this.showHint(`Press E to play ${names[n]}!`, 4000);
                        this.nearArcade = n;
                    } else {
                        this.nearArcade = 0;
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
                this.currentLocation = new LavaCaveScene(this.scene);
                this.currentLocation.build();
                this.currentLocation.setupMoneyPickups(this.collectedBills, (id) => this.collectBill(id));
                this.currentLocation.setupExitTrigger((event) => {
                    if (event === 'enter') {
                        this.showHint('Press SPACE to crawl back out...', 4000);
                        this.nearCaveExit = true;
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
                this.player.cameraYaw = 0;
                this.cameraInitialized = false;
                this.setLocationUI('Lava Cave');
                this.showHint("Don't fall in the lava!", 4000);
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
                        this.showHint('Press SPACE to return to lobby...', 3000);
                        this.nearTheaterExit = true;
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
                        this.showHint('Press SPACE to return to lobby...', 3000);
                        this.nearTheaterExit = true;
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
                        this.showHint('Press SPACE to return to lobby...', 3000);
                        this.nearTheaterExit = true;
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
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCamera(dt) {
        const player = this.player;

        // Scroll wheel zoom — clamp between 3 (close) and 22 (far)
        if (Input.scroll.delta !== 0) {
            this.cameraDistance = Math.max(3, Math.min(22, this.cameraDistance + Input.scroll.delta * 0.01));
        }

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
        // Dumpster cinematic — skip all normal physics/input
        if (this.dumpsterAnim !== null) {
            this._updateDumpsterAnim(dt);
            this.updateCamera(dt);
            if (this.currentLocation?.update) this.currentLocation.update(dt, this.player.getPosition());
            return;
        }

        // Arcade overlay open — freeze player, keep scene animating
        if (this.arcadeOpen) {
            if (this.currentLocation?.update) this.currentLocation.update(dt, this.player.getPosition());
            this.updateCamera(dt);
            return;
        }

        // Update player
        this.player.update(dt);

        // Lock camera during dialogue
        if (this.dialogueOpen && this._dialogueLockYaw !== undefined) {
            this.player.cameraYaw = this._dialogueLockYaw;
        }

        // Sitting: lock player in place and handle stand-up
        if (this.isSitting) {
            const sp = this.currentSeatPos;
            this.player.mesh.position.set(sp.x, sp.seatY ?? 1.4, sp.z);
            this.player.velocity.set(0, 0, 0);
            this.player.mesh.rotation.y = this.player.cameraYaw;
            this.updateCamera(dt);
            if (this.currentLocation && this.currentLocation.update) {
                this.currentLocation.update(dt, this.player.getPosition());
            }
            if (Input.isKeyJustPressed('KeyE')) this.standUp();
            return;
        }

        // Update current location (pass player position for interactive elements)
        if (this.currentLocation && this.currentLocation.update) {
            this.currentLocation.update(dt, this.player.getPosition());
        }

        // Update camera
        this.updateCamera(dt);

        // Dialogue takes priority — block all other interaction input
        if (this.dialogueOpen) {
            this.handleDialogueInput();
            return;
        }

        // Check for door entry (space near door)
        if (this.nearDoor && Input.isKeyJustPressed('Space')) {
            this.loadLocation('lobby');
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

        // Check for ticket seller interaction
        if (this.nearTicket && Input.isKeyJustPressed('KeyE')) {
            this._openTicketConversation();
        }

        // Check for check-in clerk interaction
        if (this.nearCheckIn && Input.isKeyJustPressed('KeyE')) {
            this._openCheckInConversation();
        }

        // Arcade minigames
        if (this.nearArcade && Input.isKeyJustPressed('KeyE')) {
            this._openArcadeGame(this.nearArcade);
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

        // Check for theater 1 entry — costs 1 ticket
        if (this.nearTheater1 && Input.isKeyJustPressed('Space')) {
            if (this.tickets > 0) { this.tickets--; this.updateWalletUI(); this.loadLocation('theater1'); }
            else this.showHint('You need a ticket! Buy one from the booth outside.', 4000);
        }

        // Check for theater 2 entry — costs 1 ticket
        if (this.nearTheater2 && Input.isKeyJustPressed('Space')) {
            if (this.tickets > 0) { this.tickets--; this.updateWalletUI(); this.loadLocation('theater2'); }
            else this.showHint('You need a ticket! Buy one from the booth outside.', 4000);
        }

        // Check for theater 3 entry — costs 1 ticket
        if (this.nearTheater3 && Input.isKeyJustPressed('Space')) {
            if (this.tickets > 0) { this.tickets--; this.updateWalletUI(); this.loadLocation('theater3'); }
            else this.showHint('You need a ticket! Buy one from the booth outside.', 4000);
        }

        // Check for theater 4 entry — costs 1 ticket
        if (this.nearTheater4 && Input.isKeyJustPressed('Space')) {
            if (this.tickets > 0) { this.tickets--; this.updateWalletUI(); this.loadLocation('theater4'); }
            else this.showHint('You need a ticket! Buy one from the booth outside.', 4000);
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
