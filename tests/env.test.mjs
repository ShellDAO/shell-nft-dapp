import assert from "node:assert/strict";
import test from "node:test";
import { parseChainId } from "../scripts/lib/env.mjs";

test("parseChainId accepts positive decimal chain ids", () => {
  assert.equal(parseChainId("1337"), 1337);
  assert.equal(parseChainId("  1  "), 1);
});

test("parseChainId rejects invalid chain id values", () => {
  assert.throws(() => parseChainId(""), /positive decimal integer/);
  assert.throws(() => parseChainId("0"), /positive decimal integer/);
  assert.throws(() => parseChainId("1.5"), /positive decimal integer/);
  assert.throws(() => parseChainId("abc"), /positive decimal integer/);
  assert.throws(() => parseChainId(String(Number.MAX_SAFE_INTEGER + 1)), /safe JavaScript integer/);
});
