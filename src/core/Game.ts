import * as THREE from "three";
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { WorldChunkManager } from "../world/WorldChunkManager";
import { CharacterController } from "../character/CharacterController";
import { ThirdPersonCamera } from "../controllers/ThirdPersonCamera";
import { JungleAtmosphere } from "../environment/JungleAtmosphere";
import { InputManager } from "../controllers/InputManager";
import { SoundManager } from "../audio/SoundManager";
import { ParticleManager } from "../vfx/ParticleManager";
import { NetworkManager, type ChatMessagePayload, type SystemMessagePayload } from "../network/NetworkManager";
import { AdventurerModelFactory, type CharacterClass } from "../character/AdventurerModelFactory";
import { ForestModelFactory } from "../world/ForestModelFactory";
import { VillageModelFactory } from "../world/VillageModelFactory";
import { VillageManager } from "../world/VillageManager";

export interface GameTelemetry {
  speedKmh: number;
  stamina: number;
  maxStamina: number;
  distanceMeters: number;
  chunkCoords: [number, number];
  activeChunkCount: number;
  isSprinting: boolean;
  isGrounded: boolean;
  onlineStatus: "connected" | "connecting" | "offline";
  playerCount: number;
  playerPos: { x: number; y: number; z: number };
}

export interface GameCallbacks {
  onTelemetryUpdate?: (telemetry: GameTelemetry) => void;
  onChatMessage?: (msg: ChatMessagePayload) => void;
  onSystemMessage?: (msg: SystemMessagePayload) => void;
  onLoadingProgress?: (percent: number, statusText: string) => void;
  onGameReady?: () => void;
}

export class Game {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public physics!: PhysicsEngine;
  public chunkManager!: WorldChunkManager;
  public character!: CharacterController;
  public thirdPersonCamera!: ThirdPersonCamera;
  public atmosphere!: JungleAtmosphere;
  public input: InputManager;
  public sound: SoundManager;
  public particles: ParticleManager;
  public network!: NetworkManager;
  public villageManager!: VillageManager;

  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isRunning = false;

  private onTelemetryUpdate?: (telemetry: GameTelemetry) => void;
  private onChatMessage?: (msg: ChatMessagePayload) => void;
  private onSystemMessage?: (msg: SystemMessagePayload) => void;
  private onLoadingProgress?: (percent: number, statusText: string) => void;
  private onGameReady?: () => void;
  private onlineStatus: "connected" | "connecting" | "offline" = "offline";
  private playerCount = 1;

  private isDestroyed = false;
  private startZ = 0;
  private boundResize: () => void;
  private boundUnload: () => void;
  public currentCharacterClass: CharacterClass;
  public currentPlayerName: string;

  constructor(
    canvasContainer: HTMLElement,
    callbacks: GameCallbacks = {},
    initialClass: CharacterClass = "knight",
    initialName = "Explorer"
  ) {
    this.onTelemetryUpdate = callbacks.onTelemetryUpdate;
    this.onChatMessage = callbacks.onChatMessage;
    this.onSystemMessage = callbacks.onSystemMessage;
    this.onLoadingProgress = callbacks.onLoadingProgress;
    this.onGameReady = callbacks.onGameReady;
    this.currentCharacterClass = initialClass;
    this.currentPlayerName = initialName;

    // 1. Scene & Renderer Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    canvasContainer.appendChild(this.renderer.domElement);

    // 2. Subsystems
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.particles = new ParticleManager(this.scene);
    this.atmosphere = new JungleAtmosphere(this.scene, this.renderer);

    this.boundResize = this.handleResize.bind(this);
    this.boundUnload = () => { this.destroy(); };
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("beforeunload", this.boundUnload);

    this.initAsync(canvasContainer);
  }

