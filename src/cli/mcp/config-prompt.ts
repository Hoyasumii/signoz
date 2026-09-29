import { ConfigKey, ConfigValues, DEFAULT_PORT } from "../../mcp/config";
import { CLEAR_SECRET, configValueError } from "./config-ui";
import { PickerTerminal, TextInputOptions, textInput } from "./picker";

/** A blank line is fine (it means the default); anything else must pass the form's check. */
function optional(key: ConfigKey): (value: string) => string | undefined {
  return (value) => (value.trim() === "" ? undefined : configValueError(key, value.trim()));
}

function secret(saved: ConfigValues, key: ConfigKey, hint: string): TextInputOptions {
  return {
    mask: true,
    hint: saved[key] ? `saved · enter keeps it, ${CLEAR_SECRET} clears it` : hint,
    summary: (value) =>
      value.trim() === CLEAR_SECRET ? "cleared" : value.trim() ? "••••••••" : saved[key] ? "kept" : "none",
  };
}

/**
 * Ask for each setting in turn, starting from the saved values, with the form's rules: a blank
 * secret keeps the saved one, `-` clears it, other blanks fall back to defaults. The session
 * tokens are asked only when no API key ends up configured. Answers what was entered, for
 * `valuesFromInput`, or `undefined` when a prompt was cancelled.
 */
export async function promptConfig(saved: ConfigValues, terminal: PickerTerminal): Promise<ConfigValues | undefined> {
  const input: ConfigValues = {};
  const ask = async (key: ConfigKey, options: TextInputOptions): Promise<boolean> => {
    const value = await textInput(key, options, terminal);
    if (value === undefined) return false;
    input[key] = value;
    return true;
  };

  const baseUrl: TextInputOptions = {
    hint: "your SigNoz instance, with its base path if any",
    initial: saved.SIGNOZ_BASE_URL,
    placeholder: "https://signoz.example.com",
    validate: (value) =>
      value.trim() ? configValueError("SIGNOZ_BASE_URL", value.trim()) : "SIGNOZ_BASE_URL is required.",
  };
  if (!(await ask("SIGNOZ_BASE_URL", baseUrl))) return undefined;
  if (
    !(await ask(
      "SIGNOZ_API_KEY",
      secret(saved, "SIGNOZ_API_KEY", "service account key · blank: use the browser session instead")
    ))
  ) {
    return undefined;
  }
  const key = (input.SIGNOZ_API_KEY ?? "").trim();
  const hasKey = key === CLEAR_SECRET ? false : !!key || !!saved.SIGNOZ_API_KEY;
  if (!hasKey) {
    const hasPair = !!saved.SIGNOZ_AUTH_TOKEN && !!saved.SIGNOZ_REFRESH_AUTH_TOKEN;
    const required = (name: ConfigKey) => (value: string) =>
      value.trim() && value.trim() !== CLEAR_SECRET
        ? undefined
        : hasPair
          ? undefined
          : `${name} is required without an API key.`;
    const auth = secret(saved, "SIGNOZ_AUTH_TOKEN", "browser Local Storage: AUTH_TOKEN");
    const refresh = secret(saved, "SIGNOZ_REFRESH_AUTH_TOKEN", "browser Local Storage: REFRESH_AUTH_TOKEN");
    if (!(await ask("SIGNOZ_AUTH_TOKEN", { ...auth, validate: required("SIGNOZ_AUTH_TOKEN") }))) return undefined;
    if (!(await ask("SIGNOZ_REFRESH_AUTH_TOKEN", { ...refresh, validate: required("SIGNOZ_REFRESH_AUTH_TOKEN") }))) {
      return undefined;
    }
  }
  const environment: TextInputOptions = {
    hint: "default deployment.environment the tools filter on · blank: none",
    initial: saved.SIGNOZ_ENV,
    placeholder: "production",
    summary: (value) => value.trim() || "none",
  };
  if (!(await ask("SIGNOZ_ENV", environment))) return undefined;
  const port: TextInputOptions = {
    hint: `MCP server port on 127.0.0.1 · blank: ${DEFAULT_PORT}`,
    initial: saved.PORT,
    placeholder: String(DEFAULT_PORT),
    validate: optional("PORT"),
    summary: (value) => value.trim() || `${DEFAULT_PORT} (default)`,
  };
  if (!(await ask("PORT", port))) return undefined;
  return input;
}
