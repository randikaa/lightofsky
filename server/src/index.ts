import http from "http";
import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const { Server } = colyseus;

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
});

gameServer.define("game_room", GameRoom);
gameServer.define("race_room", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`🏁 Colyseus Game Server running on ws://localhost:${port}`);
  console.log(`🏁 Health check endpoint: http://localhost:${port}/health`);
}).catch((err) => {
  console.error("Failed to start server:", err);
});
