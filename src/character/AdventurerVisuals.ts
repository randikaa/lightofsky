import * as THREE from "three";
import {
  AdventurerModelFactory,
  type CharacterClass,
  type InstantiatedCharacter,
} from "./AdventurerModelFactory";

export interface AdventurerAnimationState {
  speed: number;
  isGrounded: boolean;
  isSprinting: boolean;
  isMoving: boolean;
}

export class AdventurerVisuals {
  public group: THREE.Group;
  public classId: CharacterClass;

  private factory: AdventurerModelFactory;
  private instantiated!: InstantiatedCharacter;
  private currentAction: THREE.AnimationAction | null = null;
  private wasGrounded = true;

  constructor(classId: CharacterClass = "knight") {
    this.group = new THREE.Group();
    this.classId = classId;
    this.factory = AdventurerModelFactory.getInstance();

    this.setupCharacter(classId);
  }

  private setupCharacter(classId: CharacterClass) {
    this.classId = classId;
    this.instantiated = this.factory.instantiate(classId);
    this.group.add(this.instantiated.root);

    // Initial action: Idle
    this.currentAction = this.instantiated.actions.idle;
    this.currentAction.play();
  }

  public switchClass(newClassId: CharacterClass) {
    if (newClassId === this.classId) return;

    // Cleanly remove existing model
    if (this.instantiated) {
      this.group.remove(this.instantiated.root);
      this.disposeObject(this.instantiated.root);
    }

    this.setupCharacter(newClassId);
  }

  private fadeToAction(targetAction: THREE.AnimationAction, duration = 0.18) {
    if (!targetAction || this.currentAction === targetAction) return;

    const prevAction = this.currentAction;
    this.currentAction = targetAction;

    targetAction.reset();
    targetAction.setEffectiveTimeScale(1);
    targetAction.setEffectiveWeight(1);
    targetAction.crossFadeFrom(prevAction!, duration, true);
    targetAction.play();
  }

  public updateAnimation(state: AdventurerAnimationState, dt: number, heading?: number) {
    if (!this.instantiated) return;

    const { actions } = this.instantiated;

    if (!state.isGrounded) {
      // In air / jumping
      if (this.wasGrounded) {
        this.fadeToAction(actions.jumpStart, 0.1);
      } else {
        this.fadeToAction(actions.jumpIdle, 0.15);
      }
    } else {
      // Landed
      if (!this.wasGrounded) {
        // Just touched down
        this.fadeToAction(actions.jumpLand, 0.08);
      }

      if (state.isMoving) {
        if (state.isSprinting && state.speed > 5.0) {
          actions.run.timeScale = Math.max(0.8, state.speed / 8.0);
          this.fadeToAction(actions.run, 0.15);
        } else {
          actions.walk.timeScale = Math.max(0.6, state.speed / 4.0);
          this.fadeToAction(actions.walk, 0.15);
        }
      } else {
        this.fadeToAction(actions.idle, 0.2);
      }
    }

    this.wasGrounded = state.isGrounded;

    // Update skeletal animations
    this.instantiated.mixer.update(dt);

    // Apply orientation
    if (typeof heading === "number") {
      this.group.rotation.y = heading;
    }
  }

  public setPosition(pos: THREE.Vector3) {
    this.group.position.copy(pos);
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  }

  public destroy() {
    if (this.instantiated) {
      this.group.remove(this.instantiated.root);
      this.disposeObject(this.instantiated.root);
    }
  }
}
