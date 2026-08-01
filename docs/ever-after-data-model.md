# Ever After — Data Model (Draft v2)

Postgres / Supabase. Written to match the Phase 0 workbook and playbook — those documents are the functional spec this schema implements.

**v2 changes:** no plus-ones (every attendee invited individually); seats dropped in favour of table-only assignment; group-based bulk seating with warn-then-spill.

Conventions: `uuid` primary keys, `timestamptz` everywhere, `snake_case`, soft deletes via `archived_at` rather than hard deletes.

---

## 1. Entity overview

```
users ──< engagement_members >── engagements
                                      │
                                      ├──< guests ──< guest_scans >── checkpoints
                                      ├──< tables
                                      ├──< schedule_items
                                      ├──< engagement_vendors >── vendors
                                      └──  sites ──< site_sections

vendors ──  owned by a user (vendor role)
```

---

## 2. Identity and access

### `users`
Supabase auth handles the credential side. This table holds profile data.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | matches `auth.users.id` |
| email | text unique | |
| full_name | text | |
| phone | text | |
| global_role | text | `account` \| `couple` \| `vendor` |
| created_at | timestamptz | |
| archived_at | timestamptz null | |

> `global_role` is coarse. It answers "can this person see the internal dashboard at all." Per-wedding access is `engagement_members`.

### `engagement_members`
Which non-Account users can access which wedding. Kept as a join table rather than a `couple_id` column on `engagements`, so a couple can have two logins (both partners) plus an external coordinator.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK → engagements | |
| user_id | uuid FK → users | |
| role | text | `partner` \| `coordinator` |
| created_at | timestamptz | |

Unique on `(engagement_id, user_id)`.

> Account users are **not** rows here. They see everything via `global_role = 'account'`.

---

## 3. The engagement

### `engagements`
One wedding. The central object.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| display_name | text | "Maria & Jon" |
| partner_a_name | text | |
| partner_b_name | text | |
| wedding_date | date | |
| stage | text | `onboarding` \| `building` \| `live` \| `post_wedding` \| `archived` |
| assigned_to | uuid FK → users null | internal owner |
| rsvp_deadline | date null | **set by the couple** |
| ceremony_venue | text | |
| ceremony_address | text | |
| ceremony_time | time | |
| reception_venue | text | |
| reception_address | text | |
| reception_time | time | |
| expected_guest_count | int | |
| guest_cap | int default 50 | package limit |
| notes | text | internal only, never guest-facing |
| created_at / updated_at | timestamptz | |
| archived_at | timestamptz null | |

Index on `wedding_date`, `stage`, `assigned_to` — the dashboard sorts and filters on these.

---

## 4. Guests, RSVPs and seating

### `guests`
One row per invited person. **No plus-ones** — every attendee is invited individually, gets their own token, and RSVPs for themselves. This keeps the headcount exact, which is the number the caterer and venue actually need.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK → engagements | |
| full_name | text | |
| side | text | `bride` \| `groom` \| `both` |
| guest_group | text | "Family", "Ninong", "High school" — drives bulk seating |
| contact_phone | text null | |
| rsvp_status | text | `no_reply` \| `accepted` \| `declined` |
| rsvp_responded_at | timestamptz null | |
| meal_choice | text null | only if the caterer needs it |
| song_request | text null | |
| guest_notes | text null | the single open box: dietary, mobility, late arrival |
| internal_notes | text null | not guest-visible |
| table_id | uuid FK → tables null | table only, no seat number |
| invite_token | text unique | the guest's personal link and QR payload |
| created_at / updated_at | timestamptz | |

Indexes: `(engagement_id, rsvp_status)`, unique on `invite_token`.

> **Declined guests are never deleted.** They keep their row and drop out of attendee views by filtering on `rsvp_status = 'accepted'` — matching the workbook's Attendee Sheet behaviour.

> **`invite_token` replaces the Phase 0 name dropdown.** Each guest gets a personal link, which removes the name-reconciliation problem entirely and doubles as the QR payload. This is the single biggest upgrade the platform makes over the manual process.

### `tables`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| label | text | "Table 1", "Head table" |
| capacity | int | soft limit — warns, doesn't block |
| sort_order | int | |

> **No `seats` table.** Guests are assigned a table, not a seat. Filipino weddings squeeze and shuffle; enforcing seat numbers creates work at planning time and gets ignored on the day. A single nullable `guests.table_id` replaces an entire table and its join.

