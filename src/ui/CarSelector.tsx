import React from "react";
import type { CarStyle } from "../assets/CarModelFactory";
import { X, Check } from "lucide-react";

interface CarSelectorProps {
  currentStyle: CarStyle;
  currentColor: string;
  onSelect: (style: CarStyle, color: string) => void;
  onClose: () => void;
}

const CAR_OPTIONS: Array<{ id: CarStyle; name: string; desc: string }> = [
  { id: "supercar", name: "Apex GT (Supercar)", desc: "High downforce, top speed and tight cornering." },
  { id: "muscle", name: "V8 Thunder (Muscle)", desc: "Raw torque, aggressive stance and slide potential." },
  { id: "coupe", name: "R-Sport (Coupe)", desc: "Agile balanced handling with responsive steering." },
  { id: "formula", name: "Formula Aero (F1)", desc: "Ultra-low weight, extreme grip and open cockpit." },
];

const COLOR_OPTIONS = [
  { hex: "#e63946", name: "Crimson Red" },
  { hex: "#3a86ff", name: "Electric Blue" },
  { hex: "#10b981", name: "Emerald Racing" },
  { hex: "#ffb703", name: "Cyberpunk Gold" },
  { hex: "#8338ec", name: "Neon Violet" },
  { hex: "#1e293b", name: "Midnight Obsidian" },
];

export const CarSelector: React.FC<CarSelectorProps> = ({
  currentStyle,
  currentColor,
  onSelect,
  onClose,
}) => {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: 20,
    }}>
      <div style={{
        backgroundColor: "#0f172a",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: 24,
        padding: 30,
        maxWidth: 580,
        width: "100%",
        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
        color: "#ffffff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 0.5 }}>GARAGE & VEHICLE CUSTOMIZER</h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Choose your chassis profile and livery color</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 12,
              padding: 8,
              cursor: "pointer",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Style Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            Select Chassis
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            {CAR_OPTIONS.map((car) => {
              const active = car.id === currentStyle;
              return (
                <div
                  key={car.id}
                  onClick={() => onSelect(car.id, currentColor)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: active ? "2px solid #00f0ff" : "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: active ? "rgba(0, 240, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: active ? "#00f0ff" : "#ffffff" }}>
                    {car.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.3 }}>
                    {car.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color Palette */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            Select Livery Color
          </label>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            {COLOR_OPTIONS.map((c) => {
              const active = c.hex === currentColor;
              return (
                <div
                  key={c.hex}
                  onClick={() => onSelect(currentStyle, c.hex)}
                  title={c.name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: c.hex,
                    border: active ? "3px solid #ffffff" : "2px solid transparent",
                    boxShadow: active ? "0 0 16px " + c.hex : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.15s ease",
                    transform: active ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {active && <Check size={20} color="#ffffff" strokeWidth={3} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg, #00f0ff 0%, #3a86ff 100%)",
            color: "#0f172a",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 0.5,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 240, 255, 0.35)",
          }}
        >
          APPLY & DRIVE
        </button>
      </div>
    </div>
  );
};
