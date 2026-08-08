import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { updateOwnVendorProfile } from "./actions";

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

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export default async function VendorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user.id)
    .single();

  if (profile?.global_role !== "vendor") {
    redirect("/dashboard");
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select(
      "id, business_name, category, description, rate_from, rate_to, rate_note, contact_phone, contact_email, status, review_note",
    )
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const { data: photos } = vendor
    ? await supabase
        .from("vendor_photos")
        .select("photo_url")
        .eq("vendor_id", vendor.id)
        .order("sort_order")
    : { data: [] };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold text-neutral-900">Ever After — Vendor</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Your listing</h1>

        {!vendor ? (
          <p className="mt-4 text-sm text-neutral-500">
            No directory listing is linked to your account. Contact Ever After to have one set up.
          </p>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-2">
              {statusBadge(vendor.status)}
              <span className="text-xs text-neutral-400">
                {vendor.status === "approved"
                  ? "Live in the directory. Saving changes moves it back to pending review."
                  : vendor.status === "pending"
                    ? "Waiting on Ever After's review."
                    : "Not currently listed."}
              </span>
            </div>
            {vendor.review_note && (
              <p className="mb-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
                Note from Ever After: {vendor.review_note}
              </p>
            )}

            <form action={updateOwnVendorProfile} className="space-y-4">
              <div>
                <label className={labelClass}>Business name</label>
                <input
                  name="business_name"
                  type="text"
                  required
                  defaultValue={vendor.business_name}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select name="category" defaultValue={vendor.category} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={vendor.description ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Rate from</label>
                  <input
                    name="rate_from"
                    type="number"
                    min={0}
                    defaultValue={vendor.rate_from ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Rate to</label>
                  <input
                    name="rate_to"
                    type="number"
                    min={0}
                    defaultValue={vendor.rate_to ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Rate note</label>
                <input
                  name="rate_note"
                  type="text"
                  placeholder="per event, packages from…"
                  defaultValue={vendor.rate_note ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact phone</label>
                <input
                  name="contact_phone"
                  type="text"
                  defaultValue={vendor.contact_phone ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input
                  name="contact_email"
                  type="email"
                  defaultValue={vendor.contact_email ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Photo URLs (one per line)</label>
                <textarea
                  name="photo_urls"
                  rows={4}
                  defaultValue={(photos ?? []).map((p) => p.photo_url).join("\n")}
                  className={`${inputClass} font-mono`}
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              {saved && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
              )}

              <button
                type="submit"
                className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Save changes
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
