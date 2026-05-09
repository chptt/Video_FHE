"use client";

import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Clock, AlertTriangle } from "lucide-react";

interface AccessBadgeProps {
  hasAccess: boolean;
  expiryTimestamp?: number;
}

export function AccessBadge({ hasAccess, expiryTimestamp }: AccessBadgeProps) {
  if (!hasAccess) {
    return (
      <Badge variant="locked" className="gap-1">
        <Lock className="w-3 h-3" />
        Locked
      </Badge>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = expiryTimestamp ? expiryTimestamp - now : 0;
  const isWarning = secondsLeft > 0 && secondsLeft < 300;

  if (isWarning) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Expiring Soon
      </Badge>
    );
  }

  return (
    <Badge variant="active" className="gap-1">
      <Unlock className="w-3 h-3" />
      Access Active
    </Badge>
  );
}
