import { useEffect } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { initNotifications } from "@/lib/notifications";
import GameApp, { type GameAppStart } from "./pages/GameApp";

// Full animation engine and game services are prepared after first paint.
export default function GameRuntime(props: GameAppStart) {
  useEffect(() => {
    initNotifications();
  }, []);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.16 }}>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(10,10,10,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
              backdropFilter: "blur(12px)",
            },
          }}
        />
        <GameApp {...props} />
      </MotionConfig>
    </LazyMotion>
  );
}
