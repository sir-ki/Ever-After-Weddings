import { createClient } from "@/lib/supabase/server";
import SiteRenderer, {
  type SiteSectionRow,
  type HeroContent,
  type StoryContent,
  type TheDayContent,
  type RsvpContent,
  type GalleryContent,
  type DetailsContent,
  type SuppliersContent,
  type EntourageContent,
  type FooterContent,
} from "@/components/site-renderer";
import { ptSerif, ptSans } from "@/lib/guest-fonts";
import { ACCENT_PRESETS, resolveAccentPreset } from "@/lib/site-themes";
import {
  createSite,
  updateSiteSection,
  updateSiteSlug,
  updateSiteTheme,
  uploadHeroImage,
  uploadStoryImage,
  uploadGalleryPhotos,
  publishSite,
  unpublishSite,
} from "./actions";

function find(sections: SiteSectionRow[], type: string) {
  return sections.find((s) => s.section_type === type);
}

function themeStyle(preset: ReturnType<typeof resolveAccentPreset>): React.CSSProperties {
  const t = preset.tokens;
  return {
    "--ea-canvas": t.canvas,
    "--ea-blush": t.blush,
    "--ea-champagne": t.champagne,
    "--ea-border": t.border,
    "--ea-ink": t.ink,
    "--ea-ink-secondary": t.inkSecondary,
    "--ea-ink-muted": t.inkMuted,
    "--ea-accent": t.accent,
    "--ea-accent-ink": t.accentInk,
  } as React.CSSProperties;
}

