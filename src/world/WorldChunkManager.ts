import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { ProceduralNoise } from "./ProceduralNoise";
import { TerrainPhysics } from "../physics/TerrainPhysics";
import { InstancedFloraRuins } from "./InstancedFloraRuins";

interface ActiveChunk {
  key: string;
  chunkX: number;
  chunkZ: number;
  terrainMesh: THREE.Mesh;
  floraContainer: THREE.Group;
  terrainCollider: RAPIER.Collider;
  floraColliders: RAPIER.Collider[];
}

export class WorldChunkManager {
  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;
  private noise: ProceduralNoise;

  public readonly chunkSize = 64.0;
  public readonly viewDistance = 3; // 3 chunks radius = 7x7 active grid (448m diameter)

  private activeChunks = new Map<string, ActiveChunk>();
  private currentCenterChunkKey = "";

  constructor(scene: THREE.Scene, physicsWorld: RAPIER.World, seed = 1337) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.noise = new ProceduralNoise(seed);
  }

  public update(playerPos: THREE.Vector3) {
    const centerChunkX = Math.floor(playerPos.x / this.chunkSize);
    const centerChunkZ = Math.floor(playerPos.z / this.chunkSize);
    const centerKey = `${centerChunkX},${centerChunkZ}`;

    if (centerKey === this.currentCenterChunkKey) return;
    this.currentCenterChunkKey = centerKey;

    const neededKeys = new Set<string>();

    // Spiral query around player center
    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const cx = centerChunkX + dx;
        const cz = centerChunkZ + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.activeChunks.has(key)) {
          this.buildChunk(cx, cz, key);
        }
      }
    }

    // Dispose out-of-range chunks to keep memory usage strictly constant
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        this.disposeChunk(chunk);
        this.activeChunks.delete(key);
      }
    }
  }

  private buildChunk(cx: number, cz: number, key: string) {
    // 1. Terrain Mesh & Rapier Heightfield
    const { mesh, collider: terrainCollider } = TerrainPhysics.createChunkMeshAndCollider(
      cx,
      cz,
      this.chunkSize,
      32, // 32x32 segments
      this.noise,
      this.physicsWorld
    );
    this.scene.add(mesh);

    // 2. Instanced Flora & Ancient Ruins
    const { container: floraContainer, colliders: floraColliders } = InstancedFloraRuins.populateChunk(
      cx,
      cz,
      this.chunkSize,
      this.noise,
      this.physicsWorld
    );
    this.scene.add(floraContainer);

    this.activeChunks.set(key, {
      key,
      chunkX: cx,
      chunkZ: cz,
      terrainMesh: mesh,
      floraContainer,
      terrainCollider,
      floraColliders,
    });
  }

  private disposeChunk(chunk: ActiveChunk) {
    // 1. Unbind Three.js terrain resources
    this.scene.remove(chunk.terrainMesh);
    chunk.terrainMesh.geometry.dispose();
    if (Array.isArray(chunk.terrainMesh.material)) {
      chunk.terrainMesh.material.forEach((m) => m.dispose());
    } else {
      chunk.terrainMesh.material.dispose();
    }

    // 2. Unbind Instanced flora
    this.scene.remove(chunk.floraContainer);
    chunk.floraContainer.traverse((child) => {
      if ((child as THREE.InstancedMesh).isInstancedMesh) {
        const im = child as THREE.InstancedMesh;
        im.dispose();
      }
    });

    // 3. Purge Rapier Physics Colliders from WASM heap
    this.physicsWorld.removeCollider(chunk.terrainCollider, false);
    chunk.floraColliders.forEach((col) => {
      this.physicsWorld.removeCollider(col, false);
    });
  }

  public getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  public getNoise(): ProceduralNoise {
    return this.noise;
  }
}
