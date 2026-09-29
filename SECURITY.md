# Security Policy

## Supported versions

Only the latest release of `@hoyasumii/signoz` receives security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/Hoyasumii/signoz/security/advisories/new), or by
email to alanreisanjo@gmail.com.

Include the affected version, what an attacker can do, and the steps to reproduce it. You should get an answer
within a week. Once a fix is released, the advisory is published with credit to you, unless you prefer otherwise.

## Scope

Things worth reporting include, among others:

- a way to leak the SigNoz API key or the session's auth and refresh tokens: through logs, error messages, the
  saved `.env`, `session.json`, or the daemon state file;
- a way to reach the MCP HTTP server (`signoz mcp start`) from anything other than the local machine, or to call
  its `/shutdown` without the token;
- a way for a tool call to run a destructive operation, or to make a dashboard public, without `confirm: true`;
- command injection through `signoz mcp install`/`uninstall` or the login service they set up.

Vulnerabilities in SigNoz itself belong to [SigNoz/signoz](https://github.com/SigNoz/signoz/security).
