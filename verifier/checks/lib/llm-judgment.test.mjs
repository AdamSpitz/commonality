import assert from "node:assert/strict";
import test from "node:test";
import { coerceSubscriptionModel, getLlmResponse, parseJsonObject, parsePiJsonStream, resolveDefaultLlmCommand } from "./llm-judgment.mjs";

test("resolveDefaultLlmCommand uses an explicit installed pi path without relying on PATH", () => {
  assert.equal(resolveDefaultLlmCommand({ PI_CODING_AGENT_BIN: "/bin/sh" }), "/bin/sh");
});

test("resolveDefaultLlmCommand falls back to PATH lookup when no candidate exists", () => {
  assert.equal(resolveDefaultLlmCommand({ HOME: "/definitely/missing" }), "pi");
});

test("parseJsonObject parses strict JSON", () => {
  assert.deepEqual(parseJsonObject('{"status":"pass","summary":"ok"}'), {
    status: "pass",
    summary: "ok",
  });
});

test("parseJsonObject extracts JSON from prose or fenced output", () => {
  assert.deepEqual(parseJsonObject('Here is the result:\n```json\n{"status":"pass","summary":"ok"}\n```'), {
    status: "pass",
    summary: "ok",
  });
});

test("parseJsonObject tolerates raw control characters inside LLM JSON strings", () => {
  assert.deepEqual(parseJsonObject('{"summary":"first line\nsecond line","detail":"first\tsecond"}'), {
    summary: "first line\nsecond line",
    detail: "first\tsecond",
  });
});

test("parseJsonObject ignores braces inside strings while extracting", () => {
  assert.deepEqual(
    parseJsonObject('prefix {"summary":"use { braces } in text\nand keep parsing","status":"uncertain"} suffix'),
    {
      summary: "use { braces } in text\nand keep parsing",
      status: "uncertain",
    },
  );
});

test("parseJsonObject reports absence of a JSON object", () => {
  assert.throws(() => parseJsonObject("not JSON"), /JSON object/);
});

// Build a minimal assistant message_end event line as pi emits it in --mode json.
function assistantMessageEnd({ text, input, output, cost }) {
  return JSON.stringify({
    type: "message_end",
    message: {
      role: "assistant",
      model: "gpt-5.5",
      content: [{ type: "text", text }],
      usage: { input, output, cacheRead: 0, cacheWrite: 0, reasoning: 0, totalTokens: input + output, cost: { total: cost } },
    },
  });
}

test("parsePiJsonStream extracts the final answer text and aggregates usage", () => {
  const stream = [
    JSON.stringify({ type: "session", id: "abc" }),
    JSON.stringify({ type: "message_start", message: { role: "user", content: [] } }),
    assistantMessageEnd({ text: '{"status":"pass","summary":"ok"}', input: 390, output: 5, cost: 0.0021 }),
    // turn_end/agent_end repeat the same message — must NOT be double-counted.
    JSON.stringify({ type: "turn_end", message: { role: "assistant", usage: { input: 390, output: 5, cost: { total: 0.0021 } } } }),
  ].join("\n");

  const { text, usage } = parsePiJsonStream(stream);
  assert.equal(text, '{"status":"pass","summary":"ok"}');
  assert.equal(usage.input, 390);
  assert.equal(usage.output, 5);
  assert.equal(usage.totalTokens, 395);
  assert.equal(usage.costUsd, 0.0021);
  assert.equal(usage.model, "gpt-5.5");
});

test("parsePiJsonStream sums usage across tool-using turns and takes the last answer", () => {
  const stream = [
    assistantMessageEnd({ text: "", input: 100, output: 20, cost: 0.001 }),
    assistantMessageEnd({ text: '{"status":"uncertain","summary":"done"}', input: 200, output: 30, cost: 0.002 }),
  ].join("\n");

  const { text, usage } = parsePiJsonStream(stream);
  assert.equal(text, '{"status":"uncertain","summary":"done"}');
  assert.equal(usage.input, 300);
  assert.equal(usage.output, 50);
  assert.equal(usage.costUsd, 0.003);
});

test("parsePiJsonStream falls back to raw text when the stream carries no usable events", () => {
  const { text, usage } = parsePiJsonStream("not json at all");
  assert.equal(text, "not json at all");
  assert.equal(usage, null);
});

test("coerceSubscriptionModel keeps xai and opencode-go pins", () => {
  assert.equal(coerceSubscriptionModel("xai/grok-4.6"), "xai/grok-4.6");
  assert.equal(coerceSubscriptionModel("opencode-go/qwen3.8-max"), "opencode-go/qwen3.8-max");
});

test("coerceSubscriptionModel rewrites OpenRouter onto the workspace default", () => {
  assert.equal(coerceSubscriptionModel("openrouter/deepseek/deepseek-v4-pro"), "xai/grok-4.6");
});

test("coerceSubscriptionModel honors COMMONALITY_VERIFIER_LLM_PROVIDER", () => {
  assert.equal(
    coerceSubscriptionModel("xai/grok-4.6", { COMMONALITY_VERIFIER_LLM_PROVIDER: "opencode-go" }),
    "opencode-go/grok-4.6"
  );
});

test("coerceSubscriptionModel does not keep OpenRouter path tails under a provider override", () => {
  assert.equal(
    coerceSubscriptionModel("openrouter/deepseek/deepseek-v4-pro", {
      COMMONALITY_VERIFIER_LLM_PROVIDER: "opencode-go"
    }),
    "opencode-go/grok-4.6"
  );
});

test("getLlmResponse uses a chat-session envelope instead of spawning pi", async () => {
  const previous = process.env.COMMONALITY_VERIFIER_LLM_RESPONSE;
  process.env.COMMONALITY_VERIFIER_LLM_RESPONSE = '{"status":"pass","summary":"from chat","reportMarkdown":"# ok"}';
  try {
    const result = await getLlmResponse("unused prompt", {}, "prompt.md", "openrouter/should-not-matter");
    assert.equal(result.usage.model, "chat-session");
    assert.match(result.text, /from chat/);
  } finally {
    if (previous === undefined) delete process.env.COMMONALITY_VERIFIER_LLM_RESPONSE;
    else process.env.COMMONALITY_VERIFIER_LLM_RESPONSE = previous;
  }
});

test("getLlmResponse dump-prompt refuses to call a model", async () => {
  const previous = process.env.COMMONALITY_VERIFIER_DUMP_PROMPT;
  process.env.COMMONALITY_VERIFIER_DUMP_PROMPT = "1";
  try {
    await assert.rejects(
      () => getLlmResponse("prompt", {}, "prompt.md", "xai/grok-4.6"),
      /DUMP_PROMPT/
    );
  } finally {
    if (previous === undefined) delete process.env.COMMONALITY_VERIFIER_DUMP_PROMPT;
    else process.env.COMMONALITY_VERIFIER_DUMP_PROMPT = previous;
  }
});
