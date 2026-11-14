const assert = require("assert");
const { isServerVersionNewer } = require("../public/js/app.js");

function runTests() {
  console.log("🧪 Testing Client Auto Version Comparison...");

  assert.strictEqual(isServerVersionNewer("2.1.0", "2.0.0"), true, "2.1.0 should be newer than 2.0.0");
  assert.strictEqual(isServerVersionNewer("2.0.0", "2.1.0"), false, "2.0.0 should not be newer than 2.1.0");
  assert.strictEqual(isServerVersionNewer("2.1.0", "2.1.0"), false, "Identical version is not newer");
  assert.strictEqual(isServerVersionNewer("2.1.1", "2.1.0"), true, "Patch bump should be newer");
  assert.strictEqual(isServerVersionNewer("2.0.10", "2.0.9"), true, "Two-digit patch bump should be newer");
  assert.strictEqual(isServerVersionNewer("3.0.0", "2.9.9"), true, "Major bump should be newer");
  assert.strictEqual(isServerVersionNewer("", "2.0.0"), false, "Empty server version should return false");
  assert.strictEqual(isServerVersionNewer(null, "2.0.0"), false, "Null server version should return false");

  console.log("✅ All Version Comparison tests passed!");
}

runTests();
