# Ever After — Site Template Spec (Draft v1)

The content model for a couple's wedding site. Defines every section, every field, and how the guest-facing page changes state across the wedding lifecycle.

One template in v1. English only. Sections are fixed in order — the team can hide a section, not reorder or invent one.

Implements `sites` and `site_sections` from the data model.

---

## 1. Two surfaces, one site

| | **Public site** | **Guest view** |
|---|---|---|
| URL | `/mariaandjon` | `/mariaandjon?t=<token>` |
| Who | Anyone with the link | One specific invited guest |
| Personal greeting | No | Yes |
| RSVP | No | Yes |
| Table number | No | Yes, once assigned |
| Day-of hub | No | Yes, on the day |
| Story, venue, gallery, details | Yes | Yes |

Same page, same sections. The token adds a personal band at the top and unlocks RSVP. Without it, the site is a public wedding page.

> The public URL is what the couple posts openly, and what you send to a guest who lost their link. It reveals nothing about who was invited.

---

## 2. Guest view states

One link, three states, driven by the guest's RSVP status and the date. Everything below the personal band stays the same in all three.

### State A — Not yet responded
*Before the RSVP deadline, `rsvp_status = 'no_reply'`*

- Personal greeting with the guest's first name
- The invitation itself: couple's names, date, venue, time
- **Accept / decline** as the primary action
- RSVP deadline shown plainly

### State B — Responded, before the day
*`rsvp_status` is accepted or declined, wedding date in the future*

**If accepted:** confirmation, countdown to the date, their table label once assigned, and a link to change their answer while the deadline holds.

**If declined:** a short acknowledgement, and the option to change their mind before the deadline. Nothing else changes — they still see the site.

**After the deadline passes**, the change-answer action disappears for both. The page stays readable.

### State C — Wedding day
*From `day_hub_unlocked_at` until the engagement is archived*

The personal band becomes the day-of hub:

- **Right now** — the active announcement, if there is one
- **Your table** — the label, large. This is the single most-looked-at element on the day
- **Today's schedule** — guest-visible items only
- **Getting around** — venue map, parking, gifts, restrooms
- **Who to ask** — the coordinator's name and number

Story, gallery, and details move below the hub. They don't disappear — guests browse them at the reception.

> Only guests with `rsvp_status = 'accepted'` get the full hub. A declined guest opening the link on the day sees the schedule and a warm note, not a table number.

---

## 3. Sections

Fixed order. Each is one row in `site_sections`, with `content` as jsonb and `is_visible` controlling display.

### 3.1 Hero — `hero`
Always visible. Cannot be hidden.

| Field | Type | Required | Notes |
|---|---|---|---|
| headline | text | yes | Defaults to the couple's display name |
| subhead | text | no | One line, e.g. "We're getting married" |
| image_id | uuid → media | yes | The hero photo |
| show_countdown | bool | no | Days until the wedding |

**Design note:** light, airy image with a soft white scrim and dark text. Not the conventional dark-scrim, white-text treatment — that fights the brand direction.

**Content rule:** headline under 40 characters. Longer wraps badly on a phone, which is where most guests open it.

### 3.2 Personal band — *not a section*
Rendered above the hero when a token is present. Not stored in `site_sections`, not editable by the team — it's generated from the guest's row and the site's state. Listed here because it's the first thing a guest sees.

### 3.3 Our story — `story`

| Field | Type | Required | Notes |
|---|---|---|---|
| heading | text | no | Defaults to "Our story" |
| body | text | yes | Markdown, 3 paragraphs max |
| image_id | uuid → media | no | One supporting photo |

**Content rule:** hard cap at three paragraphs. Collected by recording the intake call and transcribing — couples speak better than they write. Edit lightly; their voice matters more than polished prose.

### 3.4 The day — `the_day`

| Field | Type | Required | Notes |
|---|---|---|---|
| ceremony_venue | text | yes | Pre-filled from the engagement |
| ceremony_address | text | yes | |
| ceremony_time | time | yes | |
| reception_venue | text | no | Omit if same as ceremony |
| reception_address | text | no | |
| reception_time | time | no | |
| map_embed_url | text | no | |
| travel_note | text | no | Parking, directions, one short paragraph |

**Content rule:** this section holds *where and when*, not the run of show. The full schedule lives in the day-of hub and it will change — keeping it out of here means late changes don't require a site edit.

### 3.5 RSVP — `rsvp`
Renders only in the guest view. In the public site, this section is skipped entirely.

| Field | Type | Required | Notes |
|---|---|---|---|
| heading | text | no | Defaults to "Will you join us?" |
| intro | text | no | One or two lines from the couple |

The deadline comes from `engagements.rsvp_deadline`, not from section content — one source of truth.

**Fields the guest fills:** accept or decline, contact number, one open notes box, and optionally meal choice and song request if the couple enabled them.

> No plus-one question exists. Every attendee is invited individually.

### 3.6 Gallery — `gallery`

