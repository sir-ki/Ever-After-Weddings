import { createClient } from "@/lib/supabase/server";
import SiteRenderer from "@/components/site-renderer";

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, status, engagements(display_name, wedding_date)",
    )
    .eq("slug", slug)
    .maybeSingle();

  const engagement = site?.engagements as unknown as
    | { display_name: string; wedding_date: string | null }
    | null;

  // Never a 404, never a stack trace — a neutral holding page, per
  // docs/ever-after-template-spec.md §6. `site` comes back null here
  // both when nothing exists at this slug and when RLS hid a draft
  // from a viewer who isn't Account or the couple — either way, same
  // response, so a stranger can't use this to probe for a draft site.
  if (!site || !engagement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50 px-4">
        <div className="max-w-sm text-center">
          <p className="text-lg font-medium text-neutral-900">
            This site isn&apos;t live yet.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Check back soon, or reach out to the couple directly.
          </p>
        </div>
      </div>
    );
  }

  const { data: sections } = await supabase
    .from("site_sections")
    .select("section_type, content, is_visible, sort_order")
    .eq("site_id", site.id)
    .order("sort_order");

  return (
    <>
      {site.status === "draft" && (
        <div className="bg-amber-900 px-4 py-2 text-center text-sm text-amber-50">
          Draft preview — not visible to the public until published.
        </div>
      )}
      <SiteRenderer
        sections={sections ?? []}
        fallbackHeadline={engagement.display_name}
        weddingDate={engagement.wedding_date}
      />
    </>
  );
}
