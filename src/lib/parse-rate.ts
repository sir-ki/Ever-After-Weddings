// Number("not-a-number") is NaN, and JSON.stringify(NaN) is "null" — so a
// typo'd rate field was silently becoming a null column instead of an
// error. Throws instead, so callers can redirect back with a message.
export class InvalidRateError extends Error {}

export function parseOptionalRate(raw: FormDataEntryValue | null, label: string): number | null {
  const trimmed = (raw as string | null)?.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new InvalidRateError(`${label} must be a number.`);
  }
  return value;
}
