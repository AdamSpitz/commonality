import { emit, fail, pass, readInputs, uncertain } from "../lib/result.mjs";

function checkInputs(inputs) {
  return inputs.filter((input) => input.kind === "check");
}

function minutesSince(timestamp) {
  if (!timestamp) return null;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
}

function formatAge(minutes) {
  if (minutes === null) return "unknown age";
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 48) return remainingMinutes === 0 ? `${hours}h ago` : `${hours}h ${remainingMinutes}m ago`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}d ago` : `${days}d ${remainingHours}h ago`;
}

function childStatus(child) {
  const role = child.role ?? "required";
  const required = role !== "optional";
  const result = child.result ?? null;
  const ageMinutes = minutesSince(result?.timestamp);

  return {
    id: child.id,
    role,
    required,
    status: result?.status ?? "missing",
    summary: result?.summary ?? "No result yet",
    timestamp: result?.timestamp ?? null,
    ageMinutes,
    considered: required || Boolean(result)
  };
}

function rollup(children) {
  const considered = children.filter((child) => child.considered);

  if (considered.some((child) => child.status === "fail")) return "fail";
  if (considered.some((child) => child.status === "error" || child.status === "uncertain" || child.status === "missing")) return "uncertain";
  return "pass";
}

function childPhrase(child) {
  const age = child.ageMinutes === null ? "no result" : formatAge(child.ageMinutes);
  const optionalNote = child.required ? "" : ", optional";
  return `${child.id} ${child.status} (${age}${optionalNote})`;
}

function makeSummary(status, children) {
  if (children.length === 0) return `validation.pr: ${status} — no child checks configured.`;
  return `validation.pr: ${status} — ${children.map(childPhrase).join("; ")}.`;
}

emit(async () => {
  const inputs = readInputs();
  const children = checkInputs(inputs).map((child) => childStatus(child));
  const status = rollup(children);
  const requiredIds = children.filter((child) => child.required).map((child) => child.id);
  const optionalIds = children.filter((child) => !child.required).map((child) => child.id);
  const findings = {
    policy: {
      required: `${requiredIds.join(", ")} must have a result and no fail/error/uncertain status. Age is shown, not gated.`,
      optional: optionalIds.length > 0
        ? `${optionalIds.join(", ")} ${optionalIds.length === 1 ? "is" : "are"} included when a result exists.`
        : "No optional checks are configured."
    },
    children
  };
  const summary = makeSummary(status, children);

  if (status === "pass") return pass(summary, { findings });
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
});
