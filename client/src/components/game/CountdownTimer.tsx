import { useEffect, useState, useRef } from "react";

export interface CountdownTimerProps {
  duration: number;
  endsAt?: number;
  size?: "sm" | "md" | "lg";
  onComplete?: () => void;
  onTick?: (timeLeft: number) => void;
}

export default function CountdownTimer({ duration, endsAt, size = "md", onComplete, onTick }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());
  const lastTickSecondRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const sizes = {
    sm: { outer: 44, stroke: 3, fontSize: "text-xs" },
    md: { outer: 72, stroke: 4, fontSize: "text-lg" },
    lg: { outer: 100, stroke: 5, fontSize: "text-2xl" },
  };

  const { outer, stroke, fontSize } = sizes[size];
  const radius = (outer - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeDuration = Math.max(1, Number.isFinite(duration) ? duration : 1);
  const progress = Math.max(0, Math.min(1, timeLeft / safeDuration));
  const dashOffset = circumference * (1 - progress);

  // Color transitions based on time
  const getColor = () => {
    if (progress > 0.5) return "#8B5CF6"; // purple - safe
    if (progress > 0.25) return "#FBBF24"; // gold - warning
    return "#FF1A6C"; // magenta - danger
  };

  useEffect(() => {
    startTimeRef.current = endsAt !== undefined ? endsAt - safeDuration * 1000 : Date.now();
    lastTickSecondRef.current = null;
    completedRef.current = false;
    setTimeLeft(Math.max(0, Math.min(safeDuration, (startTimeRef.current + safeDuration * 1000 - Date.now()) / 1000)));

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, safeDuration - elapsed);
      setTimeLeft(remaining);

      // Call onTick when time is running low (last 5 seconds)
      const displayedSecond = Math.ceil(remaining);
      if (displayedSecond <= 5 && displayedSecond > 0 && displayedSecond !== lastTickSecondRef.current) {
        lastTickSecondRef.current = displayedSecond;
        onTickRef.current?.(displayedSecond);
      }
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onCompleteRef.current?.();
      }
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [safeDuration, endsAt]);

  const isUrgent = timeLeft <= 3;

  return (
    <div className={`relative flex items-center justify-center ${isUrgent ? 'animate-pulse' : ''}`}>
      <svg width={outer} height={outer} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress ring */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{
            filter: `drop-shadow(0 0 ${isUrgent ? '8px' : '4px'} ${getColor()})`,
          }}
        />
      </svg>
      <span className={`absolute font-mono font-bold ${fontSize} ${isUrgent ? 'text-primary' : 'text-white'}`}>
        {Math.ceil(timeLeft)}
      </span>
    </div>
  );
}
