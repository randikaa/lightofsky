import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const { Server } = colyseus;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 2567);
const host = "0.0.0.0";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

// Serve frontend client static assets built by Vite
const distPath = path.resolve(__dirname, "../../dist");
if (fs.existsSync(distPath)) {
  app.use(
    express.static(distPath, {
      maxAge: "7d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        }
      },
    })
  );

  app.get("*", (req, res, next) => {
    // Let Colyseus matchmaker / health endpoints pass through
    if (req.path.startsWith("/colyseus") || req.path.startsWith("/matchmake") || req.path === "/health") {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
});

gameServer.define("game_room", GameRoom);
gameServer.define("race_room", GameRoom);

gameServer.listen(port, host).then(() => {
  console.log(`🏁 Colyseus Game Server running on http://${host}:${port}`);
  console.log(`🏁 Health check endpoint: http://${host}:${port}/health`);
}).catch((err) => {
  console.error("Failed to start server:", err);
});
