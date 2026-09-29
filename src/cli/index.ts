#!/usr/bin/env node
/**
 * `signoz`: the SigNoz MCP server's tools as terminal commands.
 *
 *   signoz search-logs --service point-api --severity ERROR --since 30m
 *   signoz --url http://127.0.0.1:3767/mcp whoami
 */
import { runCli } from "./run";

runCli(process.argv.slice(2), {
  // oxlint-disable-next-line no-console -- a CLI's output is the console
  stdout: (text) => console.log(text),
  // oxlint-disable-next-line no-console
  stderr: (text) => console.error(text),
  env: process.env,
}).then((code) => {
  process.exitCode = code;
});
