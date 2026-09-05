// Checkout consent versions + the signed-waiver text (DECISIONS #59).
//
// These version strings are the auditable "ref to what the customer signed": book_trip
// stamps them onto the booking (policy_version / waiver_version). The canonical text of a
// released version is GIT-FROZEN — never edit the text of a released version in place; bump
// the constant instead, or a stored version ref silently starts pointing at changed text
// (pre-launch checklist rule). The values here MUST match the c_policy_version /
// c_waiver_version constants in book_trip.
//
// NOTE: WAIVER_TEXT below is an INTERIM draft. The final legal wording — including the
// ייפוי-כוח clause — is Ran-reviewed before launch (see docs/pre-launch-checklist.md); bump
// WAIVER_VERSION when it lands.

/** Cancellation-policy text version (mirrors book_trip c_policy_version; formerly TERMS_VERSION). */
export const POLICY_VERSION = "2026-08-13";

/** Signed-waiver text version (mirrors book_trip c_waiver_version). */
export const WAIVER_VERSION = "2026-08-19";

/**
 * The risk/liability declaration the booker signs at checkout. Per-Booking: one signature
 * under ייפוי-כוח — the booker declares authority to accept on behalf of every participant
 * (Participant is a count in v1, DECISIONS #27/#59).
 */
export const WAIVER_TEXT = `אני מצהיר/ה כי ידוע לי שפעילות הסנפלינג/קניונינג היא פעילות אתגרית הכרוכה בסיכון, וכי אני נוטל/ת חלק בה מרצוני החופשי ועל אחריותי.

אני מאשר/ת שקראתי והבנתי את הוראות הבטיחות ואת הצהרת האחריות, ומוותר/ת על כל טענה או תביעה כלפי שבילי קמה ומפעיליה בגין נזק שייגרם שלא עקב רשלנותם.

בסימון תיבה זו אני חותם/ת על ההצהרה, ומאשר/ת כי אני מוסמך/ת לחתום עליה בשם כל המשתתפים שאני רושם/ת להזמנה זו (ייפוי כוח).`;
