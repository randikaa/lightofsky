import React from "react";
import type { GameTelemetry } from "../core/Game";
import { Volume2, VolumeX, RotateCcw, Compass, Layers, Zap, MousePointer, UserCheck } from "lucide-react";

interface HUDProps {
  telemetry: GameTelemetry;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetCharacter: () => void;
  onChangeCharacter?: () => void;
  onToggleTravel?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  isMuted,
  onToggleMute,
  onResetCharacter,
  onChangeCharacter,
  onToggleTravel,
}) => {
  const {
    speedKmh,
    stamina,
    maxStamina,
    distanceMeters,
    chunkCoords,
    activeChunkCount,
    isSprinting,
    onlineStatus,
  } = telemetry;

  const staminaRatio = Math.max(0, Math.min(stamina / maxStamina, 1.0));

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      userSelect: "none",
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#ffffff",
    }}>
      {/* 1. Top Left: Expedition Distance & World Chunks */}
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "auto",
      }}>
        {/* Expedition Distance */}
        <div style={{
          background: "rgba(10, 26, 16, 0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(74, 222, 128, 0.3)",
          borderRadius: 16,
          padding: "10px 18px",
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        }}>
          <Compass size={20} color="#4ade80" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#86efac", letterSpacing: 1 }}>EXPEDITION</span>
          <span style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
            {distanceMeters.toLocaleString()}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#86efac" }}>METERS</span>
        </div>

        {/* Chunk Streaming Telemetry */}
        <div style={{
          background: "rgba(10, 26, 16, 0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 14,
          padding: "10px 18px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8 }}>GRID SECTOR</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>
              [{chunkCoords[0]}, {chunkCoords[1]}]
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 4 }}>
              <Layers size={13} />
              <span>ACTIVE CHUNKS</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>
              {activeChunkCount} (STREAMING)
            </span>
          </div>
        </div>

        {/* Exploration Status Badge */}
        <div style={{
          background: "rgba(10, 26, 16, 0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 12,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 700,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: onlineStatus === "connected" ? (telemetry.currentZone === "beach" ? "#38bdf8" : "#4ade80") : "#f59e0b",
          }} />
          <span style={{ color: telemetry.currentZone === "beach" ? "#38bdf8" : "#4ade80" }}>
            {telemetry.currentZone === "beach" ? "PIRATE COVE & BEACH" : "JUNGLE EXPLORER"}
          </span>
        </div>
      </div>

      {/* 2. Top Center: Crosshair / Pointer Lock Prompt */}
      <div style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(10, 26, 16, 0.7)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 20,
        padding: "6px 16px",
        fontSize: 12,
        fontWeight: 600,
        color: "#cbd5e1",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <MousePointer size={14} color="#38bdf8" />
        <span>Click canvas to lock mouse • Move mouse to look around</span>
      </div>

      {/* Center Reticle */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        boxShadow: "0 0 8px rgba(255, 255, 255, 0.6)",
      }} />

      {/* 3. Bottom Right: Speed & Stamina Meter */}
      <div style={{
        position: "absolute",
        bottom: 25,
        right: 25,
        background: "rgba(10, 26, 16, 0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(74, 222, 128, 0.25)",
        borderRadius: 24,
        padding: "18px 24px",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 200,
        pointerEvents: "auto",
      }}>
        {/* Speed Readout */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <span style={{
              fontSize: 42,
              fontWeight: 900,
              letterSpacing: -1,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: "#ffffff"
            }}>
              {speedKmh}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#94a3b8", marginLeft: 6 }}>KM/H</span>
          </div>

          {isSprinting && (
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#f59e0b",
              letterSpacing: 1,
              animation: "pulse 1s infinite",
            }}>
              SPRINTING
            </span>
          )}
        </div>

        {/* Stamina Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} color="#f59e0b" />
              <span>STAMINA</span>
            </span>
            <span style={{ color: staminaRatio > 0.25 ? "#4ade80" : "#ef4444" }}>
              {stamina}%
            </span>
          </div>
          <div style={{
            width: "100%",
            height: 8,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 4,
            overflow: "hidden",
          }}>
            <div style={{
              width: `${staminaRatio * 100}%`,
              height: "100%",
              background: staminaRatio > 0.35
                ? "linear-gradient(90deg, #4ade80, #00f0ff)"
                : "linear-gradient(90deg, #f59e0b, #ef4444)",
              transition: "width 0.08s ease-out",
            }} />
          </div>
        </div>
      </div>

      {/* 4. Bottom Left: Actions Toolbar & Controls Legend */}
      <div style={{
        position: "absolute",
        bottom: 25,
        left: 25,
        display: "flex",
        alignItems: "center",
        gap: 10,
        pointerEvents: "auto",
      }}>
        <button
          onClick={onResetCharacter}
          title="Respawn on Road (R)"
          style={{
            background: "rgba(10, 26, 16, 0.8)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 14,
            padding: "12px 14px",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={onToggleMute}
          title="Toggle Audio"
          style={{
            background: "rgba(10, 26, 16, 0.8)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 14,
            padding: "12px 14px",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          {isMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} color="#4ade80" />}
        </button>

        {onChangeCharacter && (
          <button
            onClick={onChangeCharacter}
            title="Change Adventurer Class"
            style={{
              background: "rgba(10, 26, 16, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(74, 222, 128, 0.35)",
              borderRadius: 14,
              padding: "12px 14px",
              color: "#4ade80",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <UserCheck size={18} />
          </button>
        )}

        {onToggleTravel && (
          <button
            onClick={onToggleTravel}
            title={telemetry.currentZone === "beach" ? "Return to Jungle Village" : "Travel to Pirate Beach"}
            style={{
              background: telemetry.currentZone === "beach"
                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.88), rgba(16, 185, 129, 0.92))"
                : "linear-gradient(135deg, rgba(2, 132, 199, 0.88), rgba(14, 165, 233, 0.92))",
              backdropFilter: "blur(10px)",
              border: telemetry.currentZone === "beach"
                ? "1px solid rgba(74, 222, 128, 0.6)"
                : "1px solid rgba(56, 189, 248, 0.6)",
              borderRadius: 14,
              padding: "10px 18px",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.6,
              boxShadow: telemetry.currentZone === "beach"
                ? "0 4px 20px rgba(34, 197, 94, 0.45)"
                : "0 4px 20px rgba(2, 132, 199, 0.45)",
            }}
          >
            <span style={{ fontSize: 16 }}>{telemetry.currentZone === "beach" ? "🌲" : "🏖️"}</span>
            <span>{telemetry.currentZone === "beach" ? "RETURN TO JUNGLE" : "VISIT PIRATE BEACH"}</span>
          </button>
        )}

        <div style={{
          background: "rgba(10, 26, 16, 0.7)",
          backdropFilter: "blur(10px)",
          borderRadius: 14,
          padding: "10px 16px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          fontSize: 12,
          fontWeight: 600,
          color: "#cbd5e1",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span><b style={{ color: "#4ade80" }}>WASD</b> Move</span>
          <span>•</span>
          <span><b style={{ color: "#f59e0b" }}>SHIFT</b> Sprint</span>
          <span>•</span>
          <span><b style={{ color: "#38bdf8" }}>SPACE</b> Jump</span>
          <span>•</span>
          <span><b style={{ color: "#a78bfa" }}>R</b> Respawn</span>
        </div>
      </div>
    </div>
  );
};
