# RSVP Form — Copy Draft (Phase 0)

Sample event: **Maria & Jon · 14 February 2027 · Casa Almendra, Tagaytay**

Replace the bracketed bits per couple. Wording is written to be warm but short — every extra sentence is a chance for a guest to close the tab.

---

## Page header

> ### Maria & Jon
> **14 February 2027 · Casa Almendra, Tagaytay**
>
> We'd love to know if you can join us.
> Please reply by **20 January 2027** so we can finalise seating and catering.

*(Deadline is set by the couple — it varies per event.)*

---

## Q1 — Who's replying?

**Label:** Your name
**Type:** Dropdown (pre-loaded with all invited names)
**Required:** Yes
**Helper text:** Can't find your name? Message us at [couple's contact] and we'll sort it out.

> **Why a dropdown, not a text box:** replies match your guest list exactly, so no reconciling "Bea F." against "Beatriz Fernandez" later. Trade-off: everyone with the link can see the invite list.

---

## Q2 — Are you coming?

**Label:** Will you be joining us?
**Type:** Single choice
**Required:** Yes

- Joyfully accepts
- Regretfully declines

**Helper text (optional):** No hard feelings either way — we just need a headcount.

---

## Q3 — Party size

**Label:** How many of you are coming, including yourself?
**Type:** Number (1–[max allowed for that guest])
**Required:** Only if Q2 = accepts
**Show only if:** Q2 = accepts **and** this guest was given a plus-one

**Helper text:** Your invitation is for [N] guest(s).

> Skip this question entirely for single-seat invitations. Asking it invites guests to assume a plus-one exists.

---

## Q4 — Names of anyone joining you

**Label:** Who's coming with you?
**Type:** Short text
**Required:** No
**Show only if:** Q3 > 1
**Helper text:** First and last name, so we can print their place card.

---

## Q5 — Contact number

**Label:** Best number to reach you on the day
**Type:** Phone
**Required:** Only if Q2 = accepts
**Helper text:** Only used for wedding-day updates — nothing else.

---

## Q6 — Anything we should know?

**Label:** Anything we should know?
**Type:** Long text
**Required:** No
**Helper text:** Dietary needs, allergies, mobility, arriving late — anything at all.

> One open box instead of four separate fields. Guests tell you what matters; you don't chase what doesn't.

---

## Q7 — Meal choice *(optional — include only if the caterer needs it)*

**Label:** Which would you prefer?
**Type:** Single choice
**Show only if:** Q2 = accepts

- [Option A — e.g. Chicken]
- [Option B — e.g. Fish]
- [Option C — e.g. Vegetarian]

> Only include if your caterer genuinely needs a per-option headcount. Otherwise it's a field you'll chase for nothing.

---

## Q8 — Song request *(optional — nice to have)*

**Label:** A song that'll get you on the dance floor?
**Type:** Short text
**Required:** No
**Show only if:** Q2 = accepts

> Costs nothing, guests enjoy it, the DJ gets a usable list.

---

## Confirmation screen — accepted

> ### See you there.
> Thanks, [name] — we've got you down.
>
> We'll send the schedule, venue map and your table number closer to the day.
> Need to change your answer? Message us at [couple's contact].

## Confirmation screen — declined

> ### We'll miss you.
> Thanks for letting us know, [name].
>
> If your plans change before **20 January**, just message us at [couple's contact].

---

## Reminder message templates

**First reminder — 2 weeks before deadline**

> Hi [name]! Just a nudge that Maria & Jon's RSVP closes on 20 January.
> One minute to reply here: [link]

**Final reminder — 3 days before deadline**

> Hi [name] — last call for Maria & Jon's RSVP, closing 20 January.
> If we don't hear back we'll assume you can't make it, so we can finalise seating.
> [link]

**After the deadline — no reply**

> Hi [name], we've closed the guest list for Maria & Jon's wedding.
> If you're still hoping to come, message [couple's contact] directly — we'll do our best.

---

## Fields deliberately left off

| Field | Why not |
|---|---|
| Postal address | You already invited them; you have it |
| Email *and* phone | Pick one. Two contact fields doubles the chasing |
| Relationship to couple | You know this — it's already in your guest list |
| Accommodation needs | Only ask if you're actually arranging accommodation |
| "Anything else for the couple?" | Duplicates Q6 |

---

## Operational notes

**Merging into the guest list:** for wedding #1, paste responses in manually once a week. It's roughly 10 minutes at 50 guests. Log the actual time in the Phase 0 tab — that number decides whether automated RSVP intake belongs in v1.

**Link strategy:** one shared link for the whole wedding. Personal links per guest are better (pre-filled name, hidden guest list, and later carries their QR code and seat), but generating and tracking 50 URLs by hand isn't worth it for a manual first run.

**Declined guests:** mark them Declined in the guest list rather than deleting the row. They stay in the couple's records and drop off the Attendee Sheet automatically.
