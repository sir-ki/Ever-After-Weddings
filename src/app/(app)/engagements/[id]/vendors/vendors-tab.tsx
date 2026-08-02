import { createClient } from "@/lib/supabase/server";
import {
  addEngagementVendor,
  toggleEngagementVendorCredit,
  deleteEngagementVendor,
} from "./actions";

const CATEGORIES = ["photo", "venue", "catering", "florals", "hmua", "cake", "music", "other"];

export default async function VendorsTab({
  engagementId,
  error,
}: {
  engagementId: string;
  error?: string;
}) {
  const supabase = await createClient();

  const [{ data: booked }, { data: directory }] = await Promise.all([
    supabase
      .from("engagement_vendors")
      .select(
        "id, business_name, category, contact_phone, contact_email, notes, credit_on_site, vendor_id",
      )
      .eq("engagement_id", engagementId)
      .order("business_name"),
    supabase
      .from("vendors")
      .select("id, business_name, category")
      .eq("status", "approved")
      .order("business_name"),
  ]);

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <div>
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-neutral-900">Add a supplier</h3>
        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <form action={addEngagementVendor} className="space-y-3">
          <input type="hidden" name="engagement_id" value={engagementId} />
          <div>
            <label className={labelClass}>From the directory (optional)</label>
            <select name="vendor_id" defaultValue="" className={inputClass}>
              <option value="">Off-platform — enter details below</option>
              {directory?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.business_name} ({v.category})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Business name</label>
              <input name="business_name" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" defaultValue="other" className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Contact phone</label>
              <input name="contact_phone" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact email</label>
              <input name="contact_email" type="text" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={2} className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add supplier
          </button>
        </form>
      </div>

      {booked?.length ? (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Business</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Contact</th>
              <th className="py-2 pr-3 font-medium">Credit on site</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {booked.map((v) => (
              <tr key={v.id}>
                <td className="py-2 pr-3 text-neutral-900">
                  {v.business_name}
                  {v.vendor_id && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      Directory
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-neutral-600">{v.category}</td>
                <td className="py-2 pr-3 text-neutral-600">
                  {v.contact_phone || v.contact_email || "—"}
                </td>
                <td className="py-2 pr-3">
                  <form action={toggleEngagementVendorCredit}>
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="id" value={v.id} />
                    <input
                      type="hidden"
                      name="credit_on_site"
                      value={v.credit_on_site ? "" : "on"}
                    />
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.credit_on_site
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {v.credit_on_site ? "Credited" : "Not credited"}
                    </button>
                  </form>
                </td>
                <td className="py-2">
                  <form action={deleteEngagementVendor} className="text-right">
                    <input type="hidden" name="engagement_id" value={engagementId} />
                    <input type="hidden" name="id" value={v.id} />
                    <button
                      type="submit"
                      className="text-sm text-neutral-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No suppliers logged yet.
        </p>
      )}
    </div>
  );
}
