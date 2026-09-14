import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class VillageModelFactory {
  private static instance: VillageModelFactory;
  private loader = new GLTFLoader();
  private modelCache = new Map<string, THREE.Group>();
  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  public static getInstance(): VillageModelFactory {
    if (!VillageModelFactory.instance) {
      VillageModelFactory.instance = new VillageModelFactory();
    }
    return VillageModelFactory.instance;
  }

  /**
   * Essential glTF models required to assemble the Medieval Village structures & props (strictly the 42 active models)
   */
  public static readonly REQUIRED_MODELS = [
    // Walls & Structure
    "Wall_Plaster_Straight",
    "Wall_Plaster_WoodGrid",
    "Wall_Plaster_Window_Thin_Round",
    "Wall_Plaster_Window_Wide_Flat",
    "Wall_Plaster_Door_Flat",
    "Wall_Arch",
    "Corner_ExteriorWide_Brick",
    "Corner_ExteriorWide_Wood",
    // Doors, Windows, Shutters
    "DoorFrame_Flat_WoodDark",
    "Door_4_Flat",
    "Window_Thin_Flat1",
    "Window_Wide_Flat1",
    "WindowShutters_Wide_Flat_Open",
    "WindowShutters_Thin_Flat_Open",
    // Roofs
    "Roof_RoundTiles_4x4",
    "Roof_RoundTiles_4x6",
    "Roof_Tower_RoundTiles",
    "Roof_Dormer_RoundTile",
    "Roof_Front_Brick4",
    "Roof_2x4_RoundTile",
    // Stairs & Balconies
    "Stairs_Exterior_Straight",
    "Stairs_Exterior_Sides",
    "Stairs_Exterior_Platform",
    "Balcony_Cross_Straight",
    // Props & Street Scatter
    "Prop_Wagon",
    "Prop_Crate",
    "Prop_Chimney",
    "Prop_Support",
    "Prop_WoodenFence_Single",
    "Prop_WoodenFence_Extension1",
    "Prop_ExteriorBorder_Straight1",
    "Prop_ExteriorBorder_Straight2",
    "Prop_ExteriorBorder_Corner",
    "Prop_MetalFence_Ornament",
    "Prop_Brick1",
    "Prop_Brick2",
    "Prop_Brick3",
    "Prop_Vine1",
    "Prop_Vine2",
    "Prop_Vine4",
    // Floors
    "Floor_WoodDark",
    "Floor_Brick",
  ];

  public onProgress?: (loaded: number, total: number) => void;

  public async loadAll(): Promise<void> {
    if (this.isLoaded) {
      this.onProgress?.(VillageModelFactory.REQUIRED_MODELS.length, VillageModelFactory.REQUIRED_MODELS.length);
      return;
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const total = VillageModelFactory.REQUIRED_MODELS.length;
      let loaded = 0;

      const loadTasks = VillageModelFactory.REQUIRED_MODELS.map(async (name) => {
        try {
          const gltf = await this.loader.loadAsync(`/assets/village/${name}.gltf`);
          const group = gltf.scene;

          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m) => {
                if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  const stdMat = m as THREE.MeshStandardMaterial;
                  if (stdMat.map) {
                    stdMat.map.colorSpace = THREE.SRGBColorSpace;
                  }
                  stdMat.roughness = Math.max(0.6, stdMat.roughness);
                }
              });
            }
          });

          this.modelCache.set(name, group);
        } catch (err) {
          console.warn(`VillageModelFactory: Failed to load ${name}.gltf`, err);
        } finally {
          loaded++;
          this.onProgress?.(loaded, total);
        }
      });

      await Promise.all(loadTasks);
      this.isLoaded = true;
    })();

    return this.loadPromise;
  }

  /**
   * Clones a cached model by name
   */
  public cloneModel(name: string): THREE.Group | null {
    const cached = this.modelCache.get(name);
    if (!cached) {
      console.warn(`VillageModelFactory: Model ${name} not found in cache`);
      return null;
    }
    return cached.clone(true);
  }

  public hasModel(name: string): boolean {
    return this.modelCache.has(name);
  }
}
