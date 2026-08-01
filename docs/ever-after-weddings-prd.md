# Ever After Weddings — Product Requirements Document (Draft v0.2)

> Status: Living draft. Sections marked **[TBD]** need decisions.
> **Key change in v0.2:** Added Phase 0 (Manual Service) ahead of the platform build, to validate demand and surface real requirements before writing code.

---

## 1. Overview

**Product name:** Ever After (working domain: Ever After Weddings)

**Elevator pitch:** A full-service wedding planning platform where couples get a beautiful wedding website, guest and RSVP management, a Day-of hub, and a vendor showcase — built and run entirely by the Ever After team, not self-serve.

**Business model:** Full-service provider. Ever After builds and edits every couple's site; couples never touch the builder.

**Founder context:** Solo founder with a project management background, limited coding depth, intending to build with AI assistance (Claude Code). This shapes the phased approach below.

---

## 2. Phasing Strategy

| Phase | What it is | Goal |
|---|---|---|
| **Phase 0 — Manual Service** | Deliver the full client experience using off-the-shelf tools (no custom software) | Validate demand, discover real pricing, learn where time actually goes |
| **Phase 1 — Platform v1** | Build the custom platform based on what Phase 0 taught us | Make delivery efficient and scalable |
| **Phase 2 — Enhancements** | Add features deferred from v1 | Deepen the product once core is proven |

**Rationale:** The couple's experience should feel identical in Phase 0 and Phase 1. The difference is entirely on the operator's side — manual stitching vs. custom tooling. Building software before proving the service sells risks months of work on the wrong features.

---

## 3. Phase 0 — Manual Service Delivery

### 3.1 Goal
Complete 1–3 real weddings end-to-end using existing tools.

### 3.2 Tool Stack (interim)
| Need | Interim tool |
|---|---|
| Wedding website | No-code site builder (built by Ever After for the couple) |
| RSVP collection | Form tool feeding a spreadsheet |
| Guest list, seating, budget, entourage | Spreadsheets |
| Invitation delivery | Link to the couple's site (in-site accept/decline) |
| Day-of hub | Simple mobile-friendly page: schedule, map, seating |
| Guest check-in / validation | QR code per guest + spreadsheet on phone at each checkpoint |
| Vendor directory | Simple listing page, manually maintained |
| Post-event photos/videos | Shared cloud folder |

### 3.3 What Phase 0 Is Testing
1. **Will couples pay, and how much?** → resolves the parked pricing question with real data
2. **Where does operator time actually go?** → tells us what to automate first (may differ from the paper MVP)
3. **What do couples ask for that wasn't anticipated?**
4. **Will vendors sign up?** → try recruiting 5–10 vendors with only a promise; if that's hard now, it stays hard later

### 3.4 First Clients
Realistic first clients are warm contacts — friends, colleagues, referrals. Consider a steep discount or free first wedding in exchange for honest feedback and permission to use it as a portfolio/case study. The case study matters more than the first revenue.

### 3.5 Decision Gate (exit criteria for Phase 0)
Before building Phase 1, we should be able to answer:
- Does the service sell, and at what price point?
- Which manual steps are painful enough to justify building?
- What is the *real* MVP, based on lived operational experience?

**[TBD]** How many weddings before the gate — 1, 2, or 3?

---

## 4. User Roles & Permissions (Phase 1 target state)

| Role | Website | Planning Tools (Guest List/Budget/Timeline/Entourage) | Vendor Directory |
|---|---|---|---|
| **Account** (internal team) | Full edit access, all engagements | Full edit access, all engagements | Approves/manages all listings |
| **Couple** | View only (no edit) | Full hands-on access, own wedding only | Browse listings, view vendor contact info |
| **Vendor** | No access | No access | Manages own listing only, pending approval |

**Notes:**
- Couples cannot edit or comment on their website. Feedback happens via scheduled meetings/demos with the Ever After team.
- **Operational exception:** Couples *can* manage operational data tied to their event — RSVP deadline, guest table/seat assignments, and checkpoint configuration — even though they can't edit site design/content.
- The Coordinator role is website-access-only; an externally hired planner can be trained on it.
- Vendor listings require Account approval before going live.
- **[TBD]** Sub-roles within "Account" (e.g., designer vs. approver vs. support)? Likely unnecessary while solo.

---

