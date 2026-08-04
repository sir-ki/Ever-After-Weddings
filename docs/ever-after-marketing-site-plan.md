# Ever After — Marketing Site Plan

The public front door: a parallax-driven marketing site that sits *in front of* the existing web app. A visitor lands here, learns what Ever After does, and signs in from the top-right into the product they already have.

Two deliverables:
- **Part A** — the plan (this document), to agree before designing
- **Part B** — a ready-to-paste brief for Claude Design

---

# Part A — The Plan

## 1. What this is, and what it isn't

**Is:** a public marketing site. Anonymous visitors, no auth, no data. Its only jobs are to explain the service, establish that Ever After is real and competent, and hand people to `/login` or an enquiry.

**Isn't:** part of the product. Nothing here reads guest data, engagements, or anything behind auth. The one exception is the vendor directory, which is already public at `/directory` and should be linked to, not rebuilt.

**Design in Claude Design, implement in Claude Code.** Claude Design produces the visual direction and page compositions. The production build happens in the Next.js app against the real tokens. Treat the Claude Design output as a high-fidelity reference, not shippable code.

## 2. Where it lives

Same Next.js app, new public routes. Reasons:

- Login already lives there, so "sign in" is an internal link rather than a cross-domain hop
- `/directory` is already public and already themed
- One deployment, one domain, one set of design tokens
- No second project to keep in sync

**Routing impact:** `/` currently isn't a marketing page. Making it one means the app's own entry point moves — signed-in users hitting `/` should be sent to their dashboard rather than shown a sales pitch. Worth confirming the current behaviour in `src/proxy.ts` before building.

## 3. Sitemap — five pages

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Home. The whole story in one scroll | Book a demo |
| `/how-it-works` | The couple's journey, start to finish | Book a demo |
| `/pricing` | The three bands, what's included | Book a demo |
| `/directory` | Vendor directory — **already exists**, link to it | Browse / apply |
| `/vendors` | For suppliers: why list, how to apply | Apply to be listed |
| `/contact` | Enquiry form, contact details | Send enquiry |

Plus persistent header links to **Sign in** (top right, per your requirement) and a **Book a demo** button.

> Five new pages, since `/directory` exists. If that feels thin, the answer is deeper pages, not more of them — a marketing site with six shallow pages converts worse than one with four substantial ones.

## 4. Page contents

### `/` — Home
The full narrative in one scroll, each section a parallax beat:

1. **Hero** — couple's names/date treatment, one line on what Ever After is, primary CTA
2. **The problem** — RSVP chasing, seating redone four times, invitations screenshotted into illegibility. Named plainly, because couples recognise it instantly
3. **What you get** — the six pillars: wedding website · invitations & RSVP · guest list & seating · day-of hub · QR check-in · vendor directory
4. **How it works** — three or four steps, condensed. Full version lives on its own page
5. **We do it for you** — the full-service promise. This is the differentiator and deserves its own beat
6. **Proof** — testimonial or case study. **Placeholder until you have a real wedding** — do not invent one
7. **Pricing teaser** — one line and a link, not the full table
8. **Closing CTA**

### `/how-it-works`
The couple's journey as a scroll-driven timeline: intake call → we build your site → invitations go out → RSVPs land automatically → seating → your wedding day → photos after. Each step gets a parallax stage.

Include what the *guest* experiences too — one link, three states — since that's genuinely novel and hard to convey in a feature list.

### `/pricing`
The three bands (Intimate / Standard / Grand), what's included at every band, what's excluded, and how payment works. Exclusions matter: "coordination" and "planning" get conflated, and saying it here prevents a bad conversation later.

### `/vendors`
Why a supplier should be listed: free, no commission, no exclusivity, couples contact you directly. What you need from them. Link to the existing application flow.

### `/contact`
Enquiry form — name, email/phone, wedding date, guest count, message. **Sends an email or writes a simple enquiries table; it does not create an account.** Account creation stays invite-only per the auth design.

## 5. Parallax — how, and where it stops

Parallax is the stated priority, so it should be genuine and structural rather than one hero effect.

**Techniques, by weight:**

| Technique | Where |
|---|---|
| Layered background depth — 2–3 planes at different scroll rates | Hero on every page |
| Sticky section with content scrolling past | `/how-it-works` timeline stages |
| Scroll-linked reveal — fade + rise as elements enter | Feature cards, pillars, pricing bands |
| Image scale-on-scroll — slow zoom as a photo passes | Full-bleed photo bands on `/` |
| Horizontal drift — soft opposing movement of two columns | The problem/solution section |
| Pinned counter or stat rising as you scroll | "40 hours back" style figures |

