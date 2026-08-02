# Ever After — Launch Readiness Spec (Draft v1)

Scope for the work between "v1 feature-complete" and "can take a real client."

Seven items:
1. **Member-invite flow** — the hard blocker
2. **Token rotation** — the last security gap
3. **Guest invitation QR delivery** — how the guest actually receives their link
4. **Guest-facing UI/UX pass** — the product couples pay for
5. **Open guest cap** — removing the 50-guest limit, and what breaks at scale
6. **Entourage & processional** — the most visible Filipino-wedding gap
7. **Printables & exports** — cheap once Part 3 exists

Written to be handed to Claude Code alongside `docs/`. Assumes the codebase at commit `a478b17` plus the 2026-08-02 hardening pass.

Companion to `ever-after-auth-and-access.md` (permission model) and `ever-after-template-spec.md` (design direction).

---

# Part 1 — Member Invite Flow

## Why this blocks everything

There is currently **no way to attach a couple or coordinator to an engagement through the app.** Both seed engagements' members were created via `scripts/seed.mjs` and direct SQL. Onboarding a real client today means writing SQL by hand.

`docs/ever-after-auth-and-access.md` §7 already specifies the shape: couples are *invited by Account*, and the invitation itself carries the `engagement_id`. Critically — **never let a signup form accept an `engagement_id`**, or a stranger joins a wedding by guessing a UUID.

## Decisions taken (and why)

**No email sending in this pass.** The app has no mail provider wired up, and adding one is a real dependency with its own config, deliverability concerns, and failure modes. Instead: Account generates an invite and gets a **copyable link** to send however they like — messenger, SMS, email from their own account. This matches how the business actually operates (full-service, high-touch, few clients) and can be upgraded to real email later without changing the data model.

**Both partners get separate logins.** The schema already supports it (`engagement_members` is a join table precisely so a wedding can have several members). Two people planning a wedding will both want access, and shared credentials are a bad habit to design in.

**Invites are single-use and expiring.** An invite link is a credential. It creates an account with access to a real guest list.

**Invited users set their own password.** Account never sees or sets it. This avoids the "password shared in an unlogged session" problem that already happened once on this project.

**Coordinators use the same flow, different role.** One mechanism, a role picker on the invite. `engagement_members.role` already accepts `partner` or `coordinator`.

## Schema

New migration, `0012_member_invites.sql`:

```sql
create table if not exists engagement_invites (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  email         text not null,
  role          text not null check (role in ('partner','coordinator')),
  token         text not null unique default encode(gen_random_bytes(24), 'base64'),
  invited_by    uuid not null references users(id),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  accepted_at   timestamptz,
  accepted_by   uuid references users(id),
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists engagement_invites_engagement_idx
  on engagement_invites (engagement_id);
```

Use the same `gen_random_bytes` CSPRNG pattern as `0003_guest_tokens.sql` — do not invent a second token-generation approach.

**RLS:** Account read/write all. Members of the engagement may *read* invites for their own engagement (so a couple can see who else has access) but not create them. Nobody else. The acceptance path does **not** go through RLS — see below.

## Flows

### Creating an invite
Account-only, from the engagement workspace. A "People" tab alongside the existing tabs.

- Form: email, role (`partner` / `coordinator`)
- On submit: insert the invite row, return a copyable URL — `{NEXT_PUBLIC_SITE_URL}/invite/{token}`
- The tab lists current members and pending invites, with a revoke action on each pending one

### Accepting an invite
Public route, `/invite/[token]`. **Server-side only, service-role client**, following the same discipline as the guest-token path in `src/lib/guest-token.ts`:

1. Look up the token. Invalid, expired, revoked, or already accepted → one identical generic error page. Do not distinguish between these cases; that's a token-probing oracle.
2. Show the engagement name and the role being granted, so the person knows what they're accepting.
3. If no user exists for that email: form for full name + password, creates the auth user with `global_role = 'couple'`.
4. If a user already exists: prompt to sign in, then attach.
5. On success, in one transaction: create the `engagement_members` row, stamp `accepted_at` / `accepted_by`.
6. Redirect into the engagement.

**Do not let the acceptance form carry `engagement_id`, `role`, or `global_role`.** All three come from the invite row, server-side. This is the same class of bug migration `0007` fixed — treat client-supplied role data as hostile.

