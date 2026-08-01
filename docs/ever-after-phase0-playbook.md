# Ever After — Phase 0 Operations Playbook

How to deliver one wedding manually, end to end. Covers the four remaining operational pieces: the wedding website, the day-of hub, vendor recruitment, and client intake.

Sample event throughout: **Maria & Jon · 14 February 2027 · Casa Almendra, Tagaytay**

---

# 1. The Wedding Website

## Goal
Assemble a client-ready site in **under 4 hours**, not 4 days. In Phase 0 you're proving the service sells — not perfecting a template library.

## Choosing a builder
Pick one and stick with it for all Phase 0 weddings. Switching mid-way means relearning and no comparable time data. What matters:

| Requirement | Why |
|---|---|
| Custom domain support | The couple's link is the product. A builder-branded URL undercuts the premium feel |
| Genuinely good on mobile | Most guests open the link on a phone, at the table, one-handed |
| Password or hidden pages | The day-of hub shouldn't be public before the day |
| Duplicate-a-site function | This is how a 4-hour build becomes a 90-minute build by wedding #3 |

> Don't over-research this. Any mainstream builder clears the bar. The one you already know how to use is the right answer.

## Section order

Build in this order — it's roughly the order a guest reads, and each section is independently shippable.

**1. Hero**
Couple's names, date, venue, one strong photo. One button: **RSVP**.
*Light, airy image with a soft white scrim and dark text — not the conventional dark-scrim/white-text treatment.*

**2. Our story**
Three short paragraphs, maximum. How they met, the proposal, what they're looking forward to. Ask the couple for this in their own words during intake; lightly edit rather than rewrite — their voice matters more than your prose.

**3. The day**
Date, ceremony time, reception time, venue name and address, an embedded map. Do **not** put the full run of show here — that lives in the day-of hub and it will change.

**4. RSVP**
Embedded form, or a button to it. Include the deadline in bold, right next to it.

**5. Gallery**
6–12 engagement photos. More than that and mobile load time suffers.

**6. Details**
Dress code, parking, whether children are invited, gift preferences. This section kills the most guest questions per word written — worth doing properly.

**7. Suppliers** *(optional, and useful to you)*
Credit the photographer, florist, caterer. Costs you nothing, gives vendors a reason to say yes when you recruit them, and doubles as a live example of the directory you're pitching.

**8. Footer**
Couple's contact for questions. Not yours — you're invisible to guests.

## What to skip in Phase 0
- Custom fonts and animations
- A separate page per section (one long scrolling page reads better on mobile anyway)
- Registry integrations
- Multi-language

## Time-boxing
Log each of these in the Phase 0 tab:

| Task | Target |
|---|---|
| Collecting content from the couple | *the real bottleneck — expect days of waiting, not hours of work* |
| Building the site once content is in hand | 2–3 hrs |
| Revisions after the couple reviews | 1 hr |

> If content collection dominates, the thing to build first isn't a website builder — it's a structured intake that forces content out of couples early. That would be a genuine Phase 0 finding.

---

# 2. The Day-Of Hub

## What it is
A mobile page guests open **on the wedding day**. Schedule, map, seating, announcements. Guests will open this standing up, one-handed, possibly on venue wifi that barely works.

## Build it as a hidden page on the same site
Not a separate product. Same domain, unlisted or password-protected until the morning of the event.

**URL:** something short and typable — `[site]/day` — because you'll print it on a card and people will type it wrong.

## Sections, in order

**1. Right now**
One line, edited live by you during the event: *"Ceremony starts in 15 minutes — please take your seats."*
This is the single most valuable element on the page and the reason it can't be a PDF.

**2. Today's schedule**
Times and segments only. Not the operational run-of-show — guests don't need to know when suppliers load out.

> Ceremony 3:00 PM · Cocktails 4:30 PM · Dinner 5:30 PM · Programme 6:30 PM · Send-off 9:00 PM

**3. Find your table**
Guest-facing view of the seating plan. Simplest version: a table-by-table list of names. A search box is better but rarely worth building manually at 50 guests.

**4. Getting around**
Venue map or a photo of the floor plan. Parking. Where the restrooms are. Where to leave gifts.

**5. Share your photos**
Upload link or a hashtag. This is how you collect guest photos without building the upload feature — a shared cloud folder link works fine.

**6. Who to ask**
Name and number of the coordinator on duty. Not the couple.

## Getting guests onto it
- QR code printed on the place card or menu, table tents at minimum
- Short URL printed underneath the QR, because scanning fails
- Emcee mentions it once at the start of the reception

## Phase 0 reality check
Test the page on a phone **at the venue** during the ceremony rehearsal or supplier setup. Venue wifi and mobile signal in a converted barn or garden are the number one reason day-of tech fails. If the signal is bad, print the schedule and seating as a backup — the same way you're printing attendee sheets.

---

# 3. Vendor Recruitment

## Why this matters more than it looks
You're asking vendors to commit to something that doesn't exist yet. **If 10 vendors won't say yes to a free listing on a promise, the directory feature is worth less than the PRD assumes** — and that's a finding worth having before you build it.

Target: **5–10 vendors, across at least 4 categories** (photo, venue, catering, florals, HMUA, cake, music).

## The offer
Free listing, no catch, for the first cohort. You're not monetising vendors in Phase 0. What you're buying is:
- Proof that vendors want in
- A directory that isn't empty when your first couples look at it
- A referral channel — vendors talk to engaged couples constantly

## What you ask for
Keep it to what fits in one message reply:
- Business name and category
- 3–5 portfolio photos
- One paragraph describing what they do
- Starting rate or rate range
- Contact number, email, socials

> If a vendor can't produce this in a week, they won't maintain a listing either. That's useful signal.

## The pitch (short form — messenger / DM)

