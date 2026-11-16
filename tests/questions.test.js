const assert = require("assert");
const fs = require("fs");
const path = require("path");

const questionsPath = path.join(__dirname, "..", "data", "questions.json");

console.log("Running enhanced questions.json schema and validation test...");

// 1. File existence
assert(fs.existsSync(questionsPath), "data/questions.json must exist");

// 2. JSON parse
const raw = fs.readFileSync(questionsPath, "utf8");
const questions = JSON.parse(raw);
assert(Array.isArray(questions), "questions.json must contain an array");
assert(questions.length >= 100, `Expected at least 100 questions, found ${questions.length}`);

// 3. Subject validation (6 subjects: 1~5 Written, 6 Practical)
const subjectMap = {
  1: "전기자기학",
  2: "전력공학",
  3: "전기기기",
  4: "회로이론 및 제어공학",
  5: "전기설비기술기준",
  6: "실기 전기설비설계 및 관리"
};

const subjectCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let kecCount = 0;
const ids = new Set();

questions.forEach((q, index) => {
  assert(Number.isInteger(q.id), `Item ${index}: id must be an integer`);
  assert(!ids.has(q.id), `Item ${index}: duplicate id ${q.id}`);
  ids.add(q.id);

  assert(q.subject_id in subjectMap, `Item ${index}: invalid subject_id ${q.subject_id}`);
  assert.strictEqual(q.subject, subjectMap[q.subject_id], `Item ${index}: subject name mismatch`);
  subjectCounts[q.subject_id]++;

  // Level validation (1~5)
  assert(Number.isInteger(q.level) && q.level >= 1 && q.level <= 5, `Item ${index}: invalid level ${q.level}`);
  assert(typeof q.level_name === "string" && q.level_name.length > 0, `Item ${index}: invalid level_name`);
  levelCounts[q.level]++;

  // Hint validation
  assert(typeof q.hint === "string" && q.hint.trim().length >= 4, `Item ${index}: hint required for magnifier tool`);

  // Track validation
  assert(q.exam_track === "written" || q.exam_track === "practical", `Item ${index}: exam_track must be written or practical`);
  if (q.subject_id === 6) {
    assert.strictEqual(q.exam_track, "practical", `Item ${index}: subject_id 6 must be practical track`);
  } else {
    assert.strictEqual(q.exam_track, "written", `Item ${index}: subject_id 1~5 must be written track`);
  }

  assert(typeof q.question === "string" && q.question.trim().length > 5, `Item ${index}: invalid question text`);
  assert(Array.isArray(q.options) && q.options.length === 4, `Item ${index}: options must be array of 4 items`);
  q.options.forEach((opt, optIdx) => {
    assert(typeof opt === "string" && opt.trim().length > 0, `Item ${index}: option ${optIdx + 1} is empty`);
  });

  assert(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 4, `Item ${index}: answer must be 1, 2, 3, or 4`);
  assert(typeof q.explanation === "string" && q.explanation.trim().length >= 20, `Item ${index}: explanation must be comprehensive`);
  assert(typeof q.year === "string" && q.year.length > 0, `Item ${index}: year/source required`);

  // Advanced metadata checks
  assert(typeof q.official_source === "string" && q.official_source.length >= 4, `Item ${index}: official_source required`);

  // Check structured explanation sections
  assert(q.explanation.includes("【공식 출처】"), `Item ${index}: explanation must contain 【공식 출처】`);
  assert(q.explanation.includes("【상세 풀이】") || q.explanation.includes("【핵심 풀이】"), `Item ${index}: explanation must contain 풀이`);
  assert(q.explanation.includes("【오답 분석】") || q.explanation.includes("【보기 분석】"), `Item ${index}: explanation must contain 오답/보기 분석`);

  if (q.kec_revision && q.kec_revision.is_revised) {
    kecCount++;
    assert(typeof q.kec_revision.topic === "string" && q.kec_revision.topic.length > 0, `Item ${index}: kec_revision.topic required`);
    assert(typeof q.kec_revision.before === "string", `Item ${index}: kec_revision.before required`);
    assert(typeof q.kec_revision.after === "string", `Item ${index}: kec_revision.after required`);
  }
});

// 4. Verify each subject has at least 40 questions (50 for practical)
for (const [subId, count] of Object.entries(subjectCounts)) {
  const expectedMin = subId === "6" ? 50 : 40;
  assert(count >= expectedMin, `Subject ${subId} (${subjectMap[subId]}) must have at least ${expectedMin} questions, found ${count}`);
}

// 5. Verify level distribution (each level has at least 30 questions)
for (const [lvl, count] of Object.entries(levelCounts)) {
  assert(count >= 30, `Level ${lvl} must have at least 30 questions, found ${count}`);
}

assert(kecCount >= 20, `Expected at least 20 KEC revised questions in question bank, found ${kecCount}`);

console.log(`✅ All ${questions.length} questions passed verification!`);
console.log("Subject distribution:", subjectCounts);
console.log("Level distribution:", levelCounts);
console.log(`KEC Revision Questions: ${kecCount} items`);
