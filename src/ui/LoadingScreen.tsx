import React from "react";

interface LoadingScreenProps {
  progress: number;
  statusText: string;
  isReady: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  statusText,
  isReady,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#090d16",
        backgroundImage: "radial-gradient(ellipse at center, #1e293b 0%, #090d16 80%)",
        color: "#f8fafc",
        fontFamily: "'Cinzel', 'Trebuchet MS', Georgia, serif",
        transition: "opacity 0.6s ease-out, visibility 0.6s ease-out",
        opacity: isReady ? 0 : 1,
        pointerEvents: isReady ? "none" : "all",
        visibility: isReady ? "hidden" : "visible",
      }}
    >
      {/* Emblem */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          boxShadow: "0 0 35px rgba(245, 158, 11, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "34px",
          marginBottom: "20px",
          border: "2px solid #fef08a",
        }}
      >
        ⚔️
      </div>

      {/* Main Title */}
      <h1
        style={{
          margin: 0,
          fontSize: "28px",
          letterSpacing: "4px",
          fontWeight: 800,
          textTransform: "uppercase",
          background: "linear-gradient(to right, #fef08a, #f59e0b, #fbbf24)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 2px 20px rgba(245, 158, 11, 0.3)",
        }}
      >
        Light of Sky
      </h1>

      <p
        style={{
          marginTop: "6px",
          marginBottom: "32px",
          fontSize: "14px",
          letterSpacing: "2px",
          color: "#94a3b8",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textTransform: "uppercase",
        }}
      >
        Jungle Frontier & Medieval Settlement
      </p>

      {/* Progress Bar Container */}
      <div
        style={{
          width: "min(460px, 85vw)",
          background: "rgba(15, 23, 42, 0.8)",
          padding: "4px",
          borderRadius: "9999px",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), inset 0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            height: "12px",
            width: `${Math.max(4, Math.min(100, progress))}%`,
            borderRadius: "9999px",
            background: "linear-gradient(90deg, #10b981, #059669 40%, #f59e0b 85%, #fbbf24 100%)",
            boxShadow: "0 0 12px rgba(16, 185, 129, 0.6)",
            transition: "width 0.25s ease-out",
          }}
        />
      </div>

      {/* Progress Counter & Status Text */}
      <div
        style={{
          marginTop: "16px",
          width: "min(460px, 85vw)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13px",
        }}
      >
        <span
          style={{
            color: "#cbd5e1",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          {statusText || "Preparing expedition..."}
        </span>
        <span
          style={{
            fontWeight: 700,
            color: "#f59e0b",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(progress)}%
        </span>
      </div>

      {/* Exploratory Tip */}
      <div
        style={{
          position: "absolute",
          bottom: "36px",
          fontSize: "12px",
          color: "#64748b",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
          maxWidth: "480px",
          padding: "0 20px",
        }}
      >
        <span style={{ color: "#f59e0b", fontWeight: 600 }}>Tip: </span>
        Press [Shift] to sprint, [Space] to jump, and click & drag to rotate the camera.
      </div>
    </div>
  );
};
