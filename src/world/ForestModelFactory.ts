import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ForestModelFactory {
  private static instance: ForestModelFactory;
  private loader = new GLTFLoader();

  // Cached Geometries for Instanced Rendering
  public pineGeometries: THREE.BufferGeometry[] = [];
  public oakGeometries: THREE.BufferGeometry[] = [];
  public birchGeometries: THREE.BufferGeometry[] = [];
  public bushGeometries: THREE.BufferGeometry[] = [];
  public rockGeometries: THREE.BufferGeometry[] = [];
  public grassGeometries: THREE.BufferGeometry[] = [];

  // Shared PBR Material with forest_texture.png
  public sharedMaterial: THREE.MeshStandardMaterial | null = null;

  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  public static getInstance(): ForestModelFactory {
    if (!ForestModelFactory.instance) {
      ForestModelFactory.instance = new ForestModelFactory();
    }
    return ForestModelFactory.instance;
  }

  public onProgress?: (loaded: number, total: number) => void;

  public async loadAll(): Promise<void> {
    if (this.isLoaded) {
      this.onProgress?.(21, 21);
      return;
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      let loaded = 0;
      const total = 21; // 1 texture + 20 models
      const notifyProgress = () => {
        loaded++;
        this.onProgress?.(loaded, total);
      };

      // Texture loader for shared palette
      const textureLoader = new THREE.TextureLoader();
      const texture = await textureLoader.loadAsync("/assets/nature/forest_texture.png");
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestMipmapLinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      notifyProgress();

      this.sharedMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.82,
        metalness: 0.05,
      });

      // Model groups to load
      const pineFiles = [
        "Tree_1_A_Color1.gltf",
        "Tree_1_B_Color1.gltf",
        "Tree_1_C_Color1.gltf",
      ];
      const oakFiles = [
        "Tree_2_A_Color1.gltf",
        "Tree_2_C_Color1.gltf",
        "Tree_2_D_Color1.gltf",
      ];
      const birchFiles = [
        "Tree_4_A_Color1.gltf",
        "Tree_4_B_Color1.gltf",
        "Tree_4_C_Color1.gltf",
      ];
      const bushFiles = [
        "Bush_1_A_Color1.gltf",
        "Bush_2_A_Color1.gltf",
        "Bush_3_B_Color1.gltf",
        "Bush_4_C_Color1.gltf",
      ];
      const rockFiles = [
        "Rock_1_A_Color1.gltf",
        "Rock_1_E_Color1.gltf",
        "Rock_2_C_Color1.gltf",
        "Rock_3_B_Color1.gltf",
      ];
      const grassFiles = [
        "Grass_1_A_Color1.gltf",
        "Grass_2_B_Color1.gltf",
      ];

      const loadGroup = async (files: string[]): Promise<THREE.BufferGeometry[]> => {
        const promises = files.map(async (file): Promise<THREE.BufferGeometry | null> => {
          try {
            const gltf = await this.loader.loadAsync(`/assets/nature/${file}`);
            let foundGeo: THREE.BufferGeometry | null = null;
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh && !foundGeo) {
                foundGeo = (child as THREE.Mesh).geometry;
              }
            });
            return foundGeo;
          } catch (err) {
            console.warn(`ForestModelFactory: Failed to load ${file}`, err);
            return null;
          } finally {
            notifyProgress();
          }
        });

        const items = await Promise.all(promises);
        const results: THREE.BufferGeometry[] = [];
        for (const geo of items) {
          if (geo) results.push(geo);
        }
        return results;
      };

      const [pines, oaks, birches, bushes, rocks, grass] = await Promise.all([
        loadGroup(pineFiles),
        loadGroup(oakFiles),
        loadGroup(birchFiles),
        loadGroup(bushFiles),
        loadGroup(rockFiles),
        loadGroup(grassFiles),
      ]);

      this.pineGeometries = pines;
      this.oakGeometries = oaks;
      this.birchGeometries = birches;
      this.bushGeometries = bushes;
      this.rockGeometries = rocks;
      this.grassGeometries = grass;

      this.isLoaded = true;
    })();

    return this.loadPromise;
  }
}
