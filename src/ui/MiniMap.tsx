import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface MiniMapProps {
  waypoints: THREE.Vector3[];
  playerPos: { x: number; z: number };
  opponentPositions: Array<{ x: number; z: number; isAI: boolean }>;
}

export const MiniMap: React.FC<MiniMapProps> = ({ waypoints, playerPos, opponentPositions }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waypoints.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Map bounds calculation (world coordinates -> canvas coordinates)
    // Circuit span: X ~ -60 to 180 (span 240), Z ~ -150 to 200 (span 350)
    const minX = -80, maxX = 180;
    const minZ = -150, maxZ = 200;

    const mapX = (x: number) => ((x - minX) / (maxX - minX)) * (width - 30) + 15;
    const mapY = (z: number) => (1 - (z - minZ) / (maxZ - minZ)) * (height - 30) + 15;

    // 1. Draw track path
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    waypoints.forEach((wp, i) => {
      const cx = mapX(wp.x);
      const cy = mapY(wp.z);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();

    // Road inner glow
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. Start / Finish Line Marker
    const startX = mapX(waypoints[0].x);
    const startY = mapY(waypoints[0].z);
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(startX, startY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Opponent Blips
    opponentPositions.forEach((opp) => {
      const ox = mapX(opp.x);
      const oy = mapY(opp.z);
      ctx.fillStyle = opp.isAI ? "#a855f7" : "#ef4444";
      ctx.beginPath();
      ctx.arc(ox, oy, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Local Player Blip (Bright Green)
    const px = mapX(playerPos.x);
    const py = mapY(playerPos.z);

    ctx.fillStyle = "#10b981";
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }, [waypoints, playerPos, opponentPositions]);

  return (
    <div style={{
      position: "absolute",
      top: 20,
      right: 20,
      width: 170,
      height: 170,
      backgroundColor: "rgba(10, 17, 24, 0.75)",
      backdropFilter: "blur(10px)",
      borderRadius: 16,
      border: "1px solid rgba(255, 255, 255, 0.15)",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute",
        top: 6,
        left: 10,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        color: "#94a3b8",
        textTransform: "uppercase"
      }}>
        CIRCUIT RADAR
      </div>
      <canvas ref={canvasRef} width={170} height={170} />
    </div>
  );
};
