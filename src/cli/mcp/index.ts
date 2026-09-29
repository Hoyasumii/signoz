import { CommandDef, defineCommand, renderUsage, runCommand } from "citty";
import {
  CONFIG_KEYS,
  ConfigValues,
  DEFAULT_PORT,
  configFilePath,
  readEnvFile,
  resolveMcpConfig,
  writeEnvFile,
} from "../../mcp/config";
import { CliInputError } from "../schema-args";
import type { ConnectOptions } from "../connect";
import type { CliIo } from "../run";
import { BootStatus, bootStatus, disableBoot, enableBoot } from "./boot";
import { promptConfig } from "./config-prompt";
import { startConfigUi, valuesFromInput } from "./config-ui";
import { formatUptime, logPath, responds, runningState, startDetached, startForeground, stopServer } from "./daemon";
import { McpDeps } from "./deps";
import { detectHosts } from "./hosts";
import {
  CLIENTS,
  ClientStatus,
  SERVER_ENTRY,
  detectClients,
  displayName,
  flagId,
  formatAction,
  formatStep,
  installSteps,
  runSteps,
  runUninstall,
  uninstallActions,
} from "./install";
import { multiSelect } from "./picker";

/** `signoz mcp status` exits with this when no server is running. */
export const EXIT_NOT_RUNNING = 3;

/** `signoz mcp install`/`uninstall`/`config` exit with this when a prompt is cancelled (as a shell does on Ctrl+C). */
export const EXIT_CANCELLED = 130;

function configFileOf(io: CliIo, deps: McpDeps, override: string | undefined): string {
  return configFilePath(override ? { ...io.env, SIGNOZ_CONFIG: override } : io.env, deps.platform);
}

/**
 * The saved configuration, refusing when `signoz mcp config` has not saved a URL and a credential
 * yet. Every `signoz` command except `signoz mcp config`, `signoz mcp uninstall` (and help) needs
 * it: flags and environment variables override a saved configuration for one run, they never stand
 * in for it.
 */
export function requireSavedConfig(configFile: string): ConfigValues {
  const saved = readEnvFile(configFile);
  const credential = saved.SIGNOZ_API_KEY || (saved.SIGNOZ_AUTH_TOKEN && saved.SIGNOZ_REFRESH_AUTH_TOKEN);
  if (!saved.SIGNOZ_BASE_URL || !credential) {
    throw new CliInputError(
      `No saved configuration at ${configFile}: run \`signoz mcp config\` first. ` +
        "Flags and environment variables then override it for a single run."
    );
  }
  return saved;
}

/** `--client`'s ids, for its help: every client, bare, and then the WSL bridge's. */
const CLIENT_FLAG_IDS = `${CLIENTS.map((client) => client.id).join(", ")}; inside WSL also ${CLIENTS.map(
  (client) => `${client.id}@windows`
).join(", ")}`;

const configArg = {
  config: { type: "string", description: "The saved .env to read (env SIGNOZ_CONFIG). Default: per-user config dir." },
} as const;

function describeBoot(status: BootStatus): string {
  const foreign = status.foreign ? ", a file not written by signoz mcp boot is there" : "";
  return `${status.enabled ? "enabled" : "disabled"} (${status.location}${foreign})`;
}

/** How a client on this host is reached, appended to its picker hint. */
function hostHint(client: ClientStatus): string {
  return client.host.id === "windows" ? " · via wsl.exe" : "";
}

function installHint(client: ClientStatus): string {
  if (!client.installed) return "not found";
  return client.entry
    ? `${client.version}${hostHint(client)} · already installed, reinstalls`
    : `${client.version ?? ""}${hostHint(client)}`;
}

function uninstallHint(client: ClientStatus): string {
  if (!client.installed) return "not found";
  return client.entry
    ? `${client.version}${hostHint(client)} · ${client.entry.transport}`
    : `no '${SERVER_ENTRY}' entry`;
}

