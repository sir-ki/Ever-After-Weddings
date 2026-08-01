// Renders a couple's site from its site_sections rows. Shared by the
// public route (/s/[slug]) and the couple's read-only preview in the
// workspace, so both surfaces always show exactly the same page.
//
// Per docs/ever-after-template-spec.md §6 (empty/edge states): a
// section with no real content renders nothing, never an empty
// heading. Per §3.5, the RSVP section is guest-view only and is
// skipped here entirely — the personalized token merge lands in
// Milestone 6.

export type HeroContent = {
  headline?: string;
  subhead?: string;
  image_url?: string;
  show_countdown?: boolean;
};
export type StoryContent = { heading?: string; body?: string; image_url?: string };
export type TheDayContent = {
  ceremony_venue?: string;
  ceremony_address?: string;
  ceremony_time?: string;
  reception_venue?: string;
  reception_address?: string;
  reception_time?: string;
  map_embed_url?: string;
  travel_note?: string;
};
export type RsvpContent = { heading?: string; intro?: string };
export type GalleryContent = { heading?: string; media_urls?: string[]; layout?: string };
export type DetailsContent = {
  dress_code?: string;
  dress_code_note?: string;
  children_policy?: string;
  gifts_note?: string;
  parking_note?: string;
  faq?: { question: string; answer: string }[];
};
export type SuppliersContent = { heading?: string };
export type SupplierCredit = {
  business_name: string;
  category: string;
  contact_phone: string | null;
  contact_email: string | null;
};

export type SiteSectionRow = {
  section_type: string;
  content: unknown;
  is_visible: boolean;
  sort_order: number;
};

function formatTime(time?: string): string | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}

export default function SiteRenderer({
  sections,
  fallbackHeadline,
  weddingDate,
  suppliers,
}: {
  sections: SiteSectionRow[];
  fallbackHeadline: string;
  weddingDate: string | null;
  suppliers: SupplierCredit[];
}) {
  const byType = new Map(sections.map((s) => [s.section_type, s]));

  const hero = byType.get("hero");
  const heroContent = (hero?.content ?? {}) as HeroContent;

  const story = byType.get("story");
  const storyContent = (story?.content ?? {}) as StoryContent;
  const showStory = story?.is_visible && !!storyContent.body;

  const theDay = byType.get("the_day");
  const theDayContent = (theDay?.content ?? {}) as TheDayContent;
  const showTheDay =
    theDay?.is_visible &&
    !!(theDayContent.ceremony_venue || theDayContent.ceremony_address || theDayContent.ceremony_time);
  const showReception = !!(
    theDayContent.reception_venue ||
    theDayContent.reception_address ||
    theDayContent.reception_time
  );

  const gallery = byType.get("gallery");
  const galleryContent = (gallery?.content ?? {}) as GalleryContent;
  const showGallery = gallery?.is_visible && (galleryContent.media_urls?.length ?? 0) > 0;

  const details = byType.get("details");
  const detailsContent = (details?.content ?? {}) as DetailsContent;
  const showDetails =
    details?.is_visible &&
    !!(
      detailsContent.dress_code ||
      detailsContent.children_policy ||
      detailsContent.gifts_note ||
      detailsContent.parking_note ||
      (detailsContent.faq?.length ?? 0) > 0
    );

  const suppliersSection = byType.get("suppliers");
  const suppliersContent = (suppliersSection?.content ?? {}) as SuppliersContent;
  const showSuppliers = suppliersSection?.is_visible && suppliers.length > 0;

  const days = heroContent.show_countdown ? daysUntil(weddingDate) : null;

  return (
    <div className="min-h-screen bg-rose-50">
      <section className="bg-white px-6 py-20 text-center">
        <h1 className="text-3xl font-semibold text-neutral-900 sm:text-4xl">
          {heroContent.headline || fallbackHeadline}
        </h1>
        {heroContent.subhead && (
          <p className="mt-3 text-lg text-neutral-600">{heroContent.subhead}</p>
        )}
        {days !== null && (
          <p className="mt-4 text-sm font-medium text-rose-700">
            {days === 0 ? "Today's the day" : `${days} day${days === 1 ? "" : "s"} to go`}
          </p>
        )}
      </section>

      {showStory && (
        <section className="mx-auto max-w-2xl px-6 py-16">
          <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
            {storyContent.heading || "Our story"}
          </h2>
          <p className="whitespace-pre-line text-neutral-700">{storyContent.body}</p>
        </section>
      )}

      {showTheDay && (
        <section className="bg-white px-6 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The day</h2>
            <div className="space-y-4 text-neutral-700">
              <div>
                <p className="font-medium text-neutral-900">Ceremony</p>
                {theDayContent.ceremony_venue && <p>{theDayContent.ceremony_venue}</p>}
                {theDayContent.ceremony_address && <p>{theDayContent.ceremony_address}</p>}
                {theDayContent.ceremony_time && <p>{formatTime(theDayContent.ceremony_time)}</p>}
              </div>
              {showReception && (
                <div>
                  <p className="font-medium text-neutral-900">Reception</p>
                  {theDayContent.reception_venue && <p>{theDayContent.reception_venue}</p>}
                  {theDayContent.reception_address && <p>{theDayContent.reception_address}</p>}
                  {theDayContent.reception_time && (
                    <p>{formatTime(theDayContent.reception_time)}</p>
                  )}
                </div>
              )}
              {theDayContent.travel_note && (
                <p className="text-sm text-neutral-500">{theDayContent.travel_note}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {showGallery && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
            {galleryContent.heading || "Gallery"}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {galleryContent.media_urls?.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="aspect-square w-full rounded-md object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {showDetails && (
        <section className="bg-white px-6 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">Details</h2>
            <div className="space-y-3 text-neutral-700">
              {detailsContent.dress_code && (
                <p>
                  <span className="font-medium text-neutral-900">Dress code: </span>
                  {detailsContent.dress_code}
                  {detailsContent.dress_code_note ? ` — ${detailsContent.dress_code_note}` : ""}
                </p>
              )}
              {detailsContent.children_policy && (
                <p>
                  <span className="font-medium text-neutral-900">Children: </span>
                  {detailsContent.children_policy}
                </p>
              )}
              {detailsContent.gifts_note && (
                <p>
                  <span className="font-medium text-neutral-900">Gifts: </span>
                  {detailsContent.gifts_note}
                </p>
              )}
              {detailsContent.parking_note && (
                <p>
                  <span className="font-medium text-neutral-900">Parking: </span>
                  {detailsContent.parking_note}
                </p>
              )}
              {(detailsContent.faq?.length ?? 0) > 0 && (
                <div className="pt-2">
                  {detailsContent.faq!.map((item) => (
                    <div key={item.question} className="mb-3">
                      <p className="font-medium text-neutral-900">{item.question}</p>
                      <p>{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showSuppliers && (
        <section className="mx-auto max-w-2xl px-6 py-16">
          <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
            {suppliersContent.heading || "Suppliers"}
          </h2>
          <ul className="space-y-3 text-neutral-700">
            {suppliers.map((s, i) => (
              <li key={i}>
                <p className="font-medium text-neutral-900">{s.business_name}</p>
                <p className="text-sm text-neutral-500">
                  {s.category}
                  {s.contact_phone ? ` · ${s.contact_phone}` : ""}
                  {s.contact_email ? ` · ${s.contact_email}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
