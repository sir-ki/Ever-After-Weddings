"use client";

import { useState } from "react";
import type { PublicGuest } from "@/lib/guest-token";

type Stage = "choose" | "details" | "confirmed";

export default function RsvpForm({
  token,
  guest,
  deadlinePassed,
}: {
  token: string;
  guest: PublicGuest;
  deadlinePassed: boolean;
}) {
  const initialStatus =
    guest.rsvp_status === "accepted" || guest.rsvp_status === "declined"
      ? guest.rsvp_status
      : null;

  const [stage, setStage] = useState<Stage>(initialStatus ? "confirmed" : "choose");
  const [selected, setSelected] = useState<"accepted" | "declined" | null>(
    initialStatus,
  );
  const [contactPhone, setContactPhone] = useState(guest.contact_phone ?? "");
  const [guestNotes, setGuestNotes] = useState(guest.guest_notes ?? "");
  const [mealChoice, setMealChoice] = useState(guest.meal_choice ?? "");
  const [songRequest, setSongRequest] = useState(guest.song_request ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (deadlinePassed) {
    return (
      <div className="mt-6 rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">
        <p>RSVPs have closed for this wedding.</p>
        {initialStatus && (
          <p className="mt-1">
            We have you down as{" "}
            <strong>
              {initialStatus === "accepted" ? "attending" : "not attending"}
            </strong>
            .
          </p>
        )}
        <p className="mt-1">Need to change your answer? Message the couple directly.</p>
      </div>
    );
  }

  function choose(status: "accepted" | "declined") {
    setSelected(status);
    setStage("details");
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/g/${token}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvp_status: selected,
          contact_phone: selected === "accepted" ? contactPhone : "",
          guest_notes: guestNotes,
          meal_choice: selected === "accepted" ? mealChoice : "",
          song_request: selected === "accepted" ? songRequest : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStage("confirmed");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "confirmed" && selected) {
    return (
      <div className="mt-6">
        {selected === "accepted" ? (
          <>
            <p className="text-lg font-medium text-neutral-900">See you there.</p>
            <p className="mt-1 text-sm text-neutral-600">
              Thanks — we&apos;ve got you down.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-neutral-900">We&apos;ll miss you.</p>
            <p className="mt-1 text-sm text-neutral-600">
              Thanks for letting us know.
            </p>
          </>
        )}
        <button
          type="button"
          onClick={() => setStage("details")}
          className="mt-4 text-sm text-neutral-500 hover:underline"
        >
          Need to change your answer?
        </button>
      </div>
    );
  }

  if (stage === "details" && selected) {
    return (
      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => setStage("choose")}
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Change response
        </button>
        <p className="text-sm font-medium text-neutral-700">
          {selected === "accepted" ? "Joyfully accepting" : "Regretfully declining"}
        </p>

        {selected === "accepted" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Best number to reach you on the day
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Meal preference
              </label>
              <input
                type="text"
                value={mealChoice}
                onChange={(e) => setMealChoice(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                A song that&apos;ll get you on the dance floor?
              </label>
              <input
                type="text"
                value={songRequest}
                onChange={(e) => setSongRequest(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Anything we should know?
          </label>
          <textarea
            rows={3}
            value={guestNotes}
            onChange={(e) => setGuestNotes(e.target.value)}
            placeholder="Dietary needs, allergies, mobility, arriving late…"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Submit RSVP"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-neutral-700">
        Will you be joining us?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Joyfully accepts
        </button>
        <button
          type="button"
          onClick={() => choose("declined")}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Regretfully declines
        </button>
      </div>
    </div>
  );
}