/** The clients `--client` names, each installed; `check` refuses one the command cannot act on. */
function clientsFromFlag(
  value: string,
  statuses: ClientStatus[],
  windowsUnreachable: string | undefined,
  check: (client: ClientStatus) => void
): ClientStatus[] {
  const ids = value
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  const known = [...new Set(statuses.map(flagId))].join(", ");
  if (ids.length === 0) throw new CliInputError(`--client needs at least one of: ${known}.`);
  return [...new Set(ids)].map((id) => {
    const status = statuses.find((client) => flagId(client) === id);
    if (!status && id.endsWith("@windows") && windowsUnreachable) {
      throw new CliInputError(
        `'${id}' needs the Windows side reachable from WSL, and it is not: ${windowsUnreachable}.`
      );
    }
    if (!status) throw new CliInputError(`Unknown client '${id}'. Known clients: ${known}.`);
    if (!status.installed)
      throw new CliInputError(`${displayName(status)} was not found (\`${status.bin} --version\` failed).`);
    check(status);
    return status;
  });
}

/**
 * The clients to act on: from `--client` when given, otherwise from the picker, which needs an
 * interactive terminal. `undefined` when the picker was cancelled.
 */
async function chooseClients(
  deps: McpDeps,
  { statuses, windowsUnreachable }: { statuses: ClientStatus[]; windowsUnreachable?: string },
  flag: unknown,
  picker: {
    message: string;
    hint(client: ClientStatus): string;
    enabled(client: ClientStatus): boolean;
    checked(client: ClientStatus): boolean;
    none: string;
  },
  check: (client: ClientStatus) => void,
  noTerminal: (ids: string) => string
): Promise<ClientStatus[] | undefined> {
  if (flag !== undefined) return clientsFromFlag(String(flag), statuses, windowsUnreachable, check);
  if (!deps.terminal) throw new CliInputError(noTerminal([...new Set(statuses.map(flagId))].join(",")));
  if (!statuses.some(picker.enabled)) throw new CliInputError(picker.none);
  const picked = await multiSelect(
    picker.message,
    statuses.map((client) => ({
      label: displayName(client),
      hint: picker.hint(client),
      disabled: !picker.enabled(client),
      checked: picker.enabled(client) && picker.checked(client),
    })),
    deps.terminal
  );
  return picked?.map((index) => statuses[index]);
}

