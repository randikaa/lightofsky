import colyseus from "colyseus";
import { GameState, Player } from "./schema/GameState.js";

const { Room } = colyseus;
type Client = colyseus.Client;

export interface PlayerTransformPayload {
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  isGrounded: boolean;
  isSprinting: boolean;
}

export interface ChatPayload {
  text: string;
}

export class GameRoom extends Room<GameState> {
  maxClients = 32;

  onCreate(options: any) {
    this.setState(new GameState());
    this.state.worldSeed = options?.worldSeed || 1337;
    this.setPatchRate(1000 / 30); // 30Hz network sync rate

    // 1. Transform synchronization from players (authoritative relay with validation)
    this.onMessage("player_transform", (client: Client, data: PlayerTransformPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Validate numeric inputs to prevent NaN or corrupted state
      if (typeof data.x === "number" && Number.isFinite(data.x)) player.x = data.x;
      if (typeof data.y === "number" && Number.isFinite(data.y)) player.y = data.y;
      if (typeof data.z === "number" && Number.isFinite(data.z)) player.z = data.z;
      if (typeof data.rotY === "number" && Number.isFinite(data.rotY)) player.rotY = data.rotY;
      if (typeof data.speed === "number" && Number.isFinite(data.speed)) player.speed = data.speed;
      if (typeof data.isGrounded === "boolean") player.isGrounded = data.isGrounded;
      if (typeof data.isSprinting === "boolean") player.isSprinting = data.isSprinting;
    });

    // 2. Chat messaging system
    this.onMessage("chat", (client: Client, data: ChatPayload | string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const rawText = typeof data === "string" ? data : data?.text;
      if (!rawText || typeof rawText !== "string") return;

      const text = rawText.trim().substring(0, 160);
      if (text.length === 0) return;

      const timestamp = Date.now();
      player.lastMessage = text;
      player.messageTimestamp = timestamp;

      // Broadcast chat message to all connected clients
      this.broadcast("chat_message", {
        sessionId: client.sessionId,
        senderName: player.name,
        text,
        timestamp,
      });

      console.log(`[GameRoom] Chat from ${player.name} (${client.sessionId}): "${text}"`);
    });

    // 3. Dynamic character class switching
    this.onMessage("change_character", (client: Client, data: { characterClass: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (typeof data?.characterClass === "string" && data.characterClass.length > 0) {
        player.characterClass = data.characterClass;
        console.log(`[GameRoom] Player ${player.name} switched class to: ${data.characterClass}`);
      }
    });
  }

  onJoin(client: Client, options: { playerName?: string; characterClass?: string; x?: number; y?: number; z?: number } = {}) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.playerName?.trim() || `Explorer_${client.sessionId.substring(0, 4)}`;
    player.characterClass = options.characterClass || "knight";
    player.x = options.x ?? 0;
    player.y = options.y ?? 2;
    player.z = options.z ?? 0;
    player.rotY = 0;
    player.speed = 0;
    player.isGrounded = true;
    player.isSprinting = false;

    this.state.players.set(client.sessionId, player);
    console.log(`[GameRoom] Player joined: ${player.name} (${client.sessionId}), Total players: ${this.state.players.size}`);

    this.broadcast("system_message", {
      text: `${player.name} joined the expedition.`,
      timestamp: Date.now(),
    });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const name = player ? player.name : client.sessionId;
    this.state.players.delete(client.sessionId);
    console.log(`[GameRoom] Player left: ${name} (${client.sessionId}), Remaining: ${this.state.players.size}`);

    this.broadcast("system_message", {
      text: `${name} left the expedition.`,
      timestamp: Date.now(),
    });
  }
}