  private async initAsync(canvasContainer: HTMLElement) {
    this.onLoadingProgress?.(5, "Connecting to asset repository...");

    const advFactory = AdventurerModelFactory.getInstance();
    const forestFactory = ForestModelFactory.getInstance();
    const villageFactory = VillageModelFactory.getInstance();

    let advLoaded = advFactory.isLoaded ? 8 : 0;
    let forestLoaded = forestFactory.isLoaded ? 21 : 0;
    let villageLoaded = villageFactory.isLoaded ? 42 : 0;
    const totalAssets = 71;

    const reportAssetProgress = (stage: string) => {
      const sum = advLoaded + forestLoaded + villageLoaded;
      const pct = Math.min(75, Math.floor(5 + (sum / totalAssets) * 70));
      this.onLoadingProgress?.(pct, stage);
    };

    advFactory.onProgress = (loaded) => {
      advLoaded = loaded;
      reportAssetProgress("Downloading adventurer models & gear...");
    };
    forestFactory.onProgress = (loaded) => {
      forestLoaded = loaded;
      reportAssetProgress("Cultivating ancient jungle foliage...");
    };
    villageFactory.onProgress = (loaded) => {
      villageLoaded = loaded;
      reportAssetProgress("Assembling medieval settlement architecture...");
    };

    reportAssetProgress("Streaming 3D assets...");

    // 3. Pre-load KayKit Adventurer, Forest Nature, and Medieval Village assets in parallel
    await Promise.all([
      advFactory.loadAll(),
      forestFactory.loadAll(),
      villageFactory.loadAll(),
    ]);
    if (this.isDestroyed) return;

    this.onLoadingProgress?.(78, "Initializing Rapier 3D physics engine...");

    // 4. Initialize Rapier WASM Physics Engine
    await PhysicsEngine.init();
    if (this.isDestroyed) return;

    this.physics = new PhysicsEngine({ x: 0.0, y: -9.81, z: 0.0 });

    const worldSeed = 1337;

    this.onLoadingProgress?.(85, "Constructing medieval village settlement & terrain chunks...");

    // 5. Initialize Procedural Endless World Chunk Manager
    this.chunkManager = new WorldChunkManager(this.scene, this.physics.world, worldSeed);

    // 5b. Initialize Medieval Village Settlement
    this.villageManager = new VillageManager(this.scene, this.physics.world, this.chunkManager.getNoise());
    this.villageManager.buildVillage();

    // 6. Spawn Player Character Directly on Carved Jungle Road
    const noise = this.chunkManager.getNoise();
    const spawnX = noise.getRoadCenterX(0);
    const spawnY = noise.evaluate(spawnX, 0).height + 2.0;
    this.startZ = 0;

    this.character = new CharacterController(
      this.scene,
      this.physics.world,
      new THREE.Vector3(spawnX, spawnY, 0),
      this.currentCharacterClass
    );

    // 7. Third-Person Orbit & Follow Camera
    this.thirdPersonCamera = new ThirdPersonCamera(
      this.camera,
      this.character.visuals.group,
      canvasContainer
    );

    if (this.isDestroyed) {
      this.physics?.destroy();
      return;
    }

    this.onLoadingProgress?.(92, "Establishing multiplayer server link...");

    // 8. Multiplayer Colyseus Synchronization & Chat System
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = window.location.port === "5173";
    const serverUrl = isDev
      ? `${protocol}//${window.location.hostname}:2567`
      : `${protocol}//${window.location.host}`;

    this.network = new NetworkManager(
      serverUrl,
      this.scene,
      this.character.visuals.group,
      {
        onConnectionStatus: (status, count) => {
          if (this.isDestroyed) return;
          this.onlineStatus = status;
          this.playerCount = count;
        },
        onChatMessage: (msg) => {
          if (this.isDestroyed) return;
          this.onChatMessage?.(msg);
        },
        onSystemMessage: (msg) => {
          if (this.isDestroyed) return;
          this.onSystemMessage?.(msg);
        },
      }
    );

    await this.network.connect(
      this.currentPlayerName,
      this.character.getPosition(),
      this.currentCharacterClass
    );

    if (this.isDestroyed) {
      this.network.destroy();
      this.physics?.destroy();
      return;
    }

    // Initial pre-warm: step physics and stream initial chunks around spawn
    this.chunkManager.update(this.character.getPosition());
    this.physics.step();

    this.onLoadingProgress?.(100, "Expedition ready!");
    this.start();
    this.onGameReady?.();
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = () => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.tick);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.character && this.physics && this.chunkManager && this.thirdPersonCamera) {
      // 1. Character Movement Update
      const controls = this.input.getState();
      this.character.update(controls, dt, this.thirdPersonCamera.getCameraVectors());
      this.physics.step();

      const charPos = this.character.getPosition();
      const speed = this.character.getSpeed();
      const isGrounded = this.character.getIsGrounded();

      // Auto-recover if character falls below terrain
      if (charPos.y < -20) {
        const noise = this.chunkManager.getNoise();
        const roadX = noise.getRoadCenterX(charPos.z);
        const roadY = noise.evaluate(roadX, charPos.z).height + 2.0;
        this.character.body.setNextKinematicTranslation({ x: roadX, y: roadY, z: charPos.z });
      }

      // 2. Stream Endless World Chunks Around Player
      this.chunkManager.update(charPos);

      // 3. Update Third-Person Orbit Camera
      this.thirdPersonCamera.update(dt);

      // 4. Multiplayer Transform Sync & Remote Entities Update
      this.network?.sendTransform(
        charPos,
        this.character.visuals.group.rotation.y,
        speed,
        isGrounded,
        controls.sprint && speed > 5.0,
        dt
      );
      this.network?.update(dt);
      if (this.network) {
        this.playerCount = this.network.getPlayerCount();
      }

      // 5. Audio & VFX
      this.sound.update(speed, isGrounded, dt);
      if (controls.jump && isGrounded) {
        this.sound.playJumpSound();
      }

      // Footstep dust particles when sprinting or landing
      if (isGrounded && speed > 6.0) {
        this.particles.emitFootstepDust(charPos);
      }
      this.particles.update(dt);

      // 6. Ambient Wildlife & Sun Shadows Follow Character
      this.atmosphere.update(dt, charPos);

      // 7. Telemetry Bridge to Explorer HUD
      if (this.onTelemetryUpdate) {
        const speedKmh = Math.round(speed * 3.6);
        const distanceMeters = Math.max(0, Math.round(charPos.z - this.startZ));
        const chunkCoords: [number, number] = [
          Math.floor(charPos.x / this.chunkManager.chunkSize),
          Math.floor(charPos.z / this.chunkManager.chunkSize),
        ];

        this.onTelemetryUpdate({
          speedKmh,
          stamina: Math.round(this.character.stamina),
          maxStamina: this.character.maxStamina,
          distanceMeters,
          chunkCoords,
          activeChunkCount: this.chunkManager.getActiveChunkCount(),
          isSprinting: controls.sprint && speed > 5.0,
          isGrounded,
          onlineStatus: this.onlineStatus,
          playerCount: this.playerCount,
          playerPos: { x: charPos.x, y: charPos.y, z: charPos.z },
        });
      }
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };

  public sendChatMessage(text: string) {
    this.network?.sendChatMessage(text);
  }

  public setTyping(typing: boolean) {
    this.input.setTyping(typing);
  }

  public resetCharacter() {
    this.character?.resetPosition();
  }

  public switchCharacterClass(newClass: CharacterClass) {
    this.currentCharacterClass = newClass;
    this.character?.switchCharacterClass(newClass);
    this.network?.sendCharacterClass(newClass);
  }

  public toggleMute(): boolean {
    return this.sound.toggleMute();
  }

  private handleResize() {
    if (this.isDestroyed) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public destroy() {
    this.isDestroyed = true;
    this.stop();
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("beforeunload", this.boundUnload);
    this.input?.destroy();
    this.network?.destroy();
    this.villageManager?.dispose();
    if (this.renderer?.domElement?.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer?.dispose();
    this.physics?.destroy();
  }
}
