const http = require("http");
const assert = require("assert");

// Import server logic
const { startServer } = require("../server");

const TEST_PORT = 8999;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting server for test suite...");
  const server = await startServer(TEST_PORT);

  try {
    console.log("1. Testing GET /api/health");
    const health = await request("GET", "/api/health");
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, "ok");
    assert.strictEqual(health.data.service, "HaruElec");

    console.log("2. Testing GET /api/questions/daily (Deterministic seed & subject balance)");
    const daily1 = await request("GET", "/api/questions/daily?date=2026-11-13");
    assert.strictEqual(daily1.status, 200);
    assert(Array.isArray(daily1.data.questions), "Should return array of questions");
    assert.strictEqual(daily1.data.questions.length, 10, "Daily quiz must have exactly 10 questions");

    // Check subject balance (exactly 2 questions per subject)
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    daily1.data.questions.forEach(q => counts[q.subject_id]++);
    for (let sub = 1; sub <= 5; sub++) {
      assert.strictEqual(counts[sub], 2, `Subject ${sub} must have exactly 2 questions in daily 10 set`);
    }

    // Check determinism: same date must return exact same questions
    const daily2 = await request("GET", "/api/questions/daily?date=2026-11-13");
    const ids1 = daily1.data.questions.map(q => q.id);
    const ids2 = daily2.data.questions.map(q => q.id);
    assert.deepStrictEqual(ids1, ids2, "Same date must return identical question list");

    console.log("3. Testing GET /api/questions/practice");
    const practice = await request("GET", "/api/questions/practice?subject=2&count=5");
    assert.strictEqual(practice.status, 200);
    assert.strictEqual(practice.data.questions.length, 5);
    practice.data.questions.forEach(q => assert.strictEqual(q.subject_id, 2));

    console.log("4. Testing User Auth flow (Register -> Login -> Me)");
    const testUser = {
      username: `test_user_${Date.now()}`,
      password: "password123!",
      nickname: "전기초보"
    };

    const reg = await request("POST", "/api/auth/register", testUser);
    assert.strictEqual(reg.status, 200);
    assert(reg.data.token, "Register should return auth token");
    const token = reg.data.token;

    // Login with same credentials
    const login = await request("POST", "/api/auth/login", {
      username: testUser.username,
      password: testUser.password
    });
    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.data.user.nickname, "전기초보");

    // Get Me with token
    const me = await request("GET", "/api/auth/me", null, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.data.user.username, testUser.username);

    console.log("5. Testing User Progress Sync & Stats");
    const syncData = {
      history: [
        { date: "2026-11-13", score: 90, total: 10, timeSpent: 280 }
      ],
      wrongQuestions: [1, 5, 14],
      bookmarks: [3, 10],
      streak: 3
    };

    const syncRes = await request("POST", "/api/user/sync", syncData, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(syncRes.status, 200);
    assert.strictEqual(syncRes.data.streak, 3);
    assert.deepStrictEqual(syncRes.data.wrongQuestions, [1, 5, 14]);

    // Check stats
    const statsRes = await request("GET", "/api/user/stats", null, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(statsRes.data.streak, 3);
    assert.strictEqual(statsRes.data.totalSolved, 10);

    console.log("✅ All server REST API endpoints verified successfully!");
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
