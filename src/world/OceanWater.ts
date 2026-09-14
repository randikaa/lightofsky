import * as THREE from "three";

export class OceanWater {
  public mesh: THREE.Mesh;
  public foamMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private basePositions: Float32Array;
  private time = 0;

  public static readonly WATER_Y = 0.0;

  constructor(scene: THREE.Scene) {
    // 600m x 800m ocean expanse covering the western ocean bay
    const width = 650;
    const height = 900;
    const segX = 96;
    const segY = 128;

    this.geometry = new THREE.PlaneGeometry(width, height, segX, segY);
    this.geometry.rotateX(-Math.PI / 2);

    // Save undeformed resting vertices
    this.basePositions = new Float32Array(this.geometry.attributes.position.array);

    // Luminous Tropical Ocean Shader Material
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant tropical azure
      roughness: 0.15,
      metalness: 0.12,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, waterMaterial);
    // Center ocean plane west of beach shoreline in the dedicated cove (X in [1700, 2200], Z in [1750, 2250])
    this.mesh.position.set(1950, OceanWater.WATER_Y, 2000);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Subtle shoreline surf/foam plane along the beach water's edge
    const foamGeo = new THREE.PlaneGeometry(35, 300, 16, 32);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.foamMesh = new THREE.Mesh(foamGeo, foamMat);
    this.foamMesh.position.set(2005, OceanWater.WATER_Y + 0.05, 2000);
    scene.add(this.foamMesh);
  }

  public update(dt: number) {
    this.time += dt * 1.35;

    const posAttr = this.geometry.attributes.position;
    const pos = posAttr.array as Float32Array;
    const base = this.basePositions;

    const count = pos.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const bx = base[idx];
      const bz = base[idx + 2];

      // Dual-frequency gentle ocean swells
      const wave1 = Math.sin(bx * 0.045 + this.time * 1.5) * 0.28;
      const wave2 = Math.cos(bz * 0.05 + this.time * 1.1) * 0.22;
      const wave3 = Math.sin((bx + bz) * 0.08 + this.time * 2.1) * 0.1;

      pos[idx + 1] = wave1 + wave2 + wave3;
    }

    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // Gentle pulse on shoreline foam
    if (this.foamMesh) {
      (this.foamMesh.material as THREE.MeshBasicMaterial).opacity =
        0.35 + Math.sin(this.time * 2.2) * 0.15;
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    scene.remove(this.foamMesh);
    this.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
