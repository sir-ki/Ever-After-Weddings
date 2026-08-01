# Ever After — Auth & Access Design (Draft v1)

Companion to the data model. Covers who can log in, what each role can touch, and the guest token path.

Supabase Auth + Postgres row-level security.

---

## 1. Two completely separate access paths

This is the most important structural idea in the whole design. Do not blur it.

| | **Authenticated users** | **Guests** |
|---|---|---|
| Who | Account, couple, coordinator, vendor | The 50 people invited to a wedding |
| How they get in | Email + password (Supabase Auth) | A link containing a random token |
| Session | Yes, persistent | None — the token *is* the credential |
| What they see | Scoped by role via RLS | Exactly one guest's row, plus public event info |
| Can they be enumerated | No | **Must not be** — see §5 |

Guests never create accounts. Requiring 50 people to sign up to say "yes I'm coming" would kill your RSVP rate, and it would give you 50 more credentials to protect for no benefit.

---

## 2. Roles

### Account — internal team
- `global_role = 'account'`
- Sees every engagement, every guest list, every vendor
- The only role that can write site content
- Created manually by you. **No public signup path exists for this role** — it should be impossible to self-register as Account

### Couple / coordinator
- `global_role = 'couple'`
- Access scoped through `engagement_members` — a row grants access to exactly one wedding
- Both partners can have separate logins; an externally hired coordinator can be granted the same role
- Can read their site, cannot write it
- **Can** write their own guest list, tables, checkpoints, schedule and RSVP deadline

### Vendor
- `global_role = 'vendor'`
- Self-registers
- Can only read and write their own `vendors` row and its photos
- Cannot see any engagement, any guest, or any other vendor's data
- Listing is invisible to couples until Account sets `status = 'approved'`

### Invited guest
- Not a user. No row in `users`, no session
- Identified solely by `invite_token`

---

## 3. Permission matrix

| Table | Account | Couple / coordinator | Vendor | Guest (token) | Public |
|---|---|---|---|---|---|
| engagements | read/write all | read own | — | limited public fields | — |
| guests | read/write all | read/write own engagement | — | **own row only** | — |
| guest_scans | read/write all | read own engagement | — | — | — |
| tables | read/write all | read/write own | — | own table label only | — |
| checkpoints | read/write all | read/write own | — | — | — |
| schedule_items | read/write all | read/write own | — | guest-visible rows | — |
| announcements | read/write all | read/write own | — | active rows | — |
| sites | read/write all | **read own only** | — | published only | published only |
| site_sections | read/write all | **read own only** | — | published only | published only |
| media | read/write all | read/write own | — | approved only | approved, published |
| vendors | read/write all | read approved | own row only | — | read approved |
| engagement_vendors | read/write all | read/write own | — | credited only | credited only |
| users | read/write all | own row | own row | — | — |
| engagement_members | read/write all | read own engagement | — | — | — |

**The two rules that define the product:**

1. **Couples read their site but cannot write it.** This is the full-service promise, enforced at the database — not hidden in the UI. A couple who finds the API cannot edit their own site.
2. **Couples fully own their operational data.** Guest list, tables, checkpoints, schedule, RSVP deadline. Running their wedding is their job; designing the website isn't.

---

## 4. RLS policy sketches

Helper functions first, so policies stay readable:

```sql
create or replace function is_account() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from users
    where id = auth.uid() and global_role = 'account' and archived_at is null
  );
$$;

create or replace function has_engagement(eid uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from engagement_members
    where user_id = auth.uid() and engagement_id = eid
  );
$$;
```

**Engagements**

```sql
alter table engagements enable row level security;

create policy engagements_read on engagements for select
  using (is_account() or has_engagement(id));

create policy engagements_write_account on engagements for all
  using (is_account()) with check (is_account());
```

The couple's narrow write on `rsvp_deadline` is handled by a dedicated RPC rather than a column-level policy — simpler to reason about, and it gives you one place to validate the date isn't in the past.

**Guests** — the couple's core working table:

```sql
alter table guests enable row level security;

create policy guests_all on guests for all
  using (is_account() or has_engagement(engagement_id))
  with check (is_account() or has_engagement(engagement_id));
```

**Sites — the asymmetric one:**

```sql
alter table sites enable row level security;

create policy sites_read on sites for select
  using (is_account() or has_engagement(engagement_id) or status = 'published');

create policy sites_write on sites for insert with check (is_account());
create policy sites_update on sites for update
  using (is_account()) with check (is_account());
```

Read includes the couple. Write does not. Same pattern for `site_sections`.

**Vendors:**

```sql
alter table vendors enable row level security;

create policy vendors_public_read on vendors for select
  using (status = 'approved' or is_account() or owner_user_id = auth.uid());

create policy vendors_owner_write on vendors for update
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy vendors_account_write on vendors for all
  using (is_account()) with check (is_account());
```

