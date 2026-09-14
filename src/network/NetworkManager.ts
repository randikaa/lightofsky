import { Client, Room } from "colyseus.js";
import * as THREE from "three";
import { RemotePlayer } from "./RemotePlayer";
import type { CharacterClass } from "../character/AdventurerModelFactory";
import { SpeechBubble } from "../vfx/SpeechBubble";

export interface ChatMessagePayload {
  sessionId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export interface SystemMessagePayload {
  text: string;
  timestamp: number;
}

export interface NetworkCallbacks {
  onConnectionStatus?: (status: "connected" | "connecting" | "offline", playerCount: number) => void;
  onChatMessage?: (msg: ChatMessagePayload) => void;
  onSystemMessage?: (msg: SystemMessagePayload) => void;
}

export class NetworkManager {
  private client: Client;
  public room: Room | null = null;
  public isConnected = false;
  private isDestroyed = false;
  public worldSeed = 1337;
  public mySessionId: string | null = null;
  public myPlayerName = "Explorer";
  public myCharacterClass: CharacterClass = "knight";

  private scene: THREE.Scene;
  public remotePlayers = new Map<string, RemotePlayer>();
  public localSpeechBubble: SpeechBubble | null = null;

  private syncTimer = 0;
  private readonly syncInterval = 1 / 30; // 30Hz network sync

  private callbacks: NetworkCallbacks;

  constructor(
    serverUrl: string,
    scene: THREE.Scene,
    localCharacterGroup?: THREE.Group,
    callbacks: NetworkCallbacks = {}
  ) {
    this.client = new Client(serverUrl);
    this.scene = scene;
    this.callbacks = callbacks;

    if (localCharacterGroup) {
      this.localSpeechBubble = new SpeechBubble(localCharacterGroup);
    }
  }

  public setLocalCharacterGroup(group: THREE.Group) {
    if (this.localSpeechBubble) {
      this.localSpeechBubble.destroy();
    }
    this.localSpeechBubble = new SpeechBubble(group);
  }

  public async connect(
    playerName: string,
    initialPos: THREE.Vector3 = new THREE.Vector3(0, 2, 0),
    characterClass: CharacterClass = "knight"
  ): Promise<number> {
    this.isDestroyed = false;
    this.myPlayerName = playerName;
    this.myCharacterClass = characterClass;
    this.callbacks.onConnectionStatus?.("connecting", 1);

    try {
      this.room = await this.client.joinOrCreate("game_room", {
        playerName,
        characterClass,
        x: initialPos.x,
        y: initialPos.y,
        z: initialPos.z,
      });

      // Guard: If destroyed while awaiting connection (e.g. React StrictMode or component unmount)
      if (this.isDestroyed) {
        try {
          this.room.leave(true);
        } catch (_) {}
        this.room = null;
        this.isConnected = false;
        return 1337;
      }

      this.isConnected = true;
      this.mySessionId = this.room.sessionId;

      if (this.room.state && typeof (this.room.state as any).worldSeed === "number") {
        this.worldSeed = (this.room.state as any).worldSeed;
      }

      this.callbacks.onConnectionStatus?.("connected", this.room.state?.players?.size || 1);

      // 1. Listen for players joining the room (Strict Local vs Remote Differentiation)
      (this.room.state as any).players.onAdd((player: any, sessionId: string) => {
        // Guard against ghost duplicate: Never instantiate remote visuals for local player
        if (sessionId === this.room?.sessionId) {
          this.callbacks.onConnectionStatus?.("connected", (this.room?.state as any)?.players?.size || 1);
          return;
        }

        // Clean up any existing duplicate mesh for this sessionId
        if (this.remotePlayers.has(sessionId)) {
          this.removeRemotePlayer(sessionId);
        }

        const remote = new RemotePlayer(
          sessionId,
          player.name || `Explorer_${sessionId.substring(0, 4)}`,
          this.scene,
          new THREE.Vector3(player.x, player.y, player.z),
          (player.characterClass as CharacterClass) || "knight"
        );
        this.remotePlayers.set(sessionId, remote);

        // Bind incoming state changes to interpolate targets
        player.onChange(() => {
          if (player.characterClass && player.characterClass !== remote.visuals.classId) {
            remote.switchCharacterClass(player.characterClass as CharacterClass);
          }

          remote.setTargetTransform(
            player.x,
            player.y,
            player.z,
            player.rotY,
            player.speed,
            player.isGrounded,
            player.isSprinting
          );
        });

        this.callbacks.onConnectionStatus?.("connected", (this.room?.state as any)?.players?.size || 1);
      });

      // 2. Listen for players leaving the room (Clean Entity & GPU Memory Disposal)
      (this.room.state as any).players.onRemove((_: any, sessionId: string) => {
        if (sessionId === this.room?.sessionId) {
          return; // Local player cleanup handled in disconnect/destroy
        }
        this.removeRemotePlayer(sessionId);
        this.callbacks.onConnectionStatus?.("connected", (this.room?.state as any)?.players?.size || 1);
      });

      // 3. Listen for broadcast chat messages
      this.room.onMessage("chat_message", (data: {
        sessionId: string;
        senderName: string;
        text: string;
        timestamp: number;
      }) => {
        const isLocal = data.sessionId === this.mySessionId;

        // Trigger floating overhead 3D speech bubble
        if (isLocal) {
          this.localSpeechBubble?.show(this.myPlayerName, data.text);
        } else {
          const remote = this.remotePlayers.get(data.sessionId);
          if (remote) {
            remote.showChatBubble(data.text);
          }
        }

        // Notify Chat UI panel
        this.callbacks.onChatMessage?.({
          sessionId: data.sessionId,
          senderName: data.senderName,
          text: data.text,
          timestamp: data.timestamp,
          isLocal,
        });
      });

      // 4. Listen for system messages (join / leave notifications)
      this.room.onMessage("system_message", (data: { text: string; timestamp: number }) => {
        this.callbacks.onSystemMessage?.(data);
      });

      return this.worldSeed;
    } catch (err) {
      console.warn("Colyseus server offline or unreachable, falling back to local solo mode:", err);
      this.isConnected = false;
      this.callbacks.onConnectionStatus?.("offline", 1);
      return 1337;
    }
  }

