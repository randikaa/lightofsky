import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { PirateModelFactory } from "./PirateModelFactory";
import type { ProceduralNoise } from "./ProceduralNoise";

export class PirateBeachManager {
  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;

  private beachGroup = new THREE.Group();
  private colliders: RAPIER.Collider[] = [];
  public isBuilt = false;

  // Dedicated Beach Center
  public static readonly ORIGIN_X = 2000;
  public static readonly ORIGIN_Z = 2000;
  public static readonly SPAWN_POS = new THREE.Vector3(2008, 1.5, 1990);
  public static readonly WAYGATE_POS = new THREE.Vector3(2014, 1.5, 1990);

  // Animated elements
  private shipGroup: THREE.Group | null = null;
  private shipBaseY = -1.1;
  private tentacles: THREE.Group[] = [];
  private time = 0;
  private portalBeacon: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, physicsWorld: RAPIER.World, _noise?: ProceduralNoise) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  /**
   * Analytical elevation for the dedicated Pirate Beach Cove
   * Smooth crescent bay on the west (X < 2005) and dramatic sandstone cliffs on the east (X > 2030)
   */
  public sampleHeight(worldX: number, worldZ: number): number {
    const dz = worldZ - PirateBeachManager.ORIGIN_Z;
    // Bay coastline curve
    const bayIndentation = Math.cos(Math.min(Math.PI, Math.max(-Math.PI, (dz / 110.0) * Math.PI))) * 16.0;
    const coastX = PirateBeachManager.ORIGIN_X + 5.0 - bayIndentation;

    if (worldX < coastX) {
      // Ocean seabed sloping gently down to -6m
      const oceanDist = coastX - worldX;
      return -Math.min(7.0, Math.pow(oceanDist * 0.12, 1.1) + 0.3);
    } else {
      // Beach sand dunes & cliff bluffs
      const landDist = worldX - coastX;
      if (landDist < 25.0) {
        // Sandy beach gradient from water level to dune crest (0.0 to 3.8m)
        const t = landDist / 25.0;
        const ripple = Math.sin(worldX * 0.12 + worldZ * 0.08) * 0.25;
        return Math.pow(t, 1.25) * 3.8 + ripple;
      } else {
        // High coastal rocky cliffs where smuggler taverns overlook the ocean (3.8m up to 11.5m)
        const cliffDist = landDist - 25.0;
        const t = Math.min(1.0, cliffDist / 35.0);
        const crag = Math.sin(worldX * 0.08) * 0.8 + Math.cos(worldZ * 0.07) * 0.8;
        return 3.8 + Math.pow(t, 0.8) * 7.7 + crag;
      }
    }
  }

  private addPiece(
    factory: PirateModelFactory,
    name: string,
    x: number,
    y: number,
    z: number,
    rotY = 0,
    scale = 1,
    castShadow = true
  ): THREE.Group | null {
    const model = factory.cloneModel(name);
    if (!model) return null;
    model.position.set(x, y, z);
    model.rotation.y = rotY;
    if (scale !== 1) model.scale.setScalar(scale);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = true;
      }
    });

    this.beachGroup.add(model);
    return model;
  }

  public buildBeach(): void {
    if (this.isBuilt) return;

    const factory = PirateModelFactory.getInstance();
    if (!factory.isLoaded) {
      console.warn("PirateBeachManager: PirateModelFactory not loaded, deferring build.");
      return;
    }

    // ==========================================
    // 1. DEDICATED SCENIC BEACH & CLIFF TERRAIN MESH
    // 280m x 280m bespoke landscape with vertex colors
    // ==========================================
    const terrainSize = 280;
    const segments = 64;
    const numVertsX = segments + 1;
    const numVertsZ = segments + 1;
    const totalVerts = numVertsX * numVertsZ;

    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const rapierHeights = new Float32Array(totalVerts);

    const halfSize = terrainSize * 0.5;
    const step = terrainSize / segments;
    const originX = PirateBeachManager.ORIGIN_X;
    const originZ = PirateBeachManager.ORIGIN_Z;

    const deepSeaColor = new THREE.Color(0x0f2b3c);
    const shallowWaterColor = new THREE.Color(0x1e6f8a);
    const wetSandColor = new THREE.Color(0xbfa575);
    const goldenSandColor = new THREE.Color(0xe0be80);
    const cliffStoneColor = new THREE.Color(0x6e6659);
    const lushGrassColor = new THREE.Color(0x3e7345);

    let vIdx = 0;
    let uvIdx = 0;

    for (let zi = 0; zi <= segments; zi++) {
      for (let xi = 0; xi <= segments; xi++) {
        const localX = -halfSize + xi * step;
        const localZ = -halfSize + zi * step;
        const wx = originX + localX;
        const wz = originZ + localZ;

        const h = this.sampleHeight(wx, wz);

        positions[vIdx] = localX;
        positions[vIdx + 1] = h;
        positions[vIdx + 2] = localZ;

        // Rapier heightfield indexed [xi * numVertsZ + zi]
        rapierHeights[xi * numVertsZ + zi] = h;

        // Dynamic vertex color blend
        let finalColor: THREE.Color;
        if (h < -1.8) {
          finalColor = deepSeaColor.clone();
        } else if (h < 0.1) {
          const t = (h + 1.8) / 1.9;
          finalColor = deepSeaColor.clone().lerp(shallowWaterColor, t);
        } else if (h < 0.8) {
          const t = (h - 0.1) / 0.7;
          finalColor = shallowWaterColor.clone().lerp(wetSandColor, t);
        } else if (h < 3.8) {
          const t = (h - 0.8) / 3.0;
          finalColor = wetSandColor.clone().lerp(goldenSandColor, t);
        } else if (h < 7.5) {
          const t = (h - 3.8) / 3.7;
          finalColor = goldenSandColor.clone().lerp(cliffStoneColor, t);
        } else {
          const t = Math.min(1.0, (h - 7.5) / 3.5);
          finalColor = cliffStoneColor.clone().lerp(lushGrassColor, t * 0.4);
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

    const beachGeo = new THREE.BufferGeometry();
    beachGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    beachGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    beachGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    beachGeo.setIndex(indices);
    beachGeo.computeVertexNormals();

    const beachMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.08,
    });

    const terrainMesh = new THREE.Mesh(beachGeo, beachMat);
    terrainMesh.position.set(originX, 0, originZ);
    terrainMesh.receiveShadow = true;
    this.beachGroup.add(terrainMesh);

    // Dedicated Rapier Heightfield Collider
    const beachCollider = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.heightfield(
        segments,
        segments,
        rapierHeights,
        { x: terrainSize, y: 1.0, z: terrainSize }
      )
        .setRestitution(0.0)
        .setFriction(1.2)
    );
    beachCollider.setTranslation({ x: originX, y: 0, z: originZ });
    this.colliders.push(beachCollider);

    // ==========================================
    // 2. THE WOODEN PIER & HARBOR DOCKS
    // Extends from the beach sand (X = 2008, Z = 1990) out into deep ocean (X = 1966, Z = 1990)
    // ==========================================
    const pierZ = 1990;
    const dockY = 0.55;

    // Modular wooden pier sections
    for (let x = 2006; x >= 1968; x -= 7) {
      this.addPiece(factory, "Environment_Dock", x, dockY, pierZ, Math.PI / 2, 1.8);
      // Pilings driven into the seabed
      this.addPiece(factory, "Environment_Dock_Pole", x + 2.5, dockY - 1.5, pierZ - 2.0, 0, 1.8);
      this.addPiece(factory, "Environment_Dock_Pole", x + 2.5, dockY - 1.5, pierZ + 2.0, 0, 1.8);
      this.addPiece(factory, "Environment_Dock_Pole", x - 2.5, dockY - 1.5, pierZ - 2.0, 0, 1.8);
      this.addPiece(factory, "Environment_Dock_Pole", x - 2.5, dockY - 1.5, pierZ + 2.0, 0, 1.8);
    }

    // Pier T-Junction dock platform at the end
    this.addPiece(factory, "Environment_Dock", 1963, dockY, pierZ - 5, 0, 1.8);
    this.addPiece(factory, "Environment_Dock", 1963, dockY, pierZ + 5, 0, 1.8);
    this.addPiece(factory, "Environment_Dock_Broken", 1963, dockY, pierZ - 11, 0, 1.6);

    // Continuous walkable deck collider for the entire pier
    const pierCollider = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(22.0, 0.35, 2.2).setRestitution(0.0).setFriction(1.2)
    );
    pierCollider.setTranslation({ x: 1986.0, y: dockY - 0.2, z: pierZ });
    this.colliders.push(pierCollider);

    // Pier T-head platform collider
    const tHeadCollider = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.4, 0.35, 9.0).setRestitution(0.0).setFriction(1.2)
    );
    tHeadCollider.setTranslation({ x: 1963.0, y: dockY - 0.2, z: pierZ });
    this.colliders.push(tHeadCollider);

    // Pier props
    this.addPiece(factory, "Prop_Bucket_Fishes", 1998, dockY + 0.1, pierZ + 1.2, 0.4, 1.3);
    this.addPiece(factory, "Prop_Barrel", 1988, dockY + 0.1, pierZ - 1.1, 0, 1.2);
    this.addPiece(factory, "Prop_Barrel", 1987.2, dockY + 0.1, pierZ - 1.0, 0.8, 1.1);
    this.addPiece(factory, "Prop_Bottle_1", 1987.8, dockY + 0.9, pierZ - 1.1, 0.2, 1.2);
    this.addPiece(factory, "Prop_Anchor", 1963.8, dockY + 0.1, pierZ + 6.0, Math.PI / 4, 1.5);
    this.addPiece(factory, "Prop_Cannon", 1964.0, dockY + 0.1, pierZ - 6.0, -Math.PI / 2, 1.3);

    // ==========================================
    // 3. THE BLACK PEARL PIRATE GALLEON (Ship_Large)
    // Anchored majestically in the deep bay beside the pier
    // ==========================================
    const shipX = 1946;
    const shipZ = 1990;
    this.shipBaseY = -1.1;

    const ship = this.addPiece(
      factory,
      "Ship_Large",
      shipX,
      this.shipBaseY,
      shipZ,
      Math.PI / 2,
      1.75
    );
    if (ship) {
      this.shipGroup = ship;
    }

    // Gangplank connecting Pier T-head (X = 1963) to Ship Boarding Deck (X = 1954)
    const gangplank = this.addPiece(
      factory,
      "Environment_Dock",
      1958.2,
      dockY + 0.15,
      pierZ,
      Math.PI / 2,
      1.5
    );
    if (gangplank) {
      gangplank.rotation.z = -0.06;
    }

    // Gangplank physics collider
    const gangplankCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(4.8, 0.25, 1.6).setRestitution(0.0).setFriction(1.2)
    );
    gangplankCol.setTranslation({ x: 1958.0, y: dockY + 0.15, z: pierZ });
    this.colliders.push(gangplankCol);

    // Ship Main Deck Walkable Collider
    const shipDeckCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(6.0, 0.4, 14.5).setRestitution(0.0).setFriction(1.2)
    );
    shipDeckCol.setTranslation({ x: shipX, y: 1.4, z: shipZ });
    this.colliders.push(shipDeckCol);

    // Ship Quarterdeck (Elevated Stern)
    const quarterDeckCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(5.5, 0.4, 5.0).setRestitution(0.0).setFriction(1.2)
    );
    quarterDeckCol.setTranslation({ x: shipX, y: 2.8, z: shipZ - 10.0 });
    this.colliders.push(quarterDeckCol);

    // Ship Poop Deck / Bowsprit Front
    const bowDeckCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(4.5, 0.4, 4.0).setRestitution(0.0).setFriction(1.2)
    );
    bowDeckCol.setTranslation({ x: shipX, y: 2.2, z: shipZ + 10.5 });
    this.colliders.push(bowDeckCol);

    // Ship Deck Props
    this.addPiece(factory, "Prop_Chest_Gold", shipX - 1.5, 1.8, shipZ - 2.0, 0.5, 1.2);
    this.addPiece(factory, "Prop_Barrel", shipX + 2.0, 1.8, shipZ + 3.0, 0, 1.2);
    this.addPiece(factory, "Prop_Barrel", shipX + 2.2, 1.8, shipZ + 4.2, 0.3, 1.2);

    // Small pirate sloop anchored further out in the bay
    this.addPiece(factory, "Ship_Small", 1928, -0.6, 2030, -0.7, 1.6);

    // ==========================================
    // 4. THE KRAKEN ENCOUNTER (Characters_Tentacle)
    // Giant tentacles breaching the waves in deep water beyond the ship
    // ==========================================
    const tentacle1 = this.addPiece(factory, "Characters_Tentacle", 1934, -1.2, 1999, 0.4, 2.4);
    if (tentacle1) this.tentacles.push(tentacle1);

    const tentacle2 = this.addPiece(factory, "Characters_Tentacle", 1940, -1.5, 1962, -1.8, 2.0);
    if (tentacle2) this.tentacles.push(tentacle2);

    const tentacle3 = this.addPiece(factory, "Characters_Tentacle", 1920, -1.8, 2018, 2.2, 2.6);
    if (tentacle3) this.tentacles.push(tentacle3);

    // ==========================================
    // 5. SMUGGLERS' CLIFFTOP OUTPOST & LOOKOUT TAVERN
    // Perched on rocky sandstone bluffs overlooking the ocean
    // ==========================================
    this.addPiece(factory, "Environment_Cliff4", 2040, 4.5, 2025, -0.3, 2.2);
    this.addPiece(factory, "Environment_Cliff2", 2044, 5.0, 2042, 0.8, 2.0);
    this.addPiece(factory, "Environment_Cliff3", 2038, 4.0, 1950, 1.4, 2.1);
    this.addPiece(factory, "Environment_Cliff1", 2042, 4.8, 1935, -0.6, 2.0);

    // Cliff physics colliders
    const cliffCol1 = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(7.0, 5.0, 14.0).setRestitution(0.0).setFriction(1.2)
    );
    cliffCol1.setTranslation({ x: 2042.0, y: 7.0, z: 2035.0 });
    this.colliders.push(cliffCol1);

    const cliffCol2 = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(6.5, 4.5, 12.0).setRestitution(0.0).setFriction(1.2)
    );
    cliffCol2.setTranslation({ x: 2040.0, y: 6.5, z: 1945.0 });
    this.colliders.push(cliffCol2);

    // Pirate House 1: Large Smuggler Stronghold with Ship Hull Roof
    const house1Y = this.sampleHeight(2042, 2028);
    this.addPiece(factory, "Environment_House1", 2042, house1Y, 2028, -Math.PI / 2 + 0.2, 1.6);
    const house1Col = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(5.5, 4.5, 5.5).setRestitution(0.0).setFriction(1.2)
    );
    house1Col.setTranslation({ x: 2042.0, y: house1Y + 3.5, z: 2028.0 });
    this.colliders.push(house1Col);

    // Pirate House 3: Coastal Lookout Tavern on Northern Bluff
    const house3Y = this.sampleHeight(2040, 1952);
    this.addPiece(factory, "Environment_House3", 2040, house3Y, 1952, Math.PI / 2 - 0.3, 1.5);
    const house3Col = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(5.0, 4.0, 5.0).setRestitution(0.0).setFriction(1.2)
    );
    house3Col.setTranslation({ x: 2040.0, y: house3Y + 3.0, z: 1952.0 });
    this.colliders.push(house3Col);

    // ==========================================
    // 6. TROPICAL PALM GROVES
    // Dotted across the golden sand dunes and along the water's edge
    // ==========================================
    const palmLocations = [
      { x: 2012, z: 2008, type: "Environment_PalmTree_1", scale: 1.5, rot: 0.5 },
      { x: 2016, z: 2018, type: "Environment_PalmTree_2", scale: 1.7, rot: 1.2 },
      { x: 2010, z: 1978, type: "Environment_PalmTree_3", scale: 1.6, rot: 2.1 },
      { x: 2014, z: 1965, type: "Environment_PalmTree_1", scale: 1.8, rot: 3.0 },
      { x: 2022, z: 1955, type: "Environment_PalmTree_2", scale: 1.5, rot: 0.8 },
      { x: 2026, z: 1970, type: "Environment_PalmTree_3", scale: 1.6, rot: 1.7 },
      { x: 2018, z: 1982, type: "Environment_PalmTree_1", scale: 1.4, rot: 2.4 },
      { x: 2015, z: 2028, type: "Environment_PalmTree_2", scale: 1.7, rot: 0.2 },
      { x: 2020, z: 2040, type: "Environment_PalmTree_1", scale: 1.5, rot: 1.9 },
      { x: 2028, z: 2048, type: "Environment_PalmTree_3", scale: 1.6, rot: 2.8 },
      { x: 2024, z: 2062, type: "Environment_PalmTree_1", scale: 1.4, rot: 0.9 },
      { x: 2008, z: 1945, type: "Environment_PalmTree_2", scale: 1.5, rot: 1.4 },
      { x: 2006, z: 2055, type: "Environment_PalmTree_3", scale: 1.7, rot: 2.5 },
    ];

    for (const p of palmLocations) {
      const h = this.sampleHeight(p.x, p.z);
      this.addPiece(factory, p.type, p.x, h - 0.1, p.z, p.rot, p.scale);

      const trunkCol = this.physicsWorld.createCollider(
        RAPIER.ColliderDesc.cylinder(3.0, 0.45 * p.scale).setRestitution(0.0).setFriction(1.2)
      );
      trunkCol.setTranslation({ x: p.x, y: h + 3.0, z: p.z });
      this.colliders.push(trunkCol);
    }

    // ==========================================
    // 7. SKULL ROCK & ANCIENT WHALE RIBCAGE
    // On the southern sandbar jutting into the surf at X = 1998, Z = 2038
    // ==========================================
    const skullH = this.sampleHeight(1998, 2038);
    this.addPiece(factory, "Environment_Skulls", 1998, Math.max(0.2, skullH + 0.2), 2038, -0.6, 2.2);
    const skullCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(3.5, 3.5, 3.5).setRestitution(0.0).setFriction(1.2)
    );
    skullCol.setTranslation({ x: 1998.0, y: Math.max(2.5, skullH + 2.5), z: 2038.0 });
    this.colliders.push(skullCol);

    const boneH = this.sampleHeight(2003, 2028);
    this.addPiece(factory, "Environment_LargeBones", 2003, Math.max(0.1, boneH), 2028, 0.4, 2.0);

    // ==========================================
    // 8. BEACH PIRATE CAMP & BURIED TREASURE
    // Near the pier arrival on the golden dunes
    // ==========================================
    // Beached rowboat tilted in the sand
    const boatH = this.sampleHeight(2008, 2005);
    const boat = this.addPiece(factory, "Ship_Small", 2008, boatH + 0.3, 2005, 0.4, 1.2);
    if (boat) boat.rotation.z = 0.18;

    // Open treasure chest overflowing with gold
    const chestH = this.sampleHeight(2013, 2004);
    this.addPiece(factory, "Prop_Chest_Gold", 2013, chestH + 0.05, 2004, 0.3, 1.4);
    this.addPiece(factory, "Prop_Coins", 2013.8, chestH + 0.02, 2004.2, 0.8, 1.6);
    this.addPiece(factory, "Prop_Coins", 2012.4, chestH + 0.02, 2003.7, 1.5, 1.4);
    this.addPiece(factory, "Prop_GoldBag", 2014.0, chestH + 0.05, 2003.4, 0.4, 1.3);

    // Closed secondary chest
    const chest2H = this.sampleHeight(2015, 1998);
    this.addPiece(factory, "Prop_Chest_Closed", 2015, chest2H + 0.05, 1998, -0.4, 1.3);

    // Coastal defense cannons
    const cannon1H = this.sampleHeight(2007, 1980);
    this.addPiece(factory, "Prop_Cannon", 2007, cannon1H + 0.05, 1980, -Math.PI / 2 - 0.2, 1.35);
    this.addPiece(factory, "Prop_CannonBall", 2007.8, cannon1H + 0.05, 1980.6, 0, 1.2);

    const cannon2H = this.sampleHeight(2008, 2016);
    this.addPiece(factory, "Prop_Cannon", 2008, cannon2H + 0.05, 2016, -Math.PI / 2 + 0.3, 1.35);

    // Rum barrels and bottles
    const barrelH = this.sampleHeight(2014, 2001);
    this.addPiece(factory, "Prop_Barrel", 2014, barrelH + 0.05, 2001, 0, 1.2);
    this.addPiece(factory, "Prop_Barrel", 2014.8, barrelH + 0.05, 2001.2, 0.4, 1.1);
    this.addPiece(factory, "Prop_Bottle_1", 2013.6, barrelH + 0.05, 2001.5, 0.7, 1.2);

    // Giant beach anchor stuck in sand
    const anchorH = this.sampleHeight(2006, 1970);
    const beachAnchor = this.addPiece(factory, "Prop_Anchor", 2006, anchorH + 0.3, 1970, 0.8, 1.8);
    if (beachAnchor) beachAnchor.rotation.x = -0.3;

    // Characters
    const skelH = this.sampleHeight(2012.5, 2005.5);
    this.addPiece(factory, "Characters_Skeleton", 2012.5, skelH + 0.05, 2005.5, -0.8, 1.2);

    const sharkyH = this.sampleHeight(2005, 1986);
    this.addPiece(factory, "Characters_Sharky", 2005, sharkyH + 0.05, 1986, -Math.PI / 2 + 0.2, 1.3);

    // Smooth shoreline rocks
    const rocks = [
      { x: 2003, z: 2010, type: "Environment_Rock_1", scale: 1.8 },
      { x: 2004, z: 1982, type: "Environment_Rock_2", scale: 2.2 },
      { x: 2001, z: 1965, type: "Environment_Rock_3", scale: 2.5 },
      { x: 2002, z: 2026, type: "Environment_Rock_4", scale: 1.9 },
      { x: 2005, z: 2045, type: "Environment_Rock_5", scale: 2.1 },
    ];

    for (const r of rocks) {
      const h = this.sampleHeight(r.x, r.z);
      this.addPiece(factory, r.type, r.x, h - 0.2, r.z, Math.random() * 6.28, r.scale);
      const rockCol = this.physicsWorld.createCollider(
        RAPIER.ColliderDesc.ball(0.7 * r.scale).setRestitution(0.0).setFriction(1.2)
      );
      rockCol.setTranslation({ x: r.x, y: h + 0.4 * r.scale, z: r.z });
      this.colliders.push(rockCol);
    }

    // ==========================================
    // 9. WAYGATE PORTAL BACK TO JUNGLE VILLAGE
    // Stands at the beach head of the wooden pier (2014, 1990)
    // ==========================================
    const gatePos = PirateBeachManager.WAYGATE_POS;
    const gateH = this.sampleHeight(gatePos.x, gatePos.z);

    // Wooden dock archway frame
    this.addPiece(factory, "Environment_Dock_Pole", gatePos.x, gateH, gatePos.z - 2.0, 0, 2.2);
    this.addPiece(factory, "Environment_Dock_Pole", gatePos.x, gateH, gatePos.z + 2.0, 0, 2.2);
    this.addPiece(factory, "Environment_Dock", gatePos.x, gateH + 3.8, gatePos.z, 0, 1.2);

    // Mystic Glowing Green Beacon / Portal Orb
    const beaconGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80, // Emerald jungle portal energy
      wireframe: true,
    });
    this.portalBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.portalBeacon.position.set(gatePos.x, gateH + 1.8, gatePos.z);
    this.beachGroup.add(this.portalBeacon);

    // Portal aura light
    const portalLight = new THREE.PointLight(0x4ade80, 2.5, 15);
    portalLight.position.set(gatePos.x, gateH + 2.0, gatePos.z);
    this.beachGroup.add(portalLight);

    this.scene.add(this.beachGroup);
    this.isBuilt = true;
    console.log("🏴‍☠️ PirateBeachManager: Dedicated Pirate Beach & Ocean Cove built successfully at (2000, 2000).");
  }

  public update(dt: number) {
    if (!this.isBuilt) return;
    this.time += dt;

    // 1. Floating Galleon pitch and roll
    if (this.shipGroup) {
      this.shipGroup.position.y =
        this.shipBaseY + Math.sin(this.time * 1.4) * 0.14 + Math.cos(this.time * 0.9) * 0.06;
      this.shipGroup.rotation.z = Math.sin(this.time * 1.2) * 0.025;
      this.shipGroup.rotation.x = Math.cos(this.time * 0.8) * 0.015;
    }

    // 2. Kraken tentacles writhing
    for (let i = 0; i < this.tentacles.length; i++) {
      const t = this.tentacles[i];
      const offset = i * 1.8;
      t.rotation.z = Math.sin(this.time * 1.1 + offset) * 0.12;
      t.rotation.x = Math.cos(this.time * 0.9 + offset) * 0.09;
      t.position.y = -1.2 + Math.sin(this.time * 1.3 + offset) * 0.12;
    }

    // 3. Portal Beacon spinning
    if (this.portalBeacon) {
      this.portalBeacon.rotation.y += dt * 1.8;
      this.portalBeacon.rotation.x += dt * 0.9;
    }
  }

  public isNearWaygate(pos: THREE.Vector3): boolean {
    const gate = PirateBeachManager.WAYGATE_POS;
    return Math.hypot(pos.x - gate.x, pos.z - gate.z) < 3.2;
  }

  public destroy(): void {
    this.scene.remove(this.beachGroup);
    this.beachGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
      }
    });

    this.colliders.forEach((col) => {
      this.physicsWorld.removeCollider(col, false);
    });
    this.colliders = [];
    this.isBuilt = false;
  }
}
