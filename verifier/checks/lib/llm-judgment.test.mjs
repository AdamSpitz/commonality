import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonObject } from "./llm-judgment.mjs";

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