> Guests with no table — the officiant, for example — have `table_id = null` and simply don't appear in any table's list.

### Seating assignment

Assignment is **couple/coordinator only**. Account can do it on their behalf; guests never choose their own table.

The primary action is bulk assignment by `guest_group`:

> High school → Table 1 · Groom's work → Table 5 · Bride's family → Table 2

Then individual overrides on top, because every wedding has someone who needs moving.

**Over-capacity behaviour: warn, then spill.** When a group is larger than the target table, show the count and ask before proceeding — "12 guests, Table 1 seats 10. Continue?" On confirm, seat what fits and place the remainder on the next table with space, showing exactly who moved. Never spill silently: which two people get separated from their group is a decision the couple should make, not a side effect.

`capacity` is therefore advisory. Nothing in the schema should reject an over-capacity assignment — the UI warns, the data allows it.

### Physical signage

Table numbers exist in the venue as printed signage, exactly as they already do at any wedding. The platform's job is only to tell each guest which number is theirs, in their own link. **No URLs or QR codes printed on tables** — the digital and physical layers just have to agree on the number.

---

## 5. Day-of operations

### `checkpoints`
Configurable per wedding. Not hardcoded, because the playbook's whole point is that some weddings want three and some want one.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| name | text | "Arrival", "Gift table", "Giveaways" |
| sort_order | int | |
| is_active | bool default true | |

### `guest_scans`
Append-only log. One row per scan event, never updated.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| guest_id | uuid FK → guests | |
| checkpoint_id | uuid FK → checkpoints | |
| scanned_at | timestamptz | |
| scanned_by | uuid FK → users null | which marshal |
| method | text | `qr` \| `manual` |

Index on `(checkpoint_id, guest_id)`.

> **A log, not a boolean.** The workbook uses a YES column per checkpoint; a log is strictly better — it gives you arrival times, catches double-scans, and lets the coordinator see flow rate rather than just a total. `method = 'manual'` covers the guest who forgot their QR, which will happen at every wedding.

> Live counts are derived, not stored: accepted = count of guests with `rsvp_status='accepted'`; arrived = distinct `guest_id` in scans at checkpoint 1. Don't cache these — the numbers are small and staleness at a live event is worse than a query.

### `schedule_items`
Powers both the guest-facing schedule and the internal run of show.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| start_time | time | |
| title | text | "Ceremony begins" |
| location | text null | |
| owner | text null | internal: "Marshal A" |
| notes | text null | internal |
| is_guest_visible | bool default true | |
| sort_order | int | |

> One table, filtered by `is_guest_visible`. Guests see the ceremony; they don't see supplier load-out. The playbook makes this distinction and the schema should keep it rather than maintaining two lists.

### `announcements`
The "right now" line on the day-of hub.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| body | text | |
| posted_at | timestamptz | |
| posted_by | uuid FK → users | |
| is_active | bool | |

---

## 6. The website

### `sites`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK unique | one site per wedding |
| slug | text unique | `mariaandjon` |
| template_key | text | which starter template |
| theme | jsonb | colors, font choices |
| status | text | `draft` \| `published` |
| day_hub_unlocked_at | timestamptz null | hub stays hidden until this passes |
| published_at | timestamptz null | |

### `site_sections`
The structured-form approach from the PRD, not free-form drag-and-drop.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| site_id | uuid FK → sites | |
| section_type | text | `hero` \| `story` \| `the_day` \| `rsvp` \| `gallery` \| `details` \| `suppliers` |
| content | jsonb | shape depends on `section_type` |
| sort_order | int | |
| is_visible | bool default true | |

> **Why jsonb for content.** Each section type has different fields — a hero has an image and a date, a story has paragraphs. Separate tables per section type would be cleaner in theory and miserable in practice. Validate the shape in application code per `section_type`.

> This structure supports true drag-and-drop later without migration: `sort_order` and `is_visible` already exist. You'd only be changing the editing UI, not the data.

### `media`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| storage_path | text | Supabase storage |
| kind | text | `photo` \| `video` |
| uploaded_by | uuid FK → users null | null when a guest uploads |
| source | text | `couple` \| `account` \| `guest` |
| caption | text null | |
| is_approved | bool default false | for guest uploads |
| created_at | timestamptz | |

