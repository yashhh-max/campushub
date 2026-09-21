"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ArrowLeft,
  Users,
  ShieldAlert,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { fetchEventById, checkInTicket } from "@/lib/api";
import { EventItem } from "@/types/campus";
import type { Html5Qrcode } from "html5-qrcode";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ScanLogEntry {
  id: string;
  code: string;
  attendeeName: string;
  status: "success" | "duplicate" | "error";
  message: string;
  timestamp: string;
}

export default function EventCheckInPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanLogEntry | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLogEntry[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "html5-qr-reader";
  const isCooldownRef = useRef<boolean>(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}/check-in`);
    }
  }, [authLoading, isAuthenticated, router, eventId]);

  // Load event info to check organizer permissions
  useEffect(() => {
    let active = true;
    async function loadEvent() {
      if (!token) return;
      try {
        const data = await fetchEventById(eventId, token);
        if (active) {
          setEvent(data);
          if (!data.is_organizer && user?.role !== "admin" && !user?.is_staff) {
            // not authorized
            alert("You are not authorized to check in attendees for this event.");
            router.push(`/events/${eventId}`);
          }
        }
      } catch (err: unknown) {
        if (active) setScannerError((err as Error).message || "Failed to load event.");
      }
    }

    if (isAuthenticated && token) {
      loadEvent();
    }

    return () => {
      active = false;
    };
  }, [eventId, isAuthenticated, token, user, router]);

  // Handle ticket verification and check-in
  const handleCheckIn = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed || isProcessing || !token) return;

    setIsProcessing(true);
    try {
      const res = await checkInTicket(Number(eventId), trimmed, token);

      const entry: ScanLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        code: res.ticket?.ticket_code || trimmed,
        attendeeName: res.attendee?.name || "Attendee",
        status: res.duplicate ? "duplicate" : "success",
        message: res.message || (res.duplicate ? "Already Checked In" : "Admitted Successfully"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      setLastResult(entry);
      setScanHistory((prev) => [entry, ...prev.slice(0, 19)]);
      setManualCode("");
    } catch (err: unknown) {
      const entry: ScanLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        code: trimmed,
        attendeeName: "Unknown",
        status: "error",
        message: (err as Error).message || "Invalid Ticket Pass",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      setLastResult(entry);
      setScanHistory((prev) => [entry, ...prev.slice(0, 19)]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Camera QR Scanner using dynamic import of html5-qrcode
  const startScanner = async () => {
    try {
      setScannerError(null);
      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const qrScanner = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          if (isCooldownRef.current) return;
          isCooldownRef.current = true;

          // Attempt check-in with decoded payload
          handleCheckIn(decodedText);

          // 2.5 second cooldown between camera scans to prevent rapid re-reading
          setTimeout(() => {
            isCooldownRef.current = false;
          }, 2500);
        },
        () => {
          // ignore scan frame errors
        }
      );

      setScannerActive(true);
    } catch (err: unknown) {
      setScannerError(
        (err as Error).message || "Camera access not granted or camera not found. Please use the manual ticket code lookup below."
      );
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation and Title Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Event</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link id="view-live-attendance-btn" href={`/events/${eventId}/attendance`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>Live Attendance Dashboard &rarr;</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              Organizer Check-In Station
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {event?.title || "Event Check-In"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Scan student QR passes or enter ticket codes manually to admit attendees with server-side duplicate prevention.
          </p>
        </div>

        {/* Main Scanner & Manual Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Camera Scanner */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Optical Camera Scanner</span>
                </h2>
                {scannerActive && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Scanning
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Point your mobile or desktop webcam at the student’s QR ticket code.
              </p>
            </div>

            {/* Viewport container */}
            <div className="relative w-full aspect-square rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
              <div id={qrRegionId} className="w-full h-full" />

              {!scannerActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90 text-white">
                  <QrCode className="w-16 h-16 text-slate-600" />
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Camera is currently paused.</p>
                    <p className="text-[11px] text-slate-500">
                      Click below to activate your camera or use manual code entry.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {scannerError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{scannerError}</span>
              </div>
            )}

            {/* Toggle Camera Button */}
            <Button
              id="toggle-camera-btn"
              variant={scannerActive ? "outline" : "primary"}
              size="md"
              onClick={scannerActive ? stopScanner : startScanner}
              className="w-full justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>{scannerActive ? "Stop Camera Scanner" : "Activate Camera Scanner"}</span>
            </Button>
          </div>

          {/* Right Column: Manual Code Entry & Recent Result Banner */}
          <div className="space-y-6">
            {/* Manual Entry Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-600" />
                  <span>Manual Ticket Code Lookup</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter alphanumeric ticket code (e.g., CH-TCK-...) if the attendee does not have camera access.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckIn(manualCode);
                }}
                className="space-y-3"
              >
                <input
                  id="manual-ticket-input"
                  type="text"
                  placeholder="Paste or type ticket code..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <Button
                  id="submit-manual-checkin-btn"
                  type="submit"
                  size="md"
                  disabled={!manualCode.trim() || isProcessing}
                  className="w-full justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessing ? "Validating Pass..." : "Verify & Check In Attendee"}</span>
                </Button>
              </form>
            </div>

            {/* Instant Result Alert Banner */}
            {lastResult && (
              <div
                id="checkin-result-card"
                className={`p-5 rounded-3xl border shadow-lg animate-in zoom-in-95 duration-150 space-y-2 ${
                  lastResult.status === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
                    : lastResult.status === "duplicate"
                    ? "bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100"
                    : "bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {lastResult.status === "success" && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  )}
                  {lastResult.status === "duplicate" && (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  {lastResult.status === "error" && (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      {lastResult.status === "success"
                        ? "Check-In Approved"
                        : lastResult.status === "duplicate"
                        ? "Duplicate Scan Warning"
                        : "Admission Rejected"}
                    </span>
                    <h3 className="font-extrabold text-base truncate">
                      {lastResult.attendeeName}
                    </h3>
                  </div>

                  <span className="font-mono text-xs opacity-60">
                    {lastResult.timestamp}
                  </span>
                </div>

                <div className="pt-2 border-t border-black/10 dark:border-white/10 text-xs flex items-center justify-between">
                  <span className="font-mono text-[11px] truncate max-w-[200px]">
                    {lastResult.code}
                  </span>
                  <span className="font-semibold">{lastResult.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scan Log History */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Live Scanning Log (This Session)</span>
            </h3>
            <span className="text-xs text-slate-400">
              {scanHistory.length} Scans Completed
            </span>
          </div>

          {scanHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              No passes scanned during this station session yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto text-xs">
              {scanHistory.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.status === "success" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    {item.status === "duplicate" && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    {item.status === "error" && (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {item.attendeeName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                      {item.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === "success"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : item.status === "duplicate"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {item.status === "success" ? "Admitted" : item.status === "duplicate" ? "Duplicate" : "Rejected"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
