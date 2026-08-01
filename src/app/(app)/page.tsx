import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STAGES = ["onboarding", "building", "live", "post_wedding", "archived"] as const;

function formatDate(date: string | null) {
  if (!date) return "No date set";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STAGE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  building: "Building",
  live: "Live",
  post_wedding: "Post-wedding",
  archived: "Archived",
};

export default async function EngagementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const { q, stage } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user!.id)
    .single();

  let query = supabase
    .from("engagements")
    .select(
      "id, display_name, wedding_date, stage, assigned_to_profile:users!engagements_assigned_to_fkey(full_name)",
    )
    .order("wedding_date", { ascending: true, nullsFirst: false });

  if (stage) {
    query = query.eq("stage", stage);
  }
  if (q) {
    query = query.ilike("display_name", `%${q}%`);
  }

  const { data: engagements, error } = await query;

  const isAccount = profile?.global_role === "account";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Engagements</h1>
        {isAccount && (
          <Link
            href="/engagements/new"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New engagement
          </Link>
        )}
      </div>

      <form className="mb-4 flex gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <select
          name="stage"
          defaultValue={stage ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Filter
        </button>
        {(q || stage) && (
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700"
          >
            Clear
          </Link>
        )}
      </form>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load engagements: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Couple</th>
              <th className="px-4 py-3 font-medium">Wedding date</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 font-medium">Site</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {engagements?.length ? (
              engagements.map((engagement) => (
                <tr key={engagement.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/engagements/${engagement.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {engagement.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatDate(engagement.wedding_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                      {STAGE_LABELS[engagement.stage] ?? engagement.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {(
                      engagement.assigned_to_profile as unknown as {
                        full_name: string | null;
                      } | null
                    )?.full_name || "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">—</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No engagements found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
