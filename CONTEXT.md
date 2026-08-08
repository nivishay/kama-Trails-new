# Kama Trails — Domain Language

Glossary for the Kama Trails (שבילי קמה) rappelling/canyoning booking platform.
Terms are derived from the live site, the base44 POC, and the sales-funnel doc.
This file is a glossary only — no implementation details.

## Catalog

**Trail**:
A reusable rappelling/canyoning route offered by the company (e.g. "סנפלינג במצוק דלתון"). Holds descriptive, non-dated info: region, difficulty, rappel height, duration, description, required equipment, what's-included, hero/gallery images.
_Avoid_: Tour, Route, Trip, מסלול/טיול (mixed on the old site)

**Departure**:
A specific dated, bookable instance of a Trail. Carries date, weekday, start time, capacity, minimum registrants, price-per-person, and status. A Trail has many Departures.
_Avoid_: Date, Occurrence, Session, Slot, Event, תאריך

**Region**:
Geographic grouping used to filter Trails — top level (North / South / Center) plus a sub-area (e.g. "צפון · הגליל העליון"). North/South/Center are a tag/filter, not separate pages.
_Avoid_: Area, Zone, Category

**Difficulty**:
A Trail's difficulty rating: קל / קל-בינוני / בינוני / בינוני-קשה / קשה.
_Avoid_: Level, Grade

## Booking

**Booking**:
A Customer's reservation of one Departure for N Participants, with contact details and
accepted consents. Total = participants × Departure price. A Booking moves through reservation
states — **held** (checkout started, seats on a timed Hold) → **confirmed** (Deposit paid) →
**cancelled**, or **expired** (Hold timed out, seats auto-released). Payment progress
(Deposit/Balance) is tracked separately, not as a reservation state.
_Avoid_: Registration, Reservation, Order, הרשמה/הזמנה

**Participant**:
A person attending under a Booking. Currently modeled as a count against Departure capacity plus one contact person (not per-person details).
_Avoid_: Attendee, Guest, Traveler

**Hold** (Seat Hold):
A temporary reservation of a Departure's seats while a Customer completes checkout. It
occupies capacity so seats can't be double-sold, and auto-releases (~15 min) if checkout is
abandoned. A Booking starts as a Hold and becomes confirmed only when the Deposit is paid.
_Avoid_: Lock, Reservation, temporary booking

**Payment**:
A single money movement on a Booking — a Deposit, a Balance payment, or a Refund — recorded
locally as a reference to the external provider's transaction (never card data). A Booking
has many Payments; its paid state is the sum of them.
_Avoid_: Transaction, Charge, Receipt (a Receipt/חשבונית is the legal document, not the Payment)

**Capacity**:
The maximum number of participants a Departure can hold (shown as booked/capacity, e.g. 0/20). "Available spots" = capacity minus booked.
_Avoid_: Seats, Slots, Places

**Cancellation Policy**:
The tiered refund terms a customer accepts when booking: per-participant fees that grow closer to departure (50₪ at 5–6 days, 150₪ at 3–4 days, full cost within 48h), with full refund or free reschedule if the company cancels (too few registrants / force majeure / weather). See DECISIONS.md #13 for the canonical rule.
_Avoid_: Refund rules

**Reschedule**:
Moving an existing Booking from its Departure to another date, without extra cost when the company caused the cancellation.
_Avoid_: Rebook, change date, transfer

## Sales / CRM (from the funnel doc — beyond the POC)

**Lead**:
An inbound inquiry not tied to a specific Departure — from the contact form, WhatsApp, or social — captured with name/phone/email/message and a source. The entry point of the concierge funnel.
_Avoid_: Inquiry, Contact, פנייה

**Deposit**:
The partial upfront payment (מקדמה) made at booking time that confirms the Booking and secures the spot. Paid for every Booking (self-serve and concierge).
_Avoid_: Down payment, prepayment

**Balance**:
The remaining amount (יתרה) owed on a Booking after the Deposit, collected later. Booking total = Deposit + Balance.
_Avoid_: Remainder, final payment

## People

**Customer**:
A person who submits a Lead or makes a Booking.
_Avoid_: Client, User, לקוח

**Admin**:
A staff member (currently Stav / סתיו) who manages Trails, Departures, and Bookings via the gated `/admin` area.
_Avoid_: Manager, Operator, מנהל
