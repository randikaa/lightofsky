import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { ProceduralNoise } from "./ProceduralNoise";
import { ForestModelFactory } from "./ForestModelFactory";

export class InstancedFloraRuins {
  // Shared fallback primitive geometries and materials
  private static treeTrunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 5.0, 6);
  private static treeCrownGeo = new THREE.DodecahedronGeometry(2.8, 1);
  private static fernLeafGeo = new THREE.ConeGeometry(1.2, 2.2, 5);
  private static boulderGeo = new THREE.DodecahedronGeometry(1.5, 0);
  private static ruinPillarGeo = new THREE.CylinderGeometry(0.85, 0.95, 6.5, 8);
  private static ruinArchBeamGeo = new THREE.BoxGeometry(4.0, 0.8, 1.2);

  private static woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
  private static canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e5622, roughness: 0.7 });
  private static fernMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.6 });
  private static boulderMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
  private static ruinStoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });

  /**
   * Populates a chunk with KayKit Forest Nature trees, bushes, rocks, grass, and ancient ruins
   */
  public static populateChunk(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    noise: ProceduralNoise,
    physicsWorld: RAPIER.World
  ): {
    container: THREE.Group;
    colliders: RAPIER.Collider[];
  } {
    const container = new THREE.Group();
    const colliders: RAPIER.Collider[] = [];

    const originX = chunkX * chunkSize;
    const originZ = chunkZ * chunkSize;

    const factory = ForestModelFactory.getInstance();
    const dummy = new THREE.Object3D();

    // Use KayKit Nature assets if loaded
    if (factory.isLoaded && factory.sharedMaterial) {
      const mat = factory.sharedMaterial;

      // Instance capacities per chunk
      const MAX_PINES = 25;
      const MAX_OAKS = 25;
      const MAX_BIRCHES = 15;
      const MAX_BUSHES = 40;
      const MAX_ROCKS = 25;
      const MAX_GRASS = 60;
      const MAX_RUINS = 12;

      // Select geometries from the factory
      const pineGeo = factory.pineGeometries[0] || this.treeCrownGeo;
      const oakGeo = factory.oakGeometries[0] || this.treeCrownGeo;
      const birchGeo = factory.birchGeometries[0] || this.treeCrownGeo;
      const bushGeo = factory.bushGeometries[0] || this.fernLeafGeo;
      const rockGeo = factory.rockGeometries[0] || this.boulderGeo;
      const grassGeo = factory.grassGeometries[0] || this.fernLeafGeo;

      const pineInst = new THREE.InstancedMesh(pineGeo, mat, MAX_PINES);
      const oakInst = new THREE.InstancedMesh(oakGeo, mat, MAX_OAKS);
      const birchInst = new THREE.InstancedMesh(birchGeo, mat, MAX_BIRCHES);
      const bushInst = new THREE.InstancedMesh(bushGeo, mat, MAX_BUSHES);
      const rockInst = new THREE.InstancedMesh(rockGeo, mat, MAX_ROCKS);
      const grassInst = new THREE.InstancedMesh(grassGeo, mat, MAX_GRASS);

      // Ancient Ruins
      const pillarInst = new THREE.InstancedMesh(this.ruinPillarGeo, this.ruinStoneMat, MAX_RUINS);
      const archBeamInst = new THREE.InstancedMesh(this.ruinArchBeamGeo, this.ruinStoneMat, MAX_RUINS);

      const allMeshes = [pineInst, oakInst, birchInst, bushInst, rockInst, grassInst, pillarInst, archBeamInst];
      allMeshes.forEach((im) => {
        im.castShadow = true;
        im.receiveShadow = true;
      });

      let pineCount = 0;
      let oakCount = 0;
      let birchCount = 0;
      let bushCount = 0;
      let rockCount = 0;
      let grassCount = 0;
      let ruinCount = 0;

      // Grid sampling (10x10 = 100 potential candidate spots per chunk)
      const steps = 10;
      const cell = chunkSize / steps;

      for (let gx = 0; gx < steps; gx++) {
        for (let gz = 0; gz < steps; gz++) {
          const hash = Math.sin(originX + gx * 12.9898 + (originZ + gz * 78.233)) * 43758.5453;
          const fract = hash - Math.floor(hash);

          const wx = originX + gx * cell + (fract * 0.7 + 0.15) * cell;
          const wz = originZ + gz * cell + (((hash * 2.3) % 1.0) * 0.7 + 0.15) * cell;

          const evalData = noise.evaluate(wx, wz);

          // 1. Exclude the road, underwater ocean, and beach dunes
          if (evalData.roadFactor > 0.05 || evalData.isUnderwater || evalData.isBeach) continue;

          // 2. Exclude steep cliffs
          if (evalData.slope > 0.92) continue;

          // 2b. Exclude village settlement area from heavy trees and boulders (allow grass/shrubs)
          const distToVillage = Math.hypot(wx - noise.getRoadCenterX(wz), wz);
          const inVillage = distToVillage < 30.0;

          const yaw = fract * Math.PI * 2;

          // 3. Ancient Ruins on Plateaus
          if (!inVillage && evalData.isRuinPlateau && ruinCount < MAX_RUINS) {
            const tilt = (fract - 0.5) * 0.15;
            dummy.position.set(wx, evalData.height + 3.25, wz);
            dummy.rotation.set(tilt, yaw, tilt);
            dummy.scale.setScalar(0.9 + fract * 0.3);
            dummy.updateMatrix();
            pillarInst.setMatrixAt(ruinCount, dummy.matrix);

            const col = physicsWorld.createCollider(
              RAPIER.ColliderDesc.cylinder(3.25, 0.9).setRestitution(0.0).setFriction(1.2)
            );
            col.setTranslation({ x: wx, y: evalData.height + 3.25, z: wz });
            colliders.push(col);

            if (fract > 0.5) {
              dummy.position.set(wx, evalData.height + 6.8, wz);
              dummy.rotation.set(0, fract * 3.14, 0);
              dummy.updateMatrix();
              archBeamInst.setMatrixAt(ruinCount, dummy.matrix);

              const beamCol = physicsWorld.createCollider(
                RAPIER.ColliderDesc.cuboid(2.0, 0.4, 0.6).setRestitution(0.0).setFriction(1.2)
              );
              beamCol.setTranslation({ x: wx, y: evalData.height + 6.8, z: wz });
              colliders.push(beamCol);
            }

            ruinCount++;
            continue;
          }

          // 4. KayKit Boulders on ridges / hillsides
          if (!inVillage && (evalData.slope > 0.35 || fract < 0.15) && rockCount < MAX_ROCKS) {
            const rScale = 2.0 + fract * 2.2;
            dummy.position.set(wx, evalData.height - 0.1, wz);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.setScalar(rScale);
            dummy.updateMatrix();
            rockInst.setMatrixAt(rockCount++, dummy.matrix);

            // Solid rock collider
            const rCol = physicsWorld.createCollider(
              RAPIER.ColliderDesc.ball(0.55 * rScale).setRestitution(0.0).setFriction(1.2)
            );
            rCol.setTranslation({ x: wx, y: evalData.height + 0.4 * rScale, z: wz });
            colliders.push(rCol);
            continue;
          }

          // 5. KayKit Trees (Pine, Oak, Birch)
          if (!inVillage && fract > 0.5) {
            const treeChoice = (hash * 5.7) % 1.0;
            const tScale = 1.0 + fract * 0.55;

            dummy.position.set(wx, evalData.height, wz);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.setScalar(tScale);
            dummy.updateMatrix();

            let placedTree = false;

            if (treeChoice < 0.45 && pineCount < MAX_PINES) {
              pineInst.setMatrixAt(pineCount++, dummy.matrix);
              placedTree = true;
            } else if (treeChoice < 0.8 && oakCount < MAX_OAKS) {
              oakInst.setMatrixAt(oakCount++, dummy.matrix);
              placedTree = true;
            } else if (birchCount < MAX_BIRCHES) {
              birchInst.setMatrixAt(birchCount++, dummy.matrix);
              placedTree = true;
            }

            if (placedTree) {
              // Tree trunk solid physics collider
              const treeCol = physicsWorld.createCollider(
                RAPIER.ColliderDesc.cylinder(2.2 * tScale, 0.42 * tScale).setRestitution(0.0).setFriction(1.2)
              );
              treeCol.setTranslation({ x: wx, y: evalData.height + 2.2 * tScale, z: wz });
              colliders.push(treeCol);
              continue;
            }
          }

          // 6. KayKit Bushes & Shrubs
          if (fract > 0.28 && bushCount < MAX_BUSHES) {
            const bScale = 2.4 + fract * 2.2;
            dummy.position.set(wx, evalData.height, wz);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.setScalar(bScale);
            dummy.updateMatrix();
            bushInst.setMatrixAt(bushCount++, dummy.matrix);
            continue;
          }

          // 7. KayKit Ground Grass Tufts
          if (grassCount < MAX_GRASS) {
            const gScale = 1.4 + fract * 1.2;
            dummy.position.set(wx, evalData.height, wz);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.setScalar(gScale);
            dummy.updateMatrix();
            grassInst.setMatrixAt(grassCount++, dummy.matrix);
          }
        }
      }

      pineInst.count = pineCount;
      oakInst.count = oakCount;
      birchInst.count = birchCount;
      bushInst.count = bushCount;
      rockInst.count = rockCount;
      grassInst.count = grassCount;
      pillarInst.count = ruinCount;
      archBeamInst.count = ruinCount;

      allMeshes.forEach((im) => {
        im.instanceMatrix.needsUpdate = true;
        container.add(im);
      });

      return { container, colliders };
    }

    // Fallback: Primitive placeholder rendering if assets are not yet loaded
    const MAX_TREES = 45;
    const MAX_FERNS = 60;
    const MAX_BOULDERS = 20;

    const crownInst = new THREE.InstancedMesh(this.treeCrownGeo, this.canopyMat, MAX_TREES);
    const trunkInst = new THREE.InstancedMesh(this.treeTrunkGeo, this.woodMat, MAX_TREES);
    const fernInst = new THREE.InstancedMesh(this.fernLeafGeo, this.fernMat, MAX_FERNS);
    const boulderInst = new THREE.InstancedMesh(this.boulderGeo, this.boulderMat, MAX_BOULDERS);

    let treeCount = 0;
    let fernCount = 0;
    let boulderCount = 0;

    const steps = 8;
    const cell = chunkSize / steps;

    for (let gx = 0; gx < steps; gx++) {
      for (let gz = 0; gz < steps; gz++) {
        const hash = Math.sin(originX + gx * 12.9898 + (originZ + gz * 78.233)) * 43758.5453;
        const fract = hash - Math.floor(hash);

        const wx = originX + gx * cell + (fract * 0.7 + 0.15) * cell;
        const wz = originZ + gz * cell + (((hash * 2.3) % 1.0) * 0.7 + 0.15) * cell;

        const evalData = noise.evaluate(wx, wz);
        if (evalData.roadFactor > 0.05 || evalData.slope > 0.95) continue;

        if (treeCount < MAX_TREES && fract > 0.4) {
          const tScale = 0.85 + fract * 0.5;
          dummy.position.set(wx, evalData.height + 2.5 * tScale, wz);
          dummy.rotation.set(0, fract * 6.28, 0);
          dummy.scale.set(tScale, tScale, tScale);
          dummy.updateMatrix();
          trunkInst.setMatrixAt(treeCount, dummy.matrix);

          dummy.position.set(wx, evalData.height + 5.5 * tScale, wz);
          dummy.updateMatrix();
          crownInst.setMatrixAt(treeCount, dummy.matrix);

          const treeCol = physicsWorld.createCollider(
            RAPIER.ColliderDesc.cylinder(2.5 * tScale, 0.45 * tScale).setRestitution(0.0).setFriction(1.2)
          );
          treeCol.setTranslation({ x: wx, y: evalData.height + 2.5 * tScale, z: wz });
          colliders.push(treeCol);

          treeCount++;
        } else if (fernCount < MAX_FERNS) {
          dummy.position.set(wx, evalData.height + 0.6, wz);
          dummy.rotation.set(0.1, fract * 6.28, 0.1);
          dummy.scale.setScalar(0.7 + fract * 0.6);
          dummy.updateMatrix();
          fernInst.setMatrixAt(fernCount++, dummy.matrix);
        }
      }
    }

    crownInst.count = treeCount;
    trunkInst.count = treeCount;
    boulderInst.count = boulderCount;
    fernInst.count = fernCount;

    [crownInst, trunkInst, boulderInst, fernInst].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      container.add(im);
    });

    return { container, colliders };
  }
}
