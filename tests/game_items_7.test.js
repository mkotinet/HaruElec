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
  useItem5050Logic,
  useItemHeartLogic,
  useItem2xLogic,
  useItemHintLogic,
  useItemCloverLogic,
  useItemTimemachineLogic,
  useItemMagnetLogic
} = require("../public/js/app.js");

function runTests() {
  console.log("🧪 Testing 7 In-Game Electric Chance Items Logic...");

  const dummyQuestion = {
    id: "sub1_001",
    subject_id: 1,
    subject: "전기자기학",
    question: "진공 중에서 두 전하 사이에 작용하는 정전기력을 나타내는 쿨롱의 법칙은?",
    options: ["F = 1/(4πε0) * (q1q2/r^2)", "F = μ0/(4π) * (m1m2/r^2)", "F = qE", "F = BIl"],
    answer: 1,
    hint: "진공의 유전율 ε0와 두 전하의 곱, 거리의 제곱에 반비례합니다.",
    explanation: "쿨롱의 법칙: 두 전하 사이의 힘은 두 전하량의 곱에 비례하고 거리 제곱에 반비례함."
  };

  // 1. 50:50 차단기
  console.log("1. Testing 50:50 전력 차단기 (2 오답 제거)");
  const state1 = {
    items: { eraser5050: 2 },
    activeItem5050Indices: []
  };
  const disabled5050 = useItem5050Logic(dummyQuestion, state1);
  assert.strictEqual(state1.items.eraser5050, 1);
  assert.strictEqual(disabled5050.length, 2);
  assert.ok(!disabled5050.includes(dummyQuestion.answer), "Correct answer must never be disabled");
  // Try using when count = 0
  state1.items.eraser5050 = 0;
  const disabledFail = useItem5050Logic(dummyQuestion, state1);
  assert.strictEqual(disabledFail.length, 0);

  // 2. 비상 발전기 (하트)
  console.log("2. Testing 비상 발전기 (1회 무료 방어)");
  const state2 = {
    items: { heart: 1 },
    activeItemHeart: false
  };
  const resHeart = useItemHeartLogic(state2);
  assert.strictEqual(resHeart.success, true);
  assert.strictEqual(state2.items.heart, 0);
  assert.strictEqual(state2.activeItemHeart, true);
  // Cannot activate twice
  const resHeartDup = useItemHeartLogic(state2);
  assert.strictEqual(resHeartDup.success, false);
  assert.strictEqual(resHeartDup.reason, "NO_ITEM");

  // 3. 2배 승압기
  console.log("3. Testing 2배 승압기 (포인트 2배)");
  const state3 = {
    items: { booster2x: 2 },
    pointMultiplier: 1
  };
  const res2x = useItem2xLogic(state3);
  assert.strictEqual(res2x.success, true);
  assert.strictEqual(state3.items.booster2x, 1);
  assert.strictEqual(state3.pointMultiplier, 2);
  const res2xDup = useItem2xLogic(state3);
  assert.strictEqual(res2xDup.success, false);
  assert.strictEqual(res2xDup.reason, "ALREADY_ACTIVE");

  // 4. 공식 계측기 (힌트)
  console.log("4. Testing 공식 계측기 (핵심 공식 및 KEC 규정 팝업)");
  const state4 = {
    items: { hint: 2 }
  };
  const resHint = useItemHintLogic(dummyQuestion, state4);
  assert.strictEqual(resHint.success, true);
  assert.strictEqual(state4.items.hint, 1);
  assert.strictEqual(resHint.hint, dummyQuestion.hint);
  // Without hint property, fallback to explanation snippet
  const qWithoutHint = { id: "test_no_hint", explanation: "정답은 쿨롱의 법칙으로 계산합니다." };
  const resHintFallback = useItemHintLogic(qWithoutHint, state4);
  assert.strictEqual(resHintFallback.success, true);
  assert.ok(resHintFallback.hint.includes("쿨롱의 법칙"));
  assert.strictEqual(state4.items.hint, 0);

  // 5. 통전 클로버 (정답 패스)
  console.log("5. Testing 통전 클로버 (100% 즉시 정답 처리)");
  const state5 = {
    items: { clover: 1 },
    userAnswers: {}
  };
  const resClover = useItemCloverLogic(dummyQuestion, state5);
  assert.strictEqual(resClover.success, true);
  assert.strictEqual(state5.items.clover, 0);
  assert.strictEqual(state5.userAnswers[dummyQuestion.id], dummyQuestion.answer);

  // 6. 리셋 스위치 (타임머신)
  console.log("6. Testing 리셋 스위치 (오답 취소 및 재선택)");
  const state6 = {
    items: { timemachine: 1 },
    userAnswers: { [dummyQuestion.id]: 3 },
    lastSelectedWrongOption: 3
  };
  const resTm = useItemTimemachineLogic(dummyQuestion, state6);
  assert.strictEqual(resTm.success, true);
  assert.strictEqual(state6.items.timemachine, 0);
  assert.strictEqual(state6.userAnswers[dummyQuestion.id], undefined);
  assert.strictEqual(state6.lastSelectedWrongOption, null);

  // 7. 전자석 콤보 (콤보 가산점 2배)
  console.log("7. Testing 전자석 콤보 (콤보 포인트 2배 폭증)");
  const state7 = {
    items: { magnet: 1 },
    activeItemMagnet: false
  };
  const resMag = useItemMagnetLogic(state7);
  assert.strictEqual(resMag.success, true);
  assert.strictEqual(state7.items.magnet, 0);
  assert.strictEqual(state7.activeItemMagnet, true);
  const resMagDup = useItemMagnetLogic(state7);
  assert.strictEqual(resMagDup.success, false);
  assert.strictEqual(resMagDup.reason, "NO_ITEM");

  console.log("✅ All 7 Electric In-Game Chance Items logic verified successfully!");
}

runTests();
