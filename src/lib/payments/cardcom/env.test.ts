// readCardcomEnv is server-only and refuses to run when `window` exists, so this suite must
// run in the Node environment rather than the project's default jsdom.
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readCardcomEnv } from "./env";

const CARDCOM_VARS = [
  "CARDCOM_TERMINAL_NUMBER",
  "CARDCOM_API_NAME",
  "CARDCOM_API_PASSWORD",
] as const;

describe("readCardcomEnv", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of CARDCOM_VARS) saved[name] = process.env[name];
    process.env.CARDCOM_TERMINAL_NUMBER = "1000";
    process.env.CARDCOM_API_NAME = "an-api-name";
    process.env.CARDCOM_API_PASSWORD = "a-secret-password";
  });

  afterEach(() => {
    for (const name of CARDCOM_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it("reads the terminal, API name, and API password", () => {
    expect(readCardcomEnv()).toEqual({
      terminalNumber: 1000,
      apiName: "an-api-name",
      apiPassword: "a-secret-password",
    });
  });

  it("throws when the API password is missing (required for the invoice document)", () => {
    delete process.env.CARDCOM_API_PASSWORD;
    expect(() => readCardcomEnv()).toThrow(/CARDCOM_API_PASSWORD/);
  });
});