| Field | Type | Required | Notes |
|---|---|---|---|
| heading | text | no | Defaults to "Gallery" |
| media_ids | uuid[] → media | yes | 6–12 pre-wedding photos |
| layout | text | no | `grid` \| `masonry` |

**Content rule:** cap at 12 before the wedding. Guests open this on mobile data at a venue; every extra image costs load time.

**After the event**, this section also surfaces approved post-wedding media — `media.source = 'guest'` or `'couple'` with `is_approved = true`. Same section, two feeds, separated by a heading. The upload path itself is Phase 2; the section is built to receive it.

### 3.7 Details — `details`

| Field | Type | Required | Notes |
|---|---|---|---|
| dress_code | text | no | |
| dress_code_note | text | no | Colours to wear or avoid |
| children_policy | text | no | Phrased by the couple, not by you |
| gifts_note | text | no | Phrased by the couple |
| parking_note | text | no | |
| faq | jsonb[] | no | `{question, answer}`, max 6 |

**Content rule:** this section prevents more guest questions per word than any other. Worth the time at intake. Children and gifts especially — always use the couple's own phrasing.

### 3.8 Suppliers — `suppliers`

| Field | Type | Required | Notes |
|---|---|---|---|
| heading | text | no | Defaults to "Suppliers" |
| show_credits | bool | no | |

Pulls from `engagement_vendors` where `credit_on_site = true`. Displays business name, category, and contact — a straight credit list, no ratings, no reviews.

**Why it earns its place:** costs nothing, gives vendors a concrete reason to say yes when you recruit them, and doubles as a live example of the directory you're pitching.

### 3.9 Footer — `footer`
Always visible.

| Field | Type | Required | Notes |
|---|---|---|---|
| contact_name | text | yes | |
| contact_number | text | yes | |
| closing_line | text | no | |

**The contact is the couple's, or their coordinator's — never yours.** Ever After is invisible to guests.

---

## 4. Theme

Stored as `sites.theme` jsonb. Deliberately narrow — a full-service brand wants consistency, and every extra knob is a way for sites to get worse.

| Field | Options |
|---|---|
| accent | 4–6 curated presets, no free colour picker |
| heading_font | 2–3 curated serif options |
| corner_style | `soft` \| `sharp` |

All presets are light and airy — blush, champagne, warm ivory bases with muted accents. Every preset must pass a contrast check before it ships.

> No free colour picker. It's the fastest route to a site the couple loves and their guests can't read.

---

## 5. What the team can and cannot change

| Action | Allowed |
|---|---|
| Edit any section's content | Yes |
| Hide a section | Yes, except hero and footer |
| Reorder sections | **No** — order is fixed in v1 |
| Add a custom section | **No** |
| Change theme preset | Yes |
| Free-form colours or fonts | **No** |

Fixed order is the single biggest reason milestone 5 can ship on time. It's also what keeps every Ever After site recognisably an Ever After site.

The revision loop is a meeting, not an editor: build it, walk the couple through it, apply their changes. There is no comment tool and no self-service editing.

---

## 6. Empty and edge states

Every one of these will happen. Decide them now rather than at 11pm before a launch.

| Situation | Behaviour |
|---|---|
| Section has no content | Hidden entirely — never render an empty heading |
| Gallery has no images | Section hidden |
| No table assigned yet | "Your table will be shared closer to the day" |
| No reception venue | Reception block omitted, not shown as blank |
| No announcement on the day | "Right now" block hidden — don't show an empty box |
| Guest declined, opens on the day | Schedule and a warm note. No table, no hub |
| Invalid or revoked token | Public site, with a line pointing them to the couple's contact |
| Site not yet published | Neutral holding page. Never a 404, never a stack trace |
| Guest opens before the hub unlocks | State B, with the date |

---

## 7. Mobile first, genuinely

The guest view is designed for a phone at a venue, held one-handed, possibly in sunlight, on poor signal.

- Table number is the largest element on the page in state C
- Hero image compressed aggressively — quality matters less than loading
- Nothing essential below a scroll on the day-of view
- Tap targets no smaller than 44px
- Test on a real phone on mobile data, not a resized desktop browser

---

## 8. Content collection

The template doubles as the intake checklist. To build a site the team needs:

- Couple's display name and headline preference
- Story — recorded at intake, transcribed
- Hero photo, plus 6–12 gallery photos
- Ceremony and reception details, with a map link
- Dress code, children policy, gifts note, parking, up to 6 FAQs
- Contact name and number for guest questions
- Which suppliers to credit
- Theme preset choice

> Content collection, not site building, is the likely bottleneck. The build is a few hours; waiting on photos can take weeks. If that holds true after the first weddings, the thing to automate first is a structured intake that forces content out early — not a better editor.

---

## 9. Still open

- **Meal choice and song request** — per-couple toggles, or always off in v1?
- **Countdown** — on by default or off?
- **Post-event media moderation** — who approves guest uploads, and how quickly
- **Second template** — deliberately deferred until the first has run a real wedding
