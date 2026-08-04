import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveVendor, rejectVendor, sendBackVendor, updateVendor } from "./actions";

const CATEGORIES = ["photo", "venue", "catering", "florals", "hmua", "cake", "music", "other"];

type Vendor = {
  id: string;
  business_name: string;
  category: string;
  description: string | null;
  rate_from: number | null;
  rate_to: number | null;
  rate_note: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  review_note: string | null;
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <form action={updateVendor} className="space-y-3">
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <input
          type="hidden"
          name="was_approved"
          value={vendor.status === "approved" ? "on" : ""}
        />
        <div className="flex items-center justify-between gap-3">
          <input
            name="business_name"
            type="text"
            defaultValue={vendor.business_name}
            className={inputClass}
          />
          {statusBadge(vendor.status)}
        </div>
        <select name="category" defaultValue={vendor.category} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          name="description"
          rows={2}
          defaultValue={vendor.description ?? ""}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="rate_from"
            type="number"
            defaultValue={vendor.rate_from ?? ""}
            placeholder="Rate from"
            className={inputClass}
          />
          <input
            name="rate_to"
            type="number"
            defaultValue={vendor.rate_to ?? ""}
            placeholder="Rate to"
            className={inputClass}
          />
        </div>
        <input
          name="rate_note"
          type="text"
          defaultValue={vendor.rate_note ?? ""}
          placeholder="Rate note"
          className={inputClass}
        />
        <input
          name="contact_phone"
          type="text"
          defaultValue={vendor.contact_phone ?? ""}
          placeholder="Contact phone"
          className={inputClass}
        />
        <input
          name="contact_email"
          type="text"
          defaultValue={vendor.contact_email ?? ""}
          placeholder="Contact email"
          className={inputClass}
        />
        {vendor.review_note && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Note: {vendor.review_note}
          </p>
        )}
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save changes
        </button>
      </form>

      <div className="mt-3 flex items-end gap-2 border-t border-neutral-100 pt-3">
        <form action={approveVendor}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Approve
          </button>
        </form>
        <form action={sendBackVendor} className="flex flex-1 gap-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input
            name="review_note"
            type="text"
            placeholder="What needs to change…"
            className={inputClass}
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Send back
          </button>
        </form>
        <form action={rejectVendor}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-red-50 hover:text-red-700"
          >
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function VendorReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMessage } = await searchParams;
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

  if (profile?.global_role !== "account") {
    redirect("/dashboard");
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select(
      "id, business_name, category, description, rate_from, rate_to, rate_note, contact_phone, contact_email, status, review_note",
    )
    .order("business_name");

  const pending = (vendors ?? []).filter((v) => v.status === "pending");
  const approved = (vendors ?? []).filter((v) => v.status === "approved");
  const rejected = (vendors ?? []).filter((v) => v.status === "rejected");

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Vendor review</h1>

      {errorMessage && (
        <p className="mb-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase text-neutral-500">
        Pending ({pending.length})
      </h2>
      <div className="mb-8 space-y-4">
        {pending.length ? (
          pending.map((v) => <VendorCard key={v.id} vendor={v} />)
        ) : (
          <p className="text-sm text-neutral-400">Nothing waiting on review.</p>
        )}
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase text-neutral-500">
        Approved ({approved.length})
      </h2>
      <div className="mb-8 space-y-4">
        {approved.length ? (
          approved.map((v) => <VendorCard key={v.id} vendor={v} />)
        ) : (
          <p className="text-sm text-neutral-400">No approved listings yet.</p>
        )}
      </div>

      {rejected.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase text-neutral-500">
            Rejected ({rejected.length})
          </h2>
          <div className="space-y-4">
            {rejected.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
