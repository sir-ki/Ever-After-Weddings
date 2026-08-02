"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);
  return slug || "site";
}

export async function createSite(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select(
      "display_name, ceremony_venue, ceremony_address, ceremony_time, reception_venue, reception_address, reception_time",
    )
    .eq("id", engagementId)
    .single();

  if (!engagement) {
    redirect(`/engagements/${engagementId}?tab=website`);
  }

  const baseSlug = slugify(engagement.display_name);
  let slug = baseSlug;
  let site: { id: string } | null = null;

  for (let attempt = 0; attempt < 5 && !site; attempt++) {
    const { data, error } = await supabase
      .from("sites")
      .insert({ engagement_id: engagementId, slug, template_key: "classic" })
      .select("id")
      .single();
    if (data) {
      site = data;
    } else if (error?.code === "23505") {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    } else {
      break;
    }
  }

  if (!site) {
    redirect(
      `/engagements/${engagementId}?tab=website&error=${encodeURIComponent("Could not create the site.")}`,
    );
  }

  const defaultSections = [
    {
      section_type: "hero",
      sort_order: 0,
      content: {
        headline: engagement.display_name,
        subhead: "",
        image_url: "",
        show_countdown: false,
      },
    },
    {
      section_type: "story",
      sort_order: 1,
      content: { heading: "Our story", body: "", image_url: "" },
    },
    {
      section_type: "the_day",
      sort_order: 2,
      content: {
        ceremony_venue: engagement.ceremony_venue || "",
        ceremony_address: engagement.ceremony_address || "",
        ceremony_time: engagement.ceremony_time || "",
        reception_venue: engagement.reception_venue || "",
        reception_address: engagement.reception_address || "",
        reception_time: engagement.reception_time || "",
        map_embed_url: "",
        travel_note: "",
      },
    },
    {
      section_type: "rsvp",
      sort_order: 3,
      content: { heading: "Will you join us?", intro: "" },
    },
    {
      section_type: "gallery",
      sort_order: 4,
      content: { heading: "Gallery", media_urls: [], layout: "grid" },
    },
    {
      section_type: "details",
      sort_order: 5,
      content: {
        dress_code: "",
        dress_code_note: "",
        children_policy: "",
        gifts_note: "",
        parking_note: "",
        faq: [],
      },
    },
    {
      section_type: "suppliers",
      sort_order: 6,
      content: { heading: "Suppliers" },
    },
    {
      section_type: "entourage",
      sort_order: 7,
      content: { heading: "Our entourage", intro: "" },
    },
    {
      section_type: "footer",
      sort_order: 8,
      content: { message: "" },
    },
  ];

  await supabase
    .from("site_sections")
    .insert(defaultSections.map((s) => ({ site_id: site!.id, is_visible: true, ...s })));

  revalidatePath(`/engagements/${engagementId}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSectionContent(sectionType: string, formData: FormData): any {
  switch (sectionType) {
    case "hero":
      return {
        headline: (formData.get("headline") as string) || "",
        subhead: (formData.get("subhead") as string) || "",
        image_url: (formData.get("image_url") as string) || "",
        show_countdown: formData.get("show_countdown") === "on",
      };
    case "story":
      return {
        heading: (formData.get("heading") as string) || "Our story",
        body: (formData.get("body") as string) || "",
        image_url: (formData.get("image_url") as string) || "",
      };
    case "the_day":
      return {
        ceremony_venue: (formData.get("ceremony_venue") as string) || "",
        ceremony_address: (formData.get("ceremony_address") as string) || "",
        ceremony_time: (formData.get("ceremony_time") as string) || "",
        reception_venue: (formData.get("reception_venue") as string) || "",
        reception_address: (formData.get("reception_address") as string) || "",
        reception_time: (formData.get("reception_time") as string) || "",
        map_embed_url: (formData.get("map_embed_url") as string) || "",
        travel_note: (formData.get("travel_note") as string) || "",
      };
    case "rsvp":
      return {
        heading: (formData.get("heading") as string) || "Will you join us?",
        intro: (formData.get("intro") as string) || "",
      };
    case "gallery": {
      const media_urls = ((formData.get("media_urls") as string) || "")
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean);
      return {
        heading: (formData.get("heading") as string) || "Gallery",
        media_urls,
        layout: (formData.get("layout") as string) || "grid",
      };
    }
    case "details": {
      const faq = ((formData.get("faq") as string) || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [question, answer] = line.split("|").map((s) => s?.trim());
          return question && answer ? { question, answer } : null;
        })
        .filter((entry): entry is { question: string; answer: string } => entry !== null)
        .slice(0, 6);
      return {
        dress_code: (formData.get("dress_code") as string) || "",
        dress_code_note: (formData.get("dress_code_note") as string) || "",
        children_policy: (formData.get("children_policy") as string) || "",
        gifts_note: (formData.get("gifts_note") as string) || "",
        parking_note: (formData.get("parking_note") as string) || "",
        faq,
      };
    }
    case "suppliers":
      return { heading: (formData.get("heading") as string) || "Suppliers" };
    case "entourage":
      return {
        heading: (formData.get("heading") as string) || "Our entourage",
        intro: (formData.get("intro") as string) || "",
      };
    case "footer":
      return { message: (formData.get("message") as string) || "" };
    default:
      return {};
  }
}

const SECTION_SORT_ORDER: Record<string, number> = {
  hero: 0,
  story: 1,
  the_day: 2,
  rsvp: 3,
  gallery: 4,
  details: 5,
  suppliers: 6,
  entourage: 7,
  footer: 8,
};

export async function updateSiteSection(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const sectionType = formData.get("section_type") as string;
  const isVisible =
    sectionType === "hero" ? true : formData.get("is_visible") === "on";
  const content = buildSectionContent(sectionType, formData);

  const supabase = await createClient();
  await supabase.from("site_sections").upsert(
    {
      site_id: siteId,
      section_type: sectionType,
      content,
      is_visible: isVisible,
      sort_order: SECTION_SORT_ORDER[sectionType] ?? 99,
    },
    { onConflict: "site_id,section_type" },
  );

  revalidatePath(`/engagements/${engagementId}`);
}

export async function updateSiteSlug(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const slug = slugify(formData.get("slug") as string);

  const supabase = await createClient();
  const { error } = await supabase.from("sites").update({ slug }).eq("id", siteId);

  if (error) {
    redirect(
      `/engagements/${engagementId}?tab=website&error=${encodeURIComponent("That address is already taken.")}`,
    );
  }

  revalidatePath(`/engagements/${engagementId}`);
}

export async function publishSite(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const supabase = await createClient();

  await supabase
    .from("sites")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", siteId);

  revalidatePath(`/engagements/${engagementId}`);
}

export async function unpublishSite(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const supabase = await createClient();

  await supabase.from("sites").update({ status: "draft" }).eq("id", siteId);

  revalidatePath(`/engagements/${engagementId}`);
}
