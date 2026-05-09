"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/web3/contract";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  expiryTimestamp: number; // Unix timestamp in seconds
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
}

export function CountdownTimer({
  expiryTimestamp,
  onExpire,
  className,
  compact = false,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, expiryTimestamp - now);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        onExpire?.();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiryTimestamp, onExpire, mounted]);

  if (!mounted) return null;

  const isExpired = secondsLeft === 0;
  const isWarning = secondsLeft > 0 && secondsLeft < 300; // < 5 minutes

  if (compact) {
    return (
      <span
        className={cn(
          "font-mono text-sm",
          isExpired && "text-red-400",
          isWarning && "text-amber-400 animate-pulse",
          !isExpired && !isWarning && "text-green-400",
          className
        )}
      >
        {isExpired ? "Expired" : formatCountdown(secondsLeft)}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border",
        isExpired
          ? "border-red-600/40 bg-red-900/20"
          : isWarning
          ? "border-amber-600/40 bg-amber-900/20"
          : "border-green-600/40 bg-green-900/20",
        className
      )}
    >
      {isWarning ? (
        <AlertTriangle
          className={cn(
            "w-5 h-5 flex-shrink-0",
            isWarning ? "text-amber-400" : "text-red-400"
          )}
        />
      ) : (
        <Clock
          className={cn(
            "w-5 h-5 flex-shrink-0",
            isExpired ? "text-red-400" : "text-green-400"
          )}
        />
      )}

      <div>
        <p
          className={cn(
            "text-xs font-medium",
            isExpired
              ? "text-red-400"
              : isWarning
              ? "text-amber-400"
              : "text-green-400"
          )}
        >
          {isExpired
            ? "Access Expired"
            : isWarning
            ? "Expiring Soon"
            : "Access Active"}
        </p>
        <p
          className={cn(
            "font-mono text-lg font-bold",
            isExpired
              ? "text-red-300"
              : isWarning
              ? "text-amber-300 animate-pulse"
              : "text-green-300"
          )}
        >
          {isExpired ? "00:00:00" : formatCountdown(secondsLeft)}
        </p>
      </div>
    </div>
  );
}