> `source = 'guest'` plus `is_approved` covers Phase 2's post-event uploads without a schema change. Guest uploads need moderation — assume that from the start.

---

## 7. Vendors

Two distinct things, per the PRD: a public directory, and a per-event log.

### `vendors`
Directory listings. Approval-gated.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_user_id | uuid FK → users null | null for team-created listings |
| business_name | text | |
| category | text | `photo` \| `venue` \| `catering` \| `florals` \| `hmua` \| `cake` \| `music` \| `other` |
| description | text | |
| rate_from | numeric null | |
| rate_to | numeric null | |
| rate_note | text null | "per event", "packages from" |
| contact_phone | text | |
| contact_email | text | |
| socials | jsonb | |
| status | text | `pending` \| `approved` \| `rejected` \| `suspended` |
| reviewed_by | uuid FK → users null | |
| reviewed_at | timestamptz null | |
| review_note | text null | why it went back for edits |
| created_at / updated_at | timestamptz | |

Index on `(status, category)` — the directory only ever queries approved listings by category.

### `vendor_photos`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| vendor_id | uuid FK → vendors | |
| storage_path | text | |
| sort_order | int | |

### `engagement_vendors`
Suppliers actually booked for a wedding. Deliberately allows a vendor with no directory listing — most suppliers a couple has already booked will never be in your directory.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engagement_id | uuid FK | |
| vendor_id | uuid FK → vendors null | null when off-platform |
| business_name | text | filled in when `vendor_id` is null |
| category | text | |
| contact_phone | text null | |
| contact_email | text null | |
| notes | text null | |
| credit_on_site | bool default false | show in the suppliers section |

> The nullable `vendor_id` is the important bit. Forcing every booked supplier into the directory would mean creating fake listings for caterers who never agreed to be listed.

---

## 8. Row-level security

Supabase RLS is where the three roles become real. Sketch of the policies:

| Table | Account | Couple / coordinator | Vendor | Public |
|---|---|---|---|---|
| engagements | all rows | own via `engagement_members` | none | none |
| guests | all | own engagement | none | none |
| guest_scans | all | own engagement | none | none |
| tables / checkpoints / schedule_items | all | own engagement | none | none |
| sites / site_sections | all, read+write | own, **read only** | none | published only |
| vendors | all | read approved | own row only | read approved |
| engagement_vendors | all | own engagement | none | none |
| media | all | own engagement | none | approved, published site |

**The rule that matters most:** a couple can read their site but not write it. Editing site content is Account-only — that's the full-service promise, enforced at the database rather than hidden in the UI.

**The operational exception from the PRD:** couples *can* write `guests`, `tables`, `checkpoints`, `schedule_items`, and `engagements.rsvp_deadline`. Running their own guest list is their job; editing the website isn't.

**Guest access is unauthenticated.** Guests never log in. They arrive with an `invite_token` in a URL, which has to be validated server-side and scoped to exactly one guest row. This is the most security-sensitive path in the system — a token that leaks the whole guest list is the failure mode to design against. Treat tokens as long random strings, never sequential ids.

---

## 9. Notes for the build

**Start with these tables only:** `users`, `engagements`, `engagement_members`, `guests`, `tables`, `checkpoints`, `guest_scans`, `schedule_items`, `sites`, `site_sections`. That's the MVP. Vendors and media can come after — they have no dependents.

**Don't store computed counts.** Accepted, arrived, and pickup rates are all cheap queries at 50 guests. Caching them creates a staleness bug on the one day it must be right.

**Timezones.** Wedding times are local wall-clock times — store `date` and `time` separately, as above, not a single `timestamptz`. A ceremony at 3pm is at 3pm regardless of where the server thinks it is. `scanned_at` and other event logs *are* `timestamptz`, because those are real moments.

**Before real guest data goes in**, have someone review the RLS policies and the `invite_token` path specifically. Those two things are where a mistake exposes one couple's guest list to another, and they're hard to self-assess without security experience.

---

## 10. Still open

- **Multi-tenancy URL structure** — `slug` supports either subdomain or path routing, so this can be decided at the routing layer rather than the schema. Worth deciding before you build the router.
- **Whether both partners get separate logins** — the schema allows it; the UX question is whether you offer it.
- **Guest upload moderation** — `is_approved` exists, but who reviews and when isn't defined.
