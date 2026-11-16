const assert = require("assert");
const http = require("http");
const { startServer } = require("../server.js");

const TEST_PORT = 8994;
let serverInstance = null;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port: TEST_PORT,
      path,
      method: options.method || "GET",
      headers: options.headers || {}
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting server for Level Quiz (5-tier system) test suite...");
  serverInstance = await startServer(TEST_PORT);

  try {
    console.log("1. Testing GET /api/questions/level for each level (1~5) on Written track");
    for (let lvl = 1; lvl <= 5; lvl++) {
      const res = await request(`/api/questions/level?level=${lvl}&track=written`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.level, lvl);
      assert.ok(res.body.level_name, "Level name must exist");
      assert.strictEqual(res.body.questions.length, 5, `Level ${lvl} should return 5 questions`);
      
      res.body.questions.forEach(q => {
        assert.strictEqual(q.level, lvl, `Question ${q.id} must have level ${lvl}`);
        assert.strictEqual(q.exam_track, "written", `Question ${q.id} must be written track`);
        assert.strictEqual(q.options.length, 4, `Question ${q.id} must have 4 options`);
        assert.ok(q.answer >= 1 && q.answer <= 4, `Question ${q.id} answer must be 1~4`);
        assert.ok(q.hint, `Question ${q.id} must have hint property`);
      });
    }

    console.log("2. Testing GET /api/questions/level for Practical track (level 1~5)");
    const pracRes = await request(`/api/questions/level?level=2&track=practical`);
    assert.strictEqual(pracRes.status, 200);
    assert.strictEqual(pracRes.body.success, true);
    assert.strictEqual(pracRes.body.questions.length, 5);
    pracRes.body.questions.forEach(q => {
      assert.strictEqual(q.level, 2);
      assert.strictEqual(q.exam_track, "practical");
      assert.strictEqual(q.subject_id, 6);
    });

    console.log("3. Testing consecutive round rotation on /api/questions/level (?round=1 vs ?round=2)");
    const r1 = await request(`/api/questions/level?level=3&round=1&date=2026-03-30`);
    const r2 = await request(`/api/questions/level?level=3&round=2&date=2026-03-30`);
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r1.body.round, 1);
    assert.strictEqual(r2.body.round, 2);
    const r1Ids = r1.body.questions.map(q => q.id).join(",");
    const r2Ids = r2.body.questions.map(q => q.id).join(",");
    assert.notStrictEqual(r1Ids, r2Ids, "Round 1 and Round 2 question selections must differ");

    console.log("4. Testing invalid level boundary clamping (level=0 and level=99)");
    const minClamped = await request(`/api/questions/level?level=0`);
    assert.strictEqual(minClamped.body.level, 1, "Level 0 must be clamped to 1");
    const maxClamped = await request(`/api/questions/level?level=99`);
    assert.strictEqual(maxClamped.body.level, 5, "Level 99 must be clamped to 5");

    console.log("✅ All Level Quiz 5-tier system tests passed successfully!");
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

runTests();
