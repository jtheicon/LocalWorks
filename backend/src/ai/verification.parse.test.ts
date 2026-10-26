import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geminiModelChain, parseGeminiJson } from "./verification";

describe("geminiModelChain", () => {
  it("defaults to stable flash models without GEMINI_MODEL", () => {
    const prev = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    const chain = geminiModelChain();
    if (prev !== undefined) process.env.GEMINI_MODEL = prev;
    assert.equal(chain[0], "gemini-3.5-flash");
    assert.ok(chain.includes("gemini-3.8-flash"));
  });
});

describe("parseGeminiJson", () => {
  it("parses raw JSON", () => {
    assert.deepEqual(parseGeminiJson('{"a":1}'), { a: 1 });
  });

  it("parses fenced JSON", () => {
    assert.deepEqual(parseGeminiJson("```json\n{\"b\":\"x\"}\n```"), { b: "x" });
  });
});
