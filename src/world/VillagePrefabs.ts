import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { VillageModelFactory } from "./VillageModelFactory";

export interface PrefabResult {
  group: THREE.Group;
  colliders: RAPIER.Collider[];
}

export class VillagePrefabs {
  /**
   * Helper to place a modular piece into a container group with absolute precision
   */
  public static addPart(
    container: THREE.Group,
    factory: VillageModelFactory,
    name: string,
    x: number,
    y: number,
    z: number,
    rotY = 0,
    scale = 1
  ): THREE.Group | null {
    const part = factory.cloneModel(name);
    if (!part) return null;
    part.position.set(x, y, z);
    part.rotation.y = rotY;
    if (scale !== 1) part.scale.setScalar(scale);
    container.add(part);
    return part;
  }

  /**
   * Builds a stone foundation plinth extending slightly underground to prevent any floating on terrain
   */
  private static addFoundation(
    group: THREE.Group,
    factory: VillageModelFactory,
    halfWidth: number,
    halfDepth: number,
    yBase = 0
  ) {
    // Fill interior floor at ground level
    for (let x = -halfWidth + 1; x <= halfWidth - 1; x += 2) {
      for (let z = -halfDepth + 1; z <= halfDepth - 1; z += 2) {
        this.addPart(group, factory, "Floor_Brick", x, yBase, z, 0);
        // Deep skirting tile to bury into terrain slope
        this.addPart(group, factory, "Floor_Brick", x, yBase - 0.4, z, 0);
      }
    }
  }

  /**
   * 1. The Boar's Tusk Tavern / Inn (Left main building from Preview.jpg)
   * Full 4m wide x 6m deep x 2-story modular structure with front entrance porch,
   * shuttered windows, cross balcony, round-tile roof with chimney & ivy.
   * Seamlessly closed on all 4 sides with zero gaps.
   */
  public static createTavernInn(
    factory: VillageModelFactory,
    physicsWorld: RAPIER.World,
    worldPos: THREE.Vector3,
    rotY = 0
  ): PrefabResult {
    const group = new THREE.Group();
    group.position.copy(worldPos);
    group.rotation.y = rotY;

    const colliders: RAPIER.Collider[] = [];

    // --- Foundation Plinth (4m x 6m) ---
    this.addFoundation(group, factory, 2, 3, 0);

    // --- Ground Floor (Y = 0.0 to 3.0) ---
    // Front Wall (Z = 3): 2 pieces spanning X in [-2, 2]
    this.addPart(group, factory, "Wall_Plaster_Door_Flat", -1, 0, 3, 0);
    this.addPart(group, factory, "DoorFrame_Flat_WoodDark", -1, 0, 3, 0);
    this.addPart(group, factory, "Door_4_Flat", -1, 0, 3, 0);
    this.addPart(group, factory, "Wall_Plaster_Window_Wide_Flat", 1, 0, 3, 0);
    this.addPart(group, factory, "Window_Wide_Flat1", 1, 0, 3, 0);
    this.addPart(group, factory, "WindowShutters_Wide_Flat_Open", 1, 0, 3, 0);

    // Back Wall (Z = -3): 2 pieces spanning X in [-2, 2]
    this.addPart(group, factory, "Wall_Plaster_Straight", -1, 0, -3, Math.PI);
    this.addPart(group, factory, "Wall_Plaster_Straight", 1, 0, -3, Math.PI);

    // Left Wall (X = -2): 3 pieces spanning Z in [-3, 3] (Z = -2, 0, 2)
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, -2, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", -2, 0, 0, Math.PI / 2);
    this.addPart(group, factory, "Window_Thin_Flat1", -2, 0, 0, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, 2, Math.PI / 2);

    // Right Wall (X = 2): 3 pieces spanning Z in [-3, 3] (Z = -2, 0, 2)
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, -2, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, 0, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, 2, -Math.PI / 2);

