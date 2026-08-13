# Sales Funnel & Automations — Leak-Prevention Mechanism

> Transcription of the two diagrams (PNGs) in `meetings_docs`, translated from Hebrew.
> Both diagrams describe the same 6-stage funnel from two angles:
> **Diagram 1** — focus on leak risks and the detailed automated solution.
> **Diagram 2** — focus on the flow (trigger → action → transition to next stage → automation).

---

## Diagram 1 — Leak-Prevention Mechanism & Detailed Automation Array (Sheet 2: Protection & Automation Mechanisms)

| # | Funnel stage | Main leak risk | Detailed automation to solve & seal the leak | System condition/rule to seal the leak |
|---|--------------|----------------|-----------------------------------------------|-----------------------------------------|
| 1 | First inquiry | No timely response to the lead; forgetting abandoned inquiries | 1. Immediate lead capture in the CRM from every channel. 2. Automatic WhatsApp message: "We received your inquiry, Stav will get back to you shortly." 3. Push an urgency alert to Stav's phone. | If no call is made within 2 hours → second alert + move to "urgent handling" status. |
| 2 | Needs clarification | Partial conversation, missing critical details, forgetting to schedule | 1. Automatic reminder mechanism to schedule the discovery call. 2. Digital form / CRM fields requiring mandatory details (date, number of participants, trip type, budget). | Blocks moving the lead to the next CRM stage until all required fields are filled. No quote is sent otherwise. |
| 3 | Price quote | Quote left open with no follow-up; customer cools off | 1. Send the quote via Email and WhatsApp with a dynamic link. 2. First automatic WhatsApp reminder after 24 hours. 3. Second automatic WhatsApp reminder after 48 hours. | 48 hours elapsed with no response → open an "urgent phone follow-up" task in the calendar. |
| 4 | Advance payment | Reserving a date with no financial cover; last-minute cancellations | 1. Immediate digital payment link embedded in the quote. 2. Set an expiry on the date hold (48 hours only). 3. Automatic receipt/invoice issued by email the moment payment clears. | If the advance isn't paid within 48 hours, the date is automatically released in the calendar. |
| 5 | Trip preparation | Customer not updated on details, missing gear, no-shows, and awkward cancellations | 1. Alert 1 (7 days before): automatic administrative letter (gear, meeting point + schedule, Waze). 2. Alert 2 (3 days before): reminder message + clear legal clause that cancellation after the advance incurs forfeiture. | + Digital arrival confirmation by the customer; automatic checklist for the guide to verify gear and logistics. |
| 6 | Follow-up & closing | Failure to collect the payment balance, loss of referrals, disconnection from happy customers | 1. Automatic collection of the payment balance 24 hours after the trip. 2. Send a satisfaction survey (NPS) + link to leave a review on Google/Facebook. 3. Automatic addition to the mailing list and the hikers' group. | Automatic collection task if a balance exists + move the customer profile to "community member." |

---

## Diagram 2 — Focused Flow Diagram: Sales Funnel & Automations

| # | Process stage | Activating trigger | Stage content & action | Trigger to activate the next stage | Automation required to prevent leaks |
|---|---------------|--------------------|------------------------|-------------------------------------|---------------------------------------|
| 1 | First inquiry (Lead) | Form on the site / Facebook / WhatsApp message | Log the lead in the CRM, classify it, and trigger the immediate welcome message | CRM status changes to "awaiting needs clarification" | Automatic WhatsApp + follow-up reminder to the team if 2 hours pass |
| 2 | Needs clarification & discovery | "Awaiting needs clarification" status; scheduled call | In-depth call: group size, date, difficulty level, budget, and customer expectations | Discovery form filled out + quote generated | Block the CRM stage transition until required fields are filled (date, quantity, budget) |
| 3 | Price quote & closing | Send the quote via Email/WhatsApp | Temporary hold of 48 hours + active follow-up to close the date | + Quote approved by the customer → advance requested | Automatic reminders at 24/48 hours + push alert to the phone (WhatsApp) |
| 4 | Advance payment & date hold | "Approve quote" click; payment link | Digital advance payment, receipt issued, and final calendar reservation | Payment confirmed → "trip confirmed" status | Release the temporary date in the calendar if the advance isn't paid within 48 hours |
| 5 | Preparation & execution | Trip date approaching (7 days / 3 before) | Coordinate the guide, send the gear sheet, logistics (Waze), and execute | + Customer's digital arrival confirmation | 2 managed automatic alerts + guide gear/confirmation checklist |
| 6 | Follow-up & community | 24 hours after the trip ends | Balance collection, NPS, referral-gathering survey, and joining the hikers' community | Move the customer to the club / community | Series of automatic marketing messages + follow-up on balance collection |

---

## Summary — the 6 funnel stages

1. **First inquiry (Lead)** — CRM capture + immediate automatic WhatsApp reply.
2. **Needs clarification & discovery** — mandatory discovery form (date, quantity, type, budget).
3. **Price quote & closing** — quote + automatic reminders at 24 and 48 hours.
4. **Advance payment & date hold** — payment link, 48-hour window, automatic receipt.
5. **Preparation & execution** — 7/3-days-before alerts, guide/gear checklist.
6. **Follow-up & community** — balance collection, NPS, referrals, add to community/mailing list.

> **Relevance to development:** the stages map directly to the data model — lead states,
> reminder scheduling, payment status, and sealing transitions between stages (blocking transitions).
