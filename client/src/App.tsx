import { Suspense, startTransition, useEffect, useState, useRef } from "react";
import { preloadable } from "@/lib/preloadable";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import OnboardingScreen from "./components/screens/OnboardingScreen";
import HowItWorksScreen from "./components/screens/HowItWorksScreen";
import { initAudio } from "@/lib/sounds";
import {
  loadLoginScreen,
  loadProfileScreen,
  loadHomeScreen,
} from "@/lib/preparedScreens";
import type { GameAppStart } from "./pages/GameApp";

const loadRuntime = async () => {
  const runtime = import("./GameRuntime");
  // Returning players prepare their first screen in parallel with the engine,
  // avoiding another import waterfall and an inner Suspense fallback.
  if (hasOnboarded()) {
    let loggedIn = false;
    try {
      loggedIn = !!localStorage.getItem("cc_logged_in");
    } catch {
      /* guest login */
    }
    await (loggedIn ? loadHomeScreen() : loadLoginScreen());
  }
  return runtime;
};
const { Screen: GameRuntime, preload: prepareRuntime } =
  preloadable(loadRuntime);

// A returning session has no splash to show. Load its first view before the
// initial React commit, avoiding the minimum Suspense fallback display time.
export function prepareStartup() {
  return hasOnboarded() ? prepareRuntime() : null;
}

function hasOnboarded() {
  try {
    return !!localStorage.getItem("cc_onboarded");
  } catch {
    return false;
  }
}

function initialTransport(): "offline" | "local" {
  let stored = "";
  try {
    stored = localStorage.getItem("cc_game_server_url")?.trim() || "";
  } catch {
    /* use build configuration */
  }
  try {
    const url = new URL(stored || import.meta.env.VITE_GAME_SERVER_URL || "");
    return ["http:", "https:", "ws:", "wss:"].includes(url.protocol)
      ? "offline"
      : "local";
  } catch {
    return "local";
  }
}

function Startup() {
  const [runtime, setRuntime] = useState<GameAppStart | null>(() =>
    hasOnboarded() ? {} : null
  );
  const [instructions, setInstructions] = useState(false);
  const [transport] = useState(initialTransport);
  const [loadError, setLoadError] = useState<unknown>(null);
  const navigation = useRef(0);

  function enterRuntime(next: GameAppStart, prepare: () => Promise<unknown>) {
    const request = ++navigation.current;
    // Both the outer controller and its first screen must be ready. Otherwise
    // the controller's inner Suspense could commit an empty screen on fast taps.
    void Promise.all([prepareRuntime(), prepare()])
      .then(() => {
        if (request === navigation.current)
          startTransition(() => setRuntime(next));
      })
      .catch(error => {
        if (request === navigation.current) setLoadError(error);
      });
  }

  useEffect(() => {
    if (runtime) return;
    // First paint wins; prepare code in an idle slot. Fast taps retain the
    // existing screen through React's transition until the next one is ready.
    let idle: number | undefined;
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      const prepare = () => {
        void prepareRuntime().catch(() => {});
        void loadProfileScreen().catch(() => {});
      };
      if (typeof window.requestIdleCallback === "function")
        idle = window.requestIdleCallback(prepare, { timeout: 1200 });
      else timer = window.setTimeout(prepare, 200);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [runtime]);

  useEffect(() => {
    if (runtime || !instructions) return;
    void loadLoginScreen().catch(() => {});
    const back = () => {
      navigation.current++;
      setInstructions(false);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [instructions, runtime]);

  if (loadError) throw loadError;
  if (runtime) return <GameRuntime {...runtime} />;
  return (
    <div className="min-h-screen bg-[#050505] text-white font-body overflow-hidden">
      {instructions ? (
        <HowItWorksScreen
          onBack={() => {
            navigation.current++;
            setInstructions(false);
            window.history.back();
          }}
          onNext={() => {
            try {
              localStorage.setItem("cc_onboarded", "true");
            } catch {
              /* continue in memory */
            }
            enterRuntime({ initialScreen: "login" }, loadLoginScreen);
          }}
        />
      ) : (
        <OnboardingScreen
          transport={transport}
          onNext={() => {
            navigation.current++;
            window.history.pushState(
              { coupleChaos: true },
              "",
              window.location.href
            );
            setInstructions(true);
          }}
          onProfile={() =>
            enterRuntime(
              {
                initialScreen: "profile",
                initialHistory: ["onboarding"],
                pushEntry: true,
              },
              loadProfileScreen
            )
          }
        />
      )}
    </div>
  );
}

export default function App() {
  useEffect(() => initAudio(), []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LocaleProvider>
          <Suspense
            fallback={
              <div className="h-screen bg-[#050505]" aria-busy="true" />
            }
          >
            <Startup />
          </Suspense>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
