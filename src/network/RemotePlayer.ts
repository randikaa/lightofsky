import * as THREE from "three";
import { AdventurerVisuals } from "../character/AdventurerVisuals";
import type { CharacterClass } from "../character/AdventurerModelFactory";
import { SpeechBubble } from "../vfx/SpeechBubble";

export class RemotePlayer {
  public sessionId: string;
  public name: string;
  public visuals: AdventurerVisuals;
  public speechBubble: SpeechBubble;

  private scene: THREE.Scene;
  private nameplateSprite: THREE.Sprite;

  // Transform interpolation targets
  public targetPosition = new THREE.Vector3();
  public targetHeading = 0;
  public currentPosition = new THREE.Vector3();
  public currentHeading = 0;
  public speed = 0;
  public isGrounded = true;
  public isSprinting = false;

  constructor(
    sessionId: string,
    name: string,
    scene: THREE.Scene,
    initialPos: THREE.Vector3,
    characterClass: CharacterClass = "knight"
  ) {
    this.sessionId = sessionId;
    this.name = name;
    this.scene = scene;

    // 1. KayKit Adventurer 3D Character Mesh & Skeletal Animations
    this.visuals = new AdventurerVisuals(characterClass);
    this.currentPosition.copy(initialPos);
    this.targetPosition.copy(initialPos);
    this.visuals.setPosition(initialPos);
    this.scene.add(this.visuals.group);

    // 2. Nameplate billboard above head
    this.nameplateSprite = this.createNameplate(name);
    this.visuals.group.add(this.nameplateSprite);

    // 3. Overhead Speech Bubble system
    this.speechBubble = new SpeechBubble(this.visuals.group);
  }

  public switchCharacterClass(classId: CharacterClass) {
    this.visuals.switchClass(classId);
  }

  private createNameplate(text: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = "rgba(10, 26, 16, 0.75)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 222, 128, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 1.95, 0);
    sprite.scale.set(1.4, 0.35, 1);
    sprite.renderOrder = 998;
    return sprite;
  }

  public setTargetTransform(
    x: number,
    y: number,
    z: number,
    rotY: number,
    speed: number,
    isGrounded: boolean,
    isSprinting: boolean
  ) {
    this.targetPosition.set(x, y, z);
    this.targetHeading = rotY;
    this.speed = speed;
    this.isGrounded = isGrounded;
    this.isSprinting = isSprinting;
  }

  public showChatBubble(text: string) {
    this.speechBubble.show(this.name, text);
  }

  public update(dt: number) {
    // 1. Frame-rate independent exponential interpolation for position
    const posDamp = 1.0 - Math.exp(-16.0 * dt);
    this.currentPosition.lerp(this.targetPosition, posDamp);
    this.visuals.setPosition(this.currentPosition);

    // 2. Shortest-path angular heading interpolation
    let diff = this.targetHeading - this.currentHeading;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.currentHeading += diff * Math.min(1.0, 16.0 * dt);

    // 3. Step procedural locomotion animations (idle, walk, sprint, jump)
    const isMoving = this.speed > 0.4;
    this.visuals.updateAnimation(
      {
        speed: this.speed,
        isGrounded: this.isGrounded,
        isSprinting: this.isSprinting,
        isMoving,
      },
      dt,
      this.currentHeading
    );

    // 4. Update animated speech bubble
    this.speechBubble.update(dt);
  }

  public destroy() {
    this.speechBubble.destroy();
    this.visuals.destroy();
    if (this.nameplateSprite) {
      if (this.nameplateSprite.material.map) this.nameplateSprite.material.map.dispose();
      this.nameplateSprite.material.dispose();
      this.visuals.group.remove(this.nameplateSprite);
    }

    // Recursively traverse and dispose all child mesh geometries and materials to avoid WebGL memory leaks
    this.visuals.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    this.scene.remove(this.visuals.group);
  }

  private disposeMaterial(mat: THREE.Material) {
    const m = mat as any;
    if (m.map) m.map.dispose();
    if (m.lightMap) m.lightMap.dispose();
    if (m.bumpMap) m.bumpMap.dispose();
    if (m.normalMap) m.normalMap.dispose();
    if (m.specularMap) m.specularMap.dispose();
    if (m.envMap) m.envMap.dispose();
    if (m.alphaMap) m.alphaMap.dispose();
    if (m.roughnessMap) m.roughnessMap.dispose();
    if (m.metalnessMap) m.metalnessMap.dispose();
    mat.dispose();
  }
}
