import { emit, fail, pass, readInputs, uncertain } from "../lib/result.mjs";

function checkInputs(inputs) {
  return inputs.filter((input) => input.kind === "check");
}

function paramsInput(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
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

function childStatus(child, requiredFreshMinutes, optionalFreshMinutes) {
  const role = child.role ?? "required";
  const required = role !== "optional";
  const maxAgeMinutes = required ? requiredFreshMinutes : optionalFreshMinutes;
  const result = child.result ?? null;
  const ageMinutes = minutesSince(result?.timestamp);
  const fresh = result && ageMinutes !== null && ageMinutes <= maxAgeMinutes;
  const stale = Boolean(result) && !fresh;

  return {
    id: child.id,
    role,
    required,
    status: result?.status ?? "missing",
    summary: result?.summary ?? "No result yet",
    timestamp: result?.timestamp ?? null,
    ageMinutes,
    freshness: !result ? "missing" : fresh ? "fresh" : "stale",
    maxAgeMinutes,
    stale,
    considered: required || fresh
  };
}

function rollup(children) {
  const considered = children.filter((child) => child.considered);
  const required = children.filter((child) => child.required);

  if (considered.some((child) => child.status === "fail")) return "fail";
  if (required.some((child) => child.freshness !== "fresh")) return "uncertain";
  if (considered.some((child) => child.status === "error" || child.status === "uncertain" || child.status === "missing")) return "uncertain";
  return "pass";
}

function childPhrase(child) {
  const freshness = child.freshness === "fresh" ? `fresh, ${formatAge(child.ageMinutes)}` : child.freshness;
  const optionalNote = child.required ? "" : child.considered ? ", optional considered" : ", optional ignored";
  return `${child.id} ${child.status} (${freshness}${optionalNote})`;
}

function makeSummary(status, children) {
  if (children.length === 0) return `validation.pr: ${status} — no child checks configured.`;
  return `validation.pr: ${status} — ${children.map(childPhrase).join("; ")}.`;
}

emit(async () => {
  const inputs = readInputs();
  const params = paramsInput(inputs);
  const requiredFreshMinutes = Number(params.requiredFreshMinutes ?? 24 * 60);
  const optionalFreshMinutes = Number(params.optionalFreshMinutes ?? requiredFreshMinutes);
  const children = checkInputs(inputs).map((child) => childStatus(child, requiredFreshMinutes, optionalFreshMinutes));
  const status = rollup(children);
  const requiredIds = children.filter((child) => child.required).map((child) => child.id);
  const optionalIds = children.filter((child) => !child.required).map((child) => child.id);
  const findings = {
    policy: {
      requiredFreshMinutes,
      optionalFreshMinutes,
      required: `${requiredIds.join(", ")} must have fresh results and no fail/error/uncertain status.`,
      optional: optionalIds.length > 0
        ? `${optionalIds.join(", ")} ${optionalIds.length === 1 ? "is" : "are"} considered only when fresh; stale or missing optional results are noted but do not block this PR rollup.`
        : "No optional checks are configured."
    },
    children
  };
  const summary = makeSummary(status, children);

  if (status === "pass") return pass(summary, { findings });
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
});
