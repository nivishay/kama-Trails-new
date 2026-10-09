// The deployment signal used by runtime guards (prod URL, bot gate, rate limit). We key on Vercel's
// VERCEL_ENV rather than NODE_ENV on purpose: CI runs a production *build* (`next build`, so
// NODE_ENV==="production") against a non-prod stack, so a NODE_ENV guard would wrongly treat CI and
// local prod builds as production. A real Vercel production deploy sets VERCEL_ENV==="production";
// preview deploys set "preview"; local dev leaves it unset (see ADR 0003 and payments/index.ts).

/** True only on a real Vercel production deployment. */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/** True on any deployed Vercel environment (production or preview) — i.e. not local dev. */
export function isDeployedEnvironment(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}
