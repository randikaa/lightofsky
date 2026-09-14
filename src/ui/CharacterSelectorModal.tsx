import React, { useState } from "react";
import {
  CHARACTER_CLASSES,
  type CharacterClass,
  type CharacterClassInfo,
} from "../character/AdventurerModelFactory";
import { Shield, Zap, Wind, User, Sparkles, X, Check } from "lucide-react";

interface CharacterSelectorModalProps {
  initialClass?: CharacterClass;
  initialPlayerName?: string;
  isInitialSelection?: boolean;
  onConfirm: (characterClass: CharacterClass, playerName: string) => void;
  onClose?: () => void;
}

export const CharacterSelectorModal: React.FC<CharacterSelectorModalProps> = ({
  initialClass = "knight",
  initialPlayerName = "Explorer",
  isInitialSelection = true,
  onConfirm,
  onClose,
}) => {
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(initialClass);
  const [playerName, setPlayerName] = useState<string>(initialPlayerName);

  const classes = Object.values(CHARACTER_CLASSES);
  const activeClassInfo = CHARACTER_CLASSES[selectedClass];

  const handleStart = () => {
    const finalName = playerName.trim() || `Explorer_${Math.floor(1000 + Math.random() * 9000)}`;
    onConfirm(selectedClass, finalName);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 150,
        padding: 20,
        userSelect: "none",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(10, 26, 16, 0.95))",
          border: "1px solid rgba(74, 222, 128, 0.35)",
          borderRadius: 24,
          padding: "32px 36px",
          maxWidth: 820,
          width: "100%",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(74, 222, 128, 0.15)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* 1. Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Sparkles size={20} color="#4ade80" />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#86efac", letterSpacing: 1.5 }}>
                JUNGLE EXPEDITION GUILD
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
              CHOOSE YOUR ADVENTURER
            </h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
              Select a specialized explorer class to brave the procedural ruins and wild frontiers.
            </p>
          </div>

          {!isInitialSelection && onClose && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 12,
                padding: 8,
                color: "#94a3b8",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 2. Player Name Input */}
        <div
          style={{
            background: "rgba(2, 6, 23, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 16,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <User size={20} color="#38bdf8" />
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.5, marginBottom: 2 }}>
              EXPLORER CALLSIGN / NAME
            </label>
            <input
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your explorer name..."
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 700,
              }}
            />
          </div>
        </div>

        {/* 3. Class Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {classes.map((c: CharacterClassInfo) => {
            const isSelected = selectedClass === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.9))`
                    : "rgba(15, 23, 42, 0.5)",
                  border: isSelected ? `2px solid ${c.badgeColor}` : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 18,
                  padding: "16px 18px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "all 0.15s ease-out",
                  boxShadow: isSelected ? `0 8px 24px ${c.accentColor}33` : "none",
                  transform: isSelected ? "translateY(-2px)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: c.badgeColor,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    {c.title}
                  </span>
                  {isSelected && (
                    <div
                      style={{
                        background: c.badgeColor,
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={12} color="#0f172a" strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>
                  {c.name}
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, minHeight: 32 }}>
                  {c.description}
                </div>

                {/* Stat meters */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <StatBar label="Stamina" value={c.stats.stamina} icon={<Zap size={11} color="#f59e0b" />} />
                  <StatBar label="Speed" value={c.stats.speed} icon={<Wind size={11} color="#38bdf8" />} />
                  <StatBar label="Agility" value={c.stats.agility} icon={<Shield size={11} color="#4ade80" />} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Action Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Playing as <strong style={{ color: activeClassInfo.badgeColor }}>{activeClassInfo.title} ({activeClassInfo.name})</strong>
          </div>

          <button
            onClick={handleStart}
            style={{
              background: `linear-gradient(135deg, ${activeClassInfo.badgeColor}, ${activeClassInfo.accentColor})`,
              color: "#0f172a",
              border: "none",
              borderRadius: 16,
              padding: "14px 36px",
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: 1,
              cursor: "pointer",
              boxShadow: `0 8px 24px ${activeClassInfo.accentColor}66`,
              transition: "transform 0.1s ease, filter 0.1s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            {isInitialSelection ? "ENTER EXPEDITION" : "SWITCH CLASS"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {icon}
        {label}
      </span>
      <span>{value}%</span>
    </div>
    <div style={{ height: 4, background: "rgba(255, 255, 255, 0.1)", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: "#4ade80",
          borderRadius: 2,
        }}
      />
    </div>
  </div>
);
