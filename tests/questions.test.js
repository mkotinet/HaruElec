const assert = require("assert");
const fs = require("fs");
const path = require("path");

const questionsPath = path.join(__dirname, "..", "data", "questions.json");

console.log("Running questions.json schema and validation test...");

// 1. File existence
assert(fs.existsSync(questionsPath), "data/questions.json must exist");

// 2. JSON parse
const raw = fs.readFileSync(questionsPath, "utf8");
const questions = JSON.parse(raw);
assert(Array.isArray(questions), "questions.json must contain an array");
assert(questions.length >= 50, `Expected at least 50 questions, found ${questions.length}`);

// 3. Subject validation (5 subjects: 1~5)
const subjectMap = {
  1: "전기자기학",
  2: "전력공학",
  3: "전기기기",
  4: "회로이론 및 제어공학",
  5: "전기설비기술기준"
};

const subjectCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const ids = new Set();

questions.forEach((q, index) => {
  assert(Number.isInteger(q.id), `Item ${index}: id must be an integer`);
  assert(!ids.has(q.id), `Item ${index}: duplicate id ${q.id}`);
  ids.add(q.id);

  assert(q.subject_id in subjectMap, `Item ${index}: invalid subject_id ${q.subject_id}`);
  assert.strictEqual(q.subject, subjectMap[q.subject_id], `Item ${index}: subject name mismatch`);
  subjectCounts[q.subject_id]++;

  assert(typeof q.question === "string" && q.question.trim().length > 5, `Item ${index}: invalid question text`);
  assert(Array.isArray(q.options) && q.options.length === 4, `Item ${index}: options must be array of 4 items`);
  q.options.forEach((opt, optIdx) => {
    assert(typeof opt === "string" && opt.trim().length > 0, `Item ${index}: option ${optIdx + 1} is empty`);
  });

  assert(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 4, `Item ${index}: answer must be 1, 2, 3, or 4`);
  assert(typeof q.explanation === "string" && q.explanation.trim().length >= 10, `Item ${index}: explanation must be informative (>= 10 chars)`);
  assert(typeof q.year === "string" && q.year.length > 0, `Item ${index}: year/source required`);
});

// 4. Verify each subject has at least 10 questions
for (const [subId, count] of Object.entries(subjectCounts)) {
  assert(count >= 10, `Subject ${subId} (${subjectMap[subId]}) must have at least 10 questions, found ${count}`);
}

console.log(`✅ All ${questions.length} questions passed verification across all 5 subjects!`);
console.log("Subject distribution:", subjectCounts);
