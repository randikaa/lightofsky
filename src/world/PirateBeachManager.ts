import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { PirateModelFactory } from "./PirateModelFactory";
import type { ProceduralNoise } from "./ProceduralNoise";

export class PirateBeachManager {
  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;
  private noise: ProceduralNoise;

  private beachGroup = new THREE.Group();
  private colliders: RAPIER.Collider[] = [];
  public isBuilt = false;

  // Animated elements
  private shipGroup: THREE.Group | null = null;
  private shipBaseY = 0;
  private tentacles: THREE.Group[] = [];
  private time = 0;

  constructor(scene: THREE.Scene, physicsWorld: RAPIER.World, noise: ProceduralNoise) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.noise = noise;
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
    // 1. THE WOODEN PIER & HARBOR DOCKS
    // Extends from the beach waterline (X = 18, Z = -15) out into deep ocean (X = -14, Z = -15)
    // ==========================================
    const pierZ = -15;
    const dockY = 0.55; // Sits just above ocean surface Y = 0.0

    // 4 sections of modular wooden pier
    for (let x = 16; x >= -12; x -= 7) {
      this.addPiece(factory, "Environment_Dock", x, dockY, pierZ, Math.PI / 2, 1.8);
      // Support pilings driven into the seabed
      this.addPiece(factory, "Environment_Dock_Pole", x + 2.5, dockY - 1.2, pierZ - 2.0, 0, 1.6);
      this.addPiece(factory, "Environment_Dock_Pole", x + 2.5, dockY - 1.2, pierZ + 2.0, 0, 1.6);
      this.addPiece(factory, "Environment_Dock_Pole", x - 2.5, dockY - 1.2, pierZ - 2.0, 0, 1.6);
      this.addPiece(factory, "Environment_Dock_Pole", x - 2.5, dockY - 1.2, pierZ + 2.0, 0, 1.6);
    }

    // Pier T-Junction dock platform at the end
    this.addPiece(factory, "Environment_Dock", -15, dockY, pierZ - 5, 0, 1.8);
    this.addPiece(factory, "Environment_Dock", -15, dockY, pierZ + 5, 0, 1.8);
    this.addPiece(factory, "Environment_Dock_Broken", -15, dockY, pierZ - 11, 0, 1.6);

