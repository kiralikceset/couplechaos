/**
 * DESIGN: Electric Pulse - Main Game Controller
 * Professional flow: Splash → Onboarding → Login → Premium → Home → Connect/Game
 * Features: Multiple game modes, Home screen hub, Login, Premium paywall
 * Proper back navigation, device back button support, no amateur UX
 */

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import socket from "@/lib/socket";
import {
  LoginScreen,
  HomeScreen,
  ProfileScreen,
  GameScreen,
  ResultScreen,
  ShareScreen,
  loadLoginScreen,
  loadHomeScreen,
  loadProfileScreen,
  loadGameScreen,
  loadResultScreen,
  loadShareScreen,
} from "@/lib/preparedScreens";
import { getProfile, incrementGamesPlayed } from "@/lib/gameData";
import {
  requestNotificationPermission,
  startPartnerWaitingNotifications,
  stopPartnerWaitingNotifications,
} from "@/lib/notifications";
import {
  playWordReveal,
  playPartnerJoined,
  playError,
  playSuccess,
  playConfetti,
} from "@/lib/sounds";
import {
  recordGamePlayed,
  checkNewAchievements,
  incrementStat,
  addCategoryPlayed,
  completeDailyChallenge,
  setDailyChallenge,
  updateCompatibility,
} from "@/lib/retention";
import { canPlayFree, incrementGamesToday, isBillingEnabled } from "@/lib/premium";
import { getLocale } from "@/lib/i18n";
import { findWordEmoji, getDailyWord } from "@/lib/wordPool";
import OnboardingScreen from "@/components/screens/OnboardingScreen";
import ConnectScreen from "@/components/screens/ConnectScreen";
import WaitingScreen from "@/components/screens/WaitingScreen";
import AchievementPopup from "@/components/game/AchievementPopup";
import CoDrawScreen from "@/components/screens/CoDrawScreen";
import type { Achievement } from "@/lib/retention";
import { createThumbnail } from "@/lib/imageUtils";
import { toast } from "sonner";

// These screens are packaged in the APK but parsed only when needed.
import HowItWorksScreen from "@/components/screens/HowItWorksScreen";
const CategoryScreen = lazy(
  () => import("@/components/screens/CategoryScreen")
);
const PremiumScreen = lazy(() => import("@/components/screens/PremiumScreen"));
const AchievementsScreen = lazy(
  () => import("@/components/screens/AchievementsScreen")
);

export type GamePhase =
  | "describing"
  | "drawing"
  | "watch_drawing"
  | "generating"
  | "co_drawing"
  | null;
export type GameMode = "classic" | "co-draw";
export type ScreenState =
  | "onboarding"
  | "how-it-works"
  | "login"
  | "home"
  | "connect"
  | "waiting"
  | "game"
  | "result"
  | "share"
  | "profile"
  | "category"
  | "premium"
  | "achievements";

export interface GameResult {
  word: string;
  imageData: string;
  aiComment: string;
  aiScore?: number;
  outcome?: "win" | "loss" | "draw";
  opponentScore?: number;
  mode?: GameMode;
  judgedBy?: "ai" | "offline";
  wordEmoji?: string;
  aiGuess?: string;
}

export interface GameAppStart {
  initialScreen?: ScreenState;
  initialHistory?: ScreenState[];
  pushEntry?: boolean;
}