**Rate limit the token lookup** by IP, reusing `src/lib/rate-limit.ts`.

### Managing members
On the People tab: list members with name, email, role, joined date. Account can remove a member (deletes the `engagement_members` row; the user account survives, since they may belong to another engagement).

## Done when

- Account can invite a couple from the UI, copy the link, and the couple can accept it and land in their engagement — with no SQL at any point
- An expired, revoked, reused, or garbage token all produce the same generic error
- The acceptance form cannot influence which engagement or role it grants
- A couple invited to engagement A still cannot see engagement B (`npm run verify:rls` extended to cover `engagement_invites`)

---

# Part 2 — Token Rotation

## Why

`docs/ever-after-auth-and-access.md` §5 lists rotation as required hardening, and the handoff flags it as the only remaining gap with real security relevance. **A leaked guest link currently cannot be revoked.** Guest tokens get forwarded, screenshotted, and pasted into group chats — that's assumed in the design, and it's fine as long as a token only ever reveals one guest. But when one does leak to someone who shouldn't have it, there's presently no answer.

## Scope

Deliberately small. This is one action, not a feature.

**Single guest rotation.** On the guest list row and the guest detail view: a "Regenerate link" action, behind a confirmation that states plainly that the old link stops working immediately and the guest will need the new one.

**Bulk rotation for an engagement.** One action that rotates every guest's token at once, behind a stronger confirmation. This is the "we published the wrong link publicly" case. Rare, but when you need it you need it for all 50 at once.

**Implementation:** update `guests.invite_token` using the same `gen_random_bytes` default as `0003`. No new table. The old token becomes invalid the moment the row is updated, because lookup is by exact match — nothing further is required to revoke it.

**No grace period, no old-token redirect.** A revoked token must be dead immediately. If the guest is confused, the couple sends them the new link — that's a human problem with a human fix, and it's the correct trade for a revocation feature.

## Where it must not go

The rotation action is **Account and couple only**, through the existing authenticated server-action pattern. A guest must never be able to rotate their own token, or anyone else's.

## Done when

- Rotating a guest's token immediately 404s the old link, on the same generic error path as any other invalid token
- The new link works for the same guest, with RSVP status and table assignment intact
- `npm run verify:guest-token` extended: rotate mid-run, confirm the old token dies and the new one works

---

# Part 3 — Guest Invitation QR Delivery

## Why

There is currently **no answer to "how does a guest actually receive their link."** Tokens are generated, the RSVP page works, the scanner reads QR codes — but nothing produces something a coordinator can send.

The app has no email sending, and it shouldn't get any for this. In practice a Philippine wedding coordinator sends invitations over Messenger, or prints them. Both are outside the system, and that's correct — the platform's job is to produce a **file worth sending**, not to send it.

This also closes a loop from M7: the scanner decodes guest QR codes, but nothing in the product has ever *produced* one. Guests were presumably expected to arrive with a link on their phone.

## Decisions taken (and why)

**Produce an invitation card, not a bare QR.** A naked QR square with no context is confusing to receive and useless printed. The downloadable image should carry the guest's name, the couple's names, the date and venue, and the QR — so it works as an actual invitation on Messenger *and* as something printable. A guest who can't scan it can still read what it says.

**PNG, not PDF.** Messenger, Viber and Instagram all handle images natively; PDFs get treated as file attachments and often go unopened on mobile. Print quality at a sensible resolution is fine for a card.

**The QR encodes the guest's existing token URL** — `{NEXT_PUBLIC_SITE_URL}/r/{token}`. No new identifier, no second credential. This must match exactly what the M7 scanner parses in `src/app/(app)/engagements/[id]/checkpoints/scan/scanner.tsx` — the same code that gets a guest into their invitation is the one that checks them in on the day. **Verify against the live scanner, not by reading the parsing code.**

**Per-guest download, plus bulk.** Single download for sending individually; a bulk action producing a zip for the print run. Both are needed — 50 individual downloads is not a workflow.

**Account and couple, not guests.** Same permission line as everything else operational: generation is an authenticated action, and a guest can never generate anyone's card, including their own.

## Where it goes in the UI

On the guest list, per row: a **Send invitation** action. On the guest detail view, the same action with a preview of the card before download.

Sitting alongside it, and worth building at the same time: **Copy link**, which puts the plain token URL on the clipboard. Sometimes a coordinator just wants to paste a link into a chat, and asking them to download a PNG for that is friction.

