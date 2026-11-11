import { preloadable } from "./preloadable";
export const { Screen: LoginScreen, preload: loadLoginScreen } = preloadable(
  () => import("@/components/screens/LoginScreen")
);
export const { Screen: HomeScreen, preload: loadHomeScreen } = preloadable(
  () => import("@/components/screens/HomeScreen")
);
export const { Screen: ProfileScreen, preload: loadProfileScreen } =
  preloadable(() => import("@/components/screens/ProfileScreen"));
export const { Screen: GameScreen, preload: loadGameScreen } = preloadable(
  () => import("@/components/screens/GameScreen")
);
export const { Screen: ResultScreen, preload: loadResultScreen } = preloadable(
  () => import("@/components/screens/ResultScreen")
);
export const { Screen: ShareScreen, preload: loadShareScreen } = preloadable(
  () => import("@/components/screens/ShareScreen")
);
