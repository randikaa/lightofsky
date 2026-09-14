import * as THREE from "three";

export class FollowCamera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D;

  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  private idealOffset = new THREE.Vector3(0, 3.2, -7.2);
  private idealLookAt = new THREE.Vector3(0, 1.2, 4.0);

  private baseFov = 65;
  private maxFov = 85;
  private currentFov = 65;

  constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D) {
    this.camera = camera;
    this.target = target;

    const initialPos = target.position.clone().add(this.idealOffset);
    this.currentPosition.copy(initialPos);
    this.currentLookAt.copy(target.position);
    this.camera.position.copy(initialPos);
    this.camera.lookAt(this.currentLookAt);
  }

  public update(deltaTime: number, speedKmh = 0) {
    const worldOffset = this.idealOffset.clone().applyQuaternion(this.target.quaternion);
    const worldLookAt = this.idealLookAt.clone().applyQuaternion(this.target.quaternion);

    const targetPos = this.target.position.clone().add(worldOffset);
    const targetLook = this.target.position.clone().add(worldLookAt);

    // Frame-rate independent exponential dampening
    const posDamp = 1.0 - Math.exp(-7.5 * deltaTime);
    const lookDamp = 1.0 - Math.exp(-9.0 * deltaTime);

    this.currentPosition.lerp(targetPos, posDamp);
    this.currentLookAt.lerp(targetLook, lookDamp);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);

    // Dynamic FOV punch with speed
    const speedRatio = Math.min(Math.max(speedKmh / 170, 0), 1);
    const targetFov = this.baseFov + (this.maxFov - this.baseFov) * speedRatio;
    this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 4, deltaTime);

    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  public setTarget(newTarget: THREE.Object3D) {
    this.target = newTarget;
  }
}
