import { useEffect, useRef, useState } from "react";
import { Game, type GameTelemetry } from "./core/Game";
import { HUD } from "./ui/HUD";
import { ChatUI, type ChatItem } from "./ui/ChatUI";
import { CharacterSelectorModal } from "./ui/CharacterSelectorModal";
import { LoadingScreen } from "./ui/LoadingScreen";
import { AdventurerModelFactory, type CharacterClass } from "./character/AdventurerModelFactory";
import { ForestModelFactory } from "./world/ForestModelFactory";
import { VillageModelFactory } from "./world/VillageModelFactory";

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [selectedClass, setSelectedClass] = useState<CharacterClass>("knight");
  const [playerName, setPlayerName] = useState<string>(
    () => `Explorer_${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [hasStarted, setHasStarted] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  // Asset download & loading screen states
  const [assetsDownloaded, setAssetsDownloaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Connecting to asset repository...");
  const [phaseTitle, setPhaseTitle] = useState("DOWNLOADING GAME ASSETS");
  const [isGameReady, setIsGameReady] = useState(false);

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

  // Download all 3D game assets on initial app mount with real-time progress reporting
  useEffect(() => {
    const advFactory = AdventurerModelFactory.getInstance();
    const forestFactory = ForestModelFactory.getInstance();
    const villageFactory = VillageModelFactory.getInstance();

    let advLoaded = advFactory.isLoaded ? 8 : 0;
    let forestLoaded = forestFactory.isLoaded ? 21 : 0;
    let villageLoaded = villageFactory.isLoaded ? 42 : 0;
    const totalAssets = 71;

    const updateProgress = (detail: string) => {
      const sum = advLoaded + forestLoaded + villageLoaded;
      const pct = Math.min(100, Math.round((sum / totalAssets) * 100));
      setLoadingProgress(pct);
      setLoadingStatus(detail);
    };

    advFactory.onProgress = (l, t) => {
      advLoaded = l;
      updateProgress(`Downloading Adventurer Models (${l}/${t})...`);
    };
    forestFactory.onProgress = (l, t) => {
      forestLoaded = l;
      updateProgress(`Downloading Forest & Nature Assets (${l}/${t})...`);
    };
    villageFactory.onProgress = (l, t) => {
      villageLoaded = l;
      updateProgress(`Downloading Medieval Village Architecture (${l}/${t})...`);
    };

    updateProgress("Connecting to asset repository...");

    Promise.all([
      advFactory.loadAll(),
      forestFactory.loadAll(),
      villageFactory.loadAll(),
    ])
      .then(() => {
        setLoadingProgress(100);
        setLoadingStatus("All assets downloaded successfully!");
        setTimeout(() => {
          setAssetsDownloaded(true);
        }, 500);
      })
      .catch((err) => {
        console.error("Asset download error:", err);
        setAssetsDownloaded(true);
      });
  }, []);

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
        onLoadingProgress: (pct, status) => {
          if (isMounted) {
            setLoadingProgress(pct);
            setLoadingStatus(status);
          }
        },
        onGameReady: () => {
          if (isMounted) {
            setIsGameReady(true);
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
    setPhaseTitle("ENTERING THE REALM");
    setIsGameReady(false);
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
      {!hasStarted && assetsDownloaded && (
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
      {hasStarted && telemetry && isGameReady && (
        <HUD
          telemetry={telemetry}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onResetCharacter={handleResetCharacter}
          onChangeCharacter={() => setShowClassModal(true)}
        />
      )}

      {/* In-Game Multiplayer Radio & Chat Panel */}
      {hasStarted && isGameReady && (
        <ChatUI
          messages={messages}
          playerCount={telemetry?.playerCount ?? 1}
          onSendMessage={handleSendMessage}
          onTypingChange={handleTypingChange}
        />
      )}

      {/* Loading Progress Screen: Active during initial asset download AND during realm entry */}
      <LoadingScreen
        progress={loadingProgress}
        statusText={loadingStatus}
        phaseTitle={phaseTitle}
        isReady={assetsDownloaded && (!hasStarted || isGameReady)}
      />
    </div>
  );
}

export default App;
