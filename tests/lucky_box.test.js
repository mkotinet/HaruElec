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
  LUCKY_BOX_REWARDS,
  rollLuckyBoxReward
} = require("../public/js/app.js");

function runTests() {
  console.log("🧪 Testing Lucky Box Mechanics & Reward Pool Simulation...");

  // 1. Reward Pool Definition Integrity
  console.log("1. Testing LUCKY_BOX_REWARDS pool integrity");
  assert.ok(Array.isArray(LUCKY_BOX_REWARDS), "LUCKY_BOX_REWARDS must be an array");
  assert.strictEqual(LUCKY_BOX_REWARDS.length, 9, "Must contain exactly 9 reward options");
  LUCKY_BOX_REWARDS.forEach(reward => {
    assert.ok(reward.key, "Reward must have key");
    assert.ok(reward.type, "Reward must have type");
    assert.ok(reward.emoji, "Reward must have emoji");
    assert.ok(reward.name, "Reward must have name");
  });

  // 2. Shield Cap Protection in Lucky Box
  console.log("2. Testing Shield Cap fallback to +100P when already holding 2 shields");
  const fullShieldState = {
    shieldCount: 2,
    totalPoints: 500,
    items: { eraser5050: 1 }
  };

  // Run simulation until shield condition triggers
  let shieldCapTriggered = false;
  for (let i = 0; i < 200; i++) {
    const res = rollLuckyBoxReward(fullShieldState);
    if (res.name.includes("보너스 전기 포인트") && res.desc.includes("이미 방패를 최대 2개 보유 중")) {
      shieldCapTriggered = true;
      assert.strictEqual(fullShieldState.shieldCount, 2, "Shield count must remain capped at 2");
      break;
    }
  }
  assert.ok(shieldCapTriggered, "Shield cap fallback must trigger when holding 2 shields");

  // 3. Normal Shield Acquisition
  console.log("3. Testing normal shield acquisition when holding 0 shields");
  const zeroShieldState = {
    shieldCount: 0,
    totalPoints: 0,
    items: {}
  };
  let shieldAcquired = false;
  for (let i = 0; i < 200; i++) {
    const res = rollLuckyBoxReward(zeroShieldState);
    if (res.emoji === "🛡️") {
      shieldAcquired = true;
      assert.strictEqual(zeroShieldState.shieldCount, 1, "Shield count should increment to 1");
      break;
    }
  }
  assert.ok(shieldAcquired, "Must be able to acquire shield when count < 2");

  // 4. Monte Carlo Distribution across 1,000 rolls
  console.log("4. Running 1,000 rolls Monte Carlo distribution check");
  const simState = {
    shieldCount: 0,
    totalPoints: 0,
    items: {
      eraser5050: 0,
      heart: 0,
      booster2x: 0,
      hint: 0,
      clover: 0,
      timemachine: 0,
      magnet: 0
    }
  };

  const hitCounts = {};
  for (let i = 0; i < 1000; i++) {
    const res = rollLuckyBoxReward(simState);
    hitCounts[res.name] = (hitCounts[res.name] || 0) + 1;
  }

  console.log("Lucky box 1,000 rolls distribution:", hitCounts);
  const rewardNames = Object.keys(hitCounts);
  assert.ok(rewardNames.length >= 8, "Expected at least 8 distinct rewards in 1000 rolls");
  assert.ok(simState.totalPoints > 0, "Points should be accumulated");

  console.log("✅ All Lucky Box Mechanics & Reward Pool tests passed successfully!");
}

runTests();
