# Kama Trails — Domain Language

Glossary for the Kama Trails (שבילי קמה) rappelling/canyoning booking platform.
Terms are derived from the live site, the base44 POC, and the sales-funnel doc.
This file is a glossary only — no implementation details.

## Catalog

**Trail**:
A reusable rappelling/canyoning route offered by the company (e.g. "סנפלינג במצוק דלתון"). Holds descriptive, non-dated info: region, difficulty, rappel height, duration, description, required equipment, what's-included, hero/gallery images.
_Avoid_: Tour, Route, Trip, מסלול/טיול (mixed on the old site)

**Departure**:
A specific dated, bookable instance of a Trail. Carries date, weekday, start time, capacity, minimum registrants, price-per-person, and status. A Trail has many Departures. A **Private Departure**
is a variant (see Private Trip).
_Avoid_: Date, Occurrence, Session, Slot, Event, תאריך

**Private Trip** (Private Departure):
A Departure of an existing Trail that the Admin creates for a deal closed off-site (usually by
phone) — **not shown in the public catalog**, but it points at the chosen Trail's public content
page so the Customer can see what the trip is. The Admin sets its **per-person price** for that deal;
pricing is otherwise **identical** to a public Departure (`participants × price_per_person` — no
base/threshold/per-extra rate). Booked via an admin-generated pay-link and follows the same
tokenize-then-Charge lifecycle (Token now, Charge at `max(departure − 14 days, now)`), so a Private
Trip booked a month out is tokenized now and charged ~14 days before.
_Avoid_: Custom trip, quote, off-menu departure

**Region**:
Geographic grouping used to filter Trails — top level (North / South / Center) plus a sub-area (e.g. "צפון · הגליל העליון"). North/South/Center are a tag/filter, not separate pages.
_Avoid_: Area, Zone, Category

**Difficulty**:
A Trail's difficulty rating: קל / קל-בינוני / בינוני / בינוני-קשה / קשה.
_Avoid_: Level, Grade

## Booking

**Booking**:
A Customer's reservation of one Departure for N Participants, with contact details and
accepted consents. Total = participants × Departure price. A Booking moves through states —
**held** (checkout started, seats on a timed Hold) → **reserved** (Card on File saved via
Cardcom Token; the seat is secured but **no money has moved**) → **confirmed** (the Charge
succeeded) → **cancelled**, or **expired** (Hold timed out during checkout, seats auto-released).
The seat is secured the moment a Customer is **reserved** (card tokenized) — that is when the
Customer considers themselves "booked"; the Charge runs later (see Charge). Capacity is occupied
from **reserved** onward.
_Avoid_: Registration, Reservation, Order, הרשמה/הזמנה

**Participant**:
A person attending under a Booking. Currently modeled as a count against Departure capacity plus one contact person (not per-person details).
_Avoid_: Attendee, Guest, Traveler

**Admin-Created Booking**:
A Booking the Admin initiates instead of the Customer self-serving — one primitive with two entry
points: the **Private Trip** form (a new Private Departure) and **adding a late Participant** to an
existing Departure (e.g. a last-minute joiner after sales closed). The Admin sets contact + price +
participants; the system emits a **pay-link** the Customer completes. It is the same Booking with the
same lifecycle and same Charge timing as a self-serve Booking — only the initiator, the (admin-set)
price, and (for Private Trips) catalog visibility differ.
_Avoid_: Manual booking, phone booking, offline order