At the engagement level: **Download all invitations** producing a zip named per guest, for printing.

## Implementation notes

**QR generation needs a new dependency.** The app has `jsqr` for *decoding* only; encoding is a different problem. Pick a small, well-maintained encoder with no Web Worker — the same constraint that drove the `jsqr` choice under Turbopack.

**Render server-side.** Generate the card in a route handler and return the PNG. Doing it client-side means the card's appearance depends on the coordinator's browser and fonts, and bulk export becomes 50 canvas renders in a tab.

**Card design follows the brand direction** in Part 4 — light blush and ivory, serif for the couple's names, sans for the practical detail. It should look like something a couple is happy to have sent out under their name.

**Error correction level: at least M.** Printed cards get creased and photographed in bad light. A QR that fails to scan at the door is a real operational failure, and the scanner's manual fallback exists precisely because this happens.

## Security notes

**The card is the credential.** It carries the same token as the link, so everything in the auth doc's §5 applies unchanged. Downloaded PNGs sit in Downloads folders and get forwarded — that's assumed and acceptable, because a token only ever reveals one guest.

**Rotation invalidates printed cards.** This is a real operational consequence of Part 2 and the UI must say so plainly: rotating a token after invitations are printed means reprinting. The confirmation dialog should state it, not bury it.

**Do not log or filename tokens.** File names use the guest's name, not their token. A folder of files named after credentials is an avoidable leak.

## Done when

- A coordinator can download one guest's invitation card as a PNG and send it over Messenger, with no SQL and no copy-pasting URLs
- Bulk export produces a zip for the whole guest list
- **A downloaded card, printed on paper, scans successfully in the M7 scanner** — tested physically, not simulated
- Copy-link works as a lighter alternative
- The rotation confirmation from Part 2 warns that printed cards will stop working

---

# Part 4 — Guest-Facing UI/UX Pass

## Scope boundary

**Guest-facing surfaces only.** Internal tools stay as they are.

The distinction is deliberate. Fifty guests and a couple's entire family see the guest surfaces — they *are* the product, and a couple showing their site around is doing your marketing. The engagements dashboard is seen by you. Ugly-but-working costs nothing there.

**In scope:**
| Route | What it is |
|---|---|
| `/s/[slug]` | The public wedding site |
| `/r/[token]` | The guest's invitation and RSVP |
| `/r/[token]/day` | The day-of hub |
| `/directory` | The public vendor directory |
| `/invite/[token]` | Invite acceptance (new, from Part 1) |
| Invitation card | The downloadable PNG from Part 3 — guest-facing even though it's generated internally |

**Explicitly out of scope:** everything under `src/app/(app)/*`.

## Design direction

From `docs/ever-after-template-spec.md` and the brand work — *"high-tech wedding vibes, but soft and romantic."* A modern product interface wearing a soft wedding palette. Not a pastel-and-script wedding template; not a cold SaaS dashboard.

### Colour tokens

Define these once as CSS custom properties and use them everywhere. **No other colours.**

| Token | Hex | Use |
|---|---|---|
| `--ea-canvas` | `#FDFAF7` | Page background, warm ivory |
| `--ea-blush` | `#F9EFEA` | Cards, raised surfaces, accent tint |
| `--ea-champagne` | `#F2E4DA` | Secondary fills, badges, table pills |
| `--ea-border` | `#E8DAD2` | Hairlines, dividers, input borders |
| `--ea-ink` | `#3D2E2B` | Primary text, warm dark brown — **not black** |
| `--ea-ink-secondary` | `#6B5551` | Supporting text |
| `--ea-ink-muted` | `#7E6663` | Captions, metadata, placeholders |
| `--ea-accent` | `#A85D5B` | Primary buttons, active states |
| `--ea-accent-ink` | `#8E4A48` | Accent-coloured *text* on light backgrounds |

**Contrast, measured on `--ea-canvas`:** ink 12.1:1 · secondary 6.1:1 · muted 4.8:1 · accent-ink 6.4:1 · white on accent fill 5.1:1. All pass WCAG AA.

**`--ea-ink-muted` is the floor.** At 4.8:1 there is no room to go lighter. Any new grey must be checked, not eyeballed — a guest is reading this outdoors.

