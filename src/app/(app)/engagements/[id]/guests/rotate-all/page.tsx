import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rotateAllGuestTokens } from "../actions";

export default async function RotateAllGuestTokensPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { count } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("engagement_id", id);

  return (
    <div className="max-w-lg">
      <Link
        href={`/engagements/${id}?tab=guests`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Guest list
      </Link>
      <h1 className="mb-2 mt-2 text-xl font-semibold text-neutral-900">
        Regenerate every guest&apos;s link?
      </h1>
      <p className="mb-2 text-sm text-neutral-600">
        This immediately invalidates all {count ?? 0} guest links for this
        engagement — RSVP status, table assignments and everything else stays
        intact, but every link stops working the moment this commits.
      </p>
      <p className="mb-6 text-sm font-medium text-neutral-700">
        This also invalidates every invitation card already downloaded or
        printed for this engagement — anyone holding one will need a freshly
        downloaded card or link. This is meant for &quot;we published the
        wrong link publicly&quot; situations, not routine use.
      </p>

      <form action={rotateAllGuestTokens} className="flex gap-3">
        <input type="hidden" name="engagement_id" value={id} />
        <button
          type="submit"
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Regenerate all {count ?? 0} links
        </button>
        <Link
          href={`/engagements/${id}?tab=guests`}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </Link>
      </form>
    </div>
  );
}