## 5. Core Guest Lifecycle (the heart of the product)

**Invite → Accept/Decline → Seat/Table Assignment → Day-of Checkpoint Validation**

These are one connected system, not separate features:

1. **In-site invitation** — lives on the couple's website, not a PDF download. Guest accepts or declines directly.
2. **RSVP deadline** — set by the couple, since it varies with each event's timeline.
3. **Guest list** — auto-updates from RSVP responses; no retyping.
4. **Declined guests** — remain visible for the host's records but are filtered out of the main active attendee list.
5. **Table/seat assignment** — each accepted guest tied to a table and seat number.
6. **Multi-checkpoint validation** — QR code per guest, scannable at multiple configurable checkpoints (arrival, giveaways, gift table, etc.). Each scan logged separately with time, so the couple/host gets real-time event operations data, not just a static RSVP record.

**Checkpoints are configurable per event** — the Account team names and sets them up (e.g., "Entrance," "Gift Table," "Giveaway Booth"), staffed via any phone/tablet camera. No special hardware.

---

## 6. Feature Scope (Phase 1 Platform)

### 6.1 Couple-Facing Website
- Wedding website (Account-built, template-based)
- In-site invitation with accept/decline
- Up to 50 guests & RSVPs
- Day-of hub — schedule, map, seating, live announcements, any phone
- Full-day event schedule (start to finish), guest-visible
- Attendee list as living reference (host/organizer use, seating, validation)
- Guest list & seating tools
- Vendor directory (showcase only)
- Planner, budget & entourage
- Post-event video/photo uploading

### 6.2 Vendor System (two lightweight parts, not a marketplace)
1. **Public vendor directory** — vendor self-registers, submits profile (category, portfolio, description, rate range, contact info), Account approves, listing goes live. Couples browse and contact vendors directly.
2. **Per-event vendor log** — vendors sourced outside the platform (e.g., a caterer the couple already booked) are recorded in that event's details for reference. No approval flow needed; they aren't being discovered, just logged.

### 6.3 Internal Team Tools
- **Engagements Dashboard** — list of all clients: couple names, wedding date, stage (Onboarding → Building → Live → Post-Wedding → Archived), assigned team member, site status. Filter by stage/coordinator/month, search by name.
- **Client workspace** — click an engagement to open, with "View Live Site" and "Edit Site" actions, plus tabs for Guest List, Budget/Planner, Suppliers, Timeline, Files.
- **Site builder** — see 6.4 below.
- **Vendor approval queue**

### 6.4 Site Builder Approach
**Recommendation for v1: template + structured form, not true drag-and-drop.**

A real drag-and-drop page builder is the single most complex item on this list — often more work than everything else combined. Since only the internal team uses it, a cheaper approach works: the team picks a template and fills in structured fields (couple names, story, photos, venue, schedule items, colors), and the site renders from that data.

Benefits: dramatically faster to build, less error-prone, more consistent output — arguably better for a full-service brand. True drag-and-drop can be added later if templates hit a real wall.

### 6.5 Explicitly Out of Scope (decided)
- No in-app payment gateway
- No website comment/feedback tool for couples (live meetings/demos instead)
- No in-app chat between couples and vendors
- No native mobile apps for v1

---

## 7. Phase 1 MVP vs. Phase 2

### In Phase 1 MVP
- Wedding website (Account-built, template-based)
- In-site invitation with accept/decline + couple-set RSVP deadline
- Guest list (auto-updated from RSVPs)
- Table/seat assignment (data-level; simple list/table view)
- Multi-checkpoint QR validation
- Day-of hub (schedule, map, live announcements)
- Attendee reference list for host/organizers
- Vendor directory + per-event vendor log
- Engagements Dashboard, site builder, vendor approval queue

