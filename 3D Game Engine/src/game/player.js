import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Input } from '../input.js';
import { Collision } from './collision.js';
import { Settings } from '../settings.js';

export class Player {
    constructor(scene) {
        this.scene = scene;

        // Physics anchor group — FBX model is added as a child once loaded
        this.mesh = new THREE.Group();
        this.mesh.position.y = 1;
        this.scene.add(this.mesh);
        this.mixer = null;
        this._idleAction    = null;
        this._walkAction    = null;
        this._runAction     = null;
        this._jumpAction    = null;
        this._runJumpAction = null;
        this._sitAction     = null;
        this._cuffedAction  = null;
        this._activeAction  = null;
        this.isSitting      = false;
        this.isHandcuffed   = false;
        this._handcuffVisual = null;

        this._holdSlot = null;

        this._loadCharacterModel();

        // Physics
        this.velocity = new THREE.Vector3();
        this.speed = 6;
        this.runSpeed = 11;
        this.jumpForce = 12;
        this.doubleJumpForce = 10;
        this.gravity = -30;
        this.radius = 0.5;

        // State
        this.isGrounded = true;
        this.jumpsUsed = 0;
        this.maxJumps = 2;
        this.floorY = 0; // Can be overridden per-location

        // Coyote time & jump buffer
        this.coyoteTime = 0.12;
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.12;
        this.jumpBuffer = 0;

        // Camera control
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
        this._lookVelocity = new THREE.Vector2();
        this._dashTimer = 0;
        this._dashDirection = new THREE.Vector3();
        this._lastJumpWasDouble = false;
    }

