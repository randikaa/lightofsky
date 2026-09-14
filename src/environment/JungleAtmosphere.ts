import * as THREE from "three";
import { setupLighting, type LightingRig } from "./LightingSetup";

export { setupLighting, type LightingRig };

export class JungleAtmosphere {
  public lighting?: LightingRig;
  private birds: THREE.InstancedMesh;
  private birdCount = 35;
  private birdData: Array<{ center: THREE.Vector3; angle: number; radius: number; speed: number; yOffset: number }> = [];

  constructor(scene: THREE.Scene, renderer?: THREE.WebGLRenderer) {
    // 1. Setup Complete Lighting & Atmosphere Rig
    if (renderer) {
      this.lighting = setupLighting(scene, renderer);
    } else {
      // Fallback if renderer is omitted
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.FogExp2(0xcce0d0, 0.007);
      const sunLight = new THREE.DirectionalLight(0xfff4e5, 1.8);
      sunLight.position.set(60, 120, 60);
      scene.add(sunLight);
      const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x332211, 0.7);
      scene.add(hemiLight);
    }

    // 2. Ambient Canopy Wildlife (Low-poly V-Wing Birds)
    const wingGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0.6,   -1.2, 0.3, 0,   0, 0, -0.6,
      0, 0, 0.6,   0, 0, -0.6,     1.2, 0.3, 0
    ]);
    wingGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    wingGeo.computeVertexNormals();

    const birdMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    this.birds = new THREE.InstancedMesh(wingGeo, birdMat, this.birdCount);

    for (let i = 0; i < this.birdCount; i++) {
      this.birdData.push({
        center: new THREE.Vector3((Math.random() - 0.5) * 350, 28 + Math.random() * 18, (Math.random() - 0.5) * 350),
        angle: Math.random() * Math.PI * 2,
        radius: 18 + Math.random() * 30,
        speed: 0.7 + Math.random() * 0.8,
        yOffset: Math.random() * 8,
      });
    }
    scene.add(this.birds);
  }

  public update(deltaTime: number, playerPos: THREE.Vector3) {
    // 1. Update Sun & Shadow Frustum Follow Position
    this.lighting?.updateSunPosition(playerPos);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.birdCount; i++) {
      const b = this.birdData[i];
      b.angle += b.speed * deltaTime;

      // Keep birds active near player's vicinity
      if (b.center.distanceTo(playerPos) > 280) {
        b.center.x = playerPos.x + (Math.random() - 0.5) * 220;
        b.center.z = playerPos.z + (Math.random() - 0.5) * 220;
      }

      const x = b.center.x + Math.cos(b.angle) * b.radius;
      const z = b.center.z + Math.sin(b.angle) * b.radius;
      const y = b.center.y + Math.sin(b.angle * 2.5) * 2.2;

      dummy.position.set(x, y, z);
      dummy.rotation.y = -b.angle + Math.PI / 2;
      dummy.updateMatrix();

      this.birds.setMatrixAt(i, dummy.matrix);
    }
    this.birds.instanceMatrix.needsUpdate = true;
  }
}
