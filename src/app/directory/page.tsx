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
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Vendor directory</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Suppliers we&apos;ve worked with, or who&apos;ve applied to be listed.
          </p>
        </div>
        <Link
          href="/directory/apply"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          List your business
        </Link>
      </div>

      <form method="get" className="mb-6 flex gap-2">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
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
              <div key={vendor.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                {photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photos[0].photo_url}
                    alt=""
                    className="mb-3 aspect-video w-full rounded-md object-cover"
                  />
                )}
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">{vendor.business_name}</h3>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {vendor.category}
                  </span>
                </div>
                {vendor.description && (
                  <p className="mb-2 text-sm text-neutral-600">{vendor.description}</p>
                )}
                {(vendor.rate_from || vendor.rate_to) && (
                  <p className="text-sm text-neutral-500">
                    {vendor.rate_from ? `From ${vendor.rate_from}` : ""}
                    {vendor.rate_to ? ` to ${vendor.rate_to}` : ""}
                    {vendor.rate_note ? ` — ${vendor.rate_note}` : ""}
                  </p>
                )}
                <div className="mt-2 text-sm text-neutral-500">
                  {vendor.contact_phone && <p>{vendor.contact_phone}</p>}
                  {vendor.contact_email && <p>{vendor.contact_email}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          No vendors listed in this category yet.
        </p>
      )}
    </div>
  );
}
