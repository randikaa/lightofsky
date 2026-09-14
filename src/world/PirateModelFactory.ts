import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class PirateModelFactory {
  private static instance: PirateModelFactory;
  private loader = new GLTFLoader();
  private modelCache = new Map<string, THREE.Group>();
  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  public static getInstance(): PirateModelFactory {
    if (!PirateModelFactory.instance) {
      PirateModelFactory.instance = new PirateModelFactory();
    }
    return PirateModelFactory.instance;
  }

  public static readonly REQUIRED_MODELS = [
    // Ships & Sea Creatures
    "Ship_Large",
    "Ship_Small",
    "Characters_Tentacle",
    // Docks & Piers
    "Environment_Dock",
    "Environment_Dock_Broken",
    "Environment_Dock_Pole",
    // Buildings & Cliffs
    "Environment_House1",
    "Environment_House2",
    "Environment_House3",
    "Environment_Cliff1",
    "Environment_Cliff2",
    "Environment_Cliff3",
    "Environment_Cliff4",
    "Environment_Skulls",
    "Environment_LargeBones",
    // Flora & Rocks
    "Environment_PalmTree_1",
    "Environment_PalmTree_2",
    "Environment_PalmTree_3",
    "Environment_Rock_1",
    "Environment_Rock_2",
    "Environment_Rock_3",
    "Environment_Rock_4",
    "Environment_Rock_5",
    // Props & Treasures
    "Prop_Chest_Gold",
    "Prop_Chest_Closed",
    "Prop_Coins",
    "Prop_GoldBag",
    "Prop_Anchor",
    "Prop_Cannon",
    "Prop_CannonBall",
    "Prop_Barrel",
    "Prop_Bottle_1",
    "Prop_Bucket_Fishes",
    // Characters / Skeletons
    "Characters_Sharky",
    "Characters_Skeleton",
  ];

  public onProgress?: (loaded: number, total: number) => void;

  public async loadAll(): Promise<void> {
    if (this.isLoaded) {
      this.onProgress?.(
        PirateModelFactory.REQUIRED_MODELS.length,
        PirateModelFactory.REQUIRED_MODELS.length
      );
      return;
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const total = PirateModelFactory.REQUIRED_MODELS.length;
      let loaded = 0;

      const loadTasks = PirateModelFactory.REQUIRED_MODELS.map(async (name) => {
        try {
          const gltf = await this.loader.loadAsync(`/assets/pirate/${name}.gltf`);
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
                  stdMat.roughness = Math.max(0.65, stdMat.roughness);
                }
              });
            }
          });

          this.modelCache.set(name, group);
        } catch (err) {
          console.warn(`PirateModelFactory: Failed to load ${name}.gltf`, err);
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

  public cloneModel(name: string): THREE.Group | null {
    const cached = this.modelCache.get(name);
    if (!cached) {
      console.warn(`PirateModelFactory: Model ${name} not found in cache`);
      return null;
    }
    return cached.clone(true);
  }

  public hasModel(name: string): boolean {
    return this.modelCache.has(name);
  }
}
