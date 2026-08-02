import { createClient } from "@/lib/supabase/server";

function Row({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
      <div>
        <h3 className="font-medium text-neutral-900">{title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// Everything here is Account/couple-only — several of these contain the
// full guest list, the exact thing the guest-token path is designed to
// never expose. Every route below relies on the ordinary RLS-aware
// client, so nothing here is reachable without an authenticated session.
export default async function PrintablesTab({ engagementId }: { engagementId: string }) {
  const supabase = await createClient();

  const { data: checkpoints } = await supabase
    .from("checkpoints")
    .select("id, name")
    .eq("engagement_id", engagementId)
    .order("sort_order");

  const base = `/engagements/${engagementId}/printables`;

  return (
    <div className="space-y-3">
      <Row
        title="Table number signage"
        description="One print-ready A4 page per table."
        links={[{ label: "Download PDF", href: `${base}/table-numbers` }]}
      />
      <Row
        title="Place cards"
        description="Accepted guests with their table, laid out for printing and cutting."
        links={[{ label: "Download PDF", href: `${base}/place-cards` }]}
      />
      <Row
        title="Attendee sheet"
        description="Paper backup per checkpoint — accepted guests, alphabetical, with a tick column."
        links={
          checkpoints?.length
            ? checkpoints.map((c) => ({
                label: `${c.name} ↓`,
                href: `${base}/attendee-sheet/${c.id}`,
              }))
            : [{ label: "No checkpoints yet", href: "#" }]
        }
      />
      <Row
        title="Day-of call sheet"
        description="Every supplier's contact plus the run of show, on one page."
        links={[{ label: "Download PDF", href: `${base}/call-sheet` }]}
      />
      <Row
        title="Caterer headcount"
        description="Accepted guests with meal choice and dietary notes, for the caterer."
        links={[{ label: "Download CSV", href: `${base}/caterer-headcount` }]}
      />
      <Row
        title="Processional running order"
        description="For the church coordinator and the emcee."
        links={[{ label: "Download PDF", href: `${base}/processional` }]}
      />
      <Row
        title="Guest list export"
        description="Full guest list with RSVP status, table and notes."
        links={[{ label: "Download CSV", href: `${base}/guest-list` }]}
      />
    </div>
  );
}