**Never use `--ea-accent` as text on `--ea-canvas`** — it fails AA at that size. Use `--ea-accent-ink` for coloured text, and reserve `--ea-accent` for fills with white on top.

### These tokens are the default preset, not hardcoded values

`sites.theme` already exists in the data model as a per-couple theme, and the template spec specifies curated presets rather than a free colour picker. **Build Part 4 against CSS custom properties, not literal hex.** A preset swaps the values; the slot names never change.

**Which surfaces follow the couple's preset:**

| Surface | Themed |
|---|---|
| `/s/[slug]` — the wedding site | Yes |
| `/r/[token]` — invitation and RSVP | Yes |
| `/r/[token]/day` — day-of hub | Yes |
| Invitation card (Part 3) | Yes — it must match their site |
| Printables (Part 7) | Yes for place cards and table numbers; house palette for internal documents |
| `/directory`, `/invite/[token]` | **No** — Ever After's own surfaces |
| Everything under `src/app/(app)/*` | **No** — house palette always |

**Every preset must pass AA on its own.** It is not enough that the default does. Each new preset needs the same measured check across ink, secondary, muted, accent-ink and white-on-accent. A preset that ships without it will have invisible muted text in daylight, and nobody will notice until a guest is standing in a garden trying to read it.

**The structure is fixed even when values change:** always a canvas, two tint steps, a border, a three-step ink scale, an accent fill and an accent ink. A preset that needs a slot this list doesn't have is a sign the preset is wrong, not the system.

**Serif choice is part of the preset**, per the template spec's 2–3 curated heading fonts. The scale, weights and leading in the table below stay constant across all presets — only the family changes.

### Type

**Two families, no more.**

- **Display serif** for the couple's names, section headings, and the guest's greeting. One serif, used confidently and sparingly. A high-contrast old-style or transitional serif suits the brand — pick one, load one weight (400) plus italic if genuinely needed.
- **UI sans** for everything else: body copy, buttons, labels, form fields, the day-of hub's practical detail. This is where the "modern product" half comes through.

Load both from Google Fonts with `display: swap`. Two families at one or two weights each — font weight is a real cost on venue mobile data.

**Scale:**

| Role | Size | Family | Weight | Leading |
|---|---|---|---|---|
| Couple's names (hero) | 40–48px | serif | 400 | 1.15 |
| Section heading | 26px | serif | 400 | 1.3 |
| Subheading | 20px | serif | 400 | 1.35 |
| Body | 16px | sans | 400 | 1.6 |
| Small / meta | 13px | sans | 400 | 1.5 |
| Eyebrow | 12px, `letter-spacing: 0.08em` | sans | 400 | — |
| **Table number (hub)** | **56px** | sans | 500 | 1 |

Two weights only: 400 and 500. Nothing heavier — it fights the softness.

**Sentence case everywhere.** No Title Case, no ALL CAPS except the eyebrow's letterspaced line, which stays lowercase.

### Spacing and shape

- **Radius:** `10px` on cards and buttons, `999px` on pills and badges only. Nothing sharp — the soft corners are what stop the modern layout reading as cold.
- **Vertical rhythm:** section padding `48px` mobile, `72px` desktop. Generous whitespace is doing half the work here.
- **Borders:** `1px solid --ea-border`. Hairlines, never heavy rules.
- **No shadows.** Flat surfaces, separated by tone and space. A drop shadow will make this look like a template.
- **No gradients**, with one exception: the hero may use a very soft two-stop wash between `--ea-canvas` and `--ea-blush`. Nothing more.

### Motion

Subtle and short. Fade-and-rise on section entry (`opacity` + 8px translate, 300ms, ease-out). Button and state transitions 150ms. Nothing that delays content, nothing that runs on a loop. Respect `prefers-reduced-motion`.

### Hero treatment

Light, airy image with a **soft white scrim and dark text** — not the conventional dark-scrim-white-text approach, which fights the palette. If no photo exists yet, the blush wash alone is the fallback and it should look deliberate, not empty.

## Priorities, in order

**1. `/r/[token]/day` — the day-of hub.** Highest stakes and hardest conditions: a phone, one-handed, in sunlight, on venue mobile data, by someone who has had a drink. The table number should be the largest thing on the page. Nothing essential below the fold. Compress imagery aggressively.

