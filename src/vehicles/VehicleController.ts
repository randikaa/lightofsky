import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { CarModelFactory, type CarStyle, type CarVisuals } from "../assets/CarModelFactory";

export interface VehicleControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  reset: boolean;
}

interface Wheel {
  hardpointLocal: THREE.Vector3;
  rayLength: number;
  radius: number;
  restLength: number;
  stiffness: number;
  compressionDamping: number;
  relaxationDamping: number;
  maxTravel: number;
  compression: number;
  isInContact: boolean;
  mesh: THREE.Object3D;
}

export class VehicleController {
  public chassisBody: RAPIER.RigidBody;
  public chassisCollider: RAPIER.Collider;
  public visuals: CarVisuals;
  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;
  private modelFactory: CarModelFactory;

  public wheels: Wheel[] = [];
  public style: CarStyle;
  public color: string;

  public get chassisMesh(): THREE.Group {
    return this.visuals.group;
  }

  // Handling and dynamics tuning
  private maxSteerAngle = 0.52; // ~30 degrees
  private currentSteerAngle = 0;
  private steerSpeed = 4.2;
  private enginePower = 44000;
  private reversePower = 24000;
  private brakeForce = 32000;
  private tireFriction = 1.4; // High-grip tire friction (1.2 - 1.5)

  constructor(
    scene: THREE.Scene,
    world: RAPIER.World,
    modelFactory: CarModelFactory,
    style: CarStyle = "supercar",
    color = "#e63946",
    spawnPos = new THREE.Vector3(0, 15, 0),
    spawnRotY = 0
  ) {
    this.scene = scene;
    this.physicsWorld = world;
    this.modelFactory = modelFactory;
    this.style = style;
    this.color = color;

    // 1. Create Chassis RigidBody with strong angular damping
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
      .setRotation({ x: 0, y: Math.sin(spawnRotY / 2), z: 0, w: Math.cos(spawnRotY / 2) })
      .setLinearDamping(0.15) // Linear damping ~0.15
      .setAngularDamping(2.8)  // Strong angular damping (2.5 - 3.0) to prevent rollovers
      .setCanSleep(false);

    this.chassisBody = world.createRigidBody(bodyDesc);

    // 2. Chassis Collider: Elevated body shape to eliminate ground snagging,
    // with Center of Mass shifted downwards to y = -0.4 via mass properties
    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.95, 0.25, 1.9)
      .setTranslation(0, 0.35, 0) // Elevated so belly never beaches or drags on terrain
      .setMassProperties(
        1350,
        { x: 0, y: -0.75, z: 0 }, // Relative to collider center (+0.35) => rigid body COM = -0.40!
        { x: 900, y: 1600, z: 2200 },
        { x: 0, y: 0, z: 0, w: 1 }
      )
      .setFriction(0.05) // Low friction on chassis belly so bottoming out glides freely
      .setRestitution(0.0); // Strictly zero restitution to eliminate jelly bounciness

    this.chassisCollider = world.createCollider(colliderDesc, this.chassisBody);

    // 3. Create Visual Car & Wheels
    this.visuals = this.modelFactory.createProceduralCar(this.style, this.color);
    this.scene.add(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.add(w));

    // 4. Setup 4-Wheel Hardpoints with Realistic Suspension Tuning
    const halfW = 0.95;
    const halfL = 1.35;
    const hardpoints = [
      new THREE.Vector3(-halfW, 0.10, halfL),  // FL (0)
      new THREE.Vector3(halfW, 0.10, halfL),   // FR (1)
      new THREE.Vector3(-halfW, 0.10, -halfL), // RL (2)
      new THREE.Vector3(halfW, 0.10, -halfL),  // RR (3)
    ];

    const wheelRadius = 0.38;
    const restLength = 0.55;
    const maxTravel = 0.30;
    const rayLength = 0.90;