export default async function SiteTab({
  engagementId,
  searchParams,
}: {
  engagementId: string;
  searchParams: { error?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user!.id)
    .single();
  const isAccount = profile?.global_role === "account";

  const { data: engagement } = await supabase
    .from("engagements")
    .select("display_name, wedding_date")
    .eq("id", engagementId)
    .single();

  const { data: site } = await supabase
    .from("sites")
    .select("id, slug, status, published_at, theme")
    .eq("engagement_id", engagementId)
    .maybeSingle();

  if (!site) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
        {isAccount ? (
          <form action={createSite}>
            <input type="hidden" name="engagement_id" value={engagementId} />
            <p className="mb-4 text-sm text-neutral-500">No site yet.</p>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create site
            </button>
          </form>
        ) : (
          <p className="text-sm text-neutral-500">
            Your site hasn&apos;t been started yet.
          </p>
        )}
      </div>
    );
  }

  const { data: sectionsRaw } = await supabase
    .from("site_sections")
    .select("section_type, content, is_visible, sort_order")
    .eq("site_id", site.id)
    .order("sort_order");

  const sections = sectionsRaw ?? [];

  const { data: creditedSuppliers } = await supabase
    .from("engagement_vendors")
    .select("business_name, category, contact_phone, contact_email")
    .eq("engagement_id", engagementId)
    .eq("credit_on_site", true);

  const { data: entourageMembers } = await supabase
    .from("guests")
    .select("full_name, entourage_role")
    .eq("engagement_id", engagementId)
    .is("archived_at", null)
    .not("entourage_role", "is", null);

  if (!isAccount) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              site.status === "published"
                ? "bg-green-100 text-green-800"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {site.status === "published" ? "Published" : "Draft"}
          </span>
          {site.status === "published" && (
            <a
              href={`/s/${site.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 hover:underline"
            >
              View live site ↗
            </a>
          )}
        </div>
        {/* This preview must render identically to the public /s/[slug]
            page (the M5/M8 constraint SiteRenderer is already built to
            honor) — so it gets the same guest-facing theme scope as the
            public route, even though it lives under (app)/*. Nothing
            else in this file, or elsewhere under (app)/*, gets this
            class. */}
        <div
          className={`ea-theme ${ptSerif.variable} ${ptSans.variable} overflow-hidden rounded-lg border border-neutral-200`}
          style={themeStyle(resolveAccentPreset(site.theme))}
        >
          <SiteRenderer
            sections={sections}
            fallbackHeadline={engagement?.display_name ?? ""}
            weddingDate={engagement?.wedding_date ?? null}
            suppliers={creditedSuppliers ?? []}
            entourage={entourageMembers ?? []}
          />
        </div>
      </div>
    );
  }

  const hero = find(sections, "hero");
  const heroContent = (hero?.content ?? {}) as HeroContent;
  const story = find(sections, "story");
  const storyContent = (story?.content ?? {}) as StoryContent;
  const theDay = find(sections, "the_day");
  const theDayContent = (theDay?.content ?? {}) as TheDayContent;
  const rsvp = find(sections, "rsvp");
  const rsvpContent = (rsvp?.content ?? {}) as RsvpContent;
  const gallery = find(sections, "gallery");
  const galleryContent = (gallery?.content ?? {}) as GalleryContent;
  const details = find(sections, "details");
  const detailsContent = (details?.content ?? {}) as DetailsContent;
  const suppliers = find(sections, "suppliers");
  const suppliersContent = (suppliers?.content ?? {}) as SuppliersContent;
  const entourageSection = find(sections, "entourage");
  const entourageContent = (entourageSection?.content ?? {}) as EntourageContent;
  const footer = find(sections, "footer");
  const footerContent = (footer?.content ?? {}) as FooterContent;

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <div className="max-w-2xl space-y-8">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                site.status === "published"
                  ? "bg-green-100 text-green-800"
                  : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {site.status === "published" ? "Published" : "Draft"}
            </span>
            <a
              href={`/s/${site.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 hover:underline"
            >
              /s/{site.slug} ↗
            </a>
          </div>
          <form action={site.status === "published" ? unpublishSite : publishSite}>
            <input type="hidden" name="engagement_id" value={engagementId} />
            <input type="hidden" name="site_id" value={site.id} />
            <button
              type="submit"
              className={
                site.status === "published"
                  ? "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  : "rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              }
            >
              {site.status === "published" ? "Unpublish" : "Publish"}
            </button>
          </form>
        </div>

        <form
          action={updateSiteSlug}
          className="mt-4 flex items-end gap-3 border-t border-neutral-100 pt-4"
        >
          <input type="hidden" name="engagement_id" value={engagementId} />
          <input type="hidden" name="site_id" value={site.id} />
          <div className="flex-1">
            <label className={labelClass}>Site address</label>
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              <span>/s/</span>
              <input name="slug" type="text" defaultValue={site.slug} className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Save address
          </button>
        </form>

        {searchParams.error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchParams.error}
          </p>
        )}
      </div>

      {/* Theme — curated accent presets, no free color picker. Applies to
          the wedding site, RSVP/day-of hub, the invitation card, and
          place cards/table numbers. Internal tools and the vendor
          directory/invite pages never follow this. */}
      <form
        action={updateSiteTheme}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <h3 className="mb-4 font-medium text-neutral-900">Theme</h3>
        <div className="grid grid-cols-4 gap-3">
          {ACCENT_PRESETS.map((preset) => {
            const selected = resolveAccentPreset(site.theme).key === preset.key;
            return (
              <label
                key={preset.key}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border p-3 text-center ${
                  selected ? "border-neutral-900" : "border-neutral-200"
                }`}
              >
                <input
                  type="radio"
                  name="accent"
                  value={preset.key}
                  defaultChecked={selected}
                  className="sr-only"
                />
                <span
                  className="h-8 w-8 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.tokens.accent }}
                />
                <span className="text-xs font-medium text-neutral-700">{preset.label}</span>
              </label>
            );
          })}
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      {/* Hero — always visible, cannot be hidden */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="hero" />
        <h3 className="mb-4 font-medium text-neutral-900">Hero</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Headline</label>
            <input
              name="headline"
              type="text"
              maxLength={40}
              defaultValue={heroContent.headline}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Subhead</label>
            <input
              name="subhead"
              type="text"
              defaultValue={heroContent.subhead}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Hero image URL</label>
            <input
              name="image_url"
              type="text"
              defaultValue={heroContent.image_url}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="show_countdown"
              defaultChecked={heroContent.show_countdown}
            />
            Show countdown to the wedding date
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      <form
        action={uploadHeroImage}
        encType="multipart/form-data"
        className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <label className="text-xs text-neutral-500">Or upload a photo</label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          className="flex-1 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Upload
        </button>
      </form>

      {/* Our story */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="story" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Our story</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" name="is_visible" defaultChecked={story?.is_visible} />
            Visible
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Heading</label>
            <input
              name="heading"
              type="text"
              defaultValue={storyContent.heading}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Story (up to three short paragraphs)</label>
            <textarea
              name="body"
              rows={5}
              defaultValue={storyContent.body}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Photo URL</label>
            <input
              name="image_url"
              type="text"
              defaultValue={storyContent.image_url}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      <form
        action={uploadStoryImage}
        encType="multipart/form-data"
        className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <label className="text-xs text-neutral-500">Or upload a photo</label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          className="flex-1 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Upload
        </button>
      </form>

      {/* The day */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="the_day" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">The day</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" name="is_visible" defaultChecked={theDay?.is_visible} />
            Visible
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Ceremony venue</label>
            <input
              name="ceremony_venue"
              type="text"
              defaultValue={theDayContent.ceremony_venue}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ceremony address</label>
            <input
              name="ceremony_address"
              type="text"
              defaultValue={theDayContent.ceremony_address}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ceremony time</label>
            <input
              name="ceremony_time"
              type="time"
              defaultValue={theDayContent.ceremony_time}
              className={inputClass}
            />
          </div>
          <div />
          <div>
            <label className={labelClass}>Reception venue</label>
            <input
              name="reception_venue"
              type="text"
              defaultValue={theDayContent.reception_venue}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Reception address</label>
            <input
              name="reception_address"
              type="text"
              defaultValue={theDayContent.reception_address}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Reception time</label>
            <input
              name="reception_time"
              type="time"
              defaultValue={theDayContent.reception_time}
              className={inputClass}
            />
          </div>
          <div />
          <div className="col-span-2">
            <label className={labelClass}>Map embed URL</label>
            <input
              name="map_embed_url"
              type="text"
              defaultValue={theDayContent.map_embed_url}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Travel / parking note</label>
            <textarea
              name="travel_note"
              rows={2}
              defaultValue={theDayContent.travel_note}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      {/* RSVP */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="rsvp" />
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">RSVP</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" name="is_visible" defaultChecked={rsvp?.is_visible} />
            Visible
          </label>
        </div>
        <p className="mb-4 text-xs text-neutral-400">
          Guests RSVP through their personal link, not the public site. This
          section appears there once the guest view is built (Milestone 6).
        </p>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Heading</label>
            <input
              name="heading"
              type="text"
              defaultValue={rsvpContent.heading}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Intro</label>
            <textarea
              name="intro"
              rows={2}
              defaultValue={rsvpContent.intro}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      {/* Gallery */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="gallery" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Gallery</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" name="is_visible" defaultChecked={gallery?.is_visible} />
            Visible
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Heading</label>
            <input
              name="heading"
              type="text"
              defaultValue={galleryContent.heading}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Photo URLs (one per line, 6–12)</label>
            <textarea
              name="media_urls"
              rows={5}
              defaultValue={(galleryContent.media_urls ?? []).join("\n")}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Layout</label>
            <select
              name="layout"
              defaultValue={galleryContent.layout || "grid"}
              className={inputClass}
            >
              <option value="grid">Grid</option>
              <option value="masonry">Masonry</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      <form
        action={uploadGalleryPhotos}
        encType="multipart/form-data"
        className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <label className="text-xs text-neutral-500">Or upload photos</label>
        <input
          type="file"
          name="files"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="flex-1 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Upload
        </button>
      </form>

      {/* Details */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="details" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Details</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" name="is_visible" defaultChecked={details?.is_visible} />
            Visible
          </label>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Dress code</label>
              <input
                name="dress_code"
                type="text"
                defaultValue={detailsContent.dress_code}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Dress code note</label>
              <input
                name="dress_code_note"
                type="text"
                defaultValue={detailsContent.dress_code_note}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Children policy</label>
            <input
              name="children_policy"
              type="text"
              defaultValue={detailsContent.children_policy}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Gifts note</label>
            <input
              name="gifts_note"
              type="text"
              defaultValue={detailsContent.gifts_note}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Parking note</label>
            <input
              name="parking_note"
              type="text"
              defaultValue={detailsContent.parking_note}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              FAQ — one per line, as <code>Question | Answer</code> (up to 6)
            </label>
            <textarea
              name="faq"
              rows={4}
              defaultValue={(detailsContent.faq ?? [])
                .map((f) => `${f.question} | ${f.answer}`)
                .join("\n")}
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      {/* Suppliers */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="suppliers" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Suppliers</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              name="is_visible"
              defaultChecked={suppliers?.is_visible ?? true}
            />
            Visible
          </label>
        </div>
        <p className="mb-4 text-xs text-neutral-400">
          Credits suppliers marked &ldquo;credit on site&rdquo; in the Vendors tab. No
          ratings, no reviews — just a credit list.
        </p>
        <div>
          <label className={labelClass}>Heading</label>
          <input
            name="heading"
            type="text"
            defaultValue={suppliersContent.heading}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      {/* Entourage */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="entourage" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Entourage</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              name="is_visible"
              defaultChecked={entourageSection?.is_visible ?? true}
            />
            Visible
          </label>
        </div>
        <p className="mb-4 text-xs text-neutral-400">
          Names come from the guest list&apos;s Entourage tab, grouped by role.
          Nothing to enter here except the heading and an optional intro.
        </p>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Heading</label>
            <input
              name="heading"
              type="text"
              defaultValue={entourageContent.heading}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Intro (optional)</label>
            <textarea
              name="intro"
              rows={2}
              defaultValue={entourageContent.intro}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>

      {/* Footer */}
      <form
        action={updateSiteSection}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="engagement_id" value={engagementId} />
        <input type="hidden" name="site_id" value={site.id} />
        <input type="hidden" name="section_type" value="footer" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">Footer</h3>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              name="is_visible"
              defaultChecked={footer?.is_visible ?? true}
            />
            Visible
          </label>
        </div>
        <div>
          <label className={labelClass}>Closing message</label>
          <input
            name="message"
            type="text"
            placeholder="With love, Maria & Jon"
            defaultValue={footerContent.message}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Save
        </button>
      </form>
    </div>
  );
}