**2. `/r/[token]` — invitation and RSVP.** The first thing a guest ever sees, and where the couple's own guests judge the couple's choice of provider. The accept/decline action should be unmissable; the RSVP deadline plainly stated. Confirmation states should feel warm rather than transactional.

**3. `/s/[slug]` — the public wedding site.** The thing couples show their family. Section rhythm and vertical spacing matter more than any individual component here.

**4. `/directory`** — lowest stakes of the four.

**5. `/invite/[token]`** — seen once per member, but it's a couple's first impression of the product.

## Empty and edge states

`docs/ever-after-template-spec.md` §6 already specifies these. They are **part of this pass, not polish afterwards** — an unstyled empty state is more visible than a styled full one, because it's what a guest sees when something isn't ready yet.

Particularly: no table assigned yet; no active announcement; declined guest opening the hub on the day; invalid token; unpublished site.

## Constraints

- **Mobile first, genuinely.** Design at 380px, then scale up. Test on a real phone on mobile data — not a resized desktop browser.
- **Tap targets 44px minimum.**
- **No new dependencies.** Tailwind 4 is already there. No component library, no animation library, no icon package.
- **`SiteRenderer` stays shared** between `/s/[slug]` and the internal site-tab preview — that constraint dates from M5 and M8 respected it. Changes must render identically on both surfaces.
- **No functional changes.** This pass changes presentation only. If something needs a data change to look right, note it and raise it — don't quietly extend the schema.

## Done when

- All five routes match the design direction, on a real phone
- Every empty state in template-spec §6 is styled
- Contrast passes AA throughout
- Nothing under `src/app/(app)/*` changed
- `npm run verify:guest-token` still passes unchanged

---

# Part 5 — Open Guest Cap

## Why

`engagements.guest_cap` defaults to 50, inherited from the original feature list ("Up to 50 guests & RSVPs") rather than from any technical constraint.

That number puts the product in the **intimate** segment — 30–50 guests, ₱80k–150k total wedding budget in 2026. Philippine coordination packages run ₱20k–70k, which would be a third to half of an intimate wedding's entire budget. The segment can't carry a full-service price.

Mid-range weddings (100–150 guests, ₱150k–500k budgets) absorb that fee comfortably — and the platform's actual advantage is worth *more* at that size. At 50 guests a coordinator with a printed list is genuinely fine. At 150, QR check-in, live arrival counts and multi-checkpoint scanning start saving real time.

**Decision: make the cap configurable per engagement rather than fixed.** Set it per wedding to match what's being catered.

## The schema change is trivial

`guest_cap` stays as a column, editable from the engagement settings. Drop the hardcoded 50 default, or keep it as a starting suggestion. Nothing else in the data model changes.

**The cap should stay advisory, not enforced** — the same discipline `tables.capacity` already follows. Warn when the guest list exceeds it; never block. A coordinator adding guest 151 the week before the wedding must not hit a wall.

## What actually needs attention at 150–300 guests

Everything below was built and tested against seed data of a few dozen guests. None of it is broken, but none of it has been exercised at scale either.

**Guest list UI.** A flat unpaginated list of 300 rows will be slow and unusable. Needs pagination or virtualisation, and the existing filters become essential rather than convenient.

**Bulk QR export (Part 3).** 300 generated PNGs zipped in one request is a plausible serverless timeout. Either stream the zip, batch it, or generate in the background — decide before building Part 3, not after it fails on a real client's list.

**Seating.** Warn-then-spill was designed against a handful of tables. At 300 guests that's ~30 tables, and the unassigned-guests view becomes the primary working surface. Worth re-checking the bulk-assign UX at that size.

**Guest token rate limiting.** `guest_token_requests` inserts one row per request and self-cleans. At 300 guests all opening their link the evening invitations go out, confirm the limiter's window doesn't throttle legitimate traffic — and that the table's growth is genuinely bounded.

**Live counts.** Derived rather than cached, deliberately. At 300 guests those queries are still small, but worth confirming the day-of hub and scanner counts stay fast under repeated polling during an event.

**Scanner throughput.** 300 arrivals through one or two checkpoints is a queue. The "fail loudly" offline decision from M7 gets more consequential — worth revisiting whether a local queue is now warranted, since a marshal re-scanning 300 people because the connection dropped is a real event-day failure.

## Done when

- Guest cap is editable per engagement, warns rather than blocks
- Guest list, seating and bulk QR export tested against a seeded 300-guest engagement
- Rate limiter confirmed not to throttle a realistic invitation-night burst
- Scanner tested for sustained throughput

