import "server-only";
import { readFile } from "fs/promises";
import path from "path";

// Shared by every server-rendered document — the Part 3 invitation card
// and Part 7's printables. Colors/type are the Part 4 spec's own default
// tokens, hardcoded for now — sites.theme is still an untyped jsonb stub
// with no read/write anywhere in this codebase, so there's no per-couple
// convention to hook into yet. Per the launch-readiness spec, place cards
// and table numbers are meant to follow the couple's theme once one
// exists; everything else stays house palette regardless.
export const COLORS = {
  canvas: "#FDFAF7",
  blush: "#F9EFEA",
  border: "#E8DAD2",
  ink: "#3D2E2B",
  inkSecondary: "#6B5551",
  accentInk: "#8E4A48",
};

let fontsPromise: Promise<{ serif: Buffer; sans: Buffer }> | null = null;

export function loadFonts() {
  if (!fontsPromise) {
    const fontsDir = path.join(process.cwd(), "src/assets/fonts");
    fontsPromise = Promise.all([
      readFile(path.join(fontsDir, "PTSerif-Regular.ttf")),
      readFile(path.join(fontsDir, "PTSans-Regular.ttf")),
    ]).then(([serif, sans]) => ({ serif, sans }));
  }
  return fontsPromise;
}

// Filenames use guests'/couples' names, never tokens — a folder of files
// named after credentials is an avoidable leak, per the spec.
export function sanitizeFilenameSegment(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim() || "file";
}

// A plain `Content-Disposition: attachment; filename="..."` header value
// must be Latin1/ASCII — couple/guest names routinely aren't (an em dash,
// an accented name), which throws at the fetch layer rather than failing
// gracefully. RFC 5987's filename* carries the real UTF-8 name; the
// ASCII-only filename is just a fallback for older clients.
export function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
