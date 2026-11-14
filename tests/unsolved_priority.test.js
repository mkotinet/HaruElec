const assert = require("assert");

// Import client functions exported for Node testing
const { selectUnsolvedFirstQuestions, shuffleQuestionOptions } = require("../public/js/app.js");

function runTests() {
  console.log("🧪 Testing Unsolved-First Question Selection Engine...");

  // Mock pool of 20 questions
  const mockPool = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    question: `전기 문제 ${i + 1}`,
    options: ["보기 1", "보기 2", "보기 3", "보기 4"],
    answer: 1
  }));

  // Test 1: When 15 questions are already solved, selecting 5 should 100% select the 5 unseen questions (ids 16~20)
  console.log("1. Testing selection when unseen pool >= count");
  const solvedSet1 = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const selected1 = selectUnsolvedFirstQuestions(mockPool, 5, solvedSet1);

  assert.strictEqual(selected1.length, 5);
  selected1.forEach(q => {
    assert.ok(!solvedSet1.has(q.id), `Selected question ${q.id} must NOT be in solved set`);
    assert.ok(q.id >= 16 && q.id <= 20, `Question id ${q.id} must be between 16 and 20`);
  });

  // Test 2: When only 2 questions are unseen, it must take both unseen and supplement 3 from seen
  console.log("2. Testing selection when unseen pool < count");
  const solvedSet2 = new Set(Array.from({ length: 18 }, (_, i) => i + 1)); // 1~18 solved, 19, 20 unseen
  const selected2 = selectUnsolvedFirstQuestions(mockPool, 5, solvedSet2);

  assert.strictEqual(selected2.length, 5);
  const selectedIds2 = selected2.map(q => q.id);
  assert.ok(selectedIds2.includes(19), "Must include unseen question 19");
  assert.ok(selectedIds2.includes(20), "Must include unseen question 20");
  const seenCount = selected2.filter(q => solvedSet2.has(q.id)).length;
  assert.strictEqual(seenCount, 3, "Must supplement exactly 3 from seen pool");

  // Test 3: When all 20 questions are solved (unseen pool == 0), it resets and returns 5 questions
  console.log("3. Testing cycle reset when all questions in pool are exhausted");
  const solvedSet3 = new Set(Array.from({ length: 20 }, (_, i) => i + 1));
  const selected3 = selectUnsolvedFirstQuestions(mockPool, 5, solvedSet3);
  assert.strictEqual(selected3.length, 5);
  assert.strictEqual(solvedSet3.size, 0, "solvedSet should be reset after full exhaustion");

  // Test 4: Verify dynamic random sequence across 10 consecutive selections (no identical sequence)
  console.log("4. Testing dynamic random sequence (no identical sequences)");
  const emptySolved = new Set();
  const seq1 = selectUnsolvedFirstQuestions(mockPool, 10, emptySolved).map(q => q.id).join(",");
  const seq2 = selectUnsolvedFirstQuestions(mockPool, 10, emptySolved).map(q => q.id).join(",");
  // With 20 questions picking 10, probability of identical sequence is 1 / P(20, 10) ~ 1 in 6.7x10^11
  assert.notStrictEqual(seq1, seq2, "Consecutive 10-question selections must be randomized");

  console.log("✅ All Unsolved-First Question Selection tests passed!");
}

runTests();
