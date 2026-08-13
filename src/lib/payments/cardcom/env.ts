// Server-only Cardcom credentials. These MUST NOT be prefixed with NEXT_PUBLIC — they must
// never reach the browser bundle. Sandbox values live in .env (gitignored, DECISIONS #29);
// production is a Vercel env swap at go-live (docs/pre-launch-checklist.md).

export interface CardcomEnv {
  terminalNumber: number;
  apiName: string;
}

function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

/** Read and validate the Cardcom credentials. Throws loudly if misconfigured. */
export function readCardcomEnv(): CardcomEnv {
  if (typeof window !== "undefined") {
    throw new Error("Cardcom credentials must never be read in the browser.");
  }

  const terminalRaw = requireServerEnv("CARDCOM_TERMINAL_NUMBER");
  const terminalNumber = Number(terminalRaw);
  if (!Number.isInteger(terminalNumber) || terminalNumber <= 0) {
    throw new Error(
      `CARDCOM_TERMINAL_NUMBER must be a positive integer, got "${terminalRaw}".`,
    );
  }

  return { terminalNumber, apiName: requireServerEnv("CARDCOM_API_NAME") };
}
