import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export type CharacterClass =
  | "knight"
  | "barbarian"
  | "mage"
  | "ranger"
  | "rogue"
  | "rogue_hooded";

export interface CharacterClassInfo {
  id: CharacterClass;
  name: string;
  title: string;
  badgeColor: string;
  accentColor: string;
  description: string;
  modelFile: string;
  stats: {
    stamina: number;
    speed: number;
    agility: number;
  };
}

export const CHARACTER_CLASSES: Record<CharacterClass, CharacterClassInfo> = {
  knight: {
    id: "knight",
    name: "Sir Roger",
    title: "Valiant Knight",
    badgeColor: "#38bdf8",
    accentColor: "#0284c7",
    description: "Battle-hardened paladin cloaked in polished steel. Resilient and commanding on the frontier.",
    modelFile: "Knight.glb",
    stats: { stamina: 95, speed: 75, agility: 65 },
  },
  barbarian: {
    id: "barbarian",
    name: "Grok",
    title: "Fierce Berserker",
    badgeColor: "#f97316",
    accentColor: "#ea580c",
    description: "Mighty warrior of the northern tribes. Unmatched raw power and boundless endurance.",
    modelFile: "Barbarian.glb",
    stats: { stamina: 100, speed: 85, agility: 70 },
  },
  mage: {
    id: "mage",
    name: "Aldous",
    title: "Arcane Sorcerer",
    badgeColor: "#a855f7",
    accentColor: "#9333ea",
    description: "Scholar of ancient jungle ruins. Wields mystical runes and ancient jungle lore.",
    modelFile: "Mage.glb",
    stats: { stamina: 75, speed: 70, agility: 80 },
  },
  ranger: {
    id: "ranger",
    name: "Lyra",
    title: "Wilderness Scout",
    badgeColor: "#22c55e",
    accentColor: "#16a34a",
    description: "Master tracker of the untamed jungle canopy. Swift footed, keen eyed, and untiring.",
    modelFile: "Ranger.glb",
    stats: { stamina: 90, speed: 90, agility: 95 },
  },
  rogue: {
    id: "rogue",
    name: "Finn",
    title: "Shadow Thief",
    badgeColor: "#eab308",
    accentColor: "#ca8a04",
    description: "Cunning infiltrator skilled in stealth and acrobatics. Can outrun danger with ease.",
    modelFile: "Rogue.glb",
    stats: { stamina: 85, speed: 95, agility: 100 },
  },
  rogue_hooded: {
    id: "rogue_hooded",
    name: "Nyx",
    title: "Silent Assassin",
    badgeColor: "#ec4899",
    accentColor: "#db2777",
    description: "Masked phantom moving unseen through the shadows. Deadly, silent, and elusive.",
    modelFile: "Rogue_Hooded.glb",
    stats: { stamina: 85, speed: 95, agility: 100 },
  },
};

export interface InstantiatedCharacter {
  classId: CharacterClass;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: {
    idle: THREE.AnimationAction;
    walk: THREE.AnimationAction;
    run: THREE.AnimationAction;
    jumpStart: THREE.AnimationAction;
    jumpIdle: THREE.AnimationAction;
    jumpLand: THREE.AnimationAction;
  };
}

export class AdventurerModelFactory {
  private static instance: AdventurerModelFactory;
  private loader = new GLTFLoader();

  // Cache loaded master scenes and animation clips
  private characterScenes = new Map<CharacterClass, THREE.Group>();
  private animationClips = new Map<string, THREE.AnimationClip>();
  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  public static getInstance(): AdventurerModelFactory {
    if (!AdventurerModelFactory.instance) {
      AdventurerModelFactory.instance = new AdventurerModelFactory();
    }
    return AdventurerModelFactory.instance;
  }

  public onProgress?: (loaded: number, total: number) => void;

