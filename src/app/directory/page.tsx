import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "photo", label: "Photography" },
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "florals", label: "Florals" },
  { value: "hmua", label: "Hair & makeup" },
  { value: "cake", label: "Cake" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("vendors")
    .select(
      "id, business_name, category, description, rate_from, rate_to, rate_note, contact_phone, contact_email, vendor_photos(photo_url, sort_order)",
    )
    .eq("status", "approved")
    .order("business_name");

  if (category) {
    query = query.eq("category", category);
  }

  const { data: vendors } = await query;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-[72px]">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="ea-font-serif text-[32px] leading-[1.2] text-[var(--ea-ink)]">
            Vendor directory
          </h1>
          <p className="mt-1 text-sm text-[var(--ea-ink-secondary)]">
            Suppliers we&apos;ve worked with, or who&apos;ve applied to be listed.
          </p>
        </div>
        <Link
          href="/directory/apply"
          className="min-h-[44px] shrink-0 rounded-[10px] bg-[var(--ea-accent)] px-4 py-2.5 text-sm font-medium text-[#FFF8F5] hover:opacity-90"
        >
          List your business
        </Link>
      </div>

      <form method="get" className="mb-6 flex gap-2">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="min-h-[44px] rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-canvas)] px-3 py-2 text-sm text-[var(--ea-ink)] focus:border-[var(--ea-accent)] focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-[44px] rounded-[10px] border border-[var(--ea-border)] px-3 py-2 text-sm font-medium text-[var(--ea-ink)] hover:bg-[var(--ea-blush)]"
        >
          Filter
        </button>
      </form>

      {vendors?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {vendors.map((vendor) => {
            const photos = (vendor.vendor_photos ?? []).slice().sort(
              (a, b) => a.sort_order - b.sort_order,
            );
            return (
              <div
                key={vendor.id}
                className="rounded-[10px] border border-[var(--ea-border)] bg-[var(--ea-blush)] p-4"
              >
                {photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photos[0].photo_url}
                    alt=""
                    className="mb-3 aspect-video w-full rounded-[10px] object-cover"
                  />
                )}
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-[var(--ea-ink)]">{vendor.business_name}</h3>
                  <span className="shrink-0 rounded-full bg-[var(--ea-champagne)] px-2 py-0.5 text-xs font-medium text-[var(--ea-accent-ink)]">
                    {vendor.category}
                  </span>
                </div>
                {vendor.description && (
                  <p className="mb-2 text-sm text-[var(--ea-ink-secondary)]">
                    {vendor.description}
                  </p>
                )}
                {(vendor.rate_from || vendor.rate_to) && (
                  <p className="text-sm text-[var(--ea-ink-muted)]">
                    {vendor.rate_from ? `From ${vendor.rate_from}` : ""}
                    {vendor.rate_to ? ` to ${vendor.rate_to}` : ""}
                    {vendor.rate_note ? ` — ${vendor.rate_note}` : ""}
                  </p>
                )}
                <div className="mt-2 text-sm text-[var(--ea-ink-muted)]">
                  {vendor.contact_phone && <p>{vendor.contact_phone}</p>}
                  {vendor.contact_email && <p>{vendor.contact_email}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-[10px] border border-dashed border-[var(--ea-border)] p-10 text-center text-sm text-[var(--ea-ink-muted)]">
          No vendors listed in this category yet.
        </p>
      )}
    </div>
  );
}