A vendor updating their own row must not be able to set `status` — strip that field server-side, or an approved listing becomes self-serve. Any edit to an approved listing should arguably drop it back to `pending`.

---

## 5. The guest token path

**This is the highest-risk surface in the system.** Every other path requires a login. This one is a URL that anyone can hold.

### Token generation
- At least 128 bits of entropy from a cryptographically secure RNG — not `random()`, not a UUID v1, not anything derived from the guest's name or row id
- URL-safe base64 or base32, roughly 22–26 characters
- Unique index on `guests.invite_token`
- Generated once when the guest row is created

### What a token grants
Exactly one guest's row, on one engagement:
- Their own name, RSVP status, table label
- The engagement's public event info — date, venue, guest-visible schedule, active announcements
- The ability to set **their own** `rsvp_status`, `contact_phone`, `guest_notes`, `meal_choice`, `song_request`

### What a token must never grant
- Any other guest's name, contact number, RSVP status or table
- The full guest list, in any form, including counts by table
- Any internal field: `internal_notes`, scan history, engagement `notes`
- Anything on another engagement

> The failure to design against is one guest's link exposing the whole invite list. Assume tokens get forwarded, screenshotted, and pasted into group chats — because they will be.

### How to enforce it

**Do not** hand guests a Supabase anon key and write an RLS policy over the token. That puts a query builder in the guest's hands and makes one misconfigured policy fatal.

**Do** route all guest traffic through server-side endpoints that use the service role, take the token as a parameter, and return only a hand-built response shape:

```
GET  /api/g/:token          → this guest + public event info
POST /api/g/:token/rsvp     → set own RSVP fields
GET  /api/g/:token/day      → schedule, announcements, own table label
```

Every one of these looks up the token, resolves it to exactly one guest row, and constructs the response explicitly. No `select *`. No passing through a row object that happens to contain `internal_notes`.

### Hardening
- **Rate limit by IP** on token lookup. A token is unguessable at 128 bits, but rate limiting turns "theoretically infeasible" into "not worth attempting"
- **Never log full tokens.** Log a prefix or a hash if you need to trace
- **Keep tokens out of referrer headers** — no third-party scripts on guest pages, and `Referrer-Policy: no-referrer`
- **Rotation:** support regenerating a guest's token. Someone will post theirs publicly
- **Expiry:** tokens stay valid until the engagement is archived. RSVP *writes* should close at the deadline, but reads stay open — guests need the hub on the day

---

## 6. QR codes and checkpoint scanning

The QR encodes the guest's token URL, so it's the same credential. Two consequences:

**Marshals must be authenticated.** Scanning writes to `guest_scans`, and a scan is a real operation — it marks a guest as arrived and, at the giveaway checkpoint, as having collected. That endpoint must require a logged-in Account or coordinator session, with the token identifying *which guest*, never *who is scanning*.

```
POST /api/scan   { token, checkpoint_id }   ← requires an authenticated session
```

Never expose an endpoint where the token alone can log its own scan. Otherwise a guest can mark themselves as having collected a giveaway from the car park.

**Manual fallback is required.** Someone will arrive without their QR. The marshal needs a name-search view — that's an authenticated screen showing the guest list, which is fine because marshals are logged in. It writes a scan with `method = 'manual'`.

---

## 7. Account creation flows

| Role | How the account is created |
|---|---|
| Account | Manually by you, directly in the database or an admin-only screen. **No public path** |
| Couple / coordinator | Invited by Account. Creates an `engagement_members` row at the same time — no self-signup, no way to attach yourself to a wedding |
| Vendor | Public self-signup. Lands as `status = 'pending'`, invisible until approved |

The couple invite flow matters: never let a signup form take an `engagement_id`. The invitation must carry it, or a stranger joins a wedding by guessing a UUID.

---

## 8. Before real guest data goes in

The two things worth paying someone to review:

1. **RLS policies** — specifically that no policy grants a couple access to another engagement, and that `sites` write really is Account-only. Test it by logging in as one couple and requesting another's data directly, not through the UI.
2. **The token path** — that every guest endpoint returns a hand-built shape, that no endpoint leaks a sibling guest, and that tokens are generated with a secure RNG.

These are the two places where a mistake exposes one couple's guest list to another, and both are hard to self-assess without security experience.

**A cheap test you can run yourself:** create two engagements with fake data. Log in as couple A and try to fetch couple B's guests by id. Take guest A's token and try to fetch guest B. Both should fail. Do this again after every change to a policy or a guest endpoint.

---

## 9. Still open

- **Does the couple invite go to both partners separately, or one shared login?** Schema supports both
- **Token rotation UI** — who can regenerate a guest's link, and does the old one die immediately
- **Vendor re-approval** — does editing an approved listing drop it back to pending
- **Session length** for Account users, and whether marshals get a short-lived scanning session on the day
