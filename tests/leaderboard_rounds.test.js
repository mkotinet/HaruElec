const http = require("http");
const assert = require("assert");

const { startServer } = require("../server");

const TEST_PORT = 8997;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, pathStr, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
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
  console.log("Starting server for Leaderboard & Rounds test suite...");
  const server = await startServer(TEST_PORT);

  try {
    console.log("1. Testing Consecutive Daily Rounds (/api/questions/daily?round=N)");
    const dateStr = "2026-11-14";
    const resRound1 = await request("GET", `/api/questions/daily?date=${dateStr}&round=1`);
    assert.strictEqual(resRound1.status, 200);
    assert.strictEqual(resRound1.data.questions.length, 10);
    assert.strictEqual(resRound1.data.round, 1);

    // Subject balance for round 1
    const countsR1 = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    resRound1.data.questions.forEach(q => countsR1[q.subject_id]++);
    for (let s = 1; s <= 5; s++) {
      assert.strictEqual(countsR1[s], 2, `Round 1 Subject ${s} must have 2 questions`);
    }

    // Round 2
    const resRound2 = await request("GET", `/api/questions/daily?date=${dateStr}&round=2`);
    assert.strictEqual(resRound2.status, 200);
    assert.strictEqual(resRound2.data.questions.length, 10);
    assert.strictEqual(resRound2.data.round, 2);

    // Subject balance for round 2
    const countsR2 = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    resRound2.data.questions.forEach(q => countsR2[q.subject_id]++);
    for (let s = 1; s <= 5; s++) {
      assert.strictEqual(countsR2[s], 2, `Round 2 Subject ${s} must have 2 questions`);
    }

    // Question difference between Round 1 and Round 2
    const idsR1 = new Set(resRound1.data.questions.map(q => q.id));
    const idsR2 = new Set(resRound2.data.questions.map(q => q.id));
    const overlap = [...idsR1].filter(id => idsR2.has(id));
    assert(overlap.length < 10, "Round 1 and Round 2 should have different questions");

    console.log("2. Testing Real-time Leaderboard (/api/leaderboard)");
    // Register User A and User B
    const userA = `rank_a_${Date.now()}`;
    const userB = `rank_b_${Date.now()}`;

    const regA = await request("POST", "/api/auth/register", {
      username: userA,
      password: "pass123!",
      nickname: "전기명장"
    });
    const regB = await request("POST", "/api/auth/register", {
      username: userB,
      password: "pass123!",
      nickname: "번개박사"
    });

    // Sync stats: userA gets 250 points (Round 2 cleared), userB gets 100 points
    await request("POST", "/api/user/sync", {
      totalPoints: 250,
      todayScore: 100,
      maxRoundToday: 2,
      streak: 5,
      action: "ROUND_CLEAR",
      details: { round: 2, score: 100 }
    }, {
      Authorization: `Bearer ${regA.data.token}`
    });

    await request("POST", "/api/user/sync", {
      totalPoints: 100,
      todayScore: 80,
      maxRoundToday: 1,
      streak: 2
    }, {
      Authorization: `Bearer ${regB.data.token}`
    });

    // Check leaderboard
    const leadRes = await request("GET", "/api/leaderboard");
    assert.strictEqual(leadRes.status, 200);
    assert.strictEqual(leadRes.data.success, true);
    assert(Array.isArray(leadRes.data.leaderboard), "Leaderboard must be an array");

    const foundA = leadRes.data.leaderboard.find(u => u.username === userA);
    const foundB = leadRes.data.leaderboard.find(u => u.username === userB);
    assert(foundA, "User A should be in leaderboard");
    assert(foundB, "User B should be in leaderboard");
    assert.strictEqual(foundA.totalPoints, 250);
    assert.strictEqual(foundA.maxRoundToday, 2);
    assert.strictEqual(foundA.streak, 5);
    assert.strictEqual(foundB.totalPoints, 100);

    // Verify ordering (User A with 250 points should be ranked before User B with 100 points)
    const idxA = leadRes.data.leaderboard.findIndex(u => u.username === userA);
    const idxB = leadRes.data.leaderboard.findIndex(u => u.username === userB);
    assert(idxA < idxB, "User A with higher points must rank above User B");

    console.log("✅ All Leaderboard and Consecutive Round tests passed successfully!");
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