**Where it must stop:**

- **`prefers-reduced-motion` disables all of it.** Not reduced — off, with static layouts that still read correctly. This is non-negotiable, and it's also the failure mode most likely to be skipped
- **Mobile gets a lighter treatment.** Multi-plane parallax on a phone is janky and expensive. Keep reveals and sticky sections; drop the heavy layering
- **Nothing gates content.** Text must be readable if JavaScript fails or scroll-linked animation never fires. No content that only appears on scroll
- **Nothing loops.** Ambient perpetual motion reads as a template

**Performance budget:** this site is often opened on Philippine mobile data. Hero imagery compressed hard, animation via transform and opacity only (never layout properties), and no animation library unless it earns its weight — modern CSS scroll-driven animations cover most of the above natively.

## 6. Design language

Same brand as the product — this is the same company, and a visitor who signs in should feel continuity, not a jump.

- **Tokens:** the `--ea-*` palette from launch-readiness Part 4. Warm ivory canvas, blush and champagne surfaces, warm brown ink, muted rose accent. Never pure black
- **Type:** display serif for headings, UI sans for body. Marketing can go larger than the product — hero headings up to 64px on desktop — but the scale relationship holds
- **Shape:** 10px radius, hairline borders, no shadows, no gradients beyond a soft two-stop wash
- **Photography-forward.** This is where real wedding photos matter most. **Use placeholders until you have shots you own the rights to** — stock that looks like stock will undercut the whole thing
- **Contrast:** AA throughout, including text over photographs. Text on imagery needs a scrim; the brand's is a soft *white* scrim with dark text, not the conventional dark-scrim-white-text

## 7. Header and login

Persistent header, transparent over the hero, solid on scroll:

- Left: Ever After wordmark
- Centre: How it works · Pricing · Vendors · Contact
- Right: **Sign in** (text link) and **Book a demo** (accent fill button)

**Sign in goes to the existing `/login`.** No new auth surface, no new form. After login the existing redirect logic takes over and the user lands in the app — the marketing site is never seen again in that session.

Mobile: hamburger, with Sign in staying visible outside the menu.

## 8. What this needs from you

**Settled:**
- Pricing — three bands, ₱20,000 / ₱40,000 / ₱65,000
- Contact — static details for Kean James Brul, no form
- Photography — marked placeholders throughout, real photos swapped in after the first wedding

**Still owed, and the site is weaker without them:**
- **Real wedding photography.** The single biggest upgrade available to this site. After the first wedding, replacing placeholders with photos you own outright should be the immediate follow-up
- **One real testimonial.** Leave the section designed but empty rather than inventing one
- **Vendor names or logos**, once the directory has approved listings

> If you do want imagery before the first wedding, use properly free-licensed sources (Unsplash, Pexels) and download them yourself — searching for Filipino and church weddings gets closer to your market than the default results. Never pull images from other wedding suppliers' sites or social media; they're copyrighted and they show identifiable people who didn't consent.

## 9. Build order

1. Design system pass in Claude Design — tokens, type, one hero, one section pattern
2. `/` in full, since it establishes every pattern the others reuse
3. `/how-it-works` — the most parallax-dependent page
4. `/pricing`, `/vendors`, `/contact` — simpler, reuse established patterns
5. Header and mobile nav
6. Hand to Claude Code for implementation against real tokens
7. Reduced-motion and mobile-data verification on a real phone

---

# Part B — Claude Design Brief

*Paste this into Claude Design. Adjust the bracketed items first.*

---

Design a marketing website for **Ever After**, a full-service wedding platform in the Philippines. The company builds and runs the couple's wedding website, guest list, RSVPs, invitations, seating, and day-of coordination — the couple doesn't do the work.

**Audience:** engaged couples, 25–35, planning a wedding of 60–300 guests. Secondary audience: wedding suppliers who want to be listed.

**Positioning:** "Everything you need, nothing you don't." One platform so planning feels easier — not another app to learn. Warm and competent, never cutesy.

## Visual direction

"High-tech wedding vibes, but soft and romantic" — a modern product interface wearing a soft wedding palette. Not a pastel-script wedding template. Not a cold SaaS dashboard.