### Deferred to Phase 2
- Budget & entourage tools *(valuable but not guest-facing; a delay doesn't block a wedding day)*
- Post-event photo/video uploading *(only matters after the event)*
- Visual drag-and-drop seating chart builder *(assignment is in MVP; the fancy chart UI can wait)*
- True drag-and-drop website builder

**Cut logic:** everything in MVP is either something a guest touches on the wedding day, or something the internal team needs to operate at all.

> **Note:** This cut is provisional. Phase 0 experience should be used to re-validate it before build begins.

---

## 8. Technical Decisions

### 8.1 Platform
**Responsive web app** — one codebase, works on desktop (internal builder work) and mobile (guests, couples, checkpoint scanning). No app store friction; guests just tap a link. QR scanning via browser camera API.

*Deferred:* native mobile app, only if offline scanning at poor-signal venues becomes a real pain point. That would be a small, focused scanner app — everything else stays web.

### 8.2 Recommended Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (React) | Frontend + backend in one codebase; strong multi-tenancy patterns; heavily documented (helps AI-assisted building); SSR means shared wedding-site links load fast and preview correctly |
| Styling | Tailwind CSS | Fast responsive layouts; manageable design system across many client sites |
| Database / Auth / Storage | Supabase (Postgres) | Relational data fits (engagements ↔ guests ↔ vendors ↔ checkpoints); row-level security maps cleanly to the three roles; built-in file storage for post-event media; free tier while pre-revenue |
| Hosting | Vercel | Built for Next.js; wildcard subdomain support |
| QR codes | Library for generation; browser camera for scanning | No native app required |

### 8.3 Open Technical Questions
- **[TBD] Multi-tenancy URL structure:** subdomain (`mariaandjon.everafterweddings.com` — more premium/personal) vs. path (`everafterweddings.com/mariaandjon` — simpler). Affects routing structure; decide before build.

### 8.4 Build Approach & Risk
Building with AI assistance (Claude Code) is realistic for reaching a working prototype. However, once real client data (guest names, contact info, photos) is stored, security judgments become hard to make without technical grounding — particularly auth correctness, data isolation between couples, and load handling.

**Recommendation:** build the prototype, then have a developer review security and data isolation before real client data goes in. A few contractor hours is far cheaper than building from scratch and far safer than skipping review.

---

## 9. Branding & Design

**Direction:** "High-tech wedding vibes, but soft and romantic" — the confidence and clarity of a modern tech product, warmed by romantic tones so it never feels cold or corporate. Think *a modern SaaS dashboard wearing a soft wedding palette.*

**Palette:** Light and airy — blush, champagne, warm ivory base with muted rose accents and warm brown text. *(Darker plum/terracotta overlay directions were explored and rejected as too heavy.)*

**Typography:** Elegant serif for headlines (romantic, used sparingly and confidently), clean sans-serif for body and UI (where the "high-tech" feel comes through).

**UI language:** Rounded soft elements, generous white space, subtle motion/microinteractions, photography-forward.

**Homepage hero:** Banner style — full-width hero with overlay nav, centered headline with small eyebrow line, one clear CTA, carousel dots, and a partner/vendor strip below.

**Note on photography:** if using photos in the hero while keeping the light feel, use a bright airy image with a soft *white* scrim and dark text — not the conventional dark-scrim/white-text approach.

**[TBD]** Logo — none yet; needs design.
**[TBD]** Wedding site starter templates — how many, and what styles (minimalist, rustic, classic elegant, modern)?

---

## 10. Business & Operations

- **[TBD] Monetization:** flat package, tiered packages, or subscription? *Phase 0 should answer this with real data.*
- **[TBD] Payment collection:** no in-app gateway, so how do couples pay (bank transfer, GCash, invoice)? Manual for now.
- **[TBD] Vendor monetization:** do vendors pay to be listed, or is it free exposure?
- **[TBD] Target launch date**
- **[TBD] Success metrics for month one**

---

## 11. Legal & Compliance

- **[TBD] Data privacy:** guest RSVP data, contact info, and photos will be stored. Confirm obligations under the Philippines' Data Privacy Act (NPC registration may apply depending on data volume). Recommend consulting a lawyer or compliance advisor.
- **[TBD] Vendor agreements:** terms vendors accept before listing (listing accuracy, conduct).
- **[TBD] Couple agreements:** service contract for the full-service package.

---

## 12. Open Questions Summary

**Blocking Phase 0:**
1. How many weddings before the decision gate?
2. Who are the first 1–3 candidate couples?

**Blocking Phase 1 build:**
3. Multi-tenancy URL structure (subdomain vs. path)
4. Number and style of starter templates
5. Logo/brand assets

**Business-side (can run in parallel):**
6. Pricing model and payment collection
7. Vendor monetization
8. Target launch date and month-one success metrics
9. Data privacy compliance approach
10. Vendor and couple contract terms

---

*Living document — update as decisions are made.*
