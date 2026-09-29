import { ConfigKey, ConfigValues, DEFAULT_PORT } from "../../mcp/config";

/** The pages `signoz mcp config` serves: plain HTML, styled by the Tailwind browser build. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 dark:bg-slate-950 dark:text-slate-100">
  <main class="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
${body}
  </main>
</body>
</html>
`;
}

interface FieldSpec {
  name: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  help: string;
  /** Rendered with `required`; the page's script keeps Save disabled while it is blank. */
  required?: boolean;
}

function field(spec: FieldSpec): string {
  const marker = spec.required ? ' <span class="text-red-600 dark:text-red-400">*</span>' : "";
  return `      <label class="block">
        <span class="block text-sm font-medium text-slate-700 dark:text-slate-300">${escapeHtml(spec.label)}${marker}</span>
        <input name="${spec.name}" type="${spec.type}" value="${escapeHtml(spec.value)}"
          placeholder="${escapeHtml(spec.placeholder)}" autocomplete="off"${spec.required ? " required" : ""}
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:placeholder-slate-500 dark:focus:ring-indigo-900">
        <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">${escapeHtml(spec.help)}</span>
      </label>`;
}

/** A secret: never echoed back; a saved one shows as kept, `-` clears it. */
function secretField(saved: ConfigValues, name: ConfigKey, help: string): string {
  return field({
    name,
    label: name,
    type: "password",
    value: "",
    placeholder: saved[name] ? "•••••••• (saved — blank keeps it, - clears it)" : "",
    help,
  });
}

export interface FormPageOptions {
  token: string;
  /** What the form shows: the saved values, or what was just submitted. */
  values: ConfigValues;
  /** The saved configuration: a secret saved there shows as kept, and a blank field keeps it. */
  saved: ConfigValues;
  configFile: string;
  error?: string;
}

/**
 * Keeps Save disabled while a required field is blank. The button is rendered enabled, so
 * without scripts the form still posts and `valuesFromForm` reports what is missing; values
 * are trimmed the same way the server trims them.
 */
const SAVE_GATE = `<script>
      (() => {
        const form = document.getElementById("config");
        const save = document.getElementById("save");
        const required = Array.from(form.querySelectorAll("input[required]"));
        const sync = () => { save.disabled = required.some((input) => input.value.trim() === ""); };
        form.addEventListener("input", sync);
        sync();
      })();
    </script>`;

export function formPage(options: FormPageOptions): string {
  const { values } = options;
  const error = options.error
    ? `    <p class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900">${escapeHtml(options.error)}</p>\n`
    : "";
  return layout(
    "SigNoz MCP — Settings",
    `    <h1 class="text-xl font-semibold">SigNoz MCP</h1>
    <p class="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Saved to <code class="font-mono">${escapeHtml(options.configFile)}</code></p>
${error}    <form id="config" method="post" action="/save" class="space-y-5">
      <input type="hidden" name="t" value="${escapeHtml(options.token)}">
${field({
  name: "SIGNOZ_BASE_URL",
  label: "SIGNOZ_BASE_URL",
  type: "url",
  value: values.SIGNOZ_BASE_URL ?? "",
  placeholder: "https://signoz.example.com",
  help: "Your SigNoz instance, with its base path if it has one.",
  required: true,
})}
${secretField(options.saved, "SIGNOZ_API_KEY", "SigNoz-Api-Key of a service account (Settings → Service Accounts). Preferred: it never expires.")}
    <p class="text-xs text-slate-500 dark:text-slate-400">Or, without an API key, the browser session: DevTools → Application → Local Storage → your SigNoz URL. A service account key wins when both are saved.</p>
${secretField(options.saved, "SIGNOZ_AUTH_TOKEN", "Local Storage key AUTH_TOKEN.")}
${secretField(options.saved, "SIGNOZ_REFRESH_AUTH_TOKEN", "Local Storage key REFRESH_AUTH_TOKEN.")}
${field({
  name: "SIGNOZ_ENV",
  label: "SIGNOZ_ENV",
  type: "text",
  value: values.SIGNOZ_ENV ?? "",
  placeholder: "production",
  help: "Default deployment.environment the tools filter on. Blank: none.",
})}
${field({
  name: "PORT",
  label: "PORT",
  type: "number",
  value: values.PORT ?? "",
  placeholder: String(DEFAULT_PORT),
  help: `MCP server port on 127.0.0.1. Blank: ${DEFAULT_PORT}.`,
})}
      <button id="save" type="submit"
        class="w-full cursor-pointer rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-all duration-200 ease-out hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-none disabled:active:scale-100 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-800 dark:disabled:hover:bg-indigo-500">
        Save
      </button>
    </form>
    ${SAVE_GATE}`
  );
}

export function savedPage(configFile: string): string {
  return layout(
    "SigNoz MCP — Settings saved",
    `    <h1 class="text-xl font-semibold text-emerald-700 dark:text-emerald-400">Settings saved</h1>
    <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">Written to <code class="font-mono">${escapeHtml(configFile)}</code>.</p>
    <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">If the server is already running, restart it to apply them:</p>
    <pre class="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-100 dark:bg-black dark:ring-1 dark:ring-slate-800">signoz mcp stop &amp;&amp; signoz mcp start</pre>
    <p class="mt-6 text-sm text-slate-500 dark:text-slate-400">You can close this tab.</p>`
  );
}

export function messagePage(title: string, message: string): string {
  return layout(
    title,
    `    <h1 class="text-xl font-semibold">${escapeHtml(title)}</h1>
    <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">${escapeHtml(message)}</p>`
  );
}
