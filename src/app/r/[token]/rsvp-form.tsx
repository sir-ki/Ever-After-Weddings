"use client";

import { useState } from "react";
import type { PublicGuest } from "@/lib/guest-token";

type Stage = "choose" | "details" | "confirmed";

const inputClass =
  "w-full rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] px-3 py-2.5 text-sm text-[var(--ea-ink)] focus:border-[var(--ea-accent)] focus:outline-none";
const labelClass = "mb-1 block text-sm text-[var(--ea-ink-secondary)]";

export default function RsvpForm({
  token,
  guest,
  deadlinePassed,
  hubUnlocked,
}: {
  token: string;
  guest: PublicGuest;
  deadlinePassed: boolean;
  hubUnlocked: boolean;
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
      <div className="mt-6 rounded-[10px] border border-[var(--ea-border)] p-5 text-left text-sm text-[var(--ea-ink-secondary)]">
        <p className="ea-font-serif text-lg text-[var(--ea-ink)]">Replies have closed</p>
        {initialStatus && (
          <p className="mt-2">
            We have you down as{" "}
            <strong className="text-[var(--ea-ink)]">
              {initialStatus === "accepted" ? "attending" : "not attending"}
            </strong>
            .
          </p>
        )}
        <p className="mt-2">Need to change your answer? Message the couple directly.</p>
        {hubUnlocked && (
          <a
            href={`/r/${token}/day`}
            className="mt-3 inline-block font-medium text-[var(--ea-accent-ink)] hover:underline"
          >
            Open the day-of hub →
          </a>
        )}
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
      <div className="mt-6 rounded-[10px] bg-[var(--ea-blush)] p-6 text-center">
        {selected === "accepted" ? (
          <>
            <span className="inline-block rounded-full bg-[var(--ea-champagne)] px-3 py-1 text-[11px] tracking-wide text-[var(--ea-accent-ink)] lowercase">
              you&apos;re in
            </span>
            <p className="ea-font-serif mt-2 text-xl text-[var(--ea-ink)]">
              See you there, {guest.full_name.split(" ")[0]}
            </p>
            <p className="mt-1 text-sm text-[var(--ea-ink-secondary)]">
              We can&apos;t wait to celebrate with you.
            </p>
          </>
        ) : (
          <>
            <p className="ea-font-serif text-xl text-[var(--ea-ink)]">We&apos;ll miss you</p>
            <p className="mt-1 text-sm text-[var(--ea-ink-secondary)]">
              Thanks for letting us know.
            </p>
          </>
        )}
        {hubUnlocked && (
          <a
            href={`/r/${token}/day`}
            className="mt-4 block text-sm font-medium text-[var(--ea-accent-ink)] hover:underline"
          >
            Open the day-of hub →
          </a>
        )}
        <button
          type="button"
          onClick={() => setStage("details")}
          className="mt-3 text-sm text-[var(--ea-ink-muted)] hover:underline"
        >
          Need to change your answer?
        </button>
      </div>
    );
  }

  if (stage === "details" && selected) {
    return (
      <div className="mt-6 space-y-4 text-left">
        <button
          type="button"
          onClick={() => setStage("choose")}
          className="text-sm text-[var(--ea-ink-muted)] hover:underline"
        >
          ← Change response
        </button>
        <p className="text-sm font-medium text-[var(--ea-ink)]">
          {selected === "accepted" ? "Joyfully accepting" : "Regretfully declining"}
        </p>

        {selected === "accepted" && (
          <>
            <div>
              <label className={labelClass}>Best number to reach you on the day</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Meal preference</label>
              <input
                type="text"
                value={mealChoice}
                onChange={(e) => setMealChoice(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>A song that&apos;ll get you on the dance floor?</label>
              <input
                type="text"
                value={songRequest}
                onChange={(e) => setSongRequest(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Anything we should know?</label>
          <textarea
            rows={3}
            value={guestNotes}
            onChange={(e) => setGuestNotes(e.target.value)}
            placeholder="Dietary needs, allergies, mobility, arriving late…"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="min-h-[44px] w-full rounded-[10px] bg-[var(--ea-accent)] px-3 py-2.5 text-sm font-medium text-[#FFF8F5] hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Submit RSVP"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-[var(--ea-ink)]">Will you be joining us?</p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="min-h-[44px] w-full rounded-[10px] bg-[var(--ea-accent)] px-3 py-2.5 text-sm font-medium text-[#FFF8F5] hover:opacity-90"
        >
          Accept with pleasure
        </button>
        <button
          type="button"
          onClick={() => choose("declined")}
          className="min-h-[44px] w-full rounded-[10px] border border-[var(--ea-border)] px-3 py-2.5 text-sm font-medium text-[var(--ea-ink)] hover:bg-[var(--ea-blush)]"
        >
          Can&apos;t make it
        </button>
      </div>
    </div>
  );
}
