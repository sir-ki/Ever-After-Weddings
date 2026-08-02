import "server-only";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";
import { COLORS, loadFonts, sanitizeFilenameSegment } from "./print-theme";

// Ever After — Milestone/launch-readiness spec Part 3: the card is a
// couple's first mailer, not a bare QR. One shared rendering path — the
// per-guest download route and the bulk-zip route both call this same
// function, per the spec's own note that later printables (Part 7) reuse
// it too. Font loading and the color palette now live in
// ./print-theme.ts, shared with Part 7's printables.
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

export { sanitizeFilenameSegment };

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export type InvitationCardInput = {
  guestName: string;
  coupleNames: string;
  weddingDate: string | null;
  ceremonyVenue: string | null;
  inviteUrl: string;
};

export async function renderInvitationCardPng(
  input: InvitationCardInput,
): Promise<Buffer> {
  const { serif, sans } = await loadFonts();

  // Error correction level M (or higher) — printed cards get creased and
  // photographed in bad light, per the spec.
  const qrDataUrl = await QRCode.toDataURL(input.inviteUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: COLORS.ink, light: "#00000000" },
  });

  const dateLabel = formatDate(input.weddingDate);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.canvas,
          padding: 72,
          fontFamily: "sans",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              fontFamily: "sans",
              fontSize: 20,
              letterSpacing: 3,
              color: COLORS.inkSecondary,
              textTransform: "lowercase",
            }}
          >
            you&apos;re invited to
          </div>
          <div
            style={{
              fontFamily: "serif",
              fontSize: 56,
              color: COLORS.ink,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {input.coupleNames}
          </div>
          {dateLabel && (
            <div
              style={{
                fontFamily: "sans",
                fontSize: 24,
                color: COLORS.inkSecondary,
                marginTop: 20,
                textAlign: "center",
              }}
            >
              {dateLabel}
            </div>
          )}
          {input.ceremonyVenue && (
            <div
              style={{
                fontFamily: "sans",
                fontSize: 22,
                color: COLORS.inkSecondary,
                marginTop: 6,
              }}
            >
              {input.ceremonyVenue}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: COLORS.blush,
            borderRadius: 24,
            padding: 40,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} width={360} height={360} alt="" />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              fontFamily: "sans",
              fontSize: 20,
              color: COLORS.inkSecondary,
            }}
          >
            hi
          </div>
          <div
            style={{
              fontFamily: "serif",
              fontSize: 40,
              color: COLORS.accentInk,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {input.guestName}
          </div>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: [
        { name: "serif", data: serif, weight: 400, style: "normal" },
        { name: "sans", data: sans, weight: 400, style: "normal" },
      ],
    },
  );

  const arrayBuffer = await image.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
