import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { ProceduralNoise } from "../world/ProceduralNoise";

export class TerrainPhysics {
  public static createChunkMeshAndCollider(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    segments: number,
    noise: ProceduralNoise,
    physicsWorld: RAPIER.World
  ): {
    mesh: THREE.Mesh;
    collider: RAPIER.Collider;
  } {
    const numVertsX = segments + 1;
    const numVertsZ = segments + 1;
    const totalVerts = numVertsX * numVertsZ;

    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const rapierHeights = new Float32Array(totalVerts);

    const chunkCenterX = (chunkX + 0.5) * chunkSize;
    const chunkCenterZ = (chunkZ + 0.5) * chunkSize;
    const halfSize = chunkSize * 0.5;
    const step = chunkSize / segments;

    // Biome palette
    const grassColor = new THREE.Color(0x2d6a4f);
    const mudRoadColor = new THREE.Color(0x5c4033);
    const stoneColor = new THREE.Color(0x78716c);
    const cliffColor = new THREE.Color(0x1b2d20);
    const goldenSandColor = new THREE.Color(0xe2c185);
    const wetSandColor = new THREE.Color(0xb59560);
    const shallowSeaColor = new THREE.Color(0x275d68);
    const deepSeaBedColor = new THREE.Color(0x132731);

    let vIdx = 0;
    let uvIdx = 0;

    // Three.js Plane vertex order: rows along Z, cols along X
    for (let zi = 0; zi <= segments; zi++) {
      for (let xi = 0; xi <= segments; xi++) {
        const localX = -halfSize + xi * step;
        const localZ = -halfSize + zi * step;
        const worldX = chunkCenterX + localX;
        const worldZ = chunkCenterZ + localZ;

        const {
          height,
          roadFactor,
          isRuinPlateau,
          slope,
          isUnderwater,
          sandFactor,
          waterDepth,
        } = noise.evaluate(worldX, worldZ);

        positions[vIdx] = localX;
        positions[vIdx + 1] = height;
        positions[vIdx + 2] = localZ;

        // Rapier heightfield indexing: outer loop X, inner loop Z
        rapierHeights[xi * numVertsZ + zi] = height;

        // Dynamic vertex color blend across biomes
        let finalColor = grassColor.clone();

        if (isUnderwater) {
          // Underwater seabed (aquamarine shallow to deep navy)
          const depthRatio = Math.min(1.0, waterDepth / 6.0);
          finalColor = shallowSeaColor.clone().lerp(deepSeaBedColor, depthRatio);
        } else if (sandFactor > 0.15) {
          // Coastal Beach & Sand Dunes
          const isWet = height < 0.6;
          const targetSand = isWet ? wetSandColor : goldenSandColor;
          finalColor.lerp(targetSand, Math.min(1.0, sandFactor * 1.3));
        } else if (roadFactor > 0.35) {
          finalColor.lerp(mudRoadColor, roadFactor);
        } else if (isRuinPlateau) {
          finalColor.lerp(stoneColor, 0.85);
        } else if (slope > 1.1) {
          finalColor.lerp(cliffColor, 0.8);
        }

        colors[vIdx] = finalColor.r;
        colors[vIdx + 1] = finalColor.g;
        colors[vIdx + 2] = finalColor.b;

        uvs[uvIdx] = xi / segments;
        uvs[uvIdx + 1] = zi / segments;

        vIdx += 3;
        uvIdx += 2;
      }
    }

    // Three.js index buffer
    const indices: number[] = [];
    for (let zi = 0; zi < segments; zi++) {
      for (let xi = 0; xi < segments; xi++) {
        const a = zi * numVertsX + xi;
        const b = (zi + 1) * numVertsX + xi;
        const c = (zi + 1) * numVertsX + (xi + 1);
        const d = zi * numVertsX + (xi + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunkCenterX, 0, chunkCenterZ);
    mesh.receiveShadow = true;

    // 2. Rapier 3D Heightfield Collider (Zero bounciness, high tire traction)
    const colliderDesc = RAPIER.ColliderDesc.heightfield(
      segments,
      segments,
      rapierHeights,
      { x: chunkSize, y: 1.0, z: chunkSize }
    )
      .setRestitution(0.0)
      .setFriction(1.2);

    const collider = physicsWorld.createCollider(colliderDesc);
    collider.setTranslation({ x: chunkCenterX, y: 0, z: chunkCenterZ });

    return { mesh, collider };
  }
}