> Hi [name] — I'm building Ever After, a wedding planning service here in [area]. We handle the couple's website, guest list and day-of coordination.
>
> We're putting together a directory of suppliers we can point our couples to. Free to be listed — I just need a few photos, a short description and your contact details.
>
> No commission, no exclusivity. Couples contact you directly.
>
> Interested? Happy to send over what I'd need.

## The pitch (longer — email)

**Subject:** Free supplier listing — Ever After Weddings

> Hi [name],
>
> I'm [your name], starting Ever After — a full-service wedding planning outfit in [area]. We build the couple's wedding website, run their guest list and RSVPs, and coordinate the day itself.
>
> We're assembling a supplier directory for our couples. I'd like to include [business name].
>
> How it works: your listing shows your photos, a short description, your rates and your contact details. Couples reach you directly — no commission, no exclusivity, no fee to be listed.
>
> If you're in, I'd need:
> · 3–5 photos
> · A paragraph on what you do
> · Starting rate or range
> · Contact number, email, socials
>
> Happy to answer anything first.
>
> [your name] · [contact]

## Handling the obvious objections

**"What's the catch / what do you charge?"**
Nothing in this first cohort. You may introduce paid placement later, and existing listings stay free — say that plainly if you mean it, and don't say it if you don't.

**"How many couples do you have?"**
Be honest. *"We're starting out — [N] weddings booked. I'd rather have you in early than oversell it."* Vendors have heard inflated numbers before and they check.

**"Do I have to give you a referral fee?"**
No. Couples contact them directly and you're not in the transaction — that's the whole design.

## Log in the Phase 0 tab
- Vendors approached
- Vendors who said yes
- Vendors who actually sent materials
- Days from yes to materials in hand

> The gap between "yes" and "materials received" is the number that predicts whether a self-serve vendor signup will work. If it takes three chase messages now, expect the same later.

---

# 4. Client Intake

## Purpose
Get everything you need from the couple **in one sitting**, so you're not chasing details for six weeks. Content collection is the likeliest bottleneck in the whole process.

## Format
A single call or meeting — 45–60 minutes — with you filling in a form as you go. **Do not send a blank form and hope.** Couples in wedding-planning mode don't fill in forms; they answer questions.

## Intake checklist

### The basics
- Both partners' full names, as they should appear publicly
- Preferred short form ("Maria & Jon")
- Wedding date
- Ceremony venue, address, start time
- Reception venue, address, start time
- Expected guest count
- Best contact number and email for each partner

### The website
- Their story — how they met, the proposal *(record the call; transcribe later — you'll get better material than they'd ever write down)*
- 6–12 photos they want used, plus one hero image
- Dress code
- Children invited? Yes/no, and how they want it phrased
- Gift preferences, and how they want it phrased
- Parking and travel notes
- Anything they specifically don't want on the site

### The guest list
- Who's building it, and by when
- Do they have it in a usable format already, or is it in someone's head
- RSVP deadline *(they set this — it varies with their catering and venue deadlines)*
- Who gets a plus-one, and how it's decided
- Any guests who must not be seated together *(ask directly — every wedding has this and nobody volunteers it)*

### The day
- Rough run of show, if they have one
- Who's the emcee/host
- Which suppliers are already booked, with contact details
- Which suppliers they still need — *this is your directory referral opportunity*
- Do they have a separate coordinator, and if so, who
- Checkpoints they want on the day: arrival only, or gifts and giveaways too

### Expectations
- What they most want off their plate
- What's worrying them most
- How they want to be updated — how often, on what channel
- Who's the decision-maker if the two of them disagree *(ask lightly; it saves weeks)*

## The two questions that matter most

**"What are you most worried about?"**
Their answer tells you what to over-deliver on. It's rarely the website.

**"What would make you say this was worth it?"**
This is your success criterion, in their words. Write it down verbatim and check it after the event.

## Set expectations, clearly

Say these out loud at intake, or you'll pay for it later:

- **You build the site; they don't.** They'll review it in a scheduled walkthrough. There's no self-service editor — that's deliberate, it's why they're not doing the work.
- **Turnaround for changes** — give a real number ("2 working days") and hold it
- **Content deadline** — when you need photos and story text by, and what happens if it's late
- **RSVP deadline is theirs to set**, but once set, you both hold it
- **What isn't included** — be explicit. Styling, supplier negotiation, on-the-day coordination beyond what you've agreed

## After intake
Send a written summary within 24 hours: what you captured, what you're waiting on, and the dates you both committed to. This one message prevents most scope disputes.

---

# Phase 0 Sequence

| When | Do |
|---|---|
| Week 0 | Intake call · written summary · content deadline agreed |
| Week 0–1 | Vendor recruitment in parallel — approach 10, target 5 |
| Week 1–2 | Build the website once content lands |
| Week 2 | Couple walkthrough · revisions |
| Week 2–3 | Site live · RSVP form open · invitations sent |
| Deadline −2 wks | First RSVP reminder |
| Deadline −3 days | Final reminder |
| Deadline | Guest list closed · seating assigned |
| Week of | Day-of hub built · tested on a phone **at the venue** |
| Day −1 | Attendee sheets printed · marshals briefed |
| Day | Run it · mark checkpoints live |
| Day +1 | Reconcile counts · note what broke |
| Day +7 | Debrief with the couple · complete the Phase 0 log · decide what to build |

---

# The Decision Gate

After 1–3 weddings, you should be able to answer:

1. Does the service sell, and at what price?
2. Which task ate the most hours?
3. What did couples ask for that wasn't in the plan?
4. Would vendors actually maintain their own listings?
5. What's the *real* MVP?

> Expect the answer to Q5 to disagree with the MVP cut in the PRD. That disagreement is the entire return on running Phase 0.
