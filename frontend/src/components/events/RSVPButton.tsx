"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { rsvpEvent, cancelEventRsvp } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface RSVPButtonProps {
  eventId: number | string;
  isRegistered?: boolean;
  status?: "attending" | "waitlist" | "cancelled" | null;
  waitlistPosition?: number | null;
  isFull: boolean;
  hasStarted: boolean;
  onStatusChange?: (newStatus: "attending" | "waitlist" | "cancelled", position?: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RSVPButton({
  eventId,
  isRegistered,
  status: initialStatus,
  waitlistPosition: initialPosition,
  isFull,
  hasStarted,
  onStatusChange,
  size = "md",
  className,
}: RSVPButtonProps) {
  const { tokens, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive status
  const currentStatus = initialStatus || (isRegistered ? "attending" : null);

  // 1. Unauthenticated State
  if (!isAuthenticated || !tokens) {
    return (
      <Link href={`/login?redirect=/events/${eventId}`} className="inline-block">
        <Button variant="primary" size={size} className={className}>
          <LogIn className="w-4 h-4 mr-1.5" />
          <span>Sign In to RSVP</span>
        </Button>
      </Link>
    );
  }

  // 2. Event Started / Ended
  if (hasStarted) {
    return (
      <Button
        variant="secondary"
        size={size}
        disabled
        className="opacity-60 cursor-not-allowed"
      >
        <span>Event Closed / Started</span>
      </Button>
    );
  }

  // 3. User is on the Waitlist -> Provide Cancel / Leave Waitlist
  if (currentStatus === "waitlist") {
    const handleLeaveWaitlist = async () => {
      if (!confirm("Are you sure you want to leave the waitlist for this event?")) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await cancelEventRsvp(eventId, tokens.access);
        onStatusChange?.("cancelled");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Cancellation failed.");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          size={size}
          isLoading={isLoading}
          onClick={handleLeaveWaitlist}
          className="border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:hover:bg-rose-950/40 group transition-all"
          title="Click to leave waitlist"
        >
          <span className="group-hover:hidden flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Waitlist #{initialPosition || 1}
          </span>
          <span className="hidden group-hover:inline-flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-500" />
            Leave Waitlist
          </span>
        </Button>
        {error && (
          <span className="text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </span>
        )}
      </div>
    );
  }

  // 4. User is Registered / Attending -> Provide Cancel RSVP
  if (currentStatus === "attending") {
    const handleCancel = async () => {
      if (!confirm("Are you sure you want to cancel your RSVP? This will immediately promote the next student on the waitlist.")) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await cancelEventRsvp(eventId, tokens.access);
        onStatusChange?.("cancelled");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Cancellation failed.");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          size={size}
          isLoading={isLoading}
          onClick={handleCancel}
          className="border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:hover:bg-rose-950/40 group transition-all"
          title="Click to cancel registration"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500 mr-1.5 group-hover:hidden" />
          <XCircle className="w-4 h-4 text-rose-500 mr-1.5 hidden group-hover:inline-block" />
          <span className="group-hover:hidden">Registered ✓</span>
          <span className="hidden group-hover:inline-block">Cancel RSVP</span>
        </Button>
        {error && (
          <span className="text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </span>
        )}
      </div>
    );
  }

  // 5. Event Full (User not yet on waitlist or attending) -> Show "Join Waitlist"
  if (isFull) {
    const handleJoinWaitlist = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await rsvpEvent(eventId, tokens.access, true);
        onStatusChange?.("waitlist", res.waitlist_position);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to join waitlist.");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-1.5">
        <Button
          variant="primary"
          size={size}
          isLoading={isLoading}
          onClick={handleJoinWaitlist}
          className={`bg-amber-600 hover:bg-amber-700 text-white border-none shadow-md shadow-amber-600/20 ${className || ""}`}
        >
          <span>Join Waitlist</span>
        </Button>
        {error && (
          <span className="text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </span>
        )}
      </div>
    );
  }

  // 6. Default -> RSVP Now (Confirmed Seat)
  const handleRsvp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await rsvpEvent(eventId, tokens.access);
      onStatusChange?.("attending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "RSVP failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="primary"
        size={size}
        isLoading={isLoading}
        onClick={handleRsvp}
        className={className}
      >
        <span>Confirm RSVP</span>
      </Button>
      {error && (
        <span className="text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
}
