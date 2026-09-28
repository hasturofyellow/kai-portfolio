import { CINEMA_PROGRAM } from '../game/program.js';

export class CinemaUI {
    constructor(game, arcadeMarkup) {
        this.game = game;
        this.root = document.createElement('div');
        this.root.id = 'game-ui';
        this.root.innerHTML = `
            <header class="cinema-bar">
                <button class="wordmark" data-view="welcome" aria-label="Kai's Cinema welcome">
                    <span class="brand-mark" aria-hidden="true">K</span>
                    <span>Kai's Cinema<small>AN INTERACTIVE PORTFOLIO</small></span>
                </button>
                <nav aria-label="Cinema navigation">
                    <button data-view="program" class="nav-primary">The program <span aria-hidden="true">04</span></button>
                    <button data-travel="lobby">Lobby</button>
                    <button data-view="controls">Controls &amp; settings</button>
                </nav>
            </header>
            <div class="location-chip"><span class="live-dot" aria-hidden="true"></span><span id="location">Outside Theater</span></div>
            <a id="room-launch" class="room-launch" target="_blank" rel="noopener noreferrer" hidden>Open this game <span aria-hidden="true">↗</span></a>
            <div class="cinema-bottom">
                <div class="wallet"><small>ARCADE WALLET</small><span id="currency">$25 · 0 tickets</span></div>
                <p class="controls-hint"><kbd>W A S D</kbd> move <span>·</span> drag to look <span>·</span> <kbd>Esc</kbd> menu</p>
                <button class="quiet-button" data-view="controls">Need a hand?</button>
            </div>
            <div id="hint" role="status" aria-live="polite"></div>
            <div id="crosshair" aria-hidden="true"></div>
            <section id="dialogue-panel" role="dialog" aria-label="Character conversation">
                <div id="dialogue-speaker"></div><div id="dialogue-text"></div><div id="dialogue-options"></div>
                <button id="dialogue-close" class="quiet-button">Close conversation</button>
            </section>
            ${arcadeMarkup}
            <dialog id="cinema-menu" aria-label="Cinema menu">
                <div class="menu-top"><span class="eyebrow">KAI PARNES / INTERACTIVE PORTFOLIO</span><button class="icon-button" id="menu-close" aria-label="Close menu">×</button></div>
                <section data-panel="welcome">
                    <div class="welcome-grid">
                        <div class="welcome-copy">
                            <span class="edition">INDEPENDENT GAMES. ONE PLACE TO EXPLORE.</span>
                            <h1 id="welcome-title">Step inside.<br/>Find your next<br/><em>favorite game.</em></h1>
                            <p>A cinema built for curiosity. Explore the rooms, discover the details, and play the projects behind the posters.</p>
                            <div class="welcome-actions"><button class="button primary" data-travel="lobby">Enter the cinema <span aria-hidden="true">→</span></button><button class="button secondary" data-view="program">Browse the program</button></div>
                            <p class="welcome-note">Free visitor access. Explore at your own pace.</p>
                        </div>
                        <aside class="preview-stack" aria-label="A look at the program">
                            ${CINEMA_PROGRAM.slice(0, 3).map(p => `<button class="preview-card" data-room="${p.room}" aria-label="Visit ${p.title} theater"><img src="${p.image}" alt=""/><span><small>SCREEN ${p.number} / ${p.category}</small><strong>${p.title}</strong></span><span class="card-arrow" aria-hidden="true">↗</span></button>`).join('')}
                            <span class="preview-caption">FOUR SCREENS. FOUR DIFFERENT WORLDS.</span>
                        </aside>
                    </div>
                    <div class="welcome-footer"><span>Made by Kai Parnes</span><button class="text-link" data-travel="exterior">Explore the exterior</button><a class="text-link" href="../index.html">Portfolio home ↗</a></div>
                </section>
                <section data-panel="program" hidden>
                    <div class="section-heading"><div><span class="edition">NOW SHOWING</span><h2>The program<span class="accent">.</span></h2></div><p>Visit a room or open a game directly.<br/>No tickets needed to see the work.</p></div>
                    <div class="program-grid">${CINEMA_PROGRAM.map(p => `
                        <article class="program-card">
                            <img src="${p.image}" alt="${p.title} preview"/>
                            <div class="program-copy"><span class="edition">SCREEN ${p.number} / ${p.category}</span><h3>${p.title}</h3><p>${p.description}</p><p class="project-detail">${p.detail}</p>
                            <div class="card-actions"><button class="button secondary" data-room="${p.room}" aria-label="Visit ${p.title} theater">Visit theater <span aria-hidden="true">→</span></button><a class="text-link" href="${p.url}" target="_blank" rel="noopener noreferrer" aria-label="Open ${p.title} in a new tab">Open game ↗</a></div></div>
                        </article>`).join('')}
                    </div>
                    <p class="menu-footnote">Games open in a new tab. The cinema stays here for your return.</p>
                </section>
                <section data-panel="controls" hidden>
                    <div class="section-heading"><div><span class="edition">MAKE YOURSELF AT HOME</span><h2>A few helpful cues<span class="accent">.</span></h2></div></div>
                    <div class="help-grid">
                        <section><h3>Explore the cinema</h3><dl class="key-list"><div><dt><kbd>W A S D</kbd> / arrows</dt><dd>Move</dd></div><div><dt>Drag on the scene</dt><dd>Look around</dd></div><div><dt><kbd>Shift</kbd></dt><dd>Run</dd></div><div><dt><kbd>Space</kbd></dt><dd>Jump, or use a nearby door</dd></div><div><dt><kbd>E</kbd></dt><dd>Talk, sit, or play when prompted</dd></div><div><dt>Scroll on the scene</dt><dd>Adjust camera distance</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Open or close the menu</dd></div></dl><p class="help-note">The program works with keyboard, mouse or touch. Full 3D exploration uses a keyboard. Collectibles and arcade activities are optional.</p></section>
                        <section class="settings-card"><h3>Your visit, your settings</h3><label for="graphics-quality">Graphics quality</label><select id="graphics-quality"><option value="balanced">Balanced</option><option value="high">High detail</option><option value="low">Low detail</option></select><p>Lower detail reduces shadows, glow and rendering resolution.</p><button id="capture-mouse" class="button secondary">Enable mouse capture</button><p id="capture-note">Optional. Drag-to-look always works without capture. Press Esc to release it.</p><button class="button primary" data-resume>Resume exploring →</button><button class="text-link" data-travel="exterior">Return to the entrance</button></section>
                    </div>
                </section>
            </dialog>`;
        document.body.appendChild(this.root);
        this.dialog = this.root.querySelector('#cinema-menu');
        this.elements = {};
        const ids = { location: 'location', hint: 'hint', currency: 'currency', dialoguePanel: 'dialogue-panel', dialogueSpeaker: 'dialogue-speaker', dialogueText: 'dialogue-text', dialogueOptions: 'dialogue-options' };
        for (const [key, id] of Object.entries(ids)) this.elements[key] = this.root.querySelector(`#${id}`);
        this.root.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            if (button.dataset.view) this.open(button.dataset.view);
            if (button.dataset.room) this.travel(button.dataset.room);
            if (button.dataset.travel) this.travel(button.dataset.travel);
            if (button.hasAttribute('data-resume') || button.id === 'menu-close') this.close();
        });
        this.dialog.addEventListener('close', () => game.setMenuOpen(this.dialog.open));
        this.root.querySelector('#dialogue-close').onclick = () => game.closeDialogue();
        this.root.querySelector('#graphics-quality').onchange = event => game.setQuality(event.target.value);
        this.root.querySelector('#capture-mouse').onclick = async () => {
            this.close();
            await game.enableMouseCapture();
        };
        window.addEventListener('keydown', event => {
            if (game.dialogueOpen && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey) {
                const option = game._dialogueOptions?.find(option => option.key === event.code);
                if (option) { event.preventDefault(); option.action(); return; }
            }
            if (event.code !== 'Escape' || event.repeat) return;
            if (this.dialog.open) return; // Native dialog handles Escape and focus restoration.
            if (game.dialogueOpen) { game.closeDialogue(); return; }
            if (game.arcadeOpen) { game.closeArcades(); return; }
            if (document.pointerLockElement) return; // The browser releases capture first.
            event.preventDefault(); // Do not let this same Escape dismiss the dialog we open.
            this.open('controls');
        });
        document.addEventListener('pointerlockchange', () => {
            if (!document.pointerLockElement && game.hadMouseCapture && !this.dialog.open && !game.dialogueOpen && !game.arcadeOpen) this.open('controls');
            game.hadMouseCapture = Boolean(document.pointerLockElement);
        });
    }

    open(view = 'welcome') {
        this.game.closeDialogue();
        this.game.closeArcades();
        this.game.setMenuOpen(true);
        if (document.pointerLockElement) document.exitPointerLock();
        const panels = this.root.querySelectorAll('[data-panel]');
        for (const panel of panels) panel.hidden = panel.dataset.panel !== view;
        const title = this.root.querySelector(`[data-panel="${view}"] h1, [data-panel="${view}"] h2`);
        title.id ||= `cinema-${view}-title`;
        this.dialog.setAttribute('aria-labelledby', title.id);
        this.dialog.removeAttribute('aria-label');
        if (!this.dialog.open) this.dialog.showModal();
        this.dialog.scrollTop = 0;
        this.root.querySelector(view === 'welcome' ? '[data-travel="lobby"].primary' : '#menu-close').focus();
    }

    close() {
        if (this.dialog.open) this.dialog.close();
        this.game.setMenuOpen(false);
    }

    travel(room) {
        this.game.loadLocation(room);
        this.close();
        this.game.setMenuOpen(false);
    }

    setLocation(label, project) {
        this.elements.location.textContent = label;
        const launch = this.root.querySelector('#room-launch');
        launch.hidden = !project;
        if (project) {
            launch.href = project.url;
            launch.textContent = `Open ${project.title} ↗`;
        }
    }
}