    // Continuous walkable deck collider for the entire pier
    const pierCollider = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(16.0, 0.35, 2.2).setRestitution(0.0).setFriction(1.2)
    );
    pierCollider.setTranslation({ x: 2.0, y: dockY - 0.2, z: pierZ });
    this.colliders.push(pierCollider);

    // Pier T-head platform collider
    const tHeadCollider = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.4, 0.35, 9.0).setRestitution(0.0).setFriction(1.2)
    );
    tHeadCollider.setTranslation({ x: -15.0, y: dockY - 0.2, z: pierZ });
    this.colliders.push(tHeadCollider);

    // Harbor pier props
    this.addPiece(factory, "Prop_Bucket_Fishes", 10, dockY + 0.1, pierZ + 1.2, 0.4, 1.3);
    this.addPiece(factory, "Prop_Barrel", 4, dockY + 0.1, pierZ - 1.1, 0, 1.2);
    this.addPiece(factory, "Prop_Barrel", 3.2, dockY + 0.1, pierZ - 1.0, 0.8, 1.1);
    this.addPiece(factory, "Prop_Bottle_1", 3.8, dockY + 0.9, pierZ - 1.1, 0.2, 1.2);
    this.addPiece(factory, "Prop_Anchor", -14.2, dockY + 0.1, pierZ + 6.0, Math.PI / 4, 1.5);
    this.addPiece(factory, "Prop_Cannon", -14.0, dockY + 0.1, pierZ - 6.0, -Math.PI / 2, 1.3);

    // ==========================================
    // 2. THE BLACK PEARL PIRATE GALLEON (Ship_Large)
    // Anchored majestically in the deep bay beside the pier
    // ==========================================
    const shipX = -32;
    const shipZ = -15;
    this.shipBaseY = -1.1; // Submerged to the waterline

    const ship = this.addPiece(
      factory,
      "Ship_Large",
      shipX,
      this.shipBaseY,
      shipZ,
      Math.PI / 2, // Broadside to shore
      1.75
    );
    if (ship) {
      this.shipGroup = ship;
    }

    // Gangplank connecting Pier T-head (X = -15) to Ship Boarding Deck (X = -24)
    const gangplank = this.addPiece(
      factory,
      "Environment_Dock",
      -19.8,
      dockY + 0.15,
      pierZ,
      Math.PI / 2,
      1.5
    );
    if (gangplank) {
      gangplank.rotation.z = -0.06; // Slight slope up to ship deck
    }

    // Gangplank physics collider
    const gangplankCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(4.8, 0.25, 1.6).setRestitution(0.0).setFriction(1.2)
    );
    gangplankCol.setTranslation({ x: -20.0, y: dockY + 0.15, z: pierZ });
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

    // Ship Deck Props: Treasure on deck, barrels, steering
    this.addPiece(factory, "Prop_Chest_Gold", shipX - 1.5, 1.8, shipZ - 2.0, 0.5, 1.2);
    this.addPiece(factory, "Prop_Barrel", shipX + 2.0, 1.8, shipZ + 3.0, 0, 1.2);
    this.addPiece(factory, "Prop_Barrel", shipX + 2.2, 1.8, shipZ + 4.2, 0.3, 1.2);

    // Small pirate sloop anchored further out in the bay
    this.addPiece(factory, "Ship_Small", -52, -0.6, 25, -0.7, 1.6);

    // ==========================================
    // 3. THE KRAKEN ENCOUNTER (Characters_Tentacle)
    // Giant tentacles breaching the waves in deep water beyond the ship
    // ==========================================
    const tentacle1 = this.addPiece(factory, "Characters_Tentacle", -44, -1.2, -6, 0.4, 2.4);
    if (tentacle1) this.tentacles.push(tentacle1);

    const tentacle2 = this.addPiece(factory, "Characters_Tentacle", -38, -1.5, -28, -1.8, 2.0);
    if (tentacle2) this.tentacles.push(tentacle2);

    const tentacle3 = this.addPiece(factory, "Characters_Tentacle", -58, -1.8, 8, 2.2, 2.6);
    if (tentacle3) this.tentacles.push(tentacle3);

    // ==========================================
    // 4. SMUGGLERS' CLIFFTOP OUTPOST & TAVERN
    // Perched on rocky bluffs overlooking the ocean (X = 28 to 36, Z = 25 to 55)
    // ==========================================
    // Coastal rock cliffs forming a dramatic bluff
    this.addPiece(factory, "Environment_Cliff4", 32, 0.5, 30, -0.3, 1.8);
    this.addPiece(factory, "Environment_Cliff2", 34, 1.0, 48, 0.8, 1.7);
    this.addPiece(factory, "Environment_Cliff3", 30, 0.2, -42, 1.4, 1.7);
    this.addPiece(factory, "Environment_Cliff1", 33, 0.8, -58, -0.6, 1.6);

    // Cliff physics colliders
    const cliffCol1 = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(6.0, 3.5, 12.0).setRestitution(0.0).setFriction(1.2)
    );
    cliffCol1.setTranslation({ x: 34.0, y: 3.5, z: 38.0 });
    this.colliders.push(cliffCol1);

    const cliffCol2 = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(5.5, 3.0, 10.0).setRestitution(0.0).setFriction(1.2)
    );
    cliffCol2.setTranslation({ x: 32.0, y: 3.0, z: -50.0 });
    this.colliders.push(cliffCol2);

    // Pirate House 1: Large Smuggler Stronghold with Ship Hull Roof
    const house1Y = this.noise.evaluate(35, 32).height;
    this.addPiece(factory, "Environment_House1", 35, house1Y + 3.2, 32, -Math.PI / 2 + 0.2, 1.5);
    const house1Col = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(5.0, 4.0, 5.0).setRestitution(0.0).setFriction(1.2)
    );
    house1Col.setTranslation({ x: 35.0, y: house1Y + 5.2, z: 32.0 });
    this.colliders.push(house1Col);

    // Pirate House 3: Coastal Lookout Tavern on Northern Bluff
    const house3Y = this.noise.evaluate(32, -48).height;
    this.addPiece(factory, "Environment_House3", 32, house3Y + 2.8, -48, Math.PI / 2 - 0.3, 1.4);
    const house3Col = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(4.5, 3.5, 4.5).setRestitution(0.0).setFriction(1.2)
    );
    house3Col.setTranslation({ x: 32.0, y: house3Y + 4.5, z: -48.0 });
    this.colliders.push(house3Col);

    // ==========================================
    // 5. TROPICAL PALM TREES ALONG THE BEACH
    // Dotted across the golden sand dunes from Z = -70 to Z = 70
    // ==========================================
    const palmLocations = [
      { x: 22, z: 8, type: "Environment_PalmTree_1", scale: 1.4, rot: 0.5 },
      { x: 25, z: 12, type: "Environment_PalmTree_2", scale: 1.6, rot: 1.2 },
      { x: 19, z: -4, type: "Environment_PalmTree_3", scale: 1.5, rot: 2.1 },
      { x: 21, z: -25, type: "Environment_PalmTree_1", scale: 1.7, rot: 3.0 },
      { x: 26, z: -32, type: "Environment_PalmTree_2", scale: 1.5, rot: 0.8 },
      { x: 20, z: -40, type: "Environment_PalmTree_3", scale: 1.6, rot: 1.7 },
      { x: 28, z: -18, type: "Environment_PalmTree_1", scale: 1.4, rot: 2.4 },
      { x: 24, z: 22, type: "Environment_PalmTree_2", scale: 1.7, rot: 0.2 },
      { x: 18, z: 35, type: "Environment_PalmTree_1", scale: 1.5, rot: 1.9 },
      { x: 26, z: 42, type: "Environment_PalmTree_3", scale: 1.6, rot: 2.8 },
      { x: 22, z: 56, type: "Environment_PalmTree_1", scale: 1.4, rot: 0.9 },
      { x: 17, z: -62, type: "Environment_PalmTree_2", scale: 1.5, rot: 1.4 },
      { x: 15, z: 68, type: "Environment_PalmTree_3", scale: 1.7, rot: 2.5 },
    ];

    for (const p of palmLocations) {
      const h = this.noise.evaluate(p.x, p.z).height;
      this.addPiece(factory, p.type, p.x, h - 0.1, p.z, p.rot, p.scale);

      // Palm trunk cylinder physics collider
      const trunkCol = this.physicsWorld.createCollider(
        RAPIER.ColliderDesc.cylinder(3.0, 0.45 * p.scale).setRestitution(0.0).setFriction(1.2)
      );
      trunkCol.setTranslation({ x: p.x, y: h + 3.0, z: p.z });
      this.colliders.push(trunkCol);
    }

    // ==========================================
    // 6. SKULL ROCK & ANCIENT WHALE RIBCAGE
    // On a scenic sandbar / point jutting into the surf at X = 8, Z = 38
    // ==========================================
    const skullH = this.noise.evaluate(8, 38).height;
    this.addPiece(factory, "Environment_Skulls", 8, Math.max(0.2, skullH + 0.2), 38, -0.6, 2.2);
    const skullCol = this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(3.5, 3.5, 3.5).setRestitution(0.0).setFriction(1.2)
    );
    skullCol.setTranslation({ x: 8.0, y: Math.max(2.5, skullH + 2.5), z: 38.0 });
    this.colliders.push(skullCol);

    // Massive ribcage half-buried in the wet tide sand
    const boneH = this.noise.evaluate(12, 28).height;
    this.addPiece(factory, "Environment_LargeBones", 12, Math.max(0.1, boneH), 28, 0.4, 2.0);

    // ==========================================
    // 7. BEACH PIRATE CAMP & BURIED TREASURE
    // Between X = 16 and 25, near the beach trail arrival (Z = -2 to +15)
    // ==========================================
    // Beached rowboat resting on the sand
    const boatH = this.noise.evaluate(17, 3).height;
    const boat = this.addPiece(factory, "Ship_Small", 17, boatH + 0.3, 3, 0.4, 1.2);
    if (boat) {
      boat.rotation.z = 0.18; // Tilted slightly on the dune
    }

    // Open treasure chest overflowing with gold coins
    const chestH = this.noise.evaluate(21, 6).height;
    this.addPiece(factory, "Prop_Chest_Gold", 21, chestH + 0.05, 6, 0.3, 1.4);
    this.addPiece(factory, "Prop_Coins", 21.8, chestH + 0.02, 6.2, 0.8, 1.6);
    this.addPiece(factory, "Prop_Coins", 20.4, chestH + 0.02, 5.7, 1.5, 1.4);
    this.addPiece(factory, "Prop_GoldBag", 22.0, chestH + 0.05, 5.4, 0.4, 1.3);

    // Closed secondary treasure chest
    const chest2H = this.noise.evaluate(23, -2).height;
    this.addPiece(factory, "Prop_Chest_Closed", 23, chest2H + 0.05, -2, -0.4, 1.3);

    // Beach defense cannons pointing out to the ocean
    const cannon1H = this.noise.evaluate(19, -8).height;
    this.addPiece(factory, "Prop_Cannon", 19, cannon1H + 0.05, -8, -Math.PI / 2 - 0.2, 1.35);
    this.addPiece(factory, "Prop_CannonBall", 19.8, cannon1H + 0.05, -7.4, 0, 1.2);
    this.addPiece(factory, "Prop_CannonBall", 19.6, cannon1H + 0.05, -7.2, 0, 1.2);

    const cannon2H = this.noise.evaluate(18, 18).height;
    this.addPiece(factory, "Prop_Cannon", 18, cannon2H + 0.05, 18, -Math.PI / 2 + 0.3, 1.35);

    // Scattered rum barrels and bottles around the beach campfire area
    const barrelH = this.noise.evaluate(22, 1).height;
    this.addPiece(factory, "Prop_Barrel", 22, barrelH + 0.05, 1, 0, 1.2);
    this.addPiece(factory, "Prop_Barrel", 22.8, barrelH + 0.05, 1.2, 0.4, 1.1);
    this.addPiece(factory, "Prop_Bottle_1", 21.6, barrelH + 0.05, 1.5, 0.7, 1.2);

    // Heavy iron anchor stuck in the sand
    const anchorH = this.noise.evaluate(16, -20).height;
    const beachAnchor = this.addPiece(factory, "Prop_Anchor", 16, anchorH + 0.3, -20, 0.8, 1.8);
    if (beachAnchor) {
      beachAnchor.rotation.x = -0.3;
    }

    // Pirate Skeleton guarding the chest!
    const skelH = this.noise.evaluate(20.5, 7.5).height;
    this.addPiece(factory, "Characters_Skeleton", 20.5, skelH + 0.05, 7.5, -0.8, 1.2);

    // Sharky pirate standing on the sand bar looking out
    const sharkyH = this.noise.evaluate(15, -6).height;
    this.addPiece(factory, "Characters_Sharky", 15, sharkyH + 0.05, -6, -Math.PI / 2 + 0.2, 1.3);

    // Smooth beach rocks along the shoreline
    const beachRocks = [
      { x: 13, z: 12, type: "Environment_Rock_1", scale: 1.8 },
      { x: 14, z: -10, type: "Environment_Rock_2", scale: 2.2 },
      { x: 11, z: -28, type: "Environment_Rock_3", scale: 2.5 },
      { x: 12, z: 32, type: "Environment_Rock_4", scale: 1.9 },
      { x: 15, z: 46, type: "Environment_Rock_5", scale: 2.1 },
      { x: 10, z: 2, type: "Environment_Rock_2", scale: 1.7 },
    ];

    for (const r of beachRocks) {
      const h = this.noise.evaluate(r.x, r.z).height;
      this.addPiece(factory, r.type, r.x, h - 0.2, r.z, Math.random() * 6.28, r.scale);
      const rockCol = this.physicsWorld.createCollider(
        RAPIER.ColliderDesc.ball(0.7 * r.scale).setRestitution(0.0).setFriction(1.2)
      );
      rockCol.setTranslation({ x: r.x, y: h + 0.4 * r.scale, z: r.z });
      this.colliders.push(rockCol);
    }

    this.scene.add(this.beachGroup);
    this.isBuilt = true;
    console.log("🏴‍☠️ PirateBeachManager: Beach, Ocean Pier & Pirate Galleon built successfully.");
  }

  public update(dt: number) {
    if (!this.isBuilt) return;
    this.time += dt;

    // 1. Gentle floating pitch & roll of the Pirate Galleon on the ocean waves
    if (this.shipGroup) {
      this.shipGroup.position.y =
        this.shipBaseY + Math.sin(this.time * 1.4) * 0.14 + Math.cos(this.time * 0.9) * 0.06;
      this.shipGroup.rotation.z = Math.sin(this.time * 1.2) * 0.025; // Gentle roll
      this.shipGroup.rotation.x = Math.cos(this.time * 0.8) * 0.015; // Gentle pitch
    }

    // 2. Sinister organic swaying of the Kraken tentacles
    for (let i = 0; i < this.tentacles.length; i++) {
      const t = this.tentacles[i];
      const offset = i * 1.8;
      t.rotation.z = Math.sin(this.time * 1.1 + offset) * 0.12;
      t.rotation.x = Math.cos(this.time * 0.9 + offset) * 0.09;
      t.position.y = -1.2 + Math.sin(this.time * 1.3 + offset) * 0.12;
    }
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