    hardpoints.forEach((hp, idx) => {
      this.wheels.push({
        hardpointLocal: hp,
        rayLength,
        radius: wheelRadius,
        restLength,
        stiffness: 35.0,          // Realistic stiffness ~35.0
        compressionDamping: 2.5,  // Compression damping ~2.5
        relaxationDamping: 3.5,   // Relaxation damping ~3.5
        maxTravel,                // Clamp between 0.0 and 0.3m
        compression: 0,
        isInContact: false,
        mesh: this.visuals.wheelMeshes[idx],
      });
    });
  }

  public update(controls: VehicleControls, dt: number) {
    const chassisPos = this.chassisBody.translation();
    const chassisRot = this.chassisBody.rotation();
    const quat = new THREE.Quaternion(chassisRot.x, chassisRot.y, chassisRot.z, chassisRot.w);

    const downDir = new THREE.Vector3(0, -1, 0).applyQuaternion(quat);
    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

    const linvel = this.chassisBody.linvel();
    const currentVelocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
    const speedKmh = this.getSpeedKmh();
    const forwardVel = currentVelocity.dot(forwardDir);

    // 1. Steering with speed sensitivity (dampen max steering at high speeds)
    const speedFactor = Math.max(0.42, 1.0 - speedKmh / 220);
    const targetMaxSteer = this.maxSteerAngle * speedFactor;

    let targetSteer = 0;
    if (controls.left) targetSteer += targetMaxSteer;
    if (controls.right) targetSteer -= targetMaxSteer;

    this.currentSteerAngle = THREE.MathUtils.damp(this.currentSteerAngle, targetSteer, this.steerSpeed, dt);

    // 2. Wheel Raycast Suspension & Traction Loop
    let numGroundedWheels = 0;
    let numFrontGrounded = 0;
    const massPerWheel = this.chassisBody.mass() * 0.25;

    this.wheels.forEach((wheel, index) => {
      const isFront = index < 2;
      const worldHardpoint = wheel.hardpointLocal.clone().applyQuaternion(quat).add(chassisPos as any);

      const ray = new RAPIER.Ray(
        { x: worldHardpoint.x, y: worldHardpoint.y, z: worldHardpoint.z },
        { x: downDir.x, y: downDir.y, z: downDir.z }
      );

      // Cast ray against world colliders, excluding car chassis
      const hit = this.physicsWorld.castRayAndGetNormal(
        ray,
        wheel.rayLength,
        true,
        undefined,
        undefined,
        this.chassisCollider,
        this.chassisBody
      );

      if (hit) {
        wheel.isInContact = true;
        numGroundedWheels++;
        if (isFront) numFrontGrounded++;

        const currentDist = hit.timeOfImpact;
        const rawCompression = wheel.restLength - currentDist;

        // Clamp suspension travel strictly between 0.0 and 0.3 meters
        wheel.compression = THREE.MathUtils.clamp(rawCompression, 0.0, wheel.maxTravel);

        // Suspension velocity along ray at this specific wheel mount point
        const ptVelRapier = this.chassisBody.velocityAtPoint({
          x: worldHardpoint.x,
          y: worldHardpoint.y,
          z: worldHardpoint.z,
        });
        const ptVel = new THREE.Vector3(ptVelRapier.x, ptVelRapier.y, ptVelRapier.z);
        const suspVelocity = ptVel.dot(downDir); // Positive = compressing downwards

        // Asymmetric Spring-Damper Force (Compression vs Relaxation)
        const damping = suspVelocity > 0 ? wheel.compressionDamping : wheel.relaxationDamping;
        const springForce = massPerWheel * (wheel.stiffness * 25.0 * wheel.compression + damping * suspVelocity * 8.0);
        const upForce = Math.max(0, Math.min(springForce, 40000));

        // Apply suspension upward impulse (along opposite of downDir)
        const upImpulse = downDir.clone().multiplyScalar(-upForce * dt);
        this.chassisBody.applyImpulseAtPoint(
          { x: upImpulse.x, y: upImpulse.y, z: upImpulse.z },
          { x: worldHardpoint.x, y: worldHardpoint.y, z: worldHardpoint.z },
          true
        );

        // Wheel direction vectors taking front steer angle into account
        const wheelForward = forwardDir.clone();
        if (isFront) {
          wheelForward.applyAxisAngle(downDir.clone().negate(), -this.currentSteerAngle);
        }
        const wheelRight = new THREE.Vector3().crossVectors(downDir.clone().negate(), wheelForward).normalize();

        // 3. Grounded Driving Logic: Apply propulsion ONLY when wheel is in contact with ground
        if (controls.forward) {
          const driveImpulse = wheelForward.clone().multiplyScalar((this.enginePower * 0.25) * dt);
          this.chassisBody.applyImpulseAtPoint(
            { x: driveImpulse.x, y: driveImpulse.y, z: driveImpulse.z },
            { x: worldHardpoint.x, y: worldHardpoint.y, z: worldHardpoint.z },
            true
          );
        }

        // 4. Lateral Tire Grip & Drift (Coulomb friction bounded by normal force)
        const lateralVel = ptVel.dot(wheelRight);
        const driftGrip = controls.handbrake && !isFront ? 0.35 : 1.0;
        const maxLateralImpulse = this.tireFriction * upForce * dt * driftGrip;
        const desiredLateralImpulse = -lateralVel * massPerWheel;
        const clampedLateralImpulse = THREE.MathUtils.clamp(
          desiredLateralImpulse,
          -maxLateralImpulse,
          maxLateralImpulse
        );

        const sideImpulse = wheelRight.clone().multiplyScalar(clampedLateralImpulse);
        this.chassisBody.applyImpulseAtPoint(
          { x: sideImpulse.x, y: sideImpulse.y, z: sideImpulse.z },
          { x: worldHardpoint.x, y: worldHardpoint.y, z: worldHardpoint.z },
          true
        );

        // Position wheel visual on ground surface
        wheel.mesh.position.copy(worldHardpoint).addScaledVector(downDir, currentDist - wheel.radius);
      } else {
        // Airborne: No contact, wheel extends to resting position
        wheel.isInContact = false;
        wheel.mesh.position.copy(worldHardpoint).addScaledVector(downDir, wheel.restLength - wheel.radius);
      }

      // Sync wheel rotation & steer angle
      wheel.mesh.quaternion.copy(quat);
      if (isFront) {
        wheel.mesh.rotateY(-this.currentSteerAngle);
      }
    });

    // 5. Central Traction & Braking Assist (applied only when vehicle is grounded)
    if (numGroundedWheels > 0) {
      if (controls.forward) {
        const tractionAssist = forwardDir.clone().multiplyScalar((this.enginePower * 0.20) * dt);
        this.chassisBody.applyImpulse({ x: tractionAssist.x, y: tractionAssist.y, z: tractionAssist.z }, true);
      } else if (controls.backward) {
        if (forwardVel > 1.5) {
          // Braking
          const brakeImpulse = forwardDir.clone().multiplyScalar(-this.brakeForce * dt);
          this.chassisBody.applyImpulse({ x: brakeImpulse.x, y: brakeImpulse.y, z: brakeImpulse.z }, true);
        } else {
          // Reverse
          const revImpulse = forwardDir.clone().multiplyScalar(-this.reversePower * dt);
          this.chassisBody.applyImpulse({ x: revImpulse.x, y: revImpulse.y, z: revImpulse.z }, true);
        }
      }
    }

    // 6. Grounded Steer Assist Torque (Applied ONLY when front wheels are touching the ground)
    if (numFrontGrounded > 0 && Math.abs(this.currentSteerAngle) > 0.01) {
      const speedNorm = Math.min(speedKmh / 70, 1.0);
      const steerTorqueMag = this.currentSteerAngle * 500 * speedNorm * (forwardVel >= 0 ? 1 : -1);
      const steerTorque = downDir.clone().multiplyScalar(-steerTorqueMag * dt);
      this.chassisBody.applyTorqueImpulse({ x: steerTorque.x, y: steerTorque.y, z: steerTorque.z }, true);
    }

    // 7. Airborne / Inverted Attitude Stabilization (Keeps car level over crests without mid-air flinging)
    const worldUp = new THREE.Vector3(0, 1, 0);
    const carUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const tiltAngle = carUp.angleTo(worldUp);

    if (numGroundedWheels === 0) {
      // In mid-air: gently dampen roll and pitch to ensure clean four-wheel landings
      const angvel = this.chassisBody.angvel();
      this.chassisBody.setAngvel(
        { x: angvel.x * 0.94, y: angvel.y * 0.94, z: angvel.z * 0.94 },
        true
      );
    } else if (tiltAngle > 0.65) {
      // Heavily tilted or rolled on side: apply corrective upright torque
      const tiltAxis = new THREE.Vector3().crossVectors(carUp, worldUp).normalize();
      const correctiveTorque = tiltAxis.multiplyScalar(tiltAngle * 1800 * dt);
      this.chassisBody.applyTorqueImpulse({ x: correctiveTorque.x, y: correctiveTorque.y, z: correctiveTorque.z }, true);
    }

    // 8. Sync Chassis Visual Transform
    this.visuals.group.position.set(chassisPos.x, chassisPos.y, chassisPos.z);
    this.visuals.group.quaternion.copy(quat);

    // 9. Dynamic Taillight Brake Glow
    const isBraking = (controls.backward && forwardVel > 1.5) || controls.handbrake;
    this.visuals.taillights.forEach((tl) => (tl.intensity = isBraking ? 3.5 : 1.2));

    // 10. Instant Reset on <kbd>R</kbd>
    if (controls.reset) {
      this.resetPosition();
    }
  }

  public resetPosition(offsetY = 2.5) {
    const p = this.chassisBody.translation();
    const q = this.chassisBody.rotation();
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w), "YXZ");

    this.chassisBody.setTranslation({ x: p.x, y: p.y + offsetY, z: p.z }, true);
    this.chassisBody.setRotation({ x: 0, y: Math.sin(euler.y / 2), z: 0, w: Math.cos(euler.y / 2) }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  public getSpeedKmh(): number {
    const v = this.chassisBody.linvel();
    return Math.round(Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3.6);
  }

  public getForwardVelocity(): number {
    const rot = this.chassisBody.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const v = this.chassisBody.linvel();
    return forward.dot(new THREE.Vector3(v.x, v.y, v.z));
  }

  public isDrifting(): boolean {
    const speed = this.getSpeedKmh();
    if (speed < 18) return false;
    const rot = this.chassisBody.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const v = this.chassisBody.linvel();
    return Math.abs(right.dot(new THREE.Vector3(v.x, v.y, v.z))) > 2.8;
  }

  public setCustomization(style: CarStyle, color: string) {
    this.style = style;
    this.color = color;

    this.scene.remove(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.remove(w));

    this.visuals = this.modelFactory.createProceduralCar(this.style, this.color);
    this.scene.add(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.add(w));

    this.wheels.forEach((w, idx) => {
      w.mesh = this.visuals.wheelMeshes[idx];
    });
  }
}
