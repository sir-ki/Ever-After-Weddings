import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Scanner from "./scanner";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: checkpoints }, { data: guests }] = await Promise.all([
    supabase
      .from("checkpoints")
      .select("id, name, sort_order")
      .eq("engagement_id", id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("guests")
      .select("id, full_name, rsvp_status")
      .eq("engagement_id", id)
      .is("archived_at", null)
      .order("full_name"),
  ]);

  const backLink = `/engagements/${id}?tab=checkpoints`;

  if (!checkpoints?.length) {
    return (
      <div className="max-w-md">
        <Link href={backLink} className="text-sm text-neutral-500 hover:underline">
          ← Checkpoints
        </Link>
        <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          No active checkpoints configured yet. Add one first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href={backLink} className="text-sm text-neutral-500 hover:underline">
        ← Checkpoints
      </Link>
      <Scanner engagementId={id} checkpoints={checkpoints} guests={guests ?? []} />
    </div>
  );
}
