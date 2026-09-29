// Publishes the docs site to gh-pages after a push to main. Git has no post-push hook, so
// .husky/pre-push hands this script the refs it is about to push, once its checks pass:
//
// `node scripts/deploy-site.mjs schedule <remote> <url>`   pre-push's arguments, refs on stdin
//
// Only a push to origin's URL counts: `docusaurus deploy` always publishes the real site, so a push
// of main to a fork or a scratch remote must not. When main is among them and the push touches website/ or src/ (the API reference is generated
// from src/), it starts itself detached and returns at once, so the push never waits on the build.
// The detached run waits until the remote's main is the pushed commit (a rejected push never gets
// there, so nothing is published), then checks that commit out in a worktree of its own under
// <git dir>/site-deploy/tree and runs `pnpm docs:deploy` there, so uncommitted changes in the
// working tree never reach the site. One deploy runs at a time; a run whose commit is no longer the
// remote's main by the time it gets its turn leaves the work to the run for the newer push.
//
// Its log is <git dir>/site-deploy/deploy.log. SIGNOZ_SKIP_SITE_DEPLOY=1 skips it for one push, and
// GIT_USER is passed on to `docusaurus deploy` (default: the site's organizationName).
import spawn from "cross-spawn";
import { spawn as spawnDetached } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRANCH = "refs/heads/main";
const WATCHED = ["website", "src"];
const ZERO = /^0+$/;
const PUSH_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 5000;
const DEFAULT_GIT_USER = "Hoyasumii";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function git(args, cwd = repoRoot) {
  const result = spawn.sync("git", args, { cwd, encoding: "utf8" });
  return { ok: result.status === 0, out: (result.stdout ?? "").trim() };
}

const gitDir = path.resolve(repoRoot, git(["rev-parse", "--git-common-dir"]).out);
const stateDir = path.join(gitDir, "site-deploy");
const logFile = path.join(stateDir, "deploy.log");
const lockDir = path.join(stateDir, "lock");
const treeDir = path.join(stateDir, "tree");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);

function schedule(remote, url) {
  if (process.env.SIGNOZ_SKIP_SITE_DEPLOY === "1") return;
  if (url !== git(["remote", "get-url", "origin"]).out) return;
  const push = readFileSync(0, "utf8")
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .find(([, localSha, remoteRef]) => remoteRef === BRANCH && localSha !== undefined && !ZERO.test(localSha));
  if (push === undefined) return;
  const [, localSha, , remoteSha] = push;

  // An unknown remote commit (pushed from elsewhere, never fetched) fails the diff: deploy anyway.
  if (!ZERO.test(remoteSha)) {
    const diff = git(["diff", "--name-only", remoteSha, localSha, "--", ...WATCHED]);
    if (diff.ok && diff.out === "") return;
  }

  mkdirSync(stateDir, { recursive: true });
  const out = openSync(logFile, "a");
  const child = spawnDetached(process.execPath, [fileURLToPath(import.meta.url), "run", remote, localSha, remoteSha], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  child.unref();
  process.stderr.write(`Site deploy for ${localSha.slice(0, 7)} runs after the push lands; log: ${logFile}\n`);
}

function remoteMain(remote) {
  const result = git(["ls-remote", remote, BRANCH]);
  return result.ok ? (result.out.split(/\s+/)[0] ?? "") : undefined;
}

async function waitForPush(remote, sha, previous) {
  const deadline = Date.now() + PUSH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = remoteMain(remote);
    if (current === sha) return true;
    // Neither the old tip nor ours (nor a network failure): another push got there first.
    if (current !== undefined && current !== "" && current !== previous) {
      log(`${remote}'s main is ${current.slice(0, 7)}, not ${sha.slice(0, 7)}; the deploy for that push takes over.`);
      return false;
    }
    await sleep(POLL_MS);
  }
  log(`${sha.slice(0, 7)} never reached ${remote}'s main (was the push rejected?); nothing deployed.`);
  return false;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function lock() {
  for (;;) {
    try {
      mkdirSync(lockDir);
      writeFileSync(path.join(lockDir, "pid"), String(process.pid));
      return;
    } catch {
      // No pid yet means the owner is between mkdir and write, unless that was long ago.
      let owner;
      try {
        owner = Number(readFileSync(path.join(lockDir, "pid"), "utf8"));
      } catch {
        owner = Date.now() - statSync(lockDir, { throwIfNoEntry: false })?.mtimeMs > 60_000 ? 0 : undefined;
      }
      if (owner !== undefined && !(Number.isInteger(owner) && owner > 0 && isAlive(owner))) {
        rmSync(lockDir, { recursive: true, force: true });
      } else await sleep(POLL_MS);
    }
  }
}

function step(command, args, cwd, env = {}) {
  log(`$ ${command} ${args.join(" ")}`);
  const result = spawn.sync(command, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status ?? result.signal}`);
}

async function run(remote, sha, previous) {
  log(`deploy for ${sha.slice(0, 7)}: waiting for the push to reach ${remote}`);
  if (!(await waitForPush(remote, sha, previous))) return;
  await lock();
  try {
    const current = remoteMain(remote);
    if (current !== undefined && current !== sha) {
      log(`${remote}'s main moved on to ${current.slice(0, 7)}; the deploy for that push takes over.`);
      return;
    }
    if (existsSync(path.join(treeDir, ".git"))) {
      step("git", ["checkout", "--quiet", "--force", "--detach", sha], treeDir);
    } else {
      step("git", ["worktree", "prune"], repoRoot);
      step("git", ["worktree", "add", "--detach", treeDir, sha], repoRoot);
    }
    step("pnpm", ["install", "--frozen-lockfile"], treeDir, { HUSKY: "0" });
    // The worktree is on a detached HEAD, which docusaurus deploy would report as branch "HEAD".
    step("pnpm", ["docs:deploy"], treeDir, {
      GIT_USER: process.env.GIT_USER ?? DEFAULT_GIT_USER,
      CURRENT_BRANCH: "main",
    });
    log(`deploy for ${sha.slice(0, 7)}: done`);
  } catch (error) {
    log(`deploy for ${sha.slice(0, 7)} failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

const [mode, ...args] = process.argv.slice(2);
if (mode === "schedule") schedule(args[0], args[1]);
else if (mode === "run") await run(args[0], args[1], args[2]);
else {
  process.stderr.write("usage: node scripts/deploy-site.mjs schedule <remote> <url>  (refs on stdin)\n");
  process.exit(1);
}
