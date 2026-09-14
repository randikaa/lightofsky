import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;

  @type("number") qx: number = 0;
  @type("number") qy: number = 0;
  @type("number") qz: number = 0;
  @type("number") qw: number = 1;

  @type("number") speed: number = 0;
  @type("number") steerAngle: number = 0;

  @type("uint8") currentLap: number = 1;
  @type("uint16") nextCheckpoint: number = 0;
  @type("string") carModelId: string = "coupe";
  @type("string") carColor: string = "#e63946";
  @type("string") playerName: string = "Racer";
}

export class RaceRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("uint32") worldSeed: number = 1337;
  @type("string") status: string = "racing";
  @type("number") trackId: number = 1;
}
