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
  loadLoginScreen,
  loadHomeScreen,
  loadProfileScreen,
  loadGameScreen,
  loadResultScreen,
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
import { getLocale, t } from "@/lib/i18n";
import { findWordEmoji, getDailyWord } from "@/lib/wordPool";
import { getRoast } from "@/lib/aiRoast";
import { earnTokens, TOKEN_REWARD_CORRECT, TOKEN_REWARD_ROUND } from "@/lib/tokens";
import OnboardingScreen from "@/components/screens/OnboardingScreen";
import ConnectScreen from "@/components/screens/ConnectScreen";
import LeaderboardScreen from "@/components/screens/LeaderboardScreen";
import InviteScreen from "@/components/screens/InviteScreen";
import type { ReplayStroke } from "@/components/game/DrawingCanvas";
import { INVITE_EVENT, takePendingInvite } from "@/lib/invite";
import WaitingScreen from "@/components/screens/WaitingScreen";
import CoDrawScreen from "@/components/screens/CoDrawScreen";
import { createThumbnail } from "@/lib/imageUtils";
import { toast } from "sonner";
import TokenShop from "@/components/TokenShop";
import { initTokenStore } from "@/lib/tokenStore";

// These screens are packaged in the APK but parsed only when needed.
import HowItWorksScreen from "@/components/screens/HowItWorksScreen";
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
  | "achievements"
  | "leaderboard"
  | "invite";

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
  playerGuess?: string | null;
  guessCorrect?: boolean;
  tokensEarned?: number;
  /** Daily challenge: place on today's leaderboard. */
  dailyRank?: number;
  dailyTotal?: number;
  /** Solo: the AI drew this one (the player gave the hints). */
  botDrew?: boolean;
  /** The drawing as strokes, for the replay video. */
  strokes?: ReplayStroke[];
  /** Played against the AI. */
  solo?: boolean;
  strokeAspect?: number;
}