**Hold** (Seat Hold):
A temporary reservation of a Departure's seats while a Customer completes the **checkout /
tokenization** step on Cardcom's hosted page. It occupies capacity so seats can't be double-sold,
and auto-releases (~40 min, provisional — set to Cardcom's session timeout + buffer, DECISIONS #44)
if checkout is abandoned. A Booking starts as a Hold and becomes **reserved** when the Card on File
(Token) is saved. (The Hold covers only the short tokenization window — not the weeks-long wait
until the Charge.)
_Avoid_: Lock, Reservation, temporary booking

**Token** (Card on File):
The secret reference Cardcom returns after securely storing a Customer's card at registration.
We store only the Token (never card data). The card is **not charged** when the Token is created;
the Token is used later to run the Charge. Valid until the card itself expires.
_Avoid_: Card, saved payment, credit hold (no credit-framework hold is placed)

**Charge**:
The actual collection of money on a Booking, run against the stored Token at **`max(departure −
14 days, now)`** — i.e. ~14 days before departure, or immediately for a last-minute Booking made
inside that window. A successful Charge moves the Booking **reserved → confirmed**. A failed Charge
triggers automated token retries, then a new pay-now link to the Customer and an alert to the Admin;
if unpaid after ~2 days the seat **auto-releases** (the one automatic cancellation path — distinct
from the admin-decided minimum-participants cancellation, DECISIONS #9).
_Avoid_: Payment (the Payment is the ledger record of a Charge/Refund), Capture

**Payment**:
A single money movement on a Booking — a Charge or a Refund — recorded locally as a reference to
the external provider's transaction (never card data). A Booking has many Payments; its paid state
is the sum of them.
_Avoid_: Transaction, Receipt (a Receipt/חשבונית is the legal document, not the Payment)

**Capacity**:
The maximum number of participants a Departure can hold (shown as booked/capacity, e.g. 0/20). "Available spots" = capacity minus booked.
_Avoid_: Seats, Slots, Places

**Cancellation Policy**:
The tiered refund terms a customer accepts when booking: per-participant fees that grow closer to departure (50₪ at 5–6 days, 150₪ at 3–4 days, full cost within 48h), with full refund or free reschedule if the company cancels (too few registrants / force majeure / weather). See DECISIONS.md #13 for the canonical rule.
_Avoid_: Refund rules

**Booking Consents**:
The two **mandatory** checkout consents a booker accepts to create a Booking — the **Cancellation-Policy
consent** and the **Signed Waiver** — each recorded per Booking with its own version + timestamp
(DECISIONS #59). Distinct from **Marketing Consent**, which is optional and lives on the Customer, not
the Booking.
_Avoid_: Terms, terms acceptance (vague — there are two, versioned separately)

**Signed Waiver**:
The mandatory risk/liability declaration the booker **signs** at checkout. Per-Booking: the booker
signs once under **ייפוי-כוח**, declaring authority to accept on behalf of every Participant (Participant
is a count in v1, #27). The "signature" is a **basic electronic signature** — a versioned acknowledgment
tied to the booker's captured identity (name/phone/email) and a timestamp, referencing the exact waiver
version — **not** a drawn image and **not** per-Participant.
_Avoid_: Risk consent, liability checkbox (it is signed + versioned now, not a bare tick)

**Reschedule**:
_(Removed for now — DECISIONS #54.)_ Moving an existing Booking from its Departure to another date,
without extra cost when the company caused the cancellation. Not built; the model stays ready for it.
_Avoid_: Rebook, change date, transfer

## Sales / CRM (from the funnel doc — beyond the POC)

**Lead**:
An inbound inquiry not tied to a specific Departure — from the contact form, WhatsApp, or social — captured with name/phone/email/message and a source. The entry point of the concierge funnel.
_Avoid_: Inquiry, Contact, פנייה

**Deposit**:
_(Deferred — not used in v1.)_ The partial upfront payment (מקדמה) that would confirm a Booking
and secure the spot. **v1 does not split payment**: the seat is secured by the Card on File (Token)
at registration and the **full** amount is collected in a single Charge (~14 days before departure).
A real deposit/balance split is a later version; the schema stays ready for it.
_Avoid_: Down payment, prepayment

**Balance**:
_(Deferred — not used in v1.)_ The remaining amount (יתרה) that would be owed after a Deposit.
Not applicable while v1 charges the full amount in one Charge.
_Avoid_: Remainder, final payment

## People

**Customer**:
A first-class, **deduplicated** person record — one row per human — that owns contact details and
**Marketing Consent**, and aggregates that person's Bookings and Leads. Identity is **match-on-either
phone or email, phone primary**: an incoming Booking/Lead/import matches an existing Customer by
normalized phone first, else by email, else creates a new one. A Customer can exist **without** a
Booking (e.g. imported from Stav's Excel, or a Lead-only inquiry). Guest checkout is unchanged for
the person (still no login) — this identity is backend dedup/aggregation, not an account.
_Avoid_: Client, User, לקוח, Account (there is no customer login)

**Marketing Consent** (Opt-in / Opt-out):
A Customer-level state — opted-**in** or opted-**out** of marketing (Newsletter) — separate from the
mandatory booking consents (#27/#31), with a timestamp and source of the last change. Legally
required to gate the Newsletter audience: only opted-in Customers may be sent marketing. Captured via
a **separate, non-mandatory** checkbox at checkout (§2), and tracked over time (who opted in/out and
when).
_Avoid_: Consent (ambiguous — the booking consents are different), subscription

**Admin**:
A staff member (currently Stav / סתיו) who manages Trails, Departures, and Bookings via the gated `/admin` area.
_Avoid_: Manager, Operator, מנהל
