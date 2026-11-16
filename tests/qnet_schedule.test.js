const assert = require("assert");
const http = require("http");
const path = require("path");

const TEST_PORT = 8995;
const { startServer } = require("../server.js");

let serverInstance;

function request(method, pathUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: pathUrl,
        method: method,
        headers: headers
      },
      res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  try {
    serverInstance = startServer(TEST_PORT);
    console.log("🧪 Testing Q-Net Exam Schedule & D-Day API...");

    // 1. GET /api/qnet-schedule
    const res = await request("GET", "/api/qnet-schedule");
    assert.strictEqual(res.status, 200, "Q-Net schedule must return 200");
    assert(res.body.schedules && Array.isArray(res.body.schedules), "schedules array required");
    assert(res.body.schedules.length >= 3, "Must have regular sessions");
    assert(res.body.nextWritten, "nextWritten object required");
    assert(typeof res.body.nextWritten.dDay === "number", "nextWritten.dDay must be number");
    assert(res.body.nextPractical, "nextPractical object required");
    assert(typeof res.body.nextPractical.dDay === "number", "nextPractical.dDay must be number");
    assert(res.body.official_source.includes("한국산업인력공단"), "official_source must cite HRD Korea");

    // 1-1. GET /api/questions/chapters (v3.2.0 Chapter Deep-Dive)
    console.log("1-1. Testing GET /api/questions/chapters...");
    const chRes = await request("GET", "/api/questions/chapters");
    assert.strictEqual(chRes.status, 200, "Chapters registry must return 200");
    assert.strictEqual(chRes.body.total_questions, 300, "Total questions in registry must be 300");
    assert(chRes.body.chapters["4"], "Subject 4 must exist in registry");
    assert(chRes.body.chapters["4"].sub_subjects["제어공학"], "Subject 4 must contain 제어공학");
    assert(chRes.body.chapters["4"].sub_subjects["제어공학"].chapters["3"], "제어공학 제3장 must exist in registry");

    // 1-2. GET /api/questions/practice?subject=4&sub_subject=제어공학&chapter=3
    console.log("1-2. Testing GET /api/questions/practice with 제어공학 제3장...");
    const filteredRes = await request("GET", "/api/questions/practice?subject=4&sub_subject=" + encodeURIComponent("제어공학") + "&chapter=3");
    assert.strictEqual(filteredRes.status, 200);
    assert(filteredRes.body.questions.length > 0, "Filtered questions for 제어공학 제3장 must not be empty");
    filteredRes.body.questions.forEach(q => {
      assert.strictEqual(q.subject_id, 4);
      assert.strictEqual(q.sub_subject, "제어공학");
      assert.strictEqual(q.chapter_id, 3);
    });

    // 2. GET /api/questions/level
    console.log("2. Testing GET /api/questions/level for levels 1~5");
    for (let lvl = 1; lvl <= 5; lvl++) {
      const lvlRes = await request("GET", `/api/questions/level?level=${lvl}&round=1`);
      assert.strictEqual(lvlRes.status, 200);
      assert.strictEqual(lvlRes.body.level, lvl);
      assert.strictEqual(lvlRes.body.questions.length, 5, `Level ${lvl} must return 5 questions`);
      lvlRes.body.questions.forEach(q => {
        assert.strictEqual(q.level, lvl, `Question level must match requested level ${lvl}`);
      });
    }

    // 3. GET /api/questions/daily with track=practical
    console.log("3. Testing GET /api/questions/daily with track=practical");
    const pracRes = await request("GET", "/api/questions/daily?track=practical&round=1");
    assert.strictEqual(pracRes.status, 200);
    assert.strictEqual(pracRes.body.track, "practical");
    assert(pracRes.body.questions.length >= 5, "Practical daily must return questions");
    pracRes.body.questions.forEach(q => {
      assert(q.subject_id === 6 || q.exam_track === "practical", "Must be practical question");
    });

    console.log("✅ All Q-Net Schedule, Level & Practical Question API tests passed!");
    if (serverInstance && serverInstance.close) serverInstance.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Q-Net Schedule Test Failed:", err);
    if (serverInstance && serverInstance.close) serverInstance.close();
    process.exit(1);
  }
})();
