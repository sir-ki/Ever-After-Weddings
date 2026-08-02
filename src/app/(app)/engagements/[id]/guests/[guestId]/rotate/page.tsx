import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rotateGuestToken } from "../../actions";

export default async function RotateGuestTokenPage({
  params,
}: {
  params: Promise<{ id: string; guestId: string }>;
}) {
  const { id, guestId } = await params;
  const supabase = await createClient();

  const { data: guest } = await supabase
    .from("guests")
    .select("id, full_name, invite_token")
    .eq("id", guestId)
    .eq("engagement_id", id)
    .single();

  if (!guest) {
    notFound();
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/engagements/${id}/guests/${guestId}/edit`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Back
      </Link>
      <h1 className="mb-2 mt-2 text-xl font-semibold text-neutral-900">
        Regenerate {guest.full_name}&apos;s link?
      </h1>
      <p className="mb-6 text-sm text-neutral-600">
        The current link (<code className="text-xs">/r/{guest.invite_token}</code>)
        stops working immediately — including any invitation card you&apos;ve
        already sent or printed for them. If they&apos;ve already got one,
        you&apos;ll need to send them a newly downloaded card or link.
      </p>

      <form action={rotateGuestToken} className="flex gap-3">
        <input type="hidden" name="engagement_id" value={id} />
        <input type="hidden" name="guest_id" value={guestId} />
        <button
          type="submit"
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Regenerate link
        </button>
        <Link
          href={`/engagements/${id}/guests/${guestId}/edit`}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </Link>
      </form>
    </div>
  );
}