**Colours (use exactly these):**
- Canvas `#FDFAF7` · Blush `#F9EFEA` · Champagne `#F2E4DA` · Border `#E8DAD2`
- Ink `#3D2E2B` (warm dark brown, never black) · Secondary `#6B5551` · Muted `#7E6663`
- Accent fill `#A85D5B` (white text on it) · Accent ink `#8E4A48` (for coloured text on light)

Never use the accent fill as text on the canvas — it fails contrast. All combinations must pass WCAG AA.

**Type:** one display serif for headings (400 weight, generous), one clean sans for body and UI. Hero headings up to 64px desktop, sentence case throughout, no ALL CAPS except a small letterspaced lowercase eyebrow line.

**Shape:** 10px radius, hairline 1px borders, generous whitespace, **no drop shadows, no gradients** beyond an optional soft canvas-to-blush wash on heroes.

## Parallax — the priority

Parallax is the defining characteristic. It should be structural, not decorative — most major sections need a scroll-driven effect:

- Layered background depth, 2–3 planes at different scroll rates, on every hero
- Sticky sections with content scrolling past, for step-by-step narratives
- Fade-and-rise reveals as cards and features enter view
- Slow image scale on full-bleed photo bands
- Soft opposing horizontal drift between paired columns
- Numbers that count up as their section pins

**Hard constraints:** all motion disabled under `prefers-reduced-motion`, with static layouts that still read correctly. Lighter treatment on mobile — keep reveals and sticky, drop heavy multi-plane layering. No content is gated behind scroll. Nothing loops. Transform and opacity only.

## Pages

1. **Home** — hero · the problem couples face · six product pillars · how it works in brief · the full-service promise · testimonial [PLACEHOLDER] · pricing teaser · closing CTA
2. **How it works** — scroll-driven timeline: intake → we build your site → invitations sent → RSVPs land automatically → seating → wedding day → photos after. Include the guest's side: one link that becomes their invitation, then their confirmation, then their day-of hub
3. **Pricing** — three bands by guest count, everything included at every band, explicit exclusions, payment terms:

   | Band | Guests | Price |
   |---|---|---|
   | Intimate | up to 60 | ₱20,000 |
   | Standard | 61–150 | ₱40,000 |
   | Grand | 151–300 | ₱65,000 |

   Every band includes: wedding website built by the team · in-site invitations with QR cards · RSVPs flowing into the guest list · table assignment and seating · day-of hub · QR check-in at multiple checkpoints · day-of coordination on site · vendor directory access · printables.

   Excluded, stated plainly: suppliers' own fees (catering, photography, venue, florals) · full wedding planning, vendor sourcing and negotiation · styling and design · anything outside the wedding day itself.

   Payment: 50% on signing, 50% two weeks before the wedding. Bank transfer or GCash, invoiced directly. No online payment on the site.
4. **Vendors** — for suppliers: free listing, no commission, no exclusivity, couples contact them directly
5. **Contact** — **static contact details, no form.** Enquiries go directly to:

   > **Kean James Brul**
   > Facebook: Kean James Brul
   > Mobile: 0995 302 4349

   Present these as a warm, well-set contact block with a tappable phone link and a Facebook link — not a bare list. Include a short line on what to send when getting in touch (wedding date, rough guest count, venue if booked), so first messages arrive useful. A form would need mail infrastructure that doesn't exist; direct contact is also closer to how a full-service business actually starts a client relationship.

## Header

Persistent. Transparent over hero, solid on scroll. Left: wordmark. Centre: How it works · Pricing · Vendors · Contact. Right: **Sign in** text link and **Book a demo** accent button. Mobile: hamburger, with Sign in staying visible outside it.

## Product features to communicate

Wedding website built for them · in-site invitations with QR cards for Messenger or print · RSVPs that flow straight into the guest list · table assignment by group · day-of hub with live announcements and each guest's table · QR check-in at multiple checkpoints with live arrival counts · vendor directory · printables including place cards, table numbers and the coordinator's call sheet.

## Notes

- **Photography-forward, but every image is a marked placeholder.** Use clearly-labelled "your photo here" blocks in the correct aspect ratios, sized and positioned as the real photos will be. Do not use stock wedding photography — on a site whose pitch is making weddings beautiful, stock that reads as stock undercuts the message, and real photos from the first wedding will be a far stronger replacement. Design the layouts so a real image drops straight in
- No invented testimonials, no fake client logos, no made-up statistics
- Text over photos uses a soft **white** scrim with dark text, not dark-scrim-white-text
- Mobile-first: this is opened on Philippine mobile data. Compress imagery hard
