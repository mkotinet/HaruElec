const assert = require("assert");

// Mock browser localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const { saveActiveQuizSession, restoreActiveQuizSession, getKSTDateString } = require("../public/js/app.js");

function runTests() {
  console.log("🧪 Testing Active Quiz Session Persistence & Mobile Multitasking Resume...");

  const today = getKSTDateString();

  // Test 1: Save active quiz session
  console.log("1. Testing saveActiveQuizSession()");
  const sampleState = {
    mode: "daily",
    currentRound: 2,
    currentIndex: 4,
    userAnswers: { 1: 2, 2: 1, 3: 4 },
    questions: [
      { id: 1, question: "Q1", options: ["A", "B", "C", "D"], answer: 2 },
      { id: 2, question: "Q2", options: ["A", "B", "C", "D"], answer: 1 },
      { id: 3, question: "Q3", options: ["A", "B", "C", "D"], answer: 4 },
      { id: 4, question: "Q4", options: ["A", "B", "C", "D"], answer: 3 },
      { id: 5, question: "Q5", options: ["A", "B", "C", "D"], answer: 1 }
    ],
    shieldCount: 1,
    items: { eraser5050: 1, heart: 2, booster2x: 1 },
    pointMultiplier: 2,
    todayDateStr: today
  };

  const saved = saveActiveQuizSession(sampleState);
  assert.ok(saved, "saveActiveQuizSession must return true on success");
  const rawSaved = localStorage.getItem("haruelec_active_quiz_session");
  assert.ok(rawSaved, "Session must exist in localStorage");

  // Test 2: Restore active quiz session on same day
  console.log("2. Testing restoreActiveQuizSession() on same day");
  const targetState = {
    mode: "daily",
    todayDateStr: today
  };
  const restored = restoreActiveQuizSession(targetState);
  assert.strictEqual(restored, true, "restoreActiveQuizSession must return true");
  assert.strictEqual(targetState.currentRound, 2);
  assert.strictEqual(targetState.currentIndex, 4);
  assert.strictEqual(targetState.pointMultiplier, 2);
  assert.strictEqual(targetState.shieldCount, 1);
  assert.strictEqual(targetState.questions.length, 5);
  assert.deepStrictEqual(targetState.userAnswers, { 1: 2, 2: 1, 3: 4 });

  // Test 3: Midnight rollover protection (yesterday's session must not be restored)
  console.log("3. Testing midnight rollover protection (yesterday's session ignored)");
  const yesterdaySession = JSON.parse(rawSaved);
  yesterdaySession.date = "2026-11-14"; // yesterday
  localStorage.setItem("haruelec_active_quiz_session", JSON.stringify(yesterdaySession));

  const freshState = { mode: "daily", todayDateStr: today };
  const restoredYesterday = restoreActiveQuizSession(freshState);
  assert.strictEqual(restoredYesterday, false, "Yesterday's session must NOT be restored");
  assert.strictEqual(freshState.currentIndex, undefined);

  console.log("✅ All Active Quiz Session Persistence tests passed!");
}

runTests();