export default function GameApp({
  initialScreen,
  initialHistory = [],
  pushEntry = false,
}: GameAppStart) {
  useLayoutEffect(() => {
    if (pushEntry)
      window.history.pushState({ coupleChaos: true }, "", window.location.href);
  }, []);
  // Determine initial screen based on whether user has completed onboarding
  const getInitialScreen = (): ScreenState => {
    let hasOnboarded: string | null = null;
    let isLoggedIn: string | null = null;
    try {
      hasOnboarded = localStorage.getItem("cc_onboarded");
      isLoggedIn = localStorage.getItem("cc_logged_in");
    } catch {
      // Continue with onboarding if persistent storage is temporarily blocked.
    }
    if (hasOnboarded && isLoggedIn) return "home";
    if (hasOnboarded) return "login";
    return "onboarding";
  };

  const [screen, setScreen] = useState<ScreenState>(
    () => initialScreen ?? getInitialScreen()
  );
  const [history, setHistory] = useState<ScreenState[]>(initialHistory);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState(10);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | undefined>();
  const [roundNumber, setRoundNumber] = useState(1);
  const [receivedHints, setReceivedHints] = useState<
    Array<{ id: string; text: string; fromSelf?: boolean }>
  >([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [seat, setSeat] = useState(0);
  const [transport, setTransport] = useState(socket.transport);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    "daily"
  );
  const [pendingAchievement, setPendingAchievement] =
    useState<Achievement | null>(null);
  const roundStartedAtRef = useRef(Date.now());
  const suppressNextPopRef = useRef(false);

  useEffect(() => {
    if (screen === "premium" && !isBillingEnabled()) {
      setHistory([]);
      setScreen("home");
    }
  }, [screen]);

  // Prepare only the next likely screen, after the current screen is visible.
  useEffect(() => {
    const load =
      screen === "how-it-works"
        ? loadLoginScreen
        : screen === "login"
          ? loadHomeScreen
          : screen === "onboarding"
            ? loadProfileScreen
            : screen === "connect" || screen === "waiting"
              ? loadGameScreen
              : screen === "game"
                ? loadResultScreen
                : screen === "result"
                  ? loadShareScreen
                  : null;
    if (!load) return;
    const timer = window.setTimeout(() => {
      void load().catch(() => {});
    }, 300);
    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    const needsConnection =
      ["home", "connect", "waiting", "game", "result"].includes(screen) ||
      roomCode !== null;
    const visible = () =>
      socket.setActive(
        needsConnection && document.visibilityState !== "hidden"
      );
    const online = () => {
      if (needsConnection) socket.connect();
    };
    visible();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", online);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", online);
    };
  }, [screen, roomCode]);

  // Navigate forward - push current screen to history
  const navigate = useCallback(
    (to: ScreenState) => {
      window.history.pushState({ coupleChaos: true }, "", window.location.href);
      setHistory(prev => [...prev, screen]);
      setScreen(to);
    },
    [screen]
  );

  const popScreen = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) {
        if (screen === "home") return [];
        setScreen("home");
        return [];
      }
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setScreen(last);
      return newHistory;
    });
  }, [screen]);

  // UI back buttons update both the app stack and the WebView history stack.
  const goBack = useCallback(() => {
    suppressNextPopRef.current = true;
    window.history.back();
    popScreen();
  }, [popScreen]);

  // Handle browser/device back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false;
        return;
      }

      // During game or waiting, don't allow back (would break game flow)
      if (screen === "game" || screen === "waiting") {
        window.history.pushState(
          { coupleChaos: true },
          "",
          window.location.href
        );
        return;
      }

      // At root screens Android handles Back normally and can close the app.
      if (screen === "home" || screen === "onboarding" || screen === "login")
        return;
      popScreen();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [screen, popScreen]);

  // Game transport status
  useEffect(() => {
    const onTransportChanged = ({
      transport: nextTransport,
    }: {
      transport: typeof socket.transport;
    }) => {
      setTransport(nextTransport);
    };
    socket.on("transport_changed", onTransportChanged);
    return () => {
      socket.off("transport_changed", onTransportChanged);
    };
  }, []);

  // Game transport events
  useEffect(() => {
    const onRoomCreated = ({
      code,
      role: nextRole,
      mode,
    }: {
      code: string;
      role: string;
      mode?: GameMode;
    }) => {
      if (mode) setGameMode(mode);
      setRoomCode(code);
      setRole(nextRole);
      setHistory(["home", "connect"]);
      setScreen("waiting");
    };
    const onRoomJoined = ({
      code,
      role: nextRole,
      mode,
    }: {
      code: string;
      role: string;
      mode?: GameMode;
    }) => {
      if (mode) setGameMode(mode);
      setRoomCode(code);
      setRole(nextRole);
      setHistory(["home", "connect"]);
      setScreen("waiting");
    };
    const onPlayerJoined = (data: { partnerName?: string; partnerAvatar?: string }) => {
      if (data?.partnerName) setPartnerName(data.partnerName);
      if (data?.partnerAvatar) setPartnerAvatar(data.partnerAvatar);
      playPartnerJoined();
      stopPartnerWaitingNotifications();
    };
    const onGameStarted = () => {
      setReceivedHints([]);
      setResult(null);
      setWord(null);
      roundStartedAtRef.current = Date.now();
      setGamePhase(null);
      setHistory(["home"]);
      setScreen("game");
      playWordReveal();
      stopPartnerWaitingNotifications();
    };
    const onYourRole = ({
      role: nextRole,
      word: nextWord,
      timeLimit: nextLimit,
      localEndsAt,
      round,
      mode,
      seat: nextSeat,
      partnerName: nextPartner,
      partnerAvatar: nextPartnerAvatar,
    }: {
      role: string;
      word?: string | null;
      timeLimit?: number;
      localEndsAt?: number;
      round?: number;
      mode?: GameMode;
      seat?: number;
      partnerName?: string;
      partnerAvatar?: string;
    }) => {
      if (mode === "co-draw") {
        setGameMode("co-draw");
        setRole(nextRole);
        setSeat(nextSeat || 0);
        if (nextPartner) setPartnerName(nextPartner);
        if (nextPartnerAvatar) setPartnerAvatar(nextPartnerAvatar);
        setRoundNumber(round || 1);
        setWord(nextWord || null);
        setTimeLimit(nextLimit || 20);
        setPhaseEndsAt(localEndsAt);
        setGamePhase("co_drawing");
        return;
      }
      if (mode === "classic") setGameMode("classic");
      setRole(nextRole);
      setRoundNumber(round || 1);
      setWord(nextWord || null);
      setTimeLimit(nextLimit || 10);
      setPhaseEndsAt(localEndsAt);
      setGamePhase(nextRole === "describer" ? "describing" : "watch_drawing");
    };
    const onStartDrawing = ({
      word: nextWord,
      timeLimit: nextLimit,
      localEndsAt,
    }: {
      word?: string;
      timeLimit?: number;
      localEndsAt?: number;
    }) => {
      if (nextWord) setWord(nextWord);
      setTimeLimit(nextLimit || 10);
      setPhaseEndsAt(localEndsAt);
      setGamePhase("drawing");
    };
    const onWatchDrawing = (data?: { localEndsAt?: number; timeLimit?: number }) => {
      if (data?.timeLimit) setTimeLimit(data.timeLimit);
      setPhaseEndsAt(data?.localEndsAt);
      setGamePhase("watch_drawing");
    };
    const onGenerating = () => setGamePhase("generating");
    const onShowResult = ({
      word: resultWord,
      imageData,
      aiComment,
      aiScore,
      outcome,
      opponentScore,
      mode: resultMode,
      judgedBy,
      wordEmoji,
      aiGuess,
    }: GameResult) => {
      const numericScore = Number.isFinite(aiScore)
        ? Math.max(1, Math.min(100, Math.round(aiScore!)))
        : 3;
      const nextResult = {
        word: resultWord || word || "Çizim",
        imageData: imageData || "",
        aiComment: aiComment || "Çizim tamamlandı.",
        aiScore: numericScore,
        outcome,
        opponentScore: Number.isFinite(opponentScore)
          ? opponentScore
          : undefined,
        mode: resultMode,
        judgedBy,
        wordEmoji: wordEmoji || findWordEmoji(resultWord || word || ""),
        aiGuess,
      };
      setResult(nextResult);
      incrementGamesPlayed();
      incrementGamesToday();
      incrementStat("totalGames");
      if (outcome === "win") incrementStat("gamesWon");
      if (numericScore === 100) incrementStat("perfectGuesses");
      const elapsedSeconds = Math.max(
        1,
        Math.min(
          300,
          Math.round((Date.now() - roundStartedAtRef.current) / 1000)
        )
      );
      updateCompatibility(
        numericScore >= 60,
        elapsedSeconds,
        numericScore <= 20
      );
      recordGamePlayed();
      if (selectedCategory) addCategoryPlayed(selectedCategory);
      if (selectedCategory === "daily_challenge") completeDailyChallenge();
      void saveGameHistory(nextResult);

      const newAchievements = checkNewAchievements();
      if (newAchievements.length > 0) {
        window.setTimeout(
          () => setPendingAchievement(newAchievements[0]),
          2000
        );
      }

      setHistory(["home"]);
      setScreen("result");
      playConfetti();
    };
    const onPartnerDisconnected = () => {
      resetGame();
      setHistory(["home"]);
      setScreen("connect");
      playError();
    };
    const onJoinError = ({ message }: { message?: string } = {}) => {
      playError();
      if (screen !== "connect") toast.error(message || "Odaya bağlanılamadı.");
    };
    const onProtocolError = ({ message }: { message?: string } = {}) => {
      playError();
      toast.error(message || "Oyun işlemi tamamlanamadı.");
    };

    const onHint = (hint: { id: string; text: string; fromSelf?: boolean }) => {
      setReceivedHints(previous =>
        previous.some(item => item.id === hint.id)
          ? previous
          : [...previous, hint].slice(-50)
      );
    };
    socket.on("hint_received", onHint);
    socket.on("room_created", onRoomCreated);
    socket.on("room_joined", onRoomJoined);
    socket.on("player_joined", onPlayerJoined);
    socket.on("game_started", onGameStarted);
    socket.on("your_role", onYourRole);
    socket.on("start_drawing", onStartDrawing);
    socket.on("watch_drawing", onWatchDrawing);
    socket.on("generating_result", onGenerating);
    socket.on("show_result", onShowResult);
    socket.on("partner_disconnected", onPartnerDisconnected);
    socket.on("join_error", onJoinError);
    socket.on("protocol_error", onProtocolError);

    return () => {
      socket.off("hint_received", onHint);
      socket.off("room_created", onRoomCreated);
      socket.off("room_joined", onRoomJoined);
      socket.off("player_joined", onPlayerJoined);
      socket.off("game_started", onGameStarted);
      socket.off("your_role", onYourRole);
      socket.off("start_drawing", onStartDrawing);
      socket.off("watch_drawing", onWatchDrawing);
      socket.off("generating_result", onGenerating);
      socket.off("show_result", onShowResult);
      socket.off("partner_disconnected", onPartnerDisconnected);
      socket.off("join_error", onJoinError);
      socket.off("protocol_error", onProtocolError);
    };
  }, [partnerName, screen, selectedCategory, word]);

  // Save game to history
  async function saveGameHistory(game: {
    word: string;
    imageData: string;
    aiComment: string;
    aiScore?: number;
    mode?: GameMode;
  }) {
    let savedHistory: Array<Record<string, unknown>> = [];
    try {
      const parsed = JSON.parse(
        localStorage.getItem("cc_game_history") || "[]"
      );
      if (Array.isArray(parsed)) savedHistory = parsed;
    } catch {
      savedHistory = [];
    }
    const thumbnail = await createThumbnail(game.imageData);
    savedHistory.unshift({
      id: Date.now().toString(),
      mode: game.mode || "classic",
      partner: partnerName || "Partner",
      word: game.word,
      score: game.aiScore ?? 3,
      date: new Date().toLocaleDateString(),
      imageData: thumbnail,
    });
    try {
      localStorage.setItem(
        "cc_game_history",
        JSON.stringify(savedHistory.slice(0, 20))
      );
    } catch {
      try {
        localStorage.setItem(
          "cc_game_history",
          JSON.stringify(
            savedHistory.slice(0, 5).map(item => ({ ...item, imageData: "" }))
          )
        );
      } catch {
        // History is optional; a completed round must still reach its result.
      }
    }
  }

  function resetGame() {
    setRoomCode(null);
    setRole(null);
    setWord(null);
    setGamePhase(null);
    setResult(null);
  }

  function leaveGame() {
    socket.emit("cancel_room", { code: roomCode });
    resetGame();
  }

  function playAgain() {
    if (!canPlayFree()) {
      navigate("premium");
      return;
    }

    socket.emit("play_again", { code: roomCode });
  }

  // Request notification permission
  useEffect(() => {
    const timer = setTimeout(() => requestNotificationPermission(), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Partner waiting notifications
  useEffect(() => {
    if (screen === "waiting") {
      startPartnerWaitingNotifications();
    } else {
      stopPartnerWaitingNotifications();
    }
    return () => stopPartnerWaitingNotifications();
  }, [screen]);

  // === FLOW HANDLERS ===

  // Onboarding complete → Login
  function handleOnboardingDone() {
    try {
      localStorage.setItem("cc_onboarded", "true");
    } catch {
      /* Continue in memory. */
    }
    setHistory([]);
    setScreen("login");
  }

  // Skip login → Home
  function handleLoginSkip() {
    try {
      localStorage.setItem("cc_logged_in", "guest");
    } catch {
      /* Continue in memory. */
    }
    setHistory([]);
    const profile = getProfile();
    setScreen(profile.username.trim() ? "home" : "profile");
  }

  // Profile done → Home
  function handleProfileDone() {
    setHistory([]);
    setScreen("home");
  }

  // Start game mode
  function handlePlayCoDraw() {
    setGameMode("co-draw");
    if (selectedCategory === "daily_challenge") setSelectedCategory("daily");
    if (!canPlayFree()) {
      navigate("premium");
      return;
    }
    navigate("connect");
  }

  function handlePlayClassic() {
    setGameMode("classic");
    if (selectedCategory === "daily_challenge") setSelectedCategory("daily");
    if (!canPlayFree()) {
      navigate("premium");
      return;
    }
    navigate("connect");
  }

  function handleDailyChallenge() {
    setGameMode("classic");
    setSelectedCategory("daily_challenge");
    const daily = getDailyWord(getLocale());
    setDailyChallenge(daily.word, daily.category);
    if (!canPlayFree()) {
      navigate("premium");
      return;
    }
    navigate("connect");
  }

  // Category selection
  function handleCategorySelect(category: string) {
    setSelectedCategory(category);
    goBack();
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-body overflow-hidden">
      <Suspense
        fallback={<div className="h-screen bg-[#050505]" aria-busy="true" />}
      >
        {/* === ONBOARDING FLOW === */}
        {screen === "onboarding" && (
          <OnboardingScreen
            onNext={() => navigate("how-it-works")}
            onProfile={() => navigate("profile")}
            transport={transport}
          />
        )}
        {screen === "how-it-works" && (
          <HowItWorksScreen onBack={goBack} onNext={handleOnboardingDone} />
        )}

        {/* === AUTH FLOW === */}
        {screen === "login" && <LoginScreen onSkip={handleLoginSkip} onSignedIn={handleLoginSkip} />}

        {/* === HOME === */}
        {screen === "home" && (
          <HomeScreen
            onPlayClassic={handlePlayClassic}
            onPlayCoDraw={handlePlayCoDraw}
            onDailyChallenge={handleDailyChallenge}
            onProfile={() => navigate("profile")}
            onPremium={() => navigate("premium")}
            onAchievements={() => navigate("achievements")}
            partnerName={partnerName}
          />
        )}

        {/* === GAME SETUP === */}
        {screen === "connect" && (
          <ConnectScreen
            onBack={goBack}
            onProfile={() => navigate("profile")}
            onCategory={() => navigate("category")}
            selectedCategory={selectedCategory}
            mode={gameMode}
          />
        )}
        {screen === "category" && (
          <CategoryScreen
            onSelect={handleCategorySelect}
            onBack={goBack}
            onPremium={() => navigate("premium")}
            locale={getLocale()}
          />
        )}
        {screen === "waiting" && (
          <WaitingScreen
            code={roomCode}
            onBack={() => {
              leaveGame();
              setHistory(["home"]);
              setScreen("connect");
            }}
            onProfile={() => navigate("profile")}
          />
        )}

        {/* === CLASSIC GAME === */}
        {screen === "game" && gameMode === "co-draw" && gamePhase === "co_drawing" && (
          <CoDrawScreen
            word={word}
            timeLimit={timeLimit}
            endsAt={phaseEndsAt}
            roundNumber={roundNumber}
            seat={seat}
            myName={getProfile().username}
            myAvatar={getProfile().avatar}
            partnerName={partnerName}
            partnerAvatar={partnerAvatar}
          />
        )}
        {screen === "game" && !(gameMode === "co-draw" && gamePhase === "co_drawing") && (
          <GameScreen
            phase={gamePhase}
            role={role}
            word={word}
            timeLimit={timeLimit}
            endsAt={phaseEndsAt}
            roundNumber={roundNumber}
            receivedHints={receivedHints}
            code={roomCode}
            onProfile={() => navigate("profile")}
          />
        )}
        {/* === RESULTS === */}
        {screen === "result" && result && (
          <ResultScreen
            result={result}
            partnerName={partnerName}
            onShare={() => navigate("share")}
            onPlayAgain={playAgain}
            onHome={() => {
              leaveGame();
              setHistory([]);
              setScreen("home");
            }}
          />
        )}
        {screen === "share" && result && (
          <ShareScreen result={result} onBack={goBack} />
        )}

        {/* === UTILITY SCREENS === */}
        {screen === "profile" && (
          <ProfileScreen
            onBack={() => {
              const profile = getProfile();
              if (history.length > 0) {
                goBack();
              } else if (profile.username.trim()) {
                setScreen("home");
              } else {
                setScreen("login");
              }
            }}
            partnerName={partnerName}
            onPremium={() => navigate("premium")}
            onSignIn={() => navigate("login")}
            onAccountDeleted={() => {
              if (roomCode) leaveGame();
              setPartnerName(null);
              setHistory([]);
              setScreen("onboarding");
            }}
          />
        )}
        {/* Payments are off in v1: the paywall can never be reached or shown. */}
        {screen === "premium" && isBillingEnabled() && (
          <PremiumScreen
            onBack={goBack}
            onPurchased={() => {
              playSuccess();
              goBack();
            }}
          />
        )}
        {screen === "achievements" && <AchievementsScreen onBack={goBack} />}

        {/* Achievement Popup */}
        <AchievementPopup
          achievement={screen === "game" ? null : pendingAchievement}
          onDismiss={() => setPendingAchievement(null)}
        />
      </Suspense>
      {/* Connection indicator */}
      {(screen === "connect" || screen === "waiting" || screen === "game") && (
        <div
          className={`fixed top-3 right-3 z-50 size-2.5 rounded-full transition-all duration-300 ${
            transport === "online"
              ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"
              : transport === "connecting"
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-pulse"
                : transport === "offline"
                  ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                  : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
          }`}
        />
      )}
    </div>
  );
}
