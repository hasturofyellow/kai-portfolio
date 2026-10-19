import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Input } from '../input.js';
import { Collision } from './collision.js';
import { CharacterRig } from './characterRig.js';

export class Player {
    constructor(scene) {
        this.scene = scene;

        // Physics anchor group — FBX model is added as a child once loaded
        this.mesh = new THREE.Group();
        this.mesh.position.y = 1;
        this.scene.add(this.mesh);
        this.mixer = null;
        this.rig = null;

        // Physics
        this.velocity = new THREE.Vector3();
        this.speed = 6;
        this.runSpeed = 11;
        this.jumpForce = 12;
        this.doubleJumpForce = 10;
        this.gravity = -30;
        this.radius = 0.4;
        this.height = 3.2;

        // State
        this.isGrounded = true;
        this.jumpsUsed = 0;
        this.maxJumps = 2;
        this.floorY = 0; // Can be overridden per-location
        this.isSeated = false;
        this.seatY = null;

        // Coyote time & jump buffer
        this.coyoteTime = 0.12;
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.12;
        this.jumpBuffer = 0;

        // Camera control
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
        this._loadCharacterModel();
    }

    _loadCharacterModel() {
        const loader = new FBXLoader();
        loader.load('../Animated Men Characters - Feb 2019/FBX/Male_Casual.fbx', (fbx) => {
            this.rig = new CharacterRig(fbx, { targetHeight: this.height });
            this.mesh.add(this.rig.model);
            this.mixer = this.rig.mixer;
            if (this.isSeated) this.rig.setSeated(this.seatY);
        }, undefined, () => this._createFallbackMesh());
    }

    _createFallbackMesh() {
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 2.4, 16),
            new THREE.MeshStandardMaterial({ color: 0x405663, roughness: 0.65 })
        );
        body.position.y = 1.2;
        body.castShadow = true;
        this.mesh.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffcc99 })
        );
        head.position.y = 2.8;
        head.castShadow = true;
        this.mesh.add(head);
    }

    setPosition(x, y, z) {
        if (this.isSeated) this.clearSeated();
        this.mesh.position.set(x, y, z);
        this.velocity.set(0, 0, 0);
    }

    _updateCameraInput() {
        // Input accumulates camera movement during a drag or optional pointer lock.
        if (Input.enabled) {
            this.cameraYaw -= Input.mouse.dx * 0.002;
            this.cameraPitch -= Input.mouse.dy * 0.002;
            this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch));
        }
    }

    setSeated(seatY) {
        this.isSeated = true;
        this.seatY = seatY;
        this.mesh.position.y = 0;
        this.velocity.set(0, 0, 0);
        this.jumpBuffer = 0;
        this.rig?.setSeated(seatY);
    }

    clearSeated() {
        this.isSeated = false;
        this.seatY = null;
        this.rig?.clearSeated();
    }

    updateSeated(dt) {
        this._updateCameraInput();
        this.rig?.update(dt);
    }

    update(dt) {
        if (this.isSeated) { this.updateSeated(dt); return; }
        this._updateCameraInput();

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
        moveDir.addScaledVector(right, -input.x);  // Negated to match camera flip

        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.velocity.x = moveDir.x * currentSpeed;
            this.velocity.z = moveDir.z * currentSpeed;
            this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        } else {
            const damping = Math.pow(0.85, dt * 60);
            this.velocity.x *= damping;
            this.velocity.z *= damping;
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
                this.coyoteTimer = 0;
                this.jumpBuffer = 0;
            } else if (!this.isGrounded && this.jumpsUsed < this.maxJumps) {
                // Double jump
                this.velocity.y = this.doubleJumpForce;
                this.jumpsUsed++;
                this.jumpBuffer = 0;
            }
        }

        // Gravity
        this.velocity.y += this.gravity * dt;

        // Apply velocity
        const newPos = this.mesh.position.clone();
        newPos.x += this.velocity.x * dt;
        newPos.y += this.velocity.y * dt;
        newPos.z += this.velocity.z * dt;

        // Small horizontal steps keep a sprint frame from tunneling through thin props.
        const distance = Math.hypot(newPos.x - this.mesh.position.x, newPos.z - this.mesh.position.z);
        const steps = Math.max(1, Math.ceil(distance / this.radius));
        const stepX = (newPos.x - this.mesh.position.x) / steps;
        const stepZ = (newPos.z - this.mesh.position.z) / steps;
        newPos.x = this.mesh.position.x;
        newPos.z = this.mesh.position.z;
        const bodyFeet = new THREE.Vector3();
        for (let step = 0; step < steps; step++) {
            newPos.x += stepX;
            newPos.z += stepZ;
            bodyFeet.set(newPos.x, this.mesh.position.y, newPos.z);
            const pushOut = Collision.checkBody(bodyFeet, this.radius, this.height);
            if (pushOut) {
                newPos.x += pushOut.x;
                newPos.z += pushOut.z;
                if (Math.abs(pushOut.x) > 0.001) this.velocity.x = 0;
                if (Math.abs(pushOut.z) > 0.001) this.velocity.z = 0;
            }
        }

        // Apply position
        this.mesh.position.copy(newPos);

        // Ground collision
        const groundY = Collision.checkGround(this.mesh.position, this.radius, this.mesh.position.y);
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

        const moving = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z > 0.04;
        this.rig?.setState(!this.isGrounded ? 'jump' : moving ? (isRunning ? 'run' : 'walk') : 'idle');
        this.rig?.update(dt);

        // Check triggers
        Collision.checkTriggers(this.mesh.position, this.radius);
    }

    getPosition() {
        return this.mesh.position;
    }
}
