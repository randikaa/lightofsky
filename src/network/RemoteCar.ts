import * as THREE from "three";
import type { CarModelFactory, CarStyle, CarVisuals } from "../assets/CarModelFactory";

export class RemoteCar {
  public id: string;
  public playerName: string;
  public visuals: CarVisuals;
  private scene: THREE.Scene;

  // Interpolation targets
  private targetPosition = new THREE.Vector3();
  private targetQuaternion = new THREE.Quaternion();
  private targetSteer = 0;
  public targetSpeed = 0;

  // Nameplate
  private nameplateMesh: THREE.Mesh;

  constructor(
    id: string,
    playerName: string,
    scene: THREE.Scene,
    modelFactory: CarModelFactory,
    style: CarStyle = "supercar",
    color: string = "#3a86ff",
    initialPos = new THREE.Vector3(0, 1.5, 0)
  ) {
    this.id = id;
    this.playerName = playerName;
    this.scene = scene;

    this.visuals = modelFactory.createProceduralCar(style, color);
    this.visuals.group.position.copy(initialPos);
    this.targetPosition.copy(initialPos);
    this.scene.add(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.add(w));

    // Floating 3D Nameplate Canvas
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(playerName, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(3.0, 0.75);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });

    this.nameplateMesh = new THREE.Mesh(planeGeo, planeMat);
    this.nameplateMesh.position.set(0, 2.4, 0);
    this.visuals.group.add(this.nameplateMesh);
  }

  public setTargetTransform(
    x: number,
    y: number,
    z: number,
    qx: number,
    qy: number,
    qz: number,
    qw: number,
    speed: number,
    steer: number
  ) {
    this.targetPosition.set(x, y, z);
    this.targetQuaternion.set(qx, qy, qz, qw);
    this.targetSpeed = speed;
    this.targetSteer = steer;
  }

  public update(deltaTime: number, camera: THREE.Camera) {
    // Exponential smoothing for continuous 60fps rendering without packet tick stutter
    const lerpFactor = 1.0 - Math.exp(-14 * deltaTime);

    this.visuals.group.position.lerp(this.targetPosition, lerpFactor);
    this.visuals.group.quaternion.slerp(this.targetQuaternion, lerpFactor);

    // Sync wheel positions relative to chassis
    const halfW = 0.95;
    const halfL = 1.35;
    const wheelOffsets = [
      new THREE.Vector3(-halfW, -0.05, halfL),  // FL
      new THREE.Vector3(halfW, -0.05, halfL),   // FR
      new THREE.Vector3(-halfW, -0.05, -halfL), // RL
      new THREE.Vector3(halfW, -0.05, -halfL),  // RR
    ];

    wheelOffsets.forEach((offset, idx) => {
      const worldPos = offset.clone().applyQuaternion(this.visuals.group.quaternion).add(this.visuals.group.position);
      const wheelMesh = this.visuals.wheelMeshes[idx];
      wheelMesh.position.copy(worldPos);

      // Wheel rotation and front steer
      const quat = this.visuals.group.quaternion.clone();
      if (idx < 2) {
        // Front steering
        const steerQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.targetSteer);
        quat.multiply(steerQuat);
      }
      wheelMesh.quaternion.copy(quat);
    });

    // Make nameplate always face current camera view (billboard)
    this.nameplateMesh.quaternion.copy(camera.quaternion);
  }

  public destroy() {
    this.scene.remove(this.visuals.group);
    this.visuals.wheelMeshes.forEach((w) => this.scene.remove(w));
  }
}
