// Launch-readiness spec Part 3: proves the QR embedded in a generated
// invitation card actually decodes, using the same decode library
// (jsqr) the M7 scanner uses — not just visual inspection of the card.
//
// scripts/ runs under plain `node`, which can't parse the JSX in
// src/lib/invitation-card.tsx directly, so this reproduces that file's
// exact QR-encoding options and next/og compositing (same colors, same
// errorCorrectionLevel, same embed size) via React.createElement instead
// of JSX — a standalone proof of the same risk, not a simplified stand-in.
//
// Usage: node --env-file=.env.local scripts/verify-invitation-card.mjs
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
// "next/og" is deliberately unresolvable from plain Node (Next's package.json
// declares an empty "exports" map, blocking any subpath import outside
// Next's own bundler) — this script imports the same class from its
// underlying implementation file instead. The route handlers in src/lib/
// invitation-card.tsx use the public "next/og" import, since they run
// inside Next's own build/runtime where that resolves normally.
import { ImageResponse } from "next/dist/server/og/image-response.js";
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failed = true;
}

// The exact same regex used by
// src/app/(app)/engagements/[id]/checkpoints/actions.ts's extractToken —
// duplicated here (not imported; that file is also TSX) so this script
// proves the scanner's own parsing logic accepts the card's QR payload.
function extractToken(scannedText) {
  const trimmed = scannedText.trim();
  const match = trimmed.match(/\/r\/([^/?#]+)/);
  if (match) return match[1];
  return trimmed.length >= 16 ? trimmed : null;
}

const { data: guest } = await admin
  .from("guests")
  .select("id, full_name, invite_token")
  .eq("full_name", "Ana Reyes")
  .maybeSingle();

if (!guest) {
  console.error("Seeded guest 'Ana Reyes' not found. Run `npm run seed` first.");
  process.exit(1);
}

const inviteUrl = `${SITE_URL}/r/${guest.invite_token}`;

// Same options as renderInvitationCardPng in src/lib/invitation-card.tsx.
const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
  errorCorrectionLevel: "M",
  margin: 1,
  width: 480,
  color: { dark: "#3D2E2B", light: "#00000000" },
});

const fontsDir = path.join(process.cwd(), "src/assets/fonts");
const [serif, sans] = await Promise.all([
  readFile(path.join(fontsDir, "PTSerif-Regular.ttf")),
  readFile(path.join(fontsDir, "PTSans-Regular.ttf")),
]);

const e = React.createElement;

const cardElement = e(
  "div",
  {
    style: {
      width: 1080,
      height: 1350,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#FDFAF7",
      padding: 72,
      fontFamily: "sans",
    },
  },
  e(
    "div",
    { style: { display: "flex", flexDirection: "column", alignItems: "center" } },
    e(
      "div",
      { style: { fontFamily: "serif", fontSize: 56, color: "#3D2E2B" } },
      "Maria & Jon",
    ),
  ),
  e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#F9EFEA",
        borderRadius: 24,
        padding: 40,
      },
    },
    e("img", { src: qrDataUrl, width: 360, height: 360 }),
  ),
  e(
    "div",
    { style: { display: "flex", flexDirection: "column", alignItems: "center" } },
    e(
      "div",
      { style: { fontFamily: "serif", fontSize: 40, color: "#8E4A48" } },
      guest.full_name,
    ),
  ),
);

const image = new ImageResponse(cardElement, {
  width: 1080,
  height: 1350,
  fonts: [
    { name: "serif", data: serif, weight: 400, style: "normal" },
    { name: "sans", data: sans, weight: 400, style: "normal" },
  ],
});

const arrayBuffer = await image.arrayBuffer();
const cardPng = Buffer.from(arrayBuffer);

check("card PNG was generated and is non-trivial in size", cardPng.length > 10_000);

const png = PNG.sync.read(cardPng);
const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

check("jsQR decodes a QR code somewhere in the generated card", !!decoded);

if (decoded) {
  check(
    "the decoded payload is exactly the guest's /r/[token] URL",
    decoded.data === inviteUrl,
  );

  const extracted = extractToken(decoded.data);
  check(
    "the scanner's own extractToken() parses the decoded payload back to the guest's real token",
    extracted === guest.invite_token,
  );
}

if (failed) {
  console.error("\nInvitation card QR verification FAILED.");
  process.exit(1);
}
console.log("\nAll invitation card QR checks passed.");