    _loadCharacterModel() {
        const loader = new FBXLoader();
        loader.load('../Animated Men Characters - Feb 2019/FBX/Male_Casual.fbx', (fbx) => {
            fbx.scale.setScalar(0.008333);
            fbx.traverse(child => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });
            this.mesh.add(fbx);
            if (fbx.animations?.length > 0) {
                this.mixer = new THREE.AnimationMixer(fbx);
                const actionFor = (...names) => {
                    const clip = fbx.animations.find(a => names.includes(a.name));
                    return clip ? this.mixer.clipAction(clip) : null;
                };

                // Never fall back to the FBX file's first clip: that is often
                // a run cycle, which makes a stationary character look broken.
                this._idleAction    = actionFor('HumanArmature|Man_Idle', 'HumanArmature|Man_Standing');
                this._walkAction    = actionFor('HumanArmature|Man_Walk');
                this._runAction     = actionFor('HumanArmature|Man_Run');
                this._jumpAction    = actionFor('HumanArmature|Man_Jump');
                this._runJumpAction = actionFor('HumanArmature|Man_RunningJump');
                this._sitAction     = actionFor('HumanArmature|Man_Sitting');
                this._cuffedAction  = actionFor('HumanArmature|Man_Clapping');

                // Match the authored animation cadence to the actual travel
                // speed so feet feel planted instead of skating.
                if (this._idleAction) this._idleAction.timeScale = 0.85;
                if (this._walkAction) this._walkAction.timeScale = 1.15;
                if (this._runAction) this._runAction.timeScale = 1.05;
                if (this._jumpAction) this._jumpAction.timeScale = 1.1;
                if (this._runJumpAction) this._runJumpAction.timeScale = 1.2;

                // Jump animations play once and hold the last frame mid-air
                for (const a of [this._jumpAction, this._runJumpAction].filter(Boolean)) {
                    a.setLoop(THREE.LoopOnce, 1);
                    a.clampWhenFinished = true;
                }

                this._activeAction = this._idleAction;
                if (this._idleAction) {
                    this._idleAction.play();
                } else {
                    console.warn('Player model has no idle or standing animation; keeping its bind pose at rest.');
                }
                // The arrest preview can begin before the FBX finishes loading.
                // Reapply the restrained pose as soon as its clip is available.
                if (this.isHandcuffed) this.setHandcuffed(true);
            }

            // Attach hold slot to right hand bone, falling back to a fixed offset
            const rHand = fbx.getObjectByName('mixamorigRightHand')
                || fbx.getObjectByName('RightHand')
                || fbx.getObjectByName('Bip001 R Hand');
            this._holdSlot = new THREE.Group();
            if (rHand) {
                rHand.add(this._holdSlot);
            } else {
                this._holdSlot.position.set(0.5, 1.0, 0.2);
                this.mesh.add(this._holdSlot);
            }
        }, undefined, () => this._createFallbackMesh());
    }

    _setAction(action, fadeDuration = 0.12) {
        if (!action) {
            if (this._activeAction) this._activeAction.stop();
            this._activeAction = null;
            return;
        }
        if (this._activeAction === action) return;
        action.enabled = true;
        action.reset().setEffectiveWeight(1).play();
        if (this._activeAction) this._activeAction.crossFadeTo(action, fadeDuration, false);
        this._activeAction = action;
    }

    _createFallbackMesh() {
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 1, 16),
            new THREE.MeshStandardMaterial({ color: 0xff6666, roughness: 0.35, metalness: 0.15 })
        );
        body.position.y = 0.5;
        body.castShadow = true;
        this.mesh.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffcc99 })
        );
        head.position.y = 1.2;
        head.castShadow = true;
        this.mesh.add(head);

        this._holdSlot = new THREE.Group();
        this._holdSlot.position.set(0.5, 1.0, 0.2);
        this.mesh.add(this._holdSlot);
    }

    attachItemToHand(itemMesh) {
        if (!this._holdSlot) return;
        while (this._holdSlot.children.length) this._holdSlot.remove(this._holdSlot.children[0]);
        this._holdSlot.add(itemMesh);
    }

    detachHeldItem() {
        if (!this._holdSlot) return;
        while (this._holdSlot.children.length) this._holdSlot.remove(this._holdSlot.children[0]);
    }

    setSitting(sitting) {
        this.isSitting = sitting;
        if (sitting) this._setAction(this._sitAction);
    }

    setHandcuffed(handcuffed) {
        this.isHandcuffed = handcuffed;
        if (handcuffed) {
            this.velocity.set(0, 0, 0);
            if (this._cuffedAction) {
                this._setAction(this._cuffedAction, 0.08);
                this._cuffedAction.time = this._cuffedAction.getClip().duration * 0.48;
                this._cuffedAction.paused = true;
                this.mixer?.update(0);
            }
            if (!this._handcuffVisual) {
                const cuffs = new THREE.Group();
                const metal = new THREE.MeshStandardMaterial({
                    color: 0xd6e0e8,
                    metalness: 0.95,
                    roughness: 0.18,
                });
                for (const x of [-0.35, 0.35]) {
                    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.026, 10, 24), metal);
                    cuff.position.x = x;
                    cuff.rotation.y = Math.PI / 2;
                    cuff.castShadow = true;
                    cuffs.add(cuff);
                }
                const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 8), metal);
                chain.rotation.z = Math.PI / 2;
                chain.castShadow = true;
                cuffs.add(chain);
                cuffs.position.set(0, 3.35, 0.44);
                this.mesh.add(cuffs);
                this._handcuffVisual = cuffs;
            }
            return;
        }

        if (this._cuffedAction) this._cuffedAction.paused = false;
        if (this._handcuffVisual) {
            this.mesh.remove(this._handcuffVisual);
            this._handcuffVisual.traverse(child => {
                child.geometry?.dispose?.();
                child.material?.dispose?.();
            });
            this._handcuffVisual = null;
        }
        this._setAction(this._idleAction, 0.08);
    }

    setPosition(x, y, z) {
        const requestedPosition = new THREE.Vector3(x, y, z);
        const colliderGround = Collision.findGroundBelow(requestedPosition, this.radius);
        const fallbackGround = Number.isFinite(this.floorY) ? this.floorY : null;
        const groundedY = colliderGround ?? fallbackGround ?? y;

        this.mesh.position.set(x, groundedY, z);
        this.velocity.set(0, 0, 0);
        this.isGrounded = colliderGround !== null || fallbackGround !== null;
        this.jumpsUsed = 0;
        this.coyoteTimer = this.coyoteTime;
        this.jumpBuffer = 0;
        this._dashTimer = 0;
    }

    update(dt) {
        // Camera rotation from mouse
        if (Input.mouse.locked) {
            const sensitivity = Settings.get('cameraSensitivity') ?? 1;
            const lookBlend = 1 - Math.exp(-dt * 24);
            this._lookVelocity.x = THREE.MathUtils.lerp(this._lookVelocity.x, Input.mouse.dx, lookBlend);
            this._lookVelocity.y = THREE.MathUtils.lerp(this._lookVelocity.y, Input.mouse.dy, lookBlend);
            this.cameraYaw -= this._lookVelocity.x * 0.00145 * sensitivity;
            this.cameraPitch -= this._lookVelocity.y * 0.00125 * sensitivity;
            // Keep the camera orbit comfortable and away from ceilings/floors.
            this.cameraPitch = Math.max(-0.28, Math.min(0.48, this.cameraPitch));
        } else {
            this._lookVelocity.multiplyScalar(Math.exp(-dt * 18));
        }

        // Timers
        if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
        if (this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
        } else {
            this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
        }

        // Movement input
        const input = Input.getMovementVector();
        const isRunning = Input.isKeyDown('ShiftLeft') || Input.isKeyDown('ShiftRight');
        const currentSpeed = isRunning ? this.runSpeed : this.speed;

        // Calculate movement direction relative to camera
        const forward = new THREE.Vector3(
            Math.sin(this.cameraYaw),
            0,
            Math.cos(this.cameraYaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.cameraYaw),
            0,
            -Math.sin(this.cameraYaw)
        );

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, input.z);
        moveDir.addScaledVector(right, input.x);

        if (Input.doubleClickForward) {
            this._dashDirection.copy(forward);
            this._dashTimer = 0.42;
        }

        if (this._dashTimer > 0 && moveDir.lengthSq() === 0) {
            moveDir.copy(this._dashDirection);
            this._dashTimer = Math.max(0, this._dashTimer - dt);
        } else if (moveDir.lengthSq() > 0) {
            this._dashTimer = 0;
        }

        if (moveDir.length() > 0) {
            moveDir.normalize();
            const targetSpeed = this._dashTimer > 0 ? this.runSpeed : currentSpeed;
            const acceleration = 1 - Math.exp(-dt * 15);
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveDir.x * targetSpeed, acceleration);
            this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, moveDir.z * targetSpeed, acceleration);
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            let rotationDelta = THREE.MathUtils.euclideanModulo(targetRotation - this.mesh.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
            this.mesh.rotation.y += rotationDelta * (1 - Math.exp(-dt * 18));
        } else {
            const drag = Math.exp(-dt * 12);
            this.velocity.x *= drag;
            this.velocity.z *= drag;
        }

        // Jump input buffering
        if (Input.isKeyJustPressed('Space')) {
            this.jumpBuffer = this.jumpBufferTime;
        }

        // Process jump
        if (this.jumpBuffer > 0) {
            const canCoyoteJump = this.coyoteTimer > 0;

            if (canCoyoteJump && this.jumpsUsed === 0) {
                // First jump
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.jumpsUsed = 1;
                this._lastJumpWasDouble = false;
                this.coyoteTimer = 0;
                this.jumpBuffer = 0;
            } else if (!this.isGrounded && this.jumpsUsed < this.maxJumps) {
                // Double jump
                this.velocity.y = this.doubleJumpForce;
                this.jumpsUsed++;
                this._lastJumpWasDouble = true;
                this.jumpBuffer = 0;
            }
        }

        // Gravity
        this.velocity.y += this.gravity * dt;

        // Apply velocity
        const previousY = this.mesh.position.y;
        const newPos = this.mesh.position.clone();
        newPos.x += this.velocity.x * dt;
        newPos.y += this.velocity.y * dt;
        newPos.z += this.velocity.z * dt;

        // Collision detection (horizontal)
        const pushOut = Collision.checkSphere(
            new THREE.Vector3(newPos.x, this.mesh.position.y, newPos.z),
            this.radius
        );

        if (pushOut) {
            newPos.x += pushOut.x;
            newPos.z += pushOut.z;

            // Stop velocity in collision direction
            if (Math.abs(pushOut.x) > 0.001) this.velocity.x = 0;
            if (Math.abs(pushOut.z) > 0.001) this.velocity.z = 0;
        }

        // Apply position
        this.mesh.position.copy(newPos);

        // Ground collision
        const groundY = Collision.checkGround(
            this.mesh.position,
            this.radius,
            this.mesh.position.y,
            previousY
        );
        const floorY = this.floorY;

        const effectiveGround = groundY !== null ? Math.max(groundY, floorY) : floorY;

        if (this.mesh.position.y <= effectiveGround) {
            this.mesh.position.y = effectiveGround;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.jumpsUsed = 0;
        } else {
            this.isGrounded = false;
        }

        // Check triggers
        Collision.checkTriggers(this.mesh.position, this.radius);

        // Animation state
        if (this.mixer) {
            if (!this.isSitting) {
                const isMoving = Math.abs(this.velocity.x) > 0.3 || Math.abs(this.velocity.z) > 0.3;
                const isRunning = Input.isKeyDown('ShiftLeft') || Input.isKeyDown('ShiftRight');
                if (!this.isGrounded) {
                    if (this._lastJumpWasDouble || (isMoving && isRunning)) this._setAction(this._runJumpAction, 0.07);
                    else                       this._setAction(this._jumpAction, 0.07);
                } else if (isMoving && isRunning) {
                    this._setAction(this._runAction, 0.1);
                } else if (isMoving) {
                    this._setAction(this._walkAction, 0.1);
                } else {
                    this._setAction(this._idleAction, 0.16);
                }
            }
            this.mixer.update(dt);
        }
    }

    getPosition() {
        return this.mesh.position;
    }
}
