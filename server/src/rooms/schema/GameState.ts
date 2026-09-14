import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotY: number = 0;
  @type("number") speed: number = 0;
  @type("boolean") isGrounded: boolean = true;
  @type("boolean") isSprinting: boolean = false;
  @type("string") characterClass: string = "knight";
  @type("string") lastMessage: string = "";
  @type("number") messageTimestamp: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("uint32") worldSeed: number = 1337;
  @type("string") status: string = "active";
}
