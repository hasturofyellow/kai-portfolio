import * as THREE from 'three';
import { Input } from '../input.js';
import { Collision } from './collision.js';

export class Player {
    constructor(scene) {
        this.scene = scene;

        // Create player mesh
        this.mesh = this.createPlayerMesh();
        this.scene.add(this.mesh);

        // Physics
        this.velocity = new THREE.Vector3();
        this.speed = 8;
        this.runSpeed = 14;
        this.jumpForce = 12;
        this.doubleJumpForce = 10;
        this.gravity = -30;
        this.radius = 0.5;

        // State
        this.isGrounded = true;
        this.jumpsUsed = 0;
        this.maxJumps = 2;

        // Coyote time & jump buffer
        this.coyoteTime = 0.12;
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.12;
        this.jumpBuffer = 0;

        // Camera control
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
    }

    createPlayerMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xff6666,
            roughness: 0.35,
            metalness: 0.15
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.2;
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 1.25, 0.28);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 1.25, 0.28);
        group.add(rightEye);

        group.position.y = 1;

        return group;
    }

    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
        this.velocity.set(0, 0, 0);
    }

    update(dt) {
        // Camera rotation from mouse
        if (Input.mouse.locked) {
            this.cameraYaw -= Input.mouse.dx * 0.002;
            this.cameraPitch -= Input.mouse.dy * 0.002;
            this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch));
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
        moveDir.addScaledVector(right, -input.x);  // Negated to match camera flip

        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.velocity.x = moveDir.x * currentSpeed;
            this.velocity.z = moveDir.z * currentSpeed;
            this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        } else {
            this.velocity.x *= 0.85;
            this.velocity.z *= 0.85;
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
        const groundY = Collision.checkGround(this.mesh.position, this.radius, this.mesh.position.y);
        const floorY = 0; // Default floor

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
    }

    getPosition() {
        return this.mesh.position;
    }
}
