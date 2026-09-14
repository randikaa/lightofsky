import * as THREE from "three";

export class ThirdPersonCamera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D;

  /**
   * Spherical coordinates for 3D third-person orbit:
   * - radius: camera distance from character focus point
   * - phi: polar angle measured from +Y zenith (0 = straight overhead, PI/2 = horizontal, PI = underground)
   * - theta: azimuthal angle around +Y axis (full 360-degree horizontal yaw)
   */
  public spherical = new THREE.Spherical(5.0, Math.PI / 3.0, Math.PI);

  /**
   * Strict Polar Angle (Pitch) Limits:
   * - minPolarAngle: ~30° (0.524 rad) prevents extreme vertical overhead gimbal snap.
   * - maxPolarAngle: ~83.7° (1.461 rad) STRICTLY < PI/2 so camera NEVER clips below horizontal or underground.
   */
  public minPolarAngle = Math.PI / 6.0;   // Overhead zenith limit (~30 deg)
  public maxPolarAngle = Math.PI / 2.15;  // Ground-level limit (~83.7 deg, strictly above horizontal)

  // Distance / Zoom bounds
  public minDistance = 2.0;
  public maxDistance = 9.0;
  private targetDistance = 5.0;

  // Ground collision & elevation floor: camera elevation cannot drop below player feet + 0.5m
  public minGroundElevation = 0.5;
  public lookAtOffset = new THREE.Vector3(0, 1.35, 0); // Focus at upper torso / head height

  // Smoothed tracking vectors
  private currentCameraPos = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  // Mouse & Pointer Lock controls
  public isPointerLocked = false;
  public mouseSensitivity = 0.0024;

  constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D, domElement?: HTMLElement) {
    this.camera = camera;
    this.target = target;

    // Listen to mouse input
    window.addEventListener("mousemove", this.handleMouseMove.bind(this));
    window.addEventListener("wheel", this.handleWheel.bind(this), { passive: true });

    if (domElement) {
      domElement.addEventListener("click", () => {
        if (!this.isPointerLocked && domElement.requestPointerLock) {
          domElement.requestPointerLock();
        }
      });
    }

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });

    // Initialize camera position behind character
    const targetPos = target.position;
    const focusPoint = targetPos.clone().add(this.lookAtOffset);
    const initialOffset = new THREE.Vector3().setFromSpherical(this.spherical);
    const initCamPos = focusPoint.clone().add(initialOffset);

    // Enforce initial ground floor
    initCamPos.y = Math.max(initCamPos.y, targetPos.y + this.minGroundElevation);

    this.currentCameraPos.copy(initCamPos);
    this.currentLookAt.copy(focusPoint);
    this.camera.position.copy(initCamPos);
    this.camera.lookAt(focusPoint);
  }

  /**
   * Handle mouse movement with pointer-lock jump protection and strict angle clamping
   */
  private handleMouseMove(e: MouseEvent) {
    // Only process input if pointer locked or mouse button held (drag-look fallback)
    if (!this.isPointerLocked && !(e.buttons & 1) && !(e.buttons & 2)) {
      return;
    }

    // Filter large spurious pointer delta spikes (> 150px) when engaging/disengaging pointer lock
    if (Math.abs(e.movementX) > 150 || Math.abs(e.movementY) > 150) {
      return;
    }

    // 1. Horizontal Yaw (inverted so mouse left turns left, mouse right turns right)
    this.spherical.theta -= e.movementX * this.mouseSensitivity;

    // 2. Vertical Pitch / Polar Angle (strictly clamped within safe range)
    this.spherical.phi -= e.movementY * this.mouseSensitivity;
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      this.minPolarAngle,
      this.maxPolarAngle
    );
  }

  /**
   * Smooth zoom on mouse wheel
   */
  private handleWheel(e: WheelEvent) {
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance + e.deltaY * 0.005,
      this.minDistance,
      this.maxDistance
    );
  }

  /**
   * Frame update with exponential smoothing, ground collision floor, and focus tracking
   */
  public update(dt: number) {
    // Smooth zoom distance
    this.spherical.radius = THREE.MathUtils.damp(
      this.spherical.radius,
      this.targetDistance,
      12,
      dt
    );

    const targetPos = this.target.position;
    const focusPoint = targetPos.clone().add(this.lookAtOffset);

    // Compute ideal spherical offset from focus point
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    const desiredCameraPos = focusPoint.clone().add(offset);

    // Ground collision / elevation clamp: camera can NEVER drop below target.position.y + minGroundElevation
    const minSafeY = targetPos.y + this.minGroundElevation;
    if (desiredCameraPos.y < minSafeY) {
      desiredCameraPos.y = minSafeY;
    }

    // Frame-rate independent exponential smoothing
    const posDamp = 1.0 - Math.exp(-16.0 * dt);
    const lookDamp = 1.0 - Math.exp(-20.0 * dt);

    this.currentCameraPos.lerp(desiredCameraPos, posDamp);
    this.currentLookAt.lerp(focusPoint, lookDamp);

    // Final safety floor guarantee
    if (this.currentCameraPos.y < minSafeY) {
      this.currentCameraPos.y = minSafeY;
    }

    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Returns horizontal forward direction vector (normalized on XZ plane) that camera is facing
   */
  public getForwardVector(): THREE.Vector3 {
    const fwd = new THREE.Vector3().subVectors(this.currentLookAt, this.currentCameraPos);
    fwd.y = 0;
    if (fwd.lengthSq() < 0.0001) {
      fwd.set(-Math.sin(this.spherical.theta), 0, -Math.cos(this.spherical.theta));
    }
    return fwd.normalize();
  }

  /**
   * Returns horizontal right strafe vector via cross product (forward x up)
   */
  public getRightVector(): THREE.Vector3 {
    const forward = this.getForwardVector();
    return forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  }

  /**
   * Returns camera forward and right vectors for character movement
   */
  public getCameraVectors(): { forward: THREE.Vector3; right: THREE.Vector3 } {
    const forward = this.getForwardVector();
    const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    return { forward, right };
  }

  /**
   * Returns current horizontal look yaw (radians) so character moves in camera's forward direction
   */
  public getYaw(): number {
    const fwd = this.getForwardVector();
    return Math.atan2(fwd.x, fwd.z);
  }

  public setTarget(target: THREE.Object3D) {
    this.target = target;
  }

  // Getters / setters for backward compatibility
  public get yaw(): number {
    return this.getYaw();
  }

  public get pitch(): number {
    return Math.PI / 2 - this.spherical.phi;
  }

  public get distance(): number {
    return this.spherical.radius;
  }

  public set distance(val: number) {
    this.spherical.radius = THREE.MathUtils.clamp(val, this.minDistance, this.maxDistance);
    this.targetDistance = this.spherical.radius;
  }
}

// Export alias CameraController for flexibility
export { ThirdPersonCamera as CameraController };
