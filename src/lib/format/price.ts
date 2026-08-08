/** Format a shekel amount as "180 ₪" (integer when whole), matching the POC. */
export function formatPrice(amount: number): string {
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount);
  return `${rounded.toLocaleString("he-IL")} ₪`;
}
