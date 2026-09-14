import * as CANNON from "cannon-es";
import * as THREE from "three";
import type { CarModelFactory, CarStyle, CarVisuals } from "../assets/CarModelFactory";

export interface VehicleControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  reset: boolean;
}

export class RaycastCar {
  public vehicle: CANNON.RaycastVehicle;
  public chassisBody: CANNON.Body;
  public visuals: CarVisuals;
  private scene: THREE.Scene;
  private modelFactory: CarModelFactory;

  // Vehicle Dynamics Tuning - Tuned for fast, punchy arcade racing
  private maxEngineForce = 5500;
  private maxReverseForce = 3500;
  private maxBrakeForce = 80;
  private maxSteerAngle = 0.52; // ~30 degrees
  private currentSteerAngle = 0;
  private steerSpeed = 3.5;

  // Drift settings
  private baseFrictionSlip = 4.0;
  private driftFrictionSlip = 1.2;

  public style: CarStyle;
  public color: string;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    modelFactory: CarModelFactory,
    style: CarStyle = "supercar",
    color: string = "#e63946",
    spawnPos = new THREE.Vector3(0, 1.2, 0),
    spawnRotY = 0
  ) {
    this.scene = scene;
    this.modelFactory = modelFactory;
    this.style = style;
    this.color = color;

    // 1. Create Physics Chassis (Box elevated above wheel mounts so it never scrapes the ground)
    const chassisShape = new CANNON.Box(new CANNON.Vec3(0.9, 0.25, 1.8));
    this.chassisBody = new CANNON.Body({
      mass: 750,
      position: new CANNON.Vec3(spawnPos.x, spawnPos.y, spawnPos.z),
      material: new CANNON.Material("chassis"),
    });

    // Mount collision shape 0.3m above center of mass so wheels handle ground contact
    this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.3, 0));
    this.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), spawnRotY);
    this.chassisBody.linearDamping = 0.08;
    this.chassisBody.angularDamping = 0.5;

    // 2. Instantiate Cannon RaycastVehicle
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    // 3. Wheel Configurations
    const wheelRadius = 0.38;
    const wheelOptions: CANNON.WheelInfoOptions = {
      radius: wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 35,
      suspensionRestLength: 0.42,
      frictionSlip: this.baseFrictionSlip,
      dampingRelaxation: 2.5,
      dampingCompression: 3.5,
      maxSuspensionForce: 100000,
      rollInfluence: 0.04,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(),
      useCustomSlidingRotationalSpeed: true,
      customSlidingRotationalSpeed: -30,
    };

    const halfW = 0.95;
    const halfL = 1.35;
    const height = 0.0;

    // Front-Left, Front-Right, Rear-Left, Rear-Right
    const connectionPoints = [
      new CANNON.Vec3(-halfW, height, halfL),  // Front Left (0)
      new CANNON.Vec3(halfW, height, halfL),   // Front Right (1)
      new CANNON.Vec3(-halfW, height, -halfL), // Rear Left (2)
      new CANNON.Vec3(halfW, height, -halfL),  // Rear Right (3)
    ];

    connectionPoints.forEach((point) => {
      this.vehicle.addWheel({
        ...wheelOptions,
        chassisConnectionPointLocal: point,
      });
    });

    this.vehicle.addToWorld(world);

    // 4. Create Visuals
    this.visuals = this.modelFactory.createProceduralCar(this.style, this.color);
    this.scene.add(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.add(w));
  }

  public update(controls: VehicleControlState, dt: number) {
    // 1. Steering with smooth interpolation
    const speedKmh = this.getSpeedKmh();
    const speedFactor = Math.max(0.45, 1.0 - speedKmh / 220);
    const targetMaxSteer = this.maxSteerAngle * speedFactor;

    let targetSteer = 0;
    if (controls.left) targetSteer += targetMaxSteer;
    if (controls.right) targetSteer -= targetMaxSteer;

    this.currentSteerAngle = THREE.MathUtils.damp(this.currentSteerAngle, targetSteer, this.steerSpeed, dt);
    this.vehicle.setSteeringValue(this.currentSteerAngle, 0);
    this.vehicle.setSteeringValue(this.currentSteerAngle, 1);

    // 2. Engine and Brakes
    let engine = 0;
    let brake = 0;

    if (controls.forward) {
      engine = -this.maxEngineForce;
    } else if (controls.backward) {
      const forwardVelocity = this.getForwardVelocity();
      if (forwardVelocity > 2.0) {
        brake = this.maxBrakeForce;
      } else {
        engine = this.maxReverseForce;
      }
    }

    // 3. Handbrake / Drift Logic
    if (controls.handbrake) {
      brake = this.maxBrakeForce * 1.5;
      this.vehicle.wheelInfos[2].frictionSlip = this.driftFrictionSlip;
      this.vehicle.wheelInfos[3].frictionSlip = this.driftFrictionSlip;
    } else {
      this.vehicle.wheelInfos[2].frictionSlip = this.baseFrictionSlip;
      this.vehicle.wheelInfos[3].frictionSlip = this.baseFrictionSlip;
    }

    // All-wheel drive for immediate acceleration and grip
    this.vehicle.applyEngineForce(engine, 0);
    this.vehicle.applyEngineForce(engine, 1);
    this.vehicle.applyEngineForce(engine, 2);
    this.vehicle.applyEngineForce(engine, 3);

    // All-wheel braking
    for (let i = 0; i < 4; i++) {
      this.vehicle.setBrake(brake, i);
    }

    // Taillight brake indicators
    const isBraking = brake > 5;
    this.visuals.taillights.forEach((tl) => (tl.intensity = isBraking ? 4.0 : 1.2));

    // 4. Auto-Reset
    if (controls.reset) {
      this.resetPosition();
    }
  }

  public syncGraphics() {
    // Sync chassis
    this.visuals.group.position.copy(this.chassisBody.position as any);
    this.visuals.group.quaternion.copy(this.chassisBody.quaternion as any);

    // Sync wheels
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
      const transform = this.vehicle.wheelInfos[i].worldTransform;
      const mesh = this.visuals.wheelMeshes[i];
      mesh.position.copy(transform.position as any);
      mesh.quaternion.copy(transform.quaternion as any);
    }
  }

  public resetPosition(spawnY = 1.5) {
    const currentEuler = new THREE.Euler().setFromQuaternion(this.visuals.group.quaternion, "YXZ");
    this.chassisBody.position.y += spawnY;
    this.chassisBody.quaternion.setFromEuler(0, currentEuler.y, 0);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
  }

  public getSpeedKmh(): number {
    return Math.round(this.chassisBody.velocity.length() * 3.6);
  }

  public getForwardVelocity(): number {
    const forward = new CANNON.Vec3(0, 0, 1);
    this.chassisBody.quaternion.vmult(forward, forward);
    return this.chassisBody.velocity.dot(forward);
  }

  public isDrifting(): boolean {
    const speed = this.getSpeedKmh();
    if (speed < 20) return false;
    const lateralVel = this.getLateralVelocity();
    return Math.abs(lateralVel) > 3.0;
  }

  public getLateralVelocity(): number {
    const right = new CANNON.Vec3(1, 0, 0);
    this.chassisBody.quaternion.vmult(right, right);
    return this.chassisBody.velocity.dot(right);
  }

  public setCustomization(style: CarStyle, color: string) {
    this.style = style;
    this.color = color;

    this.scene.remove(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.remove(w));

    this.visuals = this.modelFactory.createProceduralCar(this.style, this.color);
    this.scene.add(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.add(w));
  }
}
