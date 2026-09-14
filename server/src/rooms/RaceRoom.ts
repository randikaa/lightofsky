import colyseus from "colyseus";
import { RaceRoomState, PlayerState } from "./schema/RaceRoomState.js";

const { Room } = colyseus;
type Client = colyseus.Client;

interface TransformPayload {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  speed: number;
  steer: number;
}

interface JoinOptions {
  carModelId?: string;
  carColor?: string;
  playerName?: string;
}

export class RaceRoom extends Room<RaceRoomState> {
  maxClients = 8;
  totalTrackCheckpoints = 10;

  onCreate(options: any) {
    this.setState(new RaceRoomState());
    this.state.worldSeed = Math.floor(Math.random() * 900000) + 100000;
    this.setPatchRate(1000 / 30); // 30Hz network sync rate

    // Transform sync message from client
    this.onMessage("car_transform", (client: Client, data: TransformPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.qx = data.qx;
      player.qy = data.qy;
      player.qz = data.qz;
      player.qw = data.qw;
      player.speed = data.speed;
      player.steerAngle = data.steer;
    });

    // Authoritative Checkpoint Logic
    this.onMessage("pass_checkpoint", (client: Client, checkpointIndex: number) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Sequential checkpoint validation (prevents skipping)
      if (checkpointIndex === player.nextCheckpoint) {
        player.nextCheckpoint = (player.nextCheckpoint + 1) % this.totalTrackCheckpoints;

        // If returned to checkpoint 0, a lap was completed!
        if (player.nextCheckpoint === 0) {
          player.currentLap += 1;
          this.broadcast("player_lap_completed", {
            sessionId: client.sessionId,
            playerName: player.playerName,
            lap: player.currentLap,
          });
        }
      }
    });

    // Customization update (car model or color change)
    this.onMessage("update_customization", (client: Client, data: { carModelId?: string; carColor?: string; playerName?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (data.carModelId) player.carModelId = data.carModelId;
      if (data.carColor) player.carColor = data.carColor;
      if (data.playerName) player.playerName = data.playerName;
    });
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.carModelId = options.carModelId || "coupe";
    player.carColor = options.carColor || "#e63946";
    player.playerName = options.playerName || `Racer_${client.sessionId.substring(0, 4)}`;

    // Grid starting slot calculation
    const slot = this.state.players.size;
    const row = Math.floor(slot / 2);
    const col = slot % 2;
    player.x = col === 0 ? -2.5 : 2.5;
    player.z = -row * 7;
    player.y = 1.0;
    player.qw = 1;

    this.state.players.set(client.sessionId, player);
    console.log(`[RaceRoom] Player joined: ${player.playerName} (${client.sessionId}) at slot ${slot}`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const name = player ? player.playerName : client.sessionId;
    this.state.players.delete(client.sessionId);
    console.log(`[RaceRoom] Player left: ${name} (${client.sessionId})`);
  }
}
