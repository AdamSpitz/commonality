import { fail, pass, readInputs } from "../lib/result.mjs";

// Advisory "middle-ground processor" for the one-shot backlog (workflow/task-tiers.md).
// It deliberately does NOT execute or route backlog items, and it does NOT write
// into Adam's inbox itself (a scheduled check silently mutating a tracked human
// file would be surprising and churny). Instead it guards one invariant: while
// TODO.md holds actionable items, inbox.md must keep its standing
// "go process the backlog" reminder, so the prompt to make a processing pass is
// always visible in Adam's inbox. If the reminder gets deleted, this surfaces it.
//
// Non-gating: wired under meta.verifier-health via advisoryCheckIds, so it never
// turns root red — it's a Tell, not an Ask.

const REMINDER_ANCHOR = "<!-- backlog-reminder -->";

function findFileInput(inputs, asName) {
  return inputs.find((i) => i.kind === "file" && (i.as === asName || i.path?.endsWith(asName)));
}

function requireContent(input, label) {
  if (!input) throw new Error(`Missing ${label} file input.`);
  if (input.content === null || input.content === undefined) throw new Error(`Could not read ${label}: ${input.path}`);
  return input.content;
}

// A backlog item is a top-level Markdown bullet ("- ...") in TODO.md. Sub-bullets
// (indented) are detail of their parent, not separate items, so they don't count.
function countActionableItems(todo) {
  return todo.split("\n").filter((line) => /^- \S/.test(line)).length;
}

async function main() {
  const inputs = readInputs();
  const todo = requireContent(findFileInput(inputs, "todo"), "TODO.md");
  const attention = requireContent(findFileInput(inputs, "needsAttention"), "inbox.md");

  const itemCount = countActionableItems(todo);
  const reminderPresent = attention.includes(REMINDER_ANCHOR);
  const findings = { itemCount, reminderPresent, anchor: REMINDER_ANCHOR };

  if (itemCount === 0) {
    return pass("Backlog is empty; no processing pass needed.", { findings });
  }
  if (!reminderPresent) {
    return fail(
      `TODO.md has ${itemCount} backlog item(s) but inbox.md is missing the backlog-processing reminder.`,
      {
        findings: {
          ...findings,
          severity: "low",
          recommendation: `Restore the "${REMINDER_ANCHOR}" reminder block in inbox.md.`
        }
      }
    );
  }
  return pass(`Backlog has ${itemCount} item(s); processing reminder is present in the inbox.`, { findings });
}

main()
  .then((r) => console.log(JSON.stringify(r)))
  .catch((e) => {
    console.log(JSON.stringify({ status: "error", summary: `Could not run backlog-reminder: ${e?.message ?? String(e)}` }));
    process.exit(1);
  });