  public async loadAll(): Promise<void> {
    if (this.isLoaded) {
      this.onProgress?.(8, 8);
      return;
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      let loaded = 0;
      const total = 8; // 2 animations + 6 characters
      const notifyProgress = () => {
        loaded++;
        this.onProgress?.(loaded, total);
      };

      // 1. Load Animation GLBs
      const [generalGlb, movementGlb] = await Promise.all([
        this.loader.loadAsync("/assets/animations/Rig_Medium_General.glb").then((res) => {
          notifyProgress();
          return res;
        }),
        this.loader.loadAsync("/assets/animations/Rig_Medium_MovementBasic.glb").then((res) => {
          notifyProgress();
          return res;
        }),
      ]);

      generalGlb.animations.forEach((clip) => {
        this.animationClips.set(clip.name, clip);
      });
      movementGlb.animations.forEach((clip) => {
        this.animationClips.set(clip.name, clip);
      });

      // 2. Load all 6 Character Classes in parallel
      const classKeys = Object.keys(CHARACTER_CLASSES) as CharacterClass[];
      const loadPromises = classKeys.map(async (classId) => {
        try {
          const info = CHARACTER_CLASSES[classId];
          const gltf = await this.loader.loadAsync(`/assets/characters/${info.modelFile}`);
          const scene = gltf.scene;

          // Configure shadows and material settings
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mat = (child as THREE.Mesh).material;
              if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                (mat as THREE.MeshStandardMaterial).roughness = 0.7;
                (mat as THREE.MeshStandardMaterial).metalness = 0.1;
              }
            }
          });

          this.characterScenes.set(classId, scene);
        } finally {
          notifyProgress();
        }
      });

      await Promise.all(loadPromises);
      this.isLoaded = true;
    })();

    return this.loadPromise;
  }

  public instantiate(classId: CharacterClass): InstantiatedCharacter {
    const masterScene = this.characterScenes.get(classId) || this.characterScenes.get("knight");
    if (!masterScene) {
      throw new Error(`AdventurerModelFactory: Character model '${classId}' is not loaded.`);
    }

    // Deep clone skinned mesh hierarchy with proper bone references
    const clonedScene = SkeletonUtils.clone(masterScene) as THREE.Group;

    // Center model at ground level
    const root = new THREE.Group();
    root.name = `Adventurer_${classId}`;
    root.add(clonedScene);

    const mixer = new THREE.AnimationMixer(clonedScene);

    // Retrieve animation clips with fallback
    const idleClip = this.animationClips.get("Idle_A") || this.animationClips.get("Idle_B");
    const walkClip = this.animationClips.get("Walking_A") || this.animationClips.get("Walking_B");
    const runClip = this.animationClips.get("Running_A") || this.animationClips.get("Running_B");
    const jumpStartClip = this.animationClips.get("Jump_Start") || this.animationClips.get("Jump_Full_Short");
    const jumpIdleClip = this.animationClips.get("Jump_Idle");
    const jumpLandClip = this.animationClips.get("Jump_Land");

    const idle = mixer.clipAction(idleClip!);
    idle.setLoop(THREE.LoopRepeat, Infinity);

    const walk = mixer.clipAction(walkClip!);
    walk.setLoop(THREE.LoopRepeat, Infinity);

    const run = mixer.clipAction(runClip!);
    run.setLoop(THREE.LoopRepeat, Infinity);

    const jumpStart = mixer.clipAction(jumpStartClip!);
    jumpStart.setLoop(THREE.LoopOnce, 1);
    jumpStart.clampWhenFinished = true;

    const jumpIdle = mixer.clipAction(jumpIdleClip || jumpStartClip!);
    jumpIdle.setLoop(THREE.LoopRepeat, Infinity);

    const jumpLand = mixer.clipAction(jumpLandClip || idleClip!);
    jumpLand.setLoop(THREE.LoopOnce, 1);
    jumpLand.clampWhenFinished = true;

    // Start with Idle active
    idle.play();

    return {
      classId,
      root,
      mixer,
      actions: {
        idle,
        walk,
        run,
        jumpStart,
        jumpIdle,
        jumpLand,
      },
    };
  }

  public getAvailableClasses(): CharacterClassInfo[] {
    return Object.values(CHARACTER_CLASSES);
  }
}
