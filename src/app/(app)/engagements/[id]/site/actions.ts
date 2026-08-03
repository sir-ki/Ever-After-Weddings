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

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Real per-couple photo uploads (media library, post-launch-readiness).
// Account/couple uploads only this pass — no guest-upload moderation
// flow yet, see the migration's own comment. Storage RLS
// (media_objects_insert) enforces the same engagement scoping as every
// other write in this app; this validation is just a clean error
// message, same discipline every other action in this file follows.
async function uploadToMediaLibrary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  engagementId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Please upload a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Images must be 8MB or smaller." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("global_role").eq("id", user.id).maybeSingle()
    : { data: null };
  const source = profile?.global_role === "account" ? "account" : "couple";

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${engagementId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) {
    return { error: "Could not upload the image. Please try again." };
  }

  const { error: insertError } = await supabase.from("media").insert({
    engagement_id: engagementId,
    storage_path: path,
    kind: "photo",
    uploaded_by: user?.id,
    source,
  });
  if (insertError) {
    await supabase.storage.from("media").remove([path]);
    return { error: "Could not save the upload. Please try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);

  return { url: publicUrl };
}

export async function uploadHeroImage(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const file = formData.get("file") as File;
  const supabase = await createClient();

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/engagements/${engagementId}?tab=website&error=${encodeURIComponent("Choose a file to upload.")}`);
  }

  const result = await uploadToMediaLibrary(supabase, engagementId, file);
  if ("error" in result) {
    redirect(`/engagements/${engagementId}?tab=website&error=${encodeURIComponent(result.error)}`);
  }

  const { data: existing } = await supabase
    .from("site_sections")
    .select("content")
    .eq("site_id", siteId)
    .eq("section_type", "hero")
    .maybeSingle();

  await supabase.from("site_sections").upsert(
    {
      site_id: siteId,
      section_type: "hero",
      content: { ...(existing?.content as object), image_url: result.url },
      is_visible: true,
      sort_order: SECTION_SORT_ORDER.hero,
    },
    { onConflict: "site_id,section_type" },
  );

  revalidatePath(`/engagements/${engagementId}`);
}

export async function uploadStoryImage(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const file = formData.get("file") as File;
  const supabase = await createClient();

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/engagements/${engagementId}?tab=website&error=${encodeURIComponent("Choose a file to upload.")}`);
  }

  const result = await uploadToMediaLibrary(supabase, engagementId, file);
  if ("error" in result) {
    redirect(`/engagements/${engagementId}?tab=website&error=${encodeURIComponent(result.error)}`);
  }

  const { data: existing } = await supabase
    .from("site_sections")
    .select("content, is_visible")
    .eq("site_id", siteId)
    .eq("section_type", "story")
    .maybeSingle();

  await supabase.from("site_sections").upsert(
    {
      site_id: siteId,
      section_type: "story",
      content: { ...(existing?.content as object), image_url: result.url },
      is_visible: existing?.is_visible ?? true,
      sort_order: SECTION_SORT_ORDER.story,
    },
    { onConflict: "site_id,section_type" },
  );

  revalidatePath(`/engagements/${engagementId}`);
}

export async function uploadGalleryPhotos(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const files = formData.getAll("files") as File[];
  const supabase = await createClient();

  const realFiles = files.filter((f) => f instanceof File && f.size > 0);
  if (realFiles.length === 0) {
    redirect(`/engagements/${engagementId}?tab=website&error=${encodeURIComponent("Choose at least one file to upload.")}`);
  }

  const uploadedUrls: string[] = [];
  for (const file of realFiles) {
    const result = await uploadToMediaLibrary(supabase, engagementId, file);
    if ("error" in result) {
      redirect(`/engagements/${engagementId}?tab=website&error=${encodeURIComponent(result.error)}`);
    }
    uploadedUrls.push(result.url);
  }

  const { data: existing } = await supabase
    .from("site_sections")
    .select("content, is_visible")
    .eq("site_id", siteId)
    .eq("section_type", "gallery")
    .maybeSingle();

  const existingContent = (existing?.content ?? {}) as { heading?: string; media_urls?: string[]; layout?: string };

  await supabase.from("site_sections").upsert(
    {
      site_id: siteId,
      section_type: "gallery",
      content: {
        ...existingContent,
        media_urls: [...(existingContent.media_urls ?? []), ...uploadedUrls],
      },
      is_visible: existing?.is_visible ?? true,
      sort_order: SECTION_SORT_ORDER.gallery,
    },
    { onConflict: "site_id,section_type" },
  );

  revalidatePath(`/engagements/${engagementId}`);
}

export async function updateSiteTheme(formData: FormData) {
  const engagementId = formData.get("engagement_id") as string;
  const siteId = formData.get("site_id") as string;
  const accent = formData.get("accent") as string;

  const supabase = await createClient();
  await supabase.from("sites").update({ theme: { accent } }).eq("id", siteId);

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
