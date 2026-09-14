import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";

export interface ChatItem {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isLocal?: boolean;
}

interface ChatUIProps {
  messages: ChatItem[];
  playerCount?: number;
  onSendMessage: (text: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}

export const ChatUI: React.FC<ChatUIProps> = ({
  messages,
  playerCount = 1,
  onSendMessage,
  onTypingChange,
}) => {
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isCollapsed]);

  // Global <kbd>Enter</kbd> key listener to focus chat input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!isFocused) {
          e.preventDefault();
          setIsCollapsed(false);
          inputRef.current?.focus();
        }
      } else if (e.key === "Escape" && isFocused) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    onTypingChange(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onTypingChange(false);
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setInputText("");
    }
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation so typing WASD never triggers movement
    e.stopPropagation();

    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 20,
        width: 360,
        background: "rgba(10, 26, 16, 0.88)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(74, 222, 128, 0.3)",
        borderRadius: 18,
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.65)",
        color: "#ffffff",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 50,
        pointerEvents: "auto",
        transition: "height 0.2s ease, opacity 0.2s ease",
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(2, 6, 23, 0.6)",
          borderBottom: isCollapsed ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setIsCollapsed((prev) => !prev)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={14} color="#4ade80" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#86efac", letterSpacing: 0.8 }}>
            EXPEDITION RADIO
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>
            ({playerCount} online • {messages.length} msg{messages.length === 1 ? "" : "s"})
          </span>
        </div>

        <button
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 2,
          }}
          title={isCollapsed ? "Expand Chat" : "Collapse Chat"}
        >
          {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* 2. Message History (Scrollable) */}
      {!isCollapsed && (
        <>
          <div
            ref={scrollRef}
            style={{
              maxHeight: 180,
              minHeight: 90,
              overflowY: "auto",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 11, textAlign: "center", padding: "10px 0" }}>
                No messages yet. Press [Enter] to chat.
              </div>
            ) : (
              messages.map((m) => {
                if (m.isSystem) {
                  return (
                    <div
                      key={m.id}
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        fontStyle: "italic",
                        display: "flex",
                        gap: 6,
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 9, color: "#64748b" }}>{formatTime(m.timestamp)}</span>
                      <span>⚡ {m.text}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      background: m.isLocal ? "rgba(74, 222, 128, 0.08)" : "rgba(255, 255, 255, 0.03)",
                      padding: "4px 8px",
                      borderRadius: 8,
                      borderLeft: m.isLocal ? "2px solid #4ade80" : "2px solid #38bdf8",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 11, color: m.isLocal ? "#4ade80" : "#38bdf8" }}>
                        {m.sender}
                      </span>
                      <span style={{ fontSize: 9, color: "#64748b" }}>{formatTime(m.timestamp)}</span>
                    </div>
                    <span style={{ color: "#f8fafc", wordBreak: "break-word", lineHeight: 1.3 }}>
                      {m.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Input Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: "rgba(2, 6, 23, 0.8)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              maxLength={140}
              placeholder={isFocused ? "Type message... [Enter to send, Esc to cancel]" : "Press [Enter] to chat..."}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.06)",
                border: isFocused ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "6px 10px",
                color: "#ffffff",
                fontSize: 12,
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
            />

            <button
              onClick={handleSend}
              title="Send message"
              disabled={!inputText.trim()}
              style={{
                background: inputText.trim() ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                color: inputText.trim() ? "#ffffff" : "#64748b",
                cursor: inputText.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
