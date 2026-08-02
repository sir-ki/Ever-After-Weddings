import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GuestListTab from "./guests/guest-list-tab";
import TablesTab from "./tables/tables-tab";
import SiteTab from "./site/site-tab";
import DayOfTab from "./day-of/day-of-tab";
import CheckpointsTab from "./checkpoints/checkpoints-tab";
import VendorsTab from "./vendors/vendors-tab";
import PeopleTab from "./people/people-tab";
import EntourageTab from "./entourage/entourage-tab";
import PrintablesTab from "./printables/printables-tab";
import { updateGuestCap } from "./actions";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "guests", label: "Guest List", milestone: 2 },
  { key: "tables", label: "Tables & Seating", milestone: 4 },
  { key: "website", label: "Website", milestone: 5 },
  { key: "day-of", label: "Day-of Hub", milestone: 6 },
  { key: "checkpoints", label: "Checkpoints", milestone: 7 },
  { key: "vendors", label: "Vendors", milestone: 8 },
  { key: "people", label: "People" },
  { key: "entourage", label: "Entourage" },
  { key: "printables", label: "Printables" },
] as const;

const STAGE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  building: "Building",
  live: "Live",
  post_wedding: "Post-wedding",
  archived: "Archived",
};

function formatDate(date: string | null) {
  if (!date) return "No date set";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function EngagementWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    status?: string;
    group?: string;
    archived?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const { tab = "overview", error } = resolvedSearchParams;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select(
      "id, display_name, partner_a_name, partner_b_name, wedding_date, stage, ceremony_venue, reception_venue, expected_guest_count, guest_cap, assigned_to_profile:users!engagements_assigned_to_fkey(full_name)",
    )
    .eq("id", id)
    .single();

  if (!engagement) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentUserRow } = user
    ? await supabase.from("users").select("global_role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAccount = currentUserRow?.global_role === "account";

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const assignedName =
    (
      engagement.assigned_to_profile as unknown as {
        full_name: string | null;
      } | null
    )?.full_name || "Unassigned";

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Engagements
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">
            {engagement.display_name}
          </h1>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
            {STAGE_LABELS[engagement.stage] ?? engagement.stage}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {formatDate(engagement.wedding_date)} · Assigned to {assignedName}
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/engagements/${id}?tab=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              activeTab.key === t.key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab.key === "overview" ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-neutral-200 bg-white p-6 text-sm">
          <div>
            <dt className="text-neutral-500">Partner A</dt>
            <dd className="mt-1 text-neutral-900">
              {engagement.partner_a_name || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Partner B</dt>
            <dd className="mt-1 text-neutral-900">
              {engagement.partner_b_name || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Ceremony venue</dt>
            <dd className="mt-1 text-neutral-900">
              {engagement.ceremony_venue || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Reception venue</dt>
            <dd className="mt-1 text-neutral-900">
              {engagement.reception_venue || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Expected guests</dt>
            <dd className="mt-1 text-neutral-900">
              {engagement.expected_guest_count ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Guest cap</dt>
            {isAccount ? (
              <dd className="mt-1">
                <form
                  action={updateGuestCap}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="engagement_id" value={id} />
                  <input
                    name="guest_cap"
                    type="number"
                    min={1}
                    defaultValue={engagement.guest_cap}
                    className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Save
                  </button>
                </form>
                <p className="mt-1 text-xs text-neutral-400">
                  Advisory only — the guest list warns past this, never blocks.
                </p>
              </dd>
            ) : (
              <dd className="mt-1 text-neutral-900">{engagement.guest_cap}</dd>
            )}
          </div>
        </dl>
      ) : activeTab.key === "guests" ? (
        <GuestListTab
          engagementId={id}
          searchParams={resolvedSearchParams}
          guestCap={engagement.guest_cap}
        />
      ) : activeTab.key === "tables" ? (
        <TablesTab engagementId={id} />
      ) : activeTab.key === "website" ? (
        <SiteTab engagementId={id} searchParams={resolvedSearchParams} />
      ) : activeTab.key === "day-of" ? (
        <DayOfTab engagementId={id} />
      ) : activeTab.key === "checkpoints" ? (
        <CheckpointsTab engagementId={id} />
      ) : activeTab.key === "vendors" ? (
        <VendorsTab engagementId={id} error={error} />
      ) : activeTab.key === "people" ? (
        <PeopleTab engagementId={id} error={error} />
      ) : activeTab.key === "entourage" ? (
        <EntourageTab engagementId={id} />
      ) : activeTab.key === "printables" ? (
        <PrintablesTab engagementId={id} />
      ) : null}
    </div>
  );
}