    // 4 Ground Floor Corners
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, 0, 3, 0);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, 0, 3, -Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, 0, -3, Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, 0, -3, Math.PI);

    // Stone Steps & Porch at entrance door
    this.addPart(group, factory, "Stairs_Exterior_Straight", -1, 0, 4.0, 0);
    this.addPart(group, factory, "Stairs_Exterior_Sides", -1, 0, 4.0, 0);

    // Timber Overhang Corbels supporting 2nd floor overhang (placed at Y=0 so top meets Y=3.0)
    this.addPart(group, factory, "Prop_Support", -2, 0, 3.1, 0);
    this.addPart(group, factory, "Prop_Support", 0, 0, 3.1, 0);
    this.addPart(group, factory, "Prop_Support", 2, 0, 3.1, 0);

    // --- Second Floor (Y = 3.0 to 6.0) ---
    // Floor tiles (2 x 3 = 6 tiles)
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -2; z <= 2; z += 2) {
        this.addPart(group, factory, "Floor_WoodDark", x, 3.0, z, 0);
      }
    }

    // Front Wall (Z = 3)
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", -1, 3.0, 3, 0);
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", 1, 3.0, 3, 0);
    this.addPart(group, factory, "Window_Thin_Flat1", 1, 3.0, 3, 0);
    this.addPart(group, factory, "WindowShutters_Thin_Flat_Open", 1, 3.0, 3, 0);

    // Back Wall (Z = -3)
    this.addPart(group, factory, "Wall_Plaster_Straight", -1, 3.0, -3, Math.PI);
    this.addPart(group, factory, "Wall_Plaster_Straight", 1, 3.0, -3, Math.PI);

    // Left Wall (X = -2)
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 3.0, -2, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", -2, 3.0, 0, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 3.0, 2, Math.PI / 2);

    // Right Wall (X = 2)
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 3.0, -2, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", 2, 3.0, 0, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 3.0, 2, -Math.PI / 2);

    // 4 Upper Story Corners
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", -2, 3.0, 3, 0);
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", 2, 3.0, 3, -Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", -2, 3.0, -3, Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", 2, 3.0, -3, Math.PI);

    // Front Balcony with Cross Railing (Snaps to wall Z = 3)
    this.addPart(group, factory, "Balcony_Cross_Straight", -1, 3.0, 3.0, 0);
    this.addPart(group, factory, "Balcony_Cross_Straight", 1, 3.0, 3.0, 0);

    // --- Roof (Y = 6.0) ---
    this.addPart(group, factory, "Roof_RoundTiles_4x6", 0, 6.0, 0, 0);
    this.addPart(group, factory, "Roof_Front_Brick4", 0, 6.0, 3.0, 0);
    this.addPart(group, factory, "Roof_Front_Brick4", 0, 6.0, -3.0, Math.PI);

    // Stone Chimney & Crest
    this.addPart(group, factory, "Prop_Chimney", -1.2, 8.5, 0.5, 0);
    this.addPart(group, factory, "Prop_MetalFence_Ornament", 0, 9.4, 0, 0);

    // Climbing Ivy on Corner
    this.addPart(group, factory, "Prop_Vine1", -2.1, 1.5, 2.9, 0);
    this.addPart(group, factory, "Prop_Vine4", -2.1, 4.0, 2.9, 0);

    // --- Solid Rapier Physics Colliders ---
    const mainCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.2, 3.2, 3.2).setRestitution(0).setFriction(1.0)
    );
    const centerPos = new THREE.Vector3(0, 3.0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    mainCol.setTranslation({ x: centerPos.x, y: centerPos.y, z: centerPos.z });
    colliders.push(mainCol);

    // Entrance Steps Collider
    const stepsCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(1.0, 0.45, 0.9).setRestitution(0).setFriction(1.2)
    );
    const stepsPos = new THREE.Vector3(-1, 0.45, 4.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    stepsCol.setTranslation({ x: stepsPos.x, y: stepsPos.y, z: stepsPos.z });
    colliders.push(stepsCol);

    return { group, colliders };
  }

  /**
   * 2. The Artisan Townhouse & Residence (Right building from Preview.jpg)
   * 4m x 6m two-story residence with exterior side stone staircase, wraparound balcony,
   * dormer window roof, retaining wall, and front yard wooden fences.
   * Completely closed on all 4 sides with zero gaps.
   */
  public static createTownhouse(
    factory: VillageModelFactory,
    physicsWorld: RAPIER.World,
    worldPos: THREE.Vector3,
    rotY = 0
  ): PrefabResult {
    const group = new THREE.Group();
    group.position.copy(worldPos);
    group.rotation.y = rotY;

    const colliders: RAPIER.Collider[] = [];

    // --- Foundation Plinth (4m x 6m) ---
    this.addFoundation(group, factory, 2, 3, 0);

    // --- Ground Floor (Y = 0.0 to 3.0) ---
    // Front Wall (Z = 3)
    this.addPart(group, factory, "Wall_Plaster_Window_Wide_Flat", -1, 0, 3, 0);
    this.addPart(group, factory, "Window_Wide_Flat1", -1, 0, 3, 0);
    this.addPart(group, factory, "WindowShutters_Wide_Flat_Open", -1, 0, 3, 0);
    this.addPart(group, factory, "Wall_Plaster_Door_Flat", 1, 0, 3, 0);
    this.addPart(group, factory, "DoorFrame_Flat_WoodDark", 1, 0, 3, 0);
    this.addPart(group, factory, "Door_4_Flat", 1, 0, 3, 0);

    // Back Wall (Z = -3)
    this.addPart(group, factory, "Wall_Plaster_Straight", -1, 0, -3, Math.PI);
    this.addPart(group, factory, "Wall_Plaster_Straight", 1, 0, -3, Math.PI);

    // Left Wall (X = -2)
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, -2, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, 0, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, 2, Math.PI / 2);

    // Right Wall (X = 2): 3 pieces spanning Z in [-3, 3]
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, -2, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", 2, 0, 0, -Math.PI / 2);
    this.addPart(group, factory, "Window_Thin_Flat1", 2, 0, 0, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, 2, -Math.PI / 2);

    // 4 Ground Floor Corners
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, 0, 3, 0);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, 0, 3, -Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, 0, -3, Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, 0, -3, Math.PI);

    // Exterior Side Staircase climbing along right wall up to 2nd floor entrance
    this.addPart(group, factory, "Stairs_Exterior_Straight", 2.9, 0, 2.0, 0);
    this.addPart(group, factory, "Stairs_Exterior_Platform", 2.9, 1.0, 0.0, 0);
    this.addPart(group, factory, "Stairs_Exterior_Straight", 2.9, 1.0, -2.0, 0);

    // --- Second Floor (Y = 3.0 to 6.0) ---
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -2; z <= 2; z += 2) {
        this.addPart(group, factory, "Floor_WoodDark", x, 3.0, z, 0);
      }
    }

    // Front Wall (Z = 3)
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", -1, 3.0, 3, 0);
    this.addPart(group, factory, "Wall_Plaster_Door_Flat", 1, 3.0, 3, 0);
    this.addPart(group, factory, "DoorFrame_Flat_WoodDark", 1, 3.0, 3, 0);
    this.addPart(group, factory, "Door_4_Flat", 1, 3.0, 3, 0);

    // Back Wall (Z = -3)
    this.addPart(group, factory, "Wall_Plaster_Straight", -1, 3.0, -3, Math.PI);
    this.addPart(group, factory, "Wall_Plaster_Straight", 1, 3.0, -3, Math.PI);

    // Left Wall (X = -2)
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", -2, 3.0, -2, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", -2, 3.0, 0, Math.PI / 2);
    this.addPart(group, factory, "Window_Thin_Flat1", -2, 3.0, 0, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", -2, 3.0, 2, Math.PI / 2);

    // Right Wall (X = 2)
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", 2, 3.0, -2, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 3.0, 0, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_WoodGrid", 2, 3.0, 2, -Math.PI / 2);

    // 4 Upper Story Corners
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", -2, 3.0, 3, 0);
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", 2, 3.0, 3, -Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", -2, 3.0, -3, Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Wood", 2, 3.0, -3, Math.PI);

    // Front Balcony with Cross Railing (Snaps to wall Z = 3)
    this.addPart(group, factory, "Balcony_Cross_Straight", -1, 3.0, 3.0, 0);
    this.addPart(group, factory, "Balcony_Cross_Straight", 1, 3.0, 3.0, 0);

    // --- Roof with Dormer Window (Y = 6.0) ---
    this.addPart(group, factory, "Roof_RoundTiles_4x6", 0, 6.0, 0, 0);
    this.addPart(group, factory, "Roof_Front_Brick4", 0, 6.0, 3.0, 0);
    this.addPart(group, factory, "Roof_Front_Brick4", 0, 6.0, -3.0, Math.PI);
    this.addPart(group, factory, "Roof_Dormer_RoundTile", -1.8, 7.2, 0.5, Math.PI / 2);

    // Retaining Stone Border & Wooden Fence in Front Yard
    this.addPart(group, factory, "Prop_ExteriorBorder_Straight1", -3.2, 0, 4.0, 0);
    this.addPart(group, factory, "Prop_ExteriorBorder_Straight2", -3.2, 0, 2.0, 0);
    this.addPart(group, factory, "Prop_WoodenFence_Single", -3.2, 0.2, 4.0, 0);
    this.addPart(group, factory, "Prop_WoodenFence_Extension1", -3.2, 0.2, 2.0, 0);

    // Ivy on Front Corner
    this.addPart(group, factory, "Prop_Vine2", -2.1, 1.2, 2.9, 0);

    // --- Solid Rapier Colliders ---
    const townCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.2, 3.2, 3.2).setRestitution(0).setFriction(1.0)
    );
    const townPos = new THREE.Vector3(0, 3.0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    townCol.setTranslation({ x: townPos.x, y: townPos.y, z: townPos.z });
    colliders.push(townCol);

    // Side Staircase Collider
    const stairsCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(0.7, 1.2, 2.6).setRestitution(0).setFriction(1.2)
    );
    const stairPos = new THREE.Vector3(2.9, 1.2, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    stairsCol.setTranslation({ x: stairPos.x, y: stairPos.y, z: stairPos.z });
    colliders.push(stairsCol);

    return { group, colliders };
  }

  /**
   * 3. The Skybridge Arch Passage (Connecting Tavern to Brewer's House)
   * Spans a 4.0m wide alleyway between two buildings.
   * Both ends physically join the walls of the adjacent buildings.
   * Ground clearance: 3.0m high, 2.5m wide arch opening for walking/running through.
   */
  public static createSkybridge(
    factory: VillageModelFactory,
    physicsWorld: RAPIER.World,
    worldPos: THREE.Vector3,
    rotY = 0
  ): PrefabResult {
    const group = new THREE.Group();
    group.position.copy(worldPos);
    group.rotation.y = rotY;

    const colliders: RAPIER.Collider[] = [];

    // The bridge is 4.0m long (X from -2 to +2), 2.0m wide (Z from -1 to +1)
    // Underneath: 2 Wooden Arch Beams along the front and back of the bridge
    this.addPart(group, factory, "Wall_Arch", -1, 0, 1.0, 0);
    this.addPart(group, factory, "Wall_Arch", 1, 0, 1.0, 0);
    this.addPart(group, factory, "Wall_Arch", -1, 0, -1.0, Math.PI);
    this.addPart(group, factory, "Wall_Arch", 1, 0, -1.0, Math.PI);

    // Heavy support corbels underneath meeting the building walls
    this.addPart(group, factory, "Prop_Support", -1.9, 0, 1.0, -Math.PI / 2);
    this.addPart(group, factory, "Prop_Support", 1.9, 0, 1.0, Math.PI / 2);
    this.addPart(group, factory, "Prop_Support", -1.9, 0, -1.0, -Math.PI / 2);
    this.addPart(group, factory, "Prop_Support", 1.9, 0, -1.0, Math.PI / 2);

    // Upper Corridor Walkway (Y = 3.0)
    // Floor tiles (2 tiles spanning X in [-2, 2])
    this.addPart(group, factory, "Floor_WoodDark", -1, 3.0, 0, 0);
    this.addPart(group, factory, "Floor_WoodDark", 1, 3.0, 0, 0);

    // Front Corridor Wall (Z = 1.0) with arched windows
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", -1, 3.0, 1.0, 0);
    this.addPart(group, factory, "Window_Thin_Flat1", -1, 3.0, 1.0, 0);
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", 1, 3.0, 1.0, 0);
    this.addPart(group, factory, "Window_Thin_Flat1", 1, 3.0, 1.0, 0);

    // Back Corridor Wall (Z = -1.0) with arched windows
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", -1, 3.0, -1.0, Math.PI);
    this.addPart(group, factory, "Window_Thin_Flat1", -1, 3.0, -1.0, Math.PI);
    this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", 1, 3.0, -1.0, Math.PI);
    this.addPart(group, factory, "Window_Thin_Flat1", 1, 3.0, -1.0, Math.PI);

    // Bridge Roof (Round Tile roof at Y = 6.0)
    this.addPart(group, factory, "Roof_2x4_RoundTile", 0, 6.0, 0, 0);

    // --- Physics: Walkable upper deck collider ---
    const deckCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.0, 0.15, 1.0).setRestitution(0).setFriction(1.0)
    );
    const deckPos = new THREE.Vector3(0, 3.05, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    deckCol.setTranslation({ x: deckPos.x, y: deckPos.y, z: deckPos.z });
    colliders.push(deckCol);

    return { group, colliders };
  }

  /**
   * 4. Citadel Watchtower (Square stone fortification tower in background)
   * 4m x 4m footprint, 13m high, 3 fully-enclosed stories with 4 corners each,
   * bracketed lookout platform, and pyramidal red tile roof.
   * Completely closed with zero gaps.
   */
  public static createWatchtower(
    factory: VillageModelFactory,
    physicsWorld: RAPIER.World,
    worldPos: THREE.Vector3,
    rotY = 0
  ): PrefabResult {
    const group = new THREE.Group();
    group.position.copy(worldPos);
    group.rotation.y = rotY;

    const colliders: RAPIER.Collider[] = [];

    // --- Foundation Plinth (4m x 4m) ---
    this.addFoundation(group, factory, 2, 2, 0);

    // Helper for a single enclosed 4x4 tower story
    const buildTowerStory = (yBase: number, hasDoor: boolean) => {
      // Floor
      this.addPart(group, factory, "Floor_WoodDark", -1, yBase, -1, 0);
      this.addPart(group, factory, "Floor_WoodDark", 1, yBase, -1, 0);
      this.addPart(group, factory, "Floor_WoodDark", -1, yBase, 1, 0);
      this.addPart(group, factory, "Floor_WoodDark", 1, yBase, 1, 0);

      // Front Wall (Z = 2)
      if (hasDoor) {
        this.addPart(group, factory, "Wall_Plaster_Door_Flat", -1, yBase, 2, 0);
        this.addPart(group, factory, "DoorFrame_Flat_WoodDark", -1, yBase, 2, 0);
        this.addPart(group, factory, "Door_4_Flat", -1, yBase, 2, 0);
        this.addPart(group, factory, "Wall_Plaster_Straight", 1, yBase, 2, 0);
      } else {
        this.addPart(group, factory, "Wall_Plaster_Straight", -1, yBase, 2, 0);
        this.addPart(group, factory, "Wall_Plaster_Window_Thin_Round", 1, yBase, 2, 0);
        this.addPart(group, factory, "Window_Thin_Flat1", 1, yBase, 2, 0);
      }

      // Back Wall (Z = -2)
      this.addPart(group, factory, "Wall_Plaster_Straight", -1, yBase, -2, Math.PI);
      this.addPart(group, factory, "Wall_Plaster_Straight", 1, yBase, -2, Math.PI);

      // Left Wall (X = -2)
      this.addPart(group, factory, "Wall_Plaster_Straight", -2, yBase, -1, Math.PI / 2);
      this.addPart(group, factory, "Wall_Plaster_Straight", -2, yBase, 1, Math.PI / 2);

      // Right Wall (X = 2)
      this.addPart(group, factory, "Wall_Plaster_Straight", 2, yBase, -1, -Math.PI / 2);
      this.addPart(group, factory, "Wall_Plaster_Straight", 2, yBase, 1, -Math.PI / 2);

      // 4 Corners
      this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, yBase, 2, 0);
      this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, yBase, 2, -Math.PI / 2);
      this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, yBase, -2, Math.PI / 2);
      this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, yBase, -2, Math.PI);
    };

    // Story 1 (Y = 0 to 3)
    buildTowerStory(0, true);

    // Story 2 (Y = 3 to 6)
    buildTowerStory(3.0, false);

    // Story 3 (Y = 6 to 9)
    buildTowerStory(6.0, false);

    // Lookout Corbels at top (Y = 6.0 so top meets Y=9.0)
    this.addPart(group, factory, "Prop_Support", -2, 6.0, 2.1, 0);
    this.addPart(group, factory, "Prop_Support", 2, 6.0, 2.1, 0);
    this.addPart(group, factory, "Prop_Support", -2, 6.0, -2.1, Math.PI);
    this.addPart(group, factory, "Prop_Support", 2, 6.0, -2.1, Math.PI);

    // Pyramidal Red Tile Tower Roof (Y = 9.0)
    this.addPart(group, factory, "Roof_Tower_RoundTiles", 0, 9.2, 0, 0);

    // --- Physics Collider ---
    const towerCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.2, 6.5, 2.2).setRestitution(0).setFriction(1.0)
    );
    const towerPos = new THREE.Vector3(0, 6.5, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    towerCol.setTranslation({ x: towerPos.x, y: towerPos.y, z: towerPos.z });
    colliders.push(towerCol);

    return { group, colliders };
  }

  /**
   * 5. Cozy Medieval Cottage (4m x 4m single-story home)
   */
  public static createCottage(
    factory: VillageModelFactory,
    physicsWorld: RAPIER.World,
    worldPos: THREE.Vector3,
    rotY = 0
  ): PrefabResult {
    const group = new THREE.Group();
    group.position.copy(worldPos);
    group.rotation.y = rotY;

    const colliders: RAPIER.Collider[] = [];

    // Foundation
    this.addFoundation(group, factory, 2, 2, 0);

    // Ground Floor Walls
    this.addPart(group, factory, "Wall_Plaster_Door_Flat", -1, 0, 2, 0);
    this.addPart(group, factory, "DoorFrame_Flat_WoodDark", -1, 0, 2, 0);
    this.addPart(group, factory, "Door_4_Flat", -1, 0, 2, 0);
    this.addPart(group, factory, "Wall_Plaster_Window_Wide_Flat", 1, 0, 2, 0);
    this.addPart(group, factory, "Window_Wide_Flat1", 1, 0, 2, 0);
    this.addPart(group, factory, "WindowShutters_Wide_Flat_Open", 1, 0, 2, 0);

    this.addPart(group, factory, "Wall_Plaster_Straight", -1, 0, -2, Math.PI);
    this.addPart(group, factory, "Wall_Plaster_Straight", 1, 0, -2, Math.PI);

    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, -1, Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", -2, 0, 1, Math.PI / 2);

    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, -1, -Math.PI / 2);
    this.addPart(group, factory, "Wall_Plaster_Straight", 2, 0, 1, -Math.PI / 2);

    // 4 Corners
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, 0, 2, 0);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, 0, 2, -Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", -2, 0, -2, Math.PI / 2);
    this.addPart(group, factory, "Corner_ExteriorWide_Brick", 2, 0, -2, Math.PI);

    // Steps
    this.addPart(group, factory, "Stairs_Exterior_Straight", -1, 0, 3.0, 0);

    // Roof (Y = 3.0)
    this.addPart(group, factory, "Roof_RoundTiles_4x4", 0, 3.0, 0, 0);
    this.addPart(group, factory, "Roof_Front_Brick4", 0, 3.0, 2.0, 0);
    this.addPart(group, factory, "Roof_Front_Brick4", 0, 3.0, -2.0, Math.PI);

    // Chimney
    this.addPart(group, factory, "Prop_Chimney", 1.2, 5.5, 0, 0);

    // Physics
    const cottageCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(2.2, 2.5, 2.2).setRestitution(0).setFriction(1.0)
    );
    const cPos = new THREE.Vector3(0, 2.0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(worldPos);
    cottageCol.setTranslation({ x: cPos.x, y: cPos.y, z: cPos.z });
    colliders.push(cottageCol);

    return { group, colliders };
  }

  /**
   * 6. Village Street Furniture & Scatter Props
   */
  public static createStreetScatter(
    factory: VillageModelFactory,
    physicsWorld: RAPIER.World,
    worldPos: THREE.Vector3
  ): PrefabResult {
    const group = new THREE.Group();
    group.position.copy(worldPos);

    const colliders: RAPIER.Collider[] = [];

    // Wooden Wagon parked near the Tavern
    this.addPart(group, factory, "Prop_Wagon", -7.5, 0.0, 4.0, 0.45);
    const wagonCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(1.0, 0.75, 1.8).setRestitution(0).setFriction(1.2)
    );
    wagonCol.setTranslation({ x: worldPos.x - 7.5, y: worldPos.y + 0.75, z: worldPos.z + 4.0 });
    colliders.push(wagonCol);

    // Cargo Crates Stack (Walkable / Jumpable)
    this.addPart(group, factory, "Prop_Crate", -5.5, 0.0, 5.0, 0.2);
    this.addPart(group, factory, "Prop_Crate", -5.2, 1.0, 5.1, -0.15);
    this.addPart(group, factory, "Prop_Crate", -4.4, 0.0, 5.2, 0.4);

    const crateStackCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(1.2, 1.0, 0.8).setRestitution(0).setFriction(1.2)
    );
    crateStackCol.setTranslation({ x: worldPos.x - 5.0, y: worldPos.y + 1.0, z: worldPos.z + 5.1 });
    colliders.push(crateStackCol);

    // Post-and-Rail Wooden Fences lining the walkway
    this.addPart(group, factory, "Prop_WoodenFence_Single", 5.5, 0.0, 2.0, 0.1);
    this.addPart(group, factory, "Prop_WoodenFence_Extension1", 5.5, 0.0, 4.0, 0.08);
    this.addPart(group, factory, "Prop_WoodenFence_Extension1", 5.5, 0.0, 6.0, 0.12);

    const fenceCol = physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(0.15, 0.5, 3.2).setRestitution(0).setFriction(1.0)
    );
    fenceCol.setTranslation({ x: worldPos.x + 5.5, y: worldPos.y + 0.5, z: worldPos.z + 4.0 });
    colliders.push(fenceCol);

    // Low Retaining Stone Wall
    this.addPart(group, factory, "Prop_ExteriorBorder_Straight1", 6.8, 0.0, 1.5, 0.1);
    this.addPart(group, factory, "Prop_ExteriorBorder_Straight2", 6.8, 0.0, 3.5, 0.1);
    this.addPart(group, factory, "Prop_ExteriorBorder_Corner", 6.8, 0.0, 5.5, 0.1);

    // Scattered Roadside Stone Pavers
    this.addPart(group, factory, "Prop_Brick1", -2.8, 0.05, 1.0, 0.3);
    this.addPart(group, factory, "Prop_Brick2", -3.2, 0.05, 3.2, 0.8);
    this.addPart(group, factory, "Prop_Brick3", 3.0, 0.05, 2.5, 0.5);
    this.addPart(group, factory, "Prop_Brick1", 3.5, 0.05, -1.0, 1.2);

    return { group, colliders };
  }
}