export interface HintOptionView {
  id: string;
  label: string;
  cost: number;
  kind: string;
  used: boolean;
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
  const [hintOptions, setHintOptions] = useState<HintOptionView[]>([]);
  const [guessOptions, setGuessOptions] = useState<string[]>([]);
  /** Matched with a stranger: show report/block. */
  const [isRandom, setIsRandom] = useState(false);
  /** Playing against the AI (play again can always restart). */
  const [isSolo, setIsSolo] = useState(false);
  const [partnerGuess, setPartnerGuess] = useState<string | null>(null);
  const [wordEmoji, setWordEmoji] = useState<string>("");
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [seat, setSeat] = useState(0);
  const [transport, setTransport] = useState(socket.transport);
  /** Room code from an invite link (shows the invite screen). */
  const [inviteCode, setInviteCode] = useState<string | null>(() => (initialScreen === "invite" ? takePendingInvite() : null));
  // Paid-but-unfinished token purchases (crash, lost connection, Ask to Buy) are granted here.
  useEffect(() => {
    void initTokenStore((tokens) => toast.success(t("shop.added").replace("{n}", String(tokens))));
  }, []);
  useEffect(() => {
    const onInvite = () => {
      const code = takePendingInvite();
      if (!code) return;
      setInviteCode(code);
      setHistory(["home"]);
      setScreen("invite");
    };
    window.addEventListener(INVITE_EVENT, onInvite);
    return () => window.removeEventListener(INVITE_EVENT, onInvite);
  }, []);
  /** Connect screen opened for "play with AI". */
  const [soloMode, setSoloMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    "mixed"
  );
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
      random,
    }: {
      code: string;
      role: string;
      mode?: GameMode;
      random?: boolean;
    }) => {
      setIsRandom(Boolean(random));
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
      random,
      solo,
    }: {
      code: string;
      role: string;
      mode?: GameMode;
      random?: boolean;
      solo?: boolean;
    }) => {
      setIsRandom(Boolean(random));
      setIsSolo(Boolean(solo));
      if (mode) setGameMode(mode);
      setRoomCode(code);
      setRole(nextRole);
      if (solo) return; // solo vs AI: the round starts right away, no waiting room
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
      setHintOptions([]);
      setGuessOptions([]);
      setPartnerGuess(null);
      setWordEmoji("");
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
      hintOptions: nextHintOptions,
      wordEmoji: nextEmoji,
    }: {
      hintOptions?: HintOptionView[];
      wordEmoji?: string;
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
      if (Array.isArray(nextHintOptions)) setHintOptions(nextHintOptions);
      setWordEmoji(nextEmoji || "");
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
      options,
    }: {
      word?: string;
      timeLimit?: number;
      localEndsAt?: number;
      options?: string[];
    }) => {
      if (nextWord) setWord(nextWord);
      if (Array.isArray(options)) setGuessOptions(options);
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
      playerGuess,
      guessCorrect,
      dailyRank,
      dailyTotal,
      botDrew,
      strokes,
      strokeAspect,
      solo,
    }: GameResult) => {
      const numericScore = Number.isFinite(aiScore)
        ? Math.max(1, Math.min(100, Math.round(aiScore!)))
        : 3;
      const nextResult = {
        word: resultWord || word || "Çizim",
        imageData: imageData || "",
        // No AI comment for this language → a funny offline one in this phone's language.
        aiComment: aiComment || getRoast(numericScore, resultWord || word || undefined),
        aiScore: numericScore,
        outcome,
        opponentScore: Number.isFinite(opponentScore)
          ? opponentScore
          : undefined,
        mode: resultMode,
        judgedBy,
        wordEmoji: wordEmoji || findWordEmoji(resultWord || word || ""),
        aiGuess,
        playerGuess,
        guessCorrect,
        tokensEarned: TOKEN_REWARD_ROUND + (guessCorrect ? TOKEN_REWARD_CORRECT : 0),
        dailyRank,
        dailyTotal,
        botDrew,
        strokes: Array.isArray(strokes) ? strokes : undefined,
        strokeAspect,
        solo,
      };
      earnTokens(nextResult.tokensEarned);
      if (guessCorrect && !botDrew) {
        try {
          localStorage.setItem("cc_correct_guesses", String((Number(localStorage.getItem("cc_correct_guesses")) || 0) + 1));
        } catch { /* ignore */ }
      }
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

      checkNewAchievements(); // keeps the unlock record; no pop-up over the result

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
      if (screen === "result") {
        // The room is gone (partner left long ago / server restarted): back to the start.
        toast.error(t("game.roomClosed"));
        resetGame();
        setHistory([]);
        setScreen("home");
        return;
      }
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
    const onHintOptions = (data: { options?: HintOptionView[] }) => {
      if (Array.isArray(data?.options)) setHintOptions(data.options);
    };
    const onHintOptionUsed = (data: { options?: HintOptionView[]; id: string; text: string }) => {
      if (Array.isArray(data?.options)) setHintOptions(data.options);
      if (data?.id && data?.text) {
        setReceivedHints(previous => previous.some(hint => hint.id === data.id) ? previous : [...previous, { id: data.id, text: data.text, fromSelf: true }]);
      }
    };
    const onPartnerGuess = (data: { guess?: string }) => setPartnerGuess(data?.guess || null);
    socket.on("hint_options", onHintOptions);
    socket.on("hint_option_used", onHintOptionUsed);
    socket.on("partner_guess", onPartnerGuess);
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
      socket.off("hint_options", onHintOptions);
      socket.off("hint_option_used", onHintOptionUsed);
      socket.off("partner_guess", onPartnerGuess);
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
    wordEmoji?: string;
    guessCorrect?: boolean;
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
      emoji: game.wordEmoji || "",
      guessCorrect: game.guessCorrect,
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

  /** Report + block the stranger: ends the game for both, never matched again. */
  function reportPartner() {
    toast(t("report.ask"), {
      action: {
        label: t("report.do"),
        onClick: () => {
          socket.emit("report_partner", { reason: "user_report" });
          toast.success(t("report.done"));
          resetGame();
          setPartnerName(null);
          setHistory([]);
          setScreen("home");
        },
      },
    });
  }

  function resetGame() {
    setIsRandom(false);
    setIsSolo(false);
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

    // Solo: if the room was dropped meanwhile, the server simply starts a new game.
    const profile = getProfile();
    socket.emit("play_again", isSolo
      ? { code: roomCode, solo: true, category: selectedCategory || "mixed", username: profile.username || "Player", avatar: profile.avatar, locale: getLocale() }
      : { code: roomCode });
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

  // Start game mode
  function handlePlaySolo() {
    setSoloMode(true);
    setGameMode("classic");
    if (selectedCategory === "daily_challenge") setSelectedCategory("mixed");
    navigate("connect");
  }

  function handlePlayCoDraw() {
    setSoloMode(false);
    setGameMode("co-draw");
    if (selectedCategory === "daily_challenge") setSelectedCategory("mixed");
    if (!canPlayFree()) {
      navigate("premium");
      return;
    }
    navigate("connect");
  }

  function handlePlayClassic() {
    setSoloMode(false);
    setGameMode("classic");
    if (selectedCategory === "daily_challenge") setSelectedCategory("mixed");
    if (!canPlayFree()) {
      navigate("premium");
      return;
    }
    navigate("connect");
  }

  function handleDailyChallenge() {
    setSoloMode(false);
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

  return (
    <div className="min-h-[100dvh] bg-[#07060A] text-white font-body overflow-hidden">
      <TokenShop />
      <Suspense
        fallback={<div className="h-[100dvh] bg-[#07060A]" aria-busy="true" />}
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
            onPlaySolo={handlePlaySolo}
            onLeaderboard={() => navigate("leaderboard")}
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
            onSelectCategory={setSelectedCategory}
            selectedCategory={selectedCategory}
            mode={gameMode}
            solo={soloMode}
          />
        )}
        {screen === "invite" && inviteCode && (
          <InviteScreen
            code={inviteCode}
            onCancel={() => {
              setInviteCode(null);
              setHistory([]);
              setScreen("home");
            }}
          />
        )}
        {screen === "leaderboard" && (
          <LeaderboardScreen onBack={goBack} onPlayDaily={handleDailyChallenge} />
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
            hintOptions={hintOptions}
            guessOptions={guessOptions}
            partnerGuess={partnerGuess}
            wordEmoji={wordEmoji}
            partnerName={partnerName}
            onReport={isRandom ? reportPartner : undefined}
          />
        )}
        {/* === RESULTS === */}
        {screen === "result" && result && (
          <ResultScreen
            result={result}
            partnerName={partnerName}
            onPlayAgain={playAgain}
            onReport={isRandom ? reportPartner : undefined}
            onLeaderboard={result.dailyRank ? () => navigate("leaderboard") : undefined}
            onHome={() => {
              leaveGame();
              setHistory([]);
              setScreen("home");
            }}
          />
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
