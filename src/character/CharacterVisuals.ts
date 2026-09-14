import * as THREE from "three";

export interface CharacterAnimationState {
  speed: number;
  isGrounded: boolean;
  isSprinting: boolean;
  isMoving: boolean;
}

export class CharacterVisuals {
  public group: THREE.Group;
  
  // Body parts for procedural animation
  private head: THREE.Group;
  private torso: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private backpack: THREE.Mesh;

  private animTimer = 0;
  private currentHeading = 0;

  constructor() {
    this.group = new THREE.Group();

    // Palette: Adventurer / Explorer theme
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0xc27d38, roughness: 0.8 }); // Safari khaki
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.85 }); // Dark navy cargo pants
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x291b12, roughness: 0.9 });
    const backpackMat = new THREE.MeshStandardMaterial({ color: 0x2d4a3e, roughness: 0.8 }); // Olive survival pack
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x8d5b2c, roughness: 0.8 });
    const goggleMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });

    // --- 1. TORSO ---
    this.torso = new THREE.Group();
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.32);
    const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torso.add(torsoMesh);

    // Collar / Scarf
    const scarfGeo = new THREE.BoxGeometry(0.42, 0.12, 0.34);
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.8 });
    const scarfMesh = new THREE.Mesh(scarfGeo, scarfMat);
    scarfMesh.position.y = 0.32;
    this.torso.add(scarfMesh);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.42, 0.48, 0.22);
    this.backpack = new THREE.Mesh(packGeo, backpackMat);
    this.backpack.position.set(0, 0.05, -0.24);
    this.backpack.castShadow = true;
    this.torso.add(this.backpack);

    // Sleeping roll on top of backpack
    const rollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.44, 8);
    const rollMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const rollMesh = new THREE.Mesh(rollGeo, rollMat);
    rollMesh.rotation.z = Math.PI / 2;
    rollMesh.position.set(0, 0.34, -0.24);
    this.torso.add(rollMesh);

    // --- 2. HEAD ---
    this.head = new THREE.Group();
    this.head.position.set(0, 0.48, 0);

    // Head base
    const headGeo = new THREE.BoxGeometry(0.32, 0.34, 0.32);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Safari / Explorer Hat
    const hatBrimGeo = new THREE.CylinderGeometry(0.38, 0.40, 0.05, 12);
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 0.18;
    this.head.add(hatBrim);

    const hatCrownGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.18, 12);
    const hatCrown = new THREE.Mesh(hatCrownGeo, hatMat);
    hatCrown.position.y = 0.28;
    this.head.add(hatCrown);

    // Goggles on hat
    const goggleFrameGeo = new THREE.BoxGeometry(0.28, 0.08, 0.1);
    const goggleFrame = new THREE.Mesh(goggleFrameGeo, goggleMat);
    goggleFrame.position.set(0, 0.20, 0.16);
    this.head.add(goggleFrame);

    this.torso.add(this.head);

    // --- 3. ARMS ---
    // Left Arm (pivot at shoulder)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.36, 0.25, 0);
    const armGeo = new THREE.BoxGeometry(0.16, 0.58, 0.18);
    armGeo.translate(0, -0.25, 0); // Offset pivot to top of arm
    const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    // Hand
    const handGeo = new THREE.BoxGeometry(0.12, 0.14, 0.14);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.58, 0);
    this.leftArm.add(leftHand);

    // Right Arm (pivot at shoulder)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.36, 0.25, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // Hand
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0, -0.58, 0);
    this.rightArm.add(rightHand);

    this.torso.add(this.leftArm);
    this.torso.add(this.rightArm);

    // --- 4. LEGS ---
    // Left Leg (pivot at hip)
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.18, -0.32, 0);
    const legGeo = new THREE.BoxGeometry(0.18, 0.62, 0.20);
    legGeo.translate(0, -0.28, 0); // Offset pivot to top of leg
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    // Left Boot
    const bootGeo = new THREE.BoxGeometry(0.20, 0.18, 0.28);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.62, 0.04);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftBoot);

    // Right Leg (pivot at hip)
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.18, -0.32, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    // Right Boot
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.62, 0.04);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightBoot);

    // Put torso inside group, positioned so character feet touch ground at y = 0
    this.torso.position.y = 1.05;
    this.group.add(this.torso);
    this.group.add(this.leftLeg);
    this.group.add(this.rightLeg);
    this.leftLeg.position.y = 0.72;
    this.rightLeg.position.y = 0.72;
  }

  /**
   * Procedurally animate character limbs based on state, speed, and motion
   */
  public updateAnimation(state: CharacterAnimationState, dt: number, targetHeading?: number) {
    // 1. Smoothly interpolate body rotation to face movement direction
    if (targetHeading !== undefined && state.isMoving) {
      let diff = targetHeading - this.currentHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.currentHeading += diff * Math.min(1.0, 14.0 * dt);
      this.group.rotation.y = this.currentHeading;
    }

    if (!state.isGrounded) {
      // 2. AIRBORNE / JUMP POSE
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, -0.8, 10, dt);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, -0.8, 10, dt);
      this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, -0.4, 10, dt);
      this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, 0.4, 10, dt);

      // Tuck legs
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0.6, 10, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, -0.3, 10, dt);
      this.torso.position.y = THREE.MathUtils.damp(this.torso.position.y, 1.08, 10, dt);
      return;
    }

    if (state.isMoving) {
      // 3. RUN / WALK LOCOMOTION CYCLE
      const strideFreq = state.isSprinting ? 14.0 : 9.0;
      const strideAmp = state.isSprinting ? 0.95 : 0.65;
      this.animTimer += dt * strideFreq;

      const legSwing = Math.sin(this.animTimer) * strideAmp;
      const armSwing = Math.sin(this.animTimer) * (strideAmp * 0.85);

      // Opposite arm-leg movement
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -armSwing;
      this.rightArm.rotation.x = armSwing;

      // Reset arm lateral splay
      this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, 0.05, 10, dt);
      this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, -0.05, 10, dt);

      // Vertical body bobbing with stride
      const bob = Math.abs(Math.cos(this.animTimer)) * (state.isSprinting ? 0.08 : 0.04);
      this.torso.position.y = 1.05 - bob;

      // Slight forward lean when sprinting
      const lean = state.isSprinting ? 0.18 : 0.06;
      this.torso.rotation.x = THREE.MathUtils.damp(this.torso.rotation.x, lean, 10, dt);
    } else {
      // 4. IDLE BREATHING POSE
      this.animTimer += dt * 2.2;
      const breathe = Math.sin(this.animTimer) * 0.02;

      this.torso.position.y = 1.05 + breathe;
      this.torso.rotation.x = THREE.MathUtils.damp(this.torso.rotation.x, 0, 8, dt);
      this.head.rotation.y = Math.sin(this.animTimer * 0.5) * 0.08;

      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0.05, 8, dt);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0.05, 8, dt);
      this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, 0.08, 8, dt);
      this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, -0.08, 8, dt);

      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 8, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 8, dt);
    }
  }

  public setPosition(pos: THREE.Vector3) {
    this.group.position.copy(pos);
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }
}