> Seed a third fake engagement at ~300 guests specifically for this. The two existing ones stay as they are — one populated, one sparse — and the new one exercises scale. Same reasoning as the build plan's two-engagement rule.

---

# Part 6 — Entourage & Processional

## Why this is the notable gap

A Filipino wedding has a formally structured entourage, and it is not a minor detail — it's one of the things the couple spends the most social energy on. Principal sponsors (often 15–30 ninong and ninang), secondary sponsors with specific liturgical roles (candle, veil, cord), ring bearer, coin bearer, bible bearer, flower girls, best man, maid of honour, groomsmen, bridesmaids.

Two artefacts come out of this, and coordinators currently build both by hand:

- **The entourage list** — who holds which role, used for the invitation, the church programme, and the printed souvenir programme
- **The processional lineup** — who walks with whom, in what order. Revised repeatedly, printed for the church coordinator, and read aloud on the day

Budget and entourage tools sit in Phase 2 in the build plan. **Entourage should move forward; budget should not.** A Filipino couple looking at a wedding platform with no entourage support will notice immediately — it reads as a product built for a different country's weddings.

## Scope

Deliberately not a full "entourage tool." Two things: roles on guests, and an ordered processional.

### Roles

Entourage members are already guests — they RSVP, they get seated, they get scanned. This is an attribute on `guests`, not a separate table.

```sql
alter table guests add column if not exists entourage_role text;
alter table guests add column if not exists entourage_sort int;
```

`entourage_role` is free text against a suggested list rather than a check constraint — Filipino weddings vary, some are civil, some add roles this spec hasn't thought of, and a constraint here would generate a migration every time a couple does something normal.

**Suggested values** offered in the UI as a picker with a free-text fallback: `principal_sponsor`, `secondary_sponsor_candle`, `secondary_sponsor_veil`, `secondary_sponsor_cord`, `best_man`, `maid_of_honour`, `matron_of_honour`, `groomsman`, `bridesmaid`, `ring_bearer`, `coin_bearer`, `bible_bearer`, `flower_girl`, `banner_bearer`, `usher`.

**Principal sponsors are guests like any other.** They get tokens, invitations and seating through the existing flow — the role is a label, not a separate path. This matters: sponsors are usually the *first* people invited and the ones who most often get printed invitations (see `ever-after-physical-vs-digital.md` §2).

### Processional

An ordered list of pairs or singles, per engagement.

```sql
create table if not exists processional_entries (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  sort_order    int  not null,
  label         text,                                  -- "Principal sponsors", "Ring bearer"
  left_guest_id  uuid references guests(id) on delete set null,
  right_guest_id uuid references guests(id) on delete set null,
  free_text     text,                                  -- for non-guests: "Church coordinator"
  notes         text,
  created_at    timestamptz not null default now()
);
```

**Why pairs with nullable sides:** most entries are two people walking together, some are one (flower girl alone, the bride with her father — who may not be on the guest list as a separate row). `free_text` covers anyone who walks but isn't a guest.

**RLS:** identical to `schedule_items` — Account read/write all, couple read/write own engagement, nobody else. Reuse `has_engagement()`.

## UI

An **Entourage tab** in the engagement workspace, next to Guests.

- **Roles view** — guests grouped by entourage role, with an add/assign action pulling from the existing guest list. Counts per role, since "how many ninongs do we have" is a question couples ask constantly
- **Processional view** — ordered list, drag or move up/down, each row being a pair, a single, or free text

## Where it surfaces

**On the wedding site** — an entourage section is a normal part of a Filipino wedding site and couples will expect one. This needs a new `section_type = 'entourage'` in the `site_sections` check constraint, rendered as a grouped list of names by role. Guest-visible, no contact details.

> Note the existing gap: `footer` was skipped in M5 for exactly this reason — the check constraint didn't include it. Adding `entourage` means amending that constraint, so **fold the `footer` addition into the same migration** rather than leaving a second known gap behind.

**In the run of show** — the processional is part of the ceremony. Link to it from the day-of editor rather than duplicating it.

**As a printable** — see Part 7.

## Explicitly not in scope

- Attire tracking, measurements, fittings
- Sponsor gift tracking
- Anything budget-related — that stays in Phase 2

## Done when

