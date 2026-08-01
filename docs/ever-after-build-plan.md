# Ever After — Build Plan (Draft v1)

Order of work for the v1 platform. Each milestone ends with something you can actually use — not a half-wired layer waiting on the next one.

Companion to the data model and auth documents. Those define *what*; this defines *when*.

---

## Guiding rules

**Build vertically, not in layers.** Don't build "all the database", then "all the API", then "all the UI". Build one working feature end to end, then the next. You'll find design problems on the first feature instead of the twelfth.

**Two fake engagements from day one.** Create Maria & Jon and Erick & Erika as seed data before you build anything. Every feature gets tested against both, every time. This is how you catch data leaking between couples — the failure mode that matters most and the one that's invisible when you only have one test wedding.

**Nothing real until the security review.** No actual guest names, phone numbers, or photos until someone has reviewed the RLS policies and the token path. Fake data is enough to build the entire product.

---

## Milestone 0 — Foundation

*Nothing works yet, but everything after this is faster.*

- Next.js project, Tailwind, Supabase connected
- Deployed to Vercel on day one, not month three. A project that only runs locally develops habits that break in production
- Auth wired: sign in, sign out, session
- `users` table with `global_role`
- One Account user (you), created manually
- Seed script: two engagements with fake couples

**Done when:** you can log in, see your name, and log out, on the real deployed URL.

---

## Milestone 1 — Engagements dashboard

*The first thing that's genuinely useful. Everything else hangs off it.*

- `engagements` table with RLS
- List view: couple names, wedding date, stage, assigned to, site status
- Sort by date ascending — soonest first, because that's what you actually need
- Filter by stage, search by name
- Create engagement form
- Click through to a client workspace shell with empty tabs

**Done when:** you can create a wedding, see it in the list, and open it.

**Test:** create a second Account user. Both see all engagements. Create a couple user attached to one engagement — they see one, and requesting the other's id directly fails.

---

## Milestone 2 — Guest list

*The biggest single chunk of value in the product, and the thing the workbook proves you need.*

- `guests` table with RLS
- Guest list view inside the engagement workspace: name, side, group, contact, RSVP status
- Add, edit, archive a guest
- Bulk import from CSV or paste — you will not type 50 names by hand, and neither will a couple
- Filter by RSVP status and group
- Counts: invited, accepted, declined, no reply

**Done when:** the guest list does everything the workbook's Guest List tab does, minus the checkpoint columns.

**Test:** couple A cannot fetch couple B's guests, by any route.

---

## Milestone 3 — Guest tokens and RSVP

*The first thing a real guest would touch. Highest-risk surface — take it slowly.*

- `invite_token` generated on guest creation, secure RNG, unique index
- Server-side guest endpoints (`/api/g/:token`) returning hand-built response shapes
- Guest-facing RSVP page: their name, the event basics, accept or decline
- Own fields only: contact, notes, meal, song
- RSVP deadline enforced on write, reads stay open
- Responses land directly in the guest list — no merge step

**Done when:** you can send yourself a token link, RSVP, and watch the guest list update.

**Test:** guest A's token returns nothing about guest B. Try it directly against the API, not through the UI. Confirm no endpoint returns a full list. Confirm writes are rejected after the deadline.

> This milestone replaces the manual RSVP merge from Phase 0 — the single most tedious step in the playbook.

---

## Milestone 4 — Tables and seating

*Small, once guests exist.*

- `tables` table, `guests.table_id`
- Create tables with labels and capacity
- Bulk assign by `guest_group` — the primary action
- Warn on over-capacity with the numbers, then spill to the next table with space, showing who moved
- Individual reassignment
- Unassigned guests view — the list you work from until it's empty

**Done when:** you can seat 50 guests in under five minutes.

---

## Milestone 5 — The wedding site

*The client-visible artifact. Bigger than it looks — budget generously.*

- `sites` and `site_sections` tables, RLS with the asymmetric read/write
- One template to start. Not three. One
- Structured section editor: hero, story, the day, RSVP, gallery, details
- Draft and publish states
- Public route resolving `slug` to a published site
- Couple's read-only view of their own site

**Done when:** you can build a complete wedding site for a fake couple in under three hours, and publish it.

**Test:** logged in as the couple, attempt to write to `sites` and `site_sections` directly. Both must fail.

> Resist adding templates two and three here. The second template is much easier to build once you've seen what the first one got wrong.

---

## Milestone 6 — Day-of hub

*Guest-facing, mobile-first, used under bad conditions.*

- `schedule_items` with `is_guest_visible`
- `announcements` — the "right now" line
- Hub route: current announcement, schedule, own table, venue info, contacts
- Hidden until `day_hub_unlocked_at`
- Internal run-of-show view showing all items including internal ones

**Done when:** it loads fast and reads clearly on a phone, one-handed, in bright sunlight.

**Test on a real phone on real mobile data**, not a desktop browser resized. This page's whole job is to work in a field in Tagaytay.

---

## Milestone 7 — Checkpoints and scanning

*Only useful on one day, and it must work perfectly on that day.*

- `checkpoints` and `guest_scans`
- Configure checkpoints per engagement
- Scanner view: camera, decode, confirm, log — requires an authenticated session
- Manual name-search fallback, logging `method = 'manual'`
- Live counts: accepted, arrived, per checkpoint, accepted-but-not-arrived
- Duplicate scan handling — show "already scanned at 3:14pm" rather than silently logging twice

**Done when:** you can scan 20 codes in a row without the interface getting in the way.

**Test:** confirm a token alone cannot log its own scan. Confirm the scanner works with a flaky connection — queue locally and sync, or fail loudly. Silent failure at a live event is the worst outcome in the product.

---

## Milestone 8 — Vendor directory

*Last, because it has no dependents and no fixed deadline.*

- `vendors`, `vendor_photos`, `engagement_vendors`
- Vendor self-signup, lands as pending
- Vendor profile editor — cannot self-approve
- Account approval queue with approve, reject, request-changes
- Public directory filtered by category
- Per-event vendor log, with the nullable link to a directory listing

**Done when:** a vendor can sign up, you can approve them, and a couple can find them.

---

## After v1

In rough order of likely value:

- Budget and entourage tools
- Post-event photo and video uploads, with moderation
- Second and third site templates
- Visual seating chart
- True drag-and-drop site builder

Revisit this order once you've run a real wedding. It will probably be wrong.

---

## Realistic sequencing notes

**The riskiest milestones are 3 and 7.** Milestone 3 is the security surface; milestone 7 has to work on a specific day with no retry. Everything else is recoverable.

**Milestone 5 will take longer than you expect.** Site building is where scope creeps — every section suggests another option, every option suggests a setting. Build one template, ship it, and let the second one be informed by real use.

**Milestones 1, 2 and 4 are the fastest wins.** They're CRUD over data you understand, with clear done conditions. If momentum matters, front-load them and don't get stuck perfecting the dashboard.

**Do the security review after milestone 3, not at the end.** That's when the token path exists and before you've built five more things on top of possibly-wrong assumptions.

---

## The one-question checklist

Before starting each milestone, ask: *what would let me tell if this is broken?* Write that test first. For most of these it's some version of "couple A cannot see couple B's data" — which is why the two fake engagements exist from day one.
