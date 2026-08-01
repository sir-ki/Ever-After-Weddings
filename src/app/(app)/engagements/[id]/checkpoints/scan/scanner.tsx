"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { logScan, type LogScanResult } from "../actions";

type Checkpoint = { id: string; name: string; sort_order: number };
type Guest = { id: string; full_name: string; rsvp_status: string };
type ScanFeedback =
  | { kind: "success"; guestName: string; scannedAt: string }
  | { kind: "already_scanned"; guestName: string; scannedAt: string }
  | { kind: "error"; message: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function toFeedback(result: LogScanResult): ScanFeedback {
  if (result.status === "error") {
    return { kind: "error", message: result.message };
  }
  return { kind: result.status, guestName: result.guestName, scannedAt: result.scannedAt };
}

export default function Scanner({
  engagementId,
  checkpoints,
  guests,
}: {
  engagementId: string;
  checkpoints: Checkpoint[];
  guests: Guest[];
}) {
  const [checkpointId, setCheckpointId] = useState(checkpoints[0]?.id ?? "");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [recent, setRecent] = useState<
    { guestName: string; scannedAt: string; kind: ScanFeedback["kind"] }[]
  >([]);
  const [query, setQuery] = useState("");
  const [manualBusyId, setManualBusyId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const checkpointIdRef = useRef(checkpointId);
  const busyRef = useRef(false);

  useEffect(() => {
    checkpointIdRef.current = checkpointId;
  }, [checkpointId]);

  function applyResult(result: LogScanResult) {
    const fb = toFeedback(result);
    setFeedback(fb);
    if (fb.kind !== "error") {
      setRecent((prev) =>
        [{ guestName: fb.guestName, scannedAt: fb.scannedAt, kind: fb.kind }, ...prev].slice(
          0,
          8,
        ),
      );
    }
  }

  // Camera + continuous QR decode loop. Runs once on mount; reads the
  // current checkpoint through a ref rather than a dependency so the video
  // stream never has to be torn down and restarted when the marshal
  // switches checkpoints mid-shift.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    async function handleDecodedText(scannedText: string) {
      if (busyRef.current) return;
      const activeCheckpointId = checkpointIdRef.current;
      if (!activeCheckpointId) return;
      busyRef.current = true;
      try {
        const result = await logScan({
          engagementId,
          checkpointId: activeCheckpointId,
          method: "qr",
          scannedText,
        });
        applyResult(result);
      } catch {
        applyResult({ status: "error", message: "Failed to log the scan. Please try again." });
      } finally {
        // Give the marshal a moment to see the result before the camera
        // can trigger again on a code still in frame.
        setTimeout(() => {
          busyRef.current = false;
        }, 1500);
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access isn't available in this browser.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setCameraError(
          "Couldn't access the camera. Check permissions, or use manual search below.",
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      video.srcObject = stream;
      await video.play();

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      function tick() {
        if (cancelled) return;
        if (video!.readyState === video!.HAVE_ENOUGH_DATA && !busyRef.current) {
          canvas!.width = video!.videoWidth;
          canvas!.height = video!.videoHeight;
          ctx!.drawImage(video!, 0, 0, canvas!.width, canvas!.height);
          const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            void handleDecodedText(code.data);
          }
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredGuests = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return guests.filter((g) => g.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [guests, query]);

  async function handleManualLog(guest: Guest) {
    if (!checkpointId) return;
    setManualBusyId(guest.id);
    try {
      const result = await logScan({
        engagementId,
        checkpointId,
        method: "manual",
        guestId: guest.id,
      });
      applyResult(result);
    } catch {
      applyResult({ status: "error", message: "Failed to log the scan. Please try again." });
    } finally {
      setManualBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 mt-2 text-xl font-semibold text-neutral-900">Scan check-in</h1>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-neutral-700">Checkpoint</label>
        <select
          value={checkpointId}
          onChange={(e) => setCheckpointId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          {checkpoints.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-lg border border-neutral-200 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-square w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/90 p-4 text-center text-sm text-white">
            {cameraError}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            feedback.kind === "success"
              ? "bg-green-100 text-green-800"
              : feedback.kind === "already_scanned"
                ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.kind === "success" && (
            <>
              {feedback.guestName} checked in at {formatTime(feedback.scannedAt)}.
            </>
          )}
          {feedback.kind === "already_scanned" && (
            <>
              {feedback.guestName} already scanned at {formatTime(feedback.scannedAt)}.
            </>
          )}
          {feedback.kind === "error" && (
            <div className="flex items-center justify-between gap-3">
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="whitespace-nowrap text-xs font-medium underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-medium text-neutral-900">Can&apos;t scan? Search by name</h3>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Guest name…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {filteredGuests.length > 0 && (
          <ul className="mt-2 space-y-1">
            {filteredGuests.map((guest) => (
              <li key={guest.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{guest.full_name}</span>
                <button
                  type="button"
                  disabled={manualBusyId === guest.id}
                  onClick={() => handleManualLog(guest)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  {manualBusyId === guest.id ? "Logging…" : "Log arrival"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recent.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 font-medium text-neutral-900">Recent scans</h3>
          <ul className="space-y-1 text-sm">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-neutral-700">{r.guestName}</span>
                <span className={r.kind === "success" ? "text-green-700" : "text-amber-700"}>
                  {formatTime(r.scannedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
