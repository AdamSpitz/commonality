import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonObject, parsePiJsonStream } from "./llm-judgment.mjs";

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