- Guests can be assigned entourage roles, with counts per role
- A processional can be built, reordered, and includes non-guest entries
- An entourage section renders on the wedding site
- The `footer` section type is added in the same migration

---

# Part 7 — Printables & Exports

## Why now

Part 3 builds server-side card generation. Once that machinery exists, several documents a coordinator currently makes by hand become nearly free. Building them separately later means building the same rendering pipeline twice.

Each of these replaces something that is currently a Canva file, a Word document, or a handwritten list.

## The set

**1. Table number signage.** The seating design assumes printed table numbers at the venue — that decision was made explicitly, and nothing currently produces them. Generate numbered signs matching the couple's site theme, as a print-ready sheet.

**2. Place cards.** Guest name and table number, one per accepted guest, laid out for printing. Same data as the invitation card, different layout.

**3. Attendee sheet.** The paper backup for each checkpoint — accepted guests, alphabetical, with table and tick columns. This already exists as a tab in `ever-after-phase0-checkin.xlsx`; it should now come out of the system. **This is a hard requirement, not a convenience** — venues lose signal, and the scanner's "fail loudly" behaviour means paper is the fallback.

**4. Day-of call sheet.** Every supplier's name, category and contact on one page, plus the run of show. `engagement_vendors` and `schedule_items` already hold all of it. This is the single page a coordinator actually carries.

**5. Caterer headcount export.** Final accepted count, broken down by `meal_choice` where the couple enabled it, plus dietary notes from `guest_notes`. CSV. Catering is billed per head and usually 40–50% of the whole budget — getting this number right and defensible matters more than any other export.

**6. Processional running order.** From Part 6, printed for the church coordinator and the emcee.

**7. Guest list export.** Plain CSV of the full list with RSVP status, table and notes. Couples will ask for it, and refusing to let people export their own data is a bad look for a service business.

## Implementation notes

**One shared generation path.** Part 3's card renderer, the printables here, and any future document should go through the same server-side pipeline. Different templates, one mechanism.

**Print-ready means paper sizes.** A4 is the Philippine default, not Letter. Place cards and table numbers need sensible margins and cut lines. Test by actually printing one, not by looking at a preview.

**PDF for multi-page printables, PNG for single images.** The opposite of Part 3's reasoning — these are printed, not sent over Messenger, and a coordinator wants one file with page breaks rather than 40 images.

**Everything here is Account and couple only.** Nothing in this set is guest-facing, and several items (attendee sheet, guest list export, call sheet) contain the entire guest list — the exact thing the token path is designed to never expose. Same authenticated server-action pattern as the rest of the internal tool.

**Scale.** At 300 guests, place cards and attendee sheets are long documents. Same generation constraints as Part 5 flags for bulk QR export — decide once, apply to both.

## Done when

- All seven generate correctly for a populated engagement, and degrade sensibly for a sparse one
- A4 output verified by physically printing the attendee sheet and place cards
- Caterer export reconciles exactly against the live accepted count
- Nothing in the set is reachable without an authenticated session

---

# Suggested order

1. **Member invite** — nothing client-facing works without it
2. **Token rotation** — small, security-relevant, independent
3. **QR invitation delivery** — after rotation, so the "printed cards will stop working" warning exists when cards do
4. **Open guest cap** — before the UI pass, so the guest list and seating screens get restyled at their real working size
5. **Entourage & processional** — independent of everything above; can run in parallel if convenient
6. **Printables & exports** — after Part 3, since it reuses that generation pipeline, and after Part 6, so the processional printable is included
7. **UI/UX pass** — last, so every new surface is styled in one sweep rather than several

Parts 2 and 3 are genuinely coupled: rotation without cards is harmless, cards without rotation means a leaked invitation can't be revoked. Build them adjacent.

## Notes for whoever builds this

The three security bugs already caught on this project were all the same shape: **trusting client-supplied data about identity or scope.** Signup metadata setting `global_role`. A scan checking the guest's engagement but not the checkpoint's. Part 1 is the highest-risk work in this document for exactly that reason — the invite token grants standing access to a real guest list, which is a larger prize than any single guest token.

Run `npm run verify:rls` and `npm run verify:guest-token` after Parts 1, 2 and 3. Extend both rather than treating the existing checks as sufficient — the handoff's own account of the `guest_scans` gap is a case of hand-verification not surviving the next change.