  public removeRemotePlayer(sessionId: string) {
    const remote = this.remotePlayers.get(sessionId);
    if (remote) {
      remote.destroy();
      this.remotePlayers.delete(sessionId);
    }
  }

  public sendTransform(
    position: THREE.Vector3,
    rotY: number,
    speed: number,
    isGrounded: boolean,
    isSprinting: boolean,
    dt: number
  ) {
    if (!this.isConnected || !this.room) return;

    this.syncTimer += dt;
    if (this.syncTimer >= this.syncInterval) {
      this.syncTimer = 0;
      this.room.send("player_transform", {
        x: Number(position.x.toFixed(2)),
        y: Number(position.y.toFixed(2)),
        z: Number(position.z.toFixed(2)),
        rotY: Number(rotY.toFixed(3)),
        speed: Math.round(speed),
        isGrounded,
        isSprinting,
      });
    }
  }

  public sendChatMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.isConnected && this.room) {
      this.room.send("chat", { text: trimmed });
    } else {
      // In offline solo mode: show local speech bubble and echo to chat UI
      this.localSpeechBubble?.show(this.myPlayerName, trimmed);
      this.callbacks.onChatMessage?.({
        sessionId: "local",
        senderName: this.myPlayerName,
        text: trimmed,
        timestamp: Date.now(),
        isLocal: true,
      });
    }
  }

  public sendCharacterClass(characterClass: CharacterClass) {
    this.myCharacterClass = characterClass;
    if (this.isConnected && this.room) {
      this.room.send("change_character", { characterClass });
    }
  }

  public update(dt: number) {
    this.remotePlayers.forEach((remote) => remote.update(dt));
    this.localSpeechBubble?.update(dt);
  }

  public getPlayerCount(): number {
    if (!this.isConnected || !this.room) return 1;
    return this.remotePlayers.size + 1;
  }

  public destroy() {
    this.isDestroyed = true;
    this.remotePlayers.forEach((remote) => remote.destroy());
    this.remotePlayers.clear();
    this.localSpeechBubble?.destroy();
    this.localSpeechBubble = null;
    try {
      this.room?.leave(true);
    } catch (_) {}
    this.room = null;
    this.isConnected = false;
  }
}
