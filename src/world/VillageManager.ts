import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { VillageModelFactory } from "./VillageModelFactory";
import { VillagePrefabs } from "./VillagePrefabs";
import type { ProceduralNoise } from "./ProceduralNoise";

export class VillageManager {
  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;
  private noise: ProceduralNoise;

  private villageGroup = new THREE.Group();
  private villageColliders: RAPIER.Collider[] = [];
  public isBuilt = false;
  public waygatePos = new THREE.Vector3();
  private portalBeacon: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, physicsWorld: RAPIER.World, noise: ProceduralNoise) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.noise = noise;
  }

  /**
   * Builds the entire Medieval Village matching Preview.jpg with airtight modular snapping
   */
  public buildVillage(): void {
    if (this.isBuilt) return;

    const factory = VillageModelFactory.getInstance();
    if (!factory.isLoaded) {
      console.warn("VillageManager: VillageModelFactory not yet loaded, deferring build.");
      return;
    }

    // Anchor village at world spawn (Z = 0, road center X = 110)
    const baseZ = 0;
    const baseX = this.noise.getRoadCenterX(baseZ);
    const baseY = this.noise.evaluate(baseX, baseZ).height;

    // Road tangent direction at Z = 0: (dX/dZ, 1)
    const delta = 1.0;
    const dX = this.noise.getRoadCenterX(baseZ + delta) - this.noise.getRoadCenterX(baseZ - delta);
    const roadAngle = Math.atan2(dX, delta * 2); // ~49 degrees (0.85 rad)

    // Unit vectors along road and perpendicular (left / right)
    const forward = new THREE.Vector3(Math.sin(roadAngle), 0, Math.cos(roadAngle)).normalize();
    const right = new THREE.Vector3(Math.cos(roadAngle), 0, -Math.sin(roadAngle)).normalize();
    const left = right.clone().negate();

    // Helper to calculate world position from (forwardOffset, sideOffset)
    const getPos = (forwardOffset: number, sideOffset: number, yOffset = 0): THREE.Vector3 => {
      const pos = new THREE.Vector3(baseX, baseY, baseZ)
        .addScaledVector(forward, forwardOffset)
        .addScaledVector(sideOffset > 0 ? right : left, Math.abs(sideOffset));
      const groundH = this.noise.evaluate(pos.x, pos.z).height;
      pos.y = groundH + yOffset;
      return pos;
    };

    // ==========================================
    // 1. LEFT SIDE COMPLEX: Tavern + Skybridge + Brewer's House
    // ==========================================
    // Both buildings and the skybridge share the exact same orientation and snap together with 0 gaps!
    const leftSideDist = -10.5;
    const leftRot = roadAngle + Math.PI / 2; // Front faces the road

    // Tavern / Inn (4m wide x 6m deep) at forwardOffset = 0
    const tavernPos = getPos(0.0, leftSideDist);
    const tavern = VillagePrefabs.createTavernInn(factory, this.physicsWorld, tavernPos, leftRot);
    this.villageGroup.add(tavern.group);
    this.villageColliders.push(...tavern.colliders);

    // Brewer's House (4m wide x 6m deep) at forwardOffset = 8.0 (separated by 4m alley)
    const brewerPos = getPos(8.0, leftSideDist);
    const brewer = VillagePrefabs.createTownhouse(factory, this.physicsWorld, brewerPos, leftRot);
    this.villageGroup.add(brewer.group);
    this.villageColliders.push(...brewer.colliders);

    // Skybridge Arch Gate bridging the 4.0m alleyway between Tavern (f=0) and Brewer (f=8)
    // Center is at forwardOffset = 4.0, perfectly joining both house walls!
    const bridgePos = getPos(4.0, leftSideDist);
    const skybridge = VillagePrefabs.createSkybridge(factory, this.physicsWorld, bridgePos, leftRot);
    this.villageGroup.add(skybridge.group);
    this.villageColliders.push(...skybridge.colliders);

    // ==========================================
    // 2. RIGHT SIDE COMPLEX: Townhouse + Blacksmith Cottage
    // ==========================================
    const rightSideDist = 11.0;
    const rightRot = roadAngle - Math.PI / 2; // Front faces the road

    // Artisan Townhouse (4m wide x 6m deep) with side exterior staircase
    const townPos = getPos(4.0, rightSideDist);
    const townhouse = VillagePrefabs.createTownhouse(factory, this.physicsWorld, townPos, rightRot);
    this.villageGroup.add(townhouse.group);
    this.villageColliders.push(...townhouse.colliders);

    // Blacksmith Cottage (4m x 4m) further down the right side
    const blacksmithPos = getPos(14.0, rightSideDist + 0.5);
    const blacksmith = VillagePrefabs.createCottage(factory, this.physicsWorld, blacksmithPos, rightRot);
    this.villageGroup.add(blacksmith.group);
    this.villageColliders.push(...blacksmith.colliders);

    // ==========================================
    // 3. BACKGROUND LANDMARK: Citadel Watchtower
    // ==========================================
    // 4m x 4m stone fortress keep standing tall overlooking the street bend
    const towerPos = getPos(24.0, 16.0);
    const towerRot = roadAngle;
    const watchtower = VillagePrefabs.createWatchtower(factory, this.physicsWorld, towerPos, towerRot);
    this.villageGroup.add(watchtower.group);
    this.villageColliders.push(...watchtower.colliders);

    // ==========================================
    // 4. VILLAGE ENTRANCE (SOUTH): Gate Cottages
    // ==========================================
    // South Cottage Left
    const southLPos = getPos(-14.0, leftSideDist);
    const southL = VillagePrefabs.createCottage(factory, this.physicsWorld, southLPos, leftRot);
    this.villageGroup.add(southL.group);
    this.villageColliders.push(...southL.colliders);

    // South Cottage Right
    const southRPos = getPos(-14.0, rightSideDist);
    const southR = VillagePrefabs.createCottage(factory, this.physicsWorld, southRPos, rightRot);
    this.villageGroup.add(southR.group);
    this.villageColliders.push(...southR.colliders);

    // ==========================================
    // 5. STREET FURNITURE & PROPS SCATTER
    // ==========================================
    const scatterPos = getPos(0, 0);
    const scatter = VillagePrefabs.createStreetScatter(factory, this.physicsWorld, scatterPos);
    this.villageGroup.add(scatter.group);
    this.villageColliders.push(...scatter.colliders);

    // ==========================================
    // 6. HARBOR WAYGATE TO PIRATE COVE
    // Located at the village plaza edge
    // ==========================================
    this.waygatePos = getPos(22.0, rightSideDist + 4.0);
    const gateArch = factory.cloneModel("Wall_Arch");
    if (gateArch) {
      gateArch.position.copy(this.waygatePos);
      gateArch.rotation.y = rightRot + Math.PI / 2;
      gateArch.scale.setScalar(1.5);
      this.villageGroup.add(gateArch);
    }

    // Mystic Glowing Azure Beacon / Portal Orb
    const beaconGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7, // Tropical azure portal energy
      wireframe: true,
    });
    this.portalBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.portalBeacon.position.set(this.waygatePos.x, this.waygatePos.y + 2.0, this.waygatePos.z);
    this.villageGroup.add(this.portalBeacon);

    const portalLight = new THREE.PointLight(0x0284c7, 2.5, 15);
    portalLight.position.set(this.waygatePos.x, this.waygatePos.y + 2.2, this.waygatePos.z);
    this.villageGroup.add(portalLight);

    // Add village assembly to Three.js scene
    this.scene.add(this.villageGroup);
    this.isBuilt = true;
    console.log(
      "VillageManager: Medieval Village successfully assembled with",
      this.villageColliders.length,
      "physics colliders. All structures seamlessly aligned."
    );
  }

  public isNearWaygate(pos: THREE.Vector3): boolean {
    if (!this.isBuilt) return false;
    return Math.hypot(pos.x - this.waygatePos.x, pos.z - this.waygatePos.z) < 3.2;
  }

  public update(dt: number): void {
    if (this.portalBeacon) {
      this.portalBeacon.rotation.y += dt * 1.8;
      this.portalBeacon.rotation.x += dt * 0.9;
    }
  }

  public dispose(): void {
    if (!this.isBuilt) return;

    this.scene.remove(this.villageGroup);
    this.villageColliders.forEach((col) => {
      this.physicsWorld.removeCollider(col, false);
    });
    this.villageColliders = [];
    this.isBuilt = false;
  }
}
