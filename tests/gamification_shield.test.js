const assert = require("assert");

// Mock browser localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const {
  awardShieldForConsecutivePerfect,
  processShieldDecision,
  useItem5050Logic,
  useItemHeartLogic,
  useItem2xLogic
} = require("../public/js/app.js");

function runTests() {
  console.log("🧪 Testing Gamification Mechanics (Shield Cap 2, Decision Box, Items)...");

  // 1. Shield Cap 2 & 2-in-a-row Award
  console.log("1. Testing Shield Cap 2 on consecutive perfect rounds");
  let testState = {
    shieldCount: 0,
    consecutivePerfectRounds: 0,
    totalPoints: 0,
    todayScore: 0
  };

  // Round 1: Perfect 10/10 -> streak = 1, shield = 0
  let res1 = awardShieldForConsecutivePerfect(testState, 100);
  assert.strictEqual(testState.consecutivePerfectRounds, 1);
  assert.strictEqual(testState.shieldCount, 0, "1st perfect round should not award shield yet");
  assert.strictEqual(res1.shieldAwarded, false);

  // Round 2: Perfect 10/10 -> streak = 2, shield = 1 (Awarded!)
  let res2 = awardShieldForConsecutivePerfect(testState, 100);
  assert.strictEqual(testState.consecutivePerfectRounds, 2);
  assert.strictEqual(testState.shieldCount, 1, "2 consecutive perfect rounds must award 1 shield");
  assert.strictEqual(res2.shieldAwarded, true);

  // Round 3: Perfect 10/10 -> streak = 3, bonus +300P!
  let res3 = awardShieldForConsecutivePerfect(testState, 100);
  assert.strictEqual(testState.consecutivePerfectRounds, 3);
  assert.strictEqual(res3.bonusPoints, 300, "3-in-a-row must award +300P bonus");
  assert.strictEqual(testState.totalPoints, 300);

  // Round 4: Perfect 10/10 -> streak = 4, shield = 2 (Awarded!)
  awardShieldForConsecutivePerfect(testState, 100);
  assert.strictEqual(testState.consecutivePerfectRounds, 4);
  assert.strictEqual(testState.shieldCount, 2, "4 consecutive perfect rounds awards 2nd shield");

  // Round 5 & 6: Streak = 6, but shield MUST remain capped at 2 (Math.min(2, ...))
  awardShieldForConsecutivePerfect(testState, 100);
  awardShieldForConsecutivePerfect(testState, 100);
  assert.strictEqual(testState.shieldCount, 2, "Shield count must NEVER exceed 2!");

  // 2. Shield Decision Modal Logic
  console.log("2. Testing Shield Decision Modal (USE_SHIELD vs SAVE_SHIELD)");
  let failState = {
    currentRound: 3,
    shieldCount: 2
  };

  // Choice A: Use shield defense
  let defenseResult = processShieldDecision(failState, "USE_SHIELD");
  assert.strictEqual(defenseResult.status, "CLEARED_BY_SHIELD");
  assert.strictEqual(defenseResult.nextRound, 4);
  assert.strictEqual(failState.shieldCount, 1, "Using shield must decrement shieldCount from 2 to 1");

  // Choice B: Save shield and accept failure
  let saveResult = processShieldDecision(failState, "SAVE_SHIELD");
  assert.strictEqual(saveResult.status, "FAILED_SAVED_SHIELD");
  assert.strictEqual(failState.shieldCount, 1, "Declining shield defense must preserve shieldCount at 1");

  // When shieldCount is 0, defense cannot be used
  failState.shieldCount = 0;
  let noShieldResult = processShieldDecision(failState, "USE_SHIELD");
  assert.strictEqual(noShieldResult.status, "NO_SHIELD_AVAILABLE");

  // 3. Electric Chance Items
  console.log("3. Testing Electric Quiz Chance Items");
  const sampleQuestion = {
    id: 101,
    question: "전력공학 문제",
    options: ["보기 1", "보기 2", "보기 3", "보기 4"],
    answer: 2 // correct is index 2 (보기 2)
  };

  // Item 1: 50:50 전력 차단
  let itemState = {
    items: { eraser5050: 2, heart: 2, booster2x: 2 },
    pointMultiplier: 1,
    activeItemHeart: false
  };

  const disabled5050 = useItem5050Logic(sampleQuestion, itemState);
  assert.strictEqual(itemState.items.eraser5050, 1, "eraser5050 count must decrement by 1");
  assert.strictEqual(disabled5050.length, 2, "Must disable exactly 2 wrong options");
  assert.ok(!disabled5050.includes(2), "50:50 must NEVER disable the correct answer (2)");
  disabled5050.forEach(idx => {
    assert.ok([1, 3, 4].includes(idx), `Disabled option ${idx} must be a wrong option`);
  });

  // Item 2: 절연 보호 (하트)
  const heartRes = useItemHeartLogic(itemState);
  assert.strictEqual(heartRes.success, true);
  assert.strictEqual(itemState.items.heart, 1, "heart count must decrement by 1");
  assert.strictEqual(itemState.activeItemHeart, true, "activeItemHeart must be true");

  // Re-activating heart while already active should be blocked
  const heartRes2 = useItemHeartLogic(itemState);
  assert.strictEqual(heartRes2.success, false, "Cannot activate heart when already active");
  assert.strictEqual(itemState.items.heart, 1, "heart count should not decrement on duplicate activation");

  // Item 3: 2배 부스터
  const boosterRes = useItem2xLogic(itemState);
  assert.strictEqual(boosterRes.success, true);
  assert.strictEqual(itemState.items.booster2x, 1, "booster2x count must decrement by 1");
  assert.strictEqual(itemState.pointMultiplier, 2, "pointMultiplier must be 2");

  // Point calculation test with 2x booster
  const baseRoundPoints = 100;
  const earnedPoints = baseRoundPoints * itemState.pointMultiplier;
  assert.strictEqual(earnedPoints, 200, "Earned points must be doubled with booster");

  console.log("✅ All Gamification Mechanics tests passed!");
}

runTests();
