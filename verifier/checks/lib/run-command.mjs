import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { artifactsDir, fail, pass, truncate, writeTextArtifact } from "./result.mjs";

// Kill the spawned command AND any descendants it forked. Spawning `detached`
// puts the child in its own process group (leader = child.pid); killing the
// negative pid tears down the whole group. This matters on timeout: SIGKILLing
// only the direct child (e.g. `npm`) leaves grandchildren (`sh`, `playwright`,
// a dev server) alive as orphans — which then squat on ports and hang the next
// run. Falls back to `child.kill` if group signalling is unsupported.
function killGroup(child, signal = "SIGKILL") {
  if (typeof child.pid === "number" && child.pid > 0) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      /* not a group leader / unsupported — fall through to direct kill */
    }
  }
  try {
    child.kill(signal);
  } catch {
    /* already gone */
  }
}

export async function runCommand(command, args = [], options = {}) {
  const timeoutMs = options.timeoutMs ?? 120000;
  const cwd = options.cwd ?? process.env.VERIFIER_WORKSPACE ?? process.cwd();
  const artifactOutputLimit = options.artifactOutputLimit ?? 12000;
  const findingOutputLimit = options.findingOutputLimit ?? 3000;
  const label = options.label ?? [command, ...args].join(" ");

  await mkdir(artifactsDir(), { recursive: true });

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = spawn(command, args, {
      // Separate process group so a timeout can signal the whole tree, not just
      // the direct child. See killGroup above.
      detached: true,
      cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const timer = setTimeout(() => {
      if (settled) return;
      killGroup(child);
      settled = true;
      resolve({
        status: "error",
        summary: `${label} timed out after ${timeoutMs}ms.`,
        findings: { command: [command, ...args], timeoutMs, stdoutTail: truncate(stdout, findingOutputLimit), stderrTail: truncate(stderr, findingOutputLimit) }
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (e) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      killGroup(child);
      resolve({
        status: "error",
        summary: `Could not launch ${label}: ${e.message}`,
        findings: { command: [command, ...args] }
      });
    });

    child.on("close", async (code, signal) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      // Tear down anything the child forked but didn't reap (e.g. a backgrounded
      // dev server), so a clean exit can't leave orphans either.
      killGroup(child);

      const combined = [`$ ${label}`, "", "--- stdout ---", stdout, "", "--- stderr ---", stderr].join("\n");
      const artifacts = combined.length > artifactOutputLimit
        ? [await writeTextArtifact("command.log", combined, "text/plain", `Full output from ${label}`)]
        : [];
      const findings = {
        command: [command, ...args],
        exitCode: code,
        signal,
        stdoutTail: truncate(stdout, findingOutputLimit),
        stderrTail: truncate(stderr, findingOutputLimit)
      };

      if (code === 0) {
        resolve(pass(`${label} passed.`, { findings, artifacts }));
      } else {
        resolve(fail(`${label} failed${code === null ? "" : ` with exit code ${code}`}${signal ? ` and signal ${signal}` : ""}.`, { findings, artifacts }));
      }
    });
  });
}
