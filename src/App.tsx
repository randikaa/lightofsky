import { useEffect, useRef, useState } from "react";
import { Game, type GameTelemetry } from "./core/Game";
import { HUD } from "./ui/HUD";
import { ChatUI, type ChatItem } from "./ui/ChatUI";
import { CharacterSelectorModal } from "./ui/CharacterSelectorModal";
import type { CharacterClass } from "./character/AdventurerModelFactory";

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [selectedClass, setSelectedClass] = useState<CharacterClass>("knight");
  const [playerName, setPlayerName] = useState<string>(
    () => `Explorer_${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [hasStarted, setHasStarted] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  const [telemetry, setTelemetry] = useState<GameTelemetry | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "init-sys",
      sender: "EXPEDITION",
      text: "Welcome to Jungle Explorer. Choose your adventurer to begin.",
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);

  useEffect(() => {
    if (!containerRef.current || !hasStarted) return;

    let isMounted = true;

    const game = new Game(
      containerRef.current,
      {
        onTelemetryUpdate: (t) => {
          if (isMounted) setTelemetry(t);
        },
        onChatMessage: (msg) => {
          if (isMounted) {
            setMessages((prev) => [
              ...prev.slice(-50),
              {
                id: `${msg.timestamp}-${Math.random()}`,
                sender: msg.senderName,
                text: msg.text,
                timestamp: msg.timestamp,
                isLocal: msg.isLocal,
              },
            ]);
          }
        },
        onSystemMessage: (msg) => {
          if (isMounted) {
            setMessages((prev) => [
              ...prev.slice(-50),
              {
                id: `${msg.timestamp}-${Math.random()}`,
                sender: "SYSTEM",
                text: msg.text,
                timestamp: msg.timestamp,
                isSystem: true,
              },
            ]);
          }
        },
      },
      selectedClass,
      playerName
    );

    gameRef.current = game;

    return () => {
      isMounted = false;
      game.destroy();
      gameRef.current = null;
    };
  }, [hasStarted]);

  const handleStartGame = (chosenClass: CharacterClass, chosenName: string) => {
    setSelectedClass(chosenClass);
    setPlayerName(chosenName);
    setHasStarted(true);
    setShowClassModal(false);
  };

  const handleSwitchClass = (newClass: CharacterClass) => {
    setSelectedClass(newClass);
    gameRef.current?.switchCharacterClass(newClass);
    setShowClassModal(false);
  };

  const handleToggleMute = () => {
    if (gameRef.current) {
      const muted = gameRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleResetCharacter = () => {
    gameRef.current?.resetCharacter();
  };

  const handleSendMessage = (text: string) => {
    gameRef.current?.sendChatMessage(text);
  };

  const handleTypingChange = (isTyping: boolean) => {
    gameRef.current?.setTyping(isTyping);
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f172a" }}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Opening Character Selection Modal */}
      {!hasStarted && (
        <CharacterSelectorModal
          initialClass={selectedClass}
          initialPlayerName={playerName}
          isInitialSelection={true}
          onConfirm={handleStartGame}
        />
      )}

      {/* In-Game Character Switching Modal */}
      {hasStarted && showClassModal && (
        <CharacterSelectorModal
          initialClass={selectedClass}
          initialPlayerName={playerName}
          isInitialSelection={false}
          onConfirm={(cls) => handleSwitchClass(cls)}
          onClose={() => setShowClassModal(false)}
        />
      )}

      {/* Real-time Explorer HUD Dashboard */}
      {hasStarted && telemetry && (
        <HUD
          telemetry={telemetry}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onResetCharacter={handleResetCharacter}
          onChangeCharacter={() => setShowClassModal(true)}
        />
      )}

      {/* In-Game Multiplayer Radio & Chat Panel */}
      {hasStarted && (
        <ChatUI
          messages={messages}
          playerCount={telemetry?.playerCount ?? 1}
          onSendMessage={handleSendMessage}
          onTypingChange={handleTypingChange}
        />
      )}
    </div>
  );
}

export default App;