function buildMcpCommand(global: ConnectOptions, io: CliIo, deps: McpDeps, exit: { code: number }): CommandDef {
  const start = defineCommand({
    meta: {
      name: "start",
      description:
        "Start the SigNoz MCP server in the background. Needs a saved configuration (`signoz mcp config`); " +
        "flags and environment variables override it for this run only — they are never saved.",
    },
    args: {
      "api-key": { type: "string", description: "SigNoz API key (env SIGNOZ_API_KEY)." },
      "base-url": { type: "string", description: "SigNoz instance (env SIGNOZ_BASE_URL)." },
      env: { type: "string", description: "Default deployment.environment (env SIGNOZ_ENV)." },
      port: { type: "string", description: "Port on 127.0.0.1 (env PORT). Default: 3767." },
      ...configArg,
      foreground: { type: "boolean", description: "Serve in this process instead of in the background." },
    },
    async run({ args }) {
      const configFile = configFileOf(io, deps, args.config);
      const saved = requireSavedConfig(configFile);
      const config = resolveMcpConfig({
        flags: { apiKey: global.apiKey, baseUrl: global.baseUrl, environment: global.environment, port: args.port },
        env: io.env,
        file: saved,
      });
      if (args.foreground) {
        await startForeground(config, configFile, deps, io.stderr);
        return;
      }
      const state = await startDetached(config, configFile, deps, io.env);
      io.stdout(
        [
          `SigNoz MCP server running at ${state.url} (pid ${state.pid}).`,
          `Log: ${logPath(configFile)}`,
          `Add it to Claude Code: claude mcp add --transport http signoz ${state.url}`,
        ].join("\n")
      );
    },
  });

  const stop = defineCommand({
    meta: { name: "stop", description: "Stop the background SigNoz MCP server." },
    args: configArg,
    async run({ args }) {
      const configFile = configFileOf(io, deps, args.config);
      requireSavedConfig(configFile);
      const stopped = await stopServer(configFile, deps, undefined, io.stderr);
      io.stdout(
        stopped ? `Stopped the SigNoz MCP server (pid ${stopped.state.pid}).` : "The SigNoz MCP server is not running."
      );
    },
  });

  const status = defineCommand({
    meta: {
      name: "status",
      description: `Whether the SigNoz MCP server is running (exit ${EXIT_NOT_RUNNING} if not).`,
    },
    args: configArg,
    async run({ args }) {
      const configFile = configFileOf(io, deps, args.config);
      requireSavedConfig(configFile);
      const state = runningState(configFile, deps);
      const boot = await bootStatus(deps, io.env).catch(() => undefined);
      const lines: string[] = [];
      if (state) {
        const answering = await responds(state.port);
        lines.push(
          `running     ${state.url} (pid ${state.pid}, up ${formatUptime(state.startedAt)})` +
            (answering ? "" : " — not answering HTTP")
        );
      } else {
        lines.push("stopped");
        exit.code = EXIT_NOT_RUNNING;
      }
      lines.push(`config      ${configFile}`);
      if (boot) lines.push(`at login    ${describeBoot(boot)}`);
      io.stdout(lines.join("\n"));
    },
  });

  const boot = defineCommand({
    meta: { name: "boot", description: "Start the SigNoz MCP server automatically at login." },
    subCommands: {
      enable: defineCommand({
        meta: { name: "enable", description: "Start the server at every login, with the saved configuration." },
        args: configArg,
        async run({ args }) {
          const configFile = configFileOf(io, deps, args.config);
          requireSavedConfig(configFile);
          const result = await enableBoot(deps, io.env, configFile);
          io.stdout(
            [
              `The SigNoz MCP server will start at login (${result.location}).`,
              "It uses the saved configuration only; `signoz mcp start` starts it now.",
            ].join("\n")
          );
        },
      }),
      disable: defineCommand({
        meta: { name: "disable", description: "Stop starting the server at login." },
        args: configArg,
        async run({ args }) {
          const configFile = configFileOf(io, deps, args.config);
          requireSavedConfig(configFile);
          const result = await disableBoot(deps, io.env, configFile);
          io.stdout(`The SigNoz MCP server no longer starts at login (${result.location}).`);
        },
      }),
      status: defineCommand({
        meta: { name: "status", description: "Whether the server starts at login." },
        args: configArg,
        async run({ args }) {
          requireSavedConfig(configFileOf(io, deps, args.config));
          const result = await bootStatus(deps, io.env);
          io.stdout(describeBoot(result));
          if (!result.enabled) exit.code = EXIT_NOT_RUNNING;
        },
      }),
    },
  });

  /** After a save: a running server read the file at start, so it keeps the old values until restarted. */
  const reportSaved = (configFile: string): void => {
    io.stdout(`Saved ${configFile}.`);
    const running = runningState(configFile, deps);
    if (running) {
      io.stdout(
        `The server running at ${running.url} (pid ${running.pid}) still has the old settings; ` +
          "restart it: signoz mcp stop && signoz mcp start"
      );
    }
  };

  const config = defineCommand({
    meta: {
      name: "config",
      description:
        "Edit the saved configuration: asked in the terminal, set by flags (scripts, CI), or in a local web form (--web).",
    },
    args: {
      ...configArg,
      "api-key": {
        type: "string",
        description: "Save this API key, without asking. It stays in your shell history; prefer the prompt.",
      },
      "base-url": { type: "string", description: "Save this SigNoz instance URL, without asking." },
      "auth-token": {
        type: "string",
        description: "Save this browser AUTH_TOKEN, without asking ('-' clears it). Stays in your shell history.",
      },
      "refresh-auth-token": {
        type: "string",
        description: "Save this browser REFRESH_AUTH_TOKEN, without asking ('-' clears it).",
      },
      env: { type: "string", description: "Save this default deployment.environment, without asking ('' clears it)." },
      port: { type: "string", description: `Save this server port, without asking ('' resets it to ${DEFAULT_PORT}).` },
      web: { type: "boolean", description: "Edit it in a local web form instead." },
      open: {
        type: "boolean",
        default: true,
        description: "With --web: open the form in the browser (--no-open to skip).",
      },
    },
    async run({ args }) {
      const configFile = configFileOf(io, deps, args.config);
      // `--api-key`/`--base-url`/`--env` are connection flags: `runCli` takes them off the line into `global`.
      const flags: ConfigValues = {
        SIGNOZ_BASE_URL: global.baseUrl,
        SIGNOZ_API_KEY: global.apiKey,
        SIGNOZ_AUTH_TOKEN: args["auth-token"],
        SIGNOZ_REFRESH_AUTH_TOKEN: args["refresh-auth-token"],
        SIGNOZ_ENV: global.environment ?? args.env,
        PORT: args.port,
      };
      const given = CONFIG_KEYS.filter((key) => flags[key] !== undefined);

      if (args.web) {
        if (given.length > 0) throw new CliInputError("--web takes no values: set them in the form.");
        const ui = await startConfigUi(configFile);
        io.stdout(`Configuration form: ${ui.url}\nWaiting for it to be saved (Ctrl+C to cancel)…`);
        if (args.open) {
          deps.openBrowser(ui.url).catch(() => io.stderr("Could not open a browser; open the link above."));
        }
        try {
          const outcome = await ui.done;
          if (outcome === "timeout") {
            io.stderr("Nothing was saved within 10 minutes.");
            exit.code = 1;
          } else {
            reportSaved(configFile);
          }
        } finally {
          await ui.close();
        }
        return;
      }

      const saved = readEnvFile(configFile);
      let input: ConfigValues | undefined;
      if (given.length > 0) {
        // Only the flags given change anything: the rest is kept as saved (secrets through
        // valuesFromInput's blank-keeps rule, so they are not passed back in as input).
        input = {
          ...saved,
          SIGNOZ_API_KEY: undefined,
          SIGNOZ_AUTH_TOKEN: undefined,
          SIGNOZ_REFRESH_AUTH_TOKEN: undefined,
        };
        for (const key of given) input[key] = flags[key];
      } else {
        if (!deps.terminal) {
          throw new CliInputError(
            "No interactive terminal to ask in: pass --base-url and --api-key (or --auth-token and " +
              "--refresh-auth-token), plus --env/--port if wanted, or use --web."
          );
        }
        io.stdout(`Configuring ${configFile}`);
        input = await promptConfig(saved, deps.terminal);
        if (!input) {
          io.stderr("Nothing was saved.");
          exit.code = EXIT_CANCELLED;
          return;
        }
      }

      const { values, error } = valuesFromInput(input, saved);
      if (error) throw new CliInputError(error);
      writeEnvFile(configFile, values);
      reportSaved(configFile);
    },
  });

  const install = defineCommand({
    meta: {
      name: "install",
      description:
        "Register the SigNoz MCP server (stdio) in Claude Code, Codex or OpenCode, picked from a list. " +
        "Needs a saved configuration (`signoz mcp config`), which the registered server reads at launch.",
    },
    args: {
      client: {
        type: "string",
        description: `Skip the picker: comma-separated clients to install into (${CLIENT_FLAG_IDS}).`,
      },
      force: { type: "boolean", description: `With --client: replace an existing '${SERVER_ENTRY}' entry.` },
      "dry-run": { type: "boolean", description: "Print the commands instead of running them." },
      ...configArg,
    },
    async run({ args }) {
      const configFile = configFileOf(io, deps, args.config);
      requireSavedConfig(configFile);
      const detected = await detectHosts(deps, io.env);
      const statuses = await detectClients(detected.hosts);
      const searched = CLIENTS.map((client) => client.name).join(", ");

      const chosen = await chooseClients(
        deps,
        { statuses, windowsUnreachable: detected.windowsUnreachable },
        args.client,
        {
          message: "Install the SigNoz MCP server (stdio) into:",
          hint: installHint,
          enabled: (client) => client.installed,
          checked: () => true,
          none: `None of ${searched} was found on the PATH.`,
        },
        (client) => {
          if (client.entry && !args.force) {
            throw new CliInputError(
              `${displayName(client)} already has an MCP server named '${SERVER_ENTRY}'; pass --force to replace it.`
            );
          }
        },
        (ids) => `No interactive terminal for the picker: pass --client ${ids} (and --force to replace an entry).`
      );
      if (!chosen) {
        exit.code = EXIT_CANCELLED;
        return;
      }

      const width = Math.max(...chosen.map((client) => displayName(client).length));
      for (const client of chosen) {
        const steps = installSteps(client, client.host.serverLaunch(configFile), Boolean(client.entry));
        const label = displayName(client).padEnd(width);
        if (args["dry-run"]) {
          io.stdout(`${label}  would run:\n${steps.map((step) => `  ${formatStep(step)}`).join("\n")}`);
          continue;
        }
        const outcome = await runSteps(client.host, steps);
        if (outcome.ok) {
          io.stdout(`✔ ${label}  registered as '${SERVER_ENTRY}'${client.entry ? " (replaced)" : ""}`);
        } else {
          io.stderr(`✘ ${label}  ${outcome.detail}`);
          exit.code = 1;
        }
      }
      if (!args["dry-run"] && exit.code === 0) {
        io.stdout("Restart the client, or reconnect its MCP servers, to load it.");
      }
    },
  });

  const uninstall = defineCommand({
    meta: {
      name: "uninstall",
      description:
        `Remove the '${SERVER_ENTRY}' MCP server from Claude Code, Codex or OpenCode, picked from a list. ` +
        "Runs without a saved configuration, so a client can be cleaned up after it is gone.",
    },
    args: {
      client: {
        type: "string",
        description: `Skip the picker: comma-separated clients to remove it from (${CLIENT_FLAG_IDS}).`,
      },
      "dry-run": { type: "boolean", description: "Print what would be removed instead of removing it." },
    },
    async run({ args }) {
      const detected = await detectHosts(deps, io.env);
      const statuses = await detectClients(detected.hosts);
      const chosen = await chooseClients(
        deps,
        { statuses, windowsUnreachable: detected.windowsUnreachable },
        args.client,
        {
          message: "Remove the SigNoz MCP server from:",
          hint: uninstallHint,
          enabled: (client) => Boolean(client.entry),
          checked: () => true,
          none: `No client has an MCP server named '${SERVER_ENTRY}' in its user config.`,
        },
        (client) => {
          if (!client.entry)
            throw new CliInputError(`${displayName(client)} has no MCP server named '${SERVER_ENTRY}'.`);
        },
        (ids) => `No interactive terminal for the picker: pass --client ${ids}.`
      );
      if (!chosen) {
        exit.code = EXIT_CANCELLED;
        return;
      }

      const width = Math.max(...chosen.map((client) => displayName(client).length));
      for (const client of chosen) {
        const actions = uninstallActions(client);
        const label = displayName(client).padEnd(width);
        if (args["dry-run"]) {
          io.stdout(`${label}  would:\n${actions.map((action) => `  ${formatAction(action)}`).join("\n")}`);
          continue;
        }
        const outcome = await runUninstall(client.host, actions);
        if (outcome.ok) {
          io.stdout(`✔ ${label}  removed '${SERVER_ENTRY}'`);
        } else {
          io.stderr(`✘ ${label}  ${outcome.detail}`);
          exit.code = 1;
        }
      }
      if (!args["dry-run"] && exit.code === 0) {
        io.stdout("Restart the client, or reconnect its MCP servers, to drop it.");
      }
    },
  });

  return defineCommand({
    meta: { name: "mcp", description: "Run and configure the SigNoz MCP server." },
    subCommands: { start, stop, status, boot, config, install, uninstall },
  });
}

/** The deepest subcommand the arguments name, for usage output. */
async function usageFor(main: CommandDef, argv: string[]): Promise<string> {
  let command = main;
  let parent: CommandDef | undefined;
  for (const arg of argv) {
    if (arg.startsWith("-")) continue;
    const next = ((command.subCommands ?? {}) as Record<string, CommandDef>)[arg];
    if (!next) break;
    parent = command;
    command = next;
  }
  return renderUsage(command, parent);
}

/** `signoz mcp …`: answers the exit code. Runs without connecting to any MCP server. */
export async function runMcpCli(argv: string[], global: ConnectOptions, io: CliIo, deps: McpDeps): Promise<number> {
  const exit = { code: 0 };
  const main = buildMcpCommand(global, io, deps, exit);
  if (argv.includes("--help") || argv.includes("-h") || argv.filter((arg) => !arg.startsWith("-")).length === 0) {
    io.stdout(await usageFor(main, argv));
    return 0;
  }
  try {
    await runCommand(main, { rawArgs: argv });
    return exit.code;
  } catch (error) {
    if (error instanceof Error && error.name === "CLIError") {
      io.stderr(`${await usageFor(main, argv)}\n\n${error.message}`);
      return 1;
    }
    throw error;
  }
}
