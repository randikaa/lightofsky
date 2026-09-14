import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { AdventurerVisuals } from "./AdventurerVisuals";
import type { CharacterClass } from "./AdventurerModelFactory";

export interface CharacterControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  reset: boolean;
}

export class CharacterController {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public controller: RAPIER.KinematicCharacterController;
  public visuals: AdventurerVisuals;

  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;

  // Speeds & Jump
  public walkSpeed = 5.0; // 5 m/s (~18 km/h)
  public sprintSpeed = 9.5; // 9.5 m/s (~34 km/h)
  public jumpStrength = 7.2;
  public gravity = -20.0;

  // Dynamic state
  private verticalVelocity = 0;
  private isGrounded = false;
  private currentSpeed = 0;

  // Stamina system (0 to 100)
  public stamina = 100;
  public maxStamina = 100;
  private staminaDrainRate = 22.0; // drains in ~4.5s of continuous sprint
  private staminaRegenRate = 18.0;

  constructor(
    scene: THREE.Scene,
    world: RAPIER.World,
    spawnPos = new THREE.Vector3(0, 10, 0),
    characterClass: CharacterClass = "knight"
  ) {
    this.scene = scene;
    this.physicsWorld = world;

    // 1. Create Kinematic Position-Based RigidBody
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z);
    this.body = world.createRigidBody(bodyDesc);

    // 2. Capsule Collider (half-height 0.5m, radius 0.32m => 1.64m total height)
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.32)
      .setTranslation(0, 0.82, 0) // Centered so feet are at y = 0
      .setFriction(0.0)
      .setRestitution(0.0);
    this.collider = world.createCollider(colliderDesc, this.body);

    // 3. Rapier Native Kinematic Character Controller
    this.controller = world.createCharacterController(0.02);
    this.controller.enableAutostep(0.38, 0.22, true); // Autostep over 38cm rocks/steps
    this.controller.setMaxSlopeClimbAngle(Math.PI / 3.8); // ~47 degrees slope climbing
    this.controller.setMinSlopeSlideAngle(Math.PI / 3.4);
    this.controller.enableSnapToGround(0.5); // Stay planted on downhill slopes

    // 4. Create 3D Visual Mesh & Hierarchy with KayKit Adventurers
    this.visuals = new AdventurerVisuals(characterClass);
    this.visuals.setPosition(spawnPos);
    this.scene.add(this.visuals.group);
  }

  public switchCharacterClass(classId: CharacterClass) {
    this.visuals.switchClass(classId);
  }

  /**
   * Updates player movement relative to camera orientation
   * @param controls Keyboard / Gamepad input state
   * @param dt Frame delta time
   * @param cameraOrientation Camera vectors {forward, right}, Camera instance, or horizontal Yaw angle
   */
  public update(
    controls: CharacterControls,
    dt: number,
    cameraOrientation?: THREE.Camera | { forward: THREE.Vector3; right: THREE.Vector3 } | number
  ) {
    // 1. Manage Stamina
    const wantsSprint = controls.sprint && (controls.forward || controls.backward || controls.left || controls.right);
    const canSprint = wantsSprint && this.stamina > 5;
    const isSprinting = canSprint;

    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
    }

    const moveSpeed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    // 2. Compute camera forward & right strafe vectors on the horizontal XZ plane
    const up = new THREE.Vector3(0, 1, 0);
    let forward = new THREE.Vector3(0, 0, 1);
    let right = new THREE.Vector3(-1, 0, 0);

    if (cameraOrientation instanceof THREE.Camera) {
      const camFwd = new THREE.Vector3();
      cameraOrientation.getWorldDirection(camFwd);
      forward.set(camFwd.x, 0, camFwd.z).normalize();
      right.crossVectors(forward, up).normalize();
    } else if (
      cameraOrientation &&
      typeof cameraOrientation === "object" &&
      "forward" in cameraOrientation &&
      "right" in cameraOrientation
    ) {
      forward.copy(cameraOrientation.forward);
      right.copy(cameraOrientation.right);
    } else if (typeof cameraOrientation === "number") {
      forward.applyAxisAngle(up, cameraOrientation).normalize();
      right.crossVectors(forward, up).normalize();
    }

    // 3. Compute planar movement direction from strafe and forward inputs:
    // - Forward ('W'): +forward vector
    // - Backward ('S'): -forward vector
    // - Strafe Right ('D'): +right vector (forward.cross(up))
    // - Strafe Left ('A'): -right vector (-right)
    const moveDir = new THREE.Vector3();
    if (controls.forward) moveDir.add(forward);
    if (controls.backward) moveDir.sub(forward);
    if (controls.right) moveDir.add(right);
    if (controls.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.0001;
    let targetHeading: number | undefined = undefined;

    if (isMoving) {
      moveDir.normalize();
      targetHeading = Math.atan2(moveDir.x, moveDir.z);
    }

    // 4. Vertical velocity & Jumping
    if (this.isGrounded) {
      if (controls.jump) {
        this.verticalVelocity = this.jumpStrength;
        this.isGrounded = false;
      } else {
        // Subtle downward pressure to snap to uneven terrain
        this.verticalVelocity = -2.5;
      }
    } else {
      this.verticalVelocity += this.gravity * dt;
    }

    // 5. Desired displacement vector for Rapier Character Controller
    const desiredMovement = {
      x: moveDir.x * moveSpeed * dt,
      y: this.verticalVelocity * dt,
      z: moveDir.z * moveSpeed * dt,
    };

    // 6. Compute collision response against terrain and world obstacles
    this.controller.computeColliderMovement(this.collider, desiredMovement);
    const computedMovement = this.controller.computedMovement();
    this.isGrounded = this.controller.computedGrounded();

    if (this.isGrounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
    }

    // 7. Update Kinematic Body Position
    const currentPos = this.body.translation();
    const newPos = {
      x: currentPos.x + computedMovement.x,
      y: currentPos.y + computedMovement.y,
      z: currentPos.z + computedMovement.z,
    };
    this.body.setNextKinematicTranslation(newPos);

    // 8. Update Visual Character Model Transform & Procedural Animation
    const charPos = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
    this.visuals.setPosition(charPos);

    const actualSpeed = isMoving ? moveSpeed : 0;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, actualSpeed, 12, dt);

    this.visuals.updateAnimation(
      {
        speed: this.currentSpeed,
        isGrounded: this.isGrounded,
        isSprinting,
        isMoving,
      },
      dt,
      targetHeading
    );

    // 9. Manual Reset on <kbd>R</kbd>
    if (controls.reset) {
      this.resetPosition();
    }
  }

  public resetPosition(spawnY = 2.0) {
    const p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + spawnY, z: p.z });
    this.verticalVelocity = 0;
  }

  public teleport(x: number, y: number, z: number) {
    this.body.setTranslation({ x, y, z }, true);
    this.body.setNextKinematicTranslation({ x, y, z });
    this.visuals.setPosition(new THREE.Vector3(x, y, z));
    this.verticalVelocity = 0;
  }

  public getPosition(): THREE.Vector3 {
    const p = this.body.translation();
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  public getSpeed(): number {
    return this.currentSpeed;
  }

  public getIsGrounded(): boolean {
    return this.isGrounded;
  }

  public destroy() {
    this.visuals.destroy();
    this.scene.remove(this.visuals.group);
    try {
      this.physicsWorld.removeRigidBody(this.body);
    } catch (_) {}
  }
}
