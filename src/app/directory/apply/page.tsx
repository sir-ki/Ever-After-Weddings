import { submitVendorApplication } from "./actions";

const CATEGORIES = [
  { value: "photo", label: "Photography" },
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "florals", label: "Florals" },
  { value: "hmua", label: "Hair & makeup" },
  { value: "cake", label: "Cake" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

export default async function VendorApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { error, submitted } = await searchParams;

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">Thanks for applying</h1>
        <p className="mt-2 text-sm text-neutral-500">
          We&apos;ll be in touch once your listing has been reviewed.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-neutral-900">List your business</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Free to be listed. We just need a few details and some photos.
      </p>

      <form action={submitVendorApplication} className="mt-6 space-y-4">
        <div>
          <label className={labelClass}>Business name</label>
          <input name="business_name" type="text" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" rows={4} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Rate from</label>
            <input name="rate_from" type="number" min={0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rate to</label>
            <input name="rate_to" type="number" min={0} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Rate note</label>
          <input
            name="rate_note"
            type="text"
            placeholder="per event, packages from…"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Contact phone</label>
          <input name="contact_phone" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Contact email</label>
          <input name="contact_email" type="email" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Photo URLs (one per line)</label>
          <textarea name="photo_urls" rows={4} className={`${inputClass} font-mono`} />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Submit application
        </button>
      </form>
    </div>
  );
}
