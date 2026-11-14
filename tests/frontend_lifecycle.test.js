const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Frontend Dynamic Option Shuffle & Mobile Lifecycle...");

const appJsPath = path.join(__dirname, "..", "public", "js", "app.js");
const appJsCode = fs.readFileSync(appJsPath, "utf8");

// 1. Static AST/Content assertions
assert(
  appJsCode.includes("function shuffleQuestionOptions") || appJsCode.includes("shuffleQuestionOptions =") || appJsCode.includes("shuffleQuestionOptions("),
  "app.js must implement shuffleQuestionOptions"
);
assert(
  appJsCode.includes("checkDateTransition"),
  "app.js must implement checkDateTransition"
);
assert(
  appJsCode.includes("visibilitychange"),
  "app.js must listen to visibilitychange for mobile background resume"
);
assert(
  appJsCode.includes("getKSTDateString"),
  "app.js must implement getKSTDateString helper"
);

// 2. Functional testing via eval/export
const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  module: { exports: {} }
};

const fn = new Function("window", "document", "localStorage", "module", appJsCode);
fn(sandbox.window, sandbox.document, sandbox.localStorage, sandbox.module);

const { shuffleQuestionOptions, getKSTDateString, checkDateTransition } = sandbox.module.exports;

assert(typeof shuffleQuestionOptions === "function", "shuffleQuestionOptions must be exported");
assert(typeof getKSTDateString === "function", "getKSTDateString must be exported");

// 3. Test shuffleQuestionOptions integrity and distribution
const sampleQ = {
  id: 101,
  question: "KEC에서 규정하는 저압의 전압 범위는?",
  options: [
    "교류 600V 이하, 직류 750V 이하",
    "교류 1,000V 이하, 직류 1,500V 이하",
    "교류 1,000V 이하, 직류 750V 이하",
    "교류 750V 이하, 직류 1,500V 이하"
  ],
  answer: 2 // Correct answer text: "교류 1,000V 이하, 직류 1,500V 이하"
};

const expectedText = sampleQ.options[sampleQ.answer - 1];
const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };

for (let i = 0; i < 1000; i++) {
  const shuffled = shuffleQuestionOptions(sampleQ);
  
  // Integrity: answer index (1~4) must point to expectedText
  assert.strictEqual(
    shuffled.options[shuffled.answer - 1],
    expectedText,
    "Shuffled answer index must point to the exact same correct answer text!"
  );
  
  // All 4 options must still be present
  assert.strictEqual(shuffled.options.length, 4);
  assert(shuffled.options.includes(expectedText));
  
  distribution[shuffled.answer]++;
}

console.log("1000 trials 1-based answer distribution (1, 2, 3, 4):", distribution);

// Each position (1, 2, 3, 4) should get roughly 25% (at least 150 out of 1000)
for (let idx = 1; idx <= 4; idx++) {
  assert(
    distribution[idx] > 150,
    `Option position ${idx} should have appeared at least 150 times, got ${distribution[idx]}`
  );
}

// 4. Test KST date formatting
const kstDate = getKSTDateString();
assert(/^\d{4}-\d{2}-\d{2}$/.test(kstDate), `KST date format must be YYYY-MM-DD, got ${kstDate}`);

console.log("✅ All Option Shuffle & Mobile Lifecycle Tests Passed!");
