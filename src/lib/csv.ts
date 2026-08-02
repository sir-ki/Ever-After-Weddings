// No CSV writer existed anywhere in the codebase before Part 7 —
// parseGuestRows (src/app/(app)/engagements/[id]/guests/actions.ts) is
// CSV parsing for bulk import, not generation.
function escapeField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(","));
  return lines.join("\r\n") + "\r\n";
}
