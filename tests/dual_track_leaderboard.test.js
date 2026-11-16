const assert = require("assert");
const http = require("http");
const { startServer } = require("../server.js");

const TEST_PORT = 8994;
let serverInstance;

function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: pathUrl,
        method: method,
        headers: {
          "Content-Type": "application/json",
          ...headers
        }
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    serverInstance = startServer(TEST_PORT);
    console.log("🧪 Testing Dual-Track Leaderboard (Written vs Practical)...");

    // 1. Register test user 1 (Written master)
    const u1Name = "user_written_" + Date.now();
    const r1 = await request("POST", "/api/auth/register", {
      username: u1Name,
      password: "password123!",
      nickname: "필기달인"
    });
    assert.strictEqual(r1.status, 200);
    const token1 = r1.body.token;

    // Sync user 1: written round 10, practical round 1
    await request("POST", "/api/user/sync", {
      totalPoints: 500,
      streak: 5,
      maxRoundWritten: 10,
      maxRoundPractical: 1
    }, { Authorization: `Bearer ${token1}` });

    // 2. Register test user 2 (Practical master)
    const u2Name = "user_practical_" + Date.now();
    const r2 = await request("POST", "/api/auth/register", {
      username: u2Name,
      password: "password123!",
      nickname: "실기달인"
    });
    assert.strictEqual(r2.status, 200);
    const token2 = r2.body.token;

    // Sync user 2: written round 2, practical round 8, points 400
    await request("POST", "/api/user/sync", {
      totalPoints: 400,
      streak: 3,
      maxRoundWritten: 2,
      maxRoundPractical: 8
    }, { Authorization: `Bearer ${token2}` });

    // 3. Test GET /api/leaderboard?track=written
    console.log("3. Testing Written Leaderboard (/api/leaderboard?track=written)");
    const wBoard = await request("GET", "/api/leaderboard?track=written");
    assert.strictEqual(wBoard.status, 200);
    assert.strictEqual(wBoard.body.track, "written");
    const writtenList = wBoard.body.leaderboard;
    const u1Rank = writtenList.findIndex(u => u.username === u1Name);
    const u2Rank = writtenList.findIndex(u => u.username === u2Name);
    assert(u1Rank !== -1 && u2Rank !== -1);
    assert(u1Rank < u2Rank, "User 1 with higher points/written round must rank higher in written track");

    // 4. Test GET /api/leaderboard?track=practical
    console.log("4. Testing Practical Leaderboard (/api/leaderboard?track=practical)");
    const pBoard = await request("GET", "/api/leaderboard?track=practical");
    assert.strictEqual(pBoard.status, 200);
    assert.strictEqual(pBoard.body.track, "practical");
    const practicalList = pBoard.body.leaderboard;
    const u1PracRank = practicalList.findIndex(u => u.username === u1Name);
    const u2PracRank = practicalList.findIndex(u => u.username === u2Name);
    assert(u1PracRank !== -1 && u2PracRank !== -1);
    assert(u2PracRank < u1PracRank, "User 2 with higher practical round (8 vs 1) must rank higher in practical track");

    console.log("✅ Dual-Track Leaderboard segregation verified successfully!");
    if (serverInstance && serverInstance.close) serverInstance.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Dual-Track Leaderboard Test Failed:", err);
    if (serverInstance && serverInstance.close) serverInstance.close();
    process.exit(1);
  }
})();
